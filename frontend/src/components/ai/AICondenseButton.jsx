import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import axios from 'axios';

/**
 * AICondenseButton Component (Phase 14)
 * Provides AI-powered text condensation for announcements
 * Integrates with Gemini API via backend proxy
 */
const AICondenseButton = ({ content, churchId, onCondensed, disabled = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCondense = async () => {
    if (!content || !churchId) {
      setError('Content and church ID are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/ai/condense', {
        content,
        churchId
      });

      if (response.data.success) {
        onCondensed(response.data.data.condensedContent);
      } else {
        setError(response.data.error || 'Failed to condense content');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to connect to AI service');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCondense}
        disabled={isLoading || disabled || !content}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold
                   bg-[var(--color-primary)] text-white 
                   hover:bg-[var(--color-primary)]/90
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200"
        title="Condense announcement using AI"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Condensing...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>AI Condense</span>
          </>
        )}
      </button>

      {error && (
        <div className="text-sm text-[var(--color-error)] bg-[var(--color-error)]/10 
                        px-3 py-1 rounded-lg">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="text-xs text-[var(--color-textSecondary)]">
          Powered by Google Gemini • Character limit: 500
        </div>
      )}
    </div>
  );
};

export default AICondenseButton;