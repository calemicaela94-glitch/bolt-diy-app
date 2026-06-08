import { RemixBrowser } from '@remix-run/react';
import { startTransition } from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';

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
