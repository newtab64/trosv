import { useState, useMemo, useRef, useEffect } from "react";
import type { School } from "@/types/api";
import { cn } from "@/lib/utils";
import { GraduationCap, Search, Check, X, ChevronsUpDown, RotateCcw } from "lucide-react";

export interface SchoolComboboxProps {
  schools: School[];
  value: string; // school_id as string
  onChange: (id: string) => void;
  error?: string | undefined;
  className?: string | undefined;
}

function normalizeVi(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");
}

export function SchoolCombobox({
  schools,
  value,
  onChange,
  error,
  className,
}: SchoolComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSchool = useMemo(() => {
    if (!value) return null;
    return schools.find((s) => String(s.id) === value) ?? null;
  }, [schools, value]);

  // Extract cities
  const cities = useMemo(() => {
    const list = Array.from(
      new Set(schools.map((s) => s.city?.name).filter((name): name is string => Boolean(name)))
    );
    return list;
  }, [schools]);

  // Filtered schools based on city tab & search query
  const filteredSchools = useMemo(() => {
    const q = normalizeVi(query.trim());
    return schools.filter((s) => {
      if (selectedCity !== "all" && s.city?.name !== selectedCity) {
        return false;
      }
      if (!q) return true;
      const normalizedName = normalizeVi(s.name);
      return normalizedName.includes(q);
    });
  }, [schools, query, selectedCity]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleSelect = (schoolId: number) => {
    onChange(String(schoolId));
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Selected Card View (when closed and school is picked) */}
      {selectedSchool && !open ? (
        <div
          className={
            "flex items-center justify-between rounded-xl border border-line bg-card " +
            "p-3.5 shadow-xs transition hover:border-line-strong"
          }
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-plate-tint text-plate">
              <GraduationCap className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{selectedSchool.name}</p>
              <p className="text-xs text-muted">
                {selectedSchool.city?.name ?? "Đại học / Cao đẳng"}
                {selectedSchool.ward?.name ? ` · ${selectedSchool.ward.name}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className={
                "rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-medium " +
                "text-ink-2 hover:bg-tint hover:text-ink transition-colors"
              }
            >
              Đổi trường
            </button>
            <button
              type="button"
              onClick={handleClear}
              aria-label="Xóa chọn trường"
              className="rounded-lg p-1.5 text-muted hover:bg-tint hover:text-danger transition-colors"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : !open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-lg border bg-card px-3 text-sm transition",
            "text-left cursor-pointer",
            error ? "border-danger ring-1 ring-danger" : "border-line-strong hover:border-plate"
          )}
        >
          <div className="flex items-center gap-2 text-ink-2 min-w-0 flex-1">
            <Search className="size-4 text-muted shrink-0" aria-hidden />
            <span className="text-muted truncate">
              Tìm theo tên trường hoặc viết tắt (VD: Bách Khoa, UET...)
            </span>
          </div>
          <ChevronsUpDown className="size-4 text-muted shrink-0 ml-2" aria-hidden />
        </button>
      ) : (
        <div
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-lg border bg-card px-3 text-sm transition",
            "border-plate ring-2 ring-plate/20"
          )}
        >
          <div className="flex items-center gap-2 text-ink-2 min-w-0 flex-1">
            <Search className="size-4 text-muted shrink-0" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); }}
              placeholder="Gõ tên trường hoặc viết tắt (VD: Bách Khoa, UET, UEH...)"
              className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="p-1 text-muted hover:text-ink"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : null}
            <ChevronsUpDown className="size-4 text-muted" aria-hidden />
          </div>
        </div>
      )}

      {/* Floating Dropdown Picker */}
      {open ? (
        <div
          className={
            "absolute left-0 right-0 top-full z-30 mt-1.5 rounded-xl border border-line " +
            "bg-card shadow-pop overflow-hidden animate-pop-in"
          }
        >
          {/* City filter tabs */}
          {cities.length > 0 ? (
            <div className="flex items-center gap-1 border-b border-line bg-paper/60 p-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => { setSelectedCity("all"); }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors shrink-0",
                  selectedCity === "all"
                    ? "bg-plate text-white shadow-xs font-semibold"
                    : "bg-card text-muted hover:text-ink hover:bg-tint border border-line"
                )}
              >
                Tất cả ({schools.length})
              </button>
              {cities.map((c) => {
                const count = schools.filter((s) => s.city?.name === c).length;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setSelectedCity(c); }}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors shrink-0",
                      selectedCity === c
                        ? "bg-plate text-white shadow-xs font-semibold"
                        : "bg-card text-muted hover:text-ink hover:bg-tint border border-line"
                    )}
                  >
                    {c} ({count})
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Results List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
            {filteredSchools.length > 0 ? (
              filteredSchools.map((s) => {
                const isSelected = String(s.id) === value;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { handleSelect(s.id); }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5",
                      "text-left text-sm transition-colors",
                      isSelected
                        ? "bg-plate-tint/70 text-plate font-semibold"
                        : "text-ink hover:bg-tint"
                    )}
                  >
                    <div className="min-w-0 pr-3">
                      <p className="truncate font-medium">{s.name}</p>
                      <p className="text-xs text-muted">
                        {s.city?.name ?? ""}
                        {s.ward?.name ? ` · ${s.ward.name}` : ""}
                      </p>
                    </div>
                    {isSelected ? <Check className="size-4 text-plate shrink-0" aria-hidden /> : null}
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-muted space-y-2">
                <p>Không tìm thấy trường nào phù hợp với từ khóa &ldquo;{query}&rdquo;</p>
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setSelectedCity("all");
                    }}
                    className={
                      "inline-flex items-center gap-1 rounded-md border border-line bg-paper " +
                      "px-2.5 py-1 text-xs font-medium text-ink hover:bg-tint"
                    }
                  >
                    <RotateCcw className="size-3" aria-hidden />
                    <span>Xem tất cả các trường</span>
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div
            className={
              "border-t border-line bg-paper/30 px-3 py-2 text-[11px] text-muted " +
              "flex items-center justify-between"
            }
          >
            <span>Hiển thị {filteredSchools.length} trường</span>
            <button
              type="button"
              onClick={() => { setOpen(false); }}
              className="text-plate hover:underline font-medium"
            >
              Đóng
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
