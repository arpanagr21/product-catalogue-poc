import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { EnquiryDialog } from '@/components/enquiry/EnquiryDialog'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/format'
import { catalogueService } from '@/services/catalogue.service'
import type { Product } from '@/types/catalogue'

export function ProductPage() {
  const { id = '' } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true // Ignore the response if the user has already moved on.
    catalogueService.getProduct(id).then(
      (data) => {
        if (!current) return
        setProduct(data)
        setError(null)
      },
      (error) => current && setError(error),
    )
    return () => {
      current = false
    }
  }, [id, attempt])

  if (error) return <ErrorMessage error={error} onRetry={() => setAttempt((n) => n + 1)} />

  if (!product) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <Skeleton className="aspect-square rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    )
  }

  return (
    <article className="grid gap-8 md:grid-cols-2">
      <div className="relative aspect-square rounded-xl border bg-white">
        {product.image && (
          <img src={product.image} alt={product.title} className="absolute inset-0 size-full object-contain p-10" />
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Link to={`/categories/${product.category.slug}`}>
          <Badge variant="secondary">{product.category.name}</Badge>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{product.title}</h1>
        <div className="flex items-center gap-4">
          <span className="text-2xl font-semibold">{formatPrice(product.price, product.currency)}</span>
          {product.rating && (
            <span className="text-muted-foreground flex items-center gap-1 text-sm">
              <Star className="size-4 fill-amber-400 stroke-amber-400" />
              {product.rating.rate.toFixed(1)} ({product.rating.count} reviews)
            </span>
          )}
        </div>
        <p className="text-muted-foreground leading-relaxed">{product.description}</p>
        <div className="pt-2">
          <EnquiryDialog product={product} />
        </div>
      </div>
    </article>
  )
}
