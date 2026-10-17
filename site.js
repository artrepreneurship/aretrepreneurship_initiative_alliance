/* AIA site effects: loading screen, smooth scroll, scroll reveals, custom cursor */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- loading screen (once per visit) ---------- */
  var loader = document.querySelector(".loader");
  function finishLoading() {
    if (!root.classList.contains("is-loading") || !loader) return;
    loader.classList.add("done");
    try { sessionStorage.setItem("aia-loaded", "1"); } catch (e) {}
    setTimeout(function () { root.classList.remove("is-loading"); }, 850);
  }
  if (root.classList.contains("is-loading")) {
    var start = Date.now();
    var go = function () { setTimeout(finishLoading, Math.max(0, 1500 - (Date.now() - start))); };
    if (document.readyState === "complete") go(); else window.addEventListener("load", go);
    setTimeout(finishLoading, 4000); // never block the page for long
  }

  /* ---------- smooth, slower scrolling ---------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.4, easing: function (t) { return 1 - Math.pow(1 - t, 4); }, smoothWheel: true });
    (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(0);
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute("href").length < 2) return;
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -80 });
    });
  }

  /* ---------- reveal sections as they scroll in ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    var items = document.querySelectorAll(".section-head, .card, .case, .member, .steps li, .timeline li, .stat, .two-col > *, .form, .cta");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el, i) {
      // only hide things that start below the fold, so nothing visible ever disappears
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add("reveal");
        el.style.transitionDelay = (i % 4) * 70 + "ms";
        io.observe(el);
      }
    });
  }

  /* ---------- custom cursor (mouse/trackpad only) ---------- */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var dot = document.createElement("div"); dot.className = "cursor-dot";
    var ring = document.createElement("div"); ring.className = "cursor-ring";
    document.body.appendChild(dot); document.body.appendChild(ring);
    var x = -100, y = -100, rx = x, ry = y;
    document.addEventListener("mousemove", function (e) {
      x = e.clientX; y = e.clientY;
      dot.style.transform = "translate(" + x + "px," + y + "px)";
      root.classList.add("has-cursor");
    });
    document.addEventListener("mouseleave", function () { root.classList.remove("has-cursor"); });
    (function follow() {
      rx += (x - rx) * (reduce ? 1 : 0.18); ry += (y - ry) * (reduce ? 1 : 0.18);
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      requestAnimationFrame(follow);
    })();
    document.addEventListener("mouseover", function (e) {
      ring.classList.toggle("hover", !!e.target.closest("a, button, label, .card, .marquee"));
    });
  }
})();
