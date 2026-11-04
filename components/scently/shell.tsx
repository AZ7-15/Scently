"use client";
import Link from "@/components/scently/site-link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowRight,
  Check,
  GitCompareArrows,
  Menu,
  Search,
  Sparkles,
  Sprout,
  UserRound,
  X,
} from "lucide-react";
import {
  brandConfig,
  type CollectionStatus,
  type Fragrance,
} from "@/lib/domain";
export type Viewer = { id: string; name: string; admin: boolean } | null;
type Shelf = Record<string, CollectionStatus>;
const Context = createContext<{
  user: Viewer;
  region: string;
  compare: string[];
  comparedRecords: Fragrance[];
  shelf: Shelf;
  toggleCompare: (id: string, fragrance?: Fragrance) => void;
  save: (id: string, status: CollectionStatus | null) => Promise<void>;
  notify: (s: string) => void;
}>({
  user: null,
  region: "CA",
  compare: [],
  comparedRecords: [],
  shelf: {},
  toggleCompare: () => {},
  save: async () => {},
  notify: () => {},
});
export const useScently = () => useContext(Context);
export async function api<T = unknown>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      response.status === 401 || response.redirected
        ? "Your session expired. Sign in again to continue."
        : "The service did not respond correctly. Please try again.",
    );
  }
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
const subscribe = (callback: () => void) => {
  window.addEventListener("scently-storage", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("scently-storage", callback);
    window.removeEventListener("storage", callback);
  };
};
const memoryStorage = new Map<string, string>();
function readStored(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) || memoryStorage.get(key) || fallback;
  } catch {
    return memoryStorage.get(key) || fallback;
  }
}
function useStored(key: string, fallback: string) {
  return useSyncExternalStore(
    subscribe,
    () => readStored(key, fallback),
    () => fallback,
  );
}
function store(key: string, value: string) {
  memoryStorage.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Keep this tab usable when storage is restricted. */
  }
  window.dispatchEvent(new Event("scently-storage"));
}
function readCompared(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((x): x is string => typeof x === "string").slice(0, 3)
      : [];
  } catch {
    return [];
  }
}
function readComparedRecords(raw: string): Fragrance[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value
          .filter(
            (f) =>
              f &&
              typeof f.id === "string" &&
              typeof f.name === "string" &&
              typeof f.brand === "string" &&
              Array.isArray(f.notes) &&
              Array.isArray(f.accords) &&
              Array.isArray(f.offers),
          )
          .slice(0, 3)
      : [];
  } catch {
    return [];
  }
}
export function Shell({
  children,
  user,
  initialShelf,
}: {
  children: React.ReactNode;
  user: Viewer;
  initialShelf: Shelf;
}) {
  const path = usePathname(),
    [menu, setMenu] = useState(false),
    [notice, setNotice] = useState(""),
    [shelf, setShelf] = useState(initialShelf);
  const recordsRaw = useStored("scently-compare-records", "[]");
  const comparedRecords = readComparedRecords(recordsRaw);
  const compareRaw = useStored("scently-compare", "[]"),
    region = useStored("scently-region", "CA");
  const compare = readCompared(compareRaw);
  function notify(message: string) {
    setNotice(message);
  }
  function toggleCompare(id: string, fragrance?: Fragrance) {
    const current = readCompared(readStored("scently-compare", "[]"));
    if (current.includes(id)) {
      store(
        "scently-compare-records",
        JSON.stringify(
          readComparedRecords(
            readStored("scently-compare-records", "[]"),
          ).filter((f) => f.id !== id),
        ),
      );
      store("scently-compare", JSON.stringify(current.filter((x) => x !== id)));
    } else if (current.length < 3) {
      if (fragrance)
        store(
          "scently-compare-records",
          JSON.stringify(
            [
              ...readComparedRecords(
                readStored("scently-compare-records", "[]"),
              ).filter((f) => f.id !== id),
              fragrance,
            ].slice(-3),
          ),
        );
      store("scently-compare", JSON.stringify([...current, id]));
      notify("Added to your comparison.");
    } else notify("Compare up to three fragrances. Remove one to make room.");
  }
  async function save(id: string, status: CollectionStatus | null) {
    if (!user) {
      notify("Sign in to save fragrances to your personal shelf.");
      return;
    }
    try {
      await api("/api/collection", { fragranceId: id, status });
      setShelf((prev) => {
        const next = { ...prev };
        if (status) next[id] = status;
        else delete next[id];
        return next;
      });
      notify(
        status
          ? "Your shelf has been updated."
          : "Fragrance removed from your shelf.",
      );
    } catch (e) {
      notify((e as Error).message);
    }
  }
  const links = [
    ["Discover", "/"],
    ["Fragrances", "/fragrances"],
    ["Reviews", "/reviews"],
    ["AI Finder", "/finder"],
  ];
  return (
    <Context.Provider
      value={{
        user,
        region,
        compare,
        comparedRecords,
        shelf,
        toggleCompare,
        save,
        notify,
      }}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link
            className="wordmark"
            href="/"
            aria-label={brandConfig.name + " home"}
          >
            <Sprout size={25} strokeWidth={1.4} />
            {brandConfig.name.toLowerCase()}
            <span className="logo-dot">.</span>
          </Link>
          <nav
            className={menu ? "main-nav open" : "main-nav"}
            aria-label="Main navigation"
          >
            {links.map(([name, url]) => (
              <Link
                href={url}
                onClick={() => setMenu(false)}
                aria-current={path === url ? "page" : undefined}
                key={url}
              >
                {name === "AI Finder" && <Sparkles size={15} />} {name}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <label className="region-select">
              <span className="sr-only">Shopping region and currency</span>
              <select
                value={region}
                onChange={(e) => store("scently-region", e.target.value)}
              >
                <option value="CA">CA · CAD</option>
                <option value="US">US · USD</option>
              </select>
            </label>
            <Link
              className="icon-button search-link"
              href="/fragrances"
              aria-label="Search fragrances"
            >
              <Search size={19} />
            </Link>
            <Link className="account-link" href="/account">
              <UserRound size={18} />
              <span>My shelf</span>
            </Link>
            <button
              className="icon-button menu-button"
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
              aria-label={menu ? "Close menu" : "Open menu"}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="container footer-main">
          <div>
            <Link className="wordmark" href="/">
              <Sprout size={23} />
              {brandConfig.name.toLowerCase()}.
            </Link>
            <p>Browse fragrances and save your favorites.</p>
          </div>
          <nav aria-label="Footer">
            {[
              "About",
              "Data sources",
              "FAQ",
              "Contact",
              "Privacy",
              "Terms",
              "Affiliate disclosure",
            ].map((s) => (
              <Link
                key={s}
                href={"/info/" + s.toLowerCase().replaceAll(" ", "-")}
              >
                {s}
              </Link>
            ))}
          </nav>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} {brandConfig.name}. Discover
            thoughtfully.
          </span>
          <span>Made for curious noses.</span>
        </div>
      </footer>
      {compare.length > 0 && path !== "/compare" && (
        <aside className="compare-tray" aria-label="Selected comparisons">
          <GitCompareArrows size={18} />
          <span>{compare.length} selected</span>
          <Link href="/compare">
            Compare scents <ArrowRight size={15} />
          </Link>
          <button
            className="icon-button"
            onClick={() => store("scently-compare", "[]")}
            aria-label="Clear comparison"
          >
            <X size={16} />
          </button>
        </aside>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{notice}</span>
          {!user && notice.startsWith("Sign in") && (
            <a href="/login?return_to=/account" target="_top">
              Sign in
            </a>
          )}
          <button
            aria-label="Dismiss notification"
            className="icon-button"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
