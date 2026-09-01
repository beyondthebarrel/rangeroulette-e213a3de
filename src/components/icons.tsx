export function CardsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="6" width="14" height="16" rx="2" transform="rotate(-8 9 14)" />
      <rect x="8" y="4" width="14" height="16" rx="2" />
    </svg>
  );
}

export function StopwatchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="13" r="8" />
      <line x1="12" y1="13" x2="12" y2="8" />
      <line x1="12" y1="13" x2="15.5" y2="14.5" />
      <line x1="9" y1="2" x2="15" y2="2" />
      <line x1="12" y1="2" x2="12" y2="5" />
    </svg>
  );
}

export function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 6.5c-1.5-1.3-4-1.8-8-1.3v13.6c4-.5 6.5 0 8 1.3 1.5-1.3 4-1.8 8-1.3V5.2c-4-.5-6.5 0-8 1.3Z" />
      <line x1="12" y1="6.5" x2="12" y2="20.1" />
    </svg>
  );
}

export function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 3h8v5a4 4 0 0 1-8 0V3Z" />
      <path d="M8 4.5H5a3 3 0 0 0 3.3 4.2" />
      <path d="M16 4.5h3a3 3 0 0 1-3.3 4.2" />
      <line x1="12" y1="11.5" x2="12" y2="16" />
      <line x1="8.5" y1="20" x2="15.5" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
    </svg>
  );
}

export function ChartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="5" y1="20" x2="5" y2="12" />
      <line x1="12" y1="20" x2="12" y2="6" />
      <line x1="19" y1="20" x2="19" y2="15" />
    </svg>
  );
}

export function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
      <path d="M3 4.5v5h5" />
      <path d="M12 7.5v5l3.5 2" />
    </svg>
  );
}

export function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

export function GridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7.5" height="7.5" rx="1" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1" />
    </svg>
  );
}
