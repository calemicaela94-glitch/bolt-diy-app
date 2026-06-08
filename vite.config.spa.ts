/*
 * Vite config for SPA/APK builds (no SSR server)
 *
 * Enables Remix SPA mode (ssr: false) so the app can run as a
 * standalone SPA in Capacitor/Android without a server.
 */

import { vitePlugin as remixVitePlugin } from '@remix-run/dev';
import UnoCSS from 'unocss/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules';
import tsconfigPaths from 'vite-tsconfig-paths';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
dotenv.config();

/*
 * Plugin: remix-spa-api-compat
 *
 * In SPA mode, Remix forbids route exports like `loader` and `action`
 * (they require a server). This plugin transforms those exports into
 * no-op `clientLoader` / `clientAction` so the SPA build succeeds.
 * The API routes become inert in the client — real API calls are
 * handled by the app's service layer which makes direct HTTP requests.
 */
function spaApiCompatPlugin() {
  return {
    name: 'remix-spa-api-compat',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      // Match any route file under app/routes/
      if (!id.includes('app/routes/') || id.includes('node_modules')) {
        return undefined;
      }

      let modified = code;

      // Replace `export const loader` -> `export const clientLoader`
      modified = modified.replace(
        /export\s+(const|function|async function)\s+loader\b/g,
        'export $1 clientLoader',
      );

      // Replace `export const action` -> `export const clientAction`
      modified = modified.replace(
        /export\s+(const|function|async function)\s+action\b/g,
        'export $1 clientAction',
      );

      if (modified !== code) {
        return { code: modified, map: null };
      }

      return undefined;
    },
  };
}

export default defineConfig((config) => {
  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
    build: {
      target: 'esnext',
    },
    plugins: [
      nodePolyfills({
        include: ['buffer', 'process', 'util', 'stream'],
        globals: {
          Buffer: true,
          process: true,
          global: true,
        },
        protocolImports: true,
        exclude: ['child_process', 'fs', 'path'],
      }),
      spaApiCompatPlugin(),
      remixVitePlugin({
        // SPA mode: no server rendering, generates standalone index.html
        ssr: false,
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_lazyRouteDiscovery: true,
        },
      }),
      UnoCSS(),
      tsconfigPaths(),
      config.mode === 'production' && optimizeCssModules({ apply: 'build' }),
    ],
    envPrefix: [
      'VITE_',
      'OPENAI_LIKE_API_BASE_URL',
      'OPENAI_LIKE_API_MODELS',
      'OLLAMA_API_BASE_URL',
      'LMSTUDIO_API_BASE_URL',
      'TOGETHER_API_BASE_URL',
    ],
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  };
});