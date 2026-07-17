/**
 * Renders the Doom Scale as 1–5 hexagons.
 * Filled hexagons = rating value, empty = remaining up to 5.
 * Partial fill for fractional averages.
 */
export function HexagonRating({
  rating,
  size = 20,
}: {
  rating: number
  size?: number
}) {
  // Clamp between 0 and 5
  const clamped = Math.max(0, Math.min(5, rating))
  const fullHexes = Math.floor(clamped)
  const partial = clamped - fullHexes
  const emptyHexes = 5 - fullHexes - (partial > 0 ? 1 : 0)

  return (
    <div className="flex items-center gap-0.5" title={`Doom Scale: ${rating.toFixed(1)} / 5`}>
      {Array.from({ length: fullHexes }, (_, i) => (
        <Hexagon key={`full-${i}`} filled size={size} />
      ))}
      {partial > 0 && <Hexagon partial={partial} size={size} />}
      {Array.from({ length: emptyHexes }, (_, i) => (
        <Hexagon key={`empty-${i}`} size={size} />
      ))}
      <span className="ml-1.5 text-xs text-noir-400 tabular-nums">
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

function Hexagon({
  filled = false,
  partial,
  size,
}: {
  filled?: boolean
  partial?: number
  size: number
}) {
  // Hexagon path: flat-top orientation, centered in viewBox
  const h = size
  const w = h * 0.866 // cos(30°) ≈ 0.866
  const strokeW = 1.5

  // Points for a flat-top hexagon centered at (cx, cy)
  const cx = w / 2 + strokeW
  const cy = h / 2 + strokeW
  const r = Math.min(w, h) / 2 - strokeW

  const points = [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const angle = (Math.PI / 180) * (60 * i - 30)
      const px = cx + r * Math.cos(angle)
      const py = cy + r * Math.sin(angle)
      return `${px},${py}`
    })
    .join(' ')

  const viewBoxW = w + strokeW * 2
  const viewBoxH = h + strokeW * 2

  const clipId = `hex-clip-${Math.random().toString(36).slice(2, 8)}`

  return (
    <svg
      width={viewBoxW}
      height={viewBoxH}
      viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
      className="shrink-0"
    >
      <defs>
        <clipPath id={clipId}>
          <polygon points={points} />
        </clipPath>
      </defs>
      {/* Background hexagon outline */}
      <polygon
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeW}
        className={filled ? 'text-doom-400' : 'text-noir-600'}
      />
      {/* Filled area */}
      {filled && (
        <polygon
          points={points}
          fill="currentColor"
          className="text-doom-400"
        />
      )}
      {/* Partial fill from left to right */}
      {partial !== undefined && partial > 0 && (
        <rect
          x={0}
          y={0}
          width={viewBoxW * partial}
          height={viewBoxH}
          fill="currentColor"
          className="text-doom-400"
          clipPath={`url(#${clipId})`}
        />
      )}
    </svg>
  )
}
