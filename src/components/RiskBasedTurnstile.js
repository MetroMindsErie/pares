import { useEffect, useState } from 'react';
import Turnstile from './Turnstile';

export default function RiskBasedTurnstile({
  action,
  onTokenChange,
  onRequirementChange,
  theme = 'auto',
  size = 'compact',
  className = '',
}) {
  const [required, setRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadPolicy() {
      setLoading(true);
      try {
        const res = await fetch('/api/turnstile/policy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });

        const data = await res.json();
        if (!mounted) return;

        const needsChallenge = Boolean(data?.requireTurnstile);
        setRequired(needsChallenge);
        onRequirementChange?.(needsChallenge);

        if (!needsChallenge) {
          onTokenChange?.('');
        }
      } catch {
        // Fail safe: require challenge when policy can't be fetched.
        if (!mounted) return;
        setRequired(true);
        onRequirementChange?.(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPolicy();
    return () => {
      mounted = false;
    };
  }, [action, onTokenChange, onRequirementChange]);

  if (loading) return null;
  if (!required) return null;

  return (
    <Turnstile
      onVerify={onTokenChange}
      theme={theme}
      size={size}
      className={className}
    />
  );
}
