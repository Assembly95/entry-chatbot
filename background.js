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
importScripts("data/block_name_id_match.js");
importScripts("data/entryKnowledge.js");

// 핸들러 임포트 (handlers 정의 전에 와야 함)
importScripts("handlers/simpleHandler.js");
importScripts("handlers/complexHandler.js");
importScripts("handlers/debugHandler.js");

// handlers 객체 정의 추가
const handlers = {
  simple: new SimpleHandler(),
  complex: new ComplexHandler(),
  debug: new DebugHandler(),
};

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

// ===== 헬퍼 함수들 =====

/**
 * 블록 이름 복잡도 계산
 * 파라미터가 많을수록, 이름이 길수록 복잡함
 */
function getBlockComplexity(blockName) {
  const paramCount = (blockName.match(/\[/g) || []).length;
  const length = blockName.length;
  return paramCount * 10 + length;
}

function createReverseBlockMap() {
  // entryBlockMap이 로드되었는지 확인
  if (typeof entryBlockMap === "undefined") {
    console.error("entryBlockMap이 로드되지 않음");
    return {};
  }
  const reverseMap = {};

  // entryBlockMap을 순회하면서 역방향 매핑 생성
  for (const [id, name] of Object.entries(entryBlockMap)) {
    // "소리 재생하기" → "sound_something_with_block"
    reverseMap[name] = id;

    // 추가로 간단한 키워드 매핑도 생성
    if (name.includes("소리") && name.includes("재생")) {
      reverseMap["play_sound"] = "sound_something_with_block"; // AI가 사용할 가능성 있는 이름
    }
    // ... 더 많은 패턴 추가
  }

  return reverseMap;
}

// background.js의 decomposeQuestion 함수 개선

// background.js의 decomposeQuestion 함수 개선

async function decomposeQuestion(question) {
  try {
    // 1단계: 로컬 매핑으로 먼저 시도
    const localResult = tryLocalBlockMapping(question);
    if (localResult) {
      console.log("✅ 로컬 매핑으로 해결:", localResult);
      return localResult;
    }

    // 2단계: API 키 확인
    const result = await chrome.storage.sync.get(["openai_api_key"]);
    if (!result.openai_api_key) {
      return null;
    }

    // 3단계: AI로 간단한 의도만 파악
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
            content: `사용자 질문에서 핵심 동작/트리거만 추출하세요.
            
예시:
- "마우스 클릭했을 때" → "마우스 클릭"
- "스페이스 누르면" → "스페이스키 누르기"
- "10번 반복" → "반복"

한국어 단어/구문만 반환하세요.`,
          },
          {
            role: "user",
            content: question,
          },
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    const data = await response.json();
    const intent = data.choices[0].message.content.trim();

    // 4단계: 의도를 블록 ID로 변환
    const blocks = findBlocksByIntent(intent);

    return {
      trigger: intent,
      blocks: blocks,
      method: "ai+local",
    };
  } catch (error) {
    console.error("❌ 의도 분해 오류:", error);
    return null;
  }
}

// 로컬 블록 매핑
function tryLocalBlockMapping(question) {
  const q = question.toLowerCase();

  // 직접 매핑 패턴
  const patterns = [
    { pattern: /마우스.*클릭(?!.*오브젝트)/, blockId: "mouse_clicked" },
    { pattern: /오브젝트.*클릭/, blockId: "when_object_click" },
    { pattern: /스페이스/, blockId: "when_some_key_pressed" },
    { pattern: /키.*누르/, blockId: "when_some_key_pressed" },
    { pattern: /시작.*버튼/, blockId: "when_run_button_click" },
    { pattern: /반복/, blockId: "repeat_basic" },
    { pattern: /무한.*반복/, blockId: "repeat_inf" },
    { pattern: /이동|움직/, blockId: "move_direction" },
    { pattern: /소리.*재생/, blockId: "sound_something_with_block" },
  ];

  for (const { pattern, blockId } of patterns) {
    if (pattern.test(q)) {
      return {
        trigger: question,
        blocks: [blockId],
        method: "local",
      };
    }
  }

  return null;
}

// 의도에서 블록 ID 찾기 (entryBlockMap 활용)
function findBlocksByIntent(intent) {
  const blocks = [];
  const intentLower = intent.toLowerCase();

  // entryBlockMap을 역으로 검색
  for (const [blockId, blockName] of Object.entries(entryBlockMap)) {
    const nameLower = blockName.toLowerCase();

    // 의도와 블록 이름 매칭
    if (
      (intentLower.includes("마우스") && intentLower.includes("클릭") && blockId === "mouse_clicked") ||
      (intentLower.includes("오브젝트") && intentLower.includes("클릭") && blockId === "when_object_click") ||
      (intentLower.includes("스페이스") && blockId === "when_some_key_pressed") ||
      (intentLower.includes("반복") && !intentLower.includes("무한") && blockId === "repeat_basic") ||
      (intentLower.includes("무한") && blockId === "repeat_inf") ||
      (intentLower.includes("이동") && blockId === "move_direction")
    ) {
      blocks.push(blockId);
      break; // 첫 번째 매칭만
    }
  }

  // 못 찾으면 유사도로 찾기
  if (blocks.length === 0) {
    for (const [blockId, blockName] of Object.entries(entryBlockMap)) {
      if (calculateSimilarity(intent, blockName) > 0.6) {
        blocks.push(blockId);
        break;
      }
    }
  }

  return blocks;
}

// 간단한 유사도 계산
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  let matches = 0;
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);

  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1.includes(w2) || w2.includes(w1)) {
        matches++;
      }
    }
  }

  return matches / Math.max(words1.length, words2.length);
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
              const url = chrome.runtime.getURL(`data/blocks/${category}/${fileName}`);
              const response = await fetch(url);

              if (!response.ok) {
                console.error(`❌ 파일 로드 실패: ${category}/${fileName}`);
                continue;
              }

              const blockData = await response.json();
              const blockId = blockData.id || fileName.replace(".json", "");

              // 🔥 Entry 이름 매핑 적용!
              const entryName = entryBlockMap && entryBlockMap[blockId] ? entryBlockMap[blockId] : blockData.name;

              allBlocks.push({
                ...blockData,
                id: blockId,
                name: entryName, // 🔥 Entry 이름으로 교체!
                category,
                fileName: fileName.replace(".json", ""),
              });

              console.log(`✅ 로드 성공: ${fileName} → "${entryName}"`);
            } catch (fileError) {
              console.error(`❌ 파일 처리 에러: ${category}/${fileName}`, fileError.message);
            }
          }
        } catch (categoryError) {
          console.error(`카테고리 에러: ${category}`, categoryError);
        }
      }

      entryBlockData = allBlocks;
      console.log(`📚 Entry 블록 데이터 로드 완료: ${allBlocks.length}개`);

      // 🔥 디버깅: repeat_inf 확인
      const repeatBlock = allBlocks.find((b) => b.id === "repeat_inf");
      console.log("🔍 repeat_inf 블록 이름:", repeatBlock?.name);

      return allBlocks;
    } catch (error) {
      console.error("Entry 데이터 로드 실패:", error);
      entryBlockData = [];
      return [];
    }
  })();

  return dataLoadPromise;
}

// 새로운 함수 추가
async function handleCoTAdditionAnalysis(request) {
  const { request: userRequest, currentStep, cotContext } = request;

  try {
    // API 키 확인
    const result = await chrome.storage.sync.get(["openai_api_key"]);
    if (!result.openai_api_key) {
      throw new Error("API 키가 설정되지 않았습니다");
    }

    // OpenAI API로 사용자 요구사항 분석
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
            content: `당신은 Entry 블록코딩 교육 도우미입니다.
            
현재 학습자는 "${cotContext.stepTitle}" 단계를 진행 중입니다.
학습자가 이 단계에 추가 기능을 요청했습니다.

요청을 분석하고 Entry 블록으로 구현 가능한 추가 단계들을 생성하세요.

응답 형식 (JSON):
{
  "featureName": "추가 기능 이름",
  "additionalSteps": [
    {
      "title": "단계 제목",
      "content": "단계 설명 (마크다운)",
      "blockType": "사용할 블록 ID",
      "category": "블록 카테고리"
    }
  ]
}

블록 카테고리: start, moving, looks, sound, flow, variable, calc, judgement`,
          },
          {
            role: "user",
            content: userRequest,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;

    // JSON 파싱
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (e) {
      // JSON 파싱 실패 시 기본 구조로
      parsedResponse = generateFallbackSteps(userRequest, cotContext);
    }

    return {
      success: true,
      ...parsedResponse,
    };
  } catch (error) {
    console.error("CoT 추가 분석 오류:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// 폴백 단계 생성 (AI 실패 시)
function generateFallbackSteps(userRequest, cotContext) {
  const lower = userRequest.toLowerCase();

  // 키워드 기반 간단한 분석
  if (lower.includes("소리") || lower.includes("효과음")) {
    return {
      featureName: "효과음 추가",
      additionalSteps: [
        {
          title: "소리 블록 추가하기",
          content: "### 🔊 효과음 추가\n\n소리 카테고리에서 '소리 재생하기' 블록을 찾아 추가하세요.",
          blockType: "play_sound",
          category: "sound",
        },
      ],
    };
  }

  // 기본 응답
  return {
    featureName: "사용자 정의 기능",
    additionalSteps: [
      {
        title: "추가 기능 구현",
        content: `### 🎯 ${userRequest}\n\n이 기능을 구현하기 위한 블록을 추가하세요.`,
        blockType: null,
        category: "custom",
      },
    ],
  };
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
    const reverseMap = createReverseBlockMap();

    const recommendedBlocks = [];
    for (const recommendedId of decomposed.blocks) {
      let found = blockData.find((block) => block.id === recommendedId);

      if (!found) {
        const mappedId = reverseMap[recommendedId];
        if (mappedId) {
          found = blockData.find((block) => block.id === mappedId);
        }
      }
      if (found) {
        console.log(`✅ 블록 발견: ${found.name} (${found.id})`);
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

  // ⭐ 의도 파악 (새로 추가)
  const isAskingLocation = userMessage.includes("위치") || userMessage.includes("어디");
  const isCreating = userMessage.includes("만들") || userMessage.includes("생성");
  const isDeleting = userMessage.includes("삭제") || userMessage.includes("지우") || userMessage.includes("제거");

  // 점수 계산
  const scored = blockData.map((block) => {
    let score = 0;
    let matchedBy = [];

    // ⭐ 0. 정확한 의도 매칭 우선 (새로 추가)
    if (isAskingLocation) {
      // "복제본 만들기 블록 위치" 같은 경우
      if (isCreating && block.name.includes("만들") && userMessage.includes("복제본") && block.name.includes("복제본")) {
        score += 300; // 매우 높은 우선순위
        matchedBy.push("exact-intent: 만들기+위치");
      } else if (isDeleting && block.name.includes("삭제") && userMessage.includes("복제본") && block.name.includes("복제본")) {
        score += 300;
        matchedBy.push("exact-intent: 삭제+위치");
      }
    }

    // ⭐ 의도에 따른 추가 가중치 (수정)
    if (!isAskingLocation) {
      // 위치를 묻는게 아닐 때만 동작 가중치 적용
      if (isCreating && block.name.includes("만들")) {
        score += 100;
        matchedBy.push("intent: 만들기");
      }
      if (isDeleting && (block.name.includes("삭제") || block.name.includes("지우"))) {
        score += 100;
        matchedBy.push("intent: 삭제");
      }
    }

    // 1. 블록 ID와 키워드 매칭
    const blockId = block.id || block.fileName?.replace(".json", "") || "";
    if (blockId) {
      const lowerId = blockId.toLowerCase();

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
        // ⭐ 복제본 관련 추가
        복제본: ["create_clone", "delete_clone", "when_clone_start", "remove_all_clones"],
      };

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

        if (token.length >= 2 && lowerId.includes(token)) {
          score += 50;
          matchedBy.push(`id-contains: ${token}`);
        }
      }
    }

    // 2. 블록 이름 매칭 (수정)
    if (block.name && typeof block.name === "string") {
      const lowerName = block.name.toLowerCase();

      const coreKeywords = {
        키: 100,
        누르: 100,
        스페이스: 100,
        반복: 100,
        이동: 100,
        시작: 100,
        만약: 100,
        변수: 100,
        클릭: 100,
        움직: 100,
        복제본: 80,
        만들: 80,
        삭제: 80,
        소리: 100, // 🔥 추가
        재생: 100, // 🔥 추가
        멈춤: 100, // 🔥 추가
        무한: 100,
        계속: 100,
      };

      // 🔥 Core 키워드 매칭 (부분 문자열도 OK)
      for (const [keyword, points] of Object.entries(coreKeywords)) {
        // tokens 중에 keyword를 포함하는 게 있나?
        const matchedToken = tokens.find((token) => token.includes(keyword) || keyword.includes(token));

        if (matchedToken && lowerName.includes(keyword)) {
          score += points;
          matchedBy.push(`name: ${keyword}`);
        }
      }

      // 부분 매칭 (Core에 없는 것만)
      for (const token of tokens) {
        if (token.length >= 2 && lowerName.includes(token)) {
          // 이미 core로 매칭됐는지 확인
          const alreadyCoreMatched = Object.keys(coreKeywords).some(
            (key) => (token.includes(key) || key.includes(token)) && lowerName.includes(key)
          );

          if (alreadyCoreMatched) continue;

          score += 5;
          matchedBy.push(`name-partial: ${token}`);
        }
      }
    }

    // 3. description 매칭 (점수 더 낮춤)
    if (block.description && typeof block.description === "string") {
      const lowerDesc = block.description.toLowerCase();
      for (const token of tokens) {
        if (token && token.length >= 2 && lowerDesc.includes(token)) {
          score += 2; // 5 → 2로 감소
          matchedBy.push(`desc: ${token}`);
        }
      }
    }

    // 4. usage_examples 매칭 (점수 더 낮춤)
    if (block.usage_examples && Array.isArray(block.usage_examples)) {
      for (const example of block.usage_examples) {
        if (example.description && typeof example.description === "string") {
          const lowerExample = example.description.toLowerCase();
          for (const token of tokens) {
            if (token && token.length >= 2 && lowerExample.includes(token)) {
              score += 1; // 5 → 1로 감소
              matchedBy.push(`example: ${token}`);
            }
          }
        }
      }
    }
    // 🔥 여기에 추가! ─────────────────────────
    // 5. 단순성 보너스
    const complexity = getBlockComplexity(block.name);
    const simplicityBonus = (100 - complexity) * 0.05;
    score += simplicityBonus;

    if (simplicityBonus > 0) {
      matchedBy.push(`simplicity: +${simplicityBonus.toFixed(1)}`);
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

// background.js - 개선된 질문 분류 로직

// background.js - handleAIRequest 함수 수정

async function handleAIRequest(request) {
  const message = request.message;

  try {
    // 1. 질문 분류
    const classification = await classifyUserIntent(message);
    console.log(`📊 분류 결과: ${classification.type} (신뢰도: ${classification.confidence})`);

    // 2. RAG 검색 (모든 경우에 수행)
    let ragResults = [];
    if (USE_RAG) {
      try {
        ragResults = await searchEntryBlocks(message, 5);
        console.log(`📚 RAG 검색 완료: ${ragResults.length}개 블록`);
      } catch (error) {
        console.error("RAG 검색 실패:", error);
        ragResults = [];
      }
    }

    // 3. 핸들러 라우팅
    let result;

    switch (classification.type) {
      case "debug":
        console.log("🐛 DebugHandler 호출");
        const debugHandler = new DebugHandler();
        result = await debugHandler.handle(null, message);
        break;

      case "location":
      case "usage":
      case "simple":
        console.log("📦 SimpleHandler 호출");
        const simpleHandler = new SimpleHandler();
        result = await simpleHandler.handle(null, message);
        result.rawBlocks = ragResults;
        break;

      case "complex":
        console.log("🎮 ComplexHandler 호출");
        const complexHandler = new ComplexHandler();

        // decomposed 생성 (간단한 버전)
        const decomposed = {
          trigger: "시작",
          action: "술래잡기",
          target: "플레이어",
        };

        // ComplexHandler의 handle 함수 시그니처 확인
        result = await complexHandler.handle(decomposed, ragResults, message);
        break;

      default:
        console.log("❓ 기본 SimpleHandler 호출");
        const defaultHandler = new SimpleHandler();
        result = await defaultHandler.handle(null, message);
        result.rawBlocks = ragResults;
    }

    // 결과 확인
    if (!result) {
      console.error("핸들러가 null 반환");
      result = {
        success: false,
        response: "응답 생성에 실패했습니다.",
      };
    }

    // success 플래그 확인
    if (!result.hasOwnProperty("success")) {
      result.success = true;
    }

    console.log("✅ 최종 응답:", result);
    return result;
  } catch (error) {
    console.error("❌ handleAIRequest 오류:", error);
    return {
      success: false,
      response: getFallbackResponse(error.message),
      error: error.message,
    };
  }
}

// ComplexHandler 존재 여부 확인
if (typeof ComplexHandler === "undefined") {
  console.error("ComplexHandler가 정의되지 않았습니다!");
}

// 테스트 함수
function testComplexClassification() {
  const testMessages = ["술래잡기 게임 만들고 싶어요", "슈팅 게임 어떻게 만들어요?", "미로 게임 제작 방법"];

  testMessages.forEach(async (msg) => {
    const result = await classifyUserIntent(msg);
    console.log(`"${msg}" → ${result.type}`);
  });
}

/**
 * 개선된 사용자 의도 분류 함수
 */
async function classifyUserIntent(message) {
  const lower = message.toLowerCase();

  // 1. 디버깅 키워드 체크 (최우선)
  const debugPatterns = {
    // 작동 문제
    notWorking: [/안\s*돼/, /안\s*됨/, /작동.*안/, /실행.*안/, /먹통/, /아무.*반응/],

    // 한 번만 실행 (연구 기반 패턴)
    onceOnly: [/한\s*번만/, /처음만/, /처음에만/, /계속.*안/, /다시.*안/],

    // 충돌/감지 문제
    collision: [/닿.*안/, /충돌.*안/, /감지.*안/, /인식.*안/],

    // 변수 문제
    variable: [/변수.*안/, /점수.*안/, /공유.*안/, /각자/, /따로/],

    // 신호/메시지 문제
    message: [/신호.*안/, /메시지.*안/, /메세지.*안/, /받.*안/, /전달.*안/],

    // 복제본 문제
    clone: [/복제.*안/, /복사.*안/, /클론.*안/, /총알.*안/, /하나만/],

    // 움직임 문제
    movement: [/안\s*움직/, /움직.*안/, /이동.*안/, /멈춰/, /멈춤/],
  };

  // 디버깅 패턴 체크
  for (const [category, patterns] of Object.entries(debugPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        console.log(`🐛 디버깅 패턴 감지: ${category}`);
        return {
          type: "debug",
          subtype: category,
          confidence: 0.9,
          method: "pattern",
        };
      }
    }
  }

  // 2. 위치/사용법 키워드 체크 (SimpleHandler)
  const simplePatterns = {
    location: [/어디.*있/, /어디.*찾/, /위치/, /카테고리/, /어디서/, /어딨/],

    usage: [/어떻게.*사용/, /사용.*방법/, /사용법/, /쓰는.*방법/, /방법.*알려/, /블록.*설명/],

    whatIs: [/뭐야/, /무엇/, /뭔가요/, /이란/, /설명/],
  };

  for (const [category, patterns] of Object.entries(simplePatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        console.log(`📦 Simple 패턴 감지: ${category}`);
        return {
          type: category === "location" || category === "usage" ? category : "simple",
          subtype: category,
          confidence: 0.85,
          method: "pattern",
        };
      }
    }
  }

  // 3. 복잡한 프로젝트/게임 체크 (ComplexHandler)
  const complexKeywords = ["게임", "만들", "프로젝트", "프로그램", "제작", "구현", "개발", "시스템"];

  if (complexKeywords.some((keyword) => lower.includes(keyword))) {
    // 디버깅 키워드와 함께 있으면 디버깅으로 분류
    if (lower.includes("안") || lower.includes("오류") || lower.includes("문제")) {
      return {
        type: "debug",
        subtype: "complex",
        confidence: 0.8,
        method: "keyword",
      };
    }

    return {
      type: "complex",
      confidence: 0.8,
      method: "keyword",
    };
  }

  // 4. 특정 블록 이름 언급 체크
  const blockNamePatterns = [
    /스페이스.*키/,
    /반복.*블록/,
    /조건.*블록/,
    /변수.*블록/,
    /이동.*블록/,
    /신호.*보내/,
    /신호.*받/,
    /복제.*생성/,
    /복제.*삭제/,
  ];

  for (const pattern of blockNamePatterns) {
    if (pattern.test(lower)) {
      // "안"이 포함되면 디버그, 아니면 simple
      if (lower.includes("안") || lower.includes("않") || lower.includes("못")) {
        return {
          type: "debug",
          subtype: "block-specific",
          confidence: 0.85,
          method: "block-name",
        };
      }

      return {
        type: "simple",
        subtype: "block-specific",
        confidence: 0.8,
        method: "block-name",
      };
    }
  }

  // 5. 기본값 (애매한 경우)
  // 짧은 질문은 simple, 긴 질문은 complex
  if (message.length < 20) {
    return {
      type: "simple",
      confidence: 0.6,
      method: "default-short",
    };
  } else {
    return {
      type: "simple", // 안전하게 simple로
      confidence: 0.5,
      method: "default-long",
    };
  }
}

/**
 * 분류 테스트 (개발용)
 */
function testClassification() {
  const testCases = [
    // 디버그로 분류되어야 함
    "스페이스키가 한 번만 작동해요",
    "변수가 다른 스프라이트에서 안 보여요",
    "신호를 보냈는데 받지를 못해요",
    "충돌이 감지가 안 돼요",
    "캐릭터가 안 움직여요",

    // Simple로 분류되어야 함
    "반복 블록 어디 있어요?",
    "변수 블록 사용법 알려주세요",
    "이동 블록 위치가 어디에요?",
    "신호 보내기 블록 설명해주세요",

    // Complex로 분류되어야 함
    "슈팅 게임 만들고 싶어요",
    "미로 게임 어떻게 만들어요?",
    "점프 게임 제작 방법",
  ];

  testCases.forEach(async (testCase) => {
    const result = await classifyUserIntent(testCase);
    console.log(`"${testCase}"`);
    console.log(`  → ${result.type} (${result.confidence})`);
  });
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
// background.js의 getKnownBlockFiles 함수 업데이트

function getKnownBlockFiles(category) {
  const fileMap = {
    start: [
      "when_run_button_click.json",
      "when_some_key_pressed.json",
      "mouse_clicked.json",
      "mouse_click_cancled.json",
      "when_object_click.json",
      "when_object_click_canceled.json",
      "when_message_cast.json",
      "message_cast.json",
      "message_cast_wait.json",
      "when_scene_start.json",
      "start_scene.json",
      "start_neighbor_scene.json",
    ],

    moving: [
      "move_direction.json",
      "bounce_wall.json",
      "move_x.json",
      "move_y.json",
      "move_xy_time.json",
      "locate_x.json",
      "locate_y.json",
      "locate_xy.json",
      "locate_xy_time.json",
      "locate.json",
      "locate_object_time.json",
      "rotate_relative.json",
      "direction_relative.json",
      "rotate_by_time.json",
      "direction_relative_duration.json",
      "rotate_absolute.json",
      "direction_absolute.json",
      "see_angle_object.json",
      "move_to_angle.json",
    ],

    looks: [
      "show.json",
      "hide.json",
      "dialog_time.json",
      "dialog.json",
      "remove_dialog.json",
      "change_to_some_shape.json",
      "change_to_next_shape.json",
      "add_effect_amount.json",
      "change_effect_amount.json",
      "erase_all_effects.json",
      "change_scale_size.json",
      "set_scale_size.json",
      "stretch_scale_size.json",
      "reset_scale_size.json",
      "flip_x.json",
      "flip_y.json",
      "change_object_index.json",
    ],

    sound: [
      "sound_something_with_block.json",
      "sound_something_second_with_block.json",
      "sound_from_to.json",
      "sound_something_wait_with_block.json",
      "sound_something_second_wait_with_block.json",
      "sound_from_to_and_wait.json",
      "sound_volume_change.json",
      "sound_volume_set.json",
      "get_sound_speed.json",
      "sound_speed_change.json",
      "sound_speed_set.json",
      "sound_silent_all.json",
      "play_bgm.json",
      "stop_bgm.json",
      "get_sound_volume.json",
      "get_sound_duration.json",
    ],

    judgement: [
      "is_clicked.json",
      "is_object_clicked.json",
      "is_press_some_key.json",
      "reach_something.json",
      "is_type.json",
      "boolean_basic_operator.json",
      "boolean_and_or.json",
      "boolean_not.json",
    ],

    flow: [
      "wait_second.json",
      "repeat_basic.json",
      "repeat_inf.json",
      "repeat_while_true.json",
      "stop_repeat.json",
      "continue_repeat.json",
      "_if.json",
      "if_else.json",
      "wait_until_true.json",
      "stop_object.json",
      "when_clone_start.json",
      "create_clone.json",
      "delete_clone.json",
      "remove_all_clones.json",
    ],

    variable: ["set_variable.json", "get_variable.json", "change_variable.json", "ask_and_wait.json"],

    func: [
      "function_create.json",
      "function_general.json",
      "function_value.json",
      "function_field_label.json",
      "function_field_string.json",
      "function_field_boolean.json",
      "function_param_string.json",
      "function_param_boolean.json",
      "set_func_variable.json",
      "get_func_variable.json",
    ],

    calc: [
      "calc_basic.json",
      "calc_rand.json",
      "coordinate_mouse.json",
      "coordinate_object.json",
      "quotient_and_mod.json",
      "calc_operation.json",
      "get_project_timer_value.json",
      "choose_project_timer_action.json",
      "set_visible_project_timer.json",
      "get_date.json",
      "distance_something.json",
      "get_user_name.json",
      "get_nickname.json",
      "length_of_string.json",
      "reverse_of_string.json",
      "combine_something.json",
      "char_at.json",
      "substring.json",
      "count_match_string.json",
      "index_of_string.json",
      "replace_string.json",
      "change_string_case.json",
      "get_block_count.json",
      "change_rgb_to_hex.json",
      "change_hex_to_rgb.json",
      "get_boolean_value.json",
    ],

    brush: [
      "brush_stamp.json",
      "start_drawing.json",
      "stop_drawing.json",
      "start_fill.json",
      "stop_fill.json",
      "set_color.json",
      "set_random_color.json",
      "set_fill_color.json",
      "change_thickness.json",
      "set_thickness.json",
      "change_brush_transparency.json",
      "set_brush_tranparency.json",
      "brush_erase_all.json",
    ],
  };

  return fileMap[category] || [];
}

// AI 추천 블록 ID를 실제 Entry 블록 ID로 매핑
const aiToEntryMapping = {
  // AI가 추천할 가능성이 있는 이름들
  play_sound: "sound_something_with_block",
  play_bgm: "play_bgm",
  move_direction: "move_direction",
  when_key_pressed: "when_some_key_pressed",
  when_some_key_pressed: "when_some_key_pressed",
  repeat: "repeat_basic",
  repeat_forever: "repeat_inf",
  if: "_if",
  if_else: "if_else",
  set_variable: "set_variable",
  get_variable: "get_variable",
  change_variable: "change_variable",
  // 필요에 따라 추가
};

// ===== Chrome Extension 메시지 처리 =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    // background.js - 메시지 핸들러에 추가

    case "searchBlocks":
      (async () => {
        try {
          const blocks = await searchEntryBlocks(request.query, request.topK || 5);
          sendResponse({
            success: true,
            blocks: blocks,
          });
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message,
          });
        }
      })();
      return true;

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

    // background.js - chrome.runtime.onMessage.addListener 부분에 추가

    case "generateCustomCoT":
      (async () => {
        try {
          console.log("📝 generateCustomCoT 요청 받음:", request.session);

          const complexHandler = new ComplexHandler();
          const cotResult = await complexHandler.generateCustomCoT(request.session);

          console.log("📦 generateCustomCoT 결과:", cotResult);

          // cotResult와 steps 검증
          if (!cotResult || !cotResult.steps || cotResult.steps.length === 0) {
            console.error("❌ CoT 결과가 유효하지 않음");
            sendResponse({
              success: false,
              error: "단계 생성 실패",
              response: "게임 가이드를 생성할 수 없습니다.",
            });
            return;
          }

          // formatInitialResponse 호출
          let initialResponse;
          try {
            initialResponse = complexHandler.formatInitialResponse(cotResult.steps, cotResult.totalSteps);
          } catch (formatError) {
            console.error("❌ formatInitialResponse 오류:", formatError);
            initialResponse = "가이드를 준비 중입니다...";
          }

          sendResponse({
            success: true,
            cotSequence: cotResult,
            response: initialResponse,
          });
        } catch (error) {
          console.error("❌ CoT 생성 오류:", error);
          sendResponse({
            success: false,
            error: error.message,
            response: "오류가 발생했습니다. 다시 시도해주세요.",
          });
        }
      })();
      return true; // 비동기 응답을 위해 true 반환

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

    // 여기에 새 case 추가! ↓↓↓
    case "analyzeCoTAddition":
      handleCoTAdditionAnalysis(request)
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          sendResponse({
            success: false,
            error: error.message,
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
