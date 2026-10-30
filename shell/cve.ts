// The `cve` shell command: the most recently published CVE from the NIST
// National Vulnerability Database. NVD allows cross-origin requests, so this
// runs in the browser. Results are cached per UTC day in localStorage, which
// keeps it to two small requests per visitor per day.

export type Cve = {
  id: string
  published: string
  summary: string
}

type NvdCve = {
  id?: unknown
  published?: unknown
  vulnStatus?: unknown
  descriptions?: Array<{ lang?: unknown; value?: unknown }>
}

type NvdResponse = {
  totalResults?: unknown
  vulnerabilities?: Array<{ cve?: NvdCve }>
}

const NVD_CVE_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0/"
const CACHE_KEY = "rootbeer-cve"
const PAGE_SIZE = 20
const TIMEOUT_MS = 8_000
const SUMMARY_LENGTH = 160

const utcDate = () => new Date().toISOString().slice(0, 10)

// The site uses no em or en dashes, and NVD text sometimes does.
// Built from char codes (en dash, em dash) so no dash characters appear in the source or bundle.
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`, "g")
const cleanText = (text: string) => text.replace(DASHES, "-").replace(/\s+/g, " ").trim()

// Shortens to the last whole word that fits.
const truncate = (text: string) => {
  if (text.length <= SUMMARY_LENGTH) return text
  const cut = text.slice(0, SUMMARY_LENGTH - 3)
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:]$/, "")}...`
}

const fetchNvdPage = async (query: string, signal: AbortSignal) => {
  const response = await fetch(`${NVD_CVE_API_URL}?${query}`, { signal })
  if (!response.ok) throw new Error(`NVD request failed: ${response.status}`)
  return (await response.json()) as NvdResponse
}

// NVD has no "newest first" sort, so read the end of the catalog and pick the
// most recently published record that hasn't been rejected.
const newestCve = (feed: NvdResponse): Cve | undefined => {
  const records = (feed.vulnerabilities ?? [])
    .map(({ cve }) => cve)
    .filter(
      (cve): cve is NvdCve =>
        typeof cve?.id === "string" &&
        /^CVE-\d{4}-\d{4,}$/.test(cve.id) &&
        typeof cve.published === "string" &&
        String(cve.vulnStatus).toLowerCase() !== "rejected",
    )
    .sort((a, b) => Date.parse(String(b.published)) - Date.parse(String(a.published)))

  const newest = records[0]
  if (!newest) return undefined

  const description = newest.descriptions?.find((d) => d.lang === "en")?.value
  return {
    id: String(newest.id),
    published: String(newest.published).slice(0, 10),
    summary: typeof description === "string" ? truncate(cleanText(description)) : "",
  }
}

const readCache = (): Cve | undefined => {
  try {
    const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "null")
    return cached?.date === utcDate() && typeof cached.cve?.id === "string" ? cached.cve : undefined
  } catch {
    return undefined
  }
}

const writeCache = (cve: Cve) => {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ date: utcDate(), cve }))
  } catch {
    // Without storage the command still works; it just refetches next time.
  }
}

export async function cveOfTheDay(): Promise<Cve | undefined> {
  const cached = readCache()
  if (cached) return cached

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const index = await fetchNvdPage("resultsPerPage=1", controller.signal)
    const total = typeof index.totalResults === "number" ? index.totalResults : 0
    const latest = await fetchNvdPage(
      `resultsPerPage=${PAGE_SIZE}&startIndex=${Math.max(0, total - PAGE_SIZE)}`,
      controller.signal,
    )
    const cve = newestCve(latest)
    if (cve) writeCache(cve)
    return cve
  } catch {
    return undefined
  } finally {
    window.clearTimeout(timeout)
  }
}
