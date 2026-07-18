import { Link } from '@tanstack/react-router';
import { useId, useState } from 'react';

/**
 * Renders the Doom Scale as 1–5 hexagons.
 *
 * Read-only mode (default): displays filled/empty hexagons for the average rating.
 * Interactive mode: authenticated users can click to rate; shows hover preview
 * and highlights the user's own rating.
 */
export function HexagonRating({
  rating,
  size = 20,
  interactive = false,
  userRating,
  onRate,
  isAuthenticated = false,
}: {
  rating: number;
  size?: number;
  /** Enable click-to-rate interaction */
  interactive?: boolean;
  /** The current user's own rating (1-5), if any */
  userRating?: number | null;
  /** Called when the user clicks a hexagon to submit their rating */
  onRate?: (score: number) => void;
  /** Whether the current user is authenticated */
  isAuthenticated?: boolean;
}) {
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clamp between 0 and 5
  const clamped = Math.max(0, Math.min(5, rating));
  const fullHexes = Math.floor(clamped);
  const partial = clamped - fullHexes;

  const handleClick = async (score: number) => {
    if (!interactive || !onRate || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onRate(score);
    } finally {
      setIsSubmitting(false);
    }
  };

  const highlightScore = hoveredScore ?? userRating ?? null;

  return (
    <div className="flex items-center gap-0.5 group" title={`Doom Scale: ${rating.toFixed(1)} / 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const score = i + 1;
        const isFilled = score <= fullHexes;
        const isPartial = !isFilled && score === fullHexes + 1 && partial > 0;

        // Highlight logic:
        // - If hovering: highlight up to hoveredScore
        // - If user has rated and not hovering: highlight user's rating
        const isHighlighted = highlightScore !== null && score <= highlightScore;
        const isUserRating = userRating === score && hoveredScore === null;

        return (
          <Hexagon
            key={score}
            filled={isFilled}
            partial={isPartial ? partial : undefined}
            size={size}
            interactive={interactive && isAuthenticated}
            highlighted={isHighlighted}
            isUserRating={isUserRating}
            dimmed={interactive && isAuthenticated && hoveredScore !== null && score > hoveredScore}
            submitting={isSubmitting}
            onClick={() => void handleClick(score)}
            onHover={() => interactive && isAuthenticated && setHoveredScore(score)}
            onLeave={() => setHoveredScore(null)}
          />
        );
      })}
      <span className="ml-1.5 text-xs text-[#c5f000]/60 tabular-nums">{rating.toFixed(1)}</span>

      {/* Sign-in prompt for unauthenticated users */}
      {interactive && !isAuthenticated && (
        <span className="ml-2 text-xs text-noir-500">
          <Link to="/sign-in/$" className="text-doom-400 hover:text-doom-300 transition-colors">
            Sign in
          </Link>
          {' to rate'}
        </span>
      )}
    </div>
  );
}

function Hexagon({
  filled = false,
  partial,
  size,
  interactive = false,
  highlighted = false,
  isUserRating = false,
  dimmed = false,
  submitting = false,
  onClick,
  onHover,
  onLeave,
}: {
  filled?: boolean;
  partial?: number;
  size: number;
  interactive?: boolean;
  highlighted?: boolean;
  isUserRating?: boolean;
  dimmed?: boolean;
  submitting?: boolean;
  onClick?: () => void;
  onHover?: () => void;
  onLeave?: () => void;
}) {
  // Hexagon path: flat-top orientation, centered in viewBox
  const h = size;
  const w = h * 0.866; // cos(30°) ≈ 0.866
  const strokeW = 1.5;

  // Points for a flat-top hexagon centered at (cx, cy)
  const cx = w / 2 + strokeW;
  const cy = h / 2 + strokeW;
  const r = Math.min(w, h) / 2 - strokeW;

  const points = [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const angle = (Math.PI / 180) * (60 * i - 30);
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      return `${px},${py}`;
    })
    .join(' ');

  const viewBoxW = w + strokeW * 2;
  const viewBoxH = h + strokeW * 2;

  const clipId = useId();

  // Color logic:
  // - User's own rating: doom-500 (brighter)
  // - Highlighted (hover): #c5f000
  // - Filled (average): #c5f000
  // - Dimmed (beyond hover): noir-700
  // - Empty: noir-600 outline
  let fillColor: string;
  let strokeColor: string;

  if (isUserRating) {
    fillColor = 'text-[#d4ff1a]';
    strokeColor = 'text-[#d4ff1a]';
  } else if (highlighted) {
    fillColor = 'text-[#c5f000]';
    strokeColor = 'text-[#c5f000]';
  } else if (filled) {
    fillColor = 'text-[#c5f000]';
    strokeColor = 'text-[#c5f000]';
  } else if (dimmed) {
    fillColor = 'text-noir-700';
    strokeColor = 'text-noir-700';
  } else {
    fillColor = 'text-noir-600';
    strokeColor = 'text-noir-600';
  }

  const cursorClass = interactive && !submitting ? 'cursor-pointer' : '';

  return (
    <svg
      width={viewBoxW}
      height={viewBoxH}
      viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
      className={`shrink-0 ${cursorClass} transition-opacity ${submitting ? 'opacity-50' : ''}`}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <defs>
        <clipPath id={clipId}>
          <polygon points={points} />
        </clipPath>
      </defs>
      {/* Background hexagon outline */}
      <polygon points={points} fill="none" stroke="currentColor" strokeWidth={strokeW} className={strokeColor} />
      {/* Filled area */}
      {(filled || highlighted) && <polygon points={points} fill="currentColor" className={fillColor} />}
      {/* Partial fill from left to right */}
      {partial !== undefined && partial > 0 && !highlighted && (
        <rect
          x={0}
          y={0}
          width={viewBoxW * partial}
          height={viewBoxH}
          fill="currentColor"
          className="text-[#c5f000]"
          clipPath={`url(#${clipId})`}
        />
      )}
    </svg>
  );
}
