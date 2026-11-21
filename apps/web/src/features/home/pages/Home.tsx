import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";
import { ART_ASSETS } from "@/shared/constants/assets";
import { getListings } from "@/features/listings/api/listingApi";
import { useCities, useSchools } from "@/features/listings/hooks/useReferenceData";
import type { City, Listing, School } from "@/shared/types/api";
import { PlateBand } from "@/shared/ui/plate-band";
import { ErrorState } from "@/shared/ui/empty-state";
import { SearchEmptyIllustration } from "@/shared/ui/icons";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { useReveal } from "@/shared/hooks/useReveal";
import { HeroArt } from "../components/HeroArt";
import { HomeQuickStrip } from "../components/HomeQuickStrip";
import { NewestRooms } from "../components/NewestRooms";
import { TypedWord } from "../components/TypedWord";
import { Search as SearchIcon, GraduationCap, MapPin } from "lucide-react";
import { schoolSearchHref } from "@/features/search/lib/searchFilters";

function HeroSearch({ cities, schools }: { cities: City[]; schools: School[] }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    const params = trimmed ? { q: trimmed } : {};
    void navigate({ pathname: ROUTES.ROOMS, search: new URLSearchParams(params).toString() });
  }

  const queryLower = q.trim().toLowerCase();
  const matchedSchools =
    queryLower.length > 1
      ? schools.filter((s) => s.name.toLowerCase().includes(queryLower)).slice(0, 4)
      : [];
  const matchedCities =
    queryLower.length > 1
      ? cities.filter((c) => c.name.toLowerCase().includes(queryLower)).slice(0, 3)
      : [];

  const hasSuggestions = matchedSchools.length > 0 || matchedCities.length > 0;

  return (
    <form onSubmit={submit} className="w-full max-w-xl">
      <div className="relative">
        <div className="flex h-16 items-center gap-2 rounded-full border border-line-strong bg-card p-2 pl-6 shadow-pop">
          <SearchIcon className="size-5 flex-none text-muted" aria-hidden />
          <input
            type="search"
            placeholder="Trường, phường, tên đường"
            aria-label="Tìm phòng"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
            }}
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-base text-ink placeholder:text-muted focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Tìm phòng"
            className="flex size-12 flex-none items-center justify-center rounded-full bg-plate text-white transition-colors hover:bg-plate-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate"
          >
            <SearchIcon className="size-5" aria-hidden />
          </button>
        </div>

        {hasSuggestions ? (
          <div className="absolute left-0 right-0 top-[72px] z-20 rounded-xl border border-line bg-card p-2 shadow-pop">
            {matchedSchools.length > 0 ? (
              <div className="mb-2">
                <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  Trường Đại học / Cao đẳng
                </span>
                {matchedSchools.map((s) => (
                  <Link
                    key={s.id}
                    to={schoolSearchHref(s.id)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-tint"
                    onClick={() => {
                      setQ("");
                    }}
                  >
                    <GraduationCap className="size-4 text-plate" aria-hidden />
                    <span>{s.name}</span>
                  </Link>
                ))}
              </div>
            ) : null}

            {matchedCities.length > 0 ? (
              <div>
                <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  Tỉnh / Thành phố
                </span>
                {matchedCities.map((c) => (
                  <Link
                    key={c.id}
                    to={`${ROUTES.ROOMS}?city_id=${c.id}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-tint"
                    onClick={() => {
                      setQ("");
                    }}
                  >
                    <MapPin className="size-4 text-muted" aria-hidden />
                    <span>{c.name}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </form>
  );
}

const QUICK_FILTERS = [
  { label: "Phòng trọ", params: { type: "room" } },
  { label: "Căn hộ", params: { type: "apartment" } },
  { label: "Nhà nguyên căn", params: { type: "house" } },
  { label: "Dưới 2.000.000đ", params: { price_max: "2000000" } },
];

export default function Home() {
  useDocumentTitle("Trang chủ · TROSV");
  const revealStrip = useReveal();
  const revealCta = useReveal();
  const [newest, setNewest] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { data: cities } = useCities();
  const { data: schools } = useSchools();

  useEffect(() => {
    getListings({ per_page: 8, sort: "newest" })
      .then((res) => {
        setNewest(res.data);
      })
      .catch((err: unknown) => {
        setError(String(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero: navy band, a quiet doodle pattern, the typed keyword and the newest rooms floating at the right */}
      <PlateBand
        size="hero"
        className="md:min-h-0"
        contentClassName="px-5 py-8 sm:px-5 md:px-5 md:py-10 min-[1180px]:pr-[360px]"
        headingClassName="max-w-xl lg:text-5xl"
        title={
          <>
            Phòng trọ. Căn hộ.
            <br />
            <TypedWord />
          </>
        }
        backdrop={
          <>
            <div
              data-testid="hero-doodles"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[length:260px_260px,auto,auto]"
              style={{
                backgroundImage: `url(${ART_ASSETS.HERO_DOODLES}), radial-gradient(ellipse 60% 80% at 88% 8%, rgb(255 255 255 / 0.13), transparent 60%), radial-gradient(ellipse 50% 70% at 0% 100%, rgb(0 0 0 / 0.18), transparent 65%)`,
              }}
            />
          </>
        }
      >
        <p className="-mt-2 hidden max-w-xl text-base text-white/85 sm:block sm:text-lg">
          Tìm phòng theo trường, nhắn thẳng chủ nhà, để AI gợi ý giá hợp lý.
        </p>
        <HeroSearch cities={cities} schools={schools} />
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          {QUICK_FILTERS.map(({ label, params }) => (
            <Link
              key={label}
              to={`${ROUTES.ROOMS}?${new URLSearchParams(params).toString()}`}
              className="inline-flex h-9 flex-none items-center rounded-full border border-white/25 bg-white/15 px-4 text-sm font-semibold text-white transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {label}
            </Link>
          ))}
        </div>
        <HeroArt />
      </PlateBand>

      <div className="mx-auto w-full max-w-6xl px-5">
        {/* Mới đăng: the newest rooms in one swipeable row, right under the hero */}
        <section className="pb-6 pt-8">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-ink">Mới đăng</h2>
            <Link
              to={ROUTES.ROOMS}
              className="text-sm font-medium text-plate hover:text-plate-hover hover:underline"
            >
              Xem tất cả phòng &rarr;
            </Link>
          </div>

          {error ? (
            <ErrorState message="Không tải được phòng mới đăng. Bạn thử lại sau ít phút nhé." />
          ) : !loading && newest.length === 0 ? (
            <SearchEmptyIllustration className="max-w-xs self-center" />
          ) : (
            <NewestRooms listings={newest} loading={loading} />
          )}
        </section>

        <div ref={revealStrip} className="pb-10">
          <HomeQuickStrip schools={schools} />
        </div>

        {/* Landlord banner */}
        <section
          ref={revealCta}
          className="mb-12 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-flyer p-7 text-flyer-ink"
        >
          <div>
            <h2 className="text-2xl font-extrabold">Bạn có phòng cho thuê?</h2>
            <p className="mt-1 opacity-80">
              Đăng tin miễn phí và nhận tin nhắn trực tiếp từ sinh viên.
            </p>
          </div>
          <Link
            to={ROUTES.REGISTER}
            className="motion-press inline-flex h-10 items-center rounded-lg bg-flyer-ink px-5 text-sm font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Đăng tin ngay
          </Link>
        </section>
      </div>
    </div>
  );
}
