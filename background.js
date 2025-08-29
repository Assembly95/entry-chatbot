// Entry Block Helper - Background Service Worker with OpenAI API

// ===== API 키 설정 (나중에 사용자 설정으로 이동) =====
const OPENAI_API_KEY = ""; // 실제 키로 교체 필요

// ===== 교육적 시스템 프롬프트 =====
const EDUCATIONAL_SYSTEM_PROMPT = `당신은 Entry 블록코딩을 가르치는 실용적인 튜터입니다.

교육 방식:
1. 첫 번째 질문: 간단한 유도 질문으로 학생이 생각해보도록 격려
2. 두 번째 질문 이후: 구체적인 블록 이름이나 해결 방법을 제시
3. 학생이 막혔을 때는 바로 필요한 블록이나 단계를 알려주세요
4. 답변은 2-3문장으로 간결하게, 실행 가능한 조언 위주로

현재 Entry 프로젝트 상황: {context}
선택된 모드: {mode}

학생의 학습 단계를 고려해서:
- 완전 초보자: 바로 구체적인 블록 이름 제시
- 경험이 있어 보이면: 1번의 힌트 후 구체적 도움
- 복잡한 문제: 단계를 나누어 차근차근 해결`;

// ===== 설치 시 기본 설정 =====
chrome.runtime.onInstalled.addListener(() => {
  console.log("Entry Block Helper 설치 완료");
  chrome.storage.sync.set({
    enabled: true,
    autoAnalysis: true,
    sidebarMode: "auto",
    apiKey: "", // 사용자가 설정할 키
    useDevKey: true, // 개발자 키 사용 여부
  });
});

// ===== OpenAI API 호출 함수 =====
async function callOpenAI(messages, apiKey = null) {
  const key = apiKey || OPENAI_API_KEY;

  if (!key || key === "YOUR_API_KEY_HERE") {
    throw new Error("OpenAI API 키가 설정되지 않았습니다.");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 150, // 교육적 답변은 간결하게
        temperature: 0.7, // 적당한 창의성
        presence_penalty: 0.1, // 반복 방지
        frequency_penalty: 0.1, // 다양성 증가
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API 오류: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API 호출 실패:", error);
    throw error;
  }
}

// ===== 교육적 AI 응답 생성 =====
async function generateEducationalResponse(userMessage, mode, projectContext, apiKey = null, conversationHistory = []) {
  try {
    // 대화 횟수 체크 (실용적 접근)
    const messageCount = conversationHistory.length;
    const shouldGiveDirectHelp =
      messageCount >= 2 ||
      userMessage.includes("모르겠어") ||
      userMessage.includes("어떻게") ||
      userMessage.includes("막혔어") ||
      userMessage.includes("도와줘");

    // 컨텍스트와 모드를 시스템 프롬프트에 삽입
    let systemPrompt = EDUCATIONAL_SYSTEM_PROMPT.replace("{context}", projectContext || "프로젝트 정보 없음").replace(
      "{mode}",
      getModeDescription(mode)
    );

    // 직접적인 도움이 필요한 경우 프롬프트 수정
    if (shouldGiveDirectHelp) {
      systemPrompt += `\n\n[중요] 학생이 여러 번 질문했거나 막혔다고 표현했습니다. 이제 구체적인 블록 이름이나 단계별 해결 방법을 직접 제시하세요. 예: "움직이기 블록에서 '10만큼 움직이기'를 사용해보세요"`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      // 최근 대화 기록 포함 (최대 4개)
      ...conversationHistory.slice(-4),
      { role: "user", content: userMessage },
    ];

    const response = await callOpenAI(messages, apiKey);

    // 사용량 로깅 (나중에 분석용)
    console.log(`AI 응답 생성됨 - 모드: ${mode}, 메시지수: ${messageCount}, 직접도움: ${shouldGiveDirectHelp}`);

    return response;
  } catch (error) {
    console.error("AI 응답 생성 실패:", error);
    return getFallbackResponse(error.message);
  }
}

// ===== 모드별 설명 =====
function getModeDescription(mode) {
  const modes = {
    auto: "자동 모드 - 상황에 맞는 최적의 도움 제공",
    blocks: "블록 도움 모드 - 블록 사용법과 조합에 집중",
    general: "일반 질문 모드 - 프로그래밍 개념 설명",
    debug: "디버깅 모드 - 문제 해결과 오류 분석",
  };
  return modes[mode] || modes["auto"];
}

// ===== 폴백 응답 (API 실패 시) =====
function getFallbackResponse(errorMessage) {
  const fallbackResponses = [
    "좋은 질문이네요! 어떤 부분이 가장 어려우셨나요?",
    "차근차근 접근해봅시다. 먼저 어떤 결과를 만들고 싶으신가요?",
    "단계별로 생각해보면서 해결해보세요. 첫 번째 단계는 무엇일까요?",
    "현재 어떤 블록들을 사용하고 계신가요? 어떤 결과가 나오고 있나요?",
  ];

  const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

  // 에러 상황임을 표시하되 사용자에게는 자연스럽게
  return `${randomResponse}\n\n(연결 상태가 불안정해서 간단한 응답을 드렸어요. 다시 시도해주세요!)`;
}

// ===== Content Script와 메시지 통신 =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "getSettings":
      chrome.storage.sync.get(["enabled", "autoAnalysis", "sidebarMode", "apiKey", "useDevKey"], (data) => {
        sendResponse(data);
      });
      return true;

    case "saveSettings":
      chrome.storage.sync.set(request.settings, () => {
        sendResponse({ success: true });
      });
      return true;

    case "generateAIResponse":
      handleAIRequest(request)
        .then((response) => sendResponse({ success: true, response }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    default:
      break;
  }
});

// ===== AI 요청 처리 =====
async function handleAIRequest(request) {
  const { message, mode, projectContext, conversationHistory = [] } = request;

  // 설정에서 API 키 정보 가져오기
  const settings = await new Promise((resolve) => {
    chrome.storage.sync.get(["apiKey", "useDevKey"], resolve);
  });

  const apiKey = settings.useDevKey ? null : settings.apiKey;

  return await generateEducationalResponse(message, mode, projectContext, apiKey, conversationHistory);
}

// ===== 사용량 통계 (나중에 논문용) =====
async function logUsageStats(messageLength, responseLength, mode) {
  const today = new Date().toISOString().split("T")[0];
  const stats = await new Promise((resolve) => {
    chrome.storage.local.get([`stats_${today}`], resolve);
  });

  const todayStats = stats[`stats_${today}`] || {
    totalRequests: 0,
    totalTokens: 0,
    modeUsage: {},
  };

  todayStats.totalRequests++;
  todayStats.totalTokens += Math.ceil((messageLength + responseLength) / 4); // 대략적인 토큰 계산
  todayStats.modeUsage[mode] = (todayStats.modeUsage[mode] || 0) + 1;

  chrome.storage.local.set({
    [`stats_${today}`]: todayStats,
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
