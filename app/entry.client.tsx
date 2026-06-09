import { RemixBrowser } from '@remix-run/react';
import { startTransition } from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';

/*
 * Detetar se estamos a correr dentro de Capacitor/WebView (APK Android).
 * Isto ajuda a diagnosticar problemas de carregamento de assets offline.
 */
function detectCapacitorWebView() {
  const isCapacitor =
    typeof navigator !== 'undefined' &&
    (navigator.userAgent.includes('Capacitor') ||
      (typeof (window as any).Capacitor !== 'undefined' &&
        (window as any).Capacitor?.isNative !== undefined));

  if (isCapacitor) {
    console.log('[Bolt] Running in Capacitor/WebView (APK)');

    // Monitorizar falhas de carregamento de CSS (links stylesheet)
    document.addEventListener(
      'error',
      (e: Event) => {
        const target = e.target as HTMLElement;

        if (target.tagName === 'LINK' && (target as HTMLLinkElement).rel === 'stylesheet') {
          console.error('[Bolt] FAILED to load stylesheet:', (target as HTMLLinkElement).href);
        }

        if (target.tagName === 'SCRIPT') {
          console.error('[Bolt] FAILED to load script:', (target as HTMLScriptElement).src);
        }
      },
      true, // Capture phase to catch errors before they bubble
    );
  }
}

// Run detection early, before rendering
detectCapacitorWebView();

startTransition(() => {
  const rootElement = document.getElementById('root')!;

  /*
   * In SSR mode (Electron, Cloudflare), the root element has server-rendered
   * content and we must hydrate. In SPA/APK/Capacitor mode, the root is empty
   * and we must use createRoot instead to avoid hydration errors.
   */
  if (rootElement.hasChildNodes()) {
    hydrateRoot(rootElement, <RemixBrowser />);
  } else {
    createRoot(rootElement).render(<RemixBrowser />);
  }
});
