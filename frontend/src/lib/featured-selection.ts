import type { Product } from '@/types/catalogue'

/**
 * The admin's ordered featured picks. Pure functions, so the editor's
 * rules (capacity, replace-in-place, reorder) are trivially testable.
 */
export type Selection = readonly Product[]

const has = (selection: Selection, id: string) => selection.some((p) => p.id === id)

/** Append, unless already selected or at capacity (the caller then offers a replacement). */
export function add(selection: Selection, product: Product, capacity: number): Selection {
  return has(selection, product.id) || selection.length >= capacity ? selection : [...selection, product]
}

export function remove(selection: Selection, id: string): Selection {
  return selection.filter((p) => p.id !== id)
}

/** Put `product` in slot `index`, keeping every other slot's position. */
export function replaceAt(selection: Selection, index: number, product: Product): Selection {
  if (has(selection, product.id) || index < 0 || index >= selection.length) return selection
  return selection.map((p, i) => (i === index ? product : p))
}

/** Move the item at `from` by `offset` (-1 = up, +1 = down). */
export function move(selection: Selection, from: number, offset: number): Selection {
  const to = from + offset
  if (from < 0 || from >= selection.length || to < 0 || to >= selection.length) return selection
  const next = [...selection]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

export const sameOrder = (a: Selection, b: Selection) => a.length === b.length && a.every((p, i) => p.id === b[i].id)
