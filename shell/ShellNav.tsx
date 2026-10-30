import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../quartz/components/types"
import { locate, ps1 } from "./paths"
// @ts-ignore: Quartz bundles *.inline.ts imports as script text
import script from "./shellNav.inline"
import style from "./styles/shellNav.scss"

// Tappable commands so phone users never have to type.
const QUICK_COMMANDS = ["cd ~", "cd ~/blog", "cd ~/projects", "cat ~/services.md", "whoami", "contact", "help"]

// A live prompt at the end of every page. Commands navigate the site or print
// to the output area; see shellNav.inline.ts for the command set.
export default (() => {
  const ShellNav: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const { dir } = locate(fileData.slug ?? "index")

    return (
      <section class="shell-nav" aria-label="Shell">
        <div class="shell-output" aria-live="polite"></div>
        <form class="shell-form" data-cwd={dir.join("/")}>
          <label for="shell-input" class="shell-ps1">
            {ps1(dir)}
          </label>
          <input
            id="shell-input"
            class="shell-input"
            type="text"
            autocomplete="off"
            autocapitalize="off"
            spellcheck={false}
            enterkeyhint="go"
            placeholder="type help"
          />
        </form>
        <div class="shell-chips" role="group" aria-label="Quick commands">
          {QUICK_COMMANDS.map((command) => (
            <button type="button" class="shell-chip" data-command={command}>
              {command}
            </button>
          ))}
        </div>
      </section>
    )
  }

  ShellNav.css = style
  ShellNav.afterDOMLoaded = script
  return ShellNav
}) satisfies QuartzComponentConstructor
