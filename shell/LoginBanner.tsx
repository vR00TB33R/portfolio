import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../quartz/components/types"
import { LOGO } from "./logo"
import { HOST } from "./paths"
// @ts-ignore: Quartz bundles *.inline.ts imports as script text
import script from "./loginBanner.inline"
import style from "./styles/loginBanner.scss"

// Which halves of a character cell each block character fills.
const BLOCKS: Record<string, { top: boolean; bottom: boolean }> = {
  "█": { top: true, bottom: true },
  "▀": { top: true, bottom: false },
  "▄": { top: false, bottom: true },
}

// Draws the block-character logo as SVG rectangles instead of text, because
// block glyph widths differ between fonts and break the alignment. Each text
// row becomes two half-rows of height 1; runs of filled cells merge into one rect.
function logoRects(art: string) {
  const rects: { x: number; y: number; width: number }[] = []
  const lines = art.split("\n")

  lines.forEach((line, row) => {
    const cells = [...line]
    for (const half of ["top", "bottom"] as const) {
      let start = -1
      cells.concat(" ").forEach((char, col) => {
        const filled = BLOCKS[char]?.[half] ?? false
        if (filled && start === -1) start = col
        if (!filled && start !== -1) {
          rects.push({ x: start, y: row * 2 + (half === "bottom" ? 1 : 0), width: col - start })
          start = -1
        }
      })
    }
  })

  const columns = Math.max(...lines.map((line) => [...line].length))
  return { rects, width: columns, height: lines.length * 2 }
}

const logo = logoRects(LOGO)

// The "you just logged in" header on the homepage. Everything is static HTML so
// crawlers and screen readers get the content; the script only fills in the
// visitor's previous login time.
export default (() => {
  const LoginBanner: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    if (fileData.slug !== "index") return null

    return (
      <section class="login-banner" aria-labelledby="login-title">
        <p class="login-line">
          {HOST} login: <span class="login-user">guest</span>
        </p>
        <p class="login-line" id="last-login">
          Last login: never. Welcome, guest.
        </p>
        <svg
          class="login-logo"
          viewBox={`0 0 ${logo.width} ${logo.height}`}
          aria-hidden="true"
          shape-rendering="crispEdges"
        >
          {logo.rects.map(({ x, y, width }) => (
            <rect x={x} y={y} width={width} height={1} />
          ))}
        </svg>
        <h1 id="login-title">Rootbeer Security</h1>
        <p class="login-role">
          Embedded Systems Security Engineer · <a href="/media/beers.jpg">Spencer Beer</a>
        </p>
        <ul class="login-motd">
          <li>
            <span>* Blog:</span> <a href="/blog/">cd ~/blog</a>
          </li>
          <li>
            <span>* Projects:</span> <a href="/projects/">cd ~/projects</a>
          </li>
          <li>
            <span>* Services:</span> <a href="/services">cat ~/services.md</a>
          </li>
          <li>
            <span>* Help:</span> type <kbd>help</kbd> at the prompt below
          </li>
        </ul>
      </section>
    )
  }

  LoginBanner.css = style
  LoginBanner.afterDOMLoaded = script
  return LoginBanner
}) satisfies QuartzComponentConstructor
