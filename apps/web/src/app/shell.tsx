import * as React from "react";
import {
  Link,
  NavLink,
  NavigationType,
  Outlet,
  useLocation,
  useNavigate,
  useNavigationType,
} from "react-router-dom";
import { LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { ROUTES, route } from "@/shared/constants/routes";
import {
  RailSearchIcon,
  RailHeartIcon,
  RailMessageIcon,
  RailBuildingIcon,
} from "@/shared/ui/icons";
import { Badge } from "@/shared/ui/badge";
import { Avatar } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import { toast } from "@/shared/ui/toast";
import { Footer } from "@/shared/layout/footer";
import { useUnreadCount } from "@/features/messaging/hooks/useUnreadCount";
import { AiChatWidget } from "@/features/ai/components/AiChatWidget";

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
        "min-[890px]:h-[72px] lg:grid-cols-[1fr_auto_1fr]",
      )}
    >
      {/* Left: product nav (desktop, like Zillow's left group). */}
      <div className="hidden items-center gap-1 justify-self-start lg:flex">
        <NavLink
          to={ROUTES.ROOMS}
          className={({ isActive }) =>
            cn(
              "rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-line",
              isActive && "bg-line",
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
                  "text-ink transition-colors hover:bg-line",
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
                onClick={() => {
                  setAiOpen(false);
                }}
              >
                Bạn cùng phòng
              </Link>
              <Link
                to={ROUTES.AI_AREA_SUGGESTIONS}
                className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-tint"
                onClick={() => {
                  setAiOpen(false);
                }}
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
                isActive && "bg-line",
              )
            }
          >
            Đăng tin
          </NavLink>
        ) : null}
      </div>

      {/* Center: wordmark (Zillow puts the logo mid-header on desktop). */}
      <div className="flex items-center gap-3 justify-self-start lg:justify-self-center">
        <Link to={ROUTES.HOME} className="flex items-center" aria-label="TROSV trang chủ">
          <img src="/trosv-logo.svg" alt="TROSV" className="trosv-logo h-6 w-auto" />
        </Link>
      </div>

      {/* Right: account (always right-aligned). */}
      <div className="flex items-center gap-2 justify-self-end">
        {user ? (
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-line",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate",
                )}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Menu tài khoản"
              >
                <Avatar name={user.name} avatar={user.avatar} size={32} />
                <ChevronDown className="size-4 text-ink-2" aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" role="menu" className="w-auto min-w-44 p-1.5">
              <Link
                to={ROUTES.PROFILE}
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                }}
                className="block rounded-lg px-3 py-2 text-sm text-ink outline-none hover:bg-tint focus-visible:bg-tint"
              >
                Hồ sơ
              </Link>
              <div role="separator" className="my-1 h-px bg-line" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  void (async () => {
                    /** Logout closes the Echo socket via clearSession(). */
                    await logout();
                    toast("Đã đăng xuất.");
                    void navigate(ROUTES.HOME);
                  })();
                }}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-ink outline-none hover:bg-tint focus-visible:bg-tint"
              >
                <LogOut className="mr-2 inline size-4" aria-hidden />
                Đăng xuất
              </button>
            </PopoverContent>
          </Popover>
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
    <>
      <nav
        aria-label="Điều hướng nhanh"
        className={cn(
          "relative z-30 flex items-center justify-around bg-card border-t border-line lg:border-t-0 lg:border-r",
          "h-14 fixed bottom-0 left-0 right-0",
          "lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)] lg:w-16 lg:flex-col",
          "lg:items-center lg:justify-start lg:gap-4 lg:p-2",
          isConversationThread && "hidden lg:flex",
        )}
      >
        {items.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            aria-label={item.label}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "group relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
              "text-ink-2 hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate",
              item.active && "bg-plate-tint text-plate font-medium",
            )}
          >
            <item.icon className="size-5" />
            {item.badge != null && item.badge > 0 ? (
              <Badge
                className={cn("absolute -right-1 -top-1", item.active && "bg-plate text-white")}
              >
                {item.badge > 99 ? "99+" : item.badge}
              </Badge>
            ) : null}
            {/* Desktop-only hint, pure CSS (the link already has aria-label). */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 lg:block"
            >
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}

/* ---------- Shell ---------- */

/** Last scrollY per history entry (location.key), for Back/Forward restore. */
const scrollPositions = new Map<string, number>();
/** How long to keep retrying a restore while an async list is still loading. */
const RESTORE_WINDOW_MS = 6000;
const USER_INPUT_EVENTS = ["wheel", "touchstart", "keydown", "mousedown"] as const;

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

  /* Scroll handling. A new page starts at the top. Browser Back/Forward (POP)
     restores the position saved for that history entry, retrying for up to 2s
     because list pages load asynchronously and are short at first.
     Messages scroll inside their own containers, so they are left alone. */
  const navigationType = useNavigationType();
  React.useEffect(() => {
    if (isMessagesChat) return;
    window.history.scrollRestoration = "manual";
    /* Save at the moment of leaving (click or Back/Forward), before the next
       page renders and clamps scrollY. Scroll events would race with that. */
    const save = () => {
      scrollPositions.set(location.key, window.scrollY);
    };
    document.addEventListener("click", save, true);
    window.addEventListener("popstate", save, true);

    let raf = 0;
    if (navigationType !== NavigationType.Pop) {
      window.scrollTo(0, 0);
    } else {
      const target = scrollPositions.get(location.key) ?? 0;
      const started = performance.now();
      const restore = () => {
        window.scrollTo(0, target);
        if (
          Math.abs(window.scrollY - target) > 2 &&
          performance.now() - started < RESTORE_WINDOW_MS
        ) {
          raf = requestAnimationFrame(restore);
        }
      };
      if (target > 0) {
        restore();
        /* The user takes over: stop restoring as soon as they scroll or type. */
        for (const type of USER_INPUT_EVENTS) {
          window.addEventListener(type, stopRestore, { capture: true, once: true, passive: true });
        }
      }
    }
    function stopRestore() {
      cancelAnimationFrame(raf);
    }
    return () => {
      document.removeEventListener("click", save, true);
      window.removeEventListener("popstate", save, true);
      for (const type of USER_INPUT_EVENTS) {
        window.removeEventListener(type, stopRestore, { capture: true });
      }
      cancelAnimationFrame(raf);
    };
  }, [location.key, isMessagesChat, navigationType]);

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-paper",
        isMessagesChat && "h-dvh max-h-dvh overflow-hidden",
      )}
    >
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#main"
        className={cn(
          "sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50",
          "focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-paper",
        )}
      >
        Bỏ qua điều hướng
      </a>
      <Header />
      <div
        className={cn(
          "flex flex-1 flex-col lg:flex-row min-h-0",
          isMessagesChat && "overflow-hidden",
        )}
      >
        <Rail />
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col min-h-0 pb-14 lg:pb-0",
            (isConversationThread || isMessagesChat) && "pb-0",
            isMessagesChat && "overflow-hidden",
          )}
        >
          <main
            id="main"
            className={cn(
              "min-w-0 flex-1 flex flex-col min-h-0",
              isMessagesChat && "overflow-hidden",
              className,
            )}
          >
            <div
              key={isMessagesChat ? "messages" : location.pathname}
              data-testid="route-fade"
              className="animate-fade-in flex min-h-0 min-w-0 flex-1 flex-col"
            >
              {screenSuspense ?? <Outlet />}
            </div>
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
