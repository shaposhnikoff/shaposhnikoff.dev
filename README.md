# shaposhnikoff.dev

Personal site for **Max Shaposhnikoff** — DevOps engineer, cloud infrastructure
specialist, radio amateur. Built with [Hugo](https://gohugo.io/), no JS
framework, deployed to Cloudflare Pages.

```
                    ┌──────────────────────────────┐
                    │  hugo --gc --minify          │
                    │  → public/                   │
                    │  → cloudflare pages          │
                    └──────────────────────────────┘
```

## Stack

- **SSG**       Hugo (extended) ≥ 0.128
- **Markup**    Markdown + Goldmark, server-rendered
- **Styles**    A single hand-written CSS file, CSS variables, system fonts
- **JS**        ~1 KB (theme toggle + TOC scroll-spy). No framework.
- **Search**    Static `index.json` (output from home), client-side fetch
- **Hosting**   Cloudflare Pages (or any static host)

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

## Deploying to Cloudflare Pages

1. Push this repo to GitHub / GitLab.
2. In Cloudflare dashboard → **Pages → Create project → Connect to Git**.
3. Build settings:
   - **Framework preset**: Hugo
   - **Build command**: `hugo --gc --minify`
   - **Build output directory**: `public`
   - **Environment variables**:
     - `HUGO_VERSION` = `0.128.0` (or newer)
     - `HUGO_ENV` = `production`
     - `HUGO_ENABLEGITINFO` = `true`
4. Cloudflare Pages will build on every push to `main` and surface preview
   builds for every PR.

### Custom domain

Add `shaposhnikoff.dev` in **Pages → Custom domains**. Cloudflare will issue
a certificate automatically.

## GitHub Actions (optional)

A workflow is included at `.github/workflows/deploy.yml`. It builds the site
and deploys to Cloudflare Pages via Wrangler — useful if you'd rather
not give Cloudflare access to your repo. To enable it, add two repository
secrets:

- `CLOUDFLARE_API_TOKEN` — token with Pages: Edit permission
- `CLOUDFLARE_ACCOUNT_ID` — your account ID

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
│   ├── blog/
│   └── projects/
├── static/
│   ├── css/main.css
│   ├── js/site.js
│   ├── favicon.svg
│   └── robots.txt
└── .github/workflows/deploy.yml
```

## License

Content © Max Shaposhnikoff. Site code MIT.
