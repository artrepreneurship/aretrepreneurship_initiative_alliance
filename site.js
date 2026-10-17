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

  /* ---------- about page: team cards fan out, flip into paint chips, then spread into a grid ---------- */
  var stage = document.querySelector(".team-stage");
  if (stage) {
    var cards = Array.prototype.slice.call(stage.querySelectorAll(".pcard"));
    var inners = cards.map(function (c) { return c.querySelector(".pcard-inner"); });
    var wide = window.matchMedia("(min-width: 760px) and (min-height: 620px)");
    var offs = [], flipIO = null, n = cards.length;
    var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
    var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

    function clearT() { cards.forEach(function (c, i) { c.style.transform = ""; c.style.zIndex = ""; inners[i].style.transform = ""; }); }
    function measure() {
      clearT();
      var g = stage.querySelector(".pgrid").getBoundingClientRect();
      var gx = g.left + g.width / 2, gy = g.top + g.height / 2;
      offs = cards.map(function (c) { var r = c.getBoundingClientRect(); return [gx - (r.left + r.width / 2), gy - (r.top + r.height / 2)]; });
    }
    function tick() {
      if (!stage.classList.contains("scrolly")) return;
      var r = stage.getBoundingClientRect(), total = stage.offsetHeight - window.innerHeight;
      var p = clamp(-r.top / Math.max(1, total));
      var m = ease(clamp((p - 0.6) / 0.32));            // spreading out into the grid
      cards.forEach(function (c, i) {
        var k = i - (n - 1) / 2;
        var ft = ease(clamp((p - (0.06 + i * 0.075)) / 0.12)); // this card's flip
        inners[i].style.transform = "rotateY(" + (180 * (1 - ft)) + "deg)";
        var tx = (offs[i][0] + k * 42) * (1 - m), ty = (offs[i][1] + Math.abs(k) * 10) * (1 - m), rot = k * 7 * (1 - m);
        c.style.transform = "translate(" + tx + "px," + ty + "px) rotate(" + rot + "deg)";
        c.style.zIndex = m < 1 ? String(i + 1) : "";
      });
    }
    function setup() {
      stage.classList.remove("scrolly", "flippy");
      if (flipIO) { flipIO.disconnect(); flipIO = null; }
      clearT();
      if (reduce) return;
      if (wide.matches) {
        stage.classList.add("scrolly");
        measure(); tick();
      } else if ("IntersectionObserver" in window) {
        stage.classList.add("flippy");
        flipIO = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("shown"); flipIO.unobserve(e.target); } });
        }, { threshold: 0.5 });
        cards.forEach(function (c) { c.classList.remove("shown"); flipIO.observe(c); });
      }
    }
    setup();
    window.addEventListener("scroll", function () { requestAnimationFrame(tick); }, { passive: true });
    var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(setup, 150); });
    if (wide.addEventListener) wide.addEventListener("change", setup);
  }

  /* ---------- reveal sections as they scroll in ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    var items = document.querySelectorAll("main > section:not(.team-stage) .section-head, .split-head, .card, .case-card, .tile, .benefit, .partner-wall li, .comment, .brief, .mini-event, .steps li, .res-list li, .two-col > *, .form, .postcard, .cta, .notebook, .ypl-teaser");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var t = en.target; t.classList.add("in"); io.unobserve(t);
          // hand the element back to its normal hover styles once it has arrived
          setTimeout(function () { t.classList.remove("reveal", "in"); t.style.transitionDelay = ""; }, 1200);
        }
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
