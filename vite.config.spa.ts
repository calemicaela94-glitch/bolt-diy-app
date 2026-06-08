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
 * In SPA mode (ssr: false), Remix cannot include API routes that:
 *   1. Export `loader` or `action` (server-only exports)
 *   2. Import modules from `~/lib/.server/` (server-only code)
 *
 * Since the APK has no backend, ALL API routes must be replaced with
 * inert stubs. The real API logic lives on a server (Cloudflare/Electron).
 *
 * UI routes (_index.tsx, chat.$id.tsx, git.tsx) that only have `loader`
 * are handled separately: their `loader` is converted to `clientLoader`.
 */
function spaApiCompatPlugin() {
  // Route files that are purely server-side API endpoints → stub completely
  const apiRoutePattern = /\/routes\/api\.[^/]+\.ts$/;
  const apiRouteNames = [
    'api.bug-report', 'api.chat', 'api.check-env-key', 'api.configured-providers',
    'api.enhancer', 'api.export-api-keys', 'api.git-info', 'api.git-proxy.$',
    'api.github-branches', 'api.github-stats', 'api.github-template', 'api.github-user',
    'api.gitlab-branches', 'api.gitlab-projects', 'api.health', 'api.llmcall',
    'api.mcp-check', 'api.mcp-update-config', 'api.models', 'api.models.$provider',
    'api.netlify-deploy', 'api.netlify-user', 'api.supabase', 'api.supabase-user',
    'api.supabase.query', 'api.supabase.variables', 'api.system.diagnostics',
    'api.system.disk-info', 'api.system.git-info', 'api.update',
    'api.vercel-deploy', 'api.vercel-user', 'api.web-search',
  ];

  return {
    name: 'remix-spa-api-compat',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (id.includes('node_modules')) {
        return undefined;
      }

      // Check if this is an API route file (server-only endpoint)
      const isApiRoute = apiRouteNames.some((name) => id.includes(`/routes/${name}.ts`));

      if (isApiRoute) {
        // Replace entire file with inert stubs.
        // Returns empty clientLoader/clientAction so Remix SPA doesn't complain.
        return {
          code: `// SPA stub: server API not available in APK/Capacitor
export const clientLoader = async () => {
  return Response.json({ error: "API not available in offline mode" }, { status: 503 });
};
export const clientAction = async () => {
  return Response.json({ error: "API not available in offline mode" }, { status: 503 });
};
`,
          map: null,
        };
      }

      // For non-API routes (_index.tsx, chat.$id.tsx, git.tsx):
      // convert server `loader`/`action` to client variants
      if (!id.includes('app/routes/')) {
        return undefined;
      }

      let modified = code;

      // Direct export: `export const loader = ...` -> `export const clientLoader = ...`
      modified = modified.replace(
        /export\s+(const|function|async function)\s+loader\b/g,
        'export $1 clientLoader',
      );

      // Direct export: `export const action = ...` -> `export const clientAction = ...`
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
      {
        name: 'replaceReactDomServerImport',
        enforce: 'pre',
        transform(code: string, id: string) {
          if (id.endsWith('entry.server.tsx')) {
            // Fix: react-dom/server → react-dom/server.browser
            // renderToReadableStream only exists in the browser build
            return {
              code: code.replace(/from 'react-dom\/server';?/g, "from 'react-dom/server.browser';"),
              map: null,
            };
          }

          return undefined;
        },
      },
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