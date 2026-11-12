import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const STORAGE_KEY = 'fashion_scroll_positions_v1';
const MAX_ENTRIES = 50;
const RESTORE_TIMEOUT_MS = 1800;

interface ScrollLocationState {
  keepScroll?: boolean;
}

function loadPositions(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function savePositions(positions: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    const keys = Object.keys(positions);
    if (keys.length > MAX_ENTRIES) {
      const excess = keys.slice(0, keys.length - MAX_ENTRIES);
      for (const k of excess) {
        delete positions[k];
      }
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Ignore storage quota errors
  }
}

const scrollPositions: Record<string, number> = loadPositions();

export default function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();

  const currentKeyRef = useRef<string>(location.key);
  const prevPathRef = useRef<string>(location.pathname);
  const prevSearchRef = useRef<string>(location.search);
  const isRestoringRef = useRef<boolean>(false);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (isRestoringRef.current) return;
      scrollPositions[currentKeyRef.current] = window.scrollY;
      if (saveTimer === null) {
        saveTimer = setTimeout(() => {
          saveTimer = null;
          savePositions(scrollPositions);
        }, 120);
      }
    };

    const handlePageHide = () => {
      if (!isRestoringRef.current) {
        scrollPositions[currentKeyRef.current] = window.scrollY;
      }
      savePositions(scrollPositions);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      if (saveTimer !== null) {
        clearTimeout(saveTimer);
      }
      savePositions(scrollPositions);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pagehide', handlePageHide);
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  useLayoutEffect(() => {
    // Flush previous route's scroll position to sessionStorage before switching key
    savePositions(scrollPositions);

    const prevPathname = prevPathRef.current;
    const prevSearch = prevSearchRef.current;

    currentKeyRef.current = location.key;
    prevPathRef.current = location.pathname;
    prevSearchRef.current = location.search;

    const state = (location.state as ScrollLocationState | null) || null;
    const keepScroll = Boolean(state?.keepScroll);

    // 1. Hash anchor navigation (#section)
    if (location.hash) {
      isRestoringRef.current = false;
      const rawId = location.hash.slice(1);
      let targetId = rawId;
      try {
        targetId = decodeURIComponent(rawId);
      } catch {
        // Keep rawId if malformed URI component
      }
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    // 2. Back / Forward navigation (POP) -> restore saved scrollY for this history entry
    if (navigationType === 'POP') {
      const targetY = scrollPositions[location.key] ?? 0;
      isRestoringRef.current = true;

      const canScrollToTarget = () => {
        const maxScroll = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight
        );
        return maxScroll >= targetY;
      };

      const applyRestore = () => {
        window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
      };

      applyRestore();

      if (targetY <= 0 || canScrollToTarget()) {
        const frameId = requestAnimationFrame(() => {
          applyRestore();
          isRestoringRef.current = false;
        });
        return () => cancelAnimationFrame(frameId);
      }

      // If page content is still loading asynchronously (skeleton/images), wait for DOM height growth
      let cancelled = false;
      const stopRestore = () => {
        if (cancelled) return;
        cancelled = true;
        isRestoringRef.current = false;
        observer.disconnect();
        clearTimeout(timeoutId);
        window.removeEventListener('wheel', stopRestore);
        window.removeEventListener('touchmove', stopRestore);
        window.removeEventListener('keydown', stopRestore);
      };

      const observer = new ResizeObserver(() => {
        if (cancelled) return;
        applyRestore();
        if (canScrollToTarget() && Math.abs(window.scrollY - targetY) <= 2) {
          stopRestore();
        }
      });

      observer.observe(document.body);
      window.addEventListener('wheel', stopRestore, { passive: true });
      window.addEventListener('touchmove', stopRestore, { passive: true });
      window.addEventListener('keydown', stopRestore, { passive: true });

      const timeoutId = setTimeout(() => {
        if (!cancelled) {
          applyRestore();
          stopRestore();
        }
      }, RESTORE_TIMEOUT_MS);

      return () => {
        stopRestore();
      };
    }

    // 3. Explicit in-page filter / tab switch (keepScroll flag)
    if (keepScroll) {
      isRestoringRef.current = false;
      scrollPositions[location.key] = window.scrollY;
      return;
    }

    // 4. Clicking a link to the exact same pathname + search -> smooth scroll to top
    if (prevPathname === location.pathname && prevSearch === location.search) {
      isRestoringRef.current = false;
      scrollPositions[location.key] = 0;
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      return;
    }

    // 5. Default PUSH / REPLACE to a new page -> instant jump to top
    isRestoringRef.current = false;
    scrollPositions[location.key] = 0;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.key, location.pathname, location.search, location.hash, location.state, navigationType]);

  return null;
}
