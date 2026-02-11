import { useState, useEffect } from "react";
import { Code2, Zap, RotateCcw, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, FileText, ChevronLeft, ChevronRight, Maximize, Minimize, Clock } from "lucide-react";
import { LanguageSelector, Language, languages } from "@/components/LanguageSelector";
import { CodeEditor } from "@/components/CodeEditor";
import { OutputPanel } from "@/components/OutputPanel";
import { RunButton } from "@/components/RunButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { codeTemplates } from "@/lib/codeTemplates";
import { useCodeExecution } from "@/hooks/useCodeExecution";
import { Toaster, toast } from "sonner";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTasks } from "@/context/TaskContext";

const Compiler = () => {
    const [searchParams] = useSearchParams();
    const taskId = searchParams.get("task");
    const { user, updateProgress, submitTask, isAuthenticated, isAdmin } = useAuth();
    const navigate = useNavigate();
    const { tasks } = useTasks();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/login");
            return;
        }
        // Redirect admins to admin panel - they shouldn't access tasks
        if (isAdmin) {
            toast.error("Admin users cannot access tasks");
            navigate("/admin");
            return;
        }
    }, [isAuthenticated, isAdmin, navigate]);

    // Don't render anything if not authenticated or is admin
    if (!isAuthenticated || isAdmin) {
        return null;
    }

    const [language, setLanguage] = useState<Language>("python");
    const [code, setCode] = useState(codeTemplates.python);
    const { executeCode, isLoading, result, clearResult } = useCodeExecution();

    const [isTaskStarted, setIsTaskStarted] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Copy-paste prevention
    useEffect(() => {
        // Show warning message when component mounts
        setTimeout(() => {
            toast.warning("⚠️ Copy-paste, right-click, and developer tools are disabled during the challenge!", {
                duration: 5000,
            });
        }, 100);

        const preventCopyPaste = (e: KeyboardEvent) => {
            // Prevent Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+Z, Ctrl+Y
            if (e.ctrlKey && (
                e.key === 'c' || e.key === 'C' ||
                e.key === 'v' || e.key === 'V' ||
                e.key === 'x' || e.key === 'X' ||
                e.key === 'a' || e.key === 'A' ||
                e.key === 'z' || e.key === 'Z' ||
                e.key === 'y' || e.key === 'Y'
            )) {
                e.preventDefault();
                toast.error("Copy-paste operations are disabled during the challenge!");
                return false;
            }

            // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
                (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
                (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
            ) {
                e.preventDefault();
                toast.error("Developer tools are disabled during the challenge!");
                return false;
            }
        };

        const preventContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            toast.error("Right-click is disabled during the challenge!");
            return false;
        };

        const preventSelectAll = (e: Event) => {
            e.preventDefault();
            return false;
        };

        // Add event listeners
        document.addEventListener('keydown', preventCopyPaste);
        document.addEventListener('contextmenu', preventContextMenu);
        document.addEventListener('selectstart', preventSelectAll);

        // Disable clipboard API - only if not already disabled
        const originalClipboard = navigator.clipboard;
        let clipboardOverridden = false;

        try {
            // Check if clipboard is already overridden by checking a custom property
            if (!(navigator.clipboard as any)?.__disabled) {
                Object.defineProperty(navigator, 'clipboard', {
                    value: {
                        writeText: () => {
                            toast.error("Clipboard access is disabled during the challenge!");
                            return Promise.reject(new Error('Clipboard disabled'));
                        },
                        readText: () => {
                            toast.error("Clipboard access is disabled during the challenge!");
                            return Promise.reject(new Error('Clipboard disabled'));
                        },
                        __disabled: true // Mark as disabled
                    },
                    configurable: true, // Allow it to be reconfigured
                    writable: false
                });
                clipboardOverridden = true;
            }
        } catch (error) {
            console.warn('Could not override clipboard:', error);
        }

        // Cleanup function
        return () => {
            document.removeEventListener('keydown', preventCopyPaste);
            document.removeEventListener('contextmenu', preventContextMenu);
            document.removeEventListener('selectstart', preventSelectAll);

            // Restore clipboard only if we overrode it
            if (clipboardOverridden) {
                try {
                    Object.defineProperty(navigator, 'clipboard', {
                        value: originalClipboard,
                        configurable: true,
                        writable: true
                    });
                } catch (error) {
                    // Ignore errors when restoring clipboard
                }
            }
        };
    }, []);

    // Disable drag and drop
    useEffect(() => {
        const preventDragDrop = (e: DragEvent) => {
            e.preventDefault();
            toast.error("Drag and drop is disabled during the challenge!");
            return false;
        };

        document.addEventListener('dragover', preventDragDrop);
        document.addEventListener('drop', preventDragDrop);

        return () => {
            document.removeEventListener('dragover', preventDragDrop);
            document.removeEventListener('drop', preventDragDrop);
        };
    }, []);

    // Find current task (Round)
    const currentTask = tasks.find(t => t.id === Number(taskId));
    const questions = currentTask?.questions || [];
    const currentQuestion = questions[currentQuestionIndex];

    const isTextTask = currentTask?.type === 'riddle' || currentTask?.type === 'case-study';

    // NEW: Language Selection for Round 2
    const [selectionLanguage, setSelectionLanguage] = useState<string>("");
    const { refreshTasks } = useTasks();

    const handleLanguageSelection = async () => {
        if (!selectionLanguage) {
            toast.error("Please select a language first");
            return;
        }

        try {
            const res = await fetch('http://localhost:5000/api/allocate-question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user?.username,
                    taskId: Number(taskId),
                    language: selectionLanguage
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to allocate question");
            }

            toast.success(`Language selected! Loading your ${selectionLanguage} challenge...`);
            await refreshTasks();

        } catch (err: any) {
            toast.error(err.message);
        }
    };


    useEffect(() => {
        if (!taskId) {
            setIsTaskStarted(true);
        }
    }, [taskId]);

    // ... (keep existing effects)

    // ... rest of existing code

    // Track fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Load question content
    useEffect(() => {
        if (currentTask && currentQuestion) {
            // Show randomization notice on first question
            if (currentQuestionIndex === 0 && questions.length > 1) {
                setTimeout(() => {
                    toast.info("📝 Questions are randomized for each team to ensure fairness", {
                        duration: 4000,
                    });
                }, 500);
            }

            // Determine initial code base
            let initialCode = "";

            if (isTextTask) {
                // For text tasks, maybe load previous answer if saved? For now empty.
                initialCode = "";
            } else {
                // For coding/debugging/blackbox
                if (currentQuestion.codeSnippet) {
                    initialCode = currentQuestion.codeSnippet;
                } else {
                    initialCode = codeTemplates[language] || "";
                }
            }

            setCode(initialCode);

            // Set language if specified in question or task (fallback)
            if (currentQuestion.language && Object.keys(codeTemplates).includes(currentQuestion.language.toLowerCase())) {
                setLanguage(currentQuestion.language.toLowerCase() as Language);
            }

            clearResult();
            toast.info(`Loaded Question ${currentQuestionIndex + 1}: ${currentQuestion.content.substring(0, 30)}...`);
        }
    }, [currentTask && currentQuestion?.id, currentQuestionIndex]);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
                toast.error("Could not enter full screen mode");
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // Timer State - Per Question
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Reset timer when question changes
    useEffect(() => {
        if (isTaskStarted && currentQuestion) {
            const questionKey = `startTime_${taskId}_q${currentQuestionIndex}`;
            const savedStart = localStorage.getItem(questionKey);

            if (savedStart) {
                // Resume existing timer for this question
                setStartTime(Number(savedStart));
            } else {
                // Start new timer for this question
                const now = Date.now();
                setStartTime(now);
                localStorage.setItem(questionKey, now.toString());
                toast.info(`Timer started for Question ${currentQuestionIndex + 1}`);
            }

            setElapsedTime(0);
        }
    }, [currentQuestionIndex, isTaskStarted, taskId, currentQuestion]);

    // Timer Interval
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTaskStarted && startTime) {
            interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTaskStarted, startTime]);

    // Format timer
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // ... existing logic ...

    const handleStartTask = () => {
        toggleFullScreen();
        setIsTaskStarted(true);
        // Timer will be started automatically by the useEffect when question loads
        toast.success("Round Started! Fullscreen mode enabled.");
    };

    const handleRun = () => {
        if (isTextTask) return;
        executeCode(code, language);
    };

    const handleSubmit = async () => {
        if (!taskId) {
            toast.error("No task ID found!");
            return;
        }

        if (!currentTask) {
            toast.error("Task not found!");
            return;
        }

        if (!currentQuestion) {
            toast.error("Question not found!");
            return;
        }

        if (isTextTask) {
            if (!code.trim()) {
                toast.warning("Please provide an answer!");
                return;
            }
        } else {
            // Basic validation check
            if (!result.output && !result.error && !result.executionTime) {
                toast.warning("Please run your code first to verify output!");
                return;
            }
        }

        // Timer Calculation
        const duration = startTime ? Date.now() - startTime : 0;

        try {
            // Submit to Backend - convert questionId to string
            const questionIdStr = currentQuestion.id ? String(currentQuestion.id) : undefined;


            await submitTask({
                taskId: currentTask.id,
                questionId: questionIdStr,
                code: code,
                language: isTextTask ? 'text' : language,
                status: 'Submitted',
                duration: duration
            });

            toast.success(`Question ${currentQuestionIndex + 1} Submitted!`);

            // Move to next question if available
            if (currentQuestionIndex < questions.length - 1) {
                // Clear current question timer
                const currentQuestionKey = `startTime_${taskId}_q${currentQuestionIndex}`;
                localStorage.removeItem(currentQuestionKey);

                // Move to next question (timer will auto-start via useEffect)
                setCurrentQuestionIndex(prev => prev + 1);
            } else {
                // Round Complete
                await updateProgress(Number(taskId), currentTask?.points || 10);

                // Clear all question timers for this task
                for (let i = 0; i < questions.length; i++) {
                    localStorage.removeItem(`startTime_${taskId}_q${i}`);
                }

                toast.success("Round Completed! 🎉");
                setTimeout(() => navigate("/"), 1500);
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Failed to submit. Please try again.");
        }
    };

    const handleReset = () => {
        if (currentQuestion) {
            if (isTextTask) {
                setCode("");
            } else {
                setCode(currentQuestion.codeSnippet || codeTemplates[language]);
            }
        }
        clearResult();
    };

    const currentLang = languages.find((l) => l.id === language);

    // Language Selection Screen for Task 2 (if no questions allocated yet)
    if (taskId && currentTask?.id === 2 && questions.length === 0) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <Toaster position="top-right" theme="dark" />
                <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Code2 className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">
                        Select Your Language
                    </h1>
                    <p className="text-muted-foreground">
                        For this debugging round, please select your preferred programming language.
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        {['Python', 'Java', 'C'].map((lang) => (
                            <Button
                                key={lang}
                                variant={selectionLanguage === lang ? "default" : "outline"}
                                className={`h-12 text-lg justify-start px-6 ${selectionLanguage === lang ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                                onClick={() => setSelectionLanguage(lang)}
                            >
                                <span className={`w-3 h-3 rounded-full mr-3 ${lang === 'Python' ? 'bg-yellow-400' :
                                    lang === 'Java' ? 'bg-red-500' :
                                        'bg-blue-500'
                                    }`}></span>
                                {lang}
                            </Button>
                        ))}
                    </div>

                    <Button
                        onClick={handleLanguageSelection}
                        size="lg"
                        className="w-full font-semibold text-lg h-12 shadow-lg shadow-primary/20 mt-6"
                        disabled={!selectionLanguage}
                    >
                        Confirm Selection <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    }

    if (taskId && !isTaskStarted) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <Toaster position="top-right" theme="dark" />
                <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Zap className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">
                        {currentTask?.title || "Assessment"}
                    </h1>
                    <p className="text-muted-foreground">{currentTask?.description}</p>
                    <div className="text-muted-foreground space-y-3 text-sm text-left bg-secondary/30 p-4 rounded-lg border border-border/50">
                        <p className="font-semibold text-foreground flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" /> Assessment Rules:
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li>Full screen mode is mandatory.</li>
                            <li>No switching tabs allowed.</li>
                            <li>Complete your allocated {questions.length === 1 ? 'question' : `${questions.length} questions`} to finish the round.</li>
                        </ul>
                    </div>
                    <Button onClick={handleStartTask} size="lg" className="w-full font-semibold text-lg h-12 shadow-lg shadow-primary/20">
                        Start Round
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col no-select no-drag">
            <Toaster position="top-right" theme="dark" />

            {/* Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        {/* Left: Round Info */}
                        <div className="flex items-center gap-3">
                            <Link to="/" className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                            </Link>
                            <div>
                                <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    {currentTask?.title}
                                </h1>
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                    Question {currentQuestionIndex + 1} of {questions.length}
                                    <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-purple-400 text-[10px]">
                                        RANDOMIZED
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Center: Navigation */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-secondary/20 p-1 px-3 rounded-lg font-mono text-sm text-primary border border-primary/20">
                                <Clock className="w-4 h-4" />
                                {formatTime(elapsedTime)}
                            </div>

                            {/* Anti-cheat indicator */}
                            <div className="flex items-center gap-2 bg-red-500/10 p-1 px-3 rounded-lg text-xs text-red-400 border border-red-500/20">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                SECURE MODE
                            </div>

                            <div className="flex items-center gap-2 bg-secondary/20 p-1 rounded-lg">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={currentQuestionIndex === 0}
                                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-sm font-medium px-2">
                                    {currentQuestionIndex + 1} / {questions.length}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={currentQuestionIndex === questions.length - 1}
                                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" onClick={toggleFullScreen} title="Toggle Fullscreen">
                                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                            </Button>

                            {!isTextTask && <LanguageSelector selected={language} onSelect={setLanguage} />}

                            <Button
                                onClick={handleSubmit}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={isLoading}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                {currentQuestionIndex === questions.length - 1 ? "Submit Round" : "Next Question"}
                            </Button>

                            <Button variant="ghost" size="sm" onClick={handleReset}>
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                            {!isTextTask && <RunButton onClick={handleRun} isLoading={isLoading} disabled={!code.trim()} />}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto px-4 py-6">
                {currentQuestion?.externalUrl ? (
                    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] animate-in fade-in zoom-in duration-300">
                        <Card className="w-full max-w-2xl bg-card border-border shadow-2xl">
                            <CardHeader className="text-center">
                                <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                    <Zap className="w-10 h-10 text-primary" />
                                </div>
                                <CardTitle className="text-3xl font-bold">External Challenge</CardTitle>
                                <CardDescription className="text-lg mt-2">
                                    You have been assigned a challenge on HackerRank.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 text-center">
                                <div className="bg-secondary/30 p-6 rounded-xl border border-border/50">
                                    <p className="text-muted-foreground mb-2">Your Assigned Challenge ID</p>
                                    <code className="text-2xl font-bold font-mono text-primary bg-primary/10 px-4 py-2 rounded-lg">
                                        {currentQuestion.id}
                                    </code>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-muted-foreground">
                                        Click the button below to open your challenge in a new tab.
                                        <br />Once you have submitted your solution there, click "Submit Round" here.
                                    </p>

                                    <Button
                                        size="lg"
                                        className="w-full h-14 text-lg gap-2"
                                        onClick={() => window.open(currentQuestion.externalUrl, '_blank')}
                                    >
                                        Open HackerRank Challenge <ArrowRight className="w-5 h-5" />
                                    </Button>

                                    <div className="pt-4 border-t border-border">
                                        <Button
                                            variant="secondary"
                                            onClick={handleSubmit}
                                            className="w-full"
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            I have completed the challenge
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
                        {/* Editor / Input Panel */}
                        <div className="flex flex-col animate-slide-up">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">
                                        {isTextTask ? "Your Answer" : "Editor"}
                                    </span>
                                    {!isTextTask && (
                                        <span className="px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground">
                                            {currentLang?.icon} {currentLang?.name} {currentLang?.version}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 min-h-0">
                                {isTextTask ? (
                                    <Textarea
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        className="h-full resize-none font-mono text-base p-4 bg-card border-border focus:ring-primary"
                                        placeholder={currentTask?.type === 'riddle' ? "Type your answer..." : "Write your pitch..."}
                                    />
                                ) : (
                                    <CodeEditor code={code} onChange={setCode} language={language} />
                                )}
                            </div>
                        </div>

                        {/* Question / Output Panel */}
                        <div className="flex flex-col animate-slide-up" style={{ animationDelay: "0.1s" }}>
                            {/* Split View for non-text tasks: Description TOP, Output BOTTOM */}
                            {!isTextTask ? (
                                <div className="flex flex-col h-full gap-4">
                                    <div className="flex-[0.4] bg-card border border-border rounded-md p-4 overflow-y-auto">
                                        <h3 className="text-sm font-bold text-muted-foreground mb-2 sm:mb-0">Problem Statement</h3>
                                        <p className="text-base whitespace-pre-wrap">{currentQuestion?.content}</p>
                                    </div>
                                    <div className="flex-[0.6] flex flex-col min-h-0">
                                        <div className="mb-2">
                                            <span className="text-sm font-medium text-foreground">Console</span>
                                        </div>
                                        <div className="flex-1 min-h-0 editor-container overflow-hidden">
                                            <OutputPanel
                                                output={result.output}
                                                error={result.error}
                                                isLoading={isLoading}
                                                executionTime={result.executionTime}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full">
                                    <div className="mb-3">
                                        <span className="text-sm font-medium text-foreground">Question</span>
                                    </div>
                                    <div className="flex-1 bg-card border border-border rounded-md p-6 overflow-y-auto">
                                        <h3 className="text-xl font-bold mb-4">{currentTask?.title}</h3>
                                        <div className="prose prose-invert max-w-none">
                                            <p className="text-lg leading-relaxed whitespace-pre-wrap">{currentQuestion?.content}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Compiler;
