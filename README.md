# Product Catalogue

A small catalogue: customers browse, search, open a product and send an enquiry, which lands in
the sales inbox as an email. An admin picks the five "top rated" products for the home page.

It's a PoC, but I didn't want to build a throwaway. The three things the brief says will change
(where product data comes from, how it looks, which email provider sends the mail) each sit
behind one seam, so swapping them doesn't ripple through the codebase. More on that in
[DECISIONS.md](DECISIONS.md).

## Stack

- **Frontend:** React 19 + TypeScript on Vite, shadcn/ui (Tailwind v4), TanStack Query, React Router
- **Backend:** Laravel 13 on PHP 8.5, Sanctum for cookie-based auth
- **Data:** Fake Store API behind a `ProductProvider` interface; Postgres for our own stuff
  (featured picks, enquiries, the admin user, sessions)
- **Email:** Laravel Mail. Mailpit catches it locally; SES or any SMTP provider in production is
  just env config.

Why Laravel: validation, mail, queues, rate limiting, CSRF-protected cookie auth and a solid test
setup all come built in, so the time goes into the product rather than plumbing. React + TS gives
us a typed contract with the API. I went with shadcn because the components live in our repo as
plain source files, so when the creative work lands we can restyle freely instead of fighting a
component library. Everything is containerised and maps straight onto AWS (Fargate or Lambda via
Bref, RDS, SES, S3 + CloudFront).

## Running it

You only need Docker. No PHP or Node on your machine.

```bash
docker compose up --build
```

The first run takes a couple of minutes while Composer and npm install inside the containers.
After that it starts in seconds. Once the frontend logs `VITE ready`:

| | |
|---|---|
| Shop | http://localhost:47173 |
| Admin | http://localhost:47173/login (`admin@example.com` / `password`) |
| Mailpit (enquiry emails show up here) | http://localhost:47125 |
| API | http://localhost:47180/api/featured |

Use `localhost`, not `127.0.0.1`. The browser treats them as different sites, and the admin
login cookie won't be sent if you mix the two.

You don't need a `.env`: every setting has a default in `docker-compose.yml`. If a port clashes or
you want different credentials, `cp .env.example .env` and edit it. The CORS and Sanctum
settings are built from the port values, so they follow automatically. I put the ports in the
47xxx range so they're unlikely to collide with whatever else you're running.

To start from scratch (this wipes the database volume too):

```bash
docker compose down -v
```

## Choosing the featured products

Sign in at `/login`, then click **Manage featured** in the footer.

The left side lists every product, 10 per page. The page number is in the URL, so Back works and
you can link to a page. Ticks stay put as you move between pages. The right side shows the five
slots in home page order: ↑/↓ moves a product and ✕ removes it.

If all five slots are full and you tick another product, you get a dialog asking which one it
should replace. The new product takes that exact slot, and nothing else moves. Save only lights
up when all five slots are filled and something has changed. The API checks the same rules
(exactly five, no duplicates, all real products), so the UI isn't the only safeguard.

## Tests

With the stack running:

```bash
docker compose exec backend php artisan test    # 42 tests
docker compose exec frontend npm test           # 29 tests
docker compose exec frontend npm run typecheck
```

Neither suite touches the network. The backend stubs the upstream HTTP calls and fails on
anything it hasn't stubbed. The frontend runs against an MSW fake of our API and fails on any
request it doesn't recognise. The frontend tests drive the real routes, services and API client,
with one test per acceptance criterion in `src/app.test.tsx`.

## How it's put together

```
 Browser ── React SPA ──────────────────────►  Laravel API ──► ProductService ──► ProductProvider ──► Fake Store API
           pages → hooks (React Query)          controllers                       (interface)        (swappable)
                 → services → apiClient              │
                   (cookies, CSRF, errors)           ├─► Postgres: featured picks, enquiries, users, sessions
                                                     └─► Mailer: Mailpit (dev) / SES or SMTP (prod)
```

**Backend.** It's deliberately simple: one interface, one service, and providers you can swap in.

- `app/Contracts/ProductProvider.php` is the interface, with just three methods: `all`, `find`
  and `search`.
- `config/catalogue.php` maps a name to a class (`'fakestore' => FakeStoreProvider::class`), and
  `CATALOGUE_PROVIDER` picks the name. A few lines in `AppServiceProvider::register()` look it up
  and bind it to the interface. A missing or unknown name falls back to Fake Store.
- `app/ProductProviders/FakeStoreProvider.php` is the only file that knows Fake Store exists. It
  caches, times out, retries, and maps the data into our own `app/Data/Product` and `Category`. If
  a refresh fails, it serves the last good copy. You only see a 502 if we've never had any data.
- `app/Services/ProductService.php` is what the controllers use, with the provider injected. It
  handles categories, paging and search, the category page's "top rated" split, the featured
  picks and the image proxy.
- `app/Http/Controllers/Api/CatalogueController.php` is a thin layer on top. FormRequests
  validate the input, and the data objects serialise themselves to JSON.

**Frontend.** The rule is that components never call `fetch`:
- `lib/api/client.ts` is the one place requests go out. It handles the base URL, cookies, CSRF
  (including one retry if the token has expired), and turns errors into a typed `ApiError`.
- `services/` wraps the client per area: catalogue, enquiry, auth and admin.
- `hooks/queries.ts` wraps the services in React Query.
- Pages and components only use those hooks.

### API

| | | |
|---|---|---|
| GET | `/api/featured` | The five curated products, in order |
| GET | `/api/categories` | `[{slug, name}]` |
| GET | `/api/categories/{slug}` | `{category, top_rated[], products[]}` |
| GET | `/api/products?q=&page=&per_page=` | Paginated list or search results (10 per page by default, 50 max). Laravel's usual `meta` and `links` |
| GET | `/api/products/{id}` | One product |
| GET | `/api/products/{id}/image` | The product image, proxied (see DECISIONS.md for why) |
| POST | `/api/enquiries` | `{product_id, name, email, phone?, message?}`. 5 a minute per IP |
| GET | `/sanctum/csrf-cookie` | Sets the XSRF cookie (the client handles this) |
| POST | `/api/login`, `/api/logout` | Admin session. Login is limited to 5 a minute |
| GET | `/api/user` | The signed-in admin, or 401 |
| PUT | `/api/admin/featured` | `{product_ids: [...5]}`. Admin only |

Errors are always JSON, `{message, errors?}`: 404, 422 for validation, 401, 429 when
rate-limited, and 502 when the catalogue source is unavailable.

## Other docs

- [DECISIONS.md](DECISIONS.md): assumptions, what I cut, how this grows, and what I'd do next
- [AI_USAGE.md](AI_USAGE.md): how I used AI on this, including where it went wrong
- [CLAUDE.md](CLAUDE.md): instructions for coding agents working in the repo
