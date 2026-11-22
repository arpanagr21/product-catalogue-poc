import type { Category, Product } from '@/types/catalogue'

export const categories: Category[] = [
  { slug: 'electronics', name: 'Electronics' },
  { slug: 'jewelery', name: 'Jewelery' },
]

const make = (id: string, title: string, category: Category, rate: number): Product => ({
  id,
  title,
  description: `${title} description`,
  price: Number(id) * 10 + 0.99,
  currency: 'USD',
  image: `https://img.test/${id}.png`,
  category,
  rating: { rate, count: 100 },
})

const [electronics, jewelery] = categories

export const products: Product[] = [
  make('1', 'WD 2TB Hard Drive', electronics, 3.3),
  make('2', 'SanDisk SSD 1TB', electronics, 2.9),
  make('3', 'Gaming Monitor', electronics, 4.8),
  make('4', 'Gold Ring', jewelery, 4.6),
  make('5', 'Silver Bracelet', jewelery, 3.9),
  make('6', 'Pearl Necklace', jewelery, 2.1),
]

export const featuredIds = ['3', '4', '1', '5', '2']
