// Site-wide page-view beacon: sends path and referrer only. Skipped on localhost and on the stats page.
(function () {
  try {
    if (/^(localhost|127\.)/.test(location.hostname)) return;
    if (location.pathname.replace(/\.html$/, "") === "/stats") return;
    if (navigator.doNotTrack === "1") return;
    var payload = JSON.stringify({ p: location.pathname, r: document.referrer || "" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/hit", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/hit", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch (e) {}
})();
