// Entry Block Helper - Background Service Worker

// ===== 설치 시 기본 설정 =====
chrome.runtime.onInstalled.addListener(() => {
  console.log("Entry Block Helper 설치 완료");
  chrome.storage.sync.set({
    enabled: true,
    autoAnalysis: true,
    sidebarMode: "auto",
  });
});

// ===== Content Script와 메시지 통신 =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "getSettings":
      chrome.storage.sync.get(["enabled", "autoAnalysis", "sidebarMode"], (data) => {
        sendResponse(data);
      });
      return true;

    case "saveSettings":
      chrome.storage.sync.set(request.settings, () => {
        sendResponse({ success: true });
      });
      return true;

    case "generateCoT":
      generateCoTResponse(request.analysis)
        .then((response) => sendResponse(response))
        .catch((error) => sendResponse({ error: error.message }));
      return true;

    default:
      break;
  }
});

// ===== CoT 응답(Mock) =====
async function generateCoTResponse(analysis) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        steps: [
          { step: 1, title: "🎯 문제 이해", content: `현재 ${analysis.currentObjectName}에서 작업 중입니다.` },
          { step: 2, title: "📝 코드 분석", content: `${analysis.blocks.length}개의 블록이 연결되어 있습니다.` },
        ],
      });
    }, 1000);
  });
}

// ===== 엔트리 탭 열기/포커스 & 사이드바 토글 유틸 =====
const ENTRY_URL = "https://playentry.org/";
const ENTRY_MATCH = /^https?:\/\/([a-z0-9-]+\.)?playentry\.org/i;

function sendToggle(tabId) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, { type: "TOGGLE_SIDEBAR" }, () => {
    // 컨텐트 스크립트 미주입 타이밍의 lastError는 무시
    void chrome.runtime.lastError;
  });
}

function waitTabComplete(tabId, timeoutMs = 15000) {
  return new Promise((resolve) => {
    let settled = false;

    const timer = setTimeout(async () => {
      if (settled) return;
      settled = true;
      try {
        const t = await chrome.tabs.get(tabId);
        resolve(t || null);
      } catch {
        resolve(null);
      }
    }, timeoutMs);

    const listener = (id, info, tab) => {
      if (id !== tabId) return;
      if (info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(tab || null);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function openOrFocusEntryAndToggle(fromTab) {
  // 1) 이미 엔트리 페이지라면 현재 탭에서 토글
  if (fromTab?.id && ENTRY_MATCH.test(fromTab.url || "")) {
    sendToggle(fromTab.id);
    return;
  }

  // 2) 열려 있는 엔트리 탭이 있으면 그 탭으로 포커스 후 토글
  const all = await chrome.tabs.query({});
  const existing = all.find((t) => ENTRY_MATCH.test(t.url || ""));
  if (existing) {
    await chrome.tabs.update(existing.id, { active: true });
    // 주입 대기 불필요한 경우도 있지만, 안정성을 위해 소량 지연
    setTimeout(() => sendToggle(existing.id), 200);
    return;
  }

  // 3) 없으면 새 탭 생성 → 로드 완료 대기 → 토글
  const created = await chrome.tabs.create({ url: ENTRY_URL, active: true });
  const loaded = await waitTabComplete(created.id);
  // SPA 초기화/iframe 주입 여유 시간
  setTimeout(() => sendToggle((loaded || created).id), 300);
}

// ===== 아이콘 클릭 핸들러 =====
chrome.action.onClicked.addListener((tab) => {
  openOrFocusEntryAndToggle(tab);
});
