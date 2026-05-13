import { useState } from 'react';
import { MessageSquare, Star } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const ROLES = ['Health Planner', 'Researcher', 'NGO Staff', 'Clinician', 'Student', 'Other'];
const STORAGE_KEY = 'mhfe_feedback';

let _setOpen: ((v: boolean) => void) | null = null;
export function openFeedback() { _setOpen?.(true); }

export function FeedbackTrigger() {
  return (
    <button
      type="button"
      onClick={openFeedback}
      aria-label="Open feedback form"
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

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  _setOpen = setOpen;

  const [role, setRole] = useState('');
  const [rating, setRating] = useState(0);
  const [useCase, setUseCase] = useState('');
  const [improvement, setImprovement] = useState('');

  const reset = () => { setRole(''); setRating(0); setUseCase(''); setImprovement(''); };

  const handleSubmit = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(arr) ? arr : [];
      list.push({ timestamp: new Date().toISOString(), role, rating, useCase, improvement });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch { /* ignore */ }
    toast.success('Thank you! Your feedback helps improve this tool.');
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share your feedback</DialogTitle>
          <DialogDescription>
            Help us improve this dashboard. Your feedback is anonymous and stored locally.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">I am a...</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger aria-label="Select your role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              How easy was the dashboard to use?
            </label>
            <div className="flex gap-1" role="radiogroup" aria-label="Ease of use rating">
              {[1,2,3,4,5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  aria-checked={rating === n} role="radio"
                  className="p-1 focus:outline-none focus-visible:ring-2
                    focus-visible:ring-primary rounded">
                  <Star className={`h-6 w-6 ${
                    n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                  }`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              What did you use the dashboard for?
            </label>
            <Textarea rows={3} value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              placeholder="e.g. Finding facilities in my district..."
              aria-label="Use case" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              What would you improve?
            </label>
            <Textarea rows={3} value={improvement}
              onChange={(e) => setImprovement(e.target.value)}
              placeholder="e.g. I wish it had..."
              aria-label="Improvement suggestion" />
          </div>
          <Button className="w-full" onClick={handleSubmit}
            aria-label="Submit feedback">
            Submit feedback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FeedbackDialog;
