import { useEffect, useRef, useState } from "react";

/**
 * One blob URL per file, in the same order (empty until the first effect has run). A URL is
 * created once per File and revoked as soon as its file leaves the list, and for all files on
 * unmount, so thumbnails neither reload on every change nor leak memory.
 */
export function useObjectUrls(files: File[]): string[] {
  const cache = useRef(new Map<File, string>());
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const map = cache.current;
    for (const file of files) {
      if (!map.has(file)) map.set(file, URL.createObjectURL(file));
    }
    for (const [file, url] of map) {
      if (!files.includes(file)) {
        URL.revokeObjectURL(url);
        map.delete(file);
      }
    }
    setUrls(files.map((file) => map.get(file) ?? ""));
  }, [files]);

  useEffect(() => {
    const map = cache.current;
    return () => {
      map.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      map.clear();
    };
  }, []);

  return urls;
}
