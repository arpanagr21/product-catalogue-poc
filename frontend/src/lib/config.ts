/** App-wide configuration. Branding lives here so the creative team's look and feel is one edit away. */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:47180',
  siteName: 'Catalogue',
  featuredCount: 5,
  pageSize: 10,
} as const
