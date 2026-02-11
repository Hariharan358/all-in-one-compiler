import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface User {
    id: string;
    username: string;
    email: string;
    completedTasks: number[];
    xp: number;
    isAdmin?: boolean;
}

export interface RegisteredUser {
    _id: string;
    username: string;
    email: string;
    password: string;
    createdAt?: string;
    xp: number;
    progress: number[];
}

interface AuthContextType {
    user: User | null;
    login: (username: string, password?: string) => Promise<void>;
    adminLogin: (password: string) => Promise<void>;
    logout: () => void;
    updateProgress: (taskId: number, xp: number) => void;
    submitTask: (submission: { taskId: number, questionId?: string, code: string, language?: string, status?: string, duration?: number }) => Promise<void>;
    isAuthenticated: boolean;
    isAdmin: boolean;
    // Admin features
    registeredUsers: RegisteredUser[];
    registerUser: (username: string, email: string) => void;
    deleteUser: (username: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

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

    const registerUser = async (username: string, email: string) => {
        try {
            const res = await fetch(`${API_URL}/api/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email })
            });

            const data = await res.json();

            if (!res.ok) {
                setTimeout(() => {
                    toast.error(data.error || "Failed to register team");
                }, 0);
                return;
            }

            // Refresh the list to get full data (including _id/xp defaults)
            const usersRes = await fetch(`${API_URL}/api/users`);
            if (usersRes.ok) {
                const usersData = await usersRes.json();
                setRegisteredUsers(usersData);
            }

            if (data.emailSent) {
                setTimeout(() => {
                    toast.success(`Team "${username}" registered successfully! Credentials sent to ${email}`);
                }, 0);
            } else {
                setTimeout(() => {
                    toast.warning(`Team "${username}" registered but email failed to send. Please provide credentials manually.`);
                }, 0);
            }

        } catch (error) {
            console.error(error);
            setTimeout(() => {
                toast.error("Registration failed due to network error");
            }, 0);
        }
    };

    const deleteUser = async (username: string) => {
        try {
            const res = await fetch(`${API_URL}/api/users/${username}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setRegisteredUsers(prev => prev.filter(u => u.username !== username));
                setTimeout(() => {
                    toast.success("Team removed");
                }, 0);
            } else {
                setTimeout(() => {
                    toast.error("Failed to delete team");
                }, 0);
            }
        } catch (error) {
            setTimeout(() => {
                toast.error("Network error deleting team");
            }, 0);
        }
    };

    const login = async (username: string, password?: string) => {
        if (!password) {
            setTimeout(() => {
                toast.error("Password is required");
            }, 0);
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
                setTimeout(() => {
                    toast.error(data.error || "Login failed");
                }, 0);
                return;
            }

            const userData = data.user;
            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
            setTimeout(() => {
                toast.success(`Welcome back, ${userData.username}!`);
            }, 0);
            navigate("/");

        } catch (error) {
            console.error(error);
            setTimeout(() => {
                toast.error("Login failed due to network error");
            }, 0);
        }
    };

    const adminLogin = async (password: string) => {
        try {
            const res = await fetch(`${API_URL}/api/admin/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password })
            });

            const data = await res.json();

            if (!res.ok) {
                setTimeout(() => {
                    toast.error(data.error || "Admin login failed");
                }, 0);
                return;
            }

            const userData = data.user;
            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
            setTimeout(() => {
                toast.success("Welcome, Admin!");
            }, 0);
            navigate("/admin");

        } catch (error) {
            console.error(error);
            setTimeout(() => {
                toast.error("Admin login failed due to network error");
            }, 0);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
        setTimeout(() => {
            toast.info("Logged out successfully");
        }, 0);
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
            const response = await fetch(`${API_URL}/api/progress`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: user.username, taskId, xp })
            });

            if (response.ok) {
                setTimeout(() => {
                    toast.success(`Task Completed! You earned ${xp} XP!`);
                }, 0);
            } else {
                const errorText = await response.text();
                console.error("Progress update failed:", errorText);
                setTimeout(() => {
                    toast.error("Failed to update progress");
                }, 0);
            }
        } catch (error) {
            console.error("Failed to sync progress", error);
            setTimeout(() => {
                toast.error("Network error updating progress");
            }, 0);
        }
    };

    const submitTask = async (submission: { taskId: number, questionId?: string, code: string, language?: string, status?: string, duration?: number }) => {
        if (!user) {
            console.error("No user found for submission");
            return;
        }

        console.log("Submitting task:", { username: user.username, ...submission });

        try {
            const response = await fetch(`${API_URL}/api/submissions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: user.username,
                    ...submission
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Submission successful:", result);
                // Move toast to a setTimeout to avoid setState during render
                setTimeout(() => {
                    toast.success("Solution submitted successfully!");
                }, 0);
            } else {
                const errorText = await response.text();
                console.error("Submission failed:", errorText);
                setTimeout(() => {
                    toast.error("Failed to submit solution");
                }, 0);
            }
        } catch (error) {
            console.error("Failed to submit task", error);
            setTimeout(() => {
                toast.error("Network error during submission");
            }, 0);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            adminLogin,
            logout,
            updateProgress,
            submitTask, // Export this
            isAuthenticated: !!user,
            isAdmin: !!user?.isAdmin,
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
