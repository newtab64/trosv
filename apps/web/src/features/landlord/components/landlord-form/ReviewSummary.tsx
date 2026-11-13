import { formatVnd } from "@/shared/lib/format";
import { useObjectUrls } from "../../hooks/useObjectUrls";
import type { ListingFormApi } from "./types";

/** The last look before posting: cover photo, title, price, area, ward and photo count. */
export function ReviewSummary({ form: f }: { form: ListingFormApi }) {
  const urls = useObjectUrls(f.newFiles);
  const existing = f.isEdit ? f.images : [];
  const cover = existing[0]?.url ?? urls[0];
  const ward = f.wards.find((w) => String(w.id) === String(f.form.ward_id));
  const where = ward ? [ward.name, ward.city?.name].filter(Boolean).join(", ") : "";
  const photos = existing.length + f.newFiles.length;
  const price = f.form.price === "" ? "" : `${formatVnd(Number(f.form.price))}/tháng`;
  const facts = [
    price,
    f.form.area_m2 === "" ? "" : `${String(f.form.area_m2)} m²`,
    where,
    `${String(photos)} ảnh`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-4">
      <p className="text-sm font-medium text-ink">Xem lại trước khi đăng</p>
      <div className="grid grid-cols-[96px_1fr] items-center gap-3 rounded-xl border border-line bg-paper p-2.5">
        <div className="aspect-3/2 overflow-hidden rounded-lg bg-sunken">
          {cover ? <img src={cover} alt="" className="size-full object-cover" /> : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {f.form.title.trim() || "Chưa có tiêu đề"}
          </p>
          <p className="text-xs text-muted">{facts}</p>
        </div>
      </div>
    </div>
  );
}
