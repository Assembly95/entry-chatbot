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

// Listen for RENDER_BLOCK messages and render block images
window.addEventListener("message", (e) => {
  if (e?.data && e.data.__ENTRY_HELPER__ && e.data.type === "RENDER_BLOCK") {
    const { script } = e.data;
    const container = document.getElementById("entry-hidden-renderer");
    if (window.Entry) {
      // Use Entry.container and playground to load the script into the first object
      const objects = Entry.container.getAllObjects();
      if (objects.length > 0) {
        const target = objects[0]; // 첫 번째 오브젝트
        if (target.script && typeof target.script.load === "function") {
          target.script.load(script);
          Entry.playground.reloadBlockView();
        }
      }
      setTimeout(() => {
        // Try to capture SVG, prioritizing entryBoard/main, then blockMenu, then any svg
        let svg = null;
        if (container) {
          svg = container.querySelector("svg");
        }
        if (!svg) {
          // 우선순위 1: 메인 작업공간 (실제 블록)
          svg = document.querySelector("svg.entryBoard");
        }
        if (!svg) {
          // 우선순위 2: 블록 팔레트
          svg = document.querySelector("svg.blockMenu");
        }
        if (!svg) {
          // 최종 fallback
          svg = document.querySelector("svg");
        }
        if (svg) {
          const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.outerHTML);
          window.postMessage({ __ENTRY_HELPER__: true, type: "BLOCK_RENDERED", dataUrl }, "*");
        }
      }, 200);
    }
  }
});
