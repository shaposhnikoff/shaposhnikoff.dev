# CV Page Design

## Goal

Refresh `/cv/` so it presents Maksym Shaposhnikov's current CV as a polished web page in the existing shaposhnikoff.dev style, while remaining suitable for browser print-to-PDF.

## Approved Approach

Keep the CV as Hugo content in `content/cv/_index.md` and extend the existing site stylesheet in `static/css/main.css`. This avoids a custom layout and keeps the page close to the site's current prose, timeline, monospace metadata, thin rules, and restrained amber accent.

## Page Structure

- Header: name, role, location, language, and contact links.
- Summary: concise professional summary with security-minded LLM/tooling note.
- Highlights: compact metric row for cost, delivery lead time, MTTR, and governance.
- Skills: grouped matrix covering cloud, automation, containers, CI/CD, observability, data platforms, and engineering practices.
- Experience: timeline rows for SoftServe, Zoolatec, Grid Dynamics, and EPAM Systems.
- Projects: short list of realized engineering projects.
- Interests: RF/electronics and embedded/IoT.

## Print Behavior

Print CSS should hide navigation, footer, article metadata, and nonessential chrome. The CV should print in a compact, readable one-column document with visible link targets and page-break protection for experience rows.
