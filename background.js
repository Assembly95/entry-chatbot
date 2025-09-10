// Entry Block Helper - Background Service Worker (진짜 RAG 시스템 적용)

// ===== RAG 테스트 설정 =====
let USE_RAG = true; // 이것을 true/false로 바꿔가며 테스트

// ===== Entry 블록 데이터 로드 및 캐싱 (새로 추가) =====
let entryBlockData = null;
let dataLoadPromise = null;

// ===== API 키 설정 (사용자가 설정할 수 있도록 비워둠) =====
const OPENAI_API_KEY = ""; // 사용자가 직접 설정하도록 비워둠

chrome.runtime.onInstalled.addListener(() => {
  console.log("Entry Block Helper 설치 완료 - RAG 시스템 초기화 중...");
  chrome.storage.sync.set({
    enabled: true,
    autoAnalysis: true,
    sidebarMode: "auto",
    openai_api_key: "",
    useDevKey: false,
    rag_enabled: true, // 기본값을 true로 설정
  });

  // 설치 직후 RAG 활성화
  USE_RAG = true;
  loadEntryBlockData();
});

// ===== 블록 데이터 로드 함수 (새로 추가) =====
async function loadEntryBlockData() {
  if (entryBlockData) return entryBlockData;
  if (dataLoadPromise) return dataLoadPromise;

  dataLoadPromise = (async () => {
    try {
      const blockCategories = [
        "start",
        "moving",
        "looks",
        "sound",
        "judgement",
        "repeat",
        "variable",
        "func",
        "calc",
        "brush",
        "flow",
      ];
      const allBlocks = [];

      for (const category of blockCategories) {
        try {
          const knownFiles = getKnownBlockFiles(category);

          for (const fileName of knownFiles) {
            try {
              const response = await fetch(chrome.runtime.getURL(`data/blocks/${category}/${fileName}`));
              if (response.ok) {
                const blockData = await response.json();
                allBlocks.push({
                  category,
                  fileName: fileName.replace(".json", ""),
                  ...blockData,
                });
              }
            } catch (fileError) {
              // 파일이 없어도 계속 진행
              console.log(`파일 건너뜀: ${category}/${fileName}`);
            }
          }
        } catch (categoryError) {
          console.log(`카테고리 건너뜀: ${category}`);
        }
      }

      entryBlockData = allBlocks;
      console.log(`📚 Entry 블록 데이터 로드 완료: ${allBlocks.length}개 블록`);
      return allBlocks;
    } catch (error) {
      console.error("Entry 데이터 로드 실패:", error);
      entryBlockData = []; // 빈 배열로 초기화
      return [];
    }
  })();

  return dataLoadPromise;
}

// ===== 파일명을 한국어로 변환하는 함수 (새로 추가) =====
function convertFileNameToKorean(fileName) {
  const nameMap = {
    // 시작 블록
    when_object_click: "오브젝트를 클릭했을 때",
    when_message_cast: "메시지를 받았을 때",
    when_scene_start: "장면이 시작되었을 때",
    when_some_key_pressed: "키를 눌렀을 때",
    when_run_button_click: "시작하기 버튼을 클릭했을 때",
    mouse_clicked: "마우스를 클릭했을 때",
    start_neighbor_scene: "다음 장면으로 바꾸기",
    message_cast: "메시지 보내기",
    message_cast_with: "메시지 보내기(값 포함)",

    // 움직임 블록
    move_steps: "~만큼 움직이기",
    rotate_relative: "~도 회전하기",
    move_to_position: "~좌표로 이동하기",

    // 모양 블록
    show: "보이기",
    hide: "숨기기",
    change_size: "크기 ~만큼 바꾸기",
    set_size: "크기를 ~%로 정하기",

    // 소리 블록
    play_sound: "소리 재생하기",
    stop_sound: "소리 정지하기",

    // 판단 블록
    if: "만약 ~라면",
    if_else: "만약 ~라면, 아니면",

    // 반복 블록
    repeat_basic: "~번 반복하기",
    repeat_inf: "계속 반복하기",

    // 변수 블록
    set_variable: "변수 ~을 ~로 정하기",
    change_variable: "변수 ~을 ~만큼 바꾸기",

    // 함수 블록
    function_create: "함수 만들기",
    function_call: "함수 실행하기",

    // 계산 블록
    calc_basic: "사칙연산",
    number: "숫자",

    // 붓 블록
    brush_stamp: "도장 찍기",

    // 흐름 블록
    wait_second: "~초 기다리기",
    stop_run: "정지하기",
  };

  return nameMap[fileName] || fileName;
}

// ===== 카테고리를 한국어로 변환하는 함수 (새로 추가) =====
function getCategoryKorean(category) {
  const categoryMap = {
    start: "시작",
    moving: "움직임",
    looks: "모양",
    sound: "소리",
    judgement: "판단",
    repeat: "반복",
    variable: "변수",
    func: "함수",
    calc: "계산",
    brush: "붓",
    flow: "흐름",
  };

  return categoryMap[category] || category;
}
function getKnownBlockFiles(category) {
  const fileMap = {
    start: [
      "when_object_click.json",
      "when_message_cast.json",
      "when_scene_start.json",
      "when_some_key_pressed.json",
      "start_neighbor_scene.json",
      "mouse_clicked.json",
      "mouse_click_cancled.json",
      "when_run_button_click.json",
      "message_cast_with.json",
      "message_cast.json",
    ],
    // 실제 존재하는 파일들만 추가 (나머지는 주석 처리)
    // moving: ['move_steps.json', 'rotate_relative.json', 'move_to_position.json'],
    // looks: ['show.json', 'hide.json', 'change_size.json', 'set_size.json'],
    // sound: ['play_sound.json', 'stop_sound.json'],
    // judgement: ['if.json', 'if_else.json'],
    // repeat: ['repeat_basic.json', 'repeat_inf.json'],
    // variable: ['set_variable.json', 'change_variable.json'],
    // func: ['function_create.json', 'function_call.json'],
    // calc: ['calc_basic.json', 'number.json'],
    // brush: ['brush_stamp.json'],
    // flow: ['wait_second.json', 'stop_run.json']
  };

  return fileMap[category] || [];
}

// ===== 2. searchEntryBlocks 함수 개선 (name 필드 활용) =====
async function searchEntryBlocks(userMessage, topK = 3) {
  const blockData = await loadEntryBlockData();

  if (!blockData || blockData.length === 0) {
    console.log("🔍 RAG: 블록 데이터 없음");
    return [];
  }

  const messageWords = userMessage
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1);

  console.log("🔍 검색 키워드:", messageWords);

  const scored = blockData.map((block) => {
    let score = 0;

    // 한국어 name 필드를 최우선으로 검색
    const searchableText = [
      block.name || "", // 한국어 블록명 (최우선)
      block.description || "", // 한국어 설명
      getCategoryKorean(block.category), // 한국어 카테고리명
      block.fileName || "", // 영어 파일명 (참고용)
      JSON.stringify(block.usage_examples || []),
      JSON.stringify(block.common_mistakes || []),
    ]
      .join(" ")
      .toLowerCase();

    // 키워드 매칭 (name 필드에 높은 가중치)
    for (const word of messageWords) {
      // 한국어 블록명 매칭 (가장 높은 점수)
      if (block.name && block.name.toLowerCase().includes(word)) {
        score += 10;
        console.log(`높은 매칭: ${block.name} <- ${word}`);
      }

      // 일반 텍스트 매칭
      if (searchableText.includes(word)) {
        score += 2;
      }

      // 카테고리 매칭
      const koreanCategory = getCategoryKorean(block.category);
      if (koreanCategory.includes(word)) {
        score += 5;
      }
    }

    // 특별 키워드 부스팅 (한국어 중심)
    const specialKeywords = {
      클릭: ["클릭", "click", "마우스", "누르"],
      시작: ["시작", "start"],
      소리: ["소리", "sound", "야옹", "멍멍", "재생"],
      움직: ["움직", "이동", "move"],
      반복: ["반복", "repeat", "무한"],
      조건: ["조건", "만약", "if"],
      변수: ["변수", "variable", "저장"],
    };

    for (const [korean, terms] of Object.entries(specialKeywords)) {
      if (userMessage.includes(korean)) {
        for (const term of terms) {
          if (searchableText.includes(term)) {
            score += 3;
          }
        }
      }
    }

    return { block, score };
  });

  const results = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => item.block);

  console.log(`🔍 RAG 검색 결과: ${results.length}개 블록 찾음`);
  if (results.length > 0) {
    console.log(
      "검색된 블록들:",
      results.map((b) => `${b.name || b.fileName} (${getCategoryKorean(b.category)})`)
    );
  }

  return results;
}

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
        max_tokens: 200, // 300 -> 200으로 단축
        temperature: 0.5, // 0.7 -> 0.5로 일관성 향상
        presence_penalty: 0.2,
        frequency_penalty: 0.2,
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

// ===== 교육적 AI 응답 생성 (RAG 통합 버전으로 교체) =====
async function generateEducationalResponse(userMessage, mode, projectContext, conversationHistory = []) {
  try {
    // API 키 확인
    const settings = await chrome.storage.sync.get(["openai_api_key"]);
    const apiKey = settings.openai_api_key;

    if (!apiKey || apiKey.trim() === "") {
      console.log("API 키가 설정되지 않음");
      return "API 키를 설정해주세요. 확장 프로그램 아이콘 → 설정에서 OpenAI API 키를 입력하세요.";
    }

    // 대화 횟수 기반 교육 단계 결정
    const messageCount = conversationHistory.length;
    const conversationCount = Math.floor(messageCount / 2);

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
      conversationCount >= 2; // 3번째 -> 2번째로 단축

    // 기본 프롬프트
    let systemPrompt = `당신은 Entry(엔트리) 블록코딩 교육 전문 튜터입니다.

교육 원칙:
• 2-3문장으로 간결하게 응답
• 소크라테스식 단계적 질문으로 학습 유도
• 현재 ${conversationCount + 1}번째 대화입니다

현재 상황: ${projectContext || "프로젝트 정보 없음"}
선택된 모드: ${getModeDescription(mode)}`;

    // generateEducationalResponse 함수의 RAG 부분 수정
    if (USE_RAG) {
      const relevantBlocks = await searchEntryBlocks(userMessage);

      if (relevantBlocks.length > 0) {
        const contextInfo = relevantBlocks
          .map((block) => {
            let info = `• ${getCategoryKorean(block.category)} 분류: ${block.name || block.fileName}`;
            if (block.description) info += ` - ${block.description}`;

            // 소리 관련 문제라면 디버깅 팁 추가
            if (userMessage.includes("소리") && block.debugging_tips) {
              info += `\n  디버깅: ${JSON.stringify(block.debugging_tips)}`;
            }

            return info;
          })
          .join("\n");

        systemPrompt += `

=== Entry 전문 지식 ===
${contextInfo}

**중요 지시사항:**
- 반드시 한국어 블록명 사용: "${relevantBlocks[0]?.name || "해당 블록"}"
- 영어 용어 절대 사용 금지 (when_object_click ❌, 오브젝트를 클릭했을 때 ✅)
- ${getCategoryKorean(relevantBlocks[0]?.category || "")} 분류라고 명시
- 구체적인 해결 단계 제시`;

        console.log("🧠 RAG 모드: Entry 전문 데이터 적용");
      }
    } else {
      systemPrompt += `

일반 블록코딩 원칙:
• 이벤트블록: 클릭, 키보드 입력 등 시작조건
• 동작블록: 움직임, 모양변경 등 실행내용
• 조건문: if-else 분기처리
• 반복문: 루프 실행

Entry 전문 데이터가 제한적이므로 일반적인 프로그래밍 원칙으로 안내합니다.`;

      console.log("📝 일반 모드: RAG 비활성화");
    }

    // 대화 단계별 지시사항
    if (needsImmediateHelp) {
      systemPrompt += `\n\n[지시] 학생이 도움을 요청했습니다. 구체적인 블록명과 단계별 방법을 알려주세요.`;
    } else if (conversationCount === 0) {
      systemPrompt += `\n\n[지시] 첫 번째 질문입니다. 답을 바로 주지 말고 유도 질문 1개만 하세요.`;
    } else {
      systemPrompt += `\n\n[지시] ${conversationCount + 1}번째 시도입니다. 적절한 카테고리 힌트를 주세요.`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-4), // 최근 2번의 대화만 유지
      { role: "user", content: userMessage },
    ];

    const response = await callOpenAI(messages, apiKey);

    // 응답 길이 제한 (3문장 이내)
    const sentences = response.split(/[.!?]\s+/);
    let finalResponse = response;
    if (sentences.length > 3) {
      finalResponse = sentences.slice(0, 3).join(". ") + ".";
    }

    // 사용량 로깅 (RAG 사용 여부 포함)
    await logUsageStats(userMessage.length, finalResponse.length, mode, USE_RAG);

    return finalResponse;
  } catch (error) {
    console.error("AI 응답 생성 실패:", error);
    return `죄송합니다. 오류가 발생했습니다: ${error.message}`;
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
    "어떤 부분이 어려우신가요?",
    "어떤 결과를 만들고 싶으세요?",
    "첫 번째 단계는 뭘까요?",
    "어떤 블록을 써보셨나요?",
  ];

  const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

  // API 키 관련 오류면 설정 안내 추가
  if (errorMessage.includes("API 키")) {
    return `${randomResponse}\n\n⚠️ ${errorMessage}\n\n확장 프로그램 아이콘을 클릭하여 API 키를 설정해주세요.`;
  }

  return `${randomResponse}\n\n(연결 상태가 불안정해서 간단한 응답을 드렸어요. 다시 시도해주세요!)`;
}

// ===== Content Script와 메시지 통신 =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "getSettings":
      chrome.storage.sync.get(["enabled", "autoAnalysis", "sidebarMode", "openai_api_key", "rag_enabled"], (data) => {
        // API 키 존재 여부만 전달 (보안)
        sendResponse({
          ...data,
          hasApiKey: !!data.openai_api_key,
          ragEnabled: data.rag_enabled !== false, // 현재 RAG 상태
          openai_api_key: undefined, // 실제 키는 전달하지 않음
        });
      });
      return true;

    case "saveSettings":
      chrome.storage.sync.set(request.settings, () => {
        // RAG 설정이 변경되면 즉시 반영
        if (request.settings.hasOwnProperty("rag_enabled")) {
          USE_RAG = request.settings.rag_enabled;
          console.log(`🔄 RAG 설정 변경: ${USE_RAG ? "ON" : "OFF"}`);
        }
        sendResponse({ success: true });
      });
      return true;

    case "toggleRAG":
      // RAG 토글 요청 처리
      chrome.storage.sync.get(["rag_enabled"], (data) => {
        const newState = !(data.rag_enabled !== false);
        chrome.storage.sync.set({ rag_enabled: newState }, () => {
          USE_RAG = newState;
          console.log(`🔄 RAG 토글: ${USE_RAG ? "ON" : "OFF"}`);
          sendResponse({ success: true, ragEnabled: newState });
        });
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

// ===== 사용량 통계 (RAG 사용 여부 포함) =====
async function logUsageStats(messageLength, responseLength, mode, ragUsed) {
  const today = new Date().toISOString().split("T")[0];
  const stats = await new Promise((resolve) => {
    chrome.storage.local.get([`stats_${today}`], resolve);
  });

  const todayStats = stats[`stats_${today}`] || {
    totalRequests: 0,
    totalTokens: 0,
    modeUsage: {},
    ragUsage: {
      withRAG: 0,
      withoutRAG: 0,
      ragSearches: 0,
      avgBlocksFound: 0,
    },
  };

  todayStats.totalRequests++;
  todayStats.totalTokens += Math.ceil((messageLength + responseLength) / 4);
  todayStats.modeUsage[mode] = (todayStats.modeUsage[mode] || 0) + 1;

  // RAG 사용 통계
  if (ragUsed) {
    todayStats.ragUsage.withRAG++;
    todayStats.ragUsage.ragSearches++;
  } else {
    todayStats.ragUsage.withoutRAG++;
  }

  chrome.storage.local.set({
    [`stats_${today}`]: todayStats,
  });

  console.log(`📊 사용량 기록: RAG ${ragUsed ? "ON" : "OFF"}, 모드: ${mode}`);
}

// ===== 기존 코드 (Entry URL 처리 등) =====
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
