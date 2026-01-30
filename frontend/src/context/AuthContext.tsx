import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface User {
    id: string;
    username: string;
    email: string;
    completedTasks: number[];
    xp: number;
}

export interface RegisteredUser {
    _id: string;
    username: string;
    password: string;
    createdAt?: string;
    xp: number;
    progress: number[];
}

interface AuthContextType {
    user: User | null;
    login: (username: string, password?: string) => Promise<void>;
    logout: () => void;
    updateProgress: (taskId: number, xp: number) => void;
    submitTask: (submission: { taskId: number, questionId?: string, code: string, language?: string, status?: string, duration?: number }) => Promise<void>;
    isAuthenticated: boolean;
    // Admin features
    registeredUsers: RegisteredUser[];
    registerUser: (username: string) => void;
    deleteUser: (username: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = "http://localhost:5000";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
    const navigate = useNavigate();

    // Load Session from LocalStorage
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Load Registered Users from Backend (Admin view mostly)
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch(`${API_URL}/api/users`);
                if (res.ok) {
                    const data = await res.json();
                    setRegisteredUsers(data);
                }
            } catch (error) {
                console.error("Failed to fetch users", error);
            }
        };
        fetchUsers();
    }, []);

    const generatePassword = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let pass = "";
        for (let i = 0; i < 8; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return pass;
    };

    const registerUser = async (username: string) => {
        const password = generatePassword();

        try {
            const res = await fetch(`${API_URL}/api/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Failed to register team");
                return;
            }

            // Refresh the list to get full data (including _id/xp defaults)
            const usersRes = await fetch(`${API_URL}/api/users`);
            if (usersRes.ok) {
                const usersData = await usersRes.json();
                setRegisteredUsers(usersData);
            }

            toast.success(`Team registered! Password: ${password}`);
        } catch (error) {
            toast.error("Network error registration failed");
        }
    };

    const deleteUser = async (username: string) => {
        try {
            const res = await fetch(`${API_URL}/api/users/${username}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setRegisteredUsers(prev => prev.filter(u => u.username !== username));
                toast.success("Team removed");
            } else {
                toast.error("Failed to delete team");
            }
        } catch (error) {
            toast.error("Network error deleting team");
        }
    };

    const login = async (username: string, password?: string) => {
        if (!password) {
            toast.error("Password is required");
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Login failed");
                return;
            }

            const userData = data.user;
            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
            toast.success(`Welcome back, ${userData.username}!`);
            navigate("/");

        } catch (error) {
            console.error(error);
            toast.error("Login failed due to network error");
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
        toast.info("Logged out successfully");
        navigate("/login");
    };

    const updateProgress = async (taskId: number, xp: number) => {
        if (!user) return;

        // Optimistic UI update
        if (user.completedTasks.includes(taskId)) return;

        const updatedUser = {
            ...user,
            completedTasks: [...user.completedTasks, taskId],
            xp: user.xp + xp
        };

        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser)); // Update session

        try {
            await fetch(`${API_URL}/api/progress`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: user.username, taskId, xp })
            });
            toast.success(`Task Completed! You earned ${xp} XP!`);
        } catch (error) {
            console.error("Failed to sync progress", error);
        }
    };

    const submitTask = async (submission: { taskId: number, questionId?: string, code: string, language?: string, status?: string, duration?: number }) => {
        if (!user) return;
        try {
            await fetch(`${API_URL}/api/submissions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: user.username,
                    ...submission
                })
            });
        } catch (error) {
            console.error("Failed to submit task", error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            updateProgress,
            submitTask, // Export this
            isAuthenticated: !!user,
            registeredUsers,
            registerUser,
            deleteUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
