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
    title: "AIA Youth Workshop",
    date: "2025-06-17",
    place: "Hackensack, NJ",
    type: "Workshop",
    desc: "A hands-on workshop for youth on entrepreneurship, financial literacy and creative skills."
  }
  /* Add past events like this (remove the slash-star marks around it):
  ,{
    title: "Holiday Card-Making",
    date: "2025-12-06",
    time: "2:00 PM",
    place: "Bergen County, NJ",
    type: "Volunteering",
    desc: "Members made cards for local seniors."
  }
  */
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
        (feature.link ? '<div class="btn-row"><a class="btn" href="' + esc(feature.link) + '" target="_blank" rel="noopener">Sign up</a></div>' : "") +
      "</div>" +
      '<div class="brief-art" aria-hidden="true"><div class="s1"></div><div class="s2"></div><p class="big-date"><span>' +
        MONTHS[feature.d.getMonth()].toUpperCase() + "</span><strong>" + feature.d.getDate() + "</strong></p></div>";
  }
  var more = document.getElementById("event-more");
  if (more) {
    more.innerHTML = others.length ? others.map(function (e) {
      return '<article class="mini-event"><p class="cal-chip"><b>' + e.d.getDate() + "</b>" + MONTHS[e.d.getMonth()].slice(0, 3) + " " + e.d.getFullYear() +
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
