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
