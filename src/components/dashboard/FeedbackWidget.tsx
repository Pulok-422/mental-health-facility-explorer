import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

// Trigger button — drop inside header nav
export function FeedbackTrigger() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/feedback')}
      aria-label="Open feedback page"
      className="flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] rounded-[8px]
        border border-transparent text-muted-foreground hover:text-foreground
        transition-colors focus:outline-none focus-visible:ring-2
        focus-visible:ring-primary whitespace-nowrap"
      style={{ padding: '7px 14px' }}
    >
      <MessageSquare style={{ width: 13, height: 13 }} />
      <span className="hidden sm:inline">Feedback</span>
    </button>
  );
}

// FeedbackDialog kept as a no-op default export so old imports don't break
export function FeedbackDialog() { return null; }
export default FeedbackDialog;
