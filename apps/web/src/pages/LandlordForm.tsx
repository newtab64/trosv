import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ROUTES, route } from "@/constants/routes";
import { useListingForm } from "@/hooks/useListingForm";
import { Button } from "@/ui/button";
import { Field } from "@/ui/field";
import { Input, Textarea } from "@/ui/input";
import { Tag } from "@/ui/badge";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Trash2, MapPin, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "@/ui/toast";

const TYPE_OPTIONS = [
  { value: "room", label: "Phòng trọ" },
  { value: "apartment", label: "Căn hộ" },
  { value: "house", label: "Nhà nguyên căn" },
] as const;

const STATUS_OPTIONS = [
  { value: "available", label: "Còn trống" },
  { value: "rented", label: "Đã thuê" },
  { value: "hidden", label: "Ẩn" },
] as const;

interface CoordinatePickerProps {
  lat: number | string;
  lng: number | string;
  onPick: (lat: number, lng: number) => void;
}

export default function LandlordForm() {
  const { id } = useParams();
  const numericId = id != null && id !== "new" ? Number(id) : undefined;
  const toastLike = {
    success: (m: string) => toast(m),
    error: (m: string) => toast(m),
  };
  useDocumentTitle(
    numericId != null ? "Sửa tin đăng · TROSV" : "Đăng tin mới · TROSV"
  );
  const form7 = useListingForm(numericId, toastLike);
  const navigate = useNavigate();

  /* Drag-and-drop images (max 5, 2MB each, first is the cover). */
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const err = (field: string): string | undefined => form7.errors[field]?.[0];

  function acceptFiles(files: File[]): void {
    const e = {
      target: { files, value: "" },
    } as unknown as ChangeEvent<HTMLInputElement>;
    form7.handleFilePick(e);
  }

  const cityChanged = (value: string): void => {
    form7.set("city_id")({ target: { value } } as ChangeEvent<HTMLSelectElement>);
    /* Reset ward when the city changes (cascade). */
    form7.set("ward_id")({ target: { value: "" } } as ChangeEvent<HTMLSelectElement>);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-4 sm:p-6 lg:p-8 pb-16">
      <div className="mb-6 flex flex-col gap-2">
        <Link
          to={ROUTES.LANDLORD}
          className={
            "inline-flex items-center gap-1.5 text-sm font-medium text-muted " +
            "hover:text-ink transition-colors w-fit"
          }
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span>Quay lại Quản lý tin đăng</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
          {form7.isEdit ? "Sửa tin đăng" : "Đăng tin mới"}
        </h1>
        <p className="text-sm text-muted">
          {form7.isEdit
            ? "Cập nhật thông tin phòng trọ, giá cả và tiện ích của bạn."
            : "Điền thông tin chi tiết về phòng trọ để thu hút sinh viên tìm phòng."}
        </p>
      </div>

      {form7.notice ? (
        <p role="alert" className="mb-6 rounded-xl bg-plate-tint p-4 text-sm text-ink border border-plate/20">
          {form7.notice}
        </p>
      ) : null}

      <form
        onSubmit={(e: FormEvent) => void form7.handleSubmit(e, navigate)}
        className="flex flex-col gap-6"
      >
        {/* Section 1: basics */}
        <section className="flex flex-col gap-4 rounded-xl border border-line bg-card p-6">
          <h2 className="text-xl font-semibold">Thông tin chính</h2>
          <Field id="lf-title" label="Tiêu đề" hint="5–200 ký tự" error={err("title")} required>
            <Input
              id="lf-title"
              value={form7.form.title}
              onChange={form7.set("title")}
              maxLength={200}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="lf-type" label="Loại tin" error={err("type")} required>
              <select
                id="lf-type"
                value={form7.form.type}
                onChange={form7.set("type")}
                className="h-12 w-full rounded-xl border border-line-strong bg-card text-ink px-4 text-base"
              >
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
                value={String(form7.form.price)}
                onChange={form7.set("price")}
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
                value={String(form7.form.area_m2)}
                onChange={form7.set("area_m2")}
                className="tabular-nums"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="lf-city" label="Tỉnh/TP" error={err("city_id")}>
              <select
                id="lf-city"
                value={String(form7.form.city_id)}
                onChange={(e) => { cityChanged(e.target.value); }}
                className="h-12 w-full rounded-xl border border-line-strong bg-card text-ink px-4 text-base"
              >
                <option value="">Chọn tỉnh/thành phố</option>
                {form7.cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="lf-ward" label="Phường" error={err("ward_id")} required>
              <select
                id="lf-ward"
                value={String(form7.form.ward_id)}
                onChange={form7.set("ward_id")}
                className="h-12 w-full rounded-xl border border-line-strong bg-card text-ink px-4 text-base"
                disabled={!form7.form.city_id}
              >
                <option value="">
                  {form7.form.city_id ? "Chọn phường" : "Chọn tỉnh/TP trước"}
                </option>
                {form7.wards
                  .filter((w) => String(w.city?.id ?? w.city_id) === String(form7.form.city_id))
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
          <Field id="lf-address" label="Địa chỉ" error={err("address")} required>
            <Input
              id="lf-address"
              value={form7.form.address}
              onChange={form7.set("address")}
              placeholder="12 Đường số 5"
            />
          </Field>
        </section>

        {/* Section 2: location on map */}
        <section className="flex flex-col gap-4 rounded-xl border border-line bg-card p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <MapPin className="size-5" aria-hidden /> Vị trí trên bản đồ
          </h2>
          <p className="text-sm text-muted">
            Chọn điểm trên bản đồ để điền kinh độ, vĩ độ (dùng khi lọc gần trường).
          </p>
          <div className="h-64 overflow-hidden rounded-xl border border-line">
            <CoordinatePicker
              lat={form7.form.latitude}
              lng={form7.form.longitude}
              onPick={(lat, lng) => {
                form7.setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
              }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="lf-lat" label="Vĩ độ" error={err("latitude")} required>
              <Input
                id="lf-lat"
                type="number"
                step="any"
                value={String(form7.form.latitude)}
                onChange={form7.set("latitude")}
                className="tabular-nums"
              />
            </Field>
            <Field id="lf-lng" label="Kinh độ" error={err("longitude")} required>
              <Input
                id="lf-lng"
                type="number"
                step="any"
                value={String(form7.form.longitude)}
                onChange={form7.set("longitude")}
                className="tabular-nums"
              />
            </Field>
          </div>
        </section>

        {/* Section 3: description + AI + amenities */}
        <section className="flex flex-col gap-4 rounded-xl border border-line bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Mô tả</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={form7.aiBusy}
              onClick={() => void form7.generateDescription()}
            >
              <Sparkles className="size-4" aria-hidden /> Viết mô tả giúp tôi
            </Button>
          </div>
          <Field id="lf-desc" label="Mô tả" hint="Không bắt buộc" error={err("description")}>
            <Textarea
              id="lf-desc"
              rows={5}
              value={form7.form.description}
              onChange={form7.set("description")}
            />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink">Tiện ích</legend>
            <div className="flex flex-wrap gap-2">
              {form7.amenities.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { form7.toggleAmenity(a.id); }}
                  aria-pressed={form7.form.amenity_ids.includes(a.id)}
                  className={cn(
                    "cursor-pointer whitespace-nowrap rounded-full border px-3 py-1.5",
                    "text-xs font-medium transition-colors",
                    form7.form.amenity_ids.includes(a.id)
                      ? "border-plate bg-plate font-semibold text-white shadow-xs"
                      : "border-line-strong bg-card text-ink hover:bg-tint"
                  )}
                >
                  {a.name ?? `Tiện ích ${a.id}`}
                </button>
              ))}
            </div>
          </fieldset>
          {form7.isEdit ? (
            <Field id="lf-status" label="Trạng thái">
              <select
                id="lf-status"
                value={form7.form.status}
                onChange={form7.set("status")}
                className="h-12 w-full rounded-xl border border-line-strong bg-card text-ink px-4 text-base"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </section>

        {/* Section 4: images (edit mode: existing images + delete) */}
        {form7.isEdit ? (
          <section className="flex flex-col gap-4 rounded-xl border border-line bg-card p-6">
            <h2 className="text-xl font-semibold">Ảnh tin đăng</h2>
            {form7.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {form7.images.map((img, i) => (
                  <div key={img.id} className="group relative overflow-hidden rounded-xl bg-sunken">
                    <img src={img.url} alt="" width={200} height={133} className="aspect-3/2 w-full object-cover" />
                    {i === 0 ? (
                      <span className="absolute left-1 top-1">
                        <Tag>Ảnh bìa</Tag>
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void form7.handleDeleteImage(img.id)}
                      aria-label={`Xóa ảnh ${i + 1}`}
                      className={
                        "absolute right-1 top-1 flex size-7 items-center justify-center " +
                        "rounded-full bg-card/90 text-ink opacity-0 transition-opacity " +
                        "group-hover:opacity-100 focus-visible:opacity-100"
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Section 5 (create): pick new images via drag & drop */}
        <section className="flex flex-col gap-3 rounded-xl border border-line bg-card p-6">
          <h2 className="text-xl font-semibold">Ảnh</h2>
          <div
            onDragOver={(e: DragEvent) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => { setDragOver(false); }}
            onDrop={(e: DragEvent) => {
              e.preventDefault();
              setDragOver(false);
              const files = Array.from(e.dataTransfer.files).filter((f) =>
                f.type.startsWith("image/")
              );
              acceptFiles(files);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl",
              "border-2 border-dashed p-8 text-center transition-colors",
              dragOver ? "border-plate bg-plate-tint/50" : "border-line-strong bg-tint"
            )}
            onClick={() => fileInput.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInput.current?.click();
            }}
            aria-label="Chọn hoặc kéo thả ảnh"
          >
            <p className="text-sm font-medium text-ink">Kéo thả ảnh vào đây, hoặc bấm để chọn</p>
            <p className="text-xs text-muted">JPG, PNG hoặc WebP · tối đa 5 ảnh · mỗi ảnh 2 MB</p>
            {form7.newFiles.length > 0 ? (
              <p className="text-xs text-ink-2 tabular-nums">
                Đã chọn {form7.newFiles.length} ảnh (ảnh đầu tiên là ảnh bìa)
              </p>
            ) : null}
          </div>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={form7.handleFilePick}
          />
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              const target = form7.isEdit
                ? route(ROUTES.LANDLORD_EDIT, { id: numericId ?? 0 })
                : ROUTES.LANDLORD;
              void navigate(target);
            }}
          >
            Hủy
          </Button>
          <Button type="submit" variant="primary" loading={form7.busy}>
            {form7.isEdit ? "Lưu thay đổi" : "Đăng tin"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* Map click → coordinates: lightweight wrapper over ListingMap's map. */
function CoordinatePicker({ lat, lng, onPick }: CoordinatePickerProps) {
  return (
    <div className="relative h-full w-full" data-testid="coordinate-picker">
      <ListingMapBridge onPick={onPick} />
      <p
        className={
          "absolute left-2 top-2 rounded-lg bg-card/90 px-2 py-1 text-xs " +
          "tabular-nums text-ink border border-line"
        }
      >
        {lat || "—"}, {lng || "—"}
      </p>
    </div>
  );
}

/* Lazily loads a click-to-pick map; keeps the coordinate logic isolated. */
function ListingMapBridge({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mapInstance: L.Map | null = null;
    let active = true;
    const el = containerRef.current;

    void import("leaflet").then((Lm) => {
      if (!active || !el) return;
      if ((el as unknown as { _map?: L.Map })._map) {
        (el as unknown as { _map?: L.Map })._map?.remove();
      }
      const map = Lm.map(el).setView([16.0471, 108.2068], 5);
      mapInstance = map;
      (el as unknown as { _map?: L.Map })._map = map;
      const marker = Lm.marker([16.0471, 108.2068]);
      map.on("click", (e) => {
        marker.setLatLng(e.latlng).addTo(map);
        onPick(e.latlng.lat, e.latlng.lng);
      });
    });

    return () => {
      active = false;
      if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
      }
      if (el) {
        delete (el as unknown as { _map?: unknown })._map;
      }
    };
  }, [onPick]);

  return <div ref={containerRef} className="h-full w-full" />;
}
