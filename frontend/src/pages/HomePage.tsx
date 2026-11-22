import { ProductGrid, ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { ProductSection } from '@/components/catalogue/ProductSection'
import { QueryState } from '@/components/QueryState'
import { useFeaturedProducts } from '@/hooks/queries'
import { config } from '@/lib/config'

export function HomePage() {
  const featured = useFeaturedProducts()

  return (
    <ProductSection title="Top rated" description="Our hand-picked favourites.">
      <QueryState query={featured} loading={<ProductGridSkeleton count={config.featuredCount} />}>
        {(products) => <ProductGrid products={products} />}
      </QueryState>
    </ProductSection>
  )
}
