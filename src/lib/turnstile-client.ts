export const TURNSTILE_SITE_KEY = '0x4AAAAAAFuRxbj5vTrO1z1m';
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
export const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export function getTurnstileSiteKey(): string {
  if (typeof window !== 'undefined' && window.location) {
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return isLocal ? TURNSTILE_TEST_SITE_KEY : TURNSTILE_SITE_KEY;
  }
  return TURNSTILE_SITE_KEY;
}

export interface TurnstileRenderOptions {
  sitekey: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'flexible';
  appearance?: 'always' | 'execute' | 'interaction-only';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: (errorCode?: string) => boolean | void;
}

export interface TurnstileApi {
  render: (container: HTMLElement | string, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  getResponse: (widgetId?: string) => string | undefined;
  remove?: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptLoadPromise: Promise<TurnstileApi | null> | null = null;

/**
 * Ensures the official Cloudflare Turnstile explicit-render script is loaded once in the browser.
 * Resolves to `window.turnstile` when available, or `null` in SSR / offline test harnesses.
 */
export function ensureTurnstileScript(): Promise<TurnstileApi | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }
  if (window.turnstile && typeof window.turnstile.render === 'function') {
    return Promise.resolve(window.turnstile);
  }
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise<TurnstileApi | null>((resolve) => {
    let settled = false;
    const finish = (api: TurnstileApi | null) => {
      if (settled) return;
      settled = true;
      resolve(api);
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SCRIPT_SRC}"], script[data-turnstile-script="true"]`,
    );

    const script = existing ?? document.createElement('script');
    if (!existing) {
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = 'true';
      document.head.appendChild(script);
    }

    const timeoutId = window.setTimeout(() => {
      finish(window.turnstile && typeof window.turnstile.render === 'function' ? window.turnstile : null);
    }, 3000);

    script.addEventListener(
      'load',
      () => {
        window.clearTimeout(timeoutId);
        finish(window.turnstile && typeof window.turnstile.render === 'function' ? window.turnstile : null);
      },
      { once: true },
    );

    script.addEventListener(
      'error',
      () => {
        window.clearTimeout(timeoutId);
        finish(null);
      },
      { once: true },
    );

    if (window.turnstile && typeof window.turnstile.render === 'function') {
      window.clearTimeout(timeoutId);
      finish(window.turnstile);
    }
  });

  return scriptLoadPromise;
}

export interface TurnstileController {
  getToken: () => string;
  reset: () => void;
  isReady: () => boolean;
  destroy: () => void;
}

export interface MountTurnstileCallbacks {
  onStateChange?: (state: { token: string; ready: boolean }) => void;
}

/**
 * Mounts a Managed Cloudflare Turnstile widget into `container`.
 * When `window.turnstile` is active, tracks token readiness and supports `getResponse()` + `reset()`.
 * If the Turnstile script is unreachable (e.g. local offline browser tests), fails gracefully so
 * local harness assertions are not deadlocked while backend dev-bypass handles local verification.
 */
export function isLocalDevHost(): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return isLocal || window.location.hostname === '[::1]';
}

export function mountTurnstile(
  container: HTMLElement | null,
  callbacks: MountTurnstileCallbacks = {},
): TurnstileController {
  let widgetId: string | null = null;
  let token = '';
  let verifying = false;
  let destroyed = false;

  const notify = () => {
    const current = getToken();
    const ready = isReady();
    callbacks.onStateChange?.({ token: current, ready });
  };

  const getToken = (): string => {
    if (widgetId && typeof window !== 'undefined' && window.turnstile?.getResponse) {
      try {
        const resp = window.turnstile.getResponse(widgetId);
        if (typeof resp === 'string' && resp.length > 0) {
          token = resp;
        }
      } catch {
        // Ignore widget lookup errors if widget was not yet initialized
      }
    }
    return token;
  };

  const reset = (): void => {
    token = '';
    if (widgetId && typeof window !== 'undefined' && window.turnstile?.reset) {
      try {
        verifying = !isLocalDevHost();
        window.turnstile.reset(widgetId);
      } catch {
        verifying = false;
      }
    } else {
      verifying = false;
    }
    notify();
  };

  const isReady = (): boolean => {
    return !verifying || getToken().length > 0 || isLocalDevHost();
  };

  const destroy = (): void => {
    destroyed = true;
    if (widgetId && typeof window !== 'undefined' && window.turnstile?.remove) {
      try {
        window.turnstile.remove(widgetId);
      } catch {
        // Ignore cleanup errors
      }
    }
    widgetId = null;
    token = '';
    verifying = false;
  };

  if (container && typeof window !== 'undefined') {
    const activeSiteKey = getTurnstileSiteKey();
    container.dataset.sitekey = activeSiteKey;
    void ensureTurnstileScript().then((api) => {
      if (destroyed || !container || !api) {
        verifying = false;
        notify();
        return;
      }
      try {
        verifying = true;
        notify();
        widgetId = api.render(container, {
          sitekey: activeSiteKey,
          theme: 'auto',
          size: 'flexible',
          appearance: 'interaction-only',
          callback: (issuedToken: string) => {
            token = issuedToken || '';
            verifying = false;
            notify();
          },
          'expired-callback': () => {
            token = '';
            verifying = true;
            notify();
          },
          'error-callback': () => {
            token = '';
            verifying = false;
            notify();
            return true;
          },
        });
      } catch {
        verifying = false;
        notify();
      }
    });
  }

  return {
    getToken,
    reset,
    isReady,
    destroy,
  };
}
