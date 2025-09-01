// popup.js - 팝업 설정 스크립트

document.addEventListener("DOMContentLoaded", async () => {
  // 현재 설정 로드
  await loadCurrentSettings();

  // 이벤트 리스너 설정
  setupEventListeners();
});

// 현재 설정 로드
async function loadCurrentSettings() {
  try {
    const result = await chrome.storage.sync.get(["openai_api_key"]);

    if (result.openai_api_key) {
      updateKeyStatus(true, "키가 설정되었습니다");
      updateCurrentStatus(true);
    } else {
      updateKeyStatus(false, "키가 설정되지 않음");
      updateCurrentStatus(false);
    }
  } catch (error) {
    console.error("설정 로드 실패:", error);
    showMessage("설정을 불러올 수 없습니다.", "error");
  }
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // API 키 저장
  document.getElementById("save-key").addEventListener("click", saveApiKey);

  // API 키 테스트
  document.getElementById("test-key").addEventListener("click", testApiKey);

  // API 키 삭제
  document.getElementById("clear-key").addEventListener("click", clearApiKey);

  // Entry 열기
  document.getElementById("open-entry").addEventListener("click", openEntry);

  // Enter 키로 저장
  document.getElementById("api-key").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      saveApiKey();
    }
  });
}

// API 키 저장
async function saveApiKey() {
  const keyInput = document.getElementById("api-key");
  const apiKey = keyInput.value.trim();

  if (!apiKey) {
    showMessage("API 키를 입력해주세요.", "error");
    return;
  }

  if (!validateApiKeyFormat(apiKey)) {
    showMessage("올바른 OpenAI API 키 형식이 아닙니다.", "error");
    return;
  }

  try {
    // 키 저장
    await chrome.storage.sync.set({ openai_api_key: apiKey });

    // UI 업데이트
    updateKeyStatus(true, "키가 저장되었습니다");
    updateCurrentStatus(true);
    keyInput.value = ""; // 보안상 입력창 비우기

    showMessage("API 키가 성공적으로 저장되었습니다!", "success");
  } catch (error) {
    showMessage(`저장 실패: ${error.message}`, "error");
  }
}

// API 키 연결 테스트
async function testApiKey() {
  try {
    const result = await chrome.storage.sync.get(["openai_api_key"]);

    if (!result.openai_api_key) {
      showMessage("먼저 API 키를 저장해주세요.", "error");
      return;
    }

    showMessage("연결을 테스트하고 있습니다...", "info");

    // 간단한 테스트 요청
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${result.openai_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    });

    if (response.ok) {
      updateKeyStatus(true, "키가 정상 작동합니다");
      showMessage("API 키 연결이 성공했습니다!", "success");
    } else {
      const errorData = await response.json();
      updateKeyStatus(false, "키 인증에 실패했습니다");

      let errorMessage = "연결 실패";
      if (response.status === 401) {
        errorMessage = "API 키가 유효하지 않습니다";
      } else if (response.status === 429) {
        errorMessage = "사용량을 초과했습니다";
      } else if (response.status === 402) {
        errorMessage = "크레딧이 부족합니다";
      }

      showMessage(errorMessage, "error");
    }
  } catch (error) {
    updateKeyStatus(false, "연결 테스트에 실패했습니다");
    showMessage(`테스트 실패: ${error.message}`, "error");
  }
}

// API 키 삭제
async function clearApiKey() {
  if (confirm("정말로 API 키를 삭제하시겠습니까?")) {
    try {
      await chrome.storage.sync.remove(["openai_api_key"]);
      updateKeyStatus(false, "키가 삭제되었습니다");
      updateCurrentStatus(false);
      showMessage("API 키가 삭제되었습니다.", "info");
    } catch (error) {
      showMessage(`삭제 실패: ${error.message}`, "error");
    }
  }
}

// Entry 열기 및 사이드바 활성화
async function openEntry() {
  try {
    // 현재 탭들 확인
    const tabs = await chrome.tabs.query({});
    const entryTab = tabs.find((tab) => tab.url && tab.url.includes("playentry.org"));

    if (entryTab) {
      // 이미 Entry 탭이 열려있으면 활성화
      await chrome.tabs.update(entryTab.id, { active: true });

      // 사이드바 토글 메시지 전송
      setTimeout(() => {
        chrome.tabs.sendMessage(entryTab.id, { type: "TOGGLE_SIDEBAR" });
      }, 500);
    } else {
      // Entry 탭이 없으면 새로 열기
      const newTab = await chrome.tabs.create({
        url: "https://playentry.org/",
        active: true,
      });

      // 페이지 로드 후 사이드바 활성화
      setTimeout(() => {
        chrome.tabs.sendMessage(newTab.id, { type: "TOGGLE_SIDEBAR" });
      }, 3000); // Entry 로딩 시간 고려
    }

    // 팝업 닫기
    window.close();
  } catch (error) {
    showMessage(`Entry 열기 실패: ${error.message}`, "error");
  }
}

// API 키 형식 검증
function validateApiKeyFormat(key) {
  return key.startsWith("sk-proj-") || key.startsWith("sk-");
}

// 키 상태 업데이트
function updateKeyStatus(isValid, message) {
  const dot = document.getElementById("key-status-dot");
  const text = document.getElementById("key-status-text");

  dot.className = `status-dot ${isValid ? "valid" : ""}`;
  text.textContent = message;
}

// 현재 상태 업데이트
function updateCurrentStatus(hasKey) {
  const statusEl = document.getElementById("current-status");

  if (hasKey) {
    statusEl.textContent = "API 키가 설정되어 있습니다. 도우미를 사용할 수 있습니다!";
    statusEl.className = "current-status";
  } else {
    statusEl.textContent = "API 키가 설정되지 않았습니다";
    statusEl.className = "current-status no-key";
  }
}

// 상태 메시지 표시
function showMessage(message, type) {
  const messageEl = document.getElementById("status-message");
  messageEl.className = `status-message status-${type}`;
  messageEl.textContent = message;
  messageEl.style.display = "block";

  // 3초 후 자동 숨김
  setTimeout(() => {
    messageEl.style.display = "none";
  }, 3000);
}
