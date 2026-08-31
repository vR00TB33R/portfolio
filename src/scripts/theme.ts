const root = document.documentElement;
const toggle = document.querySelector<HTMLButtonElement>("#theme-toggle");
const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

const updateControl = () => {
  const dark = root.dataset.theme === "dark";
  toggle?.setAttribute("aria-pressed", String(dark));
  toggle?.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  if (themeColor) themeColor.content = dark ? "#050505" : "#ffffff";
};

const setTheme = (theme: "light" | "dark", persist = true) => {
  root.dataset.theme = theme;
  if (persist) localStorage.setItem("theme", theme);
  updateControl();
  window.dispatchEvent(new CustomEvent("themechange"));
};

toggle?.addEventListener("click", () => {
  setTheme(root.dataset.theme === "dark" ? "light" : "dark");
});

systemTheme.addEventListener("change", (event) => {
  if (!localStorage.getItem("theme")) {
    setTheme(event.matches ? "dark" : "light", false);
  }
});

updateControl();
