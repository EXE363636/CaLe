/**
 * RouteBackdrop — Phase 9Z.
 *
 * Reusable decorative SVG backdrop for public-facing pages. Inspired
 * by the Vietnam shift-network metaphor: thin curved connection lines
 * with soft pulse nodes at each endpoint. Built entirely from inline
 * SVG (no external image, no extra HTTP request, no third-party
 * dependency).
 *
 * Variants:
 *
 *   - "hero"   — tall, drawn behind the homepage hero. Two long
 *                bezier curves sweeping across the panel + 4 nodes.
 *                Low opacity so headline copy sits clearly above.
 *   - "page"   — short, drawn behind InfoPage / guidance-page
 *                headers. One curve + 3 nodes. Establishes brand
 *                continuity without competing with body text.
 *   - "subtle" — extremely faint, suitable for arbitrary section
 *                separators. Just nodes, no lines.
 *
 * All variants use the brand orange/amber palette and respect
 * `prefers-reduced-motion: reduce` (the `.pulse-node` keyframe is
 * paused via the existing media query in `globals.css`).
 *
 * Server-component-safe — no `'use client'`, no React hooks, no
 * portal. The SVG is purely declarative; visibility / motion is
 * driven by CSS classes defined in `globals.css`.
 *
 * Accessibility: `aria-hidden="true"`. The backdrop is decorative
 * only; it never carries content meaning. `pointer-events: none` on
 * the wrapper so it never intercepts clicks meant for the layer
 * above.
 */

export type RouteBackdropVariant = 'hero' | 'page' | 'subtle';

interface RouteBackdropProps {
  variant?: RouteBackdropVariant;
  /** Extra positioning classes appended to the wrapper. */
  className?: string;
}

export function RouteBackdrop({
  variant = 'page',
  className = '',
}: RouteBackdropProps) {
  // Two curves + 4 nodes for the hero variant; one curve + 3 nodes
  // for the page variant; nodes only for subtle.
  const showCurves = variant !== 'subtle';
  const showSecondCurve = variant === 'hero';

  return (
    <div
      aria-hidden="true"
      className={[
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      ].join(' ')}
    >
      <svg
        // Wide aspect so the curves can sweep horizontally; the
        // wrapper's `inset-0` + `preserveAspectRatio="none"` lets the
        // SVG stretch to whatever container width we drop it into.
        viewBox="0 0 1200 400"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        suppressHydrationWarning
      >
        <defs>
          {/* Brand-colour gradient for the curves so they fade out
              softly at the edges instead of being a hard orange line. */}
          <linearGradient id="route-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(251, 146, 60, 0)" />
            <stop offset="50%" stopColor="rgba(251, 146, 60, 0.55)" />
            <stop offset="100%" stopColor="rgba(251, 146, 60, 0)" />
          </linearGradient>
          <radialGradient id="node-glow">
            <stop offset="0%" stopColor="rgba(251, 146, 60, 0.55)" />
            <stop offset="60%" stopColor="rgba(251, 146, 60, 0.20)" />
            <stop offset="100%" stopColor="rgba(251, 146, 60, 0)" />
          </radialGradient>
        </defs>

        {/* Soft diagonal sweep curve — anchored top-left to mid-right.
            Rendered with `stroke="url(#route-grad)"` so it fades at
            both edges, mimicking a flight path / shift route. */}
        {showCurves && (
          <path
            d="M -60 280 C 280 80, 620 380, 1260 120"
            fill="none"
            stroke="url(#route-grad)"
            strokeWidth={variant === 'hero' ? 1.5 : 1.2}
            strokeDasharray={variant === 'hero' ? '6 8' : '4 6'}
            opacity={variant === 'hero' ? 0.75 : 0.55}
          />
        )}

        {/* Optional second curve sweeping the other direction —
            establishes the "network" feel. Hero variant only. */}
        {showSecondCurve && (
          <path
            d="M -40 80 C 320 320, 740 60, 1240 280"
            fill="none"
            stroke="url(#route-grad)"
            strokeWidth={1.0}
            strokeDasharray="3 7"
            opacity={0.4}
          />
        )}

        {/* Pulse nodes — one at each curve endpoint, rendered as a
            small filled circle plus a larger pulsing radial halo. The
            halo uses `.pulse-node` (keyframe in globals.css) which is
            paused under prefers-reduced-motion. */}
        {/* Top-left node */}
        <g className="pulse-node" style={{ transformOrigin: '120px 200px' }}>
          <circle cx="120" cy="200" r="22" fill="url(#node-glow)" />
        </g>
        <circle cx="120" cy="200" r="3" fill="rgba(251, 146, 60, 0.85)" />

        {/* Top-right node */}
        {variant === 'hero' && (
          <>
            <g className="pulse-node pulse-node-slow" style={{ transformOrigin: '1080px 140px' }}>
              <circle cx="1080" cy="140" r="22" fill="url(#node-glow)" />
            </g>
            <circle cx="1080" cy="140" r="3" fill="rgba(251, 146, 60, 0.85)" />
          </>
        )}

        {/* Mid node */}
        <g className="pulse-node pulse-node-slow" style={{ transformOrigin: '600px 240px' }}>
          <circle cx="600" cy="240" r="20" fill="url(#node-glow)" />
        </g>
        <circle cx="600" cy="240" r="2.5" fill="rgba(251, 146, 60, 0.7)" />

        {/* Bottom-right node — page variant doesn't carry the second
            curve so this anchors the right edge by itself. */}
        <g className="pulse-node" style={{ transformOrigin: '1080px 300px' }}>
          <circle cx="1080" cy="300" r="20" fill="url(#node-glow)" />
        </g>
        <circle cx="1080" cy="300" r="2.5" fill="rgba(251, 146, 60, 0.7)" />
      </svg>
    </div>
  );
}
