import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import AppHeader from '@/components/dashboard/AppHeader';

const ROLES = ['Health Planner', 'Researcher', 'NGO Staff', 'Clinician', 'Student', 'Other'];
const STAR_LABELS = ['', 'Very difficult', 'Difficult', 'Neutral', 'Easy', 'Very easy'];

const FEEDBACK_URL = 'https://script.google.com/macros/s/AKfycbwkaAEdBUBKkSGwnfmTojHFQSHkX8SWYEtc8RddnPwJho3h2jFpRzvWeSaXz07rQVXOug/exec';

export default function Feedback() {
  const navigate = useNavigate();

  const [submitted, setSubmitted]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [role, setRole]               = useState('');
  const [rating, setRating]           = useState(0);
  const [hovered, setHovered]         = useState(0);
  const [useCase, setUseCase]         = useState('');
  const [improvement, setImprovement] = useState('');
  const [errors, setErrors]           = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!role)   e.role   = 'Please select your role.';
    if (!rating) e.rating = 'Please give a rating.';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setSubmitting(true);
    setSubmitError('');

    const payload = {
      timestamp:   new Date().toISOString(),
      role,
      rating,
      useCase,
      improvement,
    };

    try {
      await fetch(FEEDBACK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify(payload),
      });

      // Keep a local backup too
      try {
        const raw  = localStorage.getItem('mhfe_feedback');
        const list = Array.isArray(JSON.parse(raw ?? '[]')) ? JSON.parse(raw ?? '[]') : [];
        list.push(payload);
        localStorage.setItem('mhfe_feedback', JSON.stringify(list));
      } catch { /* ignore */ }

      setSubmitted(true);
    } catch (err) {
      setSubmitError('Could not send feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center animate-fade-in">
            <div className="flex justify-center mb-5">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Thank you for your feedback!</h2>
            <p className="text-sm text-muted-foreground mb-8">
              Your response has been recorded and helps us improve the dashboard for health planners and researchers across Bangladesh.
            </p>
            <Button onClick={() => navigate('/')} className="w-full sm:w-auto px-8">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 flex items-start justify-center p-4 md:p-10">
        <div className="w-full max-w-xl animate-fade-in">

          <div className="mb-8 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Share your feedback</h2>
              <p className="text-xs text-muted-foreground">Anonymous · Sent securely to our team</p>
            </div>
          </div>

          <div className="space-y-6">

            {/* Role */}
            <div className="dashboard-panel p-5 space-y-3">
              <label className="text-sm font-semibold text-foreground block">
                I am a <span className="text-destructive">*</span>
              </label>
              <Select value={role} onValueChange={(v) => { setRole(v); setErrors((e) => ({ ...e, role: '' })); }}>
                <SelectTrigger aria-label="Select your role" className={errors.role ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select your role…" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
            </div>

            {/* Rating */}
            <div className="dashboard-panel p-5 space-y-3">
              <label className="text-sm font-semibold text-foreground block">
                How easy was the dashboard to use? <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-2" role="radiogroup" aria-label="Ease of use rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => { setRating(n); setErrors((e) => ({ ...e, rating: '' })); }}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    aria-label={`${n} star — ${STAR_LABELS[n]}`}
                    aria-checked={rating === n}
                    role="radio"
                    className="p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        n <= (hovered || rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-muted stroke-muted-foreground/40'
                      }`}
                    />
                  </button>
                ))}
                {(hovered || rating) > 0 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {STAR_LABELS[hovered || rating]}
                  </span>
                )}
              </div>
              {errors.rating && <p className="text-xs text-destructive">{errors.rating}</p>}
            </div>

            {/* Use case */}
            <div className="dashboard-panel p-5 space-y-3">
              <label className="text-sm font-semibold text-foreground block">
                What did you use the dashboard for?
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                rows={4}
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="e.g. Finding mental health facilities in my district, comparing coverage across regions, planning resource allocation…"
                aria-label="Use case"
                className="resize-none text-sm"
              />
            </div>

            {/* Improvement */}
            <div className="dashboard-panel p-5 space-y-3">
              <label className="text-sm font-semibold text-foreground block">
                What would you improve?
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                rows={4}
                value={improvement}
                onChange={(e) => setImprovement(e.target.value)}
                placeholder="e.g. I wish it had more granular data, better mobile support, filtering by service type…"
                aria-label="Improvement suggestion"
                className="resize-none text-sm"
              />
            </div>

            {/* Submit error */}
            {submitError && (
              <p className="text-sm text-destructive text-center">{submitError}</p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-10">
              <Button variant="outline" onClick={() => navigate('/')} className="sm:w-auto" disabled={submitting}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="flex-1" disabled={submitting}>
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Sending…' : 'Submit feedback'}
              </Button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
