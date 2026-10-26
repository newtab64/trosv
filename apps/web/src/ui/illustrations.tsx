import { cn } from "@/lib/utils";

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
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <g id="hpSprout" fill="#7A9160" stroke="#17171C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        <rect x="145" y="58" width="14" height="30" fill="#FAF8F5" stroke="#17171C" strokeWidth="3.5" />

        {/* Cottage body */}
        <rect x="75" y="98" width="95" height="75" fill="#FAF8F5" stroke="#17171C" strokeWidth="4" />
        {/* Terracotta roof */}
        <polygon points="60,102 122,58 185,102" fill="#DC7856" stroke="#17171C" strokeWidth="4" />

        {/* Windows in periwinkle */}
        <rect x="85" y="112" width="22" height="22" fill="#8B8BE0" stroke="#17171C" strokeWidth="3" />
        <rect x="138" y="112" width="22" height="22" fill="#8B8BE0" stroke="#17171C" strokeWidth="3" />

        {/* Door in sage green */}
        <path d="M112,173 V144 a11,11 0 0 1 22,0 V173 Z" fill="#7A9160" stroke="#17171C" strokeWidth="3.5" />

        {/* Garden tree beside cottage */}
        <rect x="195" y="135" width="8" height="38" fill="#D4A27F" stroke="#17171C" strokeWidth="3" />
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
  FavoriteEmptyIllustration: Hand-drawn listing card with heart badge
  matching the exact style of favorites-gate.svg and hero-art.svg.
*/
export function FavoriteEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-hidden
      fill="none"
    >
      <defs>
        <filter id="feRough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="5" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <clipPath id="feCardClip">
          <rect width="160" height="200" rx="16" />
        </clipPath>
        <clipPath id="feImgClip">
          <rect width="160" height="130" />
        </clipPath>
        <path id="feHeart" d="M0 5 C-10 -2 -8 -9 -3 -9 C-1 -9 0 -7.5 0 -6 C0 -7.5 1 -9 3 -9 C8 -9 10 -2 0 5Z" />
        <g id="feBurst" fill="none" strokeWidth="3" strokeLinecap="round">
          <path d="M-12,0 H12" />
          <path d="M-12,0 H12" transform="rotate(30)" />
          <path d="M-12,0 H12" transform="rotate(60)" />
          <path d="M-12,0 H12" transform="rotate(90)" />
          <path d="M-12,0 H12" transform="rotate(120)" />
          <path d="M-12,0 H12" transform="rotate(150)" />
        </g>
        <g id="feSprout" fill="#7A9160" stroke="#17171C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0,0 V-18 M0,-9 q-12,-3 -12,-15 q11,1 12,15 M0,-10 q12,-3 12,-15 q-11,1 -12,15" />
        </g>
      </defs>

      <g filter="url(#feRough)" strokeLinecap="round" strokeLinejoin="round">
        {/* Starburst rays in background */}
        <use href="#feBurst" stroke="#17171C" transform="translate(48, 55)" />
        <use href="#feBurst" stroke="#FFD23F" transform="translate(275, 45) scale(1.2)" />
        <use href="#feBurst" stroke="#7A9160" transform="translate(285, 175) scale(0.8)" />
        <circle cx="55" cy="180" r="5" fill="#DC7856" />
        <circle cx="265" cy="115" r="4" fill="#8B8BE0" />

        {/* Hand-drawn Property Card (Center, tilted slightly -3 deg) */}
        <g transform="translate(80, 20) rotate(-3 80 100)">
          {/* Shadow */}
          <rect x="6" y="8" width="160" height="200" rx="16" fill="#17171C" opacity="0.12" />
          {/* Card background */}
          <rect width="160" height="200" rx="16" fill="#FAF8F5" />

          {/* Top illustration panel */}
          <g clipPath="url(#feCardClip)">
            <g clipPath="url(#feImgClip)">
              <rect width="160" height="130" fill="#E8DABB" />
              <ellipse cx="35" cy="140" rx="80" ry="25" fill="#D9C79F" />
              <ellipse cx="130" cy="142" rx="80" ry="28" fill="#CDB98C" />
              {/* Sun */}
              <circle cx="125" cy="35" r="14" fill="#FFD23F" stroke="#17171C" strokeWidth="2.5" />
              {/* Cottage */}
              <rect x="40" y="68" width="70" height="52" fill="#FAF8F5" stroke="#17171C" strokeWidth="3.5" />
              <polygon points="30,72 75,38 120,72" fill="#DC7856" stroke="#17171C" strokeWidth="3.5" />
              <rect x="48" y="80" width="15" height="15" fill="#8B8BE0" stroke="#17171C" strokeWidth="2.5" />
              <rect x="88" y="80" width="15" height="15" fill="#8B8BE0" stroke="#17171C" strokeWidth="2.5" />
              <path d="M67 120 V98 a8 8 0 0 1 16 0 V120 Z" fill="#7A9160" stroke="#17171C" strokeWidth="3" />
              {/* Tree */}
              <circle cx="128" cy="95" r="18" fill="#7A9160" stroke="#17171C" strokeWidth="3" />
              <circle cx="122" cy="102" r="4" fill="#DC7856" stroke="#17171C" strokeWidth="1.8" />
              <circle cx="135" cy="90" r="4" fill="#DC7856" stroke="#17171C" strokeWidth="1.8" />
            </g>
            <path d="M0,130 H160" stroke="#17171C" strokeWidth="4" />
          </g>

          {/* Card Border */}
          <rect width="160" height="200" rx="16" fill="none" stroke="#17171C" strokeWidth="4.5" />

          {/* Card text bars */}
          <path d="M16,150 H100" stroke="#17171C" strokeWidth="5" />
          <path d="M16,170 H140" stroke="#8B8BE0" strokeWidth="5" />

          {/* Heart Badge at Top-Left */}
          <circle cx="24" cy="24" r="15" fill="#FAF8F5" stroke="#17171C" strokeWidth="3" />
          <use href="#feHeart" x="24" y="25" fill="#FFD23F" stroke="#17171C" strokeWidth="1.6" />
        </g>

        {/* Little plant sprout at bottom right of card */}
        <use href="#feSprout" transform="translate(245, 215)" />
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
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="6" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <g id="seBurst" fill="none" strokeWidth="3" strokeLinecap="round">
          <path d="M-12,0 H12" />
          <path d="M-12,0 H12" transform="rotate(30)" />
          <path d="M-12,0 H12" transform="rotate(60)" />
          <path d="M-12,0 H12" transform="rotate(90)" />
          <path d="M-12,0 H12" transform="rotate(120)" />
          <path d="M-12,0 H12" transform="rotate(150)" />
        </g>
        <g id="seSprout" fill="#7A9160" stroke="#17171C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
          <polygon points="0,20 60,0 60,140 0,160" fill="#FAF8F5" stroke="#17171C" strokeWidth="4" />
          <polygon points="60,0 130,20 130,160 60,140" fill="#E8DABB" stroke="#17171C" strokeWidth="4" />
          <polygon points="130,20 190,0 190,140 130,160" fill="#FAF8F5" stroke="#17171C" strokeWidth="4" />

          {/* Road markings */}
          <path d="M15,100 Q40,80 50,50" stroke="#DC7856" strokeWidth="5" strokeDasharray="6 6" fill="none" />
          <path d="M75,55 Q100,85 120,60" stroke="#8B8BE0" strokeWidth="5" fill="none" />
          <path d="M140,80 Q165,110 180,70" stroke="#7A9160" strokeWidth="5" strokeDasharray="6 6" fill="none" />

          {/* Small trees/houses on map */}
          <circle cx="35" cy="45" r="10" fill="#7A9160" stroke="#17171C" strokeWidth="2.5" />
          <polygon points="150,40 160,25 170,40" fill="#DC7856" stroke="#17171C" strokeWidth="2.5" />
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
          <line x1="45" y1="45" x2="80" y2="80" stroke="#D4A27F" strokeWidth="12" strokeLinecap="round" />
          <line x1="45" y1="45" x2="80" y2="80" stroke="#17171C" strokeWidth="12" strokeLinecap="round" />
          <line x1="45" y1="45" x2="78" y2="78" stroke="#DC7856" strokeWidth="6" strokeLinecap="round" />

          {/* Glass Rim & Lens */}
          <circle cx="24" cy="24" r="28" fill="#8B8BE0" opacity="0.8" stroke="#17171C" strokeWidth="4.5" />
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
  MessagesEmptyIllustration: Hand-drawn conversation bubbles
  matching inbox-gate.svg and the site's bento standard.
*/
export function MessagesEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-hidden
      fill="none"
    >
      <defs>
        <filter id="meRough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <g id="meBurst" fill="none" strokeWidth="3" strokeLinecap="round">
          <path d="M-12,0 H12" />
          <path d="M-12,0 H12" transform="rotate(30)" />
          <path d="M-12,0 H12" transform="rotate(60)" />
          <path d="M-12,0 H12" transform="rotate(90)" />
          <path d="M-12,0 H12" transform="rotate(120)" />
          <path d="M-12,0 H12" transform="rotate(150)" />
        </g>
        <g id="meSprout" fill="#7A9160" stroke="#17171C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0,0 V-18 M0,-9 q-12,-3 -12,-15 q11,1 12,15 M0,-10 q12,-3 12,-15 q-11,1 -12,15" />
        </g>
      </defs>

      <g filter="url(#meRough)" strokeLinecap="round" strokeLinejoin="round">
        {/* Starburst rays */}
        <use href="#meBurst" stroke="#FFD23F" transform="translate(45, 55)" />
        <use href="#meBurst" stroke="#17171C" transform="translate(275, 45) scale(0.9)" />
        <use href="#meBurst" stroke="#7A9160" transform="translate(280, 185) scale(0.8)" />

        {/* Large Bubble (Left, Cream/Beige) */}
        <g transform="translate(45, 40)">
          <path
            d="M20,0 H140 A20,20 0 0 1 160,20 V80 A20,20 0 0 1 140,100 H55 Q35,115 15,120 Q25,105 25,100 H20 A20,20 0 0 1 0,80 V20 A20,20 0 0 1 20,0 Z"
            fill="#17171C"
            opacity="0.12"
            transform="translate(6, 6)"
          />
          <path
            d="M20,0 H140 A20,20 0 0 1 160,20 V80 A20,20 0 0 1 140,100 H55 Q35,115 15,120 Q25,105 25,100 H20 A20,20 0 0 1 0,80 V20 A20,20 0 0 1 20,0 Z"
            fill="#E8DABB"
            stroke="#17171C"
            strokeWidth="4"
          />
          {/* Text lines */}
          <path d="M25,32 H110" stroke="#17171C" strokeWidth="5" />
          <path d="M25,50 H90" stroke="#8B8BE0" strokeWidth="5" />
          <path d="M25,68 H130" stroke="#7A9160" strokeWidth="5" />
        </g>

        {/* Small Bubble (Right Foreground, Periwinkle) */}
        <g transform="translate(130, 115)">
          <path
            d="M20,0 H120 A20,20 0 0 1 140,20 V60 A20,20 0 0 1 120,80 H105 Q115,95 125,100 Q105,95 85,80 H20 A20,20 0 0 1 0,60 V20 A20,20 0 0 1 20,0 Z"
            fill="#17171C"
            opacity="0.08"
            transform="translate(5, 5)"
          />
          <path
            d="M20,0 H120 A20,20 0 0 1 140,20 V60 A20,20 0 0 1 120,80 H105 Q115,95 125,100 Q105,95 85,80 H20 A20,20 0 0 1 0,60 V20 A20,20 0 0 1 20,0 Z"
            fill="#8B8BE0"
            stroke="#17171C"
            strokeWidth="3.5"
          />
          {/* Text lines */}
          <path d="M25,28 H95" stroke="#FAF8F5" strokeWidth="5" />
          <path d="M25,46 H75" stroke="#FFD23F" strokeWidth="5" />
        </g>

        {/* Little sprout */}
        <use href="#meSprout" transform="translate(265, 195)" />
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
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="8" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
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
          <rect width="120" height="135" rx="18" fill="#8B8BE0" stroke="#17171C" strokeWidth="4.5" />

          {/* Antenna */}
          <line x1="60" y1="0" x2="60" y2="-22" stroke="#17171C" strokeWidth="4" />
          <circle cx="60" cy="-24" r="8" fill="#FFD23F" stroke="#17171C" strokeWidth="3" />

          {/* Face screen */}
          <rect x="18" y="24" width="84" height="58" rx="12" fill="#FAF8F5" stroke="#17171C" strokeWidth="3.5" />
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
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <g id="nfBurst" fill="none" strokeWidth="3" strokeLinecap="round">
          <path d="M-12,0 H12" />
          <path d="M-12,0 H12" transform="rotate(30)" />
          <path d="M-12,0 H12" transform="rotate(60)" />
          <path d="M-12,0 H12" transform="rotate(90)" />
          <path d="M-12,0 H12" transform="rotate(120)" />
          <path d="M-12,0 H12" transform="rotate(150)" />
        </g>
        <g id="nfSprout" fill="#7A9160" stroke="#17171C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
          <rect width="100" height="170" rx="14" fill="#FAF8F5" stroke="#17171C" strokeWidth="4.5" />
          {/* Door Panel in Periwinkle */}
          <rect x="12" y="14" width="76" height="142" rx="8" fill="#8B8BE0" stroke="#17171C" strokeWidth="3.5" />
          {/* Door Panels */}
          <rect x="24" y="28" width="52" height="48" rx="4" fill="#FAF8F5" stroke="#17171C" strokeWidth="2.5" />
          <rect x="24" y="88" width="52" height="54" rx="4" fill="#FAF8F5" stroke="#17171C" strokeWidth="2.5" />
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
