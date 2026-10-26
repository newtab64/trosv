import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/routes";

/* USER ART: real art file, cover-fills the full-height panel (hidden on
   mobile). Swap `src` to change the art; geometry stays. */
export function AuthArt({ src, testId }: { src: string; testId: string }) {
  return (
    <div
      data-testid={testId}
      className="relative hidden min-h-screen flex-1 overflow-hidden bg-sunken md:block"
      aria-hidden
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}

/* Split auth layout from Zillow's saved pages: fixed 480px form column
   (320px content, flat on the page, top on mobile / centered desktop)
   + flex-1 full-height art panel (hidden on mobile). Standalone page —
   no header, rail or footer. */
export function AuthSplit({
  title,
  children,
  artSrc,
  artTestId,
}: {
  title: string;
  children: ReactNode;
  artSrc: string;
  artTestId: string;
}) {
  return (
    <div className="relative flex min-h-screen bg-paper">
      <div className="flex w-full flex-col px-6 py-12 md:w-[480px] md:flex-none md:justify-center md:px-12">
        <div className="mx-auto w-full max-w-[320px]">
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <Link to={ROUTES.HOME} aria-label="TROSV trang chủ">
              <img src="/trosv-logo.svg" alt="TROSV" className="trosv-logo h-8 w-auto" />
            </Link>
            <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          </div>
          {children}
        </div>
      </div>
      <AuthArt src={artSrc} testId={artTestId} />
    </div>
  );
}
