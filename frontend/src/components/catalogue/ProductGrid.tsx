import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/types/catalogue'
import { ProductTile } from './ProductTile'

const gridClass = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'

export function ProductGrid({ products, emptyMessage = 'No products to show.' }: { products: Product[]; emptyMessage?: string }) {
  if (products.length === 0) return <p className="text-muted-foreground py-8 text-center">{emptyMessage}</p>

  return (
    <ul className={gridClass}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductTile product={product} />
        </li>
      ))}
    </ul>
  )
}

export function ProductGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className={gridClass} aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
      ))}
    </div>
  )
}
