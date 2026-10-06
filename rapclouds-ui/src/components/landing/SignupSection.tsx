import { useState } from 'react';
import type { ChangeEvent, CSSProperties, FormEvent, JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import SplashDecor from './SplashDecor';

type Intent = 'shirt-art' | 'karaoke';
type Status = 'idle' | 'loading' | 'success' | 'error';
type ErrorKind = 'email' | 'network';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_ERROR = 'That email does not look right. Try again?';
const NETWORK_ERROR = 'Something went wrong. Try again in a second.';

const INTENT_OPTIONS: ReadonlyArray<{ value: Intent; label: string }> = [
  { value: 'shirt-art', label: 'Shirts and art' },
  { value: 'karaoke', label: 'Karaoke' },
];

const pillBase: CSSProperties = {
  alignItems: 'center',
  borderRadius: '999px',
  cursor: 'pointer',
  display: 'inline-flex',
  fontSize: '0.95rem',
  fontWeight: 600,
  padding: '0.65em 1.35em',
  transition:
    'border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
};

const pillIdle: CSSProperties = {
  ...pillBase,
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
};

const pillSelected: CSSProperties = {
  ...pillBase,
  background:
    'linear-gradient(var(--bg-elevated), var(--bg-elevated)) padding-box, var(--grad-chrome) border-box',
  border: '1px solid transparent',
  boxShadow: '0 6px 24px rgba(233, 30, 140, 0.25)',
  color: 'var(--text-bright)',
};

const inputBase: CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  color: 'var(--text-bright)',
  fontSize: '0.98rem',
  padding: '0.85em 1.1em',
  width: '100%',
};

const inputInvalid: CSSProperties = {
  ...inputBase,
  border: '1px solid var(--rc-magenta)',
};

export default function SignupSection(): JSX.Element {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [intent, setIntent] = useState<Intent>('shirt-art');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<ErrorKind | null>(null);

  const clearError = () => {
    if (error !== null) {
      setError(null);
      setStatus('idle');
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    clearError();
  };

  const handleIntentChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIntent(e.target.value as Intent);
    clearError();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'loading') return;
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('email');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, intent }),
      });
      if (res.status === 422) {
        setError('email');
        setStatus('error');
        return;
      }
      if (!res.ok) {
        setError('network');
        setStatus('error');
        return;
      }
    } catch {
      setError('network');
      setStatus('error');
      return;
    }
    setStatus('success');
    navigate('/welcome');
  };

  return (
    <div className="relative">
      <SplashDecor variant="signup" />
      <div className="rc-content mx-auto flex max-w-2xl flex-col items-center gap-10 px-6 py-24 md:py-32">
        <header className="flex flex-col items-center gap-3 text-center">
          <span
            className="text-[0.78rem] font-bold uppercase tracking-[0.28em]"
            style={{ color: 'var(--muted)' }}
          >
            Ordering
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl">
            Order your <span className="rc-gradient-text-static">first piece</span>
          </h2>
          <p className="max-w-xl" style={{ color: 'var(--text)' }}>
            RapClouds is opening up. Drop your email and tell us what you are here for — apparel
            and art, or the karaoke. We will reach out the moment orders go live.
          </p>
        </header>

        <div className="rc-card rc-card-featured w-full max-w-md" data-reveal="up">
          {status === 'success' ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <h3 className="rc-gradient-text-static text-2xl">You are on the list.</h3>
              <p style={{ color: 'var(--text)' }}>
                Check your inbox for the confirmation. Orders open soon — you will hear from us
                first.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="signup-email"
                  className="text-[0.95rem] font-semibold"
                  style={{ color: 'var(--text-bright)' }}
                >
                  Email
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  aria-invalid={error === 'email'}
                  aria-describedby={error === 'email' ? 'signup-email-error' : undefined}
                  className="w-full outline-none transition-colors placeholder:text-[#8b8b99] focus:ring-2 focus:ring-[#FF4DA6]/40"
                  style={error === 'email' ? inputInvalid : inputBase}
                />
                {error === 'email' && (
                  <p
                    id="signup-email-error"
                    role="alert"
                    className="text-[0.88rem]"
                    style={{ color: 'var(--rc-pink)' }}
                  >
                    {EMAIL_ERROR}
                  </p>
                )}
              </div>

              <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
                <legend
                  className="px-0 pb-1 text-[0.95rem] font-semibold"
                  style={{ color: 'var(--text-bright)' }}
                >
                  I am here for
                </legend>
                <div className="flex flex-wrap gap-3">
                  {INTENT_OPTIONS.map((option) => {
                    const selected = intent === option.value;
                    return (
                      <label key={option.value} className="cursor-pointer">
                        <input
                          type="radio"
                          name="signup-intent"
                          value={option.value}
                          checked={selected}
                          onChange={handleIntentChange}
                          className="peer sr-only"
                        />
                        <span
                          className="peer-focus-visible:ring-2 peer-focus-visible:ring-[#FF4DA6] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0d0d12]"
                          style={selected ? pillSelected : pillIdle}
                        >
                          {option.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {error === 'network' && (
                <p role="alert" className="text-[0.88rem]" style={{ color: 'var(--rc-pink)' }}>
                  {NETWORK_ERROR}
                </p>
              )}

              <button
                type="submit"
                className="rc-btn rc-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Sending...' : 'Order Now'}
              </button>

              <p className="text-center text-[0.85rem]" style={{ color: 'var(--muted)' }}>
                Early access only. No spam, just the drop.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
