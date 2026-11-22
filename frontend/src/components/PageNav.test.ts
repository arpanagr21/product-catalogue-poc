import { describe, expect, it } from 'vitest'
import { pageWindow } from './PageNav'

describe('pageWindow', () => {
  it('shows every page when there are few', () => {
    expect(pageWindow(1, 1)).toEqual([1])
    expect(pageWindow(2, 3)).toEqual([1, 2, 3])
  })

  it('shows first, last and neighbours with gaps', () => {
    expect(pageWindow(5, 12)).toEqual([1, 'gap', 4, 5, 6, 'gap', 12])
    expect(pageWindow(1, 12)).toEqual([1, 2, 'gap', 12])
    expect(pageWindow(12, 12)).toEqual([1, 'gap', 11, 12])
  })
})
