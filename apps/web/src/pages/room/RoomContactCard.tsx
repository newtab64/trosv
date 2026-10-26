import { useNavigate } from "react-router-dom";
import { ROUTES, route } from "@/constants/routes";
import { startConversation } from "@/api/socialApi";
import { Button } from "@/ui/button";
import { toast } from "@/ui/toast";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Heart, Share2, Phone } from "lucide-react";
import type { Listing } from "@/types/api";
import { formatPriceShort } from "@/lib/format";

export interface RoomContactCardProps {
  listing: Listing;
  onFavToggle: () => void;
  isFav: boolean;
  onShare: () => void;
}

export function RoomContactCard({
  listing,
  onFavToggle,
  isFav,
  onShare,
}: RoomContactCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const phone = listing.landlord?.phone ?? null;

  async function contactLandlord(): Promise<void> {
    if (!user) {
      void navigate(ROUTES.LOGIN);
      return;
    }
    try {
      const conv = await startConversation(listing.id);
      void navigate(route(ROUTES.CONVERSATION, { id: conv.id }));
    } catch {
      toast("Không mở được hội thoại. Bạn thử lại nhé.");
    }
  }

  return (
    <aside
      data-testid="contact-card"
      className={cn(
        "sticky top-[calc(var(--nav-h)+16px)] flex flex-col gap-3 rounded-xl",
        "border border-line-strong bg-card p-6 shadow-pop lg:bottom-6"
      )}
    >
      <div className="flex items-baseline justify-between gap-2 border-b border-line pb-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-muted font-medium">Giá thuê</span>
          <p className="text-3xl font-extrabold tabular-nums text-plate">
            {formatPriceShort(listing.price)}
            <small className="ml-1 text-sm font-normal text-muted">/tháng</small>
          </p>
        </div>
        {listing.area_m2 != null ? (
          <span className="rounded bg-tint px-2 py-1 text-xs font-semibold text-ink-2">
            {listing.area_m2} m²
          </span>
        ) : null}
      </div>

      <div className="py-1">
        <p className="text-sm font-medium text-ink">
          Chủ nhà: <span className="font-semibold">{listing.landlord?.name ?? "Chưa rõ"}</span>
        </p>
        {user?.role !== "student" && phone == null ? (
          <p className="mt-1 text-xs text-muted">Đăng nhập bằng tài khoản sinh viên để xem số điện thoại</p>
        ) : phone ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink-2">
            <Phone className="size-4 text-plate" aria-hidden />
            {phone}
          </p>
        ) : null}
      </div>

      <Button variant="primary" className="w-full text-base" onClick={() => void contactLandlord()}>
        Nhắn tin cho chủ nhà
      </Button>

      <Button
        variant="outline"
        className={cn(
          "w-full transition-colors",
          isFav && "border-danger/30 text-danger hover:bg-danger-tint hover:text-danger"
        )}
        onClick={() => {
          if (!user) {
            toast("Vui lòng đăng nhập bằng tài khoản sinh viên để lưu phòng.");
            void navigate(ROUTES.LOGIN);
            return;
          }
          if (user.role !== "student") {
            toast("Chức năng lưu phòng chỉ dành cho tài khoản sinh viên.");
            return;
          }
          onFavToggle();
        }}
      >
        <Heart
          className={cn(
            "size-4 transition-colors",
            isFav ? "fill-danger stroke-danger text-danger" : "stroke-ink"
          )}
          aria-hidden
        />
        {isFav ? "Bỏ lưu phòng này" : "Lưu phòng này"}
      </Button>

      <Button variant="ghost" size="sm" className="w-full text-muted hover:text-ink" onClick={onShare}>
        <Share2 className="size-4" aria-hidden />
        Chia sẻ liên kết
      </Button>
    </aside>
  );
}
