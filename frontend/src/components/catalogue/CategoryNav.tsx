import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import { catalogueService } from '@/services/catalogue.service'
import type { Category } from '@/types/catalogue'

export function CategoryNav() {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    // If categories fail to load, the nav simply stays empty.
    catalogueService.getCategories().then(setCategories).catch(() => {})
  }, [])

  return (
    <nav aria-label="Categories" className="flex gap-1 overflow-x-auto">
      {categories.map((category) => (
        <NavLink
          key={category.slug}
          to={`/categories/${category.slug}`}
          className={({ isActive }) =>
            cn(
              'text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
              isActive && 'bg-muted text-foreground font-medium',
            )
          }
        >
          {category.name}
        </NavLink>
      ))}
    </nav>
  )
}
