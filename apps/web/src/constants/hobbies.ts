export interface HobbyItem {
  key: string;
  label: string;
  icon?: string;
}

export const HOBBY_LIST: HobbyItem[] = [
  { key: "music", label: "Âm nhạc" },
  { key: "gym", label: "Gym & Thể thao" },
  { key: "reading", label: "Đọc sách" },
  { key: "gaming", label: "Chơi game" },
  { key: "cooking", label: "Nấu ăn" },
  { key: "photography", label: "Chụp ảnh" },
  { key: "football", label: "Bóng đá" },
  { key: "studying", label: "Học tập" },
  { key: "movies", label: "Xem phim" },
  { key: "travel", label: "Du lịch" },
  { key: "badminton", label: "Cầu lông" },
  { key: "cafés", label: "Cà phê" },
  { key: "coding", label: "Lập trình" },
  { key: "art", label: "Hội họa" },
  { key: "pets", label: "Thú cưng" },
];
export const HOBBY_MAP: Record<string, HobbyItem> = Object.fromEntries(
  HOBBY_LIST.map((h) => [h.key, h])
);

/**
 * Format một key sở thích thành object { key, label, icon }.
 * Hỗ trợ cả key định sẵn và custom tags do người dùng tự nhập.
 */
export function formatHobby(key: string): HobbyItem {
  const normalized = key.trim().toLowerCase();
  if (HOBBY_MAP[normalized]) {
    return HOBBY_MAP[normalized];
  }
  const capitalized = key.trim().charAt(0).toUpperCase() + key.trim().slice(1);
  return {
    key: key.trim(),
    label: capitalized,
    icon: "",
  };
}

/**
 * Phân tích chuỗi CSV hoặc mảng thành mảng HobbyItem { key, label, icon }
 */
export function parseHobbies(
  interests: string | string[] | null | undefined
): HobbyItem[] {
  if (!interests) return [];
  const rawList = Array.isArray(interests)
    ? interests
    : interests.split(",").map((s) => s.trim());

  return rawList
    .map((s) => s.trim())
    .filter(Boolean)
    .map(formatHobby);
}
