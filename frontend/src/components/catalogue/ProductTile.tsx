import { Star } from 'lucide-react'
import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { formatPrice } from '@/lib/format'
import type { Product } from '@/types/catalogue'

export function ProductTile({ product }: { product: Product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Card className="h-full gap-0 overflow-hidden py-0 transition-shadow group-hover:shadow-md">
        <div className="relative aspect-square bg-white">
          {product.image && (
            <img src={product.image} alt="" loading="lazy" className="absolute inset-0 size-full object-contain p-6" />
          )}
        </div>
        <CardContent className="flex flex-1 flex-col gap-2 border-t p-4">
          <h3 className="line-clamp-2 text-sm font-medium group-hover:underline">{product.title}</h3>
          <div className="mt-auto flex items-center justify-between text-sm">
            <span className="font-semibold">{formatPrice(product.price, product.currency)}</span>
            {product.rating && (
              <span className="text-muted-foreground flex items-center gap-1" aria-label={`Rated ${product.rating.rate} out of 5`}>
                <Star className="size-3.5 fill-amber-400 stroke-amber-400" />
                {product.rating.rate.toFixed(1)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
