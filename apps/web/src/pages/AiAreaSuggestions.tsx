import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { aiAreaSuggestions } from "@/api/aiApi";
import { errStatus } from "@/api/axiosClient";
import { getSchools } from "@/api/listingApi";
import type { AiAreaSuggestion, School } from "@/types/api";
import { Button } from "@/ui/button";
import { Field } from "@/ui/field";
import { Input } from "@/ui/input";
import { Chip } from "@/ui/badge";
import { EmptyState } from "@/ui/empty-state";
import { AiUnavailableIllustration } from "@/ui/icons";
import { ROUTES } from "@/constants/routes";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/context/AuthContext";

const PRIORITIES = [
  { value: "cheap", label: "Giá rẻ" },
  { value: "near_school", label: "Gần trường" },
  { value: "well_rated", label: "Đánh giá tốt" },
  { value: "many_options", label: "Nhiều lựa chọn" },
] as const;

export default function AiAreaSuggestions() {
  useDocumentTitle("Gợi ý khu vực · TROSV");
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState(
    user?.school_id != null ? String(user.school_id) : ""
  );
  const [min, setMin] = useState(
    user?.budget_min != null ? String(user.budget_min) : ""
  );
  const [max, setMax] = useState(
    user?.budget_max != null ? String(user.budget_max) : ""
  );
  const [picks, setPicks] = useState<string[]>([]);
  const [rows, setRows] = useState<AiAreaSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorState, setErrorState] = useState<"unavailable" | "input" | null>(null);

  useEffect(() => {
    getSchools().then(setSchools).catch(() => {});
  }, []);

  async function suggest(): Promise<void> {
    setBusy(true);
    setErrorState(null);
    try {
      const payload: Record<string, unknown> = {
        priorities: picks.length ? picks : undefined,
      };
      if (schoolId) payload["school_id"] = Number(schoolId);
      if (min) payload["budget_min"] = Number(min);
      if (max) payload["budget_max"] = Number(max);
      const list = await aiAreaSuggestions(payload);
      setRows(list);
    } catch (err) {
      if (errStatus(err) === 503) setErrorState("unavailable");
      else setErrorState("input");
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  const fmt = (vnd: number | undefined): string =>
    vnd == null
      ? ""
      : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(vnd / 1_000_000) + "tr";

  return (
    <div className="mx-auto max-w-4xl p-5 pb-16">
      <h1 className="text-3xl">Khu vực phù hợp</h1>
      <p className="mt-2 max-w-prose text-lg text-ink-2">
        Trợ lý AI gợi ý tối đa ba khu vực dựa trên ngân sách, trường học và thứ tự ưu tiên của bạn.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void suggest();
        }}
        className="mt-6 flex flex-col gap-4 rounded-xl border border-line bg-card p-6 shadow-xs"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="as-school" label="Trường">
            <select
              id="as-school"
              value={schoolId}
              onChange={(e) => { setSchoolId(e.target.value); }}
              className="h-11 w-full rounded-lg border border-line-strong bg-card text-ink px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate"
            >
              <option value="">Chưa chọn</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="as-min" label="Ngân sách tối thiểu">
            <Input
              id="as-min"
              type="number"
              min={0}
              value={min}
              onChange={(e) => { setMin(e.target.value); }}
              placeholder="1.500.000"
            />
          </Field>
          <Field id="as-max" label="Ngân sách tối đa">
            <Input
              id="as-max"
              type="number"
              min={0}
              value={max}
              onChange={(e) => { setMax(e.target.value); }}
              placeholder="3.000.000"
            />
          </Field>
        </div>
        <fieldset className="flex flex-wrap gap-2" aria-label="Ưu tiên">
          {PRIORITIES.map((p) => (
            <Chip
              key={p.value}
              on={picks.includes(p.value)}
              onClick={() => { setPicks((cur) =>
                  cur.includes(p.value)
                    ? cur.filter((v) => v !== p.value)
                    : [...cur, p.value]
                ); }
              }
              className="h-9 px-3 text-xs"
            >
              {p.label}
            </Chip>
          ))}
        </fieldset>
        <Button type="submit" variant="primary" loading={busy} className="sm:w-fit">
          Gợi ý khu vực
        </Button>
      </form>

      {busy || loading ? (
        <div className="mt-8 flex flex-col items-center gap-3" aria-live="polite">
          <div className="size-8 animate-spin rounded-full border-2 border-plate border-t-transparent" aria-hidden />
          <p className="text-sm text-muted">Trợ lý AI đang phân tích các khu vực…</p>
        </div>
      ) : errorState === "unavailable" ? (
        <EmptyState
          illustration={<AiUnavailableIllustration />}
          title="Trợ lý AI đang bận"
          description="Bạn thử lại sau ít phút nhé."
          action={<Button variant="outline" onClick={() => { location.reload(); }}>Thử lại</Button>}
          className="pt-10"
        />
      ) : errorState === "input" ? (
        <EmptyState
          title="Chưa đủ thông tin"
          description="Bạn chọn trường hoặc khoảng ngân sách rồi thử lại nhé."
          className="pt-10"
        />
      ) : rows ? (
        <div className="mt-8 flex flex-col gap-4">
          {rows.length === 0 ? (
            <EmptyState
              title="Chưa có gợi ý nào"
              description="Thử thêm trường hoặc nới khoảng ngân sách rồi chạy lại."
              className="pt-6"
            />
          ) : (
            rows.map((r, i) => (
              <div key={r.ward_id ?? i} className="rounded-xl border border-line bg-card p-5 shadow-xs hover:border-line-strong transition-colors">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-semibold text-ink">{r.name}</h2>
                  <p className="tabular-nums text-sm text-muted">
                    {r.stats?.avg_price != null ? `${fmt(r.stats.avg_price)}/tháng trung bình` : ""}
                    {r.stats?.avg_price != null && r.stats.distance_to_school_km != null ? " · " : ""}
                    {r.stats?.distance_to_school_km != null
                      ? `${r.stats.distance_to_school_km} km tới trường`
                      : ""}
                  </p>
                </div>
                <p className="mt-2 text-sm text-ink-2 leading-relaxed">{r.reason ?? ""}</p>
                <p className="mt-2 text-xs text-muted tabular-nums">
                  {r.stats?.listings_count != null
                    ? `${r.stats.listings_count} tin đăng`
                    : ""}
                </p>
                <div className="mt-3 flex justify-end">
                  <Button asChild size="sm" variant="primary">
                    <Link to={`${ROUTES.ROOMS}?ward_id=${r.ward_id ?? ""}`}>Xem phòng khu vực này</Link>
                  </Button>
                </div>
              </div>
            ))
          )}
          <p className="text-xs text-muted">Gợi ý tham khảo do AI tạo ra</p>
        </div>
      ) : null}
    </div>
  );
}
