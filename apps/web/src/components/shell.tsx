import * as React from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LogOut,
  ChevronDown,
} from "lucide-react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { ROUTES, route } from "@/constants/routes";
import {
  RailSearchIcon,
  RailHeartIcon,
  RailMessageIcon,
  RailBuildingIcon,
} from "@/ui/icons";
import { Badge } from "@/ui/badge";
import { Avatar } from "@/ui/avatar";
import { Button } from "@/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "@/ui/toast";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AiChatWidget } from "@/components/AiChatWidget";

/* ---------- Header ---------- */

function Header() {
  const { user, logout } = useAuth();
  const [aiOpen, setAiOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  /* Note: keyboard/aria wiring stays handled by Radix for both menus. */

  return (
    <header
      className={cn(
        "sticky top-0 z-30 grid h-14 grid-cols-2 items-center gap-4 border-b border-line bg-card px-5",
        "min-[890px]:h-[72px] lg:grid-cols-[1fr_auto_1fr]"
      )}
    >
      {/* Left: product nav (desktop, like Zillow's left group). */}
      <div className="hidden items-center gap-1 justify-self-start lg:flex">
        <NavLink
          to={ROUTES.ROOMS}
          className={({ isActive }) =>
            cn(
              "rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-line",
              isActive && "bg-line"
            )
          }
        >
          Thuê phòng
        </NavLink>

        {user?.role === "student" ? (
          <Popover open={aiOpen} onOpenChange={setAiOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium",
                  "text-ink transition-colors hover:bg-line"
                )}
                aria-expanded={aiOpen}
                aria-haspopup="menu"
              >
                Gợi ý AI
                <ChevronDown className="size-4" aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto min-w-52 p-2 bg-card">
              <Link
                to={ROUTES.AI_ROOMMATES}
                className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-tint"
                onClick={() => { setAiOpen(false); }}
              >
                Bạn cùng phòng
              </Link>
              <Link
                to={ROUTES.AI_AREA_SUGGESTIONS}
                className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-tint"
                onClick={() => { setAiOpen(false); }}
              >
                Khu vực phù hợp
              </Link>
            </PopoverContent>
          </Popover>
        ) : null}

        {user?.role === "landlord" ? (
          <NavLink
            to={ROUTES.LANDLORD}
            className={({ isActive }) =>
              cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-line",
                isActive && "bg-line"
              )
            }
          >
            Đăng tin
          </NavLink>
        ) : null}
      </div>

      {/* Center: wordmark (Zillow puts the logo mid-header on desktop). */}
      <div className="flex items-center gap-3 justify-self-start lg:justify-self-center">
        <Link
          to={ROUTES.HOME}
          className="flex items-center"
          aria-label="TROSV trang chủ"
        >
          <img src="/trosv-logo.svg" alt="TROSV" className="trosv-logo h-6 w-auto" />
        </Link>
      </div>

      {/* Right: theme toggle + account (always right-aligned). */}
      <div className="flex items-center gap-2 justify-self-end">
        <ThemeToggle />
        {user ? (
          <DropdownMenuPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuPrimitive.Trigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-line",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate"
                )}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Menu tài khoản"
              >
                <Avatar name={user.name} size={32} />
                <ChevronDown className="size-4 text-ink-2" aria-hidden />
              </button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.Content
                align="end"
                sideOffset={8}
                className="z-50 min-w-44 rounded-xl border border-line bg-card p-1.5 shadow-pop focus:outline-none"
              >
                <DropdownMenuPrimitive.Item asChild>
                  <Link
                    to={ROUTES.PROFILE}
                    className={cn(
                      "block cursor-pointer rounded-lg px-3 py-2 text-sm text-ink outline-none",
                      "data-[highlighted]:bg-tint"
                    )}
                  >
                    Hồ sơ
                  </Link>
                </DropdownMenuPrimitive.Item>
                <DropdownMenuPrimitive.Separator className="my-1 h-px bg-line" />
                <DropdownMenuPrimitive.Item
                  onSelect={() => {
                    void (async () => {
                      /** Logout closes the Echo socket via clearSession(). */
                      await logout();
                      toast("Đã đăng xuất.");
                      void navigate(ROUTES.HOME);
                    })();
                  }}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-2 text-sm text-ink outline-none",
                    "data-[highlighted]:bg-tint flex items-center"
                  )}
                >
                  <LogOut className="mr-2 inline size-4" aria-hidden />
                  Đăng xuất
                </DropdownMenuPrimitive.Item>
              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Root>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm" className="text-sm">
              <Link to={ROUTES.LOGIN}>Đăng nhập</Link>
            </Button>
            <Button asChild size="sm" className="text-sm">
              <Link to={ROUTES.REGISTER}>Đăng ký</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

/* ---------- Icon rail / bottom tab bar ---------- */

interface RailItem {
  to: string;
  label: string;
  /* LucideIcon forwardRef components don't match ComponentType exactly;
     any narrower loose type is unsafe, so accept any component shape. */
  icon: React.ElementType;
  /** undefined = no badge. */
  badge: number | undefined;
}

function RailItems(): (RailItem & { active: boolean })[] {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const unread = useUnreadCount();
  /** Student-only heart, landlord swaps it for a listings icon. */
  const isLandlord = user?.role === "landlord";
  const items: RailItem[] = [
    { to: ROUTES.HOME, label: "Tìm phòng", icon: RailSearchIcon, badge: undefined },
    isLandlord
      ? { to: ROUTES.LANDLORD, label: "Quản lý tin đăng", icon: RailBuildingIcon, badge: undefined }
      : { to: ROUTES.FAVORITES, label: "Yêu thích", icon: RailHeartIcon, badge: undefined },
    /* Always visible (Zillow shows Inbox to guests too): logged-out users
       land on the messages gate instead of a login redirect. */
    { to: ROUTES.MESSAGES, label: "Tin nhắn", icon: RailMessageIcon, badge: unread },
  ];
  return items.map((item) => ({
    ...item,
    active:
      item.to === ROUTES.HOME
        ? pathname === ROUTES.HOME
        : pathname === item.to || pathname.startsWith(`${item.to}/`),
  }));
}

function Rail() {
  const items = RailItems();
  const location = useLocation();
  const isConversationThread = /^\/messages\/\d+/.test(location.pathname);

  return (
    <TooltipProvider>
      <nav
        aria-label="Điều hướng nhanh"
        className={cn(
          "relative z-30 flex items-center justify-around bg-card border-t border-line lg:border-t-0 lg:border-r",
          "h-14 fixed bottom-0 left-0 right-0",
          "lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)] lg:w-16 lg:flex-col",
          "lg:items-center lg:justify-start lg:gap-4 lg:p-2",
          isConversationThread && "hidden lg:flex"
        )}
      >
        {items.map((item) => (
          <Tooltip key={item.label}>
            <TooltipTrigger asChild>
              {/* Plain Link (not NavLink): Radix asChild string-merges
                 className, which would stringify NavLink's function form
                 and leak "text-plate-hover" onto every icon. Active state
                 comes from RailItems instead. */}
              <Link
                to={item.to}
                aria-label={item.label}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                  "text-ink-2 hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate",
                  item.active &&
                    "bg-plate-tint text-plate font-medium"
                )}
              >
                <item.icon className="size-5" />
                {item.badge != null && item.badge > 0 ? (
                  <Badge
                    className={cn(
                      "absolute -right-1 -top-1",
                      item.active && "bg-plate text-white"
                    )}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </Badge>
                ) : null}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>
    </TooltipProvider>
  );
}

/* ---------- Footer ---------- */

export function Footer() {
  const { VITE_SOCIAL_FACEBOOK, VITE_SOCIAL_INSTAGRAM, VITE_SOCIAL_YOUTUBE } =
    useEnv();
  const socials = [
    { label: "Facebook", url: VITE_SOCIAL_FACEBOOK },
    { label: "Instagram", url: VITE_SOCIAL_INSTAGRAM },
    { label: "YouTube", url: VITE_SOCIAL_YOUTUBE },
  ].filter((s) => s.url);

  return (
    <footer className="relative border-t border-line bg-card">
      <div className="mx-auto max-w-5xl px-5 py-6 text-center">
        <nav
          aria-label="Chân trang"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
        >
          <FooterLink to={ROUTES.ROOMS}>Tìm phòng</FooterLink>
          <FooterLink to={ROUTES.REGISTER}>Đăng tin</FooterLink>
          <FooterLink to={ROUTES.LANDLORD}>Quản lý tin đăng</FooterLink>
          <FooterLink to={ROUTES.HOME}>Trợ giúp</FooterLink>
        </nav>
        <p className="mt-4 text-xs text-muted">© 2026 TROSV</p>
        {socials.length > 0 ? (
          <div className="mt-3 flex items-center justify-center gap-1">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                aria-label={s.label}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex size-10 items-center justify-center rounded-full text-ink-2",
                  "transition-colors hover:bg-tint hover:text-ink"
                )}
              >
                <SocialIcon />
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </footer>
  );
}

/* Tailwind v4 needs env vars at runtime — read once via import.meta.env. */
function useEnv() {
  return {
    VITE_SOCIAL_FACEBOOK: import.meta.env.VITE_SOCIAL_FACEBOOK as string | undefined,
    VITE_SOCIAL_INSTAGRAM: import.meta.env.VITE_SOCIAL_INSTAGRAM as string | undefined,
    VITE_SOCIAL_YOUTUBE: import.meta.env.VITE_SOCIAL_YOUTUBE as string | undefined,
  };
}

function FooterLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="py-1 text-sm text-ink-2 transition-colors hover:text-ink hover:underline"
    >
      {children}
    </Link>
  );
}

function SocialIcon() {
  /* Simple inline glyph for footer socials; real logos come from the
     env-var-driven URLs. Keeps icons inside our tokens, no brand SVGs.
     The wrapping <a> already carries aria-label={label}. */
  return <span className="text-sm" aria-hidden>•</span>;
}

/* ---------- Shell ---------- */

export function AppShell({
  hideFooter,
  className,
  screenSuspense,
}: {
  hideFooter?: boolean;
  className?: string;
  /** Route-level Suspense fallback container, provided by main.tsx. */
  screenSuspense?: React.ReactNode;
}) {
  const { user } = useAuth();
  const location = useLocation();
  const isConversationThread = /^\/messages\/\d+/.test(location.pathname);
  const isMessagesChat = Boolean(user) && /^\/messages/.test(location.pathname);

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-paper",
        isMessagesChat && "h-dvh max-h-dvh overflow-hidden"
      )}
    >
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#main"
        className={cn(
          "sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50",
          "focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        )}
      >
        Bỏ qua điều hướng
      </a>
      <Header />
      <div
        className={cn(
          "flex flex-1 flex-col lg:flex-row min-h-0",
          isMessagesChat && "overflow-hidden"
        )}
      >
        <Rail />
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col min-h-0 pb-14 lg:pb-0",
            (isConversationThread || isMessagesChat) && "pb-0",
            isMessagesChat && "overflow-hidden"
          )}
        >
          <main
            id="main"
            className={cn(
              "min-w-0 flex-1 flex flex-col min-h-0",
              isMessagesChat && "overflow-hidden",
              className
            )}
          >
            {screenSuspense ?? <Outlet />}
          </main>
          {hideFooter ? null : <Footer />}
        </div>
      </div>
      <AiChatWidget />
    </div>
  );
}

/* Re-exported for pages that build links with the shared helper. */
export { route };
