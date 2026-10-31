---
# Copy to content/blog/<kebab-case-name>.md; the filename becomes the URL slug.
# Lines starting with # are YAML comments and can stay or go.

# Required
title: Post Title
description: One plain-text sentence for search results, link previews, and the generated OG card.
date: YYYY-MM-DD # Publish date. Without it the post shows its last git commit date.
draft: true # Hidden from every build (dev included) until set to false.

# Optional
tags:
  - Tag One
# socialImage: https://rootbeer.sh/media/blog/<post>/cover.png # Overrides the generated preview card; aim for 1200x630. Use a full URL, since relative paths resolve to /static/.
# socialDescription: Shorter or punchier text for social previews only.
# aliases:
#   - old-slug # Redirects /blog/old-slug here, useful after a rename.
# enableToc: false # Table of contents shows by default.
# unlisted: true # Built and reachable by URL, but left out of listings.
# order: 1 # Sort position on the blog listing (lower first, default 99, then by title).
---

![Post Title](/media/blog/<post>/cover.png)

%% Comments like this are stripped from the built page. Images go in content/media/blog/<post>/. %%

Opening paragraph: the hook, and what the reader gets out of this post.

## Background

## Main section

Link other pages with wikilinks: [[projects/index|cd ~/projects]].

## Takeaways
