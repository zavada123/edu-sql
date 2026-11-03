/** Біт, the robot of the robotics lab who guides the student. An original simple drawing. */
export const Robot = ({ size = 44 }: { readonly size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="edu-sql-robot">
    <line x1="24" y1="4" x2="24" y2="10" stroke="currentColor" strokeWidth="2" />
    <circle cx="24" cy="4" r="3" fill="#f59e0b" />
    <rect x="8" y="10" width="32" height="24" rx="8" fill="#e0f2fe" stroke="currentColor" strokeWidth="2" />
    <circle cx="18" cy="21" r="4" fill="#0f172a" />
    <circle cx="30" cy="21" r="4" fill="#0f172a" />
    <circle cx="19.5" cy="19.5" r="1.3" fill="#fff" />
    <circle cx="31.5" cy="19.5" r="1.3" fill="#fff" />
    <path d="M18 28 q6 4 12 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="14" y="36" width="20" height="9" rx="3" fill="#bae6fd" stroke="currentColor" strokeWidth="2" />
    <line x1="4" y1="22" x2="8" y2="22" stroke="currentColor" strokeWidth="2" />
    <line x1="40" y1="22" x2="44" y2="22" stroke="currentColor" strokeWidth="2" />
  </svg>
)
