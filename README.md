# rootbeer.sh

Spencer "Root" Beer's site: Rootbeer Security, the **Bottoms Up** blog, and
services. It is built with [Quartz 5](https://quartz.jzhao.xyz) and themed to
look like you just logged into a shell.

## Local development

```sh
npm ci
npm run dev      # builds and serves at http://localhost:8080
```

`npm run check` type-checks and `npm run build` writes the static site to
`public/`. Cloudflare Workers serves that directory (see `wrangler.jsonc`).

Font URLs in the built CSS are absolute (`https://rootbeer.sh/static/fonts/...`),
so a local preview falls back to system fonts until the site is deployed.

## Writing

- Home page: `content/index.md`. Each `##` heading reads as a shell command.
- Blog posts: add a Markdown file to `content/blog/`. Projects: add one to
  `content/projects/`. Frontmatter takes `title`, `description`, `tags`, `draft`,
  and `order` (sort position on the folder page).
  Put images in the body, e.g. `![alt](/media/projects/foo/cover.png)`.
- Services: `content/services.md`.
- Images and GIFs live under `content/media/` (one folder per project in
  `content/media/projects/`, each with `cover.png` and `demo.gif`) and PDFs under `content/pdfs/`. Quartz
  lowercases asset filenames and replaces spaces with dashes; links in Markdown
  are rewritten automatically.

## Shell theme

- Colors, fonts and plugins: `quartz.config.yaml`
- Global styles: `quartz/styles/custom.scss`
- Shell components in `shell/`, added to every page in `quartz.ts`:
  - `LoginBanner`: login banner on the home page
  - `PromptLine`: the `guest@rootbeer.sh:~/projects$ cat uthp.md` breadcrumb
  - `ShellNav`: interactive prompt and quick-command buttons (`help` lists commands)

## Redirects

`content/_redirects` (Cloudflare format) keeps the old Astro URLs working:
`/bottoms-up/*`, the project pages that moved from `/blog/` to `/projects/`, and the original mixed-case PDF paths.

## Security headers

`content/_headers` (Cloudflare format) sets the Content-Security-Policy, HSTS and
the other security headers on every response. The CSP allows inline scripts only
by hash: `npm run build` runs `scripts/csp-hashes.mjs` afterwards, which hashes
the inline `<script>` blocks in `public/` and fills them in. Deploy from
`npm run build`, not `npx quartz build`, or the site's inline scripts are blocked.

Adding a plugin that loads anything from another origin means adding that origin
to the CSP. Check the browser console for "violates the following Content
Security Policy directive" after a change.
