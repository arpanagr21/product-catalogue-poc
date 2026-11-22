import { NavLink } from 'react-router'
import { useCategories } from '@/hooks/queries'
import { cn } from '@/lib/utils'

export function CategoryNav() {
  const { data: categories = [] } = useCategories()

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
