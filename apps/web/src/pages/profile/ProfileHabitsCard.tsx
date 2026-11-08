import { PERSONALITY_OPTIONS, SLEEP_OPTIONS, type ProfileFormState } from "./profileTypes";
import { CleanlinessSlider } from "./habits/CleanlinessSlider";
import { HobbySummary } from "./habits/HobbySummary";
import { OptionSelect } from "./habits/OptionSelect";
import { SwitchRow } from "./habits/SwitchRow";

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
      | "interests",
  >(
    key: K,
    value: ProfileFormState[K],
  ) => void;
  errors: { interests?: string | undefined };
}

/*
  Roommate-matching preferences, kept light: one switch to opt in, two
  dropdowns, a slider and a switch. Hobbies show as a short summary; the full
  picker opens in a dialog on request. When matching is off the details hide.
*/
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
    <div className="space-y-5">
      <SwitchRow
        strong
        title="Tìm bạn ở cùng phòng"
        description="Hiển thị hồ sơ của bạn cho trợ lý ghép bạn cùng phòng AI"
        checked={lookingForRoommate}
        onChange={(next) => {
          onChange("looking_for_roommate", next);
        }}
      />

      {lookingForRoommate ? (
        <div className="space-y-5 border-t border-line pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <OptionSelect
              id="p-sleep"
              label="Giờ giấc ngủ"
              value={sleepSchedule}
              options={SLEEP_OPTIONS}
              onChange={(value) => {
                onChange("sleep_schedule", value);
              }}
            />
            <OptionSelect
              id="p-personality"
              label="Tính cách"
              value={personality}
              options={PERSONALITY_OPTIONS}
              onChange={(value) => {
                onChange("personality", value);
              }}
            />
          </div>

          <CleanlinessSlider
            value={cleanliness}
            onChange={(value) => {
              onChange("cleanliness", value);
            }}
          />

          <SwitchRow
            title="Hút thuốc"
            description="Bạn có hút thuốc trong phòng không?"
            checked={smoking}
            onChange={(next) => {
              onChange("smoking", next);
            }}
          />

          <HobbySummary
            interests={interests}
            error={errors.interests}
            onChange={(value) => {
              onChange("interests", value);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
