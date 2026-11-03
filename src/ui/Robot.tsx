/** Біт, the robot of the robotics lab who guides the student. An original drawing. */
export const Robot = ({ size = 48, mood = "talk" }: { readonly size?: number; readonly mood?: "talk" | "happy" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="edu-sql-robot">
    <defs>
      <linearGradient id="edu-sql-robot-head" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c7d2fe" />
        <stop offset="1" stopColor="#818cf8" />
      </linearGradient>
    </defs>
    <line x1="32" y1="5" x2="32" y2="13" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round" />
    <circle className="edu-sql-robot-light" cx="32" cy="5" r="3.5" fill="#fbbf24" />
    <rect x="9" y="13" width="46" height="34" rx="12" fill="url(#edu-sql-robot-head)" />
    <rect x="15" y="19" width="34" height="20" rx="8" fill="#1e1b4b" />
    {mood === "happy" ? (
      <>
        <path d="M21 30 q4 -5 8 0" fill="none" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round" />
        <path d="M35 30 q4 -5 8 0" fill="none" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round" />
      </>
    ) : (
      <>
        <rect className="edu-sql-robot-eye" x="21" y="24" width="7" height="9" rx="3.5" fill="#67e8f9" />
        <rect className="edu-sql-robot-eye" x="36" y="24" width="7" height="9" rx="3.5" fill="#67e8f9" />
      </>
    )}
    <rect x="4" y="25" width="5" height="11" rx="2.5" fill="#6366f1" />
    <rect x="55" y="25" width="5" height="11" rx="2.5" fill="#6366f1" />
    <rect x="20" y="49" width="24" height="11" rx="5" fill="#6366f1" />
    <circle cx="32" cy="54.5" r="2.5" fill="#fbbf24" />
  </svg>
)
