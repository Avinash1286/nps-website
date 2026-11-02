import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Reveal } from "@/components/site/reveal";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shares observation, reveals only intersecting content, and releases observers", () => {
  const callbacks: IntersectionObserverCallback[] = [];
  const observe = vi.fn();
  const unobserve = vi.fn();
  const disconnect = vi.fn();
  class Observer {
    constructor(callback: IntersectionObserverCallback) {
      callbacks.push(callback);
    }
    observe = observe;
    unobserve = unobserve;
    disconnect = disconnect;
  }
  vi.stubGlobal("IntersectionObserver", Observer);
  const { unmount } = render(
    <>
      <Reveal>First</Reveal>
      <Reveal>Second</Reveal>
    </>,
  );
  const first = screen.getByText("First");
  const second = screen.getByText("Second");
  expect(callbacks).toHaveLength(1);
  expect(observe).toHaveBeenCalledTimes(2);
  act(() =>
    callbacks[0](
      [
        { target: first, isIntersecting: true },
        { target: second, isIntersecting: false },
      ] as unknown as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    ),
  );
  expect(first).toHaveClass("is-visible");
  expect(second).not.toHaveClass("is-visible");
  expect(disconnect).not.toHaveBeenCalled();
  unmount();
  expect(disconnect).toHaveBeenCalledTimes(1);
  render(<Reveal>New page</Reveal>);
  expect(callbacks).toHaveLength(2);
  act(() =>
    callbacks[1](
      [{ target: screen.getByText("New page"), isIntersecting: true }] as unknown as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    ),
  );
  expect(screen.getByText("New page")).toHaveClass("is-visible");
  expect(disconnect).toHaveBeenCalledTimes(2);
});
