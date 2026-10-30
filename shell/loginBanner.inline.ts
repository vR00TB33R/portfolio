const LAST_LOGIN_KEY = "rootbeer-last-login"

// Formats like a real login banner: "Wed Oct 29 14:02:11 2026".
const formatLogin = (date: Date) => {
  const [weekday, month, day, year, time] = date.toString().split(" ")
  return `${weekday} ${month} ${day} ${time} ${year}`
}

document.addEventListener("nav", () => {
  const line = document.getElementById("last-login")
  if (!line) return

  try {
    const previous = window.localStorage.getItem(LAST_LOGIN_KEY)
    const date = previous ? new Date(previous) : undefined
    if (date && !Number.isNaN(date.valueOf())) {
      line.textContent = `Last login: ${formatLogin(date)} on ttyS0`
    }
    window.localStorage.setItem(LAST_LOGIN_KEY, new Date().toISOString())
  } catch {
    // Storage may be blocked; the static "never" line still reads fine.
  }
})
