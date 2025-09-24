// 개선된 entryProbe.js - Entry 작업 환경 분석 강화

(function () {
  let sent = false;
  let lastContextSent = "";

  // Entry 환경에서 현재 컨텍스트 수집
  function gatherDetailedContext() {
    if (typeof window.Entry === "undefined") return null;

    try {
      const context = {
        timestamp: Date.now(),
        currentObject: null,
        totalObjects: 0,
        activeBlocks: [],
        recentActions: [],
        workspaceInfo: {},
      };

      // 현재 선택된 오브젝트 정보
      if (Entry.playground && Entry.playground.object) {
        const obj = Entry.playground.object;
        context.currentObject = {
          name: obj.name,
          id: obj.id,
          blockCount: 0,
          hasScript: false,
        };

        // 블록 스크립트 정보
        if (obj.script) {
          context.currentObject.hasScript = true;
          const blocks = obj.script.getBlockList ? obj.script.getBlockList() : [];
          context.currentObject.blockCount = blocks.length;

          // 사용된 블록 타입들 수집
          context.activeBlocks = blocks
            .map((block) => ({
              type: block.type || "unknown",
              category: getBlockCategory(block.type),
            }))
            .slice(0, 10); // 최대 10개만
        }
      }

      // 전체 오브젝트 수
      if (Entry.container) {
        const objects = Entry.container.getAllObjects ? Entry.container.getAllObjects() : [];
        context.totalObjects = objects.length;
      }

      // 워크스페이스 상태
      if (Entry.playground) {
        context.workspaceInfo = {
          mode: Entry.playground.getViewMode ? Entry.playground.getViewMode() : "workspace",
          isRunning: Entry.engine && Entry.engine.isState ? Entry.engine.isState("run") : false,
        };
      }

      return context;
    } catch (error) {
      console.log("컨텍스트 수집 중 오류:", error);
      return null;
    }
  }

  // 블록 타입으로부터 카테고리 추정
  function getBlockCategory(blockType) {
    if (!blockType) return "unknown";

    const categoryMap = {
      when_: "start",
      message_: "start",
      move_: "motion",
      locate_: "motion",
      rotate_: "motion",
      show: "looks",
      hide: "looks",
      change_: "looks",
      play_: "sound",
      stop_: "sound",
      if: "decision",
      repeat_: "flow",
      wait_: "flow",
      set_: "variable",
      get_: "variable",
    };

    for (const [prefix, category] of Object.entries(categoryMap)) {
      if (blockType.startsWith(prefix)) {
        return category;
      }
    }

    return "unknown";
  }

  function tick() {
    try {
      // Entry 로드 확인
      if (typeof window.Entry !== "undefined" && window.Entry.playground && window.Entry.container) {
        if (!sent) {
          sent = true;
          window.postMessage({ __ENTRY_HELPER__: true, type: "ENTRY_READY" }, "*");
          console.log("📡 Entry Helper: Entry 환경 감지됨");
        }

        // 컨텍스트 변화 감지 및 전송
        const currentContext = gatherDetailedContext();
        if (currentContext) {
          const contextString = JSON.stringify(currentContext);

          // 이전과 다른 경우에만 전송 (너무 자주 전송 방지)
          if (contextString !== lastContextSent) {
            window.postMessage(
              {
                __ENTRY_HELPER__: true,
                type: "CONTEXT_UPDATE",
                context: currentContext,
              },
              "*"
            );
            lastContextSent = contextString;
            console.log("📝 Entry Helper: 컨텍스트 업데이트됨");
          }
        }
      }
    } catch (e) {
      console.log("Entry Helper tick 오류:", e);
    }

    setTimeout(tick, 1000); // 1초마다 체크
  }

  // 블록 렌더링 요청 처리 (기존)
  window.addEventListener("message", (e) => {
    if (e?.data && e.data.__ENTRY_HELPER__ && e.data.type === "RENDER_BLOCK") {
      renderBlockRequest(e.data);
    }

    // 강제 컨텍스트 요청 처리
    if (e?.data && e.data.__ENTRY_HELPER__ && e.data.type === "REQUEST_CONTEXT") {
      const context = gatherDetailedContext();
      if (context) {
        window.postMessage(
          {
            __ENTRY_HELPER__: true,
            type: "CONTEXT_RESPONSE",
            context: context,
          },
          "*"
        );
      }
    }
  });

  // 블록 렌더링 처리 함수
  function renderBlockRequest(data) {
    const { script } = data;

    if (!window.Entry) {
      console.log("Entry 환경이 준비되지 않음");
      return;
    }

    try {
      const objects = Entry.container.getAllObjects();
      if (objects.length > 0) {
        const target = objects[0];
        if (target.script && typeof target.script.load === "function") {
          target.script.load(script);
          Entry.playground.reloadBlockView();

          setTimeout(() => {
            captureBlockImage();
          }, 300);
        }
      }
    } catch (error) {
      console.log("블록 렌더링 오류:", error);
    }
  }

  // 블록 이미지 캡처
  function captureBlockImage() {
    let svg = null;

    // SVG 요소 찾기 (우선순위 순)
    const selectors = [
      "svg.entryBoard", // 메인 작업공간
      "svg.blockMenu", // 블록 팔레트
      ".blocklyMainBackground", // Blockly 메인
      "svg", // 일반 SVG
    ];

    for (const selector of selectors) {
      svg = document.querySelector(selector);
      if (svg) break;
    }

    if (svg) {
      const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.outerHTML);
      window.postMessage(
        {
          __ENTRY_HELPER__: true,
          type: "BLOCK_RENDERED",
          dataUrl: dataUrl,
        },
        "*"
      );
      console.log("🖼️ 블록 이미지 캡처 완료");
    } else {
      console.log("⚠️ 렌더링할 SVG를 찾을 수 없음");
    }
  }

  console.log("🚀 Entry Helper Probe 시작됨");
  tick();
})();
