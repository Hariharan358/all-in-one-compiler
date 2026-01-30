import { cn } from "@/lib/utils";
import { Terminal, CheckCircle2, XCircle, Clock } from "lucide-react";

interface OutputPanelProps {
  output: string;
  error: string;
  isLoading: boolean;
  executionTime?: number;
}

export function OutputPanel({ output, error, isLoading, executionTime }: OutputPanelProps) {
  const hasError = error.length > 0;
  const hasOutput = output.length > 0 || hasError;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Output</span>
        </div>
        
        <div className="flex items-center gap-3">
          {executionTime !== undefined && !isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{executionTime}ms</span>
            </div>
          )}
          
          {hasOutput && !isLoading && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs",
              hasError ? "text-destructive" : "text-success"
            )}>
              {hasError ? (
                <>
                  <XCircle className="w-3 h-3" />
                  <span>Error</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Success</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Output Content */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Running code...</span>
            </div>
          </div>
        ) : hasOutput ? (
          <pre
            className={cn(
              "p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap",
              hasError ? "text-destructive" : "text-foreground"
            )}
          >
            {hasError ? error : output}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground/60">
            <div className="text-center">
              <Terminal className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Run your code to see the output</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
