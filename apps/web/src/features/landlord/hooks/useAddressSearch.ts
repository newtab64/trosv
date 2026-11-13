import { useEffect, useState } from "react";
import { searchAddress, type GeoSuggestion } from "../api/geocodeApi";

export type SearchStatus = "idle" | "loading" | "empty" | "error";
interface SearchState {
  suggestions: GeoSuggestion[];
  status: SearchStatus;
}

const IDLE: SearchState = { suggestions: [], status: "idle" };
const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

/**
 * Suggestions for what the landlord is typing: searches 300 ms after the last keystroke,
 * never for fewer than 3 characters, aborts the request of an older query, and ignores any
 * answer that arrives after a newer query or after unmount.
 */
export function useAddressSearch(query: string): SearchState {
  const q = query.trim();
  const [state, setState] = useState<SearchState>(IDLE);

  useEffect(() => {
    if (q.length < MIN_CHARS) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState((s) => ({ ...s, status: "loading" }));
      searchAddress(q, controller.signal)
        .then((suggestions) => {
          if (controller.signal.aborted) return;
          setState({ suggestions, status: suggestions.length > 0 ? "idle" : "empty" });
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted || (err as Error).name === "AbortError") return;
          setState({ suggestions: [], status: "error" });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  return q.length < MIN_CHARS ? IDLE : state;
}
