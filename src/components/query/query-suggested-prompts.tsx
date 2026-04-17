'use client';

interface QuerySuggestedPromptsProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
  visible: boolean;
}

/**
 * Horizontal row of pill/chip buttons for suggested prompts.
 * Uses onMouseDown with preventDefault to avoid input blur before click registers.
 */
export function QuerySuggestedPrompts({
  prompts,
  onSelectPrompt,
  visible,
}: QuerySuggestedPromptsProps) {
  if (!visible || prompts.length === 0) return null;

  return (
    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent input blur
            onSelectPrompt(prompt);
          }}
          className="text-caption shrink-0 cursor-pointer whitespace-nowrap rounded-full bg-muted px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
