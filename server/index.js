import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Debug: Log all routes
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Rate Limiting

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // Limit each IP to 5000 requests per windowMs to allow polling
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "Too many requests from this IP, please try again later."
});
app.use(limiter);




// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/compiler_app';
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- User Model ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: false, default: 'noemail@placeholder.com' }, // Made optional for existing users
    password: { type: String, required: true },
    progress: { type: [Number], default: [] }, // Array of task IDs
    xp: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// --- Email Configuration ---
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Function to send email with credentials
const sendCredentialsEmail = async (email, username, password) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Your Team Login Credentials - Techception Event',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #333; text-align: center; margin-bottom: 30px;">Welcome to the Techception Platform!</h2>
                    
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                        Hello Team Leader,
                    </p>
                    
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                        Your team has been successfully registered for the coding challenge platform. Here are your login credentials:
                    </p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                        <p style="margin: 0; color: #333;"><strong>Team Name:</strong> ${username}</p>
                        <p style="margin: 10px 0 0 0; color: #333;"><strong>Password:</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
                    </div>
                    
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                        Please keep these credentials secure and share them only with your team members. You can now log in to the platform and start solving challenges!
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://techception-titanium.vercel.app/" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Platform</a>
                    </div>
                    
                    <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
                        Good luck with the challenges!<br>
                        <strong>Coding Challenge Platform Team</strong>
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Credentials email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

// --- Activity Model ---
const ActivitySchema = new mongoose.Schema({
    username: { type: String, required: true },
    action: { type: String, required: true }, // e.g., "SOLVED_TASK", "REGISTERED"
    taskId: { type: Number },
    xp_earned: { type: Number },
    details: { type: String },
    timestamp: { type: Date, default: Date.now }
});

const Activity = mongoose.model('Activity', ActivitySchema);


// --- Task Model ---
const QuestionSchema = new mongoose.Schema({
    id: { type: String }, // Custom ID like "r1-q1"
    content: { type: String, required: true },
    type: { type: String }, // "riddle", "debugging", etc.
    language: { type: String },
    codeSnippet: { type: String },
    sampleInput: { type: String },
    sampleOutput: { type: String }
});

// Configure Question schema
QuestionSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        // Don't overwrite id with _id if id exists
        if (!ret.id) {
            ret.id = ret._id;
        }
        delete ret._id;
    }
});

const TaskSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true }, // Numeric ID for frontend compatibility
    title: { type: String, required: true },
    description: { type: String },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard", "Expert"] },
    points: { type: Number },
    type: { type: String, enum: ["debugging", "coding", "riddle", "blackbox", "case-study"] },
    questions: [QuestionSchema]
});

const Task = mongoose.model('Task', TaskSchema);

// --- User Question Order Model (for randomization) ---
// This model stores the shuffled question order for each user per task
// When a user first accesses a task, questions are shuffled using Fisher-Yates algorithm
// The order is saved and reused for that user to ensure consistency
// This prevents users from sharing answers based on question numbers
const UserQuestionOrderSchema = new mongoose.Schema({
    username: { type: String, required: true },
    taskId: { type: Number, required: true },
    questionOrder: [{ type: String }], // Array of question IDs in shuffled order
    createdAt: { type: Date, default: Date.now }
});

// Create compound index to ensure one order per user per task
UserQuestionOrderSchema.index({ username: 1, taskId: 1 }, { unique: true });

const UserQuestionOrder = mongoose.model('UserQuestionOrder', UserQuestionOrderSchema);

// Helper function to shuffle array (Fisher-Yates algorithm)
// This ensures truly random shuffling with uniform distribution
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// --- Auth Routes ---

// Simple admin test route
app.get('/api/admin-test', (req, res) => {
    res.json({ message: "Simple admin test working" });
});

// Admin Login (placed early to avoid conflicts)
app.post('/api/admin/login', async (req, res) => {
    console.log('Admin login endpoint hit with body:', req.body);
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: "Password is required" });
    }

    console.log('Comparing passwords:', password, 'vs', process.env.ADMIN_PASSWORD);
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Invalid admin credentials" });
    }

    res.json({
        user: {
            id: "admin",
            username: "Admin",
            email: "admin@system.local",
            completedTasks: [],
            xp: 0,
            isAdmin: true
        }
    });
});

// Get all users (Admin)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all activities (Admin)
app.get('/api/activities', async (req, res) => {
    try {
        const activities = await Activity.find({}).sort({ timestamp: -1 });
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Task Routes ---

// Get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find({}).sort({ id: 1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get tasks with shuffled questions for a specific user
app.get('/api/tasks/user/:username', async (req, res) => {
    const { username } = req.params;

    try {
        const tasks = await Task.find({}).sort({ id: 1 });

        // Allocate ONE random question per task for each user
        const shuffledTasks = await Promise.all(tasks.map(async (task) => {
            const taskObj = task.toObject();

            if (!taskObj.questions || taskObj.questions.length === 0) {
                return taskObj;
            }

            // Check if user already has a question allocated for this task
            let userOrder = await UserQuestionOrder.findOne({
                username,
                taskId: task.id
            });

            if (!userOrder) {
                // Randomly select ONE question for this user for this task
                console.log(`Task ${task.id} has ${taskObj.questions?.length || 0} questions`);

                if (!taskObj.questions || taskObj.questions.length === 0) {
                    console.log(`Task ${task.id} has no questions, skipping allocation`);
                    taskObj.questions = [];
                    return taskObj;
                }

                // SKIP AUTOMATIC ALLOCATION FOR TASK 2 (DEBUG ROUND) IF NO ORDER EXISTS
                if (task.id === 2) {
                    console.log(`Skipping auto-allocation for Task 2 (Debug Round) - waiting for language selection`);
                    taskObj.questions = [];
                    return taskObj;
                }

                const validQuestions = taskObj.questions.filter(q => {
                    const isValid = q && q.id;
                    if (!isValid) {
                        console.log(`Found invalid question in task ${task.id}:`, q);
                    }
                    return isValid;
                });

                if (validQuestions.length === 0) {
                    console.log(`No valid questions for task ${task.id} after filtering`);
                    taskObj.questions = [];
                    return taskObj;
                }

                // Determine how many questions to allocate
                let questionsToAllocate = 1;
                if (task.id === 1) {
                    questionsToAllocate = 2; // Allocate 2 riddles for Round 1
                }

                // select unique random questions
                const selectedQuestionIds = [];
                const availableIndices = Array.from({ length: validQuestions.length }, (_, i) => i);

                // Shuffle indices to pick random ones
                for (let i = availableIndices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
                }

                // Take first N indices
                const count = Math.min(questionsToAllocate, validQuestions.length);
                for (let i = 0; i < count; i++) {
                    selectedQuestionIds.push(validQuestions[availableIndices[i]].id.toString());
                }

                userOrder = new UserQuestionOrder({
                    username,
                    taskId: task.id,
                    questionOrder: selectedQuestionIds
                });

                await userOrder.save();
                console.log(`✓ Allocated question(s) ${selectedQuestionIds.join(', ')} to user ${username} for task ${task.id} (Auto)`);
            } else {
                console.log(`User ${username} already has allocation for task ${task.id}: ${userOrder.questionOrder.join(', ')}`);
            }

            // Get the allocated question(s) for this user
            const allocatedQuestions = userOrder.questionOrder
                .map(qId => {
                    const found = taskObj.questions.find(q => q && q.id && q.id.toString() === qId);
                    if (!found) {
                        console.log(`Warning: Allocated question ${qId} not found in task ${task.id} questions`);
                    }
                    return found;
                })
                .filter(q => q !== undefined);

            console.log(`Returning ${allocatedQuestions.length} question(s) for user ${username}, task ${task.id}`);

            // Return task with only the allocated question(s)
            taskObj.questions = allocatedQuestions;
            return taskObj;
        }));

        res.json(shuffledTasks);
    } catch (err) {
        console.error('Error fetching shuffled tasks:', err);
        res.status(500).json({ error: err.message });
    }
});

// Manual Question Allocation (For Language Selection in Round 2)
app.post('/api/allocate-question', async (req, res) => {
    const { username, taskId, language } = req.body;

    if (!username || !taskId || !language) {
        return res.status(400).json({ error: "Username, taskId, and language are required" });
    }

    try {
        // Check if allocation already exists
        const existingOrder = await UserQuestionOrder.findOne({ username, taskId });
        if (existingOrder) {
            return res.status(400).json({ error: "Question already allocated for this task" });
        }

        const task = await Task.findOne({ id: taskId });
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        let prefix = "";
        let langCode = "";

        // Determine prefix based on language
        if (language.toLowerCase() === 'python') {
            prefix = "DP";
            langCode = "python";
        } else if (language.toLowerCase() === 'c') {
            prefix = "DC";
            langCode = "c";
        } else if (language.toLowerCase() === 'java') {
            prefix = "DJ";
            langCode = "java";
        } else {
            return res.status(400).json({ error: "Invalid language selection" });
        }

        // Filter valid questions matching the prefix
        const validQuestions = task.questions.filter(q =>
            q && q.id && q.id.startsWith(prefix)
        );

        if (validQuestions.length === 0) {
            return res.status(404).json({ error: `No questions found for language ${language} (Prefix: ${prefix})` });
        }

        // Randomly select one question
        const randomIndex = Math.floor(Math.random() * validQuestions.length);
        const selectedQuestion = validQuestions[randomIndex];

        // Save allocation
        const userOrder = new UserQuestionOrder({
            username,
            taskId,
            questionOrder: [selectedQuestion.id]
        });

        await userOrder.save();
        console.log(`✓ Manually allocated ${selectedQuestion.id} to ${username} for task ${taskId} (${language})`);

        // Log activity
        await new Activity({
            username,
            action: "SELECTED_LANGUAGE",
            taskId,
            details: `Selected ${language} for Round 2 and got assigned question ${selectedQuestion.id}`
        }).save();

        res.json({
            message: "Question allocated successfully",
            questionId: selectedQuestion.id,
            language: langCode
        });

    } catch (err) {
        console.error('Error allocating question:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create a new task
app.post('/api/tasks', async (req, res) => {
    try {
        // Auto-increment ID logic
        const lastTask = await Task.findOne().sort({ id: -1 });
        const newId = lastTask ? lastTask.id + 1 : 1;

        const newTask = new Task({
            id: newId,
            ...req.body
        });
        await newTask.save();
        res.status(201).json(newTask);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const result = await Task.findOneAndDelete({ id: req.params.id });
        if (!result) return res.status(404).json({ error: "Task not found" });
        res.json({ message: "Task deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a question to a task
app.post('/api/tasks/:taskId/questions', async (req, res) => {
    try {
        const task = await Task.findOne({ id: req.params.taskId });
        if (!task) return res.status(404).json({ error: "Task not found" });

        // Generate a unique ID for the question
        // Check if ID is provided in body (for bulk upload) or generate one
        let questionId = req.body.id;
        if (!questionId) {
            const questionNumber = task.questions.length + 1;
            questionId = `r${task.id}-q${questionNumber}`;
        }

        const newQuestion = {
            ...req.body,
            id: questionId
        };

        task.questions.push(newQuestion);
        await task.save();

        console.log(`✓ Added question ${questionId} to task ${task.id}`);
        res.json(task);
    } catch (err) {
        console.error('Error adding question:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete a question from a task
app.delete('/api/tasks/:taskId/questions/:questionId', async (req, res) => {
    try {
        const task = await Task.findOne({ id: req.params.taskId });
        if (!task) return res.status(404).json({ error: "Task not found" });

        task.questions = task.questions.filter(q => q._id.toString() !== req.params.questionId && q.id !== req.params.questionId);
        await task.save();
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Register (Generate Password)
app.post('/api/register', async (req, res) => {
    const { username, email } = req.body;
    if (!username || !email) return res.status(400).json({ error: "Team name and email are required" });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    try {
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ error: "Team name already exists" });

        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ error: "Email already registered" });

        // Generate random password
        const generatePassword = () => {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            let pass = "";
            for (let i = 0; i < 8; i++) {
                pass += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return pass;
        };

        const password = generatePassword();
        const newUser = new User({ username, email, password }); // In prod: Hash this!
        await newUser.save();

        // Send email with credentials
        const emailSent = await sendCredentialsEmail(email, username, password);

        if (!emailSent) {
            // If email fails, still register the user but notify admin
            console.warn(`User registered but email failed to send to ${email}`);
        }

        // Log Activity
        await new Activity({
            username,
            action: "REGISTERED",
            details: `Team registered successfully${emailSent ? ' and credentials sent via email' : ' but email failed'}`
        }).save();

        res.status(201).json({
            message: emailSent ? "User registered and credentials sent via email" : "User registered but email failed to send",
            user: { username, email },
            emailSent
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user || user.password !== password) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                completedTasks: user.progress,
                xp: user.xp,
                isAdmin: false
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Test endpoint
app.get('/api/admin/test', (req, res) => {
    res.json({ message: "Admin test endpoint working" });
});

// Delete User (Admin)
app.delete('/api/users/:username', async (req, res) => {
    try {
        const result = await User.findOneAndDelete({ username: req.params.username });
        if (!result) return res.status(404).json({ error: "User not found" });
        res.json({ message: "User deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Progress
app.post('/api/progress', async (req, res) => {
    const { username, taskId, xp } = req.body;

    console.log('Progress update request:', { username, taskId, xp });

    // Prevent admin from updating progress
    if (username === 'Admin' || username === 'admin') {
        console.log('Admin cannot update progress');
        return res.status(403).json({ error: "Admin users cannot complete tasks" });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            console.log('User not found:', username);
            return res.status(404).json({ error: "User not found" });
        }

        console.log('User found:', { username: user.username, currentProgress: user.progress, currentXP: user.xp });

        if (!user.progress.includes(taskId)) {
            user.progress.push(taskId);
            user.xp += xp;
            await user.save();

            console.log('User progress updated:', { newProgress: user.progress, newXP: user.xp });

            // Log Activity
            const activity = new Activity({
                username,
                action: "SOLVED_TASK",
                taskId,
                xp_earned: xp,
                details: `Solved task ${taskId} and earned ${xp} XP`
            });
            await activity.save();

            console.log('Activity logged for task completion');
        } else {
            console.log('Task already completed by user:', { username, taskId });
        }

        res.json({ success: true, progress: user.progress, xp: user.xp });
    } catch (err) {
        console.error('Progress update error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Manually Award/Edit XP
app.post('/api/admin/award-xp', async (req, res) => {
    const { username, xp, taskId, reason } = req.body;

    if (!username || xp === undefined) {
        return res.status(400).json({ error: "Username and XP amount are required" });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Update XP (add/subtract)
        user.xp += parseInt(xp);

        // Ensure task is marked as completed
        if (taskId) {
            const tid = parseInt(taskId);
            if (!isNaN(tid) && !user.progress.includes(tid)) {
                user.progress.push(tid);
            }
        }

        await user.save();

        // Log Activity
        await new Activity({
            username,
            action: "ADMIN_AWARDED_XP",
            taskId: taskId || undefined,
            xp_earned: xp,
            details: reason || `Admin manually awarded ${xp} XP`
        }).save();

        console.log(`Admin awarded ${xp} XP to ${username}`);
        res.json({ message: "XP updated successfully", newXP: user.xp });
    } catch (err) {
        console.error('Error awarding XP:', err);
        res.status(500).json({ error: err.message });
    }
});





// --- Submission Model ---
const SubmissionSchema = new mongoose.Schema({
    username: { type: String, required: true },
    taskId: { type: Number, required: true },
    questionId: { type: String }, // Optional, if granular tracking is needed
    code: { type: String },
    language: { type: String },
    status: { type: String, default: "Submitted" }, // "Submitted", "Correct", etc.
    duration: { type: Number }, // Duration in milliseconds
    timestamp: { type: Date, default: Date.now }
});

const Submission = mongoose.model('Submission', SubmissionSchema);

// --- Submission Routes ---

// Submit Logic (called when user submits a round/question)
app.post('/api/submissions', async (req, res) => {
    const { username, taskId, questionId, code, language, status, duration } = req.body;

    console.log('Submission received:', { username, taskId, questionId, language, status, duration: duration ? Math.round(duration / 1000) : 0 });

    try {
        const newSubmission = new Submission({
            username,
            taskId,
            questionId,
            code,
            language,
            status,
            duration
        });
        await newSubmission.save();

        // Log Activity for submission
        const activity = new Activity({
            username,
            action: "SUBMITTED_SOLUTION",
            taskId: taskId,
            details: `Submitted solution for Task ${taskId}${questionId ? ` (Question ${questionId})` : ''} in ${language || 'text'} - Duration: ${duration ? Math.round(duration / 1000) : 0}s`
        });
        await activity.save();

        console.log('Activity logged:', activity);

        res.status(201).json(newSubmission);
    } catch (err) {
        console.error('Submission error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Submissions for a User (Admin)
app.get('/api/submissions/:username', async (req, res) => {
    try {
        const submissions = await Submission.find({ username: req.params.username }).sort({ timestamp: -1 });
        res.json(submissions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all submissions (Admin)
app.get('/api/submissions', async (req, res) => {
    try {
        const submissions = await Submission.find({}).sort({ timestamp: -1 }).limit(100);
        res.json(submissions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset question order for a user (for testing/debugging)
app.delete('/api/question-order/:username/:taskId', async (req, res) => {
    const { username, taskId } = req.params;
    try {
        await UserQuestionOrder.deleteOne({ username, taskId: parseInt(taskId) });
        res.json({ message: "Question order reset successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all question orders (Admin)
app.get('/api/question-orders', async (req, res) => {
    try {
        const orders = await UserQuestionOrder.find({}).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Test endpoint to create a sample activity (for debugging)
app.post('/api/test-activity', async (req, res) => {
    try {
        const testActivity = new Activity({
            username: "TestUser",
            action: "SUBMITTED_SOLUTION",
            taskId: 1,
            details: "Test submission activity"
        });
        await testActivity.save();
        res.json({ message: "Test activity created", activity: testActivity });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

