// entryProbe.js
(function () {
  var sent = false;
  function tick() {
    try {
      if (typeof window.Entry !== "undefined" && window.Entry.playground && window.Entry.container) {
        if (!sent) {
          sent = true;
          window.postMessage({ __ENTRY_HELPER__: true, type: "ENTRY_READY" }, "*");
        }
      }
    } catch (e) {}
    setTimeout(tick, 300);
  }
  tick();
})();
