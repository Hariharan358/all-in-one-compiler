import { useState, useEffect } from "react";
import { Code2, Zap, RotateCcw } from "lucide-react";
import { LanguageSelector, Language, languages } from "@/components/LanguageSelector";
import { CodeEditor } from "@/components/CodeEditor";
import { OutputPanel } from "@/components/OutputPanel";
import { RunButton } from "@/components/RunButton";
import { Button } from "@/components/ui/button";
import { codeTemplates } from "@/lib/codeTemplates";
import { useCodeExecution } from "@/hooks/useCodeExecution";
import { Toaster } from "sonner";

const Index = () => {
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(codeTemplates.python);
  const { executeCode, isLoading, result, clearResult } = useCodeExecution();

  // Update code template when language changes
  useEffect(() => {
    setCode(codeTemplates[language]);
    clearResult();
  }, [language]);

  const handleRun = () => {
    executeCode(code, language);
  };

  const handleReset = () => {
    setCode(codeTemplates[language]);
    clearResult();
  };

  const currentLang = languages.find((l) => l.id === language);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="top-right" theme="dark" />
      
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Code2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  CodeRunner
                  <Zap className="w-4 h-4 text-primary animate-pulse-glow" />
                </h1>
                <p className="text-xs text-muted-foreground">Online Compiler</p>
              </div>
            </div>

            {/* Language Selector */}
            <LanguageSelector selected={language} onSelect={setLanguage} />

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <RunButton onClick={handleRun} isLoading={isLoading} disabled={!code.trim()} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
          {/* Editor Panel */}
          <div className="flex flex-col animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Editor</span>
                <span className="px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground">
                  {currentLang?.icon} {currentLang?.name} {currentLang?.version}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {code.split("\n").length} lines
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <CodeEditor code={code} onChange={setCode} language={language} />
            </div>
          </div>

          {/* Output Panel */}
          <div className="flex flex-col animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="mb-3">
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
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-3">
        <div className="container mx-auto px-4">
          <p className="text-center text-xs text-muted-foreground">
            Powered by Piston API • Supports Python, C, and Java • No account required
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
