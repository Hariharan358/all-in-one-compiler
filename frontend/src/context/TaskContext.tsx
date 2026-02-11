import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "./AuthContext";

export interface Question {
    id: string;
    content: string; // The riddle text, or problem description
    type?: "riddle" | "debugging" | "blackbox" | "case-study" | "coding"; // Inherited from task usually, but explicit is good

    // For coding/debugging
    language?: string;
    codeSnippet?: string; // The buggy code or starter template
    sampleInput?: string;
    sampleOutput?: string;
    externalUrl?: string;
}

export interface Task {
    id: number;
    title: string;
    description: string;
    difficulty: "Easy" | "Medium" | "Hard" | "Expert";
    points: number;
    type: "debugging" | "coding" | "riddle" | "blackbox" | "case-study";
    questions: Question[];
}

interface TaskContextType {
    tasks: Task[];
    addTask: (task: Omit<Task, "id">) => void;
    deleteTask: (id: number) => void;
    addQuestion: (taskId: number, question: Omit<Question, "id">) => void;
    deleteQuestion: (taskId: number, questionId: string) => void;
    refreshTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

// Initial default tasks (The 4 Rounds)
const defaultTasks: Task[] = [
    {
        id: 1,
        title: "Round 1: Brain Teaser",
        description: "Solve these riddles to test your lateral thinking.",
        difficulty: "Easy",
        points: 10,
        type: "riddle",
        questions: [
            {
                id: "r1-q1",
                content: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?"
            }
        ]
    },
    {
        id: 2,
        title: "Round 2: Fix the Bug",
        description: "Identify and fix the bugs in the provided code snippets.",
        difficulty: "Medium",
        points: 20,
        type: "debugging",
        questions: [
            {
                id: "r2-q1",
                content: "Fix the factorial function.",
                language: "python",
                codeSnippet: "def factorial(n):\n    if n == 0:\n        return 0  # Bug here? Factorial of 0 is 1\n    return n * factorial(n-1)"
            }
        ]
    },
    {
        id: 3,
        title: "Round 3: Blackbox Challenge",
        description: "Write code to match the expected output without seeing the implementation logic.",
        difficulty: "Hard",
        points: 30,
        type: "blackbox",
        questions: [
            {
                id: "r3-q1",
                content: "Write code that takes an integer 'n' and returns the nth Fibonacci number.",
                codeSnippet: "# Write your solution here\n"
            }
        ]
    },
    {
        id: 4,
        title: "Round 4: Case Study",
        description: "Analyze the scenario and pitch your solution.",
        difficulty: "Expert",
        points: 50,
        type: "case-study",
        questions: [
            {
                id: "r4-q1",
                content: "Techception is launching a new AI compiler. Pitch a marketing strategy to reach 1 million users in 6 months."
            },
            {
                id: "r4-q2",
                content: "Design a scalable architecture for a real-time collaborative code editor (like Google Docs for code) that supports 100+ concurrent users per document. Discuss data consistency, conflict resolution, and server infrastructure."
            },
            {
                id: "r4-q3",
                content: "A healthcare startup wants to use AI to diagnose skin conditions from user-uploaded photos. Outline the ethical considerations, privacy safeguards, and technical pipeline for this application."
            },
            {
                id: "r4-q4",
                content: "Design a smart traffic management system for a congested city using IoT sensors and AI. How would you optimize traffic light timings to reduce average commute time by 20%? Discuss the edge vs. cloud computing trade-offs."
            },
            {
                id: "r4-q5",
                content: "You are building a decentralized voting system for a national election using blockchain, addressing the challenges of voter anonymity, vote verification, and prevention of coercion."
            },
            {
                id: "r4-q6",
                content: "Pitch a gamified learning platform for teaching quantum computing concepts to high school students. Describe the core gameplay loop, retention strategies, and technical stack."
            }
        ]
    }
];

export const TaskProvider = ({ children }: { children: ReactNode }) => {
    const { user, isAdmin } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);

    // Sanitize API URL
    const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

    const fetchTasks = async () => {
        try {
            // Use user-specific endpoint if user is logged in AND not admin, otherwise use general endpoint
            const endpoint = (user?.username && !isAdmin)
                ? `${API_BASE_URL}/api/tasks/user/${encodeURIComponent(user.username)}`
                : `${API_BASE_URL}/api/tasks`;

            console.log('Fetching tasks from:', endpoint);

            const res = await fetch(endpoint);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();

            if (Array.isArray(data) && data.length > 0) {
                console.log(`Loaded ${data.length} tasks${user?.username ? ' with shuffled questions for ' + user.username : ''}`);
                setTasks(data);
            } else {
                console.log("No tasks found, seeding defaults...");
                // Seed data if empty
                const seededTasks = [];
                for (const task of defaultTasks) {
                    try {
                        const seedRes = await fetch(`${API_BASE_URL}/api/tasks`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                title: task.title,
                                description: task.description,
                                difficulty: task.difficulty,
                                points: task.points,
                                type: task.type,
                                questions: task.questions
                            })
                        });
                        if (seedRes.ok) {
                            seededTasks.push(await seedRes.json());
                        }
                    } catch (e) {
                        console.error("Error seeding task:", task.title, e);
                    }
                }
                if (seededTasks.length > 0) {
                    setTasks(seededTasks);
                } else {
                    setTasks(defaultTasks);
                }
            }
        } catch (err) {
            console.error("Failed to fetch tasks:", err);
            setTasks(defaultTasks);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [user?.username, isAdmin]); // Re-fetch when user changes

    const addTask = async (newTask: Omit<Task, "id">) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask)
            });
            if (res.ok) {
                const savedTask = await res.json();
                setTasks(prev => [...prev, savedTask]);
            }
        } catch (err) {
            console.error("Failed to add task", err);
        }
    };

    const deleteTask = async (id: number) => {
        try {
            await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
                method: 'DELETE'
            });
            setTasks(prev => prev.filter(t => t.id !== id));
        } catch (err) {
            console.error("Failed to delete task", err);
        }
    };

    const addQuestion = async (taskId: number, question: Omit<Question, "id">) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(question)
            });
            if (res.ok) {
                const updatedTask = await res.json();
                setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
            }
        } catch (err) {
            console.error("Failed to add question", err);
        }
    };

    const deleteQuestion = async (taskId: number, questionId: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/questions/${questionId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                const updatedTask = await res.json();
                setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
            }
        } catch (err) {
            console.error("Failed to delete question", err);
        }
    };

    return (
        <TaskContext.Provider value={{ tasks, addTask, deleteTask, addQuestion, deleteQuestion, refreshTasks: fetchTasks }}>
            {children}
        </TaskContext.Provider>
    );
};

export const useTasks = () => {
    const context = useContext(TaskContext);
    if (context === undefined) {
        throw new Error("useTasks must be used within a TaskProvider");
    }
    return context;
};
