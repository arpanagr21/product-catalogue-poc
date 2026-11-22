# How I used AI on this

## Tools

I built this with **Claude Code** (the CLI) running **Claude Opus 5.5**. It did the planning,
scaffolding, most of the typing, the tests, running everything in Docker, and first drafts of
these docs. For real-browser checks I had it drive **Playwright** against the running stack and
take screenshots. Those screenshots ended up catching the biggest bug in the project.

The way I worked: I set the direction (stack, architecture rules, auth model, dev setup), let it
build in small steps, and kept pushing back when something didn't feel right. When a decision was
genuinely open, it asked me instead of guessing.

## Agent instruction files

[`CLAUDE.md`](CLAUDE.md) at the root is committed. It tells an agent the architecture rules (only
the API client calls `fetch`, only the provider knows about Fake Store, and so on), how to run
things, and that everything runs in Docker.

One thing worth mentioning: the fresh Laravel skeleton came with its own `CLAUDE.md` and
`AGENTS.md`. Those tell an agent to install PHP on the host via `curl … | bash` and to install
Laravel Boost. That's the opposite of the Docker-only setup I wanted, and the agent flagged it
instead of blindly following it. I deleted both files.

## The plan

I didn't let it write code straight away. I gave it the requirements and asked for a plan first.
It came back with a draft and four questions. After my answers, the plan was:

- Laravel API, React + TypeScript + shadcn frontend, DRY, with abstraction where it earns its
  place and no more
- Fake Store behind an interface, so providers can be swapped or added later
- Frontend layering: one base API client, services on top of it, and every API call goes through
  a service
- Cookie-based auth using Sanctum's SPA mode, for an admin who curates the five featured products
  (stored in our own DB), on Postgres
- Docker Compose with everything pre-wired, ports that won't clash, and CORS handled through env

Then it built in this order: Docker and the backend (provider, endpoints, tests), then the
frontend (client, services, hooks, pages, tests), then browser checks, then docs.

## Hero prompts

These are copied exactly as I typed them, typos and all. These are the prompts that actually
shaped the project.

**1. The brief** (the first real message, after I stopped it from jumping straight into code)

> we will plan first, i will give you initial requiremnents and all my instructions
>
> i want to build a php laravel backend which uses a react frontend that would be based on typescript
> we will be making login functionality along with token auth which would be cookie based
>
> i want the app to be following DRY principles
>
> we will do abstraction, but not over abstraction, we prefer simplicity over overabstraction, and also reusability where needed, a good balance is needed
>
> the react frontend will be communicating to laravel app using APIs mostly
>
> we will be using https://fakestoreapi.com/ as our primary data source, that would be built on top of an interface, so that providers are interchangable later, and other such providers can also be added
>
> *(…the acceptance criteria pasted in…)*
>
> the frontend will have a base api client, that will take care of auth abstraction and stuff, and then there will be services built on top of base api client, that will be used to interact with the backend, every api call goes through some service and service abstracted on top of api client
>
> ui will be built on latest react on top of shadcn

This set the shape of the whole thing. The "not over abstraction" line came up again later: the
plan had a generic caching wrapper for providers, and we dropped it because only Fake Store needs
caching.

**2. The four questions it asked back**

Login scope, auth mechanism, where "top rated" comes from, and which database. My answers were:
admin-only login to curate the featured products, Sanctum SPA cookies, a curated list in our DB,
and Postgres. This is what turned a vague "add login" into something that actually serves an
acceptance criterion.

**3. The dev setup**

> the setup will be as follows, we will have a docker compose set up along with frontend and backend service for dev environment, already wired up with a db container in built with the docker compose, use random ports so it doesnt conflict with ports on the interviewer, and properly set envs for cors so it doesnt bother us

It had planned a Vite proxy to sidestep CORS. This changed it to real cross-origin calls, with
every CORS and Sanctum value derived from the same port variables so they can't drift apart. It
went with fixed but unusual ports (47xxx) instead of truly random ones, so the README can give the
reviewer actual URLs. That's what I wanted anyway.

**4. Testing in a real browser**

> just open the admin panel and user panel for me ill test and you can also tets using playwright

This is the one that paid off most. The Playwright run passed every check, but the screenshots
showed blank boxes where every product image should be. More on that below.

**5. Fixing the admin editor**

> proper paginated set for the thing, where we set featured products, and also i need proper replace what item if it exceeds capacity

> with reordering

The first version just disabled the checkboxes once five were picked, which wasn't good enough.
This got us server-side pagination (shared with search), a "which one should this replace?"
dialog, and up/down reordering, with the rules kept as small tested functions.

**6. Writing it down**

> mention this in a file proper, some file

Small, but it's why the editor behaviour and its trade-offs are written up in the README and
DECISIONS.md rather than living only in the code.

**7. Questioning an assumption**

> fakestopre api might alreayd have pagiantion

Worth checking rather than assuming either way. It probed the live API: only `?limit=N` and
`?sort` work, while `page`, `offset` and `skip` are silently ignored and there's no total count.
So paging in our own API was the right call, and DECISIONS.md now says why.

**8. Cutting the backend down**

> make it service based instead of having whole service providser and colection layer and all that, i need simple, one interface and product srvice wehre diferent providers can be injected

> i wanna keep it super simple

> i dont think it all belongs to the same services folder restaructure and fix things

The first backend had its own service provider class, a separate API resource layer, and a
featured-products class alongside. All of it worked, but it was more machinery than one data
source needs. Now there's one interface, one `ProductService` that gets the provider injected, and
one controller. Its first pass at the refactor dumped everything into a single
`Services/Catalogue` folder; the third prompt split it into the usual Laravel places (`Contracts`,
`ProductProviders`, `Services`, `Data`, `Exceptions`).

**9. Picking the provider in a way I can explain**

> i just want a simple config string -> provider class mapper with a default fallback bro, simple and ik how it works

After the refactor it was using a `#[Bind]` attribute on the interface. That's clever, but it's a
bit of framework magic, and the interface ended up naming its own implementation. Now it's a plain
map in `config/catalogue.php` (`'fakestore' => FakeStoreProvider::class`), with `CATALOGUE_PROVIDER`
choosing the name and Fake Store as the fallback. The lookup is about four lines in
`AppServiceProvider`, simple enough to explain on a whiteboard.

## Where it got things wrong

The big one first. **Every product image was blank.** Fake Store sends
`Cross-Origin-Resource-Policy: same-origin`, so browsers won't display its images on another site.
All 50 tests at the time passed, and so did the Playwright assertions. Only the screenshots gave
it away, and a `curl -I` on an image confirmed the header. The fix was a small image proxy in the
backend, which also fits the brief's "all product data through your backend" rule. Lesson for me:
look at the screenshots, don't just trust green ticks.

The second one is about design, not bugs: **it over-built the backend at first.** It had a
dedicated service provider class, an API resource layer and an extra featured-products class,
which is the kind of over-abstraction I'd explicitly said I didn't want. I had it strip that back
to one interface and one service (hero prompt 8). Then it swung a little too clever the other way
with a `#[Bind]` attribute, and I asked for a plain config map instead (hero prompt 9).

The rest, roughly in the order they happened:

- **Tests were quietly hitting the wrong database.** `phpunit.xml` used `<env force="true">`, but
  Laravel reads `$_SERVER` first, and the container's `DB_CONNECTION=pgsql` won. The first test run
  failed trying to reach Postgres. Switching to `<server>` fixed it.
- **A test that couldn't fail.** In Laravel, stacking `Http::fake()` calls means the first stub
  wins, so the "upstream is down" test was still getting the healthy data. It showed up as a 200
  where a 502 was expected. A small helper now swaps the fake instead of stacking it.
- **Test safety net switched off without anyone noticing.** It configured MSW with
  `onUnhandledRequest: 'error'`, but MSW 3 renamed that option to `onUnhandledFrame`, so
  unmocked requests wouldn't have failed anything. The TypeScript check caught it.
- **Asserting the wrong thing.** One test checked `credentials` on MSW's copy of the request,
  which doesn't keep that field. The code was right and the test was wrong. It now checks what was
  actually passed to `fetch`.
- **Broken file from a quick edit.** A `sed` one-liner put a comment in front of a closing bracket
  in the test setup. The tests and the linter both caught it straight away.
- **Accessible names on the replace buttons.** The names were assembled from a badge plus hidden
  text and didn't come out the way screen readers (or the tests) expected. Each button now has an
  explicit `aria-label`.
- **A Playwright false alarm.** The browser check said the featured order changed after a reload.
  The screenshots said otherwise. The script was waiting for "Saved", and Playwright matched that
  inside "Unsaved changes". It also read the list while the dialog was still closing. Fixing the
  script made everything pass.
- **npm failing on my machine.** "No matching version" errors turned out to be my npm config's
  `prefer-offline` serving a stale cache. It installed using a throwaway cache rather than touching
  my global settings.

- **A refactor that "broke" the images.** Right after the backend simplification, the browser
  run showed every image blocked. It looked like a regression, but the backend logs said `Could
  not resolve host: fakestoreapi.com`: Docker's DNS had a blip just as the cache expired. Not our
  bug, but it showed one upstream hiccup could take the whole shop down, so the provider now
  serves its last good copy when a refresh fails.

A few smaller course corrections: it dropped `SESSION_DOMAIN=localhost` (cookies ignore ports,
so a host-only cookie is correct), added `--no-reload` so the PHP dev server actually uses
multiple workers, and stuck with PHPUnit since it was already in the skeleton, even though the
plan said Pest.

## How I checked the work

The main thing I did in review was **simplify the backend**. The first version worked, but when I
read through it, it had more layers than a single data source needs: its own service provider
class, a separate API resource layer, and a featured-products class next to everything else. I cut
it down to something I can explain in a minute:

- **one interface**, `ProductProvider`, with just `all`, `find` and `search`
- **one service**, `ProductService`, which the controllers use and which gets a provider injected
- **a plain config map** (`'fakestore' => FakeStoreProvider::class`) with `CATALOGUE_PROVIDER`
  picking the name and Fake Store as the fallback. It's a few readable lines rather than framework
  attributes.
- the usual Laravel folders (`Contracts`, `ProductProviders`, `Services`, `Data`, `Exceptions`)
  instead of one catch-all folder

Other places I pushed back:
- the dev setup: ports that won't clash and CORS driven by env, instead of the proxy it planned
- the admin editor UX: pagination, replace-when-full and reordering, instead of checkboxes that
  just disabled at five
- whether Fake Store could page natively: it can't, and that's now written down
- the tone of these docs

Checks that were run:
- both test suites run inside the containers
- a curl run through CORS, the full Sanctum login (including a CSRF failure on purpose) and an
  enquiry landing in Mailpit
- Playwright going through every flow in Chromium, with screenshots reviewed along the way
- one test named after each acceptance criterion in `frontend/src/app.test.tsx`, with backend
  coverage in `backend/tests/Feature`

## Time spent

| | |
|---|---|
| Planning | 20 min |
| Building | 55 min |
| Testing | 30 min |
| Reviewing | 25 min |
| **Total** | **2 h 10 min** |

These are my hands-on minutes. Elapsed time was longer: the session ran from about 19:40 to
23:15, then I made the admin editor changes the next day, and took React Query out the day after
(Nov 22). A lot of that was waiting for the agent to build and for tests and containers to run.
