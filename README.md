# Spencer "Root" Beer's portfolio

A static Astro portfolio for security, embedded systems work, and the
**Bottoms Up 🍻** blog.

## Local development

```powershell
npm install
npm run dev
```

The production check is:

```powershell
npm run build
```

Astro writes the static site to `dist/`, keeping the project suitable for a
static host such as Cloudflare Pages.

## Adding a Bottoms Up 🍻 entry

Create a Markdown file in `src/content/posts/` with the post frontmatter
defined in `src/content.config.ts`. Posts can optionally include featured media,
related links, and a display order. Published entries render automatically on the
Bottoms Up 🍻 route.

## Changing the hidden signals

Edit `SIGNAL_MESSAGES` near the top of
`src/scripts/protocol-traces.ts`. See
`docs/signal-easter-eggs.md` for bit order, lane behavior, and the protocol
accuracy boundary.
