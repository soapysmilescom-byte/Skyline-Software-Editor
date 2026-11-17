import React, { useId } from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  variant?: 'dark' | 'light';
  className?: string;
}

const ICON_SIZE_MAP = {
  sm: 'w-9 h-7',
  md: 'w-11 h-8 sm:w-12 sm:h-9',
  lg: 'w-14 h-11',
  xl: 'w-16 h-12',
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showWordmark = false,
  variant = 'dark',
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const cloudId = `sky-cloud-${uid}`;
  const swooshId = `sky-swoosh-${uid}`;
  const brightTowerId = `sky-bright-${uid}`;
  const darkTowerId = `sky-dark-${uid}`;
  const glowId = `sky-glow-${uid}`;

  const isDarkSurface = variant === 'dark';

  return (
    <div className={`inline-flex items-center gap-2 shrink-0 ${className}`}>
      {/* Handcrafted Skyline Cloud & Towers SVG Mark */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="8 6 138 116"
        fill="none"
        className={`${ICON_SIZE_MAP[size]} shrink-0 drop-shadow-[0_2px_10px_rgba(0,166,255,0.35)]`}
        role="img"
        aria-label="Skyline Software Logo"
      >
        <defs>
          <linearGradient id={cloudId} x1="20" y1="20" x2="145" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={isDarkSurface ? '#38BDF8' : '#0A2259'} />
            <stop offset="50%" stopColor="#007BFF" />
            <stop offset="100%" stopColor="#00C6FF" />
          </linearGradient>
          <linearGradient id={swooshId} x1="12" y1="108" x2="148" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={isDarkSurface ? '#1D4ED8' : '#06173D'} />
            <stop offset="55%" stopColor="#0066E6" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
          <linearGradient id={brightTowerId} x1="65" y1="14" x2="65" y2="96" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="55%" stopColor="#0066E6" />
            <stop offset="100%" stopColor="#0B245B" />
          </linearGradient>
          <linearGradient id={darkTowerId} x1="40" y1="30" x2="120" y2="96" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0052CC" />
            <stop offset="100%" stopColor="#091D47" />
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="82%" r="48%">
            <stop offset="0%" stopColor="#00A6FF" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#00A6FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Base Glow */}
        <ellipse cx="78" cy="96" rx="52" ry="18" fill={`url(#${glowId})`} />

        {/* Cloud Outline Crest */}
        <path
          d="M27 78C21 71 21 60 28 53C33 48 40 46 46 47C50 32 64 22 80 22C94 22 106 29 113 40C125 40 135 50 135 62C135 68 132 74 128 78"
          stroke={`url(#${cloudId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Tower 1 (Far Left) */}
        <path d="M30 96V64L38 58V96H30Z" fill={`url(#${darkTowerId})`} />

        {/* Tower 2 (Left Slanted + Window Stripes) */}
        <path d="M41 96V48L53 41V96H41Z" fill={`url(#${brightTowerId})`} />
        <path d="M53 41L61 45V96H53V41Z" fill="#071C47" />
        <g fill="#7DD3FC" fillOpacity="0.9">
          <rect x="54.5" y="49" width="5" height="2" rx="0.5" />
          <rect x="54.5" y="54" width="5" height="2" rx="0.5" />
          <rect x="54.5" y="59" width="5" height="2" rx="0.5" />
          <rect x="54.5" y="64" width="5" height="2" rx="0.5" />
          <rect x="54.5" y="69" width="5" height="2" rx="0.5" />
          <rect x="54.5" y="74" width="5" height="2" rx="0.5" />
          <rect x="54.5" y="79" width="5" height="2" rx="0.5" />
        </g>

        {/* Tower 3 (Center Spire Skyscraper) */}
        <path d="M64 96V35L76 26V96H64Z" fill={`url(#${brightTowerId})`} />
        <path d="M76 26L84 32V96H76V26Z" fill="#061940" />
        <polygon points="76,8 78.2,27 73.8,27" fill="#38BDF8" />

        {/* Tower 4 (Mid Right) */}
        <path d="M87 96V41L99 45V96H87Z" fill={`url(#${darkTowerId})`} />
        <rect x="89.5" y="50" width="2" height="32" rx="1" fill="#38BDF8" fillOpacity="0.6" />

        {/* Tower 5 (Far Right Slanted + Window Stripes) */}
        <path d="M103 94V53L116 59V91H103Z" fill={`url(#${brightTowerId})`} />
        <g fill="#BAE6FD" fillOpacity="0.85">
          <rect x="106" y="61" width="7" height="2" rx="0.5" />
          <rect x="106" y="66" width="7" height="2" rx="0.5" />
          <rect x="106" y="71" width="7" height="2" rx="0.5" />
          <rect x="106" y="76" width="7" height="2" rx="0.5" />
        </g>

        {/* Sweeping Crescent Swoosh Arc */}
        <path
          d="M16 95C16 105 34 114 68 106C101 98 130 78 138 52C140 69 124 94 94 108C58 124 14 118 16 95Z"
          fill={`url(#${swooshId})`}
        />
      </svg>

      {showWordmark && (
        <div className="flex flex-col leading-none select-none min-w-0">
          <div className="flex items-start gap-0.5">
            <span
              className={`text-lg sm:text-xl font-extrabold tracking-tight whitespace-nowrap ${
                isDarkSurface ? 'text-white' : 'text-[#071B3B]'
              }`}
            >
              Skyl
              <span className="relative inline-block">
                ı
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 -translate-x-1/2 top-[0.14em] w-[0.18em] h-[0.18em] rounded-[1px] bg-[#00A6FF]"
                />
              </span>
              ne
            </span>
            <span
              className={`text-[8px] font-bold mt-0.5 ${
                isDarkSurface ? 'text-sky-300' : 'text-[#071B3B]'
              }`}
            >
              ™
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`h-[1px] flex-1 ${
                isDarkSurface ? 'bg-sky-400/50' : 'bg-[#1E3A5F]/60'
              }`}
            />
            <span
              className={`text-[8px] sm:text-[9px] font-bold tracking-[0.28em] uppercase whitespace-nowrap ${
                isDarkSurface ? 'text-sky-200/90' : 'text-[#1E3A5F]'
              }`}
            >
              SOFTWARE
            </span>
            <span
              className={`h-[1px] flex-1 ${
                isDarkSurface ? 'bg-sky-400/50' : 'bg-[#1E3A5F]/60'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
