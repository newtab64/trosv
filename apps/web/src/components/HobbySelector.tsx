import React, { useState } from "react";
import { HOBBY_LIST, parseHobbies } from "@/constants/hobbies";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

export interface HobbySelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function HobbySelector({
  value,
  onChange,
  className,
  disabled = false,
}: HobbySelectorProps) {
  const [customInput, setCustomInput] = useState("");

  const selectedHobbies = parseHobbies(value);
  const selectedKeys = new Set(selectedHobbies.map((h) => h.key.toLowerCase()));

  const updateList = (newKeys: string[]) => {
    const unique = Array.from(new Set(newKeys.map((k) => k.trim()))).filter(Boolean);
    onChange(unique.join(","));
  };

  const toggleStandard = (key: string) => {
    if (disabled) return;
    const lower = key.trim().toLowerCase();
    if (selectedKeys.has(lower)) {
      updateList(selectedHobbies.filter((h) => h.key.toLowerCase() !== lower).map((h) => h.key));
    } else {
      updateList([...selectedHobbies.map((h) => h.key), key]);
    }
  };

  const removeHobby = (key: string) => {
    if (disabled) return;
    const lower = key.trim().toLowerCase();
    updateList(selectedHobbies.filter((h) => h.key.toLowerCase() !== lower).map((h) => h.key));
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed || disabled) return;
    if (!selectedKeys.has(trimmed.toLowerCase())) {
      updateList([...selectedHobbies.map((h) => h.key), trimmed]);
    }
    setCustomInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustom();
    }
  };

  // Find any custom hobbies that are not in the standard HOBBY_LIST
  const standardKeySet = new Set(HOBBY_LIST.map((h) => h.key.toLowerCase()));
  const customHobbies = selectedHobbies.filter(
    (h) => !standardKeySet.has(h.key.toLowerCase())
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Pills cloud: pure typographic pills, no emoji or icon bloat */}
      <div className="flex flex-wrap gap-2">
        {/* Custom hobbies currently selected */}
        {customHobbies.map((hobby) => (
          <span
            key={hobby.key}
            className="inline-flex items-center gap-1.5 rounded-lg border border-plate bg-plate-tint px-3 py-1.5 text-xs font-semibold text-plate shadow-2xs"
          >
            <span>{hobby.label}</span>
            {!disabled ? (
              <button
                type="button"
                onClick={() => { removeHobby(hobby.key); }}
                className="rounded p-0.5 text-plate/70 hover:bg-plate/15 hover:text-plate transition-colors"
                aria-label={`Xóa ${hobby.label}`}
              >
                <X className="size-3" aria-hidden />
              </button>
            ) : null}
          </span>
        ))}

        {/* Standard hobbies */}
        {HOBBY_LIST.map((hobby) => {
          const isSelected = selectedKeys.has(hobby.key.toLowerCase());
          return (
            <button
              key={hobby.key}
              type="button"
              disabled={disabled}
              onClick={() => { toggleStandard(hobby.key); }}
              className={cn(
                "inline-flex items-center rounded-lg border px-3 py-1.5 text-xs transition-colors",
                isSelected
                  ? "border-plate bg-plate text-white font-semibold shadow-2xs"
                  : "border-line bg-card text-ink-2 hover:border-line-strong hover:bg-tint font-normal"
              )}
            >
              <span>{hobby.label}</span>
            </button>
          );
        })}
      </div>

      {/* Inline custom hobby input & selection stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {!disabled ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => { setCustomInput(e.target.value); }}
              onKeyDown={handleKeyDown}
              placeholder="Thêm sở thích khác..."
              className="h-8 w-44 rounded-lg border border-line bg-card px-2.5 text-xs text-ink placeholder:text-muted focus:border-plate focus:outline-none focus:ring-1 focus:ring-plate"
            />
            {customInput.trim() ? (
              <button
                type="button"
                onClick={addCustom}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-ink px-2.5 text-xs font-medium text-white transition hover:bg-ink-2 shadow-2xs"
              >
                <Plus className="size-3.5" aria-hidden />
                <span>Thêm</span>
              </button>
            ) : null}
          </div>
        ) : null}

        {selectedHobbies.length > 0 ? (
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>
              Đã chọn: <strong className="font-semibold text-ink">{selectedHobbies.length}</strong>
            </span>
            {!disabled ? (
              <button
                type="button"
                onClick={() => { onChange(""); }}
                className="text-xs text-muted hover:text-danger hover:underline transition-colors"
              >
                Bỏ chọn tất cả
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
