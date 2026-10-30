// The site is presented as guest's home directory: folders are directories and
// pages are files. These helpers map Quartz slugs onto that view and are shared
// by the server-rendered prompt and the client-side shell.

export const USER = "guest"
export const HOST = "rootbeer.sh"

type ShellLocation = {
  // Path segments below ~ for the working directory.
  dir: string[]
  // The command that "printed" the current page.
  command: string
}

export function locate(slug: string): ShellLocation {
  const parts = slug.split("/").filter(Boolean)
  const name = parts.pop() ?? "index"

  if (slug === "404") return { dir: [], command: "cat" }
  if (parts[0] === "tags" && name !== "index") {
    return { dir: [], command: `grep -rl "#${name}" ~` }
  }
  if (name === "index") {
    return parts.length === 0 ? { dir: [], command: "cat welcome.txt" } : { dir: parts, command: "ls" }
  }
  return { dir: parts, command: `cat ${name}.md` }
}

const displayPath = (dir: string[]) => ["~", ...dir].join("/")

export const ps1 = (dir: string[]) => `${USER}@${HOST}:${displayPath(dir)}$`

export const dirHref = (dir: string[]) => (dir.length === 0 ? "/" : `/${dir.join("/")}/`)

export const fileHref = (path: string[]) => `/${path.join("/")}`
