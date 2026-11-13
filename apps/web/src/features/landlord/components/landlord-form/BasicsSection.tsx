import { Field } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { SELECT, SECTION } from "./styles";
import type { ListingFormApi } from "./types";

const TYPE_OPTIONS = [
  { value: "room", label: "Phòng trọ" },
  { value: "apartment", label: "Căn hộ" },
  { value: "house", label: "Nhà nguyên căn" },
] as const;

/** Title, type, price and area (the address lives in the location step). */
export function BasicsSection({ form: f }: { form: ListingFormApi }) {
  const err = (field: string): string | undefined => f.errors[field]?.[0];

  return (
    <section className={SECTION}>
      <h2 className="text-xl font-semibold">Thông tin chính</h2>
      <Field id="lf-title" label="Tiêu đề" hint="5–200 ký tự" error={err("title")} required>
        <Input id="lf-title" value={f.form.title} onChange={f.set("title")} maxLength={200} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="lf-type" label="Loại tin" error={err("type")} required>
          <select id="lf-type" value={f.form.type} onChange={f.set("type")} className={SELECT}>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="lf-price" label="Giá mỗi tháng (VND)" error={err("price")} required>
          <Input
            id="lf-price"
            type="number"
            min={100000}
            max={100000000}
            value={String(f.form.price)}
            onChange={f.set("price")}
            placeholder="2500000"
            className="tabular-nums"
          />
        </Field>
        <Field id="lf-area" label="Diện tích (m²)" error={err("area_m2")} required>
          <Input
            id="lf-area"
            type="number"
            min={5}
            max={1000}
            value={String(f.form.area_m2)}
            onChange={f.set("area_m2")}
            className="tabular-nums"
          />
        </Field>
      </div>
    </section>
  );
}
