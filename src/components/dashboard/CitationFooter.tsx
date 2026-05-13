import { useState } from 'react';
import { Quote, ChevronDown, Copy, Check } from 'lucide-react';

function getDeployedUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://example.com';
}

function getMonthYear(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

interface CitationProps {
  label: string;
  text: string;
}

function CitationBlock({ label, text }: CitationProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-foreground">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label} citation`}
          className="p-1 rounded hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
      <div className="font-mono text-[11px] bg-muted/50 rounded p-2 leading-relaxed break-words">
        {text}
      </div>
    </div>
  );
}

export default function CitationFooter() {
  const [open, setOpen] = useState(false);
  const url = getDeployedUrl();
  const monthYear = getMonthYear();

  const apa = `Alam, S. F. (2025). Mental Health Facility Explorer [Interactive dashboard]. Asian University for Women, Goodlife Center. ${url}. Accessed ${monthYear}.`;
  const vancouver = `Alam SF. Mental Health Facility Explorer [Internet]. Chittagong: Asian University for Women; 2025 [cited ${monthYear}]. Available from: ${url}`;

  return (
    <div className="border-t border-border bg-card/50 px-4 py-3 text-[11px] text-muted-foreground">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Toggle citation"
        className="flex items-center gap-1.5 hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        <Quote className="h-3.5 w-3.5" />
        <span>Cite this tool</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-3 flex flex-col md:flex-row gap-3">
          <CitationBlock label="APA 7th" text={apa} />
          <CitationBlock label="Vancouver" text={vancouver} />
        </div>
      )}
    </div>
  );
}
