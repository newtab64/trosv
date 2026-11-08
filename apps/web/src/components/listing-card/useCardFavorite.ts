import { useState } from "react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { addFavorite, removeFavorite } from "@/api/socialApi";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/ui/toast";
import type { Listing } from "@/types/api";

/**
 * The heart on a card. When the parent passes `onFavToggle` it owns the state
 * (the search page); otherwise the card keeps it itself (the home page).
 */
export function useCardFavorite(listing: Listing, onFavToggle?: (l: Listing) => void) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [localFav, setLocalFav] = useState(listing.is_favorited === true);
  const [prevFav, setPrevFav] = useState(listing.is_favorited);
  /* True only while the save pop plays; never on initial render. */
  const [pop, setPop] = useState(false);

  if (listing.is_favorited !== prevFav) {
    setPrevFav(listing.is_favorited);
    setLocalFav(listing.is_favorited === true);
  }

  const isFavorite = onFavToggle ? listing.is_favorited === true : localFav;

  async function onHeartClick(e: MouseEvent): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast("Vui lòng đăng nhập bằng tài khoản sinh viên để lưu phòng.");
      void navigate(ROUTES.LOGIN);
      return;
    }
    if (user.role !== "student") {
      toast("Chức năng lưu phòng chỉ dành cho tài khoản sinh viên.");
      return;
    }

    if (!isFavorite) setPop(true);

    if (onFavToggle) {
      onFavToggle(listing);
      return;
    }

    const next = !localFav;
    setLocalFav(next);
    try {
      if (next) {
        await addFavorite(listing.id);
        toast("Đã lưu phòng.");
      } else {
        await removeFavorite(listing.id);
        toast("Đã bỏ lưu phòng.");
      }
    } catch {
      setLocalFav(!next);
      toast("Không cập nhật được yêu thích. Bạn thử lại nhé.");
    }
  }

  return {
    isFavorite,
    pop,
    endPop: () => {
      setPop(false);
    },
    onHeartClick,
  };
}
