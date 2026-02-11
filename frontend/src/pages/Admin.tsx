import { useState, useEffect } from "react";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"; // Import Dialog
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Zap, Copy, Users, FolderKanban, Trophy, Activity, Clock, CheckCircle, Eye, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const Admin = () => {
    const { tasks, addQuestion, deleteQuestion } = useTasks();
    const { registeredUsers, registerUser, deleteUser, isAuthenticated, isAdmin, user } = useAuth();
    const navigate = useNavigate();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/admin-login");
            return;
        }
        if (!isAdmin) {
            navigate("/login");
            return;
        }
    }, [isAuthenticated, isAdmin, navigate]);

    // Don't render anything if not authenticated or not admin
    if (!isAuthenticated || !isAdmin) {
        return null;
    }

    // Task Management State
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [content, setContent] = useState("");
    const [codeSnippet, setCodeSnippet] = useState("");
    const [language, setLanguage] = useState("python");

    // User Management State
    const [teamName, setTeamName] = useState("");
    const [teamEmail, setTeamEmail] = useState("");
    const [activities, setActivities] = useState<any[]>([]);
    const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
    const [leaderboardUsers, setLeaderboardUsers] = useState<any[]>([]);
    const [questionOrders, setQuestionOrders] = useState<any[]>([]);
    const [xpAward, setXpAward] = useState("");

    // Fetch activities, submissions, and leaderboard data
    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/activities');
                if (res.ok) {
                    const data = await res.json();
                    setActivities(data);
                }
            } catch (error) {
                console.error("Failed to fetch activities", error);
            }
        };

        const fetchAllSubmissions = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/submissions');
                if (res.ok) {
                    const data = await res.json();
                    setAllSubmissions(data);
                }
            } catch (error) {
                console.error("Failed to fetch submissions", error);
            }
        };

        const fetchLeaderboard = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/users');
                if (res.ok) {
                    const data = await res.json();
                    setLeaderboardUsers(data);
                }
            } catch (error) {
                console.error("Failed to fetch leaderboard", error);
            }
        };

        const fetchQuestionOrders = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/question-orders');
                if (res.ok) {
                    const data = await res.json();
                    setQuestionOrders(data);
                }
            } catch (error) {
                console.error("Failed to fetch question orders", error);
            }
        };

        // Initial fetch
        fetchActivities();
        fetchAllSubmissions();
        fetchLeaderboard();
        fetchQuestionOrders();

        // Poll for updates every 5 seconds for real-time leaderboard
        const interval = setInterval(() => {
            fetchActivities();
            fetchAllSubmissions();
            fetchLeaderboard();
            fetchQuestionOrders();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Submission Viewing State
    const [viewingUser, setViewingUser] = useState<string | null>(null);
    const [userSubmissions, setUserSubmissions] = useState<any[]>([]);
    const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);


    // Fetch submissions when a user is selected
    useEffect(() => {
        if (viewingUser) {
            const fetchSubmissions = async () => {
                try {
                    const res = await fetch(`http://localhost:5000/api/submissions/${viewingUser}`);
                    if (res.ok) {
                        const data = await res.json();
                        setUserSubmissions(data);
                    }
                } catch (error) {
                    console.error("Failed to fetch submissions", error);
                }
            };
            fetchSubmissions();
        } else {
            setUserSubmissions([]);
        }
    }, [viewingUser]);

    const selectedTask = tasks.find(t => t.id === selectedTaskId);

    const handleAddQuestion = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask || !content) return;

        addQuestion(selectedTask.id, {
            content,
            type: selectedTask.type, // Explicitly pass the type
            language: (selectedTask.type === 'debugging' || selectedTask.type === 'blackbox') ? language : undefined,
            codeSnippet: (selectedTask.type === 'debugging' || selectedTask.type === 'blackbox') ? codeSnippet : undefined
        });

        toast.success("Question added successfully");
        setContent("");
        setCodeSnippet("");
    };

    const handleAddTeam = (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamName.trim() || !teamEmail.trim()) return;
        registerUser(teamName, teamEmail);
        setTeamName("");
        setTeamEmail("");
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Button variant="ghost" asChild className="mb-2 pl-0 hover:bg-transparent hover:text-primary">
                            <Link to="/" className="flex items-center gap-2">
                                <ArrowLeft className="w-4 h-4" /> Back to Home
                            </Link>
                        </Button>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                            <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-orange-600">Admin Mode</span>
                            </div>
                        </div>
                        <p className="text-muted-foreground">Manage rounds, questions, and teams • Logged in as {user?.username}</p>
                    </div>
                </div>

                {/* Statistics Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Teams</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{registeredUsers.length}</div>
                            <p className="text-xs text-muted-foreground mt-1">Registered teams</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-500">{allSubmissions.length}</div>
                            <p className="text-xs text-muted-foreground mt-1">Code submissions</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Active Teams</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-500">
                                {new Set(allSubmissions.map(s => s.username)).size}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Teams with submissions</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-purple-500">{activities.length}</div>
                            <p className="text-xs text-muted-foreground mt-1">Total activities logged</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="rounds" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-6 max-w-[1000px]">
                        <TabsTrigger value="rounds" className="flex items-center gap-2">
                            <FolderKanban className="w-4 h-4" /> Rounds
                        </TabsTrigger>
                        <TabsTrigger value="teams" className="flex items-center gap-2">
                            <Users className="w-4 h-4" /> Teams
                        </TabsTrigger>
                        <TabsTrigger value="submissions" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Submissions
                        </TabsTrigger>
                        <TabsTrigger value="leaderboard" className="flex items-center gap-2">
                            <Trophy className="w-4 h-4" /> Leaderboard
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Activity Log
                        </TabsTrigger>
                        <TabsTrigger value="allocations" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Allocations
                        </TabsTrigger>
                    </TabsList>

                    {/* ROUNDS MANAGEMENT TAB */}
                    <TabsContent value="rounds" className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                            {/* Left Sidebar: Round Selection */}
                            <div className="md:col-span-4 space-y-4">
                                <h2 className="text-lg font-semibold mb-4">Select Round</h2>
                                {tasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => setSelectedTaskId(task.id)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${selectedTaskId === task.id ? 'bg-primary/10 border-primary shadow-md' : 'bg-card hover:bg-accent border-border'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold">{task.title}</h3>
                                            <Badge variant="outline" className="capitalize">{task.type}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                                        <div className="mt-3 text-xs font-medium text-muted-foreground flex items-center gap-2">
                                            <span className="bg-secondary px-2 py-1 rounded-md">{task.questions?.length || 0} Questions</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Right Side: Question Management */}
                            <div className="md:col-span-8">
                                {selectedTask ? (
                                    <div className="space-y-6">
                                        {/* Add New Question Form */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Plus className="w-5 h-5 text-primary" />
                                                    Add Question to {selectedTask.title}
                                                </CardTitle>
                                                <CardDescription>
                                                    {selectedTask.type === 'riddle' && "Add a new brain teaser or riddle."}
                                                    {selectedTask.type === 'debugging' && "Add a buggy code snippet for users to fix."}
                                                    {selectedTask.type === 'blackbox' && "Add a problem statement and hidden implementation logic."}
                                                    {selectedTask.type === 'case-study' && "Add a business scenario or case study question."}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <form onSubmit={handleAddQuestion} className="space-y-4">
                                                    {(selectedTask.type === 'debugging' || selectedTask.type === 'blackbox') && (
                                                        <div className="space-y-2">
                                                            <Label>Language</Label>
                                                            <Select value={language} onValueChange={setLanguage}>
                                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="python">Python</SelectItem>
                                                                    <SelectItem value="javascript">JavaScript</SelectItem>
                                                                    <SelectItem value="java">Java</SelectItem>
                                                                    <SelectItem value="cpp">C++</SelectItem>
                                                                    <SelectItem value="c">C</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    )}

                                                    <div className="space-y-2">
                                                        <Label>
                                                            {selectedTask.type === 'riddle' ? "Riddle / Question" :
                                                                selectedTask.type === 'case-study' ? "Scenario Description" :
                                                                    "Problem Description"}
                                                        </Label>
                                                        <Textarea
                                                            value={content}
                                                            onChange={e => setContent(e.target.value)}
                                                            placeholder="Enter the question text here..."
                                                            required
                                                            className="h-24"
                                                        />
                                                    </div>

                                                    {(selectedTask.type === 'debugging' || selectedTask.type === 'blackbox') && (
                                                        <div className="space-y-2">
                                                            <Label>{selectedTask.type === 'debugging' ? "Buggy Code Snippet" : "Starter Code"}</Label>
                                                            <Textarea
                                                                value={codeSnippet}
                                                                onChange={e => setCodeSnippet(e.target.value)}
                                                                placeholder="Paste code here..."
                                                                className="font-mono h-48"
                                                            />
                                                        </div>
                                                    )}

                                                    <Button type="submit" className="w-full">Add Question</Button>
                                                </form>
                                            </CardContent>
                                        </Card>

                                        {/* List Existing Questions */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Existing Questions ({selectedTask.questions?.length})</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {selectedTask.questions && selectedTask.questions.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {selectedTask.questions.map((q, index) => (
                                                            <div key={q.id} className="p-4 border rounded-lg bg-card/50 hover:bg-accent/50 transition-colors flex justify-between items-start group">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-mono text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">Q{index + 1}</span>
                                                                        {q.language && <Badge variant="outline" className="text-xs py-0 h-5">{q.language}</Badge>}
                                                                    </div>
                                                                    <p className="text-sm font-medium line-clamp-2">{q.content}</p>
                                                                    {q.codeSnippet && (
                                                                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-hidden max-h-20 text-muted-foreground">
                                                                            {q.codeSnippet}
                                                                        </pre>
                                                                    )}
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => deleteQuestion(selectedTask.id, q.id)}
                                                                    className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        No questions added yet.
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-card/50">
                                        <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
                                            <Zap className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-xl font-semibold mb-2">No Round Selected</h3>
                                        <p className="text-muted-foreground max-w-sm">
                                            Select a round from the left sidebar to manage its questions and challenges.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* TEAMS MANAGEMENT TAB */}
                    <TabsContent value="teams" className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                            {/* Add Team Form */}
                            <div className="md:col-span-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Register New Team</CardTitle>
                                        <CardDescription>Enter team name and email. Password will be auto-generated and sent via email.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleAddTeam} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Team Name</Label>
                                                <Input
                                                    value={teamName}
                                                    onChange={e => setTeamName(e.target.value)}
                                                    placeholder="e.g. CodeWarriors"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Team Leader Email</Label>
                                                <Input
                                                    type="email"
                                                    value={teamEmail}
                                                    onChange={e => setTeamEmail(e.target.value)}
                                                    placeholder="e.g. leader@example.com"
                                                    required
                                                />
                                            </div>
                                            <Button type="submit" className="w-full">
                                                <Plus className="w-4 h-4 mr-2" /> Register Team & Send Credentials
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Registered Teams List */}
                            <div className="md:col-span-8">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Registered Teams ({registeredUsers.length})</CardTitle>
                                        <CardDescription>Manage access credentials for participating teams.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Team Name</TableHead>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead>Password</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {registeredUsers.length > 0 ? (
                                                    registeredUsers.map((user) => (
                                                        <TableRow key={user.username}>
                                                            <TableCell className="font-medium">{user.username}</TableCell>
                                                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <code className="bg-muted px-2 py-1 rounded font-mono text-sm">{user.password}</code>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(user.password)}>
                                                                        <Copy className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => setViewingUser(user.username)}
                                                                        title="View Submissions"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => deleteUser(user.username)}
                                                                        className="text-destructive hover:bg-destructive/10"
                                                                        title="Delete Team"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                                            No teams registered yet.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* SUBMISSIONS MONITORING TAB */}
                    <TabsContent value="submissions" className="space-y-8">
                        <div className="grid grid-cols-1 gap-8">
                            {/* Submissions Overview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>All Team Submissions ({allSubmissions.length})</CardTitle>
                                    <CardDescription>Monitor and review code submissions from all teams in real-time</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {allSubmissions.length > 0 ? (
                                            allSubmissions.map((submission) => (
                                                <div
                                                    key={submission._id}
                                                    className="flex items-start justify-between p-4 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
                                                    onClick={() => setSelectedSubmission(submission)}
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <Badge variant="outline" className="font-semibold">
                                                                {submission.username}
                                                            </Badge>
                                                            <Badge variant="secondary">
                                                                Task {submission.taskId}
                                                            </Badge>
                                                            {submission.language && (
                                                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                                    {submission.language}
                                                                </Badge>
                                                            )}
                                                            <Badge className={`${submission.status === 'Submitted' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                                'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                                }`}>
                                                                {submission.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(submission.timestamp).toLocaleString()}
                                                            </span>
                                                            {submission.duration && (
                                                                <span className="flex items-center gap-1">
                                                                    <Zap className="w-3 h-3" />
                                                                    {Math.round(submission.duration / 1000)}s
                                                                </span>
                                                            )}
                                                            {submission.questionId && (
                                                                <span className="text-xs">
                                                                    Question: {submission.questionId.substring(0, 8)}...
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-12 text-muted-foreground">
                                                No submissions yet. Submissions will appear here as teams complete tasks.
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Team-wise Submission Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Team Submission Summary</CardTitle>
                                    <CardDescription>Overview of submissions per team</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Team Name</TableHead>
                                                <TableHead className="text-center">Total Submissions</TableHead>
                                                <TableHead className="text-center">Last Submission</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {registeredUsers.map((user) => {
                                                const userSubs = allSubmissions.filter(s => s.username === user.username);
                                                const lastSub = userSubs[0];
                                                return (
                                                    <TableRow key={user.username}>
                                                        <TableCell className="font-medium">{user.username}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="secondary">{userSubs.length}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center text-sm text-muted-foreground">
                                                            {lastSub ? new Date(lastSub.timestamp).toLocaleString() : 'No submissions'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setViewingUser(user.username)}
                                                            >
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                View Details
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* LEADERBOARD TAB */}
                    <TabsContent value="leaderboard" className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Live Leaderboard</CardTitle>
                                <CardDescription>Real-time scores of all participating teams (updates every 5 seconds)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">Rank</TableHead>
                                            <TableHead>Team</TableHead>
                                            <TableHead>Solved</TableHead>
                                            <TableHead className="text-right">Total XP</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leaderboardUsers
                                            .sort((a, b) => b.xp - a.xp)
                                            .map((user, index) => (
                                                <TableRow key={user._id}>
                                                    <TableCell className="font-bold text-lg">
                                                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-lg cursor-pointer hover:underline" onClick={() => setViewingUser(user.username)}>
                                                        {user.username}
                                                    </TableCell>
                                                    <TableCell>{user.progress?.length || 0} Tasks</TableCell>
                                                    <TableCell className="text-right font-bold text-primary text-xl">
                                                        {user.xp} XP
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setViewingUser(user.username)}
                                                            title="View Solutions"
                                                        >
                                                            <Eye className="w-4 h-4 text-muted-foreground" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        {leaderboardUsers.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                    No teams have joined yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ACTIVITY LOG TAB */}
                    <TabsContent value="activity" className="space-y-8">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Team Activity Log</CardTitle>
                                    <CardDescription>Recent actions and submissions from all teams.</CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                        try {
                                            const res = await fetch('http://localhost:5000/api/test-activity', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' }
                                            });
                                            if (res.ok) {
                                                toast.success("Test activity created!");
                                                // Refresh activities
                                                const activitiesRes = await fetch('http://localhost:5000/api/activities');
                                                if (activitiesRes.ok) {
                                                    const data = await activitiesRes.json();
                                                    setActivities(data);
                                                }
                                            }
                                        } catch (error) {
                                            toast.error("Failed to create test activity");
                                        }
                                    }}
                                >
                                    Test Activity
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {activities.length > 0 ? (
                                        activities.map((activity) => (
                                            <div key={activity._id} className="flex items-start gap-4 p-4 border rounded-lg bg-card/50">
                                                <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center ${activity.action === 'SOLVED_TASK' ? 'bg-green-100 text-green-600' :
                                                    activity.action === 'SUBMITTED_SOLUTION' ? 'bg-blue-100 text-blue-600' :
                                                        activity.action === 'REGISTERED' ? 'bg-purple-100 text-purple-600' :
                                                            'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {activity.action === 'SOLVED_TASK' ? <CheckCircle className="w-5 h-5" /> :
                                                        activity.action === 'SUBMITTED_SOLUTION' ? <FileText className="w-5 h-5" /> :
                                                            activity.action === 'REGISTERED' ? <Users className="w-5 h-5" /> :
                                                                <Activity className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-semibold">{activity.username}</h4>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(activity.timestamp).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-foreground/90 mt-1">{activity.details}</p>
                                                    {activity.xp_earned && (
                                                        <Badge variant="secondary" className="mt-2 text-xs">
                                                            +{activity.xp_earned} XP
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 text-muted-foreground">
                                            No recent activities.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>


                    {/* ALLOCATIONS TAB */}
                    <TabsContent value="allocations" className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Problem Allocations</CardTitle>
                                <CardDescription>View which problems have been assigned to each team per round.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Team Name</TableHead>
                                            <TableHead>Round (Task)</TableHead>
                                            <TableHead>Assigned Question ID</TableHead>
                                            <TableHead>Allocated At</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {questionOrders.length > 0 ? (
                                            questionOrders.map((order) => (
                                                <TableRow key={order._id}>
                                                    <TableCell className="font-medium">{order.username}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {tasks.find(t => t.id === order.taskId)?.title || `Task ${order.taskId}`}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {order.questionOrder && order.questionOrder.length > 0 ? (
                                                            <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                                                                {order.questionOrder[0]}
                                                            </code>
                                                        ) : (
                                                            <span className="text-muted-foreground italic">None</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {new Date(order.createdAt).toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                    No allocations found yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Submission Detail Dialog */}
                {selectedSubmission && (
                    <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Submission Details</DialogTitle>
                                <DialogDescription>
                                    Submitted by {selectedSubmission.username} on {new Date(selectedSubmission.timestamp).toLocaleString()}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-muted-foreground">Team</Label>
                                        <p className="font-semibold">{selectedSubmission.username}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Task ID</Label>
                                        <p className="font-semibold">Task {selectedSubmission.taskId}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Language</Label>
                                        <p className="font-semibold">{selectedSubmission.language || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Status</Label>
                                        <Badge className="mt-1">{selectedSubmission.status}</Badge>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Duration</Label>
                                        <p className="font-semibold">
                                            {selectedSubmission.duration ? `${Math.round(selectedSubmission.duration / 1000)}s` : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Timestamp</Label>
                                        <p className="font-semibold text-sm">
                                            {new Date(selectedSubmission.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {selectedSubmission.questionId && (
                                    <div>
                                        <Label className="text-muted-foreground">Question ID</Label>
                                        <p className="font-mono text-sm">{selectedSubmission.questionId}</p>
                                    </div>
                                )}

                                <div>
                                    <Label className="text-muted-foreground mb-2 block">Submitted Code</Label>
                                    <div className="bg-muted/50 p-4 rounded-lg border">
                                        <pre className="text-sm overflow-x-auto">
                                            <code>{selectedSubmission.code || 'No code submitted'}</code>
                                        </pre>
                                    </div>
                                </div>

                                <div className="mt-6 border-t pt-4">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-orange-500">
                                        <Zap className="w-4 h-4" /> Admin Controls: Award / Edit XP
                                    </h4>
                                    <div className="flex gap-3 items-end bg-secondary/10 p-4 rounded-lg border border-border/50">
                                        <div className="grid gap-1.5 flex-1">
                                            <Label htmlFor="xp-input" className="text-xs text-muted-foreground">XP Amount (Positive or Negative)</Label>
                                            <Input
                                                id="xp-input"
                                                type="number"
                                                placeholder="e.g. 20"
                                                value={xpAward}
                                                onChange={(e) => setXpAward(e.target.value)}
                                                className="bg-background"
                                            />
                                        </div>
                                        <Button
                                            className="bg-orange-500 hover:bg-orange-600 text-white min-w-[100px]"
                                            disabled={!xpAward}
                                            onClick={async () => {
                                                const xp = parseInt(xpAward);
                                                if (isNaN(xp)) return toast.error("Invalid XP amount");

                                                try {
                                                    const res = await fetch('http://localhost:5000/api/admin/award-xp', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            username: selectedSubmission.username,
                                                            xp: xp,
                                                            taskId: selectedSubmission.taskId,
                                                            reason: "Manual Grading via Admin Panel"
                                                        })
                                                    });

                                                    const data = await res.json();
                                                    if (res.ok) {
                                                        toast.success(`Successfully updated XP for ${selectedSubmission.username}`);
                                                        setXpAward("");
                                                    } else {
                                                        toast.error(data.error || "Failed to update XP");
                                                    }
                                                } catch (e) {
                                                    toast.error("Network error");
                                                }
                                            }}
                                        >
                                            Update Score
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-2 pl-1">
                                        * Note: This adds/subtracts from the user's total XP and marks the task as completed.
                                    </p>
                                </div>

                                <div className="flex justify-end gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedSubmission.code || '');
                                            toast.success("Code copied to clipboard");
                                        }}
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy Code
                                    </Button>
                                    <Button onClick={() => setSelectedSubmission(null)}>
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                {/* User Submissions Dialog */}
                {viewingUser && (
                    <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
                        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Submissions by {viewingUser}</DialogTitle>
                                <DialogDescription>
                                    All submissions from this team
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                {userSubmissions.length > 0 ? (
                                    userSubmissions.map((submission) => (
                                        <Card key={submission._id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                                            setSelectedSubmission(submission);
                                            setViewingUser(null);
                                        }}>
                                            <CardHeader>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary">Task {submission.taskId}</Badge>
                                                        {submission.language && (
                                                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                                {submission.language}
                                                            </Badge>
                                                        )}
                                                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                                                            {submission.status}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">
                                                        {new Date(submission.timestamp).toLocaleString()}
                                                    </span>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="bg-muted/50 p-3 rounded border">
                                                    <pre className="text-xs overflow-x-auto line-clamp-3">
                                                        <code>{submission.code}</code>
                                                    </pre>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No submissions found for this team.
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Submissions Dialog */}
            <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Submissions for {viewingUser}</DialogTitle>
                        <DialogDescription>
                            Review code and answers submitted across all rounds.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-6">
                        {userSubmissions.length > 0 ? (
                            tasks.map(task => {
                                const taskSubmissions = userSubmissions.filter(s => s.taskId === task.id);
                                if (taskSubmissions.length === 0) return null;

                                return (
                                    <div key={task.id} className="border rounded-lg p-4 bg-card">
                                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                            {task.title}
                                            <Badge variant="secondary" className="text-xs">{task.type}</Badge>
                                        </h3>
                                        <div className="space-y-4">
                                            {taskSubmissions.map((sub: any, idx: number) => (
                                                <div key={idx} className="bg-muted/30 p-3 rounded-md border border-border/50">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-sm font-medium text-muted-foreground">
                                                            Question {sub.questionId ? sub.questionId : `#${idx + 1}`}
                                                        </span>
                                                        <div className="flex items-center gap-3">
                                                            {sub.duration && (
                                                                <span className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">
                                                                    ⏱️ {Math.floor(sub.duration / 60000)}m {(Math.floor(sub.duration / 1000) % 60)}s
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(sub.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {sub.language !== 'text' ? (
                                                        <div className="relative">
                                                            <Badge variant="outline" className="mb-2">{sub.language}</Badge>
                                                            <pre className="bg-black/90 text-gray-100 p-3 rounded-md font-mono text-sm overflow-x-auto">
                                                                <code>{sub.code}</code>
                                                            </pre>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-secondary/20 p-3 rounded-md italic text-foreground/90 whitespace-pre-wrap">
                                                            {sub.code}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                No submissions found for this team.
                            </div>
                        )}
                        {/* If user has submissions but they don't map to current tasks (legacy?) */}
                        {userSubmissions.length > 0 && tasks.every(t => !userSubmissions.some(s => s.taskId === t.id)) && (
                            <div className="p-4 bg-yellow-500/10 text-yellow-500 rounded border border-yellow-500/20">
                                Found {userSubmissions.length} submissions but they don't match current round IDs.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Admin;
