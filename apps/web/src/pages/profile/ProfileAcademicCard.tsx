import type { School } from "@/types/api";
import { Field } from "@/ui/field";
import { Input } from "@/ui/input";
import { SchoolCombobox } from "@/components/SchoolCombobox";

interface ProfileAcademicCardProps {
  schools: School[];
  schoolId: string;
  budgetMin: string;
  budgetMax: string;
  budgetHint?: string;
  onChange: (
    key: "school_id" | "budget_min" | "budget_max",
    value: string
  ) => void;
  errors: {
    school_id?: string | undefined;
    budget_min?: string | undefined;
    budget_max?: string | undefined;
  };
}

export function ProfileAcademicCard({
  schools,
  schoolId,
  budgetMin,
  budgetMax,
  budgetHint,
  onChange,
  errors,
}: ProfileAcademicCardProps) {
  return (
    <div className="rounded-xl border border-line bg-card p-6 shadow-xs space-y-4">
      <h2 className="text-base font-semibold text-ink">Học tập & Ngân sách</h2>

      <Field
        id="p-school"
        label="Trường Đại học / Cao đẳng"
        hint="Tìm theo tên trường, viết tắt (VD: Bách Khoa, UET...) hoặc chọn theo khu vực"
        error={errors.school_id}
      >
        <SchoolCombobox
          schools={schools}
          value={schoolId}
          onChange={(id) => {
            onChange("school_id", id);
          }}
          error={errors.school_id}
        />
      </Field>

      <div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="p-budget-min"
            label="Ngân sách tối thiểu (VNĐ)"
            error={errors.budget_min}
          >
            <Input
              id="p-budget-min"
              type="number"
              min={0}
              step={100000}
              value={budgetMin}
              onChange={(e) => {
                onChange("budget_min", e.target.value);
              }}
              placeholder="1.500.000"
            />
          </Field>
          <Field
            id="p-budget-max"
            label="Ngân sách tối đa (VNĐ)"
            error={errors.budget_max}
          >
            <Input
              id="p-budget-max"
              type="number"
              min={0}
              step={100000}
              value={budgetMax}
              onChange={(e) => {
                onChange("budget_max", e.target.value);
              }}
              placeholder="3.000.000"
            />
          </Field>
        </div>
        {budgetHint ? (
          <p className="mt-2 text-xs text-muted">
            Khoảng dự kiến:{" "}
            <span className="font-semibold text-ink">{budgetHint}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
