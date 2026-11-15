/**
 * Security headers, built once and returned from next.config.mjs.
 *
 * Lives in its own module so the policy can be unit-tested without booting Next:
 * a header that is wrong in production is invisible in the browser until
 * something breaks, and a CSP that is silently permissive is worse than none.
 *
 * CSP ships REPORT-ONLY first. Enforcing a policy nobody has watched is how a
 * site loses its fonts, its Facebook embeds and its analytics in one deploy. Set
 * `CSP_ENFORCE=true` to promote the identical policy to enforcing, after the
 * report endpoint has been quiet.
 */

/** Path the browser posts violations to. */
export const CSP_REPORT_PATH = "/api/csp-report";

/**
 * Hosts the app genuinely needs. Everything else is denied, so a compromised
 * dependency cannot beacon out through an <img> or a fetch.
 *
 * - Facebook: `FbPost` embeds a post iframe.
 * - Images are mirrored to our own storage, but a freshly collected post can
 *   point at the source host for one render, and AI providers return remote URLs,
 *   so https: stays open for `img-src` only.
 */
const SOURCES = {
  script: ["'self'", "'unsafe-inline'"],
  style: ["'self'", "'unsafe-inline'"],
  img: ["'self'", "data:", "blob:", "https:"],
  media: ["'self'", "blob:", "https:"],
  font: ["'self'", "data:"],
  connect: ["'self'"],
  frame: ["'self'", "https://www.facebook.com", "https://web.facebook.com"],
};

export function cspDirectives({ dev = false } = {}) {
  const script = [...SOURCES.script];
  const connect = [...SOURCES.connect];
  if (dev) {
    // React Refresh evaluates generated code and talks over a websocket.
    script.push("'unsafe-eval'");
    connect.push("ws:", "wss:");
  }
  return {
    "default-src": ["'self'"],
    "script-src": script,
    "style-src": SOURCES.style,
    "img-src": SOURCES.img,
    "media-src": SOURCES.media,
    "font-src": SOURCES.font,
    "connect-src": connect,
    "frame-src": SOURCES.frame,
    // Same-origin framing only: the admin design studio previews the real site
    // inside an iframe, and nobody else may frame us.
    "frame-ancestors": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "report-uri": [CSP_REPORT_PATH],
  };
}

export function buildCsp(options = {}) {
  return Object.entries(cspDirectives(options))
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

/** Report-only while we are still watching; enforcing once promoted. */
export function cspHeaderName(enforce = false) {
  return enforce ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}

export function securityHeaders(options = {}) {
  const { production = false, dev = false, enforce = false } = options;
  const headers = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    // SAMEORIGIN, not DENY: the admin's LIVE design studio previews the real
    // public site inside a same-origin iframe. DENY blocked even that, so the
    // studio panel stayed blank.
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Deny the powerful APIs outright: nothing here uses a camera, a microphone,
    // a precise location or a payment handler, so any request is either a bug or
    // an injected script.
    {
      key: "Permissions-Policy",
      value: [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "magnetometer=()",
        "gyroscope=()",
        "accelerometer=()",
        "interest-cohort=()",
      ].join(", "),
    },
    { key: cspHeaderName(enforce), value: buildCsp({ dev, enforce }) },
  ];

  // HSTS only over HTTPS. Sending it from a local http:// dev server teaches the
  // browser to upgrade localhost for a year, which is a support call nobody wants.
  if (production) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }
  return headers;
}
