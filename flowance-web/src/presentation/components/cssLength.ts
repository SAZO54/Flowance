const FALLBACK_ROOT_FONT_SIZE = 16

function rootFontSize(): number {
  const documentElement = globalThis.document?.documentElement
  if (!documentElement || !globalThis.getComputedStyle) return FALLBACK_ROOT_FONT_SIZE
  const parsed = Number.parseFloat(globalThis.getComputedStyle(documentElement).fontSize)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_ROOT_FONT_SIZE
}

export function remToPx(rem: number): number {
  return rem * rootFontSize()
}

export function pxToRem(px: number): string {
  return String(px / rootFontSize()) + 'rem'
}
