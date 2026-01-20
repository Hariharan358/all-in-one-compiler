import { cn } from "@/lib/utils";

export type Language = "python" | "c" | "java";

interface LanguageConfig {
  id: Language;
  name: string;
  icon: string;
  version: string;
}

export const languages: LanguageConfig[] = [
  { id: "python", name: "Python", icon: "🐍", version: "3.10" },
  { id: "c", name: "C", icon: "⚙️", version: "GCC 10.2" },
  { id: "java", name: "Java", icon: "☕", version: "15.0.2" },
];

interface LanguageSelectorProps {
  selected: Language;
  onSelect: (lang: Language) => void;
}

export function LanguageSelector({ selected, onSelect }: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      {languages.map((lang) => (
        <button
          key={lang.id}
          onClick={() => onSelect(lang.id)}
          className={cn(
            "language-badge flex items-center gap-2",
            selected === lang.id
              ? "language-badge-active"
              : "language-badge-inactive"
          )}
        >
          <span>{lang.icon}</span>
          <span>{lang.name}</span>
        </button>
      ))}
    </div>
  );
}
