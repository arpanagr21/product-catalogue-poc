import { describe, expect, it } from 'vitest'
import { products } from '@/test/fixtures'
import { add, move, remove, replaceAt, sameOrder } from './featured-selection'

const [a, b, c, d] = products
const ids = (s: readonly { id: string }[]) => s.map((p) => p.id)

describe('featured selection', () => {
  it('adds to the end until capacity, never duplicating', () => {
    expect(ids(add([a], b, 3))).toEqual(['1', '2'])
    expect(ids(add([a, b], a, 3))).toEqual(['1', '2'])
    expect(ids(add([a, b, c], d, 3))).toEqual(['1', '2', '3'])
  })

  it('replaces a slot in place, keeping the other positions', () => {
    expect(ids(replaceAt([a, b, c], 1, d))).toEqual(['1', '4', '3'])
  })

  it('ignores replacing with an already-selected product or a bad index', () => {
    expect(ids(replaceAt([a, b, c], 0, c))).toEqual(['1', '2', '3'])
    expect(ids(replaceAt([a, b, c], 5, d))).toEqual(['1', '2', '3'])
  })

  it('moves items up and down, stopping at the ends', () => {
    expect(ids(move([a, b, c], 2, -1))).toEqual(['1', '3', '2'])
    expect(ids(move([a, b, c], 0, 1))).toEqual(['2', '1', '3'])
    expect(ids(move([a, b, c], 0, -1))).toEqual(['1', '2', '3'])
    expect(ids(move([a, b, c], 2, 1))).toEqual(['1', '2', '3'])
  })

  it('removes and compares order', () => {
    expect(ids(remove([a, b, c], '2'))).toEqual(['1', '3'])
    expect(sameOrder([a, b], [a, b])).toBe(true)
    expect(sameOrder([a, b], [b, a])).toBe(false)
  })
})
