import { cn } from "@/shared/lib/utils";

/*
  HousePlaceholder: Hand-drawn illustrated property placeholder
  matching the site's hero-art and favorites-gate bento aesthetic.
*/
export function HousePlaceholder({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 200"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="Chưa có ảnh phòng"
      fill="none"
    >
      <defs>
        <filter id="hpRough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02"
            numOctaves="2"
            seed="4"
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <g
          id="hpSprout"
          fill="#7A9160"
          stroke="#17171C"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M0,0 V-20 M0,-10 q-14,-3 -14,-17 q13,1 14,17 M0,-12 q14,-3 14,-17 q-13,1 -14,17" />
        </g>
      </defs>

      <rect width="300" height="200" fill="#E8DABB" />

      <g filter="url(#hpRough)" strokeLinecap="round" strokeLinejoin="round">
        {/* Soft yellow sun */}
        <circle cx="215" cy="55" r="30" fill="#FFD23F" stroke="#17171C" strokeWidth="3" />

        {/* Soft ground dunes */}
        <ellipse cx="80" cy="190" rx="120" ry="35" fill="#D9C79F" />
        <ellipse cx="230" cy="195" rx="110" ry="40" fill="#CDB98C" />
        <path d="M0,175 H300" stroke="#17171C" strokeWidth="4.5" fill="none" />

        {/* Chimney */}
        <rect
          x="145"
          y="58"
          width="14"
          height="30"
          fill="#FAF8F5"
          stroke="#17171C"
          strokeWidth="3.5"
        />

        {/* Cottage body */}
        <rect
          x="75"
          y="98"
          width="95"
          height="75"
          fill="#FAF8F5"
          stroke="#17171C"
          strokeWidth="4"
        />
        {/* Terracotta roof */}
        <polygon points="60,102 122,58 185,102" fill="#DC7856" stroke="#17171C" strokeWidth="4" />

        {/* Windows in periwinkle */}
        <rect
          x="85"
          y="112"
          width="22"
          height="22"
          fill="#8B8BE0"
          stroke="#17171C"
          strokeWidth="3"
        />
        <rect
          x="138"
          y="112"
          width="22"
          height="22"
          fill="#8B8BE0"
          stroke="#17171C"
          strokeWidth="3"
        />

        {/* Door in sage green */}
        <path
          d="M112,173 V144 a11,11 0 0 1 22,0 V173 Z"
          fill="#7A9160"
          stroke="#17171C"
          strokeWidth="3.5"
        />

        {/* Garden tree beside cottage */}
        <rect
          x="195"
          y="135"
          width="8"
          height="38"
          fill="#D4A27F"
          stroke="#17171C"
          strokeWidth="3"
        />
        <circle cx="199" cy="125" r="28" fill="#7A9160" stroke="#17171C" strokeWidth="4" />
        <circle cx="188" cy="132" r="6" fill="#DC7856" stroke="#17171C" strokeWidth="2" />
        <circle cx="210" cy="118" r="6" fill="#DC7856" stroke="#17171C" strokeWidth="2" />

        {/* Little sprouts */}
        <use href="#hpSprout" transform="translate(45,173)" />
        <use href="#hpSprout" transform="translate(255,173) scale(0.85)" />
      </g>
    </svg>
  );
}

/*
  SearchEmptyIllustration: Hand-drawn folded map, magnifying glass and pin
  matching the site's hero-art and favorites-gate bento aesthetic.
*/
export function SearchEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-hidden
      fill="none"
    >
      <defs>
        <filter id="seRough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02"
            numOctaves="2"
            seed="6"
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <g id="seBurst" fill="none" strokeWidth="3" strokeLinecap="round">
          <path d="M-12,0 H12" />
          <path d="M-12,0 H12" transform="rotate(30)" />
          <path d="M-12,0 H12" transform="rotate(60)" />
          <path d="M-12,0 H12" transform="rotate(90)" />
          <path d="M-12,0 H12" transform="rotate(120)" />
          <path d="M-12,0 H12" transform="rotate(150)" />
        </g>
        <g
          id="seSprout"
          fill="#7A9160"
          stroke="#17171C"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M0,0 V-18 M0,-9 q-12,-3 -12,-15 q11,1 12,15 M0,-10 q12,-3 12,-15 q-11,1 -12,15" />
        </g>
      </defs>

      <g filter="url(#seRough)" strokeLinecap="round" strokeLinejoin="round">
        {/* Background starbursts */}
        <use href="#seBurst" stroke="#FFD23F" transform="translate(55, 45)" />
        <use href="#seBurst" stroke="#17171C" transform="translate(270, 50) scale(0.9)" />
        <use href="#seBurst" stroke="#8B8BE0" transform="translate(45, 185) scale(0.8)" />

        {/* Hand-drawn Folded Map Tile */}
        <g transform="translate(55, 45)">
          {/* Map Shadow */}
          <path
            d="M8,12 L68,-8 L138,12 L198,-8 L198,132 L138,152 L68,132 L8,152 Z"
            fill="#17171C"
            opacity="0.12"
          />
          {/* Map Body Panels */}
          <polygon
            points="0,20 60,0 60,140 0,160"
            fill="#FAF8F5"
            stroke="#17171C"
            strokeWidth="4"
          />
          <polygon
            points="60,0 130,20 130,160 60,140"
            fill="#E8DABB"
            stroke="#17171C"
            strokeWidth="4"
          />
          <polygon
            points="130,20 190,0 190,140 130,160"
            fill="#FAF8F5"
            stroke="#17171C"
            strokeWidth="4"
          />

          {/* Road markings */}
          <path
            d="M15,100 Q40,80 50,50"
            stroke="#DC7856"
            strokeWidth="5"
            strokeDasharray="6 6"
            fill="none"
          />
          <path d="M75,55 Q100,85 120,60" stroke="#8B8BE0" strokeWidth="5" fill="none" />
          <path
            d="M140,80 Q165,110 180,70"
            stroke="#7A9160"
            strokeWidth="5"
            strokeDasharray="6 6"
            fill="none"
          />

          {/* Small trees/houses on map */}
          <circle cx="35" cy="45" r="10" fill="#7A9160" stroke="#17171C" strokeWidth="2.5" />
          <polygon
            points="150,40 160,25 170,40"
            fill="#DC7856"
            stroke="#17171C"
            strokeWidth="2.5"
          />
        </g>

        {/* Hand-drawn Pin in flyer yellow */}
        <g transform="translate(145, 70)">
          <path
            d="M15,38 C15,38 30,18 30,10 A15,15 0 0 0 0,10 C0,18 15,38 15,38 Z"
            fill="#FFD23F"
            stroke="#17171C"
            strokeWidth="3.5"
          />
          <circle cx="15" cy="10" r="5" fill="#FAF8F5" stroke="#17171C" strokeWidth="2" />
        </g>

        {/* Hand-drawn Magnifying Glass (Foreground) */}
        <g transform="translate(165, 110)">
          {/* Handle */}
          <line
            x1="45"
            y1="45"
            x2="80"
            y2="80"
            stroke="#D4A27F"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <line
            x1="45"
            y1="45"
            x2="80"
            y2="80"
            stroke="#17171C"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <line
            x1="45"
            y1="45"
            x2="78"
            y2="78"
            stroke="#DC7856"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Glass Rim & Lens */}
          <circle
            cx="24"
            cy="24"
            r="28"
            fill="#8B8BE0"
            opacity="0.8"
            stroke="#17171C"
            strokeWidth="4.5"
          />
          <circle cx="24" cy="24" r="22" fill="#FAF8F5" opacity="0.6" />
          <path d="M10,14 Q20,8 32,10" stroke="#FAF8F5" strokeWidth="3" fill="none" />
        </g>

        {/* Little sprout */}
        <use href="#seSprout" transform="translate(265, 195)" />
      </g>
    </svg>
  );
}

/*
  AiUnavailableIllustration: Hand-drawn friendly robot assistant
  matching the site's bento style.
*/
export function AiUnavailableIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-hidden
      fill="none"
    >
      <defs>
        <filter id="aiRough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02"
            numOctaves="2"
            seed="8"
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <g id="aiBurst" fill="none" strokeWidth="3" strokeLinecap="round">
          <path d="M-12,0 H12" />
          <path d="M-12,0 H12" transform="rotate(30)" />
          <path d="M-12,0 H12" transform="rotate(60)" />
          <path d="M-12,0 H12" transform="rotate(90)" />
          <path d="M-12,0 H12" transform="rotate(120)" />
          <path d="M-12,0 H12" transform="rotate(150)" />
        </g>
      </defs>

      <g filter="url(#aiRough)" strokeLinecap="round" strokeLinejoin="round">
        <use href="#aiBurst" stroke="#FFD23F" transform="translate(55, 55)" />
        <use href="#aiBurst" stroke="#17171C" transform="translate(265, 55) scale(0.9)" />

        {/* Hand-drawn Robot Head Tile */}
        <g transform="translate(100, 45)">
          {/* Shadow */}
          <rect x="6" y="8" width="120" height="135" rx="18" fill="#17171C" opacity="0.12" />
          {/* Body */}
          <rect
            width="120"
            height="135"
            rx="18"
            fill="#8B8BE0"
            stroke="#17171C"
            strokeWidth="4.5"
          />

          {/* Antenna */}
          <line x1="60" y1="0" x2="60" y2="-22" stroke="#17171C" strokeWidth="4" />
          <circle cx="60" cy="-24" r="8" fill="#FFD23F" stroke="#17171C" strokeWidth="3" />

          {/* Face screen */}
          <rect
            x="18"
            y="24"
            width="84"
            height="58"
            rx="12"
            fill="#FAF8F5"
            stroke="#17171C"
            strokeWidth="3.5"
          />
          {/* Friendly eyes */}
          <circle cx="42" cy="48" r="7" fill="#17171C" />
          <circle cx="78" cy="48" r="7" fill="#17171C" />
          {/* Smile */}
          <path d="M46,64 Q60,74 74,64" stroke="#17171C" strokeWidth="3" fill="none" />

          {/* Chest dials */}
          <circle cx="38" cy="105" r="8" fill="#FFD23F" stroke="#17171C" strokeWidth="2.5" />
          <circle cx="60" cy="105" r="8" fill="#DC7856" stroke="#17171C" strokeWidth="2.5" />
          <circle cx="82" cy="105" r="8" fill="#7A9160" stroke="#17171C" strokeWidth="2.5" />
        </g>
      </g>
    </svg>
  );
}

/*
  NotFoundIllustration: Hand-drawn closed door & street pole
  matching the site's bento standard.
*/
export function NotFoundIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-hidden
      fill="none"
    >
      <defs>
        <filter id="nfRough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02"
            numOctaves="2"
            seed="9"
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <g id="nfBurst" fill="none" strokeWidth="3" strokeLinecap="round">
          <path d="M-12,0 H12" />
          <path d="M-12,0 H12" transform="rotate(30)" />
          <path d="M-12,0 H12" transform="rotate(60)" />
          <path d="M-12,0 H12" transform="rotate(90)" />
          <path d="M-12,0 H12" transform="rotate(120)" />
          <path d="M-12,0 H12" transform="rotate(150)" />
        </g>
        <g
          id="nfSprout"
          fill="#7A9160"
          stroke="#17171C"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M0,0 V-18 M0,-9 q-12,-3 -12,-15 q11,1 12,15 M0,-10 q12,-3 12,-15 q-11,1 -12,15" />
        </g>
      </defs>

      <g filter="url(#nfRough)" strokeLinecap="round" strokeLinejoin="round">
        <use href="#nfBurst" stroke="#FFD23F" transform="translate(50, 50)" />
        <use href="#nfBurst" stroke="#17171C" transform="translate(265, 55) scale(0.9)" />

        {/* Hand-drawn Door Card (Center) */}
        <g transform="translate(110, 30)">
          {/* Shadow */}
          <rect x="6" y="8" width="100" height="170" rx="14" fill="#17171C" opacity="0.12" />
          {/* Door Frame */}
          <rect
            width="100"
            height="170"
            rx="14"
            fill="#FAF8F5"
            stroke="#17171C"
            strokeWidth="4.5"
          />
          {/* Door Panel in Periwinkle */}
          <rect
            x="12"
            y="14"
            width="76"
            height="142"
            rx="8"
            fill="#8B8BE0"
            stroke="#17171C"
            strokeWidth="3.5"
          />
          {/* Door Panels */}
          <rect
            x="24"
            y="28"
            width="52"
            height="48"
            rx="4"
            fill="#FAF8F5"
            stroke="#17171C"
            strokeWidth="2.5"
          />
          <rect
            x="24"
            y="88"
            width="52"
            height="54"
            rx="4"
            fill="#FAF8F5"
            stroke="#17171C"
            strokeWidth="2.5"
          />
          {/* Doorknob in yellow */}
          <circle cx="32" cy="80" r="5" fill="#FFD23F" stroke="#17171C" strokeWidth="2.5" />
        </g>

        {/* Ground Line */}
        <line x1="40" y1="205" x2="280" y2="205" stroke="#17171C" strokeWidth="4.5" />

        {/* Little sprouts */}
        <use href="#nfSprout" transform="translate(75, 205)" />
        <use href="#nfSprout" transform="translate(245, 205) scale(0.85)" />
      </g>
    </svg>
  );
}
