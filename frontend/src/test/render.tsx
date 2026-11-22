import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/routes'

/** Render the real app (routes, layout, services) at a URL, with the API mocked by MSW. */
export function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()

  render(<RouterProvider router={router} />)

  return { user, router }
}
