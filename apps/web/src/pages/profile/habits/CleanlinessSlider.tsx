import { CLEANLINESS_LEVELS } from "../profileTypes";

/** 1-5 slider for how tidy the student is, with the level's name beside it. */
export function CleanlinessSlider({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const level = CLEANLINESS_LEVELS.find((l) => String(l.level) === value);
  const name = level ? level.label : "Chưa chọn";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="p-clean" className="text-sm font-medium text-ink">
          Độ sạch sẽ
        </label>
        <span className="text-sm text-muted">{name}</span>
      </div>
      <input
        id="p-clean"
        type="range"
        min={1}
        max={5}
        step={1}
        value={value || "3"}
        aria-valuetext={name}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className="mt-2 h-8 w-full cursor-pointer accent-plate"
      />
      <div className="flex justify-between text-xs text-muted" aria-hidden>
        <span>Thoải mái</span>
        <span>Rất kỹ tính</span>
      </div>
    </div>
  );
}
