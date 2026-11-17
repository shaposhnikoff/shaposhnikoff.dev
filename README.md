# shaposhnikoff.dev

Personal site for **Max Shaposhnikoff** — DevOps engineer, cloud infrastructure
specialist, radio amateur. Built with [Hugo](https://gohugo.io/), no JS
framework, deployed to GitHub Pages via GitHub Actions.

```
                    ┌──────────────────────────────┐
                    │  hugo --gc --minify          │
                    │  → public/                   │
                    │  → github pages              │
                    └──────────────────────────────┘
```

## Stack

- **SSG**       Hugo (extended) ≥ 0.128
- **Markup**    Markdown + Goldmark, server-rendered
- **Styles**    A single hand-written CSS file, CSS variables, system fonts
- **JS**        ~1 KB (theme toggle + TOC scroll-spy). No framework.
- **Hosting**   GitHub Pages (any static host works)

## Local development

```sh
# Requires Hugo extended ≥ 0.128
hugo server --buildDrafts --buildFuture --disableFastRender
# → http://localhost:1313
```

## Authoring

Use the archetypes — each section has its own front-matter shape.

```sh
hugo new blog/my-post.md          # standard blog post
hugo new projects/my-project.md   # project card + write-up
hugo new notes/loadbalancers.md   # technical note (sidebar TOC, no date prominence)
```

### Front-matter conventions

| key          | required | notes                                           |
|--------------|----------|-------------------------------------------------|
| `title`      | yes      | shown in nav, OG, schema                        |
| `date`       | yes      | ISO; sorts archives                             |
| `summary`    | yes      | used in cards + meta description                |
| `tags`       | no       | flat list, lower-case                           |
| `topics`     | no       | one of: cloud / devops / ham / notes            |
| `toc`        | no       | `true` to render table of contents              |
| `draft`      | no       | omit from build                                 |
| `repo`       | projects | GitHub URL                                      |
| `status`     | projects | `active` / `archived` / `experimental`          |

### Shortcodes

```
{{</* note kind="info" */>}} body {{</* /note */>}}      → callout
{{</* terminal user="max" host="lab" */>}} ... {{</* /terminal */>}}   → faux shell
{{</* signal label="20m SSB" */>}}                       → inline radio chip
{{</* kbd */>}}⌘K{{</* /kbd */>}}                          → keycap
```

## Deploying

`.github/workflows/deploy.yml` builds the site with Hugo extended (version
pinned in the workflow `HUGO_VERSION`) and publishes it to GitHub Pages:

- **Pull requests** to `main` run the build only, so a broken template fails
  the check instead of reaching production.
- **Pushes to `main`** (and manual runs) build and deploy.

Repository setting required once: **Settings → Pages → Source: GitHub
Actions**. The custom domain `shaposhnikoff.dev` is configured in the same
settings page; no `CNAME` file is needed for Actions-based deploys.

## File map

```
.
├── hugo.toml
├── archetypes/
│   ├── default.md
│   ├── blog.md
│   ├── projects.md
│   └── notes.md
├── content/
│   ├── _index.md
│   ├── cv/
│   ├── ham/
│   ├── cloud/
│   ├── devops/
│   ├── projects/
│   ├── blog/
│   └── contact/
├── layouts/
│   ├── _default/
│   │   ├── baseof.html
│   │   ├── single.html
│   │   └── list.html
│   ├── index.html
│   ├── partials/
│   ├── shortcodes/
│   └── projects/
├── static/
│   ├── css/main.css
│   ├── js/site.js
│   ├── images/
│   ├── favicon.svg
│   ├── gpg.txt
│   └── robots.txt
└── .github/workflows/deploy.yml
```

## License

Content © Max Shaposhnikoff. Site code MIT.
