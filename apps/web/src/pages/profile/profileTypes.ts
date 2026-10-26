import type { User } from "@/types/api";

export const SLEEP_OPTIONS = [
  { value: "early", label: "Ngủ sớm", sub: "Trước 23:00" },
  { value: "normal", label: "Bình thường", sub: "23:00 – 00:00" },
  { value: "late", label: "Cú đêm", sub: "Sau 00:00" },
] as const;

export const PERSONALITY_OPTIONS = [
  { value: "introvert", label: "Hướng nội", sub: "Yên tĩnh" },
  { value: "ambivert", label: "Trung tính", sub: "Cân bằng" },
  { value: "extrovert", label: "Hướng ngoại", sub: "Hòa đồng" },
] as const;

export const CLEANLINESS_LEVELS = [
  { level: 1, label: "Thoải mái" },
  { level: 2, label: "Vừa phải" },
  { level: 3, label: "Tiêu chuẩn" },
  { level: 4, label: "Gọn gàng" },
  { level: 5, label: "Rất kỹ tính" },
] as const;

export interface ProfileFormState {
  name: string;
  phone: string;
  bio: string;
  school_id: string;
  budget_min: string;
  budget_max: string;
  sleep_schedule: string;
  cleanliness: string;
  smoking: boolean;
  personality: string;
  interests: string;
  looking_for_roommate: boolean;
}

export function getInitialForm(user: User): ProfileFormState {
  return {
    name: user.name,
    phone: user.phone ?? "",
    bio: user.bio ?? "",
    school_id: user.school_id != null ? String(user.school_id) : "",
    budget_min: user.budget_min != null ? String(user.budget_min) : "",
    budget_max: user.budget_max != null ? String(user.budget_max) : "",
    sleep_schedule: user.sleep_schedule ?? "",
    cleanliness: user.cleanliness != null ? String(user.cleanliness) : "",
    smoking: user.smoking === true,
    personality: user.personality ?? "",
    interests: user.interests ?? "",
    looking_for_roommate: user.looking_for_roommate === true,
  };
}

export function isFormDirty(
  current: ProfileFormState | null,
  initial: ProfileFormState | null,
  isStudent: boolean
): boolean {
  if (!current || !initial) return false;

  if (current.name.trim() !== initial.name.trim()) return true;
  if (current.phone.trim() !== initial.phone.trim()) return true;
  if (current.bio.trim() !== initial.bio.trim()) return true;

  if (isStudent) {
    if (current.school_id !== initial.school_id) return true;
    if (current.budget_min !== initial.budget_min) return true;
    if (current.budget_max !== initial.budget_max) return true;
    if (current.sleep_schedule !== initial.sleep_schedule) return true;
    if (current.cleanliness !== initial.cleanliness) return true;
    if (current.smoking !== initial.smoking) return true;
    if (current.personality !== initial.personality) return true;
    if (current.interests.trim() !== initial.interests.trim()) return true;
    if (current.looking_for_roommate !== initial.looking_for_roommate) return true;
  }

  return false;
}

export function formatVndPreview(val: string): string {
  if (!val) return "";
  const n = parseInt(val.replace(/\D/g, ""), 10);
  if (isNaN(n) || n <= 0) return "";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}
