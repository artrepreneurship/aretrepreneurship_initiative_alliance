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

  /* ---------- about page: each teammate gets a spotlight, then everyone spreads into a grid ---------- */
  var stage = document.querySelector(".team-stage");
  if (stage) {
    var cards = Array.prototype.slice.call(stage.querySelectorAll(".pcard"));
    var inners = cards.map(function (c) { return c.querySelector(".pcard-inner"); });
    var hint = document.getElementById("team-hint");
    var wide = window.matchMedia("(min-width: 760px) and (min-height: 620px)");
    var offs = [], flipIO = null, n = cards.length;
    var START = 0.03, SPAN = 0.76, SEG = SPAN / n, SPREAD = 0.82;
    var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
    var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var mix = function (a, b, t) { var o = {}; for (var k in a) o[k] = a[k] + (b[k] - a[k]) * t; return o; };

    function clearT() { cards.forEach(function (c, i) { c.style.transform = ""; c.style.zIndex = ""; c.style.opacity = ""; inners[i].style.transform = ""; }); }
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
      var pileX = -Math.min(360, window.innerWidth * 0.27), spotX = Math.min(90, window.innerWidth * 0.06);
      var spread = ease(clamp((p - SPREAD) / 0.15));
      var current = -1;
      cards.forEach(function (c, i) {
        var ox = offs[i][0], oy = offs[i][1];
        var waiting = { x: ox + spotX + 40, y: oy + window.innerHeight * 0.65, s: 1.25, r: 10, f: 180, o: 0 };
        var spot = { x: ox + spotX, y: oy, s: 1.45, r: 0, f: 0, o: 1 };
        var pile = { x: ox + pileX + i * 6, y: oy + 8 - i * 4, s: 0.78, r: (i - (n - 1) / 2) * 4, f: 0, o: 1 };
        var home = { x: 0, y: 0, s: 1, r: 0, f: 0, o: 1 };
        var t = (p - (START + i * SEG)) / SEG, st;
        if (t < 0) st = waiting;
        else if (t < 0.32) st = mix(waiting, spot, ease(t / 0.32));
        else if (t < 0.7) st = spot;
        else if (t < 1) st = mix(spot, pile, ease((t - 0.7) / 0.3));
        else st = pile;
        if (t >= 0 && t < 1) current = i;
        if (spread > 0) st = mix(st, home, spread);
        c.style.transform = "translate(" + st.x + "px," + st.y + "px) rotate(" + st.r + "deg) scale(" + st.s + ")";
        c.style.opacity = st.o;
        inners[i].style.transform = "rotateY(" + st.f + "deg)";
        c.style.zIndex = spread >= 1 ? "" : (t >= 0 && t < 1 ? 50 : i + 1);
      });
      if (hint) {
        var txt = p >= SPREAD ? "The whole crew." : current >= 0 ? "Meet the team · " + String(current + 1).padStart(2, "0") + " / " + String(n).padStart(2, "0") : "Scroll to meet everyone, one by one.";
        if (hint.textContent !== txt) hint.textContent = txt;
      }
    }
    function setup() {
      stage.classList.remove("scrolly", "flippy");
      stage.style.height = "";
      if (flipIO) { flipIO.disconnect(); flipIO = null; }
      clearT();
      if (reduce) return;
      if (wide.matches) {
        stage.classList.add("scrolly");
        stage.style.height = (100 + n * 75 + 90) + "vh";
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

  /* ---------- page transitions: color panels sweep in before leaving, then off the next page ---------- */
  if (!reduce) {
    if (root.classList.contains("is-arriving")) {
      requestAnimationFrame(function () {
        setTimeout(function () {
          root.classList.add("wipe-out");
          setTimeout(function () { root.classList.remove("is-arriving", "wipe-out"); }, 800);
        }, 120);
      });
    }
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/^https?:|^file:/.test(url.protocol)) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same page / anchor
      e.preventDefault();
      try { sessionStorage.setItem("aia-nav", "1"); } catch (err) {}
      root.classList.add("is-leaving");
      setTimeout(function () { location.href = url.href; }, 620);
    });
    window.addEventListener("pageshow", function (e) { if (e.persisted) root.classList.remove("is-leaving", "is-arriving", "wipe-out"); });
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
