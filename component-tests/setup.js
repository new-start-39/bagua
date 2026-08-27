import { beforeEach } from 'vitest'

Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
  configurable: true,
  value() {},
})

beforeEach(() => {
  localStorage.clear()
})
