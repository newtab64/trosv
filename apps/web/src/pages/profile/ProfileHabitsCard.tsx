import { Field } from "@/ui/field";
import { HobbySelector } from "@/components/HobbySelector";
import {
  CLEANLINESS_LEVELS,
  PERSONALITY_OPTIONS,
  SLEEP_OPTIONS,
  type ProfileFormState,
} from "./profileTypes";

interface ProfileHabitsCardProps {
  lookingForRoommate: boolean;
  sleepSchedule: string;
  personality: string;
  cleanliness: string;
  smoking: boolean;
  interests: string;
  onChange: <
    K extends
      | "looking_for_roommate"
      | "sleep_schedule"
      | "personality"
      | "cleanliness"
      | "smoking"
      | "interests"
  >(
    key: K,
    value: ProfileFormState[K]
  ) => void;
  errors: { interests?: string | undefined };
}

export function ProfileHabitsCard({
  lookingForRoommate,
  sleepSchedule,
  personality,
  cleanliness,
  smoking,
  interests,
  onChange,
  errors,
}: ProfileHabitsCardProps) {
  return (
    <div className="rounded-xl border border-line bg-card p-6 shadow-xs space-y-5">
      <div className="border-b border-line pb-3">
        <h2 className="text-base font-semibold text-ink">
          Thói quen sinh hoạt & Ghép phòng
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Dùng để phân tích độ tương thích khi ghép bạn cùng phòng bằng AI
        </p>
      </div>

      {/* Trạng thái tìm bạn cùng phòng */}
      <div className="flex items-center justify-between rounded-lg bg-tint/40 p-3">
        <div>
          <div className="text-sm font-semibold text-ink">Tìm bạn ở cùng phòng</div>
          <div className="text-xs text-muted">
            Hiển thị hồ sơ trên trợ lý tìm bạn cùng phòng AI
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={lookingForRoommate}
          onClick={() => {
            onChange("looking_for_roommate", !lookingForRoommate);
          }}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate ${
            lookingForRoommate ? "bg-moss" : "bg-sunken"
          }`}
        >
          <span
            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-xs transition duration-150 ease-in-out ${
              lookingForRoommate ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Giờ giấc ngủ */}
      <div>
        <div className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">
          Giờ giấc ngủ nghỉ
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SLEEP_OPTIONS.map((opt) => {
            const isSelected = sleepSchedule === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange("sleep_schedule", opt.value);
                }}
                className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition-all ${
                  isSelected
                    ? "border-plate bg-plate-tint text-plate font-semibold ring-1 ring-plate/25"
                    : "border-line bg-card text-ink-2 hover:bg-tint"
                }`}
              >
                <div>{opt.label}</div>
                <div className="text-[10px] text-muted opacity-80">{opt.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tính cách */}
      <div>
        <div className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">
          Tính cách
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PERSONALITY_OPTIONS.map((opt) => {
            const isSelected = personality === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange("personality", opt.value);
                }}
                className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition-all ${
                  isSelected
                    ? "border-plate bg-plate-tint text-plate font-semibold ring-1 ring-plate/25"
                    : "border-line bg-card text-ink-2 hover:bg-tint"
                }`}
              >
                <div>{opt.label}</div>
                <div className="text-[10px] text-muted opacity-80">{opt.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Độ sạch sẽ */}
      <div>
        <div className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">
          Độ sạch sẽ (1–5)
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {CLEANLINESS_LEVELS.map((lvl) => {
            const isSelected = cleanliness === String(lvl.level);
            return (
              <button
                key={lvl.level}
                type="button"
                onClick={() => {
                  onChange("cleanliness", String(lvl.level));
                }}
                className={`rounded-lg border py-2 text-center text-xs font-semibold transition-all ${
                  isSelected
                    ? "border-plate bg-plate text-white shadow-2xs"
                    : "border-line bg-card text-ink-2 hover:bg-tint"
                }`}
              >
                {lvl.level}
              </button>
            );
          })}
        </div>
        {cleanliness ? (
          <p className="mt-1.5 text-xs text-muted text-center">
            Mức {cleanliness}:{" "}
            <strong className="font-semibold text-ink">
              {CLEANLINESS_LEVELS.find((c) => String(c.level) === cleanliness)?.label}
            </strong>
          </p>
        ) : null}
      </div>

      {/* Hút thuốc */}
      <div>
        <div className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">
          Hút thuốc
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onChange("smoking", false);
            }}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
              !smoking
                ? "border-plate bg-plate-tint text-plate font-semibold ring-1 ring-plate/25"
                : "border-line bg-card text-ink-2 hover:bg-tint"
            }`}
          >
            Không hút thuốc
          </button>
          <button
            type="button"
            onClick={() => {
              onChange("smoking", true);
            }}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
              smoking
                ? "border-plate bg-plate-tint text-plate font-semibold ring-1 ring-plate/25"
                : "border-line bg-card text-ink-2 hover:bg-tint"
            }`}
          >
            Có hút thuốc
          </button>
        </div>
      </div>

      {/* Sở thích */}
      <Field
        id="p-interests"
        label="Sở thích & Lối sống"
        hint="Chọn sở thích để AI phân tích bạn cùng phòng có chung đam mê."
        error={errors.interests}
      >
        <HobbySelector
          value={interests}
          onChange={(val) => {
            onChange("interests", val);
          }}
        />
      </Field>
    </div>
  );
}
