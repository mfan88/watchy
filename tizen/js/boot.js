/* Loads the app code: the newest over-the-air copy if one has been downloaded,
   otherwise the copy installed with the app. Then checks GitHub for a newer one,
   which is used from the next launch. ES5 only. */
(function () {
  "use strict";
  var CFG = window.WATCHY_CONFIG || {};
  var KEY = "watchy.ota";

  function newer(a, b) {
    var x = String(a || "0").replace(/^v/i, "").split(/[.-]/), y = String(b || "0").replace(/^v/i, "").split(/[.-]/);
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      var p = parseInt(x[i] || "0", 10) || 0, q = parseInt(y[i] || "0", 10) || 0;
      if (p !== q) return p > q;
    }
    return false;
  }
  window.WatchyNewer = newer;

  function loadBundled() {
    var s = document.createElement("script");
    s.src = "js/app.js";
    document.body.appendChild(s);
  }

  var ota = null;
  try { ota = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { ota = null; }
  if (ota && ota.js && newer(ota.version, CFG.version)) {
    try {
      if (ota.css) {
        var st = document.createElement("style");
        st.appendChild(document.createTextNode(ota.css));
        document.head.appendChild(st);
        var link = document.getElementById("css");
        if (link) link.parentNode.removeChild(link);
      }
      window.WATCHY_RUNNING = ota.version;
      (0, eval)(ota.js);
    } catch (e) {
      try { localStorage.removeItem(KEY); } catch (e2) {}
      window.location.reload();
      return;
    }
  } else {
    window.WATCHY_RUNNING = CFG.version;
    loadBundled();
  }

  function get(url, cb) {
    var x = new XMLHttpRequest();
    x.open("GET", url, true);
    x.timeout = 30000;
    x.onreadystatechange = function () { if (x.readyState === 4) cb(x.status >= 200 && x.status < 300 ? x.responseText : null); };
    x.send();
  }

  // Check for a newer release a little after start-up.
  setTimeout(function () {
    if (!CFG.repo) return;
    get("https://api.github.com/repos/" + CFG.repo + "/releases/latest", function (txt) {
      if (!txt) return;
      var rel; try { rel = JSON.parse(txt); } catch (e) { return; }
      if (!newer(rel.tag_name, window.WATCHY_RUNNING)) return;
      var assets = rel.assets || [], url = null;
      for (var i = 0; i < assets.length; i++) if (assets[i].name === "watchy-tizen-ota.json") url = assets[i].browser_download_url;
      if (!url) return;
      get(url, function (body) {
        if (!body) return;
        var pkg; try { pkg = JSON.parse(body); } catch (e) { return; }
        if (!pkg.js || !newer(pkg.version, window.WATCHY_RUNNING)) return;
        try { localStorage.setItem(KEY, JSON.stringify(pkg)); } catch (e) { return; }
        if (window.WatchyUpdated) window.WatchyUpdated(pkg.version);
      });
    });
  }, 8000);
})();
