# Decisions and assumptions

The acceptance criteria leave some gaps, which I think is on purpose. Here's how I filled them,
what I cut, and why.

## Assumptions

### Home page: "I have chosen 5 products to be top rated"

I read "I" as the entrepreneur, so these are hand-picked, not calculated from ratings. That meant
someone needs a way to pick them, which is the only reason there's a login at all: it's an
admin login, and customers never sign in. Browsing and enquiries are fully public.

The picks live in our own `featured_products` table as provider product IDs plus a position. They
don't depend on Fake Store, so they'll survive a change of data source. It's exactly five
(configurable in `config/catalogue.php`), and the slot order is the home page order. The seed
uses the five highest-rated Fake Store products, so the home page isn't empty on first run. If a
picked product later disappears from the source, it's quietly skipped instead of breaking the page.

### The featured editor

My first version disabled the remaining checkboxes once five were picked. It worked, but it was
annoying to use, so I changed it:

- **Pagination happens on the server.** `/api/products` takes `page` and `per_page` and returns
  Laravel's standard `meta`/`links`. The page lives in the URL. Search results use the same
  endpoint and the same pagination component, so there's one way of paging across the app.
- **A full list asks before it changes anything.** Picking a sixth product opens a "which one
  should this replace?" dialog. The new product takes that slot's position and nothing else
  moves. Cancel leaves everything as it was.
- **Reordering uses ↑/↓ buttons.** I considered drag-and-drop, but buttons work from the keyboard
  and with screen readers, are easy to test and need no extra library. Drag-and-drop can go on top
  later if people want it.
- The rules themselves (add, remove, replace in place, move) are small pure functions in
  `frontend/src/lib/featured-selection.ts`, tested on their own. The page just wires them up.

One trade-off worth calling out: pagination currently slices the provider's full list in memory.
That's not laziness: Fake Store simply can't page. I checked: it only supports `?limit=N` (the
first N products) and `?sort=`. It ignores `page`, `offset` and `skip`, and returns no total count,
so there's no way to ask it for page 2. Fetching all 20 once, caching them and paging in our API is
the cheapest option. With 20 products that's fine. With a real catalogue, `page`/`per_page` should move into the
`ProductProvider` interface so the source does the paging. I didn't want to change the interface
for a problem we don't have yet.

### Category page: "top rated products for that category" plus "additional products"

"Top rated" here means up to three products. Any curated picks in that category come first, then
the remaining slots go to the highest-rated products by the provider's rating. Everything else in
the category follows below in the provider's order. Categories are built from the products
themselves, so you'll never see a category with nothing in it.

### Search: "only see products that have text matching that search term"

Search is case-insensitive and looks at the title, description and category. Every word you type
has to match, so "wd drive" gives you WD drives, not every drive in the shop. It only runs when
you click Search or press Enter, which is what the criterion describes, and the results have a
shareable URL (`/search?q=…`).

Search is a method on the provider interface rather than something bolted on afterwards. A
future provider with real search (Algolia, Shopify, a database) can use it directly. Fake Store
has no search, so its provider just filters in memory.

### Enquiry: "complete the subsequent form with my contact details"

Name and email are required; phone and a message are optional. The form opens in a dialog on the
product page, and the "Thank you" replaces the form once it's sent.

Two choices here I'd defend:
- Every enquiry is saved to the database before the email goes out, so a mail outage doesn't
  cost us a lead.
- The email's Reply-To is the customer, so sales can just hit reply.

The product title is stored with the enquiry too, because provider data can change underneath us.
And you can only enquire about a product that actually exists, so the email always names a real
product.

### Smaller things

- Fake Store doesn't say what currency its prices are in, so I assumed USD (it's configurable).
  There's no checkout, so prices are display-only.
- Product IDs are strings everywhere. Fake Store happens to use numbers, but most real sources
  use SKUs or UUIDs.

## What I cut or simplified

- **Pagination on the home and category pages.** Home is five products and a category tops out at
  six, so I only paginated the lists that can actually grow. The response shape leaves room to add
  it later without breaking anything.
- **Roles.** Anyone who can log in is an admin, and there's one, seeded from env. A role column is
  easy to add the day there's a second kind of user.
- **A real queue for email.** The Mailable is already queueable, but it runs with
  `QUEUE_CONNECTION=sync` so there's no worker container to babysit locally. Moving to SQS is a
  config change.
- **Bot protection.** Enquiries are rate-limited (5 a minute per IP), but there's no CAPTCHA. That
  would need a third-party account, which the brief rules out.
- **Production setup.** The Dockerfiles are for development only and there's no infrastructure
  code. The AWS mapping is below.
- **Browser tests in the repo.** I ran Playwright against the whole stack while building, but
  didn't commit it because it would add a browser download to the reviewer's setup. It's first on
  the "next" list.
- **A data-fetching library.** I first built the frontend on React Query, then took it out.
  Pages now call the services directly with `useState` + `useEffect`. For a handful of screens
  the library was more to learn than it saved. What that costs: no shared cache, so going back to
  a page fetches it again, and no automatic retries (there's a "Try again" button instead). If
  the app grows enough for those to matter, it can go back in behind the same services.
- **Look and feel.** It's shadcn's neutral theme for now. The creative work is still in progress,
  and the theme is just CSS variables in `frontend/src/index.css`.

## How it grows past the PoC

The brief names three things that will change, and each one has a single place to change it:

1. **The data source.** There's one interface, `ProductProvider` (`all`, `find`, `search`), and
   one `ProductService` that gets a provider injected. Which provider is picked by a plain map in
   `config/catalogue.php` (name => class), selected with `CATALOGUE_PROVIDER`. A missing or unknown
   name falls back to Fake Store. A new source is one class in `app/ProductProviders/` plus one
   line in that map. Nothing else needs to know: the service, controllers, API and frontend only
   ever see our own `Product` and `Category`. `ProviderSwapTest` registers a completely different
   provider through the map and checks the whole API serves its data.
   The first version had its own service provider class, a separate API resource layer and a
   featured-products class. I cut all of that. A name-to-class map that anyone can read in ten
   seconds is all one data source needs.
2. **Look and feel.** The UI components are our own source files, the theme is CSS variables, the
   site name is in `lib/config.ts`, and the pages are built from a handful of shared pieces.
   Restyle those and you've restyled the app.
3. **Email.** No code at all, just `MAIL_MAILER=ses` (or Postmark, Resend or plain SMTP). The
   sales inbox is one env var.

A few other things I did with the future in mind:

- **The API is the contract, not Fake Store.** `Product` and `Category` define the JSON the
  frontend gets, and the TypeScript types mirror them. A mobile app could use the same API tomorrow.
- **A Fake Store outage doesn't take the shop down.** This happened during development: Docker's
  DNS hiccupped just as the 10-minute cache expired, and every page went to a 502. Now the
  provider keeps a last-known-good copy and serves it if a refresh fails (and logs the failure).
  You only get a 502 if we've never fetched anything at all.
- **Images go through our backend.** This one I found the hard way. Fake Store sends its images
  with `Cross-Origin-Resource-Policy: same-origin`, which means browsers refuse to show them on
  any other site. Every test passed, but every product tile was blank. Proxying through
  `/api/products/{id}/image` fixes it, keeps all product data behind our API as the brief asks,
  and can later become a redirect to S3/CloudFront without the frontend noticing.
- **I only abstracted where something will actually change.** The frontend has client → services
  → components, and the backend has a provider behind controllers. That's about it. For
  example, I was going to write a generic caching wrapper for providers, but only Fake Store
  needs caching, so it lives inside that provider.
- **AWS.** The PHP container is stateless, so it runs on Fargate (or Lambda via Bref). Then:
  Postgres to RDS, mail to SES, the queue to SQS, cache and sessions to ElastiCache, and the
  built frontend to S3 + CloudFront. If the shop and API end up on the same domain, the CORS and
  Sanctum settings shrink to that one domain.

## Security basics

- Admin auth is Sanctum's SPA mode: an HttpOnly session cookie (SameSite=Lax) plus the CSRF token.
  No tokens are stored anywhere JavaScript can read them, and the session is regenerated on login.
- CORS only allows the frontend's origin.
- Everything is validated on the server. The frontend validation is there for a nicer experience,
  not for safety. Login and enquiries are both rate-limited.
- Email templates escape whatever the customer typed, and there's a test for it. Upstream failures
  don't leak stack traces. The post-login redirect only accepts paths inside the app, so it can't
  be turned into an open redirect.
- There are no secrets in the repo. `.env.example` only holds local placeholders, and the dev
  admin password and the test-only app key are labelled as such.

## With another day

1. Commit the Playwright suite and run it, plus both unit suites, in GitHub Actions.
2. Production Dockerfiles and a minimal AWS deploy (ECS, RDS, SES), with a real queue worker.
3. A second provider backed by our own database. That proves the seam properly and lets the
   entrepreneur add their own products.
4. A simple enquiries view for sales, and a confirmation email to the customer.
5. Pre-rendered product pages and meta tags, so products can be shared and found by search engines.
6. Basic observability: structured logs, an alert when the catalogue source fails, and a health
   check that includes the upstream.
