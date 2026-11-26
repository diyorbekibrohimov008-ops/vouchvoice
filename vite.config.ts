import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@netlify/vite-plugin';

/**
 * In local `vite dev`, `@netlify/vite-plugin` injects production `netlify.toml`
 * CSP headers (`script-src 'self'`) which block Vite's inline React Refresh
 * preamble on `/`. Relax `script-src` only in dev mode; production builds and
 * Netlify deployments keep the strict CSP from `netlify.toml` untouched.
 */
function devCspRelaxPlugin(): Plugin {
  return {
    name: 'dev-csp-relax',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        const origSetHeader = res.setHeader.bind(res);
        res.setHeader = ((name: string, value: number | string | readonly string[]) => {
          if (name.toLowerCase() === 'content-security-policy' && typeof value === 'string') {
            return origSetHeader(
              name,
              value.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
            );
          }
          return origSetHeader(name, value);
        }) as typeof res.setHeader;
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    devCspRelaxPlugin(),
    react(),
    tailwindcss(),
    ...(process.env.VERCEL
      ? []
      : [
          netlify({
            edgeFunctions: { enabled: false },
            database: { enabled: false },
          }),
        ]),
  ],
});
