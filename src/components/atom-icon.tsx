export function AtomIcon({ className = "" }) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 0 0-9z" />
        <path d="M12 13a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 0 0-9z" />
        <path d="M2 12h20" />
      </svg>
    )
  }
  
  