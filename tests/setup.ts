import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom lacks matchMedia / ResizeObserver / scrollIntoView — provide the
// minimal shapes the app uses so components render deterministically.

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})

class NObs {
  cb: ResizeObserverCallback
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb
    // Fire once asynchronously with a zero-size entry so stacked fallbacks
    // and scale calculations settle in tests.
    setTimeout(() => this.cb([], this as unknown as ResizeObserver), 0)
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', { writable: true, value: NObs })

Element.prototype.scrollIntoView = function () {}
window.scrollTo = (() => {}) as unknown as typeof window.scrollTo

if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    writable: true,
    value: { writeText: () => Promise.resolve() },
  })
}
