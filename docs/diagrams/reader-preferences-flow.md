# Reader preferences: theme, text size, bold

Sources: `layouts/partials/head.html` (pre-paint script), `layouts/partials/header.html`
(buttons), `static/js/site.js` (click handlers), `static/css/main.css` (`data-*` rules).

```mermaid
sequenceDiagram
    participant LS as localStorage
    participant Head as head.html pre-paint script
    participant Html as html element
    participant CSS as main.css
    participant JS as site.js
    participant User

    Head->>LS: read theme, fontStep, fontBold
    Head->>Html: set data-theme, data-font-step -1..3, data-font-bold
    Html->>CSS: data-font-step maps to --font-scale 0.9 / 1.15 / 1.3 / 1.5
    CSS-->>Html: html font-size = --fs-base x --font-scale, rem text scales
    JS->>Html: syncFontControls - disable A- at -1, A+ at 3, set aria-pressed on B
    User->>JS: click A- or A+
    JS->>Html: update data-font-step, step 0 removes the attribute
    JS->>LS: save fontStep
    User->>JS: click B
    JS->>Html: toggle data-font-bold
    JS->>LS: save fontBold as 1 or 0
```
