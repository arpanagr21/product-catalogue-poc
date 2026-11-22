import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { useState } from 'react'
import { ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { PageNav, usePageParam } from '@/components/PageNav'
import { ErrorMessage, QueryState } from '@/components/QueryState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useFeaturedProducts, useProducts, useSetFeatured } from '@/hooks/queries'
import { config } from '@/lib/config'
import { add, move, remove, replaceAt, sameOrder, type Selection } from '@/lib/featured-selection'
import type { Product } from '@/types/catalogue'

const capacity = config.featuredCount

export function AdminFeaturedPage() {
  const featured = useFeaturedProducts()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Featured products</h1>
        <p className="text-muted-foreground">
          Choose the {capacity} “top rated” products for the home page and put them in order.
        </p>
      </div>
      <QueryState query={featured} loading={<ProductGridSkeleton />}>
        {(current) => <FeaturedEditor initial={current} />}
      </QueryState>
    </div>
  )
}

function FeaturedEditor({ initial }: { initial: Product[] }) {
  const [saved, setSaved] = useState<Selection>(initial)
  const [selection, setSelection] = useState<Selection>(initial)
  const [replacing, setReplacing] = useState<Product | null>(null)
  const save = useSetFeatured()

  const isSelected = (id: string) => selection.some((p) => p.id === id)
  const dirty = !sameOrder(selection, saved)

  function update(next: Selection) {
    save.reset()
    setSelection(next)
  }

  function toggle(product: Product) {
    if (isSelected(product.id)) update(remove(selection, product.id))
    else if (selection.length < capacity) update(add(selection, product, capacity))
    else setReplacing(product) // Full: ask which slot it should take.
  }

  function onSave() {
    save.mutate(
      selection.map((p) => p.id),
      { onSuccess: () => setSaved(selection) },
    )
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
      <ProductPicker isSelected={isSelected} onToggle={toggle} />

      <Card className="lg:sticky lg:top-32">
        <CardHeader>
          <CardTitle>
            Featured order ({selection.length}/{capacity})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SelectedSlots selection={selection} onChange={update} />
          {save.isError && <ErrorMessage error={save.error} />}
          <div className="flex items-center justify-end gap-3">
            {!dirty && save.isSuccess && (
              <span className="text-sm text-emerald-700" role="status">
                Saved
              </span>
            )}
            {dirty && <span className="text-muted-foreground text-sm">Unsaved changes</span>}
            <Button onClick={onSave} disabled={selection.length !== capacity || !dirty || save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ReplaceDialog
        candidate={replacing}
        selection={selection}
        onReplace={(index) => {
          if (replacing) update(replaceAt(selection, index, replacing))
          setReplacing(null)
        }}
        onCancel={() => setReplacing(null)}
      />
    </div>
  )
}

/** Paginated list of every product, each with a featured checkbox. */
function ProductPicker({ isSelected, onToggle }: { isSelected: (id: string) => boolean; onToggle: (p: Product) => void }) {
  const page = usePageParam()
  const products = useProducts({ page })

  return (
    <QueryState query={products} loading={<Skeleton className="h-96" />}>
      {({ data, meta }) => (
        <div className="space-y-4">
          <ul className="divide-y rounded-lg border" aria-label="All products" aria-busy={products.isPlaceholderData}>
            {data.map((product) => {
              const checkboxId = `featured-${product.id}`
              return (
                <li key={product.id} className="flex items-center gap-4 p-3">
                  <Checkbox id={checkboxId} checked={isSelected(product.id)} onCheckedChange={() => onToggle(product)} />
                  <Thumbnail product={product} />
                  <label htmlFor={checkboxId} className="flex-1 cursor-pointer text-sm">
                    {product.title}
                    <span className="text-muted-foreground block text-xs">{product.category.name}</span>
                  </label>
                </li>
              )
            })}
          </ul>
          <PageNav meta={meta} />
        </div>
      )}
    </QueryState>
  )
}

/** The ordered slots: move up/down or remove. Empty slots are shown so capacity is obvious. */
function SelectedSlots({ selection, onChange }: { selection: Selection; onChange: (next: Selection) => void }) {
  return (
    <ol className="space-y-2" aria-label="Featured order">
      {Array.from({ length: capacity }, (_, index) => {
        const product = selection[index]
        if (!product) {
          return (
            <li key={`empty-${index}`} className="text-muted-foreground flex h-14 items-center gap-3 rounded-md border border-dashed px-3 text-sm">
              <Badge variant="outline">#{index + 1}</Badge> Empty slot
            </li>
          )
        }
        return (
          <li key={product.id} className="flex items-center gap-2 rounded-md border p-2">
            <Badge>#{index + 1}</Badge>
            <Thumbnail product={product} size="size-10" />
            <span className="line-clamp-2 flex-1 text-sm">{product.title}</span>
            <Button variant="ghost" size="icon-sm" aria-label={`Move ${product.title} up`} disabled={index === 0} onClick={() => onChange(move(selection, index, -1))}>
              <ArrowUp />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Move ${product.title} down`}
              disabled={index === selection.length - 1}
              onClick={() => onChange(move(selection, index, 1))}
            >
              <ArrowDown />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Remove ${product.title}`} onClick={() => onChange(remove(selection, product.id))}>
              <X />
            </Button>
          </li>
        )
      })}
    </ol>
  )
}

/** Shown when the admin picks a product while all slots are full. */
function ReplaceDialog({
  candidate,
  selection,
  onReplace,
  onCancel,
}: {
  candidate: Product | null
  selection: Selection
  onReplace: (index: number) => void
  onCancel: () => void
}) {
  return (
    <Dialog open={candidate !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>All {capacity} slots are taken</DialogTitle>
          <DialogDescription>Choose which product “{candidate?.title}” should replace. It will take that position.</DialogDescription>
        </DialogHeader>
        <ol className="space-y-2">
          {selection.map((product, index) => (
            <li key={product.id}>
              <Button
                variant="outline"
                aria-label={`Replace #${index + 1} ${product.title}`}
                className="h-auto w-full justify-start gap-3 py-2 text-left whitespace-normal"
                onClick={() => onReplace(index)}
              >
                <Badge>#{index + 1}</Badge>
                <Thumbnail product={product} size="size-10" />
                <span className="flex-1 text-sm">{product.title}</span>
              </Button>
            </li>
          ))}
        </ol>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function Thumbnail({ product, size = 'size-12' }: { product: Product; size?: string }) {
  return product.image ? <img src={product.image} alt="" className={`${size} shrink-0 bg-white object-contain`} /> : <div className={`${size} shrink-0`} />
}
