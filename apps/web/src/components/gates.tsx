import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ART_ASSETS } from "@/constants/assets";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/ui/button";

/*
  Signed-out gate (Zillow "Sign in to favorites/inbox" pattern, values from
  the saved pages): light-gray band, 12-col grid (text 5 / art 7, gap 48),
  left-aligned text on desktop, art-first stacked and centered on mobile.
  ONE primary button (min 240px, full-width on mobile). The art floats on
  the band with no panel behind it.
*/

/* Favorites gate: user's own art file. */
export function FavoritesGateIllustration() {
  return (
    <div className="aspect-[16/9] w-full flex items-center justify-center">
      <img
        src={ART_ASSETS.FAVORITES_GATE}
        alt=""
        aria-hidden
        loading="eager"
        decoding="sync"
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

/* Messages gate: user's own art file. */
export function MessagesGateIllustration() {
  return (
    <div className="aspect-[16/9] w-full flex items-center justify-center">
      <img
        src={ART_ASSETS.INBOX_GATE}
        alt=""
        aria-hidden
        loading="eager"
        decoding="sync"
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

export function GateScreen({
  title,
  description,
  illustration,
  testId,
}: {
  title: string;
  description: string;
  illustration: ReactNode;
  testId: string;
}) {
  return (
    <section
      className="bg-card min-h-[60vh] flex-1 flex flex-col justify-center"
      data-testid={testId}
    >
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-6 px-4 py-10 md:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8">
        <div className="order-2 flex flex-col justify-center text-center lg:order-1 lg:col-span-5 lg:text-left">
          <h1 className="text-2xl font-black">{title}</h1>
          <p className="mb-8 mt-8 text-base text-ink-2 min-h-[4.5rem] flex items-center lg:items-start">{description}</p>
          <div className="flex justify-center lg:justify-start">
            <Button asChild variant="primary" className="w-full sm:w-60 min-w-60">
              <Link to={`${ROUTES.LOGIN}?register=0`}>Đăng nhập</Link>
            </Button>
          </div>
        </div>
        <div aria-hidden className="order-1 lg:order-2 lg:col-span-7 lg:-translate-y-4">
          {illustration}
        </div>
      </div>
    </section>
  );
}
