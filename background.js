// Entry Block Helper - Background Service Worker with OpenAI API

// ===== API 키 설정 (사용자가 설정할 수 있도록 비워둠) =====
const OPENAI_API_KEY = ""; // 사용자가 직접 설정하도록 비워둠

// ===== 설치 시 기본 설정 =====
chrome.runtime.onInstalled.addListener(() => {
  console.log("Entry Block Helper 설치 완료");
  chrome.storage.sync.set({
    enabled: true,
    autoAnalysis: true,
    sidebarMode: "auto",
    openai_api_key: "", // 사용자가 설정할 API 키
    useDevKey: false, // 개발자 키 사용 여부
  });
});

// ===== OpenAI API 호출 함수 =====
async function callOpenAI(messages, apiKey = null) {
  const key = apiKey || OPENAI_API_KEY;

  if (!key || key === "") {
    throw new Error("API 키가 설정되지 않았습니다. 설정에서 OpenAI API 키를 입력해주세요.");
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
        max_tokens: 300,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 401) {
        throw new Error("API 키가 유효하지 않습니다. 설정에서 확인해주세요.");
      }
      throw new Error(`OpenAI API 오류: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API 호출 실패:", error);
    throw error;
  }
}

// ===== 교육적 시스템 프롬프트 =====
const EDUCATIONAL_SYSTEM_PROMPT = `당신은 Entry(엔트리) 블록코딩을 가르치는 소크라테스식 튜터입니다.

교육 철학:
1. 학생이 스스로 생각하도록 단계적 질문으로 유도
2. 답을 바로 주지 말고, 다음 단계를 생각해보도록 안내  
3. 막혔을 때만 구체적인 블록 이름 제시
4. 성취감을 느낄 수 있도록 점진적 발견 과정 중시

Entry 블록 카테고리 체계 (실제 Entry 기준):
• 시작 블록: 프로그램 실행 조건 설정
• 움직임 블록: 오브젝트 위치, 방향 제어
• 모양 블록: 외형, 크기, 투명도 변경
• 소리 블록: 음향 효과 재생
• 판단 블록: 조건문, 비교 연산 (육각형 모양)
• 반복 블록: 루프 제어 구조
• 변수 블록: 데이터 저장 및 조작
• 함수 블록: 사용자 정의 함수
• 자료 블록: 리스트, 데이터 처리
• 계산 블록: 수학 연산, 논리 연산 (둥근 모양)

Entry 핵심 개념:
- 오브젝트: 프로그래밍 대상 (엔트리봇, 캐릭터 등)
- 장면: 배경화면
- 블록 조립소: 코드를 만드는 공간
- 실행 화면: 결과를 보는 공간

자주 사용하는 블록들 (추정):
- "~키를 눌렀을 때" (시작 블록)
- "~만큼 움직이기" (움직임 블록)  
- "복제하기" (모양 블록)
- "~번 반복하기" (반복 블록)
- "만약 ~라면" (판단 블록)

교육 단계별 접근:
1단계 (첫 질문): "~를 하려면 어떤 종류의 블록이 필요할까요?"
2단계 (힌트): "○○ 블록에서 ○○과 관련된 블록을 찾아보세요"
3단계 (구체적): 정확한 블록 이름과 연결 방법 제시

주의사항:
- Entry의 정확한 블록 이름을 모르는 경우, "○○ 블록에서 ○○ 기능을 하는 블록"으로 안내
- 블록 모양 정보 활용: 둥근 블록(값), 육각형 블록(조건), 일반 블록(명령)
- Entry만의 특징 반영: 오브젝트 개념, 이벤트 기반 프로그래밍

현재 Entry 프로젝트 상황: {context}
선택된 모드: {mode}
대화 횟수: {conversationCount}

※ 중요: Entry의 정확한 블록 이름을 모르는 경우, 추측하지 말고 카테고리와 기능으로 안내하세요.

예시:
❌ 잘못된 응답: "키보드 블록에서 '스페이스바 블록'을 사용하세요"  
✅ 개선된 응답: "시작 블록에서 키보드 입력과 관련된 블록을 찾아보세요. 스페이스바를 눌렀을 때 실행되는 블록이 있을 거예요"`;

// ===== 교육적 AI 응답 생성 ===== (누락된 함수)
async function generateEducationalResponse(userMessage, mode, projectContext, conversationHistory = []) {
  try {
    // 사용자 API 키 가져오기
    const settings = await chrome.storage.sync.get(["openai_api_key"]);
    const apiKey = settings.openai_api_key;

    if (!apiKey) {
      throw new Error("API 키가 설정되지 않았습니다. 설정에서 OpenAI API 키를 입력해주세요.");
    }

    // 대화 횟수 기반 교육 단계 결정
    const messageCount = conversationHistory.length;
    const conversationCount = Math.floor(messageCount / 2); // 사용자 메시지만 카운트

    // 즉시 도움이 필요한 상황 판단
    const needsImmediateHelp =
      userMessage.includes("모르겠어") ||
      userMessage.includes("모르겠습니다") ||
      userMessage.includes("막혔어") ||
      userMessage.includes("막혔습니다") ||
      userMessage.includes("도와줘") ||
      userMessage.includes("도와주세요") ||
      userMessage.includes("안 돼") ||
      userMessage.includes("안 됩니다") ||
      conversationCount >= 3; // 3번째 시도 후

    // 시스템 프롬프트에 대화 횟수 정보 포함
    let systemPrompt = EDUCATIONAL_SYSTEM_PROMPT.replace("{context}", projectContext || "프로젝트 정보 없음")
      .replace("{mode}", getModeDescription(mode))
      .replace("{conversationCount}", conversationCount.toString());

    // 교육 단계별 지시사항 추가
    if (needsImmediateHelp) {
      systemPrompt += `\n\n[중요] 학생이 도움을 요청했거나 여러 번 시도했습니다. 이제 구체적인 Entry 블록 이름과 단계별 방법을 직접 알려주세요.`;
    } else if (conversationCount === 0) {
      systemPrompt += `\n\n[중요] 첫 번째 질문입니다. 답을 바로 주지 말고 학생이 생각해볼 수 있는 유도 질문을 해주세요.`;
    } else if (conversationCount === 1) {
      systemPrompt += `\n\n[중요] 두 번째 시도입니다. 힌트를 주되 아직 완전한 답은 주지 마세요.`;
    } else {
      systemPrompt += `\n\n[중요] 여러 번 시도했습니다. 구체적인 블록 이름을 알려주세요.`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-6), // 최근 3번의 대화만 유지
      { role: "user", content: userMessage },
    ];

    const response = await callOpenAI(messages, apiKey);

    // 사용량 로깅
    await logUsageStats(userMessage.length, response.length, mode);

    console.log(`교육적 응답 생성 - 대화횟수: ${conversationCount}, 즉시도움: ${needsImmediateHelp}`);
    return response;
  } catch (error) {
    console.error("AI 응답 생성 실패:", error);
    return getFallbackResponse(error.message);
  }
}

// Entry 프로젝트 컨텍스트 수집 함수
function gatherProjectContext() {
  try {
    // content.js에서는 isEntryReady를 사용하지만 background.js에서는 안전하게 처리
    if (typeof Entry === "undefined") {
      return "Entry가 아직 준비되지 않았습니다.";
    }

    const context = [];

    // 현재 오브젝트 정보
    const currentObject = Entry.playground?.object;
    if (currentObject) {
      context.push(`현재 오브젝트: ${currentObject.name || "이름없음"}`);

      // 블록 정보 (더 안전한 방식)
      try {
        const script = currentObject.script;
        if (script && script.getBlockList) {
          const blockList = script.getBlockList();
          if (Array.isArray(blockList)) {
            context.push(`사용된 블록 수: ${blockList.length}개`);

            // 블록 카테고리 분석 (Entry 특화)
            const blockCategories = new Set();
            blockList.forEach((block) => {
              if (block && block.type) {
                // Entry 블록 타입에서 카테고리 추출
                const type = block.type.toString();
                if (type.includes("event")) blockCategories.add("시작");
                if (type.includes("move") || type.includes("locate")) blockCategories.add("움직임");
                if (type.includes("looks") || type.includes("shape")) blockCategories.add("모양");
                if (type.includes("sound")) blockCategories.add("소리");
                if (type.includes("repeat") || type.includes("while")) blockCategories.add("반복");
                if (type.includes("if") || type.includes("compare")) blockCategories.add("판단");
              }
            });

            if (blockCategories.size > 0) {
              context.push(`사용된 블록 카테고리: ${Array.from(blockCategories).join(", ")}`);
            }
          }
        }
      } catch (blockError) {
        context.push("블록 정보 수집 중 오류 발생");
      }
    }

    // 전체 오브젝트 수
    try {
      const objects = Entry.container?.getAllObjects?.();
      if (Array.isArray(objects)) {
        context.push(`총 오브젝트 수: ${objects.length}개`);

        // 오브젝트 이름들
        const objectNames = objects
          .map((obj) => obj && obj.name)
          .filter((name) => name)
          .slice(0, 3); // 처음 3개만

        if (objectNames.length > 0) {
          context.push(`오브젝트들: ${objectNames.join(", ")}`);
        }
      }
    } catch (objectError) {
      context.push("오브젝트 정보 수집 중 오류 발생");
    }

    return context.length > 0 ? context.join(" | ") : "Entry 프로젝트 정보 수집 완료";
  } catch (error) {
    return `컨텍스트 수집 오류: ${error.message}`;
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

  // API 키 관련 오류면 설정 안내 추가
  if (errorMessage.includes("API 키")) {
    return `${randomResponse}\n\n${errorMessage}\n\n확장 프로그램 아이콘을 클릭하여 API 키를 설정해주세요.`;
  }

  return `${randomResponse}\n\n(연결 상태가 불안정해서 간단한 응답을 드렸어요. 다시 시도해주세요!)`;
}

// ===== Content Script와 메시지 통신 =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "getSettings":
      chrome.storage.sync.get(["enabled", "autoAnalysis", "sidebarMode", "openai_api_key"], (data) => {
        // API 키 존재 여부만 전달 (보안)
        sendResponse({
          ...data,
          hasApiKey: !!data.openai_api_key,
          openai_api_key: undefined, // 실제 키는 전달하지 않음
        });
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

    case "openSettings":
      chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
      sendResponse({ success: true });
      return true;

    default:
      break;
  }
});

// ===== AI 요청 처리 =====
async function handleAIRequest(request) {
  const { message, mode, projectContext, conversationHistory = [] } = request;
  return await generateEducationalResponse(message, mode, projectContext, conversationHistory);
}

// ===== 사용량 통계 =====
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
  todayStats.totalTokens += Math.ceil((messageLength + responseLength) / 4);
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
  if (fromTab?.id && ENTRY_MATCH.test(fromTab.url || "")) {
    sendToggle(fromTab.id);
    return;
  }

  const all = await chrome.tabs.query({});
  const existing = all.find((t) => ENTRY_MATCH.test(t.url || ""));
  if (existing) {
    await chrome.tabs.update(existing.id, { active: true });
    setTimeout(() => sendToggle(existing.id), 200);
    return;
  }

  const created = await chrome.tabs.create({ url: ENTRY_URL, active: true });
  const loaded = await waitTabComplete(created.id);
  setTimeout(() => sendToggle((loaded || created).id), 300);
}

// ===== 아이콘 클릭 핸들러 =====
// 팝업이 설정되어 있으므로 이 핸들러는 비활성화
// chrome.action.onClicked.addListener((tab) => {
//   openOrFocusEntryAndToggle(tab);
// });
