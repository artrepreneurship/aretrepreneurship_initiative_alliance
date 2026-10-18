/* =========================================================
   AIA EVENTS — this list powers the homepage events section
   and the event calendar.

   To add an event, copy one { ... } block and change it.
   - date:  YYYY-MM-DD
   - link:  optional sign-up link (delete the line if none)
   Upcoming and past events sort themselves by date.
   ========================================================= */
var EVENTS = [
  {
    title: "Design 101 Workshop",
    date: "2025-10-19",
    time: "3:00\u20134:00 PM",
    place: "Bergenfield Public Library",
    type: "Workshop",
    desc: "A free, hands-on workshop for middle and upper elementary students: what makes a post eye-catching, how color, font and layout shape a brand, and designing your own on-brand Instagram post."
  },
  {
    title: "AIA Youth Innovation Workshop",
    date: "2025-06-17",
    time: "4:00\u20136:00 PM",
    place: "Bergen County Academies, Hackensack",
    type: "Workshop",
    desc: "70+ students heard from David Lin (Linvest21, ex-JPMorgan), Michael Bryzek (Flow Commerce, Gilt) and Jessica Wang (L\u2019Or\u00e9al), then split into breakout rooms. Sushi, a keychain stand and a raffle too.",
    img: "assets/workshop/jessica-wang.webp",
    link: "impact#workshop",
    linkText: "See the recap"
  },
  {
    title: "PPO Picnic Booth",
    date: "2025-05-18",
    place: "Bergen County, NJ",
    type: "Community event",
    desc: "Spin-the-wheel, a gachapon machine and a table of keychains handmade by members.",
    img: "assets/events/ppo-picnic-booth.webp"
  }
  /* To add an event, copy a { ... } block above, put a comma between blocks, and change it.
     img is optional: put a photo in assets/events/ and write its path.
     link + linkText are optional: a button on the featured event. */
];

(function () {
  var box = document.getElementById("events");
  if (!box) return;
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var today = new Date(); today.setHours(0, 0, 0, 0);
  function parse(d) { var p = d.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function key(d) { return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fill(s) { s = esc(s || ""); return /^\[.*\]$/.test(s) ? '<span class="fill">' + s + "</span>" : s; }
  function longDate(d) { return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }

  var list = EVENTS.map(function (e) { var d = parse(e.date); return Object.assign({ d: d, past: d < today }, e); })
    .sort(function (a, b) { return a.d - b.d; });
  var upcoming = list.filter(function (e) { return !e.past; });
  var past = list.filter(function (e) { return e.past; }).reverse();
  var feature = upcoming[0] || past[0];
  var others = (upcoming[0] ? past : past.slice(1)).slice(0, 3);

  /* ---- featured event + recent ones ---- */
  var feat = document.getElementById("event-feature");
  if (feat && feature) {
    feat.innerHTML =
      '<div class="brief-copy">' +
        '<p class="eyebrow">' + (feature.past ? "Our latest event" : "Coming up next") + "</p>" +
        '<h3 class="brief-title">' + esc(feature.title) + "</h3>" +
        '<dl class="fields"><dt>Type</dt><dd>' + fill(feature.type) + "</dd><dt>Date</dt><dd>" + longDate(feature.d) + (feature.time ? ", " + fill(feature.time) : "") +
        "</dd><dt>Where</dt><dd>" + fill(feature.place) + "</dd></dl>" +
        '<p class="muted">' + fill(feature.desc) + "</p>" +
        (feature.link ? '<div class="btn-row"><a class="btn" href="' + esc(feature.link) + '"' + (/^https?:/.test(feature.link) ? ' target="_blank" rel="noopener"' : "") + ">" + esc(feature.linkText || "Sign up") + "</a></div>" : "") +
      "</div>" +
      (feature.img
        ? '<div class="brief-art brief-photo"><img src="' + esc(feature.img) + '" alt="' + esc(feature.title) + '"><p class="date-chip"><b>' + feature.d.getDate() + "</b>" + MONTHS[feature.d.getMonth()].slice(0, 3) + "</p></div>"
        : '<div class="brief-art" aria-hidden="true"><div class="s1"></div><div class="s2"></div><p class="big-date"><span>' +
          MONTHS[feature.d.getMonth()].toUpperCase() + "</span><strong>" + feature.d.getDate() + "</strong></p></div>");
  }
  var more = document.getElementById("event-more");
  if (more) {
    more.innerHTML = others.length ? others.map(function (e) {
      return '<article class="mini-event' + (e.img ? " has-img" : "") + '">' + (e.img ? '<img class="mini-img" src="' + esc(e.img) + '" alt="" loading="lazy">' : "") + '<p class="cal-chip"><b>' + e.d.getDate() + "</b>" + MONTHS[e.d.getMonth()].slice(0, 3) + " " + e.d.getFullYear() +
        '</p><div><span class="cat">' + esc(e.type) + "</span><h4>" + esc(e.title) + '</h4><p class="muted">' + fill(e.place) + "</p></div></article>";
    }).join("") : '<p class="muted small">More past events will show up here as they are added.</p>';
  }

  /* ---- month calendar ---- */
  var byDay = {};
  list.forEach(function (e) { (byDay[key(e.d)] = byDay[key(e.d)] || []).push(e); });
  var start = feature ? feature.d : today;
  var view = new Date(start.getFullYear(), start.getMonth(), 1);
  var grid = document.getElementById("cal-grid"), label = document.getElementById("cal-label"), detail = document.getElementById("cal-detail");

  function showDay(evs) {
    detail.innerHTML = evs.map(function (e) {
      return '<p class="cal-detail-date">' + longDate(e.d) + "</p><h4>" + esc(e.title) + '</h4><p class="muted">' + fill(e.type) + " &middot; " + fill(e.place) + "</p>";
    }).join("");
  }
  function draw() {
    label.textContent = MONTHS[view.getMonth()] + " " + view.getFullYear();
    var first = view.getDay(), days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    var html = ["S", "M", "T", "W", "T", "F", "S"].map(function (d) { return '<span class="dow">' + d + "</span>"; }).join("");
    for (var i = 0; i < first; i++) html += "<span></span>";
    var firstEvent = null;
    for (var d = 1; d <= days; d++) {
      var dt = new Date(view.getFullYear(), view.getMonth(), d), evs = byDay[key(dt)];
      var cls = "day" + (evs ? " has" : "") + (+dt === +today ? " today" : "");
      if (evs) { if (!firstEvent) firstEvent = evs; html += '<button class="' + cls + '" data-k="' + key(dt) + '" aria-label="' + longDate(dt) + ", " + evs.length + ' event">' + d + "</button>"; }
      else html += '<span class="' + cls + '">' + d + "</span>";
    }
    grid.innerHTML = html;
    if (firstEvent) showDay(firstEvent);
    else detail.innerHTML = '<p class="muted">No events this month.</p>';
  }
  grid.addEventListener("click", function (e) {
    var b = e.target.closest("button.day"); if (!b) return;
    grid.querySelectorAll(".day.sel").forEach(function (x) { x.classList.remove("sel"); });
    b.classList.add("sel"); showDay(byDay[b.dataset.k]);
  });
  document.getElementById("cal-prev").addEventListener("click", function () { view.setMonth(view.getMonth() - 1); draw(); });
  document.getElementById("cal-next").addEventListener("click", function () { view.setMonth(view.getMonth() + 1); draw(); });
  document.getElementById("cal-today").addEventListener("click", function () { view = new Date(today.getFullYear(), today.getMonth(), 1); draw(); });
  draw();
})();
