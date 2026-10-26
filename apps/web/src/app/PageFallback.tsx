import { Skeleton } from "@/ui/badge";

export function PageFallback() {
  /* Skeleton mirroring a generic page body while the chunk loads. */
  return (
    <div className="mx-auto max-w-6xl p-6">
      <Skeleton className="h-8 w-64" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
