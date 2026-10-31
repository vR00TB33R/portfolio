---
# Copy to content/projects/<kebab-case-name>.md; the filename becomes the URL slug.
# Lines starting with # are YAML comments and can stay or go.

# Required
title: Project Name
description: One plain-text sentence on what it is and why it matters, for listings, search, and link previews.
tags:
  - Primary Technology
  - Domain
draft: true # Hidden from every build (dev included) until set to false.
order: 99 # Sort position on ~/projects (lower first, ties sorted by title).

# Optional
# date: YYYY-MM-DD # Otherwise the last git commit date is used.
# socialImage: https://rootbeer.sh/media/projects/<project>/cover.png # Overrides the generated preview card; aim for 1200x630. Use a full URL, since relative paths resolve to /static/.
# socialDescription: Shorter or punchier text for social previews only.
# aliases:
#   - old-slug # Redirects /projects/old-slug here, useful after a rename.
# enableToc: false # Table of contents shows by default.
# unlisted: true # Built and reachable by URL, but left out of listings.
---

![Project Name](/media/projects/<project>/cover.png)

%% Comments like this are stripped from the built page. Images and GIFs go in content/media/projects/<project>/. %%

What it does, what it runs on, and the headline result.

How it evolved: first iteration, what changed, and how it fits with related work like [[projects/apdde|APDde]].

![Project Name in action](/media/projects/<project>/demo.gif)
