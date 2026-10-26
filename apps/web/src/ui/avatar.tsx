import * as React from "react";
import { cn } from "@/lib/utils";

/*
  Avatars: no images — initials on deterministic tints drawn from the
  palette. The tint index is derived from the name so a person always
  gets the same colour across screens.
*/

const TINTS = [
  "bg-plate-tint text-plate",
  "bg-moss-tint text-moss",
  "bg-flyer/40 text-ink",
  "bg-sunken text-ink",
] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0] !== undefined ? parts[0][0] ?? "" : "";
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? "")[0] ?? "" : "";
  return (first + last).toUpperCase();
}

function tintFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return TINTS[hash % TINTS.length] ?? TINTS[0];
}

export interface AvatarProps extends React.ComponentProps<"span"> {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 40, className, ...props }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex select-none items-center justify-center overflow-hidden rounded-full font-medium",
        tintFor(name),
        className
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      role="img"
      aria-label={name}
      title={name}
      {...props}
    >
      {initials(name)}
    </span>
  );
}
