import { afterEach, beforeEach, expect, it, vi } from "vitest";

// No DOM renderer is installed. Simulate React's state/effect dependency and
// cleanup boundaries while exercising the real hook and fake timers.
const h = vi.hoisted(() => ({
  value: undefined as unknown, initialized: false, deps: undefined as unknown[] | undefined,
  cleanup: undefined as (() => void) | undefined,
}));
vi.mock("react", () => ({
  useState: (initial: unknown) => {
    if (!h.initialized) { h.value = typeof initial === "function" ? initial() : initial; h.initialized = true; }
    return [h.value, (next: unknown) => { h.value = typeof next === "function" ? next(h.value) : next; }];
  },
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => {
    if (h.deps && deps.every((v, i) => Object.is(v, h.deps![i]))) return;
    h.cleanup?.(); h.deps = deps; h.cleanup = effect() || undefined;
  },
}));
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
beforeEach(() => { vi.useFakeTimers(); h.value = undefined; h.initialized = false; h.deps = undefined; h.cleanup = undefined; });
afterEach(() => { h.cleanup?.(); vi.useRealTimers(); });

it("returns the initial value immediately and changes only after 300ms", () => {
  expect(useDebouncedValue("a", 300)).toBe("a");
  expect(useDebouncedValue("ab", 300)).toBe("a");
  vi.advanceTimersByTime(299); expect(useDebouncedValue("ab", 300)).toBe("a");
  vi.advanceTimersByTime(1); expect(useDebouncedValue("ab", 300)).toBe("ab");
});
it("cancels superseded timers rather than exposing intermediate text", () => {
  useDebouncedValue("a", 300); useDebouncedValue("ab", 300);
  vi.advanceTimersByTime(200); useDebouncedValue("abc", 300);
  vi.advanceTimersByTime(299); expect(useDebouncedValue("abc", 300)).toBe("a");
  vi.advanceTimersByTime(1); expect(useDebouncedValue("abc", 300)).toBe("abc");
});
it("cleans up on unmount", () => {
  useDebouncedValue("a", 300); useDebouncedValue("ab", 300);
  h.cleanup?.(); expect(vi.getTimerCount()).toBe(0);
});
it("preserves function values without invoking them as state updaters", () => {
  const first = vi.fn(), second = vi.fn();
  expect(useDebouncedValue(first, 300)).toBe(first);
  useDebouncedValue(second, 300); vi.advanceTimersByTime(300);
  expect(useDebouncedValue(second, 300)).toBe(second);
  expect(first).not.toHaveBeenCalled(); expect(second).not.toHaveBeenCalled();
});
