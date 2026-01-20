import { useState } from "react";
import { Language } from "@/components/LanguageSelector";
import { toast } from "sonner";

interface ExecutionResult {
  output: string;
  error: string;
  executionTime?: number;
}

// Language mapping for Piston API
const languageConfig: Record<Language, { language: string; version: string }> = {
  python: { language: "python", version: "3.10.0" },
  c: { language: "c", version: "10.2.0" },
  java: { language: "java", version: "15.0.2" },
};

export function useCodeExecution() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExecutionResult>({
    output: "",
    error: "",
  });

  const executeCode = async (code: string, language: Language) => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      const config = languageConfig[language];
      
      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: config.language,
          version: config.version,
          files: [
            {
              name: language === "java" ? "Main.java" : `main.${language === "python" ? "py" : language}`,
              content: code,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to execute code. Please try again.");
      }

      const data = await response.json();
      const executionTime = Date.now() - startTime;

      if (data.run) {
        const output = data.run.stdout || "";
        const error = data.run.stderr || "";
        const exitCode = data.run.code;

        if (exitCode !== 0 && error) {
          setResult({ output: "", error, executionTime });
          toast.error("Code execution failed");
        } else {
          setResult({ 
            output: output || (error ? "" : "Program executed successfully with no output."), 
            error: error && exitCode !== 0 ? error : "",
            executionTime 
          });
          if (!error || exitCode === 0) {
            toast.success("Code executed successfully!");
          }
        }
      } else if (data.compile && data.compile.stderr) {
        setResult({ output: "", error: data.compile.stderr, executionTime: Date.now() - startTime });
        toast.error("Compilation failed");
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      setResult({ output: "", error: errorMessage, executionTime });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResult = () => {
    setResult({ output: "", error: "" });
  };

  return { executeCode, isLoading, result, clearResult };
}
