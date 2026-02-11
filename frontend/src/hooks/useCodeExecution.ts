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

      const baseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/compile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: language,
          code: code,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to execute code. Please check if the local server is running.");
      }

      const data = await response.json();
      const executionTime = Date.now() - startTime;

      if (data.error && !data.output) {
        // Runtime or compilation error only
        setResult({ output: "", error: data.error, executionTime });
        toast.error("Code execution failed");
      } else {
        // Success or output with error (warnings or partial run)
        setResult({
          output: data.output || (data.error ? "" : "Program executed successfully with no output."),
          error: data.error || "",
          executionTime
        });
        if (!data.error) {
          toast.success("Code executed successfully!");
        }
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
