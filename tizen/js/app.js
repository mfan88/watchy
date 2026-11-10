/* Watchy for Samsung Tizen TV (2.4+). Plain ES5: no build step, no modern APIs. */
(function () {
  "use strict";

  var SEP = " · ";
  var SLOT = 30 * 60000, SPAN = 6 * SLOT;
  var TEAMS = "ANA BOS BUF CAR CBJ CGY CHI COL DAL DET EDM FLA LAK MIN MTL NJD NSH NYI NYR OTT PHI PIT SEA SJS STL TBL TOR UTA VAN VGK WPG WSH".split(" ");
  var MISSING = window.WATCHY_MISSING || [];
  var CFG = window.WATCHY_CONFIG || { base: "https://tv.zuxi.me", secret: "" };
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 10009, ESC: 27, BKSP: 8, CH_UP: 427, CH_DOWN: 428, PLAYPAUSE: 10252, PLAY: 415, PAUSE: 19, STOP: 413, IME_DONE: 65376, IME_CANCEL: 65385 };

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.appendChild(document.createTextNode(text));
    return e;
  }
  function hasClass(e, c) { return (" " + e.className + " ").indexOf(" " + c + " ") >= 0; }
  function addClass(e, c) { if (!hasClass(e, c)) e.className = (e.className ? e.className + " " : "") + c; }
  function rmClass(e, c) { e.className = (" " + e.className + " ").replace(" " + c + " ", " ").replace(/^\s+|\s+$/g, ""); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function fmtTime(ms) {
    var d = new Date(ms), h = d.getHours(), m = d.getMinutes();
    return ((h % 12) || 12) + ":" + pad(m) + (h < 12 ? " AM" : " PM");
  }
  function trim(s) { return (s || "").replace(/^\s+|\s+$/g, ""); }
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function secret() { return trim(CFG.secret) || load("watchy.secret") || ""; }
  function bundled() { return !!trim(CFG.secret); }

  function get(path, cb) {
    var x = new XMLHttpRequest(), done = false;
    x.open("GET", CFG.base.replace(/\/+$/, "") + "/" + secret() + "/" + path + "?t=" + Date.now(), true);
    x.timeout = 20000;
    x.onreadystatechange = function () {
      if (x.readyState !== 4 || done) return;
      done = true;
      if (x.status >= 200 && x.status < 300) cb(null, x.responseText);
      else if (x.status === 401 || x.status === 403 || x.status === 404) cb("Access key not accepted (" + x.status + ")");
      else cb(x.status ? "Stream server error " + x.status : "Can't reach the stream server");
    };
    x.ontimeout = function () { if (!done) { done = true; cb("Can't reach the stream server"); } };
    x.send();
  }

  // ---------- parsing (same rules as the website) ----------
  function parseM3U(text) {
    var out = [], lines = text.split(/\r?\n/), i, j, m;
    for (i = 0; i < lines.length; i++) {
      var line = trim(lines[i]);
      if (line.indexOf("#EXTINF:") !== 0) continue;
      var attrs = {}, re = /([\w-]+)="([^"]*)"/g;
      while ((m = re.exec(line))) attrs[m[1]] = m[2];
      var title = trim(line.replace(/"[^"]*"/g, '""').split(",").slice(1).join(","));
      var url = "";
      for (j = i + 1; j < lines.length; j++) {
        var l = trim(lines[j]);
        if (!l) continue;
        if (l.charAt(0) !== "#") url = l;
        break;
      }
      var id = attrs["tvg-id"];
      if (!url || !id) continue;
      var name = attrs["tvg-name"] || title || id;
      var k = name.indexOf(SEP);
      var game = k === -1 ? name : name.slice(0, k);
      var teams = game.match(/^(\S+)\s+@\s+(\S+)$/);
      out.push({ id: id, name: name, game: game, provider: k === -1 ? "Main feed" : name.slice(k + SEP.length),
        away: teams ? teams[1] : null, home: teams ? teams[2] : null, url: url });
    }
    return out;
  }

  function parseTime(v) {
    var m = trim(v).match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?$/);
    if (!m) return NaN;
    var tz = m[7] || "+0000";
    var off = (tz.charAt(0) === "-" ? -1 : 1) * (+tz.slice(1, 3) * 60 + +tz.slice(3, 5));
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) - off * 60000;
  }

  function parseXmltv(xml) {
    var out = [], re = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/g, m, a;
    function tag(block, name) {
      var r = block.match(new RegExp("<" + name + "[^>]*>([\\s\\S]*?)</" + name + ">"));
      if (!r) return null;
      return trim(r[1].replace(/\s+/g, " ")).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
    }
    while ((m = re.exec(xml))) {
      var attrs = {}, ar = /([\w-]+)="([^"]*)"/g;
      while ((a = ar.exec(m[1]))) attrs[a[1]] = a[2];
      var s = parseTime(attrs.start || ""), e = parseTime(attrs.stop || ""), t = tag(m[2], "title");
      if (!attrs.channel || !t || isNaN(s) || isNaN(e)) continue;
      var soon = /\(starting soon\)\s*$/i.test(t);
      if (soon) t = t.replace(/\s*\(starting soon\)\s*$/i, "");
      out.push({ c: attrs.channel, s: s, e: e, t: t, d: tag(m[2], "desc"), soon: soon });
    }
    return out;
  }

  // ---------- assets ----------
  function isTeam(c) { return !!c && TEAMS.indexOf(c) >= 0; }
  function matchupImg(away, home) {
    if (!isTeam(away) || !isTeam(home) || away === home) return null;
    var k = away + "_vs_" + home;
    return MISSING.indexOf(k) >= 0 ? null : "matchups/" + k + "." + (CFG.img === "jpg" ? "jpg" : "webp");
  }
  var RULES = [
    [/^main feed$/i, "watchy.svg"], [/^espn\s*\+/i, "espn-plus"], [/^espn/i, "espn"],
    [/^(sportsnet|sn)(?=$|[\s+\d]|one|west|east|ontario|pacific)/i, "sportsnet-all"],
    [/^tsn/i, "tsn"], [/^rds/i, "rds"], [/^tva/i, "tva-sports"], [/^bein/i, "bein-sports"], [/^viaplay/i, "viaplay"],
    [/^v\s*sport/i, "v-sport"], [/^nova\s*sport/i, "nova-sport"], [/^chsn/i, "chsn"], [/^nhl\s*(n$|n\b|network)/i, "nhl-network"],
    [/^max\s*sport/i, "max-sport"], [/^premier\s*sports?/i, "premier-sports"], [/^sport\s*tv/i, "sport-tv"],
    [/^(sport\s*5|5\s*stars?|sport\s*five)/i, "sport-five-stars"]
  ];
  function providerLogo(p) {
    p = trim(p);
    for (var i = 0; i < RULES.length; i++) if (RULES[i][0].test(p)) {
      var k = RULES[i][1];
      return "providers/" + (k.indexOf(".") >= 0 ? k : k + (CFG.img === "jpg" ? ".png" : ".webp"));
    }
    return null;
  }
  function initials(label) {
    var w = trim(label).split(/\s+/), s = "";
    for (var i = 0; i < w.length && s.length < 2; i++) if (w[i]) s += w[i].charAt(0).toUpperCase();
    return s || "?";
  }
  function avatar(provider) {
    var a = el("div", "av"), src = providerLogo(provider);
    if (src) {
      var img = el("img");
      img.onerror = function () { a.innerHTML = ""; a.appendChild(document.createTextNode(initials(provider))); };
      img.src = src;
      a.appendChild(img);
    } else a.appendChild(document.createTextNode(initials(provider)));
    return a;
  }

  // ---------- games ----------
  function role(c) {
    var p = c.provider.toLowerCase();
    if (/\bhome\b/.test(p) || (c.home && p.indexOf(c.home.toLowerCase()) >= 0)) return 0;
    if (/\baway\b/.test(p) || (c.away && p.indexOf(c.away.toLowerCase()) >= 0)) return 1;
    return 2;
  }
  function buildGames(channels, programmes) {
    var now = Date.now(), order = [], by = {}, ids = {}, prog = {}, i;
    for (i = 0; i < channels.length; i++) {
      var c = channels[i];
      ids[c.id] = c;
      if (!by[c.game]) { by[c.game] = []; order.push(c.game); }
      by[c.game].push(c);
    }
    for (i = 0; i < programmes.length; i++) {
      var p = programmes[i];
      if (p.e < now || p.soon || !ids[p.c]) continue;
      var g = ids[p.c].game;
      if (!prog[g] || p.s < prog[g].s) prog[g] = p;
    }
    var games = [];
    for (i = 0; i < order.length; i++) {
      var feeds = by[order[i]].slice(), pr = prog[order[i]];
      feeds.sort(function (a, b) { return role(a) - role(b); });
      games.push({ title: order[i], feeds: feeds, start: pr ? pr.s : null, end: pr ? pr.e : null,
        live: !pr || now >= pr.s, desc: pr ? pr.d : null, away: feeds[0].away, home: feeds[0].home, idx: i });
    }
    games.sort(function (a, b) {
      if (a.live !== b.live) return a.live ? -1 : 1;
      return ((a.start || 0) - (b.start || 0)) || (a.idx - b.idx);
    });
    return games;
  }

  // ---------- focus engine ----------
  var focused = null;
  var scope = "app";
  function focusables() {
    var root = scope === "setup" ? $("setup") : $("app");
    var all = root.querySelectorAll(".f"), out = [];
    for (var i = 0; i < all.length; i++) if (all[i].offsetParent !== null) out.push(all[i]);
    return out;
  }
  function setFocus(e) {
    if (!e) return;
    if (focused && focused !== e) { rmClass(focused, "focus"); if (focused.tagName === "INPUT") focused.blur(); }
    focused = e;
    addClass(e, "focus");
    if (e.onfocusin2) e.onfocusin2();
  }
  function rect(e) { return e.getBoundingClientRect(); }
  function move(dir) {
    if (!focused) { setFocus(focusables()[0]); return; }
    var r = rect(focused), cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    var list = focusables(), best = null, bestScore = Infinity;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o === focused) continue;
      var q = rect(o), ox = (q.left + q.right) / 2, oy = (q.top + q.bottom) / 2, main, cross;
      if (dir === KEY.LEFT) { if (q.right > r.left + 2) continue; main = r.left - q.right; cross = Math.abs(oy - cy); }
      else if (dir === KEY.RIGHT) { if (q.left < r.right - 2) continue; main = q.left - r.right; cross = Math.abs(oy - cy); }
      else if (dir === KEY.UP) { if (q.bottom > r.top + 2) continue; main = r.top - q.bottom; cross = overlapX(r, q) ? 0 : Math.abs(ox - cx); }
      else { if (q.top < r.bottom - 2) continue; main = q.top - r.bottom; cross = overlapX(r, q) ? 0 : Math.abs(ox - cx); }
      var score = main + cross * 2;
      if (score < bestScore) { bestScore = score; best = o; }
    }
    if (best) setFocus(best);
  }
  function overlapX(a, b) {
    // Prefer the item under the "now" area for guide rows: overlap with focused cell.
    return b.left < a.right && b.right > a.left;
  }

  // ---------- state ----------
  var channels = [], programmes = [], loaded = false, error = null, tab = "home", lastSig = "";

  function refresh(first) {
    get("playlist.m3u", function (err, text) {
      if (err) {
        if (!bundled() && err.indexOf("Access key") === 0) { store("watchy.secret", null); showSetup(err); return; }
        error = err; loaded = true; render(true); return;
      }
      channels = parseM3U(text); error = null;
      get("guide.xml", function (e2, xml) {
        if (!e2) programmes = parseXmltv(xml);
        loaded = true;
        render(first);
      });
    });
  }

  function render(force) {
    var sig = JSON.stringify([channels, programmes, error, loaded, Math.floor(Date.now() / SLOT)]);
    if (!force && sig === lastSig) return;
    lastSig = sig;
    var keep = focused && focused.getAttribute("data-key");
    renderHome();
    renderGuide();
    if (keep && scope === "app") {
      var all = focusables();
      for (var i = 0; i < all.length; i++) if (all[i].getAttribute("data-key") === keep) { setFocus(all[i]); return; }
    }
    if (scope === "app" && (!focused || !document.body.contains(focused))) setFocus($("tab-" + tab));
  }

  function emptyMsg(box, title, sub) {
    box.innerHTML = "";
    if (title === null) { box.appendChild(el("div", "spinner")); box.style.display = ""; return; }
    if (!title) { box.style.display = "none"; return; }
    box.style.display = "";
    box.appendChild(el("div", null, title));
    if (sub) box.appendChild(el("div", "dim", sub));
  }

  // ---------- home ----------
  function renderHome() {
    var list = $("home-list"), games = buildGames(channels, programmes);
    list.innerHTML = "";
    list.style.webkitTransform = list.style.transform = "translateY(0)";
    if (!loaded) emptyMsg($("home-empty"), null);
    else if (!games.length) emptyMsg($("home-empty"), error ? "Can't reach the stream server" : "No live games right now",
      error || "Games appear here when they start. This screen refreshes automatically.");
    else emptyMsg($("home-empty"), "");
    for (var i = 0; i < games.length; i++) list.appendChild(homeRow(games[i], i));
  }

  function homeRow(g, idx) {
    var row = el("div", "row");
    var tile = el("div", "tile f");
    tile.setAttribute("data-key", "tile:" + g.title);
    var src = matchupImg(g.away, g.home);
    function pair() {
      var p = el("div", "pair");
      if (isTeam(g.away) && isTeam(g.home)) {
        var a = el("img"); a.src = "teams/" + g.away + ".svg"; p.appendChild(a);
        p.appendChild(document.createTextNode("@"));
        var b = el("img"); b.src = "teams/" + g.home + ".svg"; p.appendChild(b);
      } else { p.className = "pair wordmark"; p.appendChild(document.createTextNode("watchy")); }
      tile.insertBefore(p, tile.firstChild);
    }
    if (src) {
      var img = el("img", "m");
      img.onerror = function () { tile.removeChild(img); pair(); };
      img.src = src;
      tile.appendChild(img);
    } else pair();
    tile.appendChild(el("div", "scrim"));
    tile.appendChild(el("span", "badge " + (g.live ? "live" : "soon"), g.live ? "LIVE" : "SOON"));
    tile.appendChild(el("div", "watch", "▶  Watch"));
    tile.onenter = function () { play(g.feeds[0]); };
    tile.onfocusin2 = function () { scrollHome(idx); };
    row.appendChild(tile);

    var info = el("div", "info");
    info.appendChild(el("h2", null, g.title));
    var sub = "";
    if (g.start && g.end) sub = fmtTime(g.start) + " – " + fmtTime(g.end);
    if (g.desc) sub += (sub ? "  ·  " : "") + g.desc;
    info.appendChild(el("div", "sub", sub || (g.live ? "Live now" : "Starting soon")));
    info.appendChild(el("div", "count", g.feeds.length + (g.feeds.length === 1 ? " STREAM" : " STREAMS")));
    var feeds = el("div", "feeds");
    for (var i = 0; i < g.feeds.length; i++) feeds.appendChild(feedChip(g.feeds[i], idx));
    var wrap = el("div", "feeds-wrap");
    wrap.appendChild(feeds);
    info.appendChild(wrap);
    row.appendChild(info);
    return row;
  }

  function feedChip(c, idx) {
    var chip = el("div", "feed f");
    chip.setAttribute("data-key", "feed:" + c.id);
    chip.appendChild(avatar(c.provider));
    var txt = el("div", "txt");
    txt.appendChild(el("div", "name", c.provider));
    var r = role(c);
    if (r < 2 && !/\b(home|away)\b/i.test(c.provider)) txt.appendChild(el("div", "role", r === 0 ? "Home feed" : "Away feed"));
    chip.appendChild(txt);
    chip.onenter = function () { play(c); };
    chip.onfocusin2 = function () {
      scrollHome(idx);
      // Slide the row of feeds so the focused one stays on screen.
      var row = chip.parentNode, x = chip.offsetLeft, w = chip.offsetWidth, view = 1920 - 760 - 96;
      var shift = Math.max(0, x + w - view + 24);
      if (x - shift < 0) shift = x;
      row.style.webkitTransform = row.style.transform = "translateX(" + (-shift) + "px)";
    };
    return chip;
  }

  function scrollHome(idx) {
    var y = -Math.max(0, idx * 436 - 0);
    var l = $("home-list");
    l.style.webkitTransform = l.style.transform = "translateY(" + y + "px)";
  }

  // ---------- guide ----------
  var gScroll = 0, gRowsCount = 0;
  function renderGuide() {
    var now = Date.now(), from = now - now % SLOT, i, j;
    var times = $("g-times"), width = 1920 - 96 * 2 - 600;
    function x(t) { return Math.round((Math.max(0, Math.min(SPAN, t - from)) / SPAN) * width); }
    times.innerHTML = "";
    for (i = 0; i < 6; i++) { var d = el("div", null, fmtTime(from + i * SLOT)); d.style.left = x(from + i * SLOT) + "px"; times.appendChild(d); }

    var rows = $("g-rows");
    rows.innerHTML = "";
    var byCh = {};
    for (i = 0; i < programmes.length; i++) {
      var p = programmes[i];
      if (p.e <= from || p.s >= from + SPAN) continue;
      (byCh[p.c] = byCh[p.c] || []).push(p);
    }
    var games = buildGames(channels, programmes), n = 0, first = null;
    for (i = 0; i < games.length; i++) for (j = 0; j < games[i].feeds.length; j++) {
      var c = games[i].feeds[j];
      var ps = dedupe((byCh[c.id] || []).sort(function (a, b) { return a.s - b.s; }));
      rows.appendChild(guideRow(c, ps, n++, from, x));
      if (!first) first = [c, ps[0]];
    }
    gRowsCount = n;
    if (!loaded) emptyMsg($("guide-empty"), null);
    else if (!n) emptyMsg($("guide-empty"), "Nothing on right now");
    else emptyMsg($("guide-empty"), "");
    if (first) detail(first[0], first[1]); else { $("g-title").innerHTML = ""; $("g-meta").innerHTML = ""; }
    gScroll = 0;
    rows.style.webkitTransform = rows.style.transform = "translateY(0)";
  }

  function dedupe(ps) {
    var out = [];
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i], last = out[out.length - 1];
      if (last && p.s < last.e) {
        if (last.soon && !p.soon) out[out.length - 1] = { c: p.c, s: Math.max(p.s, last.s), e: p.e, t: p.t, d: p.d, soon: false };
        continue;
      }
      out.push(p);
    }
    return out;
  }

  function guideRow(c, ps, n, from, x) {
    var row = el("div", "g-row");
    var label = el("div", "g-label");
    label.appendChild(avatar(c.provider));
    label.appendChild(el("div", "g", c.game));
    label.appendChild(el("div", "p", c.provider));
    row.appendChild(label);
    var line = el("div", "g-line"), now = Date.now();
    var blocks = ps.length ? ps : [null];
    for (var i = 0; i < blocks.length; i++) (function (p, k) {
      var s = p ? p.s : from, e = p ? p.e : from + SPAN;
      var cell = el("div", "prog f" + (p && !p.soon && now >= p.s && now <= p.e ? " now" : ""));
      cell.setAttribute("data-key", "prog:" + c.id + ":" + k);
      cell.style.left = x(s) + "px";
      cell.style.width = Math.max(0, x(e) - x(s) - 8) + "px";
      cell.appendChild(el("div", "t", p ? p.t.split(SEP)[0] : c.game));
      cell.appendChild(el("div", "m", !p ? "Live stream" : p.soon ? "Starting soon" : fmtTime(p.s) + " – " + fmtTime(p.e)));
      cell.onenter = function () { play(c); };
      cell.onfocusin2 = function () { detail(c, p); scrollGuide(n); };
      line.appendChild(cell);
    })(blocks[i], i);
    if (now >= from && now <= from + SPAN) { var nl = el("div", "nowline"); nl.style.left = x(now) + "px"; line.appendChild(nl); }
    row.appendChild(line);
    return row;
  }

  function detail(c, p) {
    $("g-title").innerHTML = "";
    $("g-title").appendChild(document.createTextNode(p ? p.t.split(SEP)[0] : c.game));
    var m = c.provider;
    if (p) {
      m += "  ·  " + fmtTime(p.s) + " – " + fmtTime(p.e) + "  ·  " + (p.soon || Date.now() < p.s ? "Starting soon" : "Live");
    }
    var meta = $("g-meta");
    meta.innerHTML = "";
    meta.appendChild(document.createTextNode(m));
    if (p && p.d) { meta.appendChild(el("br")); meta.appendChild(document.createTextNode(p.d)); }
  }

  function scrollGuide(n) {
    var visible = 4;
    if (n < gScroll) gScroll = n;
    else if (n >= gScroll + visible) gScroll = n - visible + 1;
    var r = $("g-rows");
    r.style.webkitTransform = r.style.transform = "translateY(" + (-gScroll * 136) + "px)";
  }

  // ---------- tabs ----------
  function showTab(t) {
    tab = t;
    $("home").className = "view" + (t === "home" ? "" : " hidden");
    $("guide").className = "view" + (t === "guide" ? "" : " hidden");
    $("tab-home").className = "tab f" + (t === "home" ? " sel" : "") + (focused === $("tab-home") ? " focus" : "");
    $("tab-guide").className = "tab f" + (t === "guide" ? " sel" : "") + (focused === $("tab-guide") ? " focus" : "");
  }
  $("tab-home").onfocusin2 = function () { showTab("home"); };
  $("tab-guide").onfocusin2 = function () { showTab("guide"); };

  // ---------- setup ----------
  function showSetup(err) {
    scope = "setup";
    $("setup").className = "";
    $("setup-err").innerHTML = "";
    if (err) $("setup-err").appendChild(document.createTextNode(err));
    setFocus($("key"));
  }
  $("key").onfocusin2 = function () { /* native focus opens the TV keyboard on Enter */ };
  $("key").onenter = function () { $("key").focus(); };
  $("setup-go").onenter = function () {
    var v = trim($("key").value).replace(/^\/+|\/+$/g, "");
    if (!v) { $("setup-err").innerHTML = "Enter the access key."; return; }
    store("watchy.secret", v);
    $("setup-go").innerHTML = "Checking…";
    get("playlist.m3u", function (err) {
      $("setup-go").innerHTML = "Continue";
      if (err) { store("watchy.secret", null); $("setup-err").innerHTML = ""; $("setup-err").appendChild(document.createTextNode(err)); return; }
      scope = "app";
      $("setup").className = "hidden";
      focused = null;
      start();
    });
  };

  // ---------- player ----------
  var queue = [], qi = 0, osdTimer = null, av = null, video = null, playing = false;
  try { av = window.webapis && webapis.avplay; } catch (e) { av = null; }

  function play(c) {
    queue = [];
    var games = buildGames(channels, programmes);
    for (var i = 0; i < games.length; i++) for (var j = 0; j < games[i].feeds.length; j++) queue.push(games[i].feeds[j]);
    qi = 0;
    for (i = 0; i < queue.length; i++) if (queue[i].id === c.id) qi = i;
    playing = true;
    document.body.className = "playing";
    $("player").className = "";
    tune();
  }

  function tune() {
    var c = queue[qi];
    osd(c.game, c.provider + (queue.length > 1 ? "  ·  " + (qi + 1) + "/" + queue.length + "  ·  ▲▼ change stream" : ""), false);
    $("spinner").style.display = "";
    if (av) {
      try { av.stop(); av.close(); } catch (e) {}
      try {
        av.open(c.url);
        av.setDisplayRect(0, 0, 1920, 1080);
        av.setListener({
          onbufferingstart: function () { $("spinner").style.display = ""; },
          onbufferingcomplete: function () { $("spinner").style.display = "none"; },
          onstreamcompleted: function () { tune(); },
          onerror: function (e) { $("spinner").style.display = "none"; osd(c.game, "Stream unavailable · press OK to retry", true); }
        });
        av.prepareAsync(function () { $("spinner").style.display = "none"; av.play(); },
          function () { $("spinner").style.display = "none"; osd(c.game, "Stream unavailable · press OK to retry", true); });
      } catch (e) { $("spinner").style.display = "none"; osd(c.game, "Stream unavailable · press OK to retry", true); }
    } else {
      // Desktop browser preview only (Safari plays HLS natively).
      if (!video) { video = el("video"); video.style.cssText = "position:absolute;left:0;top:0;width:1920px;height:1080px;background:#000"; video.autoplay = true; $("player").insertBefore(video, $("player").firstChild); }
      video.src = c.url;
      video.oncanplay = function () { $("spinner").style.display = "none"; };
    }
  }

  function stop() {
    playing = false;
    if (av) { try { av.stop(); av.close(); } catch (e) {} }
    if (video) { video.removeAttribute("src"); try { video.load(); } catch (e) {} }
    $("player").className = "hidden";
    document.body.className = "";
    clearTimeout(osdTimer);
  }

  function osd(title, sub, sticky) {
    $("osd-title").innerHTML = ""; $("osd-title").appendChild(document.createTextNode(title));
    $("osd-sub").innerHTML = ""; $("osd-sub").appendChild(document.createTextNode(sub));
    $("osd").className = "";
    clearTimeout(osdTimer);
    if (!sticky) osdTimer = setTimeout(function () { $("osd").className = "off"; }, 4000);
  }

  function togglePause() {
    if (!av) return;
    try {
      if (av.getState() === "PLAYING") { av.pause(); osd($("osd-title").textContent, "Paused", true); }
      else { av.play(); $("osd").className = "off"; }
    } catch (e) {}
  }

  // ---------- keys ----------
  function exitApp() { try { tizen.application.getCurrentApplication().exit(); } catch (e) {} }

  document.addEventListener("keydown", function (ev) {
    var k = ev.keyCode;
    if (playing) {
      ev.preventDefault();
      if (k === KEY.BACK || k === KEY.ESC || k === KEY.STOP || k === KEY.BKSP) stop();
      else if (k === KEY.UP || k === KEY.CH_UP) { if (queue.length > 1) { qi = (qi - 1 + queue.length) % queue.length; tune(); } }
      else if (k === KEY.DOWN || k === KEY.CH_DOWN) { if (queue.length > 1) { qi = (qi + 1) % queue.length; tune(); } }
      else if (k === KEY.ENTER) { if (hasClass($("osd"), "off")) osd($("osd-title").textContent, $("osd-sub").textContent, false); else tune(); }
      else if (k === KEY.PLAYPAUSE || k === KEY.PLAY || k === KEY.PAUSE) togglePause();
      return;
    }
    if (scope === "setup" && document.activeElement === $("key")) {
      if (k === KEY.IME_DONE || k === KEY.ENTER || k === KEY.DOWN) { $("key").blur(); setFocus($("setup-go")); ev.preventDefault(); }
      else if (k === KEY.IME_CANCEL || k === KEY.BACK) { $("key").blur(); ev.preventDefault(); }
      return;
    }
    if (k >= KEY.LEFT && k <= KEY.DOWN) { ev.preventDefault(); move(k); return; }
    if (k === KEY.ENTER) { ev.preventDefault(); if (focused && focused.onenter) focused.onenter(); return; }
    if (k === KEY.BACK || k === KEY.ESC) {
      ev.preventDefault();
      if (scope === "app" && focused && !hasClass(focused, "tab")) setFocus($("tab-" + tab));
      else exitApp();
    }
  });

  try {
    var want = ["ChannelUp", "ChannelDown", "MediaPlayPause", "MediaPlay", "MediaPause", "MediaStop"];
    for (var w = 0; w < want.length; w++) tizen.tvinputdevice.registerKey(want[w]);
  } catch (e) {}

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && playing) stop();
  });

  // ---------- start ----------
  function tick() { $("clock").innerHTML = fmtTime(Date.now()); }
  var started = false;
  function start() {
    showTab("home");
    setFocus($("tab-home"));
    render(true);
    refresh(true);
    if (started) return;
    started = true;
    tick();
    setInterval(tick, 10000);
    setInterval(function () { if (scope === "app") refresh(false); }, 120000);
    setInterval(function () { if (!playing && scope === "app") render(false); }, 60000);
  }

  window.WatchyTest = { parseM3U: parseM3U, parseXmltv: parseXmltv, buildGames: buildGames };
  if (!secret()) showSetup(); else start();
})();
