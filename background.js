// Entry Block Helper - Background Service Worker (Quick & CoT 통합 버전)
// window 객체 polyfill
if (typeof self !== "undefined" && !self.window) {
  self.window = self;
}
// ===== 전역 설정 =====
let USE_RAG = true;
let entryBlockData = null;
let dataLoadPromise = null;

// ===== 모듈 임포트 =====
importScripts("questionClassifier.js");
importScripts("quickResponse.js");
importScripts("cotResponse.js");
importScripts("lib/hangul.min.js");
// 핸들러 인스턴스
let questionClassifier = new EntryQuestionClassifier();
let quickResponseHandler = new QuickResponseGenerator(); // ✅ Generator로 수정
let cotResponseHandler = new CoTResponseGenerator(); // ✅ 이것도 확인 필요

// ===== Chrome Extension 초기화 =====
chrome.runtime.onInstalled.addListener(() => {
  console.log("🚀 Entry Block Helper 설치 완료");
  chrome.storage.sync.set({
    enabled: true,
    openai_api_key: "",
    rag_enabled: true,
  });

  USE_RAG = true;
  loadEntryBlockData();
});

async function decomposeQuestion(question) {
  try {
    const result = await chrome.storage.sync.get(["openai_api_key"]);
    if (!result.openai_api_key) {
      console.log("⚠️ API 키 없음, 의도 분해 건너뜀");
      return null;
    }

    console.log("\n🧠 AI 의도 분해 시작");
    console.log("━".repeat(60));
    console.log("📝 원본 질문:", question);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${result.openai_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Entry 블록코딩 질문 분석기입니다.
반드시 아래 형식의 JSON만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "trigger": "시작 조건",
  "action": "수행 동작", 
  "target": "대상",
  "direction": "방향",
  "condition": "조건",
  "blocks": []
}

규칙:
- trigger: 키 입력, 클릭 등 (예: "스페이스키 누르면")
- action: 동작 (예: "이동하기")
- target: 대상 오브젝트 (예: "엔트리봇")
- direction: 방향/값 (예: "앞으로", "10만큼")
- condition: 조건 (예: "벽에 닿으면")
- blocks: 추천 블록 배열 ["when_some_key_pressed", "move_direction"]
- 없는 항목은 null

JSON만 응답. 설명 없음.`,
          },
          {
            role: "user",
            content: question,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error("❌ AI 의도 분해 실패:", response.status);
      return null;
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content;

    // JSON 파싱 시도 (에러 처리 강화)
    let decomposed;
    try {
      decomposed = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ JSON 파싱 실패:", responseText);
      console.error("파싱 에러:", parseError);

      // JSON 추출 시도 (텍스트에 JSON이 포함된 경우)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          decomposed = JSON.parse(jsonMatch[0]);
          console.log("✅ JSON 추출 성공");
        } catch {
          console.error("❌ JSON 추출도 실패");
          return null;
        }
      } else {
        return null;
      }
    }

    console.log("\n✨ 의도 분해 결과:");
    console.log("━".repeat(60));
    console.log("🎯 트리거:", decomposed.trigger || "없음");
    console.log("⚡ 동작:", decomposed.action || "없음");
    console.log("👤 대상:", decomposed.target || "없음");
    console.log("➡️ 방향/값:", decomposed.direction || "없음");
    console.log("❓ 조건:", decomposed.condition || "없음");
    console.log("🔧 추천 블록:", decomposed.blocks?.join(", ") || "없음");
    console.log("━".repeat(60));

    return decomposed;
  } catch (error) {
    console.error("❌ 의도 분해 오류:", error);
    return null;
  }
}
// ===== Entry 블록 데이터 로드 =====
async function loadEntryBlockData() {
  if (entryBlockData) return entryBlockData;
  if (dataLoadPromise) return dataLoadPromise;

  dataLoadPromise = (async () => {
    try {
      const blockCategories = ["start", "moving", "looks", "sound", "judgement", "flow", "variable", "func", "calc", "brush"];
      const allBlocks = [];

      for (const category of blockCategories) {
        try {
          const knownFiles = getKnownBlockFiles(category);

          for (const fileName of knownFiles) {
            try {
              const response = await fetch(chrome.runtime.getURL(`data/blocks/${category}/${fileName}`));

              if (response.ok) {
                const blockData = await response.json();
                const imagePath = `data/block-images/${category}/${fileName.replace(".json", ".png")}`;
                const imageUrl = chrome.runtime.getURL(imagePath);

                let hasImage = false;
                try {
                  const imgResponse = await fetch(imageUrl, { method: "HEAD" });
                  hasImage = imgResponse.ok;
                } catch {
                  hasImage = false;
                }

                allBlocks.push({
                  category,
                  fileName: fileName.replace(".json", ""),
                  imageUrl: hasImage ? imageUrl : null,
                  hasImage,
                  ...blockData,
                });
              }
            } catch (fileError) {
              console.log(`파일 건너뜀: ${category}/${fileName}`);
            }
          }
        } catch (categoryError) {
          console.log(`카테고리 건너뜀: ${category}`);
        }
      }

      entryBlockData = allBlocks;
      console.log(`📚 Entry 블록 데이터 로드 완료: ${allBlocks.length}개`);
      return allBlocks;
    } catch (error) {
      console.error("Entry 데이터 로드 실패:", error);
      entryBlockData = [];
      return [];
    }
  })();

  return dataLoadPromise;
}

// ===== 질문 분류 (향상된 로깅) =====
async function classifyQuestion(message) {
  // 메시지 타입 검증 추가
  if (!message || typeof message !== "string") {
    console.warn("잘못된 메시지 형식:", message);
    return {
      type: "simple",
      confidence: 0.5,
      method: "default",
      keywords: [],
      scores: {},
    };
  }
  if (!questionClassifier) {
    questionClassifier = new EntryQuestionClassifier();
  }

  console.log("\n" + "=".repeat(60));
  console.log("🔍 질문 분석 시작");
  console.log("=".repeat(60));
  console.log("📝 원본 질문:", message);

  const result = await questionClassifier.classify(message);

  const typeInfo = {
    simple: { emoji: "📦", desc: "단순 블록 위치/사용법" },
    complex: { emoji: "🎮", desc: "복합 프로젝트/게임 제작" },
    debug: { emoji: "🐛", desc: "오류/문제 해결" },
    conceptual: { emoji: "💡", desc: "개념/원리 설명" },
  };

  const info = typeInfo[result.type] || { emoji: "❓", desc: "알 수 없음" };

  console.log("\n📊 분석 결과:");
  console.log(`  • 타입: ${info.emoji} ${(result.type || "unknown").toUpperCase()} - ${info.desc}`);
  console.log(`  • 신뢰도: ${(result.confidence * 100).toFixed(1)}% ${getConfidenceBar(result.confidence)}`);
  console.log(`  • 분류 방법: ${result.method === "ai" ? "🤖 AI" : "📏 규칙기반"}`);

  if (result.keywords && result.keywords.length > 0) {
    console.log(`  • 감지된 키워드: [${result.keywords.join(", ")}]`);
  }

  console.log("=".repeat(60) + "\n");

  return result;
}

// 신뢰도 시각화
function getConfidenceBar(confidence) {
  const filled = Math.round(confidence * 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

async function searchEntryBlocks(userMessage, topK = 5, decomposed = null) {
  const blockData = await loadEntryBlockData();

  if (!blockData || blockData.length === 0) {
    console.log("🔍 RAG: 블록 데이터 없음");
    return [];
  }

  console.log(`🔍 RAG: ${blockData.length}개 블록에서 검색 중...`);

  // 1. AI 추천 블록 우선 처리
  if (decomposed && decomposed.blocks && decomposed.blocks.length > 0) {
    console.log(`🤖 AI 추천 블록: ${decomposed.blocks.join(", ")}`);

    const recommendedBlocks = [];
    for (const recommendedId of decomposed.blocks) {
      const found = blockData.find((block) => block.id === recommendedId || block.fileName === recommendedId);
      if (found) {
        console.log(`✅ AI 추천 블록 발견: ${found.name} (${found.id})`);
        recommendedBlocks.push(found);
      }
    }

    if (recommendedBlocks.length > 0) {
      return recommendedBlocks;
    }
    console.log("⚠️ AI 추천 블록을 데이터에서 찾지 못함");
  }

  // 2. 키워드 기반 검색
  if (!questionClassifier) {
    questionClassifier = new EntryQuestionClassifier();
  }

  // 정규화 및 토큰화
  const normalized = questionClassifier.normalizeText(userMessage);
  const tokens = questionClassifier.tokenizeKorean(normalized);
  const { keywords } = questionClassifier.extractKeywords(tokens, normalized);

  console.log("🔤 검색 토큰:", tokens);
  console.log("🔑 추출 키워드:", keywords);

  // 점수 계산
  const scored = blockData.map((block) => {
    let score = 0;
    let matchedBy = [];

    // 1. 블록 ID와 키워드 매칭
    const blockId = block.id || block.fileName?.replace(".json", "") || "";
    if (blockId) {
      const lowerId = blockId.toLowerCase();

      // 키워드와 ID 매핑
      const idKeywordMap = {
        스페이스: ["when_some_key_pressed"],
        스페이스키: ["when_some_key_pressed"],
        스페이스바: ["when_some_key_pressed"],
        키: ["when_some_key_pressed", "key"],
        누르: ["when_some_key_pressed", "pressed"],
        이동: ["move_direction", "move"],
        움직: ["move_direction", "move"],
        반복: ["repeat_basic", "repeat_inf"],
        조건: ["_if", "if_else"],
        만약: ["_if", "if_else"],
        변수: ["set_variable", "get_variable", "change_variable"],
        시작: ["when_run_button_click", "when_scene_start"],
        클릭: ["when_object_click", "when_run_button_click"],
      };

      // 토큰이 매핑된 ID와 일치하는지 확인
      for (const token of tokens) {
        if (idKeywordMap[token]) {
          for (const mappedId of idKeywordMap[token]) {
            if (lowerId.includes(mappedId)) {
              score += 100;
              matchedBy.push(`id-map: ${token}→${mappedId}`);
              break;
            }
          }
        }

        // ID에 토큰이 직접 포함되는 경우
        if (token.length >= 2 && lowerId.includes(token)) {
          score += 50;
          matchedBy.push(`id-contains: ${token}`);
        }
      }
    }

    // 2. 블록 이름 매칭
    if (block.name && typeof block.name === "string") {
      const lowerName = block.name.toLowerCase();

      // 핵심 키워드 매칭
      const coreKeywords = {
        키: 80,
        누르: 70,
        스페이스: 70,
        반복: 80,
        이동: 80,
        시작: 80,
        만약: 80,
        변수: 80,
        클릭: 70,
        움직: 70,
      };

      for (const [keyword, points] of Object.entries(coreKeywords)) {
        if (tokens.includes(keyword) && lowerName.includes(keyword)) {
          score += points;
          matchedBy.push(`name: ${keyword}`);
        }
      }

      // 부분 매칭
      for (const token of tokens) {
        if (token.length >= 2 && lowerName.includes(token)) {
          score += 20;
          matchedBy.push(`name-partial: ${token}`);
        }
      }
    }

    // 3. description 매칭
    if (block.description && typeof block.description === "string") {
      const lowerDesc = block.description.toLowerCase();
      for (const token of tokens) {
        if (token && token.length >= 2 && lowerDesc.includes(token)) {
          score += 10;
          matchedBy.push(`desc: ${token}`);
        }
      }
    }

    // 4. usage_examples 매칭 (JSON 구조에 맞게 수정)
    if (block.usage_examples && Array.isArray(block.usage_examples)) {
      for (const example of block.usage_examples) {
        if (example.description && typeof example.description === "string") {
          const lowerExample = example.description.toLowerCase();
          for (const token of tokens) {
            if (token && token.length >= 2 && lowerExample.includes(token)) {
              score += 15;
              matchedBy.push(`example: ${token}`);
            }
          }
        }
      }
    }

    // 디버깅: 점수가 있는 블록 로그
    if (score > 0) {
      console.log(`  📊 ${block.name}: 점수=${score}, 매칭=${matchedBy.join(", ")}`);
    }

    return {
      block,
      score,
      matchedBy: matchedBy.length > 0 ? matchedBy.join(", ") : null,
    };
  });

  // 결과 필터링 및 정렬
  const results = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => ({
      ...item.block,
      _searchScore: item.score,
      _matchedBy: item.matchedBy,
    }));

  if (results.length > 0) {
    console.log(`✅ RAG 검색 완료: ${results.length}개 블록 발견`);
    results.forEach((block, idx) => {
      console.log(`  ${idx + 1}. ${block.name} (점수: ${block._searchScore})`);
    });
  } else {
    console.log("❌ RAG 검색 결과 없음");
  }

  return results;
}

importScripts("handlers/simpleHandler.js");
importScripts("handlers/complexHandler.js");
importScripts("handlers/debugHandler.js");

const handlers = {
  simple: new SimpleHandler(),
  complex: new ComplexHandler(),
  debug: new DebugHandler(),
};

// background.js - handleAIRequest 수정
async function handleAIRequest(request) {
  const message = request.message;

  try {
    // 1. 의도 분해
    const decomposed = await decomposeQuestion(message);

    // 2. 질문 타입 결정
    const type = determineQuestionType(decomposed, message);

    // 3. 핸들러 호출 (각 핸들러가 필요시 searchEntryBlocks 호출)
    const handler = handlers[type];
    const result = await handler.handle(decomposed, message);

    return result;
  } catch (error) {
    console.error("AI 요청 처리 오류:", error);
    return {
      success: false,
      response: getFallbackResponse(error.message),
    };
  }
}

function determineQuestionType(decomposed, message) {
  // 디버그 키워드 체크
  if (message.includes("안돼") || message.includes("오류") || message.includes("안됨") || message.includes("문제")) {
    return "debug";
  }

  // 복합 동작 체크 (trigger + action)
  if (decomposed && decomposed.trigger && decomposed.action) {
    return "complex";
  }

  // 나머지는 단순 질문
  return "simple";
}

// ===== CoT 응답 포맷팅 =====
function formatCoTForUser(cotResult) {
  const firstStep = cotResult.sequence.steps[0];
  return (
    `${cotResult.template.title}\n\n` +
    `📋 총 ${cotResult.sequence.totalSteps}단계로 진행됩니다.\n\n` +
    `**Step 1: ${firstStep.title}**\n` +
    `${firstStep.content}`
  );
}

// ===== 기본 응답 생성 함수들 =====
async function generateBasicResponse(message, classification, apiKey) {
  // OpenAI API 사용하여 기본 응답 생성
  const response = await callOpenAI(
    [
      {
        role: "system",
        content: "당신은 Entry 블록코딩 도우미입니다. 간단명료하게 답변하세요.",
      },
      {
        role: "user",
        content: message,
      },
    ],
    apiKey
  );

  return response;
}

async function generateDebugResponse(message, classification, apiKey) {
  return (
    `문제가 발생했나요? 함께 해결해봐요!\n\n` +
    `1. 먼저 블록이 올바르게 연결되었는지 확인해보세요.\n` +
    `2. 실행 버튼을 다시 눌러보세요.\n` +
    `3. 변수 값이 올바른지 확인해보세요.\n\n` +
    `구체적으로 어떤 문제가 있는지 알려주시면 더 자세히 도와드릴게요!`
  );
}

async function generateConceptualResponse(message, classification, apiKey) {
  // 개념 설명을 위한 기본 템플릿
  const concepts = {
    반복: "같은 동작을 여러 번 실행하는 것",
    조건: "특정 상황에서만 실행되도록 하는 것",
    변수: "값을 저장하고 사용하는 상자",
    함수: "여러 블록을 하나로 묶어 재사용하는 것",
  };

  for (const [concept, explanation] of Object.entries(concepts)) {
    if (message.includes(concept)) {
      return (
        `${concept}이란 ${explanation}입니다.\n\n` +
        `Entry에서는 이를 위한 전용 블록들이 있어요.\n` +
        `실제로 사용해보면서 익혀보는 것이 좋습니다!`
      );
    }
  }

  return "어떤 개념에 대해 궁금하신가요? 더 자세히 설명해주시면 도와드릴게요!";
}

// ===== OpenAI API 호출 =====
async function callOpenAI(messages, apiKey = null) {
  const key = apiKey || "";

  if (!key) {
    throw new Error("API 키가 설정되지 않았습니다");
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
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || response.statusText);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API 호출 실패:", error);
    throw error;
  }
}

// background.js의 getFallbackResponse 함수 수정
function getFallbackResponse(errorMessage) {
  // errorMessage가 undefined일 수 있으므로 체크
  const message = errorMessage || "알 수 없는 오류가 발생했습니다";

  if (message.includes("API 키")) {
    return "API 키를 설정해주세요. 확장 프로그램 아이콘을 클릭하여 설정할 수 있어요!";
  }
  return "죄송해요, 일시적인 문제가 발생했어요. 다시 시도해주세요!";
}

// ===== 카테고리 한국어 변환 =====
function getCategoryKorean(category) {
  const categoryMap = {
    start: "시작",
    moving: "움직임",
    looks: "생김새",
    sound: "소리",
    judgement: "판단",
    flow: "흐름",
    variable: "자료",
    func: "함수",
    calc: "계산",
    brush: "붓",
  };
  return categoryMap[category] || category;
}

// ===== 블록 파일 목록 =====
function getKnownBlockFiles(category) {
  const fileMap = {
    start: [
      "message_cast.json",
      "message_cast_wait.json",
      "when_message_cast.json",
      "when_object_click.json",
      "when_run_button_click.json",
      "when_scene_start.json",
      "when_some_key_pressed.json",
    ],
    moving: [
      "bounce_wall.json",
      "locate.json",
      "locate_xy.json",
      "move_direction.json",
      "move_x.json",
      "move_y.json",
      "rotate_relative.json",
    ],
    looks: ["change_to_next_shape.json", "dialog.json", "hide.json", "show.json"],
    sound: ["play_sound.json", "sound_volume_change.json"],
    judgement: ["boolean_and_or.json", "boolean_basic_operator.json", "is_clicked.json", "reach_something.json"],
    flow: [
      "_if.json",
      "if_else.json",
      "repeat_basic.json",
      "repeat_inf.json",
      "wait_second.json",
      "create_clone.json",
      "delete_clone.json",
      "when_clone_start.json",
    ],
    variable: ["set_variable.json", "get_variable.json", "change_variable.json", "ask_and_wait.json"],
    func: ["function_create.json", "function_general.json"],
    calc: ["calc_basic.json", "calc_operation.json", "calc_rand.json"],
    brush: ["brush_erase_all.json", "brush_stamp.json", "start_drawing.json"],
  };

  return fileMap[category] || [];
}

// ===== Chrome Extension 메시지 처리 =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "generateAIResponse":
      handleAIRequest(request)
        .then((result) => {
          console.log("AI 응답 전송:", result);
          sendResponse(result);
        })
        .catch((error) => {
          console.error("AI 처리 오류:", error);
          sendResponse({
            success: false,
            response: getFallbackResponse(error.message),
            error: error.message,
          });
        });
      return true; // 비동기 응답

    case "getSettings":
      chrome.storage.sync.get(["openai_api_key", "rag_enabled"], (data) => {
        sendResponse({
          ...data,
          hasApiKey: !!data.openai_api_key,
          ragEnabled: data.rag_enabled !== false,
        });
      });
      return true;

    case "saveSettings":
      chrome.storage.sync.set(request.settings, () => {
        if (request.settings.hasOwnProperty("rag_enabled")) {
          USE_RAG = request.settings.rag_enabled;
          console.log(`🔄 RAG 설정 변경: ${USE_RAG ? "ON" : "OFF"}`);
        }
        sendResponse({ success: true });
      });
      return true;

    case "toggleRAG":
      chrome.storage.sync.get(["rag_enabled"], (data) => {
        const newState = !(data.rag_enabled !== false);
        chrome.storage.sync.set({ rag_enabled: newState }, () => {
          USE_RAG = newState;
          sendResponse({ success: true, ragEnabled: newState });
        });
      });
      return true;

    default:
      break;
  }
});

// ===== Entry 탭 관리 =====
const ENTRY_URL = "https://playentry.org/";
const ENTRY_MATCH = /^https?:\/\/([a-z0-9-]+\.)?playentry\.org/i;

function sendToggle(tabId) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, { type: "TOGGLE_SIDEBAR" }, () => {
    void chrome.runtime.lastError;
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
  } else {
    const created = await chrome.tabs.create({ url: ENTRY_URL, active: true });
    setTimeout(() => sendToggle(created.id), 3000);
  }
}
