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
    var wide = window.matchMedia("(min-width: 900px) and (min-height: 640px)");
    var flipIO = null, n = cards.length;
    // timeline (0-1 through the section): shuffle each card out and back onto the deck, then deal them into the grid
    var START = 0.03, SPREAD_LEN = 0.14, LEAD = 0.32, HOLD_END = 0.78;
    var SEG = (0.98 - SPREAD_LEN - START) / (n - 1 + HOLD_END + LEAD);
    var SPREAD = START + (n - 1 + HOLD_END + LEAD) * SEG;
    var JR = [-3, 2.5, -1.5, 3, -2.5, 1.5, -0.5, 2, -2], JX = [-6, 5, -3, 7, -5, 3, 0, 4, -4];
    var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
    var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var mix = function (a, b, t) { var o = {}; for (var k in a) o[k] = a[k] + (b[k] - a[k]) * t; return o; };

    function clearT() { cards.forEach(function (c, i) { c.style.transform = ""; c.style.zIndex = ""; c.style.removeProperty("--post"); inners[i].style.transform = ""; }); }
    // offsets from each card's home slot to the middle of the grid, read from layout (never affected by transforms)
    function offsets() {
      var g = stage.querySelector(".pgrid"), gx = g.offsetWidth / 2, gy = g.offsetHeight / 2;
      return cards.map(function (c) { return [gx - (c.offsetLeft + c.offsetWidth / 2), gy - (c.offsetTop + c.offsetHeight / 2)]; });
    }
    var latched = false;
    // once the deck has dealt out, lock it as a normal grid so hover works and it never reshuffles
    function latch() {
      latched = true;
      var g = stage.querySelector(".pgrid"), before = g.getBoundingClientRect().top;
      stage.classList.remove("scrolly");
      stage.classList.add("dealt");
      stage.style.height = "";
      clearT();
      if (hint) hint.textContent = "The whole crew. Hover a card to flip it.";
      var after = g.getBoundingClientRect().top, y = window.scrollY + (after - before);
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
    }
    function tick() {
      if (latched || !stage.classList.contains("scrolly")) return;
      var r = stage.getBoundingClientRect(), total = stage.offsetHeight - window.innerHeight;
      if (r.bottom < -50 || r.top > window.innerHeight + 50) return;   // off screen: nothing to do
      var p = clamp(-r.top / Math.max(1, total));
      var offs = offsets(), vw = window.innerWidth;
      var head = stage.querySelector(".section-head").getBoundingClientRect();
      var box = stage.querySelector(".team-sticky").getBoundingClientRect();
      var gr = stage.querySelector(".pgrid").getBoundingClientRect();
      // during the shuffle each card shows as a horizontal postcard (the .pcard-inner); size it to fit
      var pw = inners[0].offsetWidth, ph = inners[0].offsetHeight;
      var room = box.bottom - head.bottom - 28;
      var S = Math.max(.8, Math.min(2.4, room / ph, (vw * 0.7) / pw));
      var lift = (head.bottom + 14 + room / 2) - (gr.top + gr.height / 2);
      var spread = ease(clamp((p - SPREAD) / SPREAD_LEN));
      var current = -1;
      cards.forEach(function (c, i) {
        var ox = offs[i][0], oy = offs[i][1] + lift;
        var side = i % 2 === 0 ? 1 : -1;
        var deck = { x: ox + (n - i) * 0.8, y: oy - (n - i) * 1.6, s: S, r: (i % 3 - 1) * 1.2, f: 180 };
        var out = { x: ox + side * pw * S * 0.62, y: oy - 26, s: S * 1.02, r: side * 9, f: 0 };
        var top = { x: ox + JX[i % JX.length], y: oy, s: S, r: JR[i % JR.length], f: 0 };
        var home = { x: 0, y: 0, s: 1, r: 0, f: 0 };
        var t = (p - START) / SEG - LEAD - i, st, z;
        if (t < -LEAD) { st = deck; z = 10 + i; }
        else if (t < -0.08) {                         // slide out of the deck and flip face-up
          var k = (t + LEAD) / (LEAD - 0.08);
          st = mix(deck, out, ease(k)); st.f = 180 * (1 - ease(clamp(k * 1.15))); z = 9;
        }
        else if (t < 0.12) { st = mix(out, top, ease((t + 0.08) / 0.2)); z = 100 + i; }   // tuck back on top
        else { st = top; z = 100 + i; }
        if (t >= -0.08) current = Math.max(current, i);
        if (spread > 0) st = mix(st, home, spread);
        // postcard -> vertical card as the deck deals out
        var post = 1 - clamp(spread * 1.6);
        c.style.setProperty("--post", post.toFixed(3));
        c.style.transform = "translate3d(" + st.x.toFixed(1) + "px," + st.y.toFixed(1) + "px,0) rotate(" + st.r.toFixed(2) + "deg) scale(" + (st.s + (1 - st.s) * (1 - post)).toFixed(3) + ")";
        inners[i].style.transform = "rotateY(" + st.f.toFixed(1) + "deg)";
        c.style.zIndex = spread > 0.6 ? "" : String(z);
      });
      stage.classList.toggle("dealt", spread >= 1);
      if (spread >= 1) { latch(); return; }
      if (hint) {
        var txt = p >= SPREAD ? "The whole crew. Hover a card to flip it." : current >= 0 || p > START ? "Meet the team · " + String(Math.max(current, 0) + 1).padStart(2, "0") + " / " + String(n).padStart(2, "0") : "Scroll to meet everyone, one by one.";
        if (hint.textContent !== txt) hint.textContent = txt;
      }
    }
    function setup() {
      if (latched) return;
      stage.style.removeProperty("--gw"); stage.style.removeProperty("--g");
      stage.classList.remove("scrolly", "flippy");
      stage.style.height = "";
      if (flipIO) { flipIO.disconnect(); flipIO = null; }
      clearT();
      if (reduce) return;
      if (wide.matches) {
        var wrap = stage.querySelector(".wrap"), head = stage.querySelector(".section-head");
        var g = 22, cs = getComputedStyle(wrap);
        var innerW = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        var headH = head.offsetHeight + 28;
        var gw = Math.floor(Math.min(290, (innerW - 3 * g) / 4, ((window.innerHeight - 72) - headH - g - 56) / 2 / 1.25));
        stage.style.setProperty("--gw", gw + "px");
        stage.style.setProperty("--g", g + "px");
        stage.classList.add("scrolly");
        stage.style.height = (100 + n * 60 + 70) + "vh";
        tick();
      }
    }
    setup();
    // tap to flip on touch screens (hover does it on desktop)
    stage.querySelectorAll(".gcard").forEach(function (g) {
      g.addEventListener("click", function () {
        var on = g.classList.toggle("tapped");
        g.setAttribute("aria-pressed", on ? "true" : "false");
      });
    });
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
    var items = document.querySelectorAll("main > section:not(.team-stage) .section-head, .split-head, .card, .case-card, .tile, .benefit, .partner-wall li, .comment, .brief, .mini-event, .steps li, .res-list li, .two-col > *, .form, .postcard, .cta, .ypl-teaser, .tl-card, .snap, .pol-wall li, .values li");
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

/* ---------- sketchbook flip-book + partner cards ---------- */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll(".flipbook").forEach(function (fb) {
    var book = fb.querySelector(".book"), leaves = Array.prototype.slice.call(fb.querySelectorAll(".leaf"));
    var mbook = fb.querySelector(".mbook"), mpages = Array.prototype.slice.call(fb.querySelectorAll(".mpage"));
    var prev = fb.querySelector('[data-dir="-1"]'), next = fb.querySelector('[data-dir="1"]'), count = fb.querySelector(".book-count");
    var n = leaves.length, cur = 0, mobile = false;

    function size() {
      var w = fb.clientWidth;
      mobile = window.matchMedia("(max-width: 760px)").matches;
      // desktop: leave room for the side arrows, and keep the whole book on screen
      var byWidth = Math.floor((w - 2 * (54 + 18) - 8) / 2);
      var sec = fb.closest("section"), head = sec && sec.querySelector(".section-head, .split-head");
      var headH = head ? head.offsetHeight + parseFloat(getComputedStyle(head).marginBottom || 0) : 0;
      // nav bar + heading + counter + breathing room must all fit on one screen
      var byHeight = Math.floor((window.innerHeight - 72 - headH - 30 - 64) / 1.3);
      var pw = mobile ? Math.min(w * 0.82, 360) : Math.max(220, Math.min(470, byWidth, byHeight));
      fb.style.setProperty("--pw", pw + "px");
      fb.style.setProperty("--k", (pw / 460).toFixed(4));
      update(true);
    }
    function label(i) {
      if (i === 0) return "Cover";
      if (i === n) return "Back cover";
      return "Pages " + (i * 2 - 1) + "–" + (i * 2) + " of " + ((n - 1) * 2);
    }
    function update(instant) {
      if (mobile) {
        var mi = Math.round(mbook.scrollLeft / Math.max(1, mpages[0].offsetWidth + 16));
        count.textContent = mi === 0 ? "Cover" : "Page " + mi + " of " + (mpages.length - 1);
        prev.disabled = mi <= 0; next.disabled = mi >= mpages.length - 1;
        return;
      }
      leaves.forEach(function (lf, i) {
        var flipped = i < cur;
        lf.classList.toggle("flipped", flipped);
        lf.style.zIndex = flipped ? i + 1 : n - i + 1;
      });
      book.classList.toggle("is-open", cur > 0 && cur < n);
      book.classList.toggle("is-end", cur === n);
      count.textContent = label(cur);
      prev.disabled = cur === 0; next.disabled = cur === n;
    }
    function go(d) {
      if (mobile) {
        var step = mpages[0].offsetWidth + 16;
        mbook.scrollBy({ left: d * step, behavior: reduce ? "auto" : "smooth" });
        return;
      }
      var to = Math.max(0, Math.min(n, cur + d));
      if (to === cur) return;
      var lf = leaves[d > 0 ? cur : cur - 1];
      lf.style.zIndex = 100; lf.classList.add("turning");
      setTimeout(function () { lf.classList.remove("turning"); }, 1000);
      cur = to;
      leaves.forEach(function (l, i) { if (l !== lf) l.style.zIndex = i < cur ? i + 1 : n - i + 1; });
      lf.classList.toggle("flipped", d > 0);
      book.classList.toggle("is-open", cur > 0 && cur < n);
      book.classList.toggle("is-end", cur === n);
      count.textContent = label(cur);
      prev.disabled = cur === 0; next.disabled = cur === n;
      setTimeout(function () { lf.style.zIndex = d > 0 ? leaves.indexOf(lf) + 1 : n - leaves.indexOf(lf) + 1; }, 950);
    }
    prev.addEventListener("click", function () { go(-1); });
    next.addEventListener("click", function () { go(1); });
    // click a page: right side goes forward, left side goes back (links inside pages still work)
    leaves.forEach(function (lf, i) {
      lf.addEventListener("click", function (e) {
        if (e.target.closest("a")) return;
        go(i < cur ? -1 : 1);
      });
    });
    // swipe / drag
    var sx = null;
    book.addEventListener("pointerdown", function (e) { sx = e.clientX; });
    book.addEventListener("pointerup", function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) { go(dx < 0 ? 1 : -1); e.preventDefault(); }
    });
    fb.setAttribute("tabindex", "0");
    fb.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { go(1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); }
    });
    mbook.addEventListener("scroll", function () { requestAnimationFrame(function () { update(); }); }, { passive: true });
    var lastW = 0;
    var lastH = window.innerHeight;
    window.addEventListener("resize", function () {
      if (fb.clientWidth !== lastW || Math.abs(window.innerHeight - lastH) > 80) { lastW = fb.clientWidth; lastH = window.innerHeight; size(); }
    });
    size(); lastW = fb.clientWidth;
  });

  /* partner polaroids -> detail card */
  var dataEl = document.getElementById("partner-data"), dlg = document.querySelector(".pol-dialog");
  if (dataEl && dlg) {
    var data = JSON.parse(dataEl.textContent);
    var q = function (s) { return dlg.querySelector(s); };
    document.querySelectorAll("[data-partner]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var d = data[+btn.dataset.partner];
        q(".pd-pic").innerHTML = d.img ? '<img src="' + d.img + '" alt="' + d.name + '">' : '<span class="pol-initials">' + d.name.split(" ").slice(0, 2).map(function (w) { return w[0]; }).join("") + "</span>";
        q(".pd-kind").textContent = d.kind;
        q("#pd-name").textContent = d.name;
        q(".pd-made").innerHTML = "<b>What we made:</b> " + d.made;
        q(".pd-quote").innerHTML = d.quote; q(".pd-quote").hidden = !d.quote;
        q(".pd-link").href = d.link || "#"; q(".pd-link").hidden = !d.link;
        if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
      });
    });
    q(".pd-close").addEventListener("click", function () { dlg.close ? dlg.close() : dlg.removeAttribute("open"); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }
})();

/* ---------- numbers count up from 0 when they scroll into view ---------- */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  var nums = document.querySelectorAll(".swatch-card .num, .stat .num");
  nums.forEach(function (el) {
    var m = el.textContent.trim().match(/^([^0-9]*)([0-9][0-9,]*)(.*)$/);
    if (!m) return;
    var target = parseInt(m[2].replace(/,/g, ""), 10), pre = m[1], post = m[3], comma = m[2].indexOf(",") > -1;
    var fmt = function (v) { return pre + (comma ? v.toLocaleString("en-US") : String(v)) + post; };
    el.style.minWidth = el.offsetWidth + "px";          // keep the layout from jumping while counting
    el.textContent = fmt(0);
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      var start = null, dur = 1600 + Math.min(900, String(target).length * 180);
      (function step(t) {
        if (start === null) start = t;
        var k = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - k, 4);
        el.textContent = fmt(Math.round(target * e));
        if (k < 1) requestAnimationFrame(step); else { el.textContent = fmt(target); el.classList.add("counted"); }
      })(performance.now());
    }, { threshold: 0.6 });
    io.observe(el);
  });
})();

/* ---------- slide deck viewer ---------- */
(function () {
  document.querySelectorAll(".deck").forEach(function (deck) {
    var titles = JSON.parse(deck.dataset.titles), n = titles.length, cur = 0;
    var img = deck.querySelector(".deck-img"), cap = deck.querySelector(".deck-caption");
    var thumbs = Array.prototype.slice.call(deck.querySelectorAll(".deck-thumb"));
    var pad = function (i) { return (i < 9 ? "0" : "") + (i + 1); };
    // preload neighbours so flipping feels instant
    function preload(i) { if (i >= 0 && i < n) { var im = new Image(); im.src = "assets/deck/slide-" + pad(i) + ".webp"; } }
    function show(i, dir) {
      cur = (i + n) % n;
      img.classList.remove("in-l", "in-r"); void img.offsetWidth;
      img.src = "assets/deck/slide-" + pad(cur) + ".webp";
      img.alt = "Slide " + (cur + 1) + ": " + titles[cur].replace(/&[a-z]+;/g, " ");
      if (dir) img.classList.add(dir > 0 ? "in-r" : "in-l");
      cap.innerHTML = "<b>" + (cur + 1) + " / " + n + "</b> <span>" + titles[cur] + "</span>";
      thumbs.forEach(function (t, k) { t.classList.toggle("on", k === cur); t.setAttribute("aria-current", k === cur ? "true" : "false"); });
      var t = thumbs[cur], strip = t.parentElement;
      strip.scrollTo({ left: t.offsetLeft - strip.clientWidth / 2 + t.offsetWidth / 2, behavior: "smooth" });
      preload(cur + 1); preload(cur - 1);
    }
    deck.querySelectorAll(".deck-arrow").forEach(function (b) { b.addEventListener("click", function () { show(cur + +b.dataset.dir, +b.dataset.dir); }); });
    thumbs.forEach(function (t) { t.addEventListener("click", function () { var i = +t.dataset.i; show(i, i > cur ? 1 : -1); }); });
    document.querySelectorAll(".deck-jump").forEach(function (b) { b.addEventListener("click", function () { show(+b.dataset.i, 1); deck.scrollIntoView({ behavior: "smooth", block: "center" }); }); });
    deck.setAttribute("tabindex", "0");
    deck.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { show(cur + 1, 1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { show(cur - 1, -1); e.preventDefault(); }
    });
    var frame = deck.querySelector(".deck-frame"), sx = null;
    frame.addEventListener("pointerdown", function (e) { sx = e.clientX; });
    frame.addEventListener("pointerup", function (e) {
      if (sx === null) return; var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      else if (!e.target.closest(".deck-full")) show(cur + 1, 1);    // tap the slide to go forward
    });
    var full = deck.querySelector(".deck-full");
    full.addEventListener("click", function (e) {
      e.stopPropagation();
      var el = deck.querySelector(".deck-stage");
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
    });
    show(0);
  });
})();
