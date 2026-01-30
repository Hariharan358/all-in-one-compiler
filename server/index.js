require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(cors());

// Rate Limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

const PORT = 5000;
const TEMP_DIR = path.join(__dirname, 'temp');

// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/compiler_app';
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- User Model ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    progress: { type: [Number], default: [] }, // Array of task IDs
    xp: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

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
    content: { type: String, required: true },
    type: { type: String }, // "riddle", "debugging", etc.
    language: { type: String },
    codeSnippet: { type: String },
    sampleInput: { type: String },
    sampleOutput: { type: String }
});

// Configure Question schema to use 'id' instead of '_id' in toJSON
QuestionSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id;
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

// --- Auth Routes ---

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

        task.questions.push(req.body);
        await task.save();
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a question from a task
app.delete('/api/tasks/:taskId/questions/:questionId', async (req, res) => {
    try {
        const task = await Task.findOne({ id: req.params.taskId });
        if (!task) return res.status(404).json({ error: "Task not found" });

        task.questions = task.questions.filter(q => q._id.toString() !== req.params.questionId);
        await task.save();
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Register (Generate Password)
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing fields" });

    try {
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ error: "Team name already exists" });

        const newUser = new User({ username, password }); // In prod: Hash this!
        await newUser.save();

        // Log Activity
        await new Activity({
            username,
            action: "REGISTERED",
            details: "Team registered successfully"
        }).save();

        res.status(201).json({ message: "User registered", user: { username } });
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
                email: `${user.username.toLowerCase()}@example.com`,
                completedTasks: user.progress,
                xp: user.xp
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: "User not found" });

        if (!user.progress.includes(taskId)) {
            user.progress.push(taskId);
            user.xp += xp;
            await user.save();

            // Log Activity
            await new Activity({
                username,
                action: "SOLVED_TASK",
                taskId,
                xp_earned: xp,
                details: `Solved task ${taskId} and earned ${xp} XP`
            }).save();
        }
        res.json({ success: true, progress: user.progress, xp: user.xp });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- Compiler Logic ---

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

// Map languages to file extensions and docker commands
const LANGUAGE_CONFIG = {
    c: {
        extension: 'c',
        runCommand: (file) => `gcc ${file} -o /code/output && /code/output`
    },
    cpp: {
        extension: 'cpp',
        runCommand: (file) => `g++ ${file} -o /code/output && /code/output`
    },
    python: {
        extension: 'py',
        runCommand: (file) => `python3 ${file}`
    },
    java: {
        extension: 'java',
        runCommand: (file) => `javac ${file} && java -cp /code Main`
    }
};

app.post('/compile', async (req, res) => {
    const { language, code, input } = req.body;

    if (!code || !language) {
        return res.status(400).json({ error: 'Code and language are required' });
    }

    const config = LANGUAGE_CONFIG[language.toLowerCase()];
    if (!config) {
        return res.status(400).json({ error: 'Unsupported language' });
    }

    const jobId = uuidv4();
    const filename = language.toLowerCase() === 'java' ? 'Main.java' : `${jobId}.${config.extension}`;
    const jobDir = path.join(TEMP_DIR, jobId);

    if (!fs.existsSync(jobDir)) {
        fs.mkdirSync(jobDir);
    }

    const filePath = path.join(jobDir, filename);

    try {
        await fs.promises.writeFile(filePath, code);

        const inputPath = path.join(jobDir, 'input.txt');
        if (input) {
            await fs.promises.writeFile(inputPath, input);
        }

        const absoluteJobDir = jobDir; // In Docker environment this might need adjustment depending on host OS

        let command = `docker run --rm --network none --memory 128m -v "${absoluteJobDir}:/code" compiler-sandbox sh -c "${config.runCommand(filename)}"`;

        if (input) {
            command = `docker run --rm --network none --memory 128m -v "${absoluteJobDir}:/code" compiler-sandbox sh -c "${config.runCommand(filename)} < input.txt"`;
        }

        console.log(`Executing: ${command}`);

        exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
            try {
                fs.rmSync(jobDir, { recursive: true, force: true });
            } catch (cleanupErr) {
                console.error('Cleanup error:', cleanupErr);
            }

            if (error && error.killed) {
                return res.json({ output: '', error: 'Time Limit Exceeded' });
            }

            if (error) {
                return res.json({ output: stdout, error: stderr || error.message });
            }

            res.json({ output: stdout, error: stderr });
        });

    } catch (err) {
        console.error('Server error:', err);
        if (fs.existsSync(jobDir)) {
            fs.rmSync(jobDir, { recursive: true, force: true });
        }
        res.status(500).json({ error: 'Internal server error' });
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
        res.status(201).json(newSubmission);
    } catch (err) {
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
