// Runs after `npm run build`. Hashes every inline <script> in the built pages and
// writes the hashes into public/_headers in place of INLINE_SCRIPT_HASHES, so the
// Content-Security-Policy allows Quartz's own inline scripts and nothing else.

import { createHash } from "node:crypto"
import { readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"

const OUTPUT = "public"
const HEADERS = path.join(OUTPUT, "_headers")
const PLACEHOLDER = "INLINE_SCRIPT_HASHES"
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g

const htmlFiles = (await readdir(OUTPUT, { recursive: true }))
  .filter((file) => file.endsWith(".html"))
  .map((file) => path.join(OUTPUT, file))

const hashes = new Set()
for (const file of htmlFiles) {
  for (const [, body] of (await readFile(file, "utf8")).matchAll(INLINE_SCRIPT)) {
    if (body.trim() === "") continue
    hashes.add(`'sha256-${createHash("sha256").update(body).digest("base64")}'`)
  }
}

const headers = await readFile(HEADERS, "utf8")
if (!headers.includes(PLACEHOLDER)) {
  throw new Error(`${HEADERS} has no ${PLACEHOLDER} placeholder. Is content/_headers missing?`)
}
await writeFile(HEADERS, headers.replaceAll(PLACEHOLDER, [...hashes].sort().join(" ")))
console.log(`csp-hashes: ${hashes.size} inline script hashes from ${htmlFiles.length} pages`)
