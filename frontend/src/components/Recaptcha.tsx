import { useEffect, useId, useRef } from 'react';

const SITE_KEY =
  (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) ??
  // Real key pair registered at https://www.google.com/recaptcha/admin,
  // paired with the secret key auth-service uses by default.
  '6LfiK6MtAAAAABnEH2scOy7gx-Kf3ZmqNuozbr8Z';

const SCRIPT_SRC = 'https://www.google.com/recaptcha/api.js?render=explicit';

interface GrecaptchaWidget {
  render: (
    container: HTMLElement,
    params: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void },
  ) => number;
  reset: (widgetId?: number) => void;
}

declare global {
  interface Window {
    grecaptcha?: GrecaptchaWidget;
    __recaptchaOnLoad?: () => void;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.grecaptcha) return Promise.resolve();
  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise((resolve) => {
      window.__recaptchaOnLoad = resolve;
      const script = document.createElement('script');
      script.src = `${SCRIPT_SRC}&onload=__recaptchaOnLoad`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    });
  }
  return scriptLoadPromise;
}

interface RecaptchaProps {
  onVerify: (token: string | null) => void;
  resetKey?: number;
}

export function Recaptcha({ onVerify, resetKey }: RecaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const id = useId();

  useEffect(() => {
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !containerRef.current || widgetIdRef.current !== null) return;
      widgetIdRef.current = window.grecaptcha!.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token: string) => onVerify(token),
        'expired-callback': () => onVerify(null),
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resetKey === undefined || widgetIdRef.current === null || !window.grecaptcha) return;
    window.grecaptcha.reset(widgetIdRef.current);
    onVerify(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return <div ref={containerRef} id={`recaptcha-${id}`} className="recaptcha-widget" />;
}
