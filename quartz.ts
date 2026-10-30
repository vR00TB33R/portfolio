import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { PageTypeDispatcher } from "./quartz/plugins/pageTypes"
import { FullPageLayout } from "./quartz/cfg"
import * as ExternalPlugin from "./.quartz/plugins"
import LoginBanner from "./shell/LoginBanner"
import PromptLine from "./shell/PromptLine"
import ShellNav from "./shell/ShellNav"

type Orderable = { frontmatter?: { order?: unknown; title?: unknown } }
const orderOf = (page: Orderable) =>
  typeof page.frontmatter?.order === "number" ? page.frontmatter.order : 99
const titleOf = (page: Orderable) => String(page.frontmatter?.title ?? "")

// Folder listings (e.g. /projects/) follow the `order` frontmatter field, then title.
ExternalPlugin.FolderPage({
  sort: (a: Orderable, b: Orderable) => orderOf(a) - orderOf(b) || titleOf(a).localeCompare(titleOf(b)),
})

const config = await loadQuartzConfig()

// The shell chrome is made of local components rather than installed plugins,
// so quartz.config.yaml can't place them. Add them to every page type here.
const shellHeader = [LoginBanner(), PromptLine()]
const shellFooter = [ShellNav()]

const withShell = (layout: Partial<FullPageLayout>): Partial<FullPageLayout> => ({
  ...layout,
  header: [...shellHeader, ...(layout.header ?? [])],
  afterBody: [...(layout.afterBody ?? []), ...shellFooter],
})

const base = await loadQuartzLayout()
export const layout = {
  defaults: withShell(base.defaults),
  byPageType: Object.fromEntries(
    Object.entries(base.byPageType).map(([pageType, pageLayout]) => [pageType, withShell(pageLayout)]),
  ),
}

// loadQuartzConfig() renders pages with the YAML-only layout, so swap its page
// dispatcher for one that uses the layout above.
const emitters = config.plugins.emitters
const dispatcherIndex = emitters.findIndex((emitter) => emitter.name === "PageTypeDispatcher")
if (dispatcherIndex === -1) throw new Error("quartz.ts: PageTypeDispatcher not found")
emitters[dispatcherIndex] = PageTypeDispatcher(layout)

export default config
