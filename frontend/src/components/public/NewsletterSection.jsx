/**
 * Newsletter Section Component
 * Newsletter signup form with enhanced design
 */

import { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { Mail, Send, CheckCircle, Loader2 } from 'lucide-react';

const NewsletterSection = () => {
  const { success, error: toastError } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call - replace with actual endpoint when available
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would make an actual API call:
      // const response = await fetch('/api/newsletter/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email })
      // });
      
      setIsSuccess(true);
      success('Successfully subscribed to newsletter!');
      setEmail('');
      
      // Reset success message after 5 seconds
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      toastError('Failed to subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 bg-[var(--color-background)]">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-[var(--color-surface)] rounded-3xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left Side - Content */}
              <div className="p-8 md:p-12">
                <div className="w-16 h-16 bg-[var(--color-primary)]-100 rounded-2xl flex items-center justify-center mb-6">
                  <Mail className="h-8 w-8 text-[var(--color-primary)]-800" aria-hidden="true" />
                </div>
                
                <h2 className="text-3xl font-bold text-[var(--color-text)] mb-4">Stay Connected</h2>
                <p className="text-[var(--color-textSecondary)] mb-6">
                  Subscribe to our newsletter to receive weekly updates, announcements, and spiritual inspiration delivered straight to your inbox.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                    <span className="text-[var(--color-text)]">Weekly church updates</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                    <span className="text-[var(--color-text)]">Event notifications</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                    <span className="text-[var(--color-text)]">Spiritual content</span>
                  </div>
                </div>
              </div>

              {/* Right Side - Form */}
              <div className="bg-gradient-to-br from-[var(--color-primary)]-800 to-[var(--color-primary)]-900 p-8 md:p-12 flex flex-col justify-center">
                <h3 className="text-2xl font-bold text-white mb-2">Subscribe Now</h3>
                <p className="text-white/80 mb-6">Join our community of believers</p>

                {isSuccess ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" aria-hidden="true" />
                    <p className="text-white text-lg font-medium">Successfully subscribed!</p>
                    <p className="text-white/70 text-sm mt-2">Check your email for confirmation.</p>
                  </div>
                ) : (
                  <form
                    className="space-y-4"
                    onSubmit={handleSubmit}
                  >
                    <div>
                      <input
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)]/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                        aria-label="Email address for newsletter"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn bg-[var(--color-surface)] text-[var(--color-primary)]-900 hover:bg-[var(--color-surface)] shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Subscribe to newsletter"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                          <span>Subscribing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" aria-hidden="true" />
                          <span>Subscribe</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                <p className="text-white/60 text-sm mt-4 text-center">
                  We respect your privacy. Unsubscribe anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
