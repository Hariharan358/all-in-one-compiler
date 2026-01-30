import { useState, useEffect } from "react";
import { Code2, Zap, RotateCcw, ArrowLeft, CheckCircle2, AlertTriangle, FileText, ChevronLeft, ChevronRight, Maximize, Minimize, Clock } from "lucide-react";
import { LanguageSelector, Language, languages } from "@/components/LanguageSelector";
import { CodeEditor } from "@/components/CodeEditor";
import { OutputPanel } from "@/components/OutputPanel";
import { RunButton } from "@/components/RunButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { codeTemplates } from "@/lib/codeTemplates";
import { useCodeExecution } from "@/hooks/useCodeExecution";
import { Toaster, toast } from "sonner";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTasks } from "@/context/TaskContext";

const Compiler = () => {
    const [searchParams] = useSearchParams();
    const taskId = searchParams.get("task");
    const { user, updateProgress, submitTask } = useAuth();
    const navigate = useNavigate();
    const { tasks } = useTasks();

    const [language, setLanguage] = useState<Language>("python");
    const [code, setCode] = useState(codeTemplates.python);
    const { executeCode, isLoading, result, clearResult } = useCodeExecution();

    const [isTaskStarted, setIsTaskStarted] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Find current task (Round)
    const currentTask = tasks.find(t => t.id === Number(taskId));
    const questions = currentTask?.questions || [];
    const currentQuestion = questions[currentQuestionIndex];

    const isTextTask = currentTask?.type === 'riddle' || currentTask?.type === 'case-study';

    useEffect(() => {
        if (!taskId) {
            setIsTaskStarted(true);
        }
    }, [taskId]);

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

    // Timer State
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Initial load check for timer
    useEffect(() => {
        if (taskId) {
            const savedStart = localStorage.getItem(`startTime_${taskId}`);
            if (savedStart) {
                setStartTime(Number(savedStart));
                setIsTaskStarted(true);
            }
        }
    }, [taskId]);

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
        const now = Date.now();
        setStartTime(now);
        localStorage.setItem(`startTime_${taskId}`, now.toString());
        toast.success("Round Started! Timer running. Fullscreen mode enabled.");
    };

    const handleRun = () => {
        if (isTextTask) return;
        executeCode(code, language);
    };

    const handleSubmit = async () => {
        if (!taskId) return;

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

        // Submit to Backend
        if (currentTask) {
            await submitTask({
                taskId: currentTask.id,
                questionId: currentQuestion?.id,
                code: code,
                language: isTextTask ? 'text' : language,
                status: 'Submitted',
                duration: duration
            });
        }

        toast.success(`Question ${currentQuestionIndex + 1} Submitted!`);

        // Move to next question if available
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // Round Complete
            updateProgress(Number(taskId), currentTask?.points || 10);

            // Clear Timer
            localStorage.removeItem(`startTime_${taskId}`);

            toast.success("Round Completed! 🎉");
            setTimeout(() => navigate("/"), 1500);
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
                            <li>Complete all {questions.length} questions to finish the round.</li>
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
        <div className="min-h-screen bg-background flex flex-col">
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
                                <p className="text-xs text-muted-foreground">
                                    Question {currentQuestionIndex + 1} of {questions.length}
                                </p>
                            </div>
                        </div>

                        {/* Center: Navigation */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-secondary/20 p-1 px-3 rounded-lg font-mono text-sm text-primary border border-primary/20">
                                <Clock className="w-4 h-4" />
                                {formatTime(elapsedTime)}
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
            </main>
        </div>
    );
};

export default Compiler;
