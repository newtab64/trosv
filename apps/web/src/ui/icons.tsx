import type { ReactNode } from "react";

export {
  HousePlaceholder,
  FavoriteEmptyIllustration,
  SearchEmptyIllustration,
  MessagesEmptyIllustration,
  AiUnavailableIllustration,
  NotFoundIllustration,
} from "./illustrations";

/*
  Product-rail icon set: 32px grid, 2px stroke, round caps — the same
  weight/rhythm as Zillow's rail glyphs. currentColor so active/inactive
  states come from the parent.
*/
function RailIconBase({
  className,
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function RailSearchIcon({ className }: { className?: string }) {
  return (
    <RailIconBase className={className}>
      <circle cx="14" cy="14" r="9" />
      <line x1="21" y1="21" x2="27.5" y2="27.5" />
    </RailIconBase>
  );
}

export function RailHeartIcon({ className }: { className?: string }) {
  return (
    <RailIconBase className={className}>
      <path d="M16 28.5C9.5 23 5 18.6 5 13.4 5 10 7.4 7.5 10.6 7.5c2.2 0 4 1.3 5.4 3.3 1.4-2 3.2-3.3 5.4-3.3 3.2 0 5.6 2.5 5.6 5.9 0 5.2-4.5 9.6-11 15.1z" />
    </RailIconBase>
  );
}

export function RailMessageIcon({ className }: { className?: string }) {
  return (
    <RailIconBase className={className}>
      <path d="M24 5H8a3.5 3.5 0 0 0-3.5 3.5v11A3.5 3.5 0 0 0 8 23h2v5.5L15.5 23H24a3.5 3.5 0 0 0 3.5-3.5v-11A3.5 3.5 0 0 0 24 5z" />
    </RailIconBase>
  );
}


export function RailBuildingIcon({ className }: { className?: string }) {
  return (
    <RailIconBase className={className}>
      <rect x="8" y="4" width="16" height="24" rx="2" />
      <line x1="12" y1="9.5" x2="14.5" y2="9.5" />
      <line x1="17.5" y1="9.5" x2="20" y2="9.5" />
      <line x1="12" y1="14" x2="14.5" y2="14" />
      <line x1="17.5" y1="14" x2="20" y2="14" />
      <path d="M13.5 28v-4.5h5V28" />
    </RailIconBase>
  );
}
