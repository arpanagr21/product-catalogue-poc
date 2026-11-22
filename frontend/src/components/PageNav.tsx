import type { MouseEvent } from 'react'
import { useSearchParams } from 'react-router'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/lib/utils'
import type { Paginated } from '@/types/catalogue'

/** Current page from the URL (`?page=`), so pages are linkable and work with Back. */
export function usePageParam(): number {
  const [params] = useSearchParams()
  const page = Number(params.get('page'))
  return Number.isInteger(page) && page > 0 ? page : 1
}

/** First, last, and current ±1, with gaps marked: 1 … 4 5 6 … 12 */
export function pageWindow(current: number, last: number): (number | 'gap')[] {
  const pages = [...new Set([1, current - 1, current, current + 1, last])].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b)
  return pages.flatMap((page, i) => (i > 0 && page - pages[i - 1] > 1 ? ['gap' as const, page] : [page]))
}

export function PageNav({ meta }: { meta: Paginated<unknown>['meta'] }) {
  const [params, setParams] = useSearchParams()
  const { current_page: current, last_page: last, from, to, total } = meta

  const paramsFor = (page: number) => {
    const next = new URLSearchParams(params)
    if (page === 1) next.delete('page')
    else next.set('page', String(page))
    return next
  }

  // Real hrefs keep links semantic (open in new tab); clicks navigate client-side.
  const linkProps = (page: number, disabled = false) => ({
    href: `?${paramsFor(page)}`,
    'aria-disabled': disabled || undefined,
    tabIndex: disabled ? -1 : undefined,
    className: cn(disabled && 'pointer-events-none opacity-50'),
    onClick: (event: MouseEvent) => {
      event.preventDefault()
      if (!disabled) setParams(paramsFor(page))
    },
  })

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
      <p className="text-muted-foreground text-sm">
        {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}
      </p>
      {last > 1 && (
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious {...linkProps(current - 1, current <= 1)} />
            </PaginationItem>
            {pageWindow(current, last).map((page, i) =>
              page === 'gap' ? (
                <PaginationItem key={`gap-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink {...linkProps(page)} isActive={page === current} aria-label={`Page ${page}`}>
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext {...linkProps(current + 1, current >= last)} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
