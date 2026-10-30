import { useId } from 'react'

const STEPS = [1, 2, 3, 4, 5]

export function RatingDisplay({ value }: { value: number | null }) {
  if (value == null) return null
  return (
    <span className="rating" aria-label={`Rated ${value} out of 5`}>
      {STEPS.map((s) => (
        <Bean key={s} fill={Math.max(0, Math.min(1, value - (s - 1)))} />
      ))}
      <span className="rating-num">{value}</span>
    </span>
  )
}

/** Untappd-style rating in quarter steps, edited with a slider. */
export function RatingInput({
  id,
  value,
  onChange,
}: {
  id?: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <div className="rating-input">
      <input
        id={id}
        type="range"
        min={0}
        max={5}
        step={0.25}
        value={value ?? 0}
        onChange={(e) => {
          const v = Number(e.target.value)
          onChange(v === 0 ? null : v)
        }}
      />
      {value == null ? <span className="muted">Not rated</span> : <RatingDisplay value={value} />}
    </div>
  )
}

function Bean({ fill }: { fill: number }) {
  const id = useId()
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={24 * fill} height="24" />
        </clipPath>
      </defs>
      <ellipse cx="12" cy="12" rx="7" ry="10" transform="rotate(35 12 12)" className="bean-empty" />
      <g clipPath={`url(#${id})`}>
        <ellipse cx="12" cy="12" rx="7" ry="10" transform="rotate(35 12 12)" className="bean-full" />
      </g>
      <path d="M8 18 C 12 14, 12 10, 16 6" className="bean-crease" fill="none" />
    </svg>
  )
}
