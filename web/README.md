# ArchCalc — website & docs

The landing page and documentation for ArchCalc, built with [Next.js](https://nextjs.org/) and [Fumadocs](https://fumadocs.dev/), deployed at [arch-calc-five.vercel.app](https://arch-calc-five.vercel.app).

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # production build
pnpm dlx @biomejs/biome check ./   # format & lint (what CI runs)
```

> This project uses a recent Next.js release. Check `node_modules/next/dist/docs/` for the current APIs before relying on older patterns (see [AGENTS.md](AGENTS.md)).

## Where things live

| Path                     | What                                                                                       |
| :----------------------- | :----------------------------------------------------------------------------------------- |
| `content/docs/*.mdx`     | Documentation pages. Page order and the sidebar come from `content/docs/meta.json`.        |
| `src/app/(marketing)/`   | Landing, privacy and terms pages                                                           |
| `src/app/docs/`          | Docs layout and page renderer (Fumadocs)                                                   |
| `src/components/`        | Navbar, footer, download section and the `<Video>` component                               |
| `src/mdx-components.tsx` | Components available inside MDX (e.g. `<Video>`)                                           |
| `src/config/site.ts`     | Site name, links, sidebar and the download-count offset                                    |
| `src/app/globals.css`    | Tailwind CSS 4 theme — light and dark palettes and the `glass` / `text-gradient` utilities |
| `public/images/screens/` | App screenshots used in the docs                                                           |
| `public/videos/`         | Showcase video, per-feature clips and poster                                               |

## Adding a docs page

1. Create `content/docs/my-page.mdx` with `title` and `description` front matter.
2. Add `"my-page"` to the `pages` array in `content/docs/meta.json`.
3. Use Markdown, images from `/images/...`, and `<Video src="/videos/…" title="…" />` for clips.

## Screenshots and videos

The images in `public/images/screens` and everything in `public/videos` are generated from the real app by `pnpm showcase` in [`../app`](../app) — re-run it after UI changes rather than editing them by hand.
