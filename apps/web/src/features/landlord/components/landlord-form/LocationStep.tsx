import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { Field } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { AddressSearch } from "./AddressSearch";
import { CoordinatePicker } from "./CoordinatePicker";
import { SECTION, SELECT } from "./styles";
import type { ListingFormApi } from "./types";

/** The two number fields behind "Nhập tọa độ thủ công". */
function ManualCoordinates({ form: f }: { form: ListingFormApi }) {
  const err = (field: string): string | undefined => f.errors[field]?.[0];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="lf-lat" label="Vĩ độ" error={err("latitude")} required>
        <Input
          id="lf-lat"
          type="number"
          step="any"
          value={String(f.form.latitude)}
          onChange={f.set("latitude")}
          className="tabular-nums"
        />
      </Field>
      <Field id="lf-lng" label="Kinh độ" error={err("longitude")} required>
        <Input
          id="lf-lng"
          type="number"
          step="any"
          value={String(f.form.longitude)}
          onChange={f.set("longitude")}
          className="tabular-nums"
        />
      </Field>
    </div>
  );
}

/** A coordinate with at most 5 decimals (about a metre), without trailing zeros. */
const shortCoord = (v: number | string): string => String(Number(Number(v).toFixed(5)));

/** Step 1: find the address, check the pin on the map, and fix the city, ward and address line. */
export function LocationStep({ form: f }: { form: ListingFormApi }) {
  const [manual, setManual] = useState(false);
  const err = (field: string): string | undefined => f.errors[field]?.[0];
  const cityId = String(f.form.city_id);
  const wards = f.wards.filter((w) => String(w.city?.id ?? w.city_id) === cityId);
  const hasPin = f.form.latitude !== "" && f.form.longitude !== "";
  const pinError = err("latitude") ?? err("longitude");

  return (
    <section className={SECTION}>
      <h2 className="text-xl font-semibold">Phòng ở đâu?</h2>
      <AddressSearch onPick={f.applySuggestion} />

      <div className="h-[230px] overflow-hidden rounded-xl border border-line">
        <CoordinatePicker lat={f.form.latitude} lng={f.form.longitude} onPick={f.setCoordinates} />
      </div>
      {pinError ? (
        <p role="alert" className="-mt-2 text-xs text-danger">
          {pinError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">Kéo ghim để chỉnh cho đúng cửa nhà.</p>
        <button
          type="button"
          onClick={() => void f.locateMe()}
          disabled={f.locating}
          className={
            "inline-flex items-center gap-1.5 text-sm font-semibold text-plate " +
            "hover:underline disabled:cursor-wait disabled:opacity-60 disabled:no-underline"
          }
        >
          <LocateFixed className="size-4" aria-hidden />{" "}
          {f.locating ? "Đang lấy vị trí…" : "Dùng vị trí hiện tại"}
        </button>
      </div>
      {f.locateError ? <p className="text-sm text-danger">{f.locateError}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="lf-city" label="Tỉnh/TP" error={err("city_id")}>
          <select
            id="lf-city"
            value={cityId}
            onChange={(e) => {
              f.changeCity(e.target.value);
            }}
            className={SELECT}
          >
            <option value="">Chọn tỉnh/thành phố</option>
            {f.cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="lf-ward" label="Phường" error={err("ward_id")} required>
          <select
            id="lf-ward"
            value={String(f.form.ward_id)}
            onChange={f.set("ward_id")}
            className={SELECT}
            disabled={!f.form.city_id}
          >
            <option value="">{f.form.city_id ? "Chọn phường" : "Chọn tỉnh/TP trước"}</option>
            {wards.map((w) => (
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
          value={f.form.address}
          onChange={f.set("address")}
          placeholder="12 Đường số 5"
        />
      </Field>
      {f.autofilled ? (
        <p className="-mt-2 text-xs text-muted">
          Đã tự điền từ địa chỉ bạn chọn. Bạn vẫn sửa được.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
        <span className="tabular-nums">
          {hasPin
            ? `${shortCoord(f.form.latitude)}, ${shortCoord(f.form.longitude)}`
            : "Chưa chọn vị trí"}
        </span>
        <span aria-hidden>·</span>
        <button
          type="button"
          onClick={() => {
            setManual((m) => !m);
          }}
          className="font-semibold text-plate hover:underline"
        >
          Nhập tọa độ thủ công
        </button>
      </div>
      {manual ? <ManualCoordinates form={f} /> : null}
    </section>
  );
}
