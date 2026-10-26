import { useCallback, useEffect, useState } from "react";
import { getListing, getListingReviews } from "@/api/listingApi";
import { errMessage, errStatus } from "@/api/axiosClient";
import type { Listing, Review, PaginationMeta } from "@/types/api";

/**
 * Data + actions for the /rooms/:id page: listing detail, review list
 * (paginated) and load/error state. setListing is exposed so actions on
 * the page (favorite toggle, review submit) can update the cached listing.
 * Favorite/chat toasts stay in the page (they need the toast context).
 */
export function useRoomDetail(id: number) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewMeta, setReviewMeta] = useState<PaginationMeta | null>(null);

  // Per-listing reset during render (React's "adjust state when props
  // change" idiom): a new id starts with a clean slate immediately,
  // instead of a synchronous setState inside the fetch effect.
  const [prevId, setPrevId] = useState(id);
  if (prevId !== id) {
    setPrevId(id);
    setListing(null);
    setLoading(true);
    setError("");
    setReviews([]);
    setReviewMeta(null);
  }

  const loadReviews = useCallback(
    (page = 1) => {
      getListingReviews(id, page)
        .then(({ data, meta }) => {
          setReviews(data);
          setReviewMeta(meta);
        })
        .catch(() => {
        /* silent */
      });
    },
    [id]
  );

  useEffect(() => {
    getListing(id)
      .then((data) => {
        setListing(data);
        loadReviews(1);
      })
      .catch((err: unknown) => { setError(
          errStatus(err) === 404
            ? "Phòng trọ không tồn tại hoặc đã bị ẩn."
            : errMessage(err)
        ); }
      )
      .finally(() => { setLoading(false); });
  }, [id, loadReviews]);

  return {
    listing,
    setListing,
    loading,
    error,
    reviews,
    reviewMeta,
    loadReviews,
  };
}
