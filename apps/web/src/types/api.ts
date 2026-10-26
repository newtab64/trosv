/**
 * Shared API types - mirror docs/contracts/API_CONTRACT.md (backend resources).
 * Giu dong bo: khi backend them field, cap nhat o day + docs/contracts/API_CONTRACT.md.
 */

export type UserRole = "student" | "landlord";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  gender?: string;
  dob?: string;
  avatar_url?: string | null;
  school?: string | null;
  hobby?: string[] | null;
  /** Ho so sinh vien (Profile/AreaSuggestions). */
  bio?: string | null;
  school_id?: number | string | null;
  budget_min?: number | string | null;
  budget_max?: number | string | null;
  sleep_schedule?: string | null;
  cleanliness?: number | string | null;
  smoking?: boolean;
  personality?: string | null;
  interests?: string | null;
  looking_for_roommate?: boolean;
}

export interface City {
  id: number;
  name: string;
  slug?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Review {
  id: number;
  user_id: number;
  user_name?: string;
  rating: number;
  comment?: string;
  created_at?: string;
  /** Review 2 chieu cua RoomDetail. */
  student?: { id: number; name: string } | null;
  listing_rating?: number;
  landlord_rating?: number;
}

export interface ListingImage {
  id: number;
  url: string;
  path?: string;
}

export interface Ward {
  id: number;
  name: string;
  /* API returns city as a nested object (city_id is not serialized). */
  city_id?: number;
  city?: { id: number; name: string };
  latitude?: number | null;
  longitude?: number | null;
}

export interface School {
  id: number;
  name: string;
  /* API returns city as a nested object (city_id is not serialized). */
  city_id?: number;
  city?: { id: number; name: string };
  latitude?: number | null;
  longitude?: number | null;
  /** Phường chứa trường (null với trường chưa gán) - API_CONTRACT §4. */
  ward?: { id: number; name: string } | null;
}

export interface Amenity {
  id: number;
  name?: string;
}

export interface Listing {
  id: number;
  landlord_id: number;
  landlord_name?: string;
  title: string;
  description?: string;
  price: number;
  /** Dien tich (m2) - backend dung field area_m2. */
  area_m2?: number;
  address: string;
  city_id?: number;
  city_name?: string;
  ward?: Ward | null;
  ward_id?: number;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
  type?: string;
  /** Amenities la danh sach object (co id) chu khong phai string. */
  amenities?: Amenity[] | null;
  images?: ListingImage[] | null;
  cover_image?: string | null;
  average_rating?: number | null;
  /** Field dung trong card/my-listings - backend go la avg_rating. */
  avg_rating?: number | null;
  reviews_count?: number;
  /** Card phan ra tam phuc vu (favorites). */
  is_favorited?: boolean;
  /** Khoang cach den truong (km) khi loc theo truong. */
  distance_km?: number | null;
  /** RoomDetail block diem theo 3 chieu. */
  ratings?: { listing_avg?: number | null; landlord_avg?: number | null; area_avg?: number | null } | null;
  /** ID hoi thoai cua chinh toi voi tin nay (neu co). */
  my_conversation_id?: number | null;
  can_review?: boolean;
  landlord?: { id?: number; name?: string; phone?: string | null } | null;
  reviews?: Review[] | null;
  created_at?: string;
  /** 2026-09: AI price advice fields (RoomDetail). */
  price_min?: number | null;
  price_max?: number | null;
  price_confidence?: string | null;
  price_note?: string | null;
}

/** POST/PUT /listings payload thuc te (useListingForm submit). */
export interface ListingPayload {
  title: string;
  type: string;
  price: number;
  area_m2: number;
  address: string;
  latitude: number;
  longitude: number;
  ward_id: number;
  description?: string | null;
  amenity_ids: number[];
  status?: string;
}

export interface Conversation {
  id: number;
  listing_id?: number | null;
  listing_title?: string | null;
  student_id: number;
  landlord_id: number;
  /** Ten ben kia (theo goc nhin cua viewer) - backend tra ve. */
  counterpart_name?: string;
  last_message_at?: string | null;
  unread_count?: number;
  /** Thread header (ConversationDetail). */
  other_user?: (Pick<User, "id" | "name"> & { role?: string }) | null;
  listing?: { id: number; title: string; cover_image?: string | null } | null;
  last_message?: {
    sender_id?: number;
    body?: string | null;
    attachment_name?: string | null;
    created_at?: string;
  } | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string | null;
  created_at: string;
  /** Unsend: noi dung bi thay bang marker, khong xoa hang. */
  deleted_at?: string | null;
  seen_at?: string | null;
  /** Messenger reactions - map {userId: emoji} tu server. */
  reactions?: Record<string, string> | null;
  /** Anh dinh kem trong chat (upload qua FormData). */
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  /** Sau unsend: body/attachment ve null, danh dau lai. */
  is_unsent?: boolean;
  /** Client-side flag sau khi ap event realtime. */
  is_mine?: boolean;
}

/** Event payloads tren kenh private-conversation.{id}. */
export interface MessageSentEvent {
  message: Message;
}

export interface MessageReactedEvent {
  message_id: number;
  reactions: Record<string, string>;
}

export interface MessageSeenEvent {
  reader_id: number;
  seen_at: string;
}

export interface MessageDeletedEvent {
  message_id: number;
  removed: boolean;
  deleted_for?: number[];
}

export interface TypingWhisper {
  user_id: number;
}

/** POST /conversations/{id}/messages payload. */
export interface MessagePayload {
  body: string;
}

export interface Favorite {
  id: number;
  listing_id: number;
  listing?: Listing;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginationMeta {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

/** Query params cho GET /listings - filter sidebar co nhieu tuy chon. */
export interface ListingQuery {
  [k: string]: string | number | (string | number)[] | undefined | null;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation?: string;
  /** Backend validator chap nhan string - UI gui "student"|"landlord"|. */
  role?: string;
  [k: string]: unknown;
}

export interface ReviewPayload {
  rating: number;
  comment?: string;
}

// ---- AI (API_CONTRACT §4 - response shape tu AI service, loose) ----

export interface AiChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AiRoommate {
  user_id?: number;
  name?: string;
  score?: number | string;
  similarity?: number;
  phone?: string;
  school?: string;
  interests?: string[];
  interests_shared?: string[];
  reason?: string;
  [k: string]: unknown;
}

export interface AiPriceAdvice {
  verdict?: "high" | "low" | "fair";
  listing_price?: number;
  fair_min?: number;
  fair_max?: number;
  stats?: { count?: number; min?: number; median?: number; max?: number };
  tips?: string[];
  message?: string;
}

export interface AiAreaSuggestion {
  ward_id?: number;
  name?: string;
  reason?: string;
  stats?: {
    listings_count?: number;
    avg_price?: number;
    avg_rating?: number;
    distance_to_school_km?: number;
  } | null;
  [k: string]: unknown;
}

export interface AiDescriptionResult {
  description?: string;
}

export interface AiChatResult {
  reply?: string;
}
