import { useUser } from '@clerk/react';
import { useAuth } from '@clerk/tanstack-react-start';
import { useState } from 'react';

import { submitFeedback } from '../db/feedback.func';

type FormState = 'collapsed' | 'expanded' | 'submitted';

export function FeedbackForm() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [formState, setFormState] = useState<FormState>('collapsed');
  const [category, setCategory] = useState<'bug' | 'feature'>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const userEmail = user?.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await submitFeedback({
        data: {
          category,
          message,
          email: isSignedIn ? undefined : email || undefined,
        },
      });

      // Success — show confirmation
      setFormState('submitted');
      setMessage('');
      setEmail('');

      // Reset after 5 seconds
      setTimeout(() => {
        setFormState('collapsed');
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (formState === 'submitted') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 text-center">
        <p className="text-[#b6e600] text-sm font-semibold">
          Thanks! Your feedback has been submitted.
        </p>
      </div>
    );
  }

  if (formState === 'collapsed') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 text-center">
        <button
          type="button"
          onClick={() => setFormState('expanded')}
          className="inline-flex items-center gap-2 rounded-full border border-[#8c5b2e] bg-black/30 px-4 py-2 text-sm font-semibold text-[#e1bdb3] hover:text-[#ffad98] hover:border-[#b87a3e] transition-colors shadow-[0_0_18px_rgba(255,90,10,0.10)]"
        >
          <span className="text-base">💬</span>
          Got feedback? We&apos;d love to hear it.
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-noir-900 border border-noir-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-noir-100 mb-4">Submit Feedback</h3>

        <form onSubmit={(e: React.FormEvent) => { void handleSubmit(e); }} className="space-y-4">
          {/* Category */}
          <div>
            <label htmlFor="feedback-category" className="block text-sm font-medium text-noir-300 mb-1.5">
              Category
            </label>
            <select
              id="feedback-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as 'bug' | 'feature')}
              className="w-full bg-noir-800 border border-noir-700 rounded-lg px-3 py-2 text-sm text-noir-100 focus:outline-none focus:border-doom-400 transition-colors"
            >
              <option value="bug">🐛 Bug Report</option>
              <option value="feature">💡 Feature Request</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="feedback-message" className="block text-sm font-medium text-noir-300 mb-1.5">
              Message
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Tell us what's on your mind..."
              className="w-full bg-noir-800 border border-noir-700 rounded-lg px-3 py-2 text-sm text-noir-100 placeholder:text-noir-500 focus:outline-none focus:border-doom-400 transition-colors resize-vertical"
              required
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-noir-500">
                {message.length}/500
              </span>
            </div>
          </div>

          {/* Email */}
          {isSignedIn && userEmail ? (
            <div>
              <label className="block text-sm font-medium text-noir-300 mb-1.5">Email</label>
              <p className="text-sm text-noir-400 bg-noir-800/50 border border-noir-700 rounded-lg px-3 py-2">
                {userEmail}
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="feedback-email" className="block text-sm font-medium text-noir-300 mb-1.5">
                Email <span className="text-noir-500">(optional)</span>
              </label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-noir-800 border border-noir-700 rounded-lg px-3 py-2 text-sm text-noir-100 placeholder:text-noir-500 focus:outline-none focus:border-doom-400 transition-colors"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-doom-400 text-sm font-medium">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center px-4 py-2 bg-[#ff5a0a] text-[#15100d] text-xs font-black uppercase tracking-[-0.01em] hover:bg-[#ff7a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormState('collapsed');
                setError(null);
                setMessage('');
                setEmail('');
              }}
              className="text-xs text-noir-400 hover:text-noir-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
