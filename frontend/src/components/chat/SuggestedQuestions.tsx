const SUGGESTIONS = [
  'What documents should I read first?',
  'Who is my compliance contact?',
  "What's the process for GIC rate exceptions?",
  'How do I complete a rate exception request?',
];

interface Props {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export default function SuggestedQuestions({ onSelect, disabled }: Props) {
  return (
    <div className="text-center">
      <p className="font-display text-lg font-semibold text-white">Ask your Knowledge Buddy</p>
      <p className="mt-1 text-sm text-brand-muted">Grounded in your LOB&rsquo;s documents and knowledge map. Try one of these:</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(q)}
            className="rounded-lg border border-brand-border bg-brand-dark px-4 py-3 text-left text-sm text-brand-muted transition hover:border-brand-green hover:text-white disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
