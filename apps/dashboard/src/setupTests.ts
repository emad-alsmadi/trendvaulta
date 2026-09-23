import '@testing-library/jest-dom'

// jsdom ships no ResizeObserver, and recharts' ResponsiveContainer constructs one
// on mount — without this every chart test throws before its first assertion.
// jsdom also reports zero-size elements, so the observer reports a fixed box to
// give the charts something to lay out against.
if (!('ResizeObserver' in globalThis)) {
  class TestResizeObserver implements ResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}

    observe(target: Element) {
      this.callback(
        [
          {
            target,
            contentRect: { width: 640, height: 320 } as DOMRectReadOnly,
          } as ResizeObserverEntry,
        ],
        this,
      )
    }

    unobserve() {}
    disconnect() {}
  }

  globalThis.ResizeObserver = TestResizeObserver
}
