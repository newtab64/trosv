import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { useRoomDetail } from "@/hooks/useRoomDetail";
import { aiPriceAdvice } from "@/api/aiApi";
import type { AiPriceAdvice } from "@/types/api";
import { addFavorite, removeFavorite } from "@/api/socialApi";
import { Button } from "@/ui/button";
import { Skeleton, Tag, Rating } from "@/ui/badge";
import { ErrorState } from "@/ui/empty-state";
import { HousePlaceholder } from "@/ui/icons";
import { toast } from "@/ui/toast";
import { useAuth } from "@/context/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatPriceShort } from "@/lib/format";
import { RoomLightbox } from "./room/RoomLightbox";
import { RoomContactCard } from "./room/RoomContactCard";
import { Sparkles, MapPin, Navigation, ArrowLeft } from "lucide-react";

export default function RoomDetail() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const detail = useRoomDetail(id);
  const { user } = useAuth();

  const [lightboxAt, setLightboxAt] = useState<number | null>(null);
  const [advice, setAdvice] = useState<AiPriceAdvice | null>(null);
  const [adviceBusy, setAdviceBusy] = useState(false);
  const [adviceError, setAdviceError] = useState("");

  useDocumentTitle(
    detail.listing ? `${detail.listing.title} · TROSV` : "Chi tiết phòng · TROSV"
  );

  const images = detail.listing?.images ?? [];
  const cover = detail.listing?.cover_image ?? images[0]?.url ?? null;
  const isFav = detail.listing?.is_favorited === true;

  async function askAi(): Promise<void> {
    setAdviceBusy(true);
    setAdviceError("");
    try {
      setAdvice(await aiPriceAdvice(id));
    } catch {
      setAdviceError("Trợ lý AI đang bận. Bạn thử lại sau ít phút nhé.");
    } finally {
      setAdviceBusy(false);
    }
  }

  async function toggleFav(): Promise<void> {
    const listing = detail.listing;
    if (!listing || !user || user.role !== "student") return;
    const next = !isFav;
    detail.setListing((l) => (l ? { ...l, is_favorited: next } : l));
    try {
      if (next) {
        await addFavorite(listing.id);
        toast("Đã lưu phòng.");
      } else {
        await removeFavorite(listing.id);
        toast("Đã bỏ lưu phòng.");
      }
    } catch {
      detail.setListing((l) => (l ? { ...l, is_favorited: !next } : l));
      toast("Không cập nhật được yêu thích. Bạn thử lại nhé.");
    }
  }

  function copyLink(): void {
    void navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        toast("Đã sao chép liên kết.");
      })
      .catch(() => {
        toast("Không sao chép được liên kết.");
      });
  }

  if (detail.loading) {
    return (
      <div className="mx-auto max-w-6xl p-4 lg:p-6">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-4 aspect-3/2 w-full rounded-xl lg:aspect-[16/10]" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-28" />
            <Skeleton className="h-36" />
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (detail.error) {
    return (
      <ErrorState
        message={detail.error}
        action={
          <Button asChild variant="outline">
            <Link to={ROUTES.ROOMS}>Về danh sách phòng</Link>
          </Button>
        }
        className="min-h-[60vh]"
      />
    );
  }

  const listing = detail.listing;
  if (!listing) return null;

  const facts: { label: string; value: React.ReactNode }[] = [
    {
      label: "Giá thuê mỗi tháng",
      value: (
        <span className="text-plate font-bold">
          {formatPriceShort(listing.price)}/tháng
        </span>
      ),
    },
    {
      label: "Diện tích sử dụng",
      value: listing.area_m2 != null ? `${listing.area_m2} m²` : "Chưa rõ",
    },
    {
      label: "Khoảng cách tới trường",
      value:
        listing.distance_km != null ? (
          <span className="inline-flex items-center gap-1 font-semibold text-plate">
            <Navigation className="size-3.5" aria-hidden />
            {listing.distance_km.toFixed(1)} km (~{Math.max(1, Math.round(listing.distance_km * 3))}p xe máy)
          </span>
        ) : (
          "Không rõ"
        ),
    },
    {
      label: "Trạng thái phòng",
      value:
        listing.status === "available" ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-moss">
            <span className="size-2 rounded-full bg-moss" aria-hidden />
            Còn trống
          </span>
        ) : listing.status === "rented" ? (
          <span className="font-medium text-muted">Đã thuê</span>
        ) : (
          <span className="font-medium text-muted">Ẩn</span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6">
      <Link
        to={ROUTES.ROOMS}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-plate transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Quay lại kết quả tìm kiếm
      </Link>

      {/* Photo mosaic: 1 large + 4, click to open lightbox */}
      <div className="mt-3 grid gap-2 overflow-hidden rounded-xl md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2 md:[&>*:first-child]:col-span-1 md:[&>*:first-child]:row-span-2">
        {(cover ? [{ url: cover, id: 0 }, ...images.slice(0, 4)] : images.slice(0, 5)).map(
          (img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => { setLightboxAt(i); }}
              aria-label={`Xem ảnh ${i + 1}`}
              className="relative aspect-3/2 overflow-hidden bg-sunken md:aspect-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate"
            >
              {img.url ? (
                <img
                  src={img.url}
                  alt=""
                  width={640}
                  height={427}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-200 ease-out hover:scale-[1.02]"
                />
              ) : (
                <HousePlaceholder />
              )}
            </button>
          )
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <section>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">{listing.title}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
              <MapPin className="size-4 text-plate" aria-hidden />
              <span>
                {listing.address}
                {listing.ward ? `, ${listing.ward.name}` : ""}
              </span>
            </p>

            {/* Quick facts card */}
            <dl className="mt-6 divide-y divide-line rounded-xl border border-line bg-card p-5 shadow-xs">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <dt className="text-sm font-medium text-muted">{f.label}</dt>
                  <dd className="text-base font-semibold tabular-nums text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {listing.description ? (
            <section className="rounded-xl border border-line bg-card p-6 shadow-xs">
              <h2 className="mb-3 text-xl font-bold text-ink">Mô tả chi tiết</h2>
              <p className="text-base leading-relaxed text-ink-2 whitespace-pre-line">
                {listing.description}
              </p>
            </section>
          ) : null}

          {listing.amenities && listing.amenities.length > 0 ? (
            <section className="rounded-xl border border-line bg-card p-6 shadow-xs">
              <h2 className="mb-3 text-xl font-bold text-ink">Tiện ích đi kèm</h2>
              <div className="flex flex-wrap gap-2">
                {listing.amenities.map((a) => (
                  <Tag key={a.id} variant="paper" className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium">
                    {a.name ?? `Tiện ích ${a.id}`}
                  </Tag>
                ))}
              </div>
            </section>
          ) : null}

          {/* AI Price Advice */}
          <section className="rounded-xl border border-line bg-card p-6 shadow-xs">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="size-5 text-plate" aria-hidden />
              <h2 className="text-xl font-bold text-ink">Tư vấn giá AI</h2>
            </div>
            {user?.role !== "student" ? (
              <p className="text-sm text-muted">
                Đăng nhập bằng tài khoản sinh viên để xem phân tích mức giá thị trường từ trợ lý AI.
              </p>
            ) : advice ? (
              <div data-testid="ai-price" className="rounded-lg bg-plate-tint p-4 border border-plate/20">
                <p className="font-bold text-plate">
                  Khoảng giá hợp lý: {formatPriceShort(advice.fair_min ?? 0)} – {formatPriceShort(advice.fair_max ?? 0)}/tháng
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  {advice.tips?.[0] ?? advice.message ?? "Giá phòng phù hợp với mặt bằng chung khu vực."}
                </p>
                <p className="mt-2 text-xs text-muted">
                  * Gợi ý tham khảo dựa trên thống kê phòng trọ cùng phường/quận.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                {adviceError ? <p className="text-sm text-danger">{adviceError}</p> : null}
                <Button variant="outline" loading={adviceBusy} onClick={() => void askAi()}>
                  <Sparkles className="size-4 text-plate" aria-hidden />
                  Hỏi giá phòng này
                </Button>
              </div>
            )}
          </section>

          {/* Ratings + reviews */}
          <section className="rounded-xl border border-line bg-card p-6 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-ink">Đánh giá từ người thuê</h2>
              {listing.can_review && user?.role === "student" ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`${ROUTES.ROOM_DETAIL}?review=1`}>Viết đánh giá</Link>
                </Button>
              ) : null}
            </div>

            <p className="text-sm text-muted">
              {listing.ratings?.listing_avg != null
                ? `Chất lượng phòng ${listing.ratings.listing_avg.toFixed(1)}/5`
                : null}{" "}
              {listing.ratings?.landlord_avg != null
                ? `· Chủ nhà ${listing.ratings.landlord_avg.toFixed(1)}/5`
                : ""}{" "}
              {listing.ratings?.area_avg != null
                ? `· Khu vực ${listing.ratings.area_avg.toFixed(1)}/5`
                : ""}
            </p>

            {detail.reviews.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Chưa có đánh giá nào cho phòng này.</p>
            ) : (
              <div className="mt-4 divide-y divide-line">
                {detail.reviews.map((r) => (
                  <div key={r.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-ink">{r.student?.name ?? r.user_name ?? "Sinh viên"}</p>
                      <Rating value={r.listing_rating ?? r.rating} />
                    </div>
                    {r.comment ? (
                      <p className="mt-1.5 text-sm text-ink-2 leading-relaxed">{r.comment}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <RoomContactCard
          listing={listing}
          onFavToggle={() => void toggleFav()}
          isFav={isFav}
          onShare={copyLink}
        />
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="fixed bottom-14 left-0 right-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-card px-4 py-3 shadow-pop lg:hidden">
        <div>
          <span className="text-xs text-muted">Giá thuê</span>
          <p className="text-xl font-bold tabular-nums text-plate">
            {formatPriceShort(listing.price)}
            <small className="ml-1 text-xs font-normal text-muted">/th</small>
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            const el = document.querySelector<HTMLButtonElement>('[data-testid="contact-card"] button');
            el?.click();
          }}
        >
          Nhắn tin chủ nhà
        </Button>
      </div>

      {lightboxAt != null && images.length > 0 ? (
        <RoomLightbox
          images={images}
          index={lightboxAt}
          onClose={() => { setLightboxAt(null); }}
          onNavigate={setLightboxAt}
        />
      ) : null}
    </div>
  );
}
