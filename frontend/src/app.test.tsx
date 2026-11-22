import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { products } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { api, paginate, server } from '@/test/server'

/** One test per acceptance criterion, driven through the real routes, services and API client. */

const tileTitles = (section: HTMLElement) => within(section).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)

describe('Home page', () => {
  it('shows the 5 chosen top rated products, in order', async () => {
    renderApp('/')

    const section = await screen.findByRole('region', { name: 'Top rated' })
    await waitFor(() => expect(tileTitles(section)).toEqual(['Gaming Monitor', 'Gold Ring', 'WD 2TB Hard Drive', 'Silver Bracelet', 'SanDisk SSD 1TB']))
  })

  it('shows a retryable error when the catalogue is unavailable', async () => {
    server.use(http.get(api('/featured'), () => HttpResponse.json({ message: 'The product catalogue is temporarily unavailable.' }, { status: 502 })))
    const { user } = renderApp('/')

    expect(await screen.findByText('The product catalogue is temporarily unavailable.')).toBeInTheDocument()

    server.resetHandlers()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Gaming Monitor')).toBeInTheDocument()
  })
})

describe('Category page', () => {
  it('shows top rated products and additional products when a category link is clicked', async () => {
    const { user } = renderApp('/')

    await user.click(await screen.findByRole('link', { name: 'Jewelery' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Jewelery' })).toBeInTheDocument()
    expect(tileTitles(screen.getByRole('region', { name: 'Top rated' }))).toEqual(['Gold Ring'])
    expect(tileTitles(screen.getByRole('region', { name: 'More in Jewelery' }))).toEqual(['Silver Bracelet', 'Pearl Necklace'])
  })

  it('keeps showing the category clicked last when an earlier one answers late', async () => {
    let releaseJewelery!: () => void
    const jeweleryHeld = new Promise<void>((resolve) => (releaseJewelery = resolve))
    // Delay Jewelery, then fall through to the normal handler.
    server.use(http.get(api('/categories/jewelery'), () => jeweleryHeld.then(() => undefined)))
    const { user } = renderApp('/')

    await user.click(await screen.findByRole('link', { name: 'Jewelery' }))
    await user.click(screen.getByRole('link', { name: 'Electronics' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Electronics' })).toBeInTheDocument()

    releaseJewelery()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Electronics')
  })

  it('shows not found for an unknown category', async () => {
    renderApp('/categories/nope')

    expect(await screen.findByText('Category not found.')).toBeInTheDocument()
  })
})

describe('Search', () => {
  it('only shows products matching the term after clicking search', async () => {
    let searched: string | null = null
    server.use(
      http.get(api('/products'), ({ request }) => {
        searched = new URL(request.url).searchParams.get('q')
        return HttpResponse.json(paginate(products.filter((p) => p.title.includes('Gold'))))
      }),
    )
    const { user, router } = renderApp('/')

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), '  gold ')
    expect(searched).toBeNull() // nothing happens until the button is clicked
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByRole('heading', { name: 'Results for “gold”' })).toBeInTheDocument()
    expect(await screen.findByText('Gold Ring')).toBeInTheDocument()
    expect(screen.queryByText('Gaming Monitor')).not.toBeInTheDocument()
    expect(searched).toBe('gold')
    expect(router.state.location.search).toBe('?q=gold')
  })

  it('paginates results through the URL', async () => {
    server.use(http.get(api('/products'), ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
      return HttpResponse.json(paginate(products, page, 4))
    }))
    const { user, router } = renderApp('/search?q=a')

    expect(await screen.findByText('Showing 1–4 of 6')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Go to next page' }))

    expect(await screen.findByText('Showing 5–6 of 6')).toBeInTheDocument()
    expect(screen.getByText('Pearl Necklace')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=a&page=2')
  })

  it('says so when nothing matches', async () => {
    renderApp('/search?q=zzz')

    expect(await screen.findByText('No products match “zzz”.')).toBeInTheDocument()
  })
})

describe('Product page', () => {
  it('opens the product details when a product tile is clicked', async () => {
    const { user, router } = renderApp('/')

    await user.click(await screen.findByRole('link', { name: /Gold Ring/ }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Gold Ring' })).toBeInTheDocument()
    expect(screen.getByText('Gold Ring description')).toBeInTheDocument()
    expect(screen.getByText('$40.99')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/products/4')
  })
})

describe('Enquiry', () => {
  async function openEnquiry() {
    const result = renderApp('/products/4')
    await result.user.click(await screen.findByRole('button', { name: 'Enquire' }))
    return { ...result, dialog: await screen.findByRole('dialog') }
  }

  it('submits contact details and shows a thank you message', async () => {
    let body: unknown
    server.use(
      http.post(api('/enquiries'), async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ data: { id: 1 }, message: 'Thank you! Our sales team will be in touch shortly.' }, { status: 201 })
      }),
    )
    const { user, dialog } = await openEnquiry()

    await user.type(within(dialog).getByLabelText('Name'), 'Ada Lovelace')
    await user.type(within(dialog).getByLabelText('Email'), 'ada@example.com')
    await user.type(within(dialog).getByLabelText('Message (optional)'), 'In stock?')
    await user.click(within(dialog).getByRole('button', { name: 'Send enquiry' }))

    expect(await within(dialog).findByText('Thank you')).toBeInTheDocument()
    expect(within(dialog).getByText('Thank you! Our sales team will be in touch shortly.')).toBeInTheDocument()
    expect(body).toEqual({ product_id: '4', name: 'Ada Lovelace', email: 'ada@example.com', message: 'In stock?' })
  })

  it('validates contact details before sending', async () => {
    let sent = false
    server.use(http.post(api('/enquiries'), () => ((sent = true), HttpResponse.json({}))))
    const { user, dialog } = await openEnquiry()

    await user.type(within(dialog).getByLabelText('Email'), 'not-an-email')
    await user.click(within(dialog).getByRole('button', { name: 'Send enquiry' }))

    expect(await within(dialog).findByText('Enter your name.')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(sent).toBe(false)
  })

  it('shows server-side validation errors on the matching field', async () => {
    server.use(
      http.post(api('/enquiries'), () =>
        HttpResponse.json({ message: 'Invalid', errors: { email: ['That domain does not accept mail.'] } }, { status: 422 }),
      ),
    )
    const { user, dialog } = await openEnquiry()

    await user.type(within(dialog).getByLabelText('Name'), 'Ada')
    await user.type(within(dialog).getByLabelText('Email'), 'ada@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Send enquiry' }))

    expect(await within(dialog).findByText('That domain does not accept mail.')).toBeInTheDocument()
  })
})

describe('Admin', () => {
  it('sends guests to the login page and back after signing in', async () => {
    let loggedIn = false
    server.use(
      http.get(api('/user'), () =>
        loggedIn ? HttpResponse.json({ data: { id: 1, name: 'Admin', email: 'admin@example.com' } }) : HttpResponse.json({}, { status: 401 }),
      ),
      http.post(api('/login'), () => {
        loggedIn = true
        return HttpResponse.json({ data: { id: 1, name: 'Admin', email: 'admin@example.com' } })
      }),
    )
    const { user, router } = renderApp('/admin/featured')

    expect(await screen.findByText('Admin login')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Featured products' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/featured')
  })

  const asAdmin = () =>
    server.use(http.get(api('/user'), () => HttpResponse.json({ data: { id: 1, name: 'Admin', email: 'admin@example.com' } })))

  const slotTitles = () =>
    within(screen.getByRole('list', { name: 'Featured order' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent?.replace(/^#\d/, '').trim())

  function captureSave() {
    const saved: { body?: unknown } = {}
    server.use(
      http.put(api('/admin/featured'), async ({ request }) => {
        saved.body = await request.json()
        return HttpResponse.json({ data: [] })
      }),
    )
    return saved
  }

  it('reorders the featured products and saves the new order', async () => {
    asAdmin()
    const saved = captureSave()
    const { user } = renderApp('/admin/featured')

    await screen.findByText('Featured order (5/5)')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled() // nothing changed yet
    expect(screen.getByRole('button', { name: 'Move Gaming Monitor up' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Move Gaming Monitor down' }))
    expect(slotTitles()).toEqual(['Gold Ring', 'Gaming Monitor', 'WD 2TB Hard Drive', 'Silver Bracelet', 'SanDisk SSD 1TB'])
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved')).toBeInTheDocument()
    expect(saved.body).toEqual({ product_ids: ['4', '3', '1', '5', '2'] })
  })

  it('asks which product to replace when all slots are full, keeping its position', async () => {
    asAdmin()
    const saved = captureSave()
    const { user } = renderApp('/admin/featured')

    await user.click(await screen.findByRole('checkbox', { name: /Pearl Necklace/ }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('All 5 slots are taken')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Replace #3 WD 2TB Hard Drive' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(slotTitles()).toEqual(['Gaming Monitor', 'Gold Ring', 'Pearl Necklace', 'Silver Bracelet', 'SanDisk SSD 1TB'])
    expect(screen.getByRole('checkbox', { name: /Pearl Necklace/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /WD 2TB Hard Drive/ })).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Saved')
    expect(saved.body).toEqual({ product_ids: ['3', '4', '6', '5', '2'] })
  })

  it('cancelling the replace dialog changes nothing', async () => {
    asAdmin()
    const { user } = renderApp('/admin/featured')

    await user.click(await screen.findByRole('checkbox', { name: /Pearl Necklace/ }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('checkbox', { name: /Pearl Necklace/ })).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('removing frees a slot; Save needs all 5 filled', async () => {
    asAdmin()
    const { user } = renderApp('/admin/featured')

    await user.click(await screen.findByRole('button', { name: 'Remove Gold Ring' }))
    expect(screen.getByText('Featured order (4/5)')).toBeInTheDocument()
    expect(screen.getByText('Empty slot')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    await user.click(screen.getByRole('checkbox', { name: /Pearl Necklace/ })) // no dialog: there's room
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(slotTitles().at(-1)).toBe('Pearl Necklace')
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('pages through all products, keeping selections across pages', async () => {
    asAdmin()
    server.use(http.get(api('/products'), ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
      return HttpResponse.json(paginate(products, page, 3))
    }))
    const { user, router } = renderApp('/admin/featured')

    expect(await screen.findByText('Showing 1–3 of 6')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Gaming Monitor/ })).toBeChecked()
    expect(screen.queryByRole('checkbox', { name: /Pearl Necklace/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Page 2' }))

    expect(await screen.findByText('Showing 4–6 of 6')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Pearl Necklace/ })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Gold Ring/ })).toBeChecked()
    expect(router.state.location.search).toBe('?page=2')
  })
})
