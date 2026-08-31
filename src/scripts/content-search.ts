const searchInput = document.querySelector<HTMLInputElement>("#content-search");
const searchCount = document.querySelector<HTMLElement>("#search-count");
const emptyMessage = document.querySelector<HTMLElement>("[data-search-empty]");
const posts = Array.from(
  document.querySelectorAll<HTMLElement>("[data-search-post]"),
);

const searchableText = new Map(
  posts.map((post) => [post, post.textContent?.toLocaleLowerCase() ?? ""]),
);

const updateResults = () => {
  if (!searchInput || !searchCount || !emptyMessage) return;

  const terms = searchInput.value
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  let matchCount = 0;

  posts.forEach((post) => {
    const text = searchableText.get(post) ?? "";
    const matches = terms.every((term) => text.includes(term));
    post.hidden = !matches;
    if (matches) matchCount += 1;
  });

  searchCount.textContent = `${matchCount} ${matchCount === 1 ? "post" : "posts"}`;
  emptyMessage.hidden = matchCount !== 0;
};

searchInput?.addEventListener("input", updateResults);
