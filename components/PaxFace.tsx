"use client";

/** Pax, the JaPax planet mentor: floats, blinks, and moves its mouth while `talking`. */
export default function PaxFace({ talking, size = 64, sleeping = false }: { talking: boolean; size?: number; sleeping?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={`${sleeping ? "pax-sleep" : "pax-float"} overflow-visible`}>
      <defs>
        <radialGradient id="pax-body" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffc38a" />
          <stop offset="55%" stopColor="#ff8a4c" />
          <stop offset="100%" stopColor="#c4552a" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="56" rx="46" ry="11" fill="none" stroke="#5aa3ff" strokeWidth="3" opacity="0.6" transform="rotate(-14 50 56)" />
      <circle cx="50" cy="50" r="32" fill="url(#pax-body)" />
      {sleeping ? (
        <g fill="none" stroke="#2a1408" strokeWidth="2.4" strokeLinecap="round">
          <path d="M35 45 Q40 49 45 45" />
          <path d="M55 45 Q60 49 65 45" />
        </g>
      ) : (
        <g className="pax-blink" style={{ transformOrigin: "50px 44px" }}>
          <ellipse cx="40" cy="44" rx="3.2" ry="4.2" fill="#2a1408" />
          <ellipse cx="60" cy="44" rx="3.2" ry="4.2" fill="#2a1408" />
          <circle cx="41.4" cy="42.2" r="1.1" fill="#fff" />
          <circle cx="61.4" cy="42.2" r="1.1" fill="#fff" />
        </g>
      )}
      {sleeping ? (
        <ellipse cx="50" cy="59" rx="2.6" ry="2.2" fill="#4a1a0c" />
      ) : talking ? (
        <ellipse cx="50" cy="59" rx="5" ry="3.4" fill="#4a1a0c" className="pax-talk" style={{ transformOrigin: "50px 59px" }} />
      ) : (
        <path d="M43 58 Q50 63 57 58" fill="none" stroke="#2a1408" strokeWidth="2.4" strokeLinecap="round" />
      )}
    </svg>
  );
}
