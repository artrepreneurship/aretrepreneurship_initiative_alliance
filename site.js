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
    var wide = window.matchMedia("(min-width: 1100px) and (min-height: 560px), (min-width: 760px) and (min-height: 780px)");
    var flipIO = null, n = cards.length;
    // timeline (0-1 through the section): shuffle each card out and back onto the deck, then deal them into the grid
    var START = 0.03, SPREAD_LEN = 0.14, LEAD = 0.32, HOLD_END = 0.78;
    var SEG = (0.98 - SPREAD_LEN - START) / (n - 1 + HOLD_END + LEAD);
    var SPREAD = START + (n - 1 + HOLD_END + LEAD) * SEG;
    var JR = [-3, 2.5, -1.5, 3, -2.5, 1.5, -0.5, 2, -2], JX = [-6, 5, -3, 7, -5, 3, 0, 4, -4];
    var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
    var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var mix = function (a, b, t) { var o = {}; for (var k in a) o[k] = a[k] + (b[k] - a[k]) * t; return o; };

    function clearT() { cards.forEach(function (c, i) { c.style.transform = ""; c.style.zIndex = ""; inners[i].style.transform = ""; }); }
    // offsets from each card's home slot to the middle of the grid, read from layout (never affected by transforms)
    function offsets() {
      var g = stage.querySelector(".pgrid"), gx = g.offsetWidth / 2, gy = g.offsetHeight / 2;
      return cards.map(function (c) { return [gx - (c.offsetLeft + c.offsetWidth / 2), gy - (c.offsetTop + c.offsetHeight / 2)]; });
    }
    function tick() {
      if (!stage.classList.contains("scrolly")) return;
      var r = stage.getBoundingClientRect(), total = stage.offsetHeight - window.innerHeight;
      if (r.bottom < -50 || r.top > window.innerHeight + 50) return;   // off screen: nothing to do
      var p = clamp(-r.top / Math.max(1, total));
      var offs = offsets(), vw = window.innerWidth, vh = window.innerHeight;
      var cw = cards[0].offsetWidth;
      var head = stage.querySelector(".section-head").getBoundingClientRect();
      var box = stage.querySelector(".team-sticky").getBoundingClientRect();
      var gr = stage.querySelector(".pgrid").getBoundingClientRect();
      var cw = cards[0].offsetWidth, ch = cards[0].offsetHeight;
      var room = box.bottom - head.bottom - 24;
      var S = Math.max(1, Math.min(1.45, room / ch));
      var lift = (head.bottom + 12 + room / 2) - (gr.top + gr.height / 2);
      var spread = ease(clamp((p - SPREAD) / SPREAD_LEN));
      var current = -1;
      cards.forEach(function (c, i) {
        var ox = offs[i][0], oy = offs[i][1] + lift;
        var side = i % 2 === 0 ? 1 : -1;
        var deck = { x: ox + (n - i) * 0.8, y: oy - (n - i) * 1.6, s: S, r: (i % 3 - 1) * 1.2, f: 180 };
        var out = { x: ox + side * cw * S * 0.95, y: oy - 22, s: S * 1.02, r: side * 10, f: 0 };
        var top = { x: ox + JX[i % JX.length], y: oy, s: S, r: JR[i % JR.length], f: 0 };
        var home = { x: 0, y: 0, s: 1, r: 0, f: 0 };
        var t = (p - START) / SEG - LEAD - i, st, z, last = i === n - 1;
        if (t < -LEAD) { st = deck; z = 10 + i; }
        else if (t < -0.08) {                         // slide out of the deck and flip face-up
          var k = (t + LEAD) / (LEAD - 0.08);
          st = mix(deck, out, ease(k)); st.f = 180 * (1 - ease(clamp(k * 1.15))); z = 9;
        }
        else if (t < 0.12) { st = mix(out, top, ease((t + 0.08) / 0.2)); z = 100 + i; }   // tuck back on top
        else { st = top; z = 100 + i; }
        if (t >= -0.08) current = Math.max(current, i);
        home.f = 0;
        if (spread > 0) st = mix(st, home, spread);
        c.style.transform = "translate3d(" + st.x.toFixed(1) + "px," + st.y.toFixed(1) + "px,0) rotate(" + st.r.toFixed(2) + "deg) scale(" + st.s.toFixed(3) + ")";
        inners[i].style.transform = "rotateY(" + st.f.toFixed(1) + "deg)";
        c.style.zIndex = spread > 0.6 ? "" : String(z);
      });
      if (hint) {
        var txt = p >= SPREAD ? "The whole crew." : current >= 0 || p > START ? "Meet the team · " + String(Math.max(current, 0) + 1).padStart(2, "0") + " / " + String(n).padStart(2, "0") : "Scroll to meet everyone, one by one.";
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
        stage.style.height = (100 + n * 55 + 70) + "vh";
        tick();
      } else if ("IntersectionObserver" in window) {
        stage.classList.add("flippy");
        flipIO = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("shown"); flipIO.unobserve(e.target); } });
        }, { threshold: 0.5 });
        cards.forEach(function (c) { c.classList.remove("shown"); flipIO.observe(c); });
      }
    }
    setup();
    var queued = false;
    function queue() { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; tick(); }); } }
    window.addEventListener("scroll", queue, { passive: true });
    if (lenis) lenis.on("scroll", queue);
    var lastW = window.innerWidth, rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (window.innerWidth !== lastW) { lastW = window.innerWidth; setup(); } else queue();
      }, 150);
    });
    if (wide.addEventListener) wide.addEventListener("change", setup);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
  }

  /* ---------- page transitions: color panels sweep in before leaving, then off the next page ---------- */
  if (!reduce) {
    if (root.classList.contains("is-arriving")) {
      requestAnimationFrame(function () {
        setTimeout(function () {
          root.classList.add("wipe-out");
          setTimeout(function () { root.classList.remove("is-arriving", "wipe-out"); }, 560);
        }, 60);
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
      setTimeout(function () { location.href = url.href; }, 500);   // bars finish at 0.46s
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
