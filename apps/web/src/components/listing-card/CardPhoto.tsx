import { Link } from "react-router-dom";
import { ROUTES, route } from "@/constants/routes";
import { HousePlaceholder } from "@/ui/icons";

/** The cover image (fades in once loaded, stays visible if it fails) or the placeholder. */
export function CardPhoto({
  listingId,
  src,
}: {
  listingId: number;
  src: string | null | undefined;
}) {
  return (
    <Link
      to={route(ROUTES.ROOM_DETAIL, { id: listingId })}
      tabIndex={-1}
      aria-hidden="true"
      className="block h-full w-full"
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          data-fade
          ref={(el) => {
            if (el?.complete) el.dataset["loaded"] = "1";
          }}
          onLoad={(e) => {
            e.currentTarget.dataset["loaded"] = "1";
          }}
          onError={(e) => {
            e.currentTarget.dataset["loaded"] = "1";
          }}
          width={640}
          height={427}
          className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.05]"
        />
      ) : (
        <HousePlaceholder />
      )}
    </Link>
  );
}
