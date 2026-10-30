import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../quartz/components/types"
import { dirHref, HOST, locate, USER } from "./paths"
import style from "./styles/prompt.scss"

// Replaces the stock breadcrumbs with the shell command that printed this page,
// e.g. guest@rootbeer.sh:~/projects$ cat uthp.md. Each directory segment is a link.
export default (() => {
  const PromptLine: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const { dir, command } = locate(fileData.slug ?? "index")

    return (
      <nav class="prompt-line" aria-label="Breadcrumb">
        <span class="prompt-user">
          {USER}@{HOST}
        </span>
        :<a href="/">~</a>
        {dir.map((segment, depth) => (
          <>
            /<a href={dirHref(dir.slice(0, depth + 1))}>{segment}</a>
          </>
        ))}
        <span class="prompt-sigil">$</span> <span class="prompt-command">{command}</span>
      </nav>
    )
  }

  PromptLine.css = style
  return PromptLine
}) satisfies QuartzComponentConstructor
