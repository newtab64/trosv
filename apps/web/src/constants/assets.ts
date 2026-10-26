/**
 * Canonical image and SVG artwork paths.
 * Centralizing art asset paths prevents magic string drift across pages and gates.
 */
export const ART_ASSETS = {
  HERO_DESKTOP: "/art/hero-art.svg?v=pure-color-2",
  HERO_MOBILE: "/art/hero-art-mobile.svg?v=2",
  FAVORITES_GATE: "/art/favorites-gate.svg?v=pure-color-1",
  INBOX_GATE: "/art/inbox-gate.svg?v=pure-color-1",
  AUTH_STUDENT: "/art/book-and-fern.svg?v=restore-0a03600",
  AUTH_LANDLORD: "/art/house-and-tree.svg?v=restore-0a03600",
} as const;
