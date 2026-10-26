import { Field } from "@/ui/field";
import { Input, Textarea } from "@/ui/input";

interface ProfileBasicInfoCardProps {
  name: string;
  phone: string;
  bio: string;
  onChange: (key: "name" | "phone" | "bio", value: string) => void;
  errors: { name?: string | undefined; phone?: string | undefined; bio?: string | undefined };
  bioPlaceholder?: string;
  bioRows?: number;
}

export function ProfileBasicInfoCard({
  name,
  phone,
  bio,
  onChange,
  errors,
  bioPlaceholder = "Ví dụ: Sinh viên năm 2, hòa đồng, thích giữ phòng sạch sẽ...",
  bioRows = 4,
}: ProfileBasicInfoCardProps) {
  return (
    <div className="rounded-xl border border-line bg-card p-6 shadow-xs space-y-4">
      <h2 className="text-base font-semibold text-ink">Thông tin cơ bản</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="p-name" label="Tên" error={errors.name} required>
          <Input
            id="p-name"
            value={name}
            onChange={(e) => {
              onChange("name", e.target.value);
            }}
          />
        </Field>
        <Field id="p-phone" label="Số điện thoại" error={errors.phone}>
          <Input
            id="p-phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              onChange("phone", e.target.value);
            }}
            placeholder="0901234567"
          />
        </Field>
      </div>

      <Field
        id="p-bio"
        label="Giới thiệu bản thân"
        hint="Một vài dòng để người khác hiểu về bạn"
        error={errors.bio}
      >
        <Textarea
          id="p-bio"
          value={bio}
          onChange={(e) => {
            onChange("bio", e.target.value);
          }}
          rows={bioRows}
          placeholder={bioPlaceholder}
        />
      </Field>
    </div>
  );
}
