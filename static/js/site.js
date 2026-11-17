// Tiny, dependency-free helpers. ~1 KB minified.
(function () {
  // -------- theme toggle --------
  var root  = document.documentElement;
  var KEY   = "theme";
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-theme-toggle]");
    if (!btn) return;
    var current = root.getAttribute("data-theme")
      || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
  });

  // -------- mobile nav --------
  document.addEventListener("click", function (e) {
    var burger = e.target.closest("[data-nav-burger]");
    if (!burger) return;
    var nav = document.getElementById("nav");
    if (nav) nav.classList.toggle("is-open");
  });

  // -------- text size / weight --------
  var MIN_STEP = -1, MAX_STEP = 3;
  function fontStep() {
    var s = parseInt(root.getAttribute("data-font-step"), 10);
    return isNaN(s) ? 0 : s;
  }
  function syncFontControls() {
    var s = fontStep();
    var bold = root.hasAttribute("data-font-bold");
    document.querySelectorAll("[data-font-dec]").forEach(function (b) { b.disabled = s <= MIN_STEP; });
    document.querySelectorAll("[data-font-inc]").forEach(function (b) { b.disabled = s >= MAX_STEP; });
    document.querySelectorAll("[data-font-bold-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", bold ? "true" : "false");
    });
  }
  function setFontStep(s) {
    s = Math.max(MIN_STEP, Math.min(MAX_STEP, s));
    if (s === 0) root.removeAttribute("data-font-step");
    else root.setAttribute("data-font-step", String(s));
    try { localStorage.setItem("fontStep", String(s)); } catch (e) {}
    syncFontControls();
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-font-dec]")) return setFontStep(fontStep() - 1);
    if (e.target.closest("[data-font-inc]")) return setFontStep(fontStep() + 1);
    if (!e.target.closest("[data-font-bold-toggle]")) return;
    var on = !root.hasAttribute("data-font-bold");
    if (on) root.setAttribute("data-font-bold", "");
    else root.removeAttribute("data-font-bold");
    try { localStorage.setItem("fontBold", on ? "1" : "0"); } catch (e2) {}
    syncFontControls();
  });
  syncFontControls();

  // -------- TOC scroll-spy --------
  var toc = document.querySelector(".toc nav");
  if (!toc) return;
  var links = Array.from(toc.querySelectorAll('a[href^="#"]'));
  if (!links.length) return;
  var byId = {};
  links.forEach(function (a) {
    var id = decodeURIComponent(a.getAttribute("href").slice(1));
    var el = document.getElementById(id);
    if (el) byId[id] = a;
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var a = byId[en.target.id];
      if (!a) return;
      if (en.isIntersecting) {
        links.forEach(function (l) { l.classList.remove("is-active"); });
        a.classList.add("is-active");
      }
    });
  }, { rootMargin: "-20% 0px -70% 0px", threshold: 0 });
  Object.keys(byId).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) io.observe(el);
  });
})();
