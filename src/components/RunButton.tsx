import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RunButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function RunButton({ onClick, isLoading, disabled }: RunButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "relative px-6 py-2 font-semibold transition-all duration-200",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        !isLoading && !disabled && "glow-primary hover:scale-105",
        isLoading && "opacity-80"
      )}
    >
      <span className="flex items-center gap-2">
        {isLoading ? (
          <>
            <Square className="w-4 h-4 fill-current" />
            <span>Running...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            <span>Run Code</span>
          </>
        )}
      </span>
    </Button>
  );
}
