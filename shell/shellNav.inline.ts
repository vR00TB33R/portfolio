import { cveOfTheDay } from "./cve"
import { dirHref, fileHref, ps1 } from "./paths"

type Line = string | { text: string; href: string }
type Output = Line[][]

const MAX_ENTRIES = 20

const AUTOMOTIVE_TIMELINE_URL = "https://autosec-timeline.delikely.eu.org/?lang=en"

const HELP: Output = [
  ["commands:"],
  ["  ls [dir]       list a directory"],
  ["  cd <dir>       change directory (cd ~/blog, cd ..)"],
  ["  cat <file>     read a page (cat ~/services.md)"],
  ["  cve            the newest CVE in the NVD"],
  ["  automotive-timeline  a timeline of automotive security research"],
  ["  pwd, whoami, contact, search, clear"],
]

// Survives SPA navigation, like shell history.
const history: string[] = []

let contentIndex: Promise<Record<string, unknown>> | undefined
const loadIndex = () =>
  (contentIndex ??= fetchData.then((data) => data as Record<string, unknown>).catch(() => ({})))

// Resolves a shell path argument against the working directory.
const resolvePath = (cwd: string[], arg: string) => {
  let rest = arg
  let segments: string[] = [...cwd]
  if (rest === "~" || rest.startsWith("~/")) {
    segments = []
    rest = rest.slice(1)
  } else if (rest.startsWith("/")) {
    segments = []
  }

  for (const part of rest.split("/")) {
    if (part === "" || part === ".") continue
    if (part === "..") segments.pop()
    else segments.push(part.replace(/\.md$/, ""))
  }
  return segments
}

const kindOf = async (path: string[]) => {
  if (path.length === 0) return "dir"
  const index = await loadIndex()
  const joined = path.join("/")
  if (Object.keys(index).some((slug) => slug.startsWith(`${joined}/`))) return "dir"
  if (joined in index) return "file"
  return undefined
}

const listDir = async (path: string[]): Promise<Line[]> => {
  const index = await loadIndex()
  const prefix = path.length === 0 ? "" : `${path.join("/")}/`
  const entries = new Map<string, Line>()

  for (const slug of Object.keys(index)) {
    if (!slug.startsWith(prefix)) continue
    const [name, ...below] = slug.slice(prefix.length).split("/")
    if (name === "index" || name === "tags" || name === "") continue
    entries.set(
      name,
      below.length > 0
        ? { text: `${name}/`, href: dirHref([...path, name]) }
        : { text: `${name}.md`, href: fileHref([...path, name]) },
    )
  }

  return [...entries.values()].flatMap((entry, i) => (i === 0 ? [entry] : ["  ", entry]))
}

const navigate = (href: string) => {
  const url = new URL(href, window.location.origin)
  if (url.pathname === window.location.pathname && url.hash) {
    window.location.hash = url.hash
  } else if (typeof window.spaNavigate === "function") {
    window.spaNavigate(url)
  } else {
    window.location.assign(url)
  }
}

async function run(input: string, cwd: string[]): Promise<Output | "clear"> {
  const [command = "", ...args] = input.trim().split(/\s+/)
  const target = args[0]

  switch (command) {
    case "":
      return []
    case "help":
      return HELP
    case "clear":
      return "clear"
    case "pwd":
      return [[`/home/guest${cwd.length ? "/" + cwd.join("/") : ""}`]]
    case "echo":
      return [[args.join(" ")]]
    case "whoami":
      navigate("/#whoami")
      return [["guest. The owner is Spencer Beer: see ~/welcome.txt"]]
    case "contact":
      navigate("/#contact")
      return []
    case "cve": {
      const cve = await cveOfTheDay()
      if (!cve) return [["cve: could not reach the NVD. Try again later."]]
      return [
        [{ text: cve.id, href: `https://nvd.nist.gov/vuln/detail/${cve.id}` }, `  published ${cve.published}`],
        ...(cve.summary ? [[cve.summary]] : []),
      ]
    }
    case "automotive-timeline":
      window.open(AUTOMOTIVE_TIMELINE_URL, "_blank", "noreferrer")
      return [[{ text: AUTOMOTIVE_TIMELINE_URL, href: AUTOMOTIVE_TIMELINE_URL }]]
    case "search":
    case "grep":
      document.querySelector<HTMLElement>(".search-button")?.click()
      return []
    case "sudo":
      return [["guest is not in the sudoers file. This incident will be reported."]]
    case "exit":
    case "logout":
      return [["logout: there is no escape. Try cd ~ instead."]]
    case "ls": {
      const path = resolvePath(cwd, target ?? ".")
      const kind = await kindOf(path)
      if (kind === "file") return [[{ text: `${path[path.length - 1]}.md`, href: fileHref(path) }]]
      if (!kind) return [[`ls: cannot access '${target}': No such file or directory`]]
      const listing = await listDir(path)
      return listing.length ? [listing] : []
    }
    case "cd": {
      const path = resolvePath(cwd, target ?? "~")
      const kind = await kindOf(path)
      if (kind === "dir") navigate(dirHref(path))
      else if (kind === "file") return [[`cd: not a directory: ${target}`]]
      else return [[`cd: no such file or directory: ${target}`]]
      return []
    }
    case "cat":
    case "less":
    case "more":
    case "open": {
      if (!target) return [[`${command}: missing file operand`]]
      if (target === "welcome.txt" || target === "~/welcome.txt") {
        navigate("/")
        return []
      }
      const path = resolvePath(cwd, target)
      const kind = await kindOf(path)
      if (kind === "file") navigate(fileHref(path))
      else if (kind === "dir") return [[`${command}: ${target}: Is a directory`]]
      else return [[`${command}: ${target}: No such file or directory`]]
      return []
    }
    default:
      return [[`sh: ${command}: command not found. Try 'help'.`]]
  }
}

const renderLine = (line: Line[]) => {
  const row = document.createElement("div")
  for (const part of line) {
    if (typeof part === "string") {
      row.append(part)
    } else {
      const link = document.createElement("a")
      link.href = part.href
      link.textContent = part.text
      if (part.href.startsWith("http")) {
        link.target = "_blank"
        link.rel = "noreferrer"
      }
      row.append(link)
    }
  }
  return row
}

document.addEventListener("nav", () => {
  const form = document.querySelector<HTMLFormElement>(".shell-form")
  const input = document.querySelector<HTMLInputElement>(".shell-input")
  const output = document.querySelector<HTMLElement>(".shell-output")
  if (!form || !input || !output) return

  const cwd = (form.dataset.cwd ?? "").split("/").filter(Boolean)
  let cursor = history.length

  const execute = async (command: string) => {
    if (command.trim()) history.push(command)
    cursor = history.length

    const result = await run(command, cwd)
    if (result === "clear") {
      output.replaceChildren()
      return
    }

    const entry = document.createElement("div")
    entry.className = "shell-entry"
    const echo = document.createElement("div")
    const prompt = document.createElement("span")
    prompt.className = "shell-ps1"
    prompt.textContent = ps1(cwd)
    echo.append(prompt, ` ${command}`)
    entry.append(echo, ...result.map(renderLine))
    output.append(entry)

    while (output.childElementCount > MAX_ENTRIES) output.firstElementChild?.remove()
  }

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    const command = input.value
    input.value = ""
    void execute(command)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowUp" && cursor > 0) {
      cursor -= 1
    } else if (event.key === "ArrowDown" && cursor < history.length) {
      cursor += 1
    } else {
      return
    }
    event.preventDefault()
    input.value = history[cursor] ?? ""
  }

  const onChip = (event: MouseEvent) => {
    const chip = (event.target as HTMLElement).closest<HTMLButtonElement>(".shell-chip")
    if (chip?.dataset.command) void execute(chip.dataset.command)
  }

  const chips = document.querySelector<HTMLElement>(".shell-chips")
  form.addEventListener("submit", onSubmit)
  input.addEventListener("keydown", onKeyDown)
  chips?.addEventListener("click", onChip)
  window.addCleanup(() => {
    form.removeEventListener("submit", onSubmit)
    input.removeEventListener("keydown", onKeyDown)
    chips?.removeEventListener("click", onChip)
  })
})
