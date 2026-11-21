import { Link } from "react-router-dom";
import { GraduationCap, MapPin, MessageCircle, Sparkles, Users } from "lucide-react";
import { ROUTES } from "@/shared/constants/routes";
import { cn } from "@/shared/lib/utils";
import type { School } from "@/shared/types/api";
import { schoolSearchHref } from "@/features/search/lib/searchFilters";

const FEATURES = [
  {
    to: ROUTES.MAP,
    icon: MapPin,
    title: "Bản đồ",
    hint: "Ghim giá trên bản đồ",
    tone: "bg-plate-tint text-plate",
  },
  {
    to: ROUTES.AI_AREA_SUGGESTIONS,
    icon: Sparkles,
    title: "Gợi ý khu vực",
    hint: "AI chọn khu hợp túi tiền",
    tone: "bg-moss-tint text-moss",
  },
  {
    to: ROUTES.AI_ROOMMATES,
    icon: Users,
    title: "Bạn cùng phòng",
    hint: "Ghép theo sở thích",
    tone: "bg-danger-tint text-danger",
  },
  {
    to: ROUTES.ROOMS,
    icon: MessageCircle,
    title: "Nhắn chủ nhà",
    hint: "Trực tiếp, không môi giới",
    tone: "bg-flyer/30 text-ink",
  },
] as const;

/** One slim card: schools as chips, then four shortcuts. Replaces a wall of tiles. */
export function HomeQuickStrip({ schools }: { schools: School[] }) {
  return (
    <section
      data-testid="quick-strip"
      className="overflow-hidden rounded-xl border border-line bg-card shadow-card"
    >
      <div className="flex items-center gap-2.5 overflow-x-auto border-b border-line px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <h2 className="flex flex-none items-center gap-2 text-[15px] font-bold text-ink">
          <GraduationCap className="size-5 text-plate" aria-hidden />
          Tìm theo trường
        </h2>
        {schools.slice(0, 6).map((s) => (
          <Link
            key={s.id}
            to={schoolSearchHref(s.id)}
            className="flex-none rounded-full border border-line-strong bg-card px-3.5 py-1.5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate"
          >
            {s.name}
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4">
        {FEATURES.map((f, i) => (
          <Link
            key={f.title}
            to={f.to}
            className={cn(
              "flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-plate",
              i % 2 === 0 && "border-r border-line",
              i < 2 && "border-b border-line md:border-b-0",
              i < 3 && "md:border-r",
            )}
          >
            <span className={cn("grid size-9 flex-none place-items-center rounded-xl", f.tone)}>
              <f.icon className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0">
              <b className="block text-sm text-ink">{f.title}</b>
              <small className="hidden text-xs text-muted md:block">{f.hint}</small>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
