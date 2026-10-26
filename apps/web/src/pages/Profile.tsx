import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { errFieldErrors, errMessage } from "@/api/axiosClient";
import { updateProfile } from "@/api/authApi";
import { getSchools } from "@/api/listingApi";
import type { School } from "@/types/api";
import { Button } from "@/ui/button";
import { Avatar } from "@/ui/avatar";
import { toast } from "@/ui/toast";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ROUTES, route } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import {
  formatVndPreview,
  getInitialForm,
  isFormDirty,
  type ProfileFormState,
} from "./profile/profileTypes";
import { ProfileBasicInfoCard } from "./profile/ProfileBasicInfoCard";
import { ProfileAcademicCard } from "./profile/ProfileAcademicCard";
import { ProfileHabitsCard } from "./profile/ProfileHabitsCard";

export default function Profile() {
  useDocumentTitle("Hồ sơ · TROSV");
  const { user, refreshUser } = useAuth();
  const isStudent = user?.role === "student";
  const initialForm = useMemo(() => (user ? getInitialForm(user) : null), [user]);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState("");

  const [lastUserId, setLastUserId] = useState<number | null>(null);
  if (user && (form === null || lastUserId !== user.id)) {
    setLastUserId(user.id);
    setForm(getInitialForm(user));
  }

  const isDirty = useMemo(
    () => isFormDirty(form, initialForm, isStudent),
    [form, initialForm, isStudent]
  );

  useEffect(() => {
    getSchools().then(setSchools).catch(() => {});
  }, []);

  const formValue = form;

  function set<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]): void {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function resetForm(): void {
    if (!initialForm) return;
    setForm({ ...initialForm });
    setFieldErrors({});
    setFormError("");
    toast("Đã khôi phục thông tin ban đầu.");
  }

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!formValue || !isDirty || busy) return;
    setBusy(true);
    setFieldErrors({});
    setFormError("");

    const payload: Record<string, unknown> = {
      name: formValue.name.trim(),
      phone: formValue.phone.trim() || null,
      bio: formValue.bio.trim() || null,
    };

    if (isStudent) {
      if (formValue.school_id) payload["school_id"] = Number(formValue.school_id);
      payload["budget_min"] = formValue.budget_min ? Number(formValue.budget_min) : null;
      payload["budget_max"] = formValue.budget_max ? Number(formValue.budget_max) : null;
      payload["sleep_schedule"] = formValue.sleep_schedule || null;
      payload["cleanliness"] = formValue.cleanliness ? Number(formValue.cleanliness) : null;
      payload["smoking"] = formValue.smoking;
      payload["personality"] = formValue.personality || null;
      payload["interests"] = formValue.interests.trim() || null;
      payload["looking_for_roommate"] = formValue.looking_for_roommate;
    }

    try {
      await updateProfile(payload);
      await refreshUser();
      toast("Đã lưu hồ sơ.");
    } catch (err) {
      setFieldErrors(errFieldErrors(err));
      setFormError(errMessage(err, "Không lưu được hồ sơ. Bạn thử lại nhé."));
    } finally {
      setBusy(false);
    }
  }

  if (!user || !formValue) return null;

  const minText = formValue.budget_min ? formatVndPreview(formValue.budget_min) : "";
  const maxText = formValue.budget_max ? formatVndPreview(formValue.budget_max) : "";
  const budgetHint =
    minText && maxText
      ? `${minText} – ${maxText} / tháng`
      : minText
      ? `Từ ${minText} / tháng`
      : maxText
      ? `Đến ${maxText} / tháng`
      : "";

  const err = (field: string): string | undefined => fieldErrors[field]?.[0];

  return (
    <div className={cn("mx-auto px-4 py-8 sm:px-6 lg:px-8", isStudent ? "max-w-6xl" : "max-w-2xl")}>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size={64} />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-ink font-display">
                {user.name}
              </h1>
              <span className="rounded-full bg-plate-tint px-2.5 py-0.5 text-xs font-semibold text-plate">
                {isStudent ? "Sinh viên" : "Chủ nhà"}
              </span>
            </div>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </div>

        {isStudent ? (
          <Button asChild variant="outline" size="sm" className="self-start sm:self-auto gap-1.5">
            <Link to={route(ROUTES.STUDENT_PUBLIC, { id: user.id })}>
              <span>Xem trang cá nhân công khai</span>
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>

      <form onSubmit={(e) => { void save(e); }} className="space-y-6">
        {formError ? (
          <p role="alert" className="rounded-xl border border-danger/20 bg-danger-tint p-3 text-sm text-danger">
            {formError}
          </p>
        ) : null}

        {isStudent ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
            {/* Cột trái: Thông tin cơ bản + Học tập & Ngân sách */}
            <div className="space-y-6 lg:col-span-5">
              <ProfileBasicInfoCard
                name={formValue.name}
                phone={formValue.phone}
                bio={formValue.bio}
                onChange={set}
                errors={{ name: err("name"), phone: err("phone"), bio: err("bio") }}
                bioPlaceholder="Ví dụ: Sinh viên năm 2, hòa đồng, thích giữ phòng sạch sẽ..."
                bioRows={4}
              />

              <ProfileAcademicCard
                schools={schools}
                schoolId={formValue.school_id}
                budgetMin={formValue.budget_min}
                budgetMax={formValue.budget_max}
                budgetHint={budgetHint}
                onChange={set}
                errors={{
                  school_id: err("school_id"),
                  budget_min: err("budget_min"),
                  budget_max: err("budget_max"),
                }}
              />
            </div>

            {/* Cột phải: Thói quen sinh hoạt & Ghép phòng */}
            <div className="space-y-6 lg:col-span-7">
              <ProfileHabitsCard
                lookingForRoommate={formValue.looking_for_roommate}
                sleepSchedule={formValue.sleep_schedule}
                personality={formValue.personality}
                cleanliness={formValue.cleanliness}
                smoking={formValue.smoking}
                interests={formValue.interests}
                onChange={set}
                errors={{ interests: err("interests") }}
              />
            </div>
          </div>
        ) : (
          /* Landlord view */
          <div className="mx-auto max-w-2xl">
            <ProfileBasicInfoCard
              name={formValue.name}
              phone={formValue.phone}
              bio={formValue.bio}
              onChange={set}
              errors={{ name: err("name"), phone: err("phone"), bio: err("bio") }}
              bioPlaceholder="Ví dụ: Chủ nhà thân thiện, phòng trọ an ninh, giờ giấc tự do..."
              bioRows={3}
            />
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center justify-between pt-4 border-t border-line">
          {isDirty ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetForm}
              disabled={busy}
            >
              Khôi phục
            </Button>
          ) : <div />}

          <Button
            id="profile-submit-btn"
            type="submit"
            variant="primary"
            loading={busy}
            disabled={!isDirty || busy}
          >
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </div>
  );
}
