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
import { LogOut, ChevronDown, Menu } from "lucide-react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useAuth } from "@/features/auth/context/AuthContext";
import { ROUTES, route } from "@/shared/constants/routes";
import { RailHomeIcon, RailHeartIcon, RailMessageIcon, RailBuildingIcon } from "@/shared/ui/icons";
import { Badge } from "@/shared/ui/badge";
import { Avatar } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import { toast } from "@/shared/ui/toast";
import { Footer } from "@/shared/layout/footer";
import { useUnreadCount } from "@/features/messaging/hooks/useUnreadCount";
import { AiChatWidget } from "@/features/ai/components/AiChatWidget";

/* ---------- Header ---------- */

const STUDENT_NAV_ITEMS = [
  { to: ROUTES.AI_ROOMMATES, label: "Tìm bạn cùng phòng" },
  { to: ROUTES.AI_AREA_SUGGESTIONS, label: "Gợi ý khu vực" },
] as const;

const ROOM_TYPES = [
  { label: "Tất cả phòng", type: null },
  { label: "Phòng trọ", type: "room" },
  { label: "Căn hộ", type: "apartment" },
  { label: "Nhà nguyên căn", type: "house" },
] as const;

function roomsHref(type: string | null): string {
  return type ? `${ROUTES.ROOMS}?type=${type}` : ROUTES.ROOMS;
}

interface MobileEntry {
  label: string;
  /** A plain link when `to` is set, otherwise an expandable group of `links`. */
  to?: string;
  links?: { label: string; to: string }[];
}

function mobileEntries(role: string | undefined): MobileEntry[] {
  const entries: MobileEntry[] = [
    { label: "Trang chủ", to: ROUTES.HOME },
    {
      label: role === "landlord" ? "Xem phòng" : "Tìm phòng",
      links: ROOM_TYPES.map((t) => ({ label: t.label, to: roomsHref(t.type) })),
    },
    { label: "Bản đồ", to: ROUTES.MAP },
  ];
  if (role === "student") entries.push({ label: "Gợi ý AI", links: [...STUDENT_NAV_ITEMS] });
  if (role === "landlord") {
    entries.push(
      { label: "Quản lý tin đăng", to: ROUTES.LANDLORD },
      { label: "Đăng tin mới", to: ROUTES.LANDLORD_NEW },
    );
  }
  return entries;
}

const MOBILE_ITEM =
  "block rounded-lg px-3 py-3 text-sm text-ink outline-none data-[highlighted]:bg-tint";

/** Phone menu (hamburger): same structure as the desktop header, groups expand in place. */
function MobileNavigation({ role }: { role: string | undefined }) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  return (
    <DropdownMenuPrimitive.Root
      onOpenChange={() => {
        setExpanded(null);
      }}
    >
      <DropdownMenuPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          aria-label="Menu điều hướng"
        >
          <Menu className="size-5" aria-hidden />
        </Button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          sideOffset={8}
          className="z-50 min-w-56 max-w-[calc(100vw-1.5rem)] rounded-xl border border-line bg-card p-1.5 shadow-pop lg:hidden"
        >
          {mobileEntries(role).map((entry) =>
            entry.to ? (
              <DropdownMenuPrimitive.Item key={entry.label} asChild>
                <Link to={entry.to} className={MOBILE_ITEM}>
                  {entry.label}
                </Link>
              </DropdownMenuPrimitive.Item>
            ) : (
              <div key={entry.label}>
                <DropdownMenuPrimitive.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    /* Not an updater: if Radix fires select twice for one tap, both calls agree. */
                    setExpanded(expanded === entry.label ? null : entry.label);
                  }}
                  className={cn(MOBILE_ITEM, "flex cursor-pointer items-center justify-between")}
                >
                  {entry.label}
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      expanded === entry.label && "rotate-180",
                    )}
                    aria-hidden
                  />
                </DropdownMenuPrimitive.Item>
                {expanded === entry.label
                  ? entry.links?.map((l) => (
                      <DropdownMenuPrimitive.Item key={l.to} asChild>
                        <Link
                          to={l.to}
                          className={cn(MOBILE_ITEM, "ml-3 border-l border-line pl-4")}
                        >
                          {l.label}
                        </Link>
                      </DropdownMenuPrimitive.Item>
                    ))
                  : null}
              </div>
            ),
          )}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

const NAV_ITEM =
  "rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-line";
const NAV_ACTIVE = "bg-plate font-semibold text-white hover:bg-plate-hover";

interface DropdownLink {
  label: string;
  to: string;
  current: boolean;
}

/** A header button that opens a small menu of links (Tìm phòng, Gợi ý AI). */
function NavDropdown({
  label,
  active,
  links,
}: {
  label: string;
  active: boolean;
  links: DropdownLink[];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(NAV_ITEM, "flex items-center gap-1", active && NAV_ACTIVE)}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {label}
          <ChevronDown className="size-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-52 bg-card p-2">
        {links.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            aria-current={item.current ? "page" : undefined}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm text-ink hover:bg-tint",
              item.current && "bg-plate-tint font-semibold text-plate",
            )}
            onClick={() => {
              setOpen(false);
            }}
          >
            {item.label}
          </Link>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** "Tìm phòng": all rooms, then the three room types. */
function RoomsMenu({ role }: { role: string | undefined }) {
  const { pathname, search } = useLocation();
  const roomType = new URLSearchParams(search).get("type");
  const onRooms = pathname === ROUTES.ROOMS;
  const links = ROOM_TYPES.map(({ label, type }) => ({
    label,
    to: roomsHref(type),
    current: onRooms && roomType === type,
  }));
  return (
    <NavDropdown
      label={role === "landlord" ? "Xem phòng" : "Tìm phòng"}
      active={onRooms}
      links={links}
    />
  );
}

/** "Gợi ý AI": one menu holding the roommate and area suggestions. */
function AiMenu() {
  const { pathname } = useLocation();
  const links = STUDENT_NAV_ITEMS.map((item) => ({
    label: item.label,
    to: item.to,
    current: pathname === item.to,
  }));
  return <NavDropdown label="Gợi ý AI" active={links.some((l) => l.current)} links={links} />;
}

function NavItem({ to, end, children }: { to: string; end?: boolean; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end ?? false}
      className={({ isActive }) => cn(NAV_ITEM, isActive && NAV_ACTIVE)}
    >
      {children}
    </NavLink>
  );
}

/** Centered main menu: Trang chủ, Tìm phòng (submenu), Bản đồ, then the role's own links. */
function MainNav({ role }: { role: string | undefined }) {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="col-start-2 hidden items-center justify-center gap-1 lg:flex"
    >
      <NavItem to={ROUTES.HOME} end>
        Trang chủ
      </NavItem>
      <RoomsMenu role={role} />
      <NavItem to={ROUTES.MAP}>Bản đồ</NavItem>
      {role === "student" ? <AiMenu /> : null}
      {role === "landlord" ? (
        <NavItem to={ROUTES.LANDLORD} end>
          Quản lý tin đăng
        </NavItem>
      ) : null}
    </nav>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  /* Keyboard/aria wiring for the navigation and account menus stays handled by Radix. */

  return (
    <header className="sticky top-0 z-30 grid h-[var(--nav-h)] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line bg-card px-3 sm:gap-6 sm:px-6">
      <div className="col-start-1 flex items-center gap-3">
        <MobileNavigation role={user?.role} />
        <Link to={ROUTES.HOME} className="flex shrink-0 items-center" aria-label="TROSV trang chủ">
          <img src="/trosv-logo.svg" alt="TROSV" className="trosv-logo h-7 w-auto sm:h-8" />
        </Link>
      </div>
      <MainNav role={user?.role} />

      {/* Right: account (always right-aligned). */}
      <div className="col-start-3 flex shrink-0 items-center gap-2 justify-self-end">
        {user?.role === "landlord" ? (
          <Button asChild size="sm" className="hidden px-3 text-sm lg:inline-flex">
            <Link to={ROUTES.LANDLORD_NEW}>Đăng tin mới</Link>
          </Button>
        ) : null}
        {user ? (
          <DropdownMenuPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuPrimitive.Trigger asChild>
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
                      "data-[highlighted]:bg-tint",
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
                    "data-[highlighted]:bg-tint flex items-center",
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
  /** Only in the bottom bar (phones); on desktop the header already has it. */
  mobileOnly?: boolean;
}

function RailItems(): (RailItem & { active: boolean })[] {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const unread = useUnreadCount();
  /** Student-only heart, landlord swaps it for a listings icon. */
  const isLandlord = user?.role === "landlord";
  const items: RailItem[] = [
    { to: ROUTES.HOME, label: "Trang chủ", icon: RailHomeIcon, badge: undefined, mobileOnly: true },
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
          "lg:sticky lg:top-[var(--nav-h)] lg:h-[calc(100vh-var(--nav-h))] lg:w-16 lg:flex-col",
          "lg:items-center lg:justify-start lg:gap-4 lg:p-2",
          isConversationThread && "hidden lg:flex",
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
                  item.mobileOnly && "lg:hidden",
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
