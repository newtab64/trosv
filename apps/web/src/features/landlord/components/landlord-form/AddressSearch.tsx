import { useId, useState } from "react";
import type { KeyboardEvent } from "react";
import { MapPin, Search } from "lucide-react";
import { Field } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";
import type { GeoSuggestion } from "../../api/geocodeApi";
import { useAddressSearch } from "../../hooks/useAddressSearch";

const MAX_SHOWN = 5;
const MIN_CHARS = 3;

/** Search box with live suggestions; choosing one calls `onPick` (the map then flies there). */
export function AddressSearch({ onPick }: { onPick: (s: GeoSuggestion) => void }) {
  const listId = useId();
  const [value, setValue] = useState("");
  // What the landlord typed. Picking a suggestion changes `value` only, so it does not
  // trigger another search for the suggestion's own name.
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { suggestions, status } = useAddressSearch(typed);
  const shown = suggestions.slice(0, MAX_SHOWN);
  const searching = open && typed.trim().length >= MIN_CHARS;

  const pick = (s: GeoSuggestion): void => {
    onPick(s);
    setValue(s.label);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open && shown[active]) {
      e.preventDefault();
      pick(shown[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Field id="lf-search" label="Tìm địa chỉ" required className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          id="lf-search"
          role="combobox"
          aria-expanded={searching && shown.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${String(active)}` : undefined}
          autoComplete="off"
          value={value}
          placeholder="Nhập số nhà, tên đường, phường…"
          className="pl-10"
          onChange={(e) => {
            setValue(e.target.value);
            setTyped(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => {
            setOpen(true);
          }}
          onBlur={() => {
            setOpen(false);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {searching && shown.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className={
            "absolute left-0 right-0 top-full z-[1100] mt-1 overflow-hidden rounded-xl border " +
            "border-line-strong bg-card shadow-pop"
          }
        >
          {shown.map((s, i) => (
            // Keyboard selection is handled by the combobox input (arrows + Enter).
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={s.id}
              id={`${listId}-${String(i)}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                // Keep the focus in the input so the list is not closed before the click lands.
                e.preventDefault();
              }}
              onClick={() => {
                pick(s);
              }}
              className={cn(
                "flex cursor-pointer items-start gap-2 border-b border-line px-4 py-2.5 last:border-b-0",
                i === active ? "bg-plate-tint" : "hover:bg-tint",
              )}
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-plate" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{s.label}</span>
                <span className="block truncate text-xs text-muted">{s.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {searching && status === "loading" ? <p className="text-xs text-muted">Đang tìm…</p> : null}
      {searching && status === "empty" ? (
        <p className="text-xs text-muted">Không tìm thấy địa chỉ</p>
      ) : null}
      {searching && status === "error" ? (
        <p className="text-xs text-muted">
          Không tìm thấy địa chỉ. Bạn có thể bấm vào bản đồ để chọn.
        </p>
      ) : null}
    </Field>
  );
}
