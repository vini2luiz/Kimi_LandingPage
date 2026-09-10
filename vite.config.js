import { defineConfig } from "vite";

// Mirrored in public/_headers for static hosts (Netlify/Cloudflare Pages) that
// serve dist/ directly and never go through this dev/preview server config.
const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' blob: data: https://storage.getlayers.ai",
    "connect-src 'self' blob: https://storage.getlayers.ai",
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join("; "),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export default defineConfig({
  server: { headers: SECURITY_HEADERS },
  preview: { headers: SECURITY_HEADERS },
});
