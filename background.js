// Entry Block Helper - Background Service Worker (수정된 RAG 시스템)

// ===== RAG 테스트 설정 =====
let USE_RAG = true;

// ===== Entry 블록 데이터 로드 및 캐싱 =====
let entryBlockData = null;
let dataLoadPromise = null;

// ===== questionClassifier.js 로드 =====
importScripts("questionClassifier.js");
let questionClassifier = new EntryQuestionClassifier();

// ===== API 키 설정 =====
const OPENAI_API_KEY = "";

// ===== 블록 검색 가중치 테이블 =====
const SEARCH_WEIGHTS = {
  name_exact: 10, // 블록명 정확 매칭
  name_partial: 5, // 블록명 부분 매칭
  description: 3, // 설명 매칭
  category: 2, // 카테고리 매칭
  keywords: 4, // 키워드 매칭
  usage_examples: 2, // 사용예시 매칭
};

// ===== 질문 분류 함수 =====
function classifyQuestion(message) {
  if (!questionClassifier) {
    questionClassifier = new EntryQuestionClassifier();
  }

  const result = questionClassifier.classify(message);
  console.log("🎯 질문 분류: " + result.type + " (신뢰도: " + (result.confidence * 100).toFixed(1) + "%)");
  return result;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("📊 질문 분류기 초기화 완료");
  console.log("Entry Block Helper 설치 완료 - RAG 시스템 초기화 중...");
  chrome.storage.sync.set({
    enabled: true,
    autoAnalysis: true,
    sidebarMode: "auto",
    openai_api_key: "",
    useDevKey: false,
    rag_enabled: true,
  });

  USE_RAG = true;
  loadEntryBlockData();
});

// ===== 블록 데이터 로드 함수 =====
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
      console.log(`📚 Entry 블록 데이터 로드 완료: ${allBlocks.length}개 블록`);
      return allBlocks;
    } catch (error) {
      console.error("Entry 데이터 로드 실패:", error);
      entryBlockData = [];
      return [];
    }
  })();

  return dataLoadPromise;
}

// ===== 카테고리 한국어 변환 =====
function getCategoryKorean(category) {
  const categoryMap = {
    start: "시작",
    moving: "움직임",
    looks: "생김새",
    sound: "소리",
    judgement: "판단",
    repeat: "반복",
    variable: "자료",
    func: "함수",
    calc: "계산",
    brush: "붓",
    flow: "흐름",
  };

  return categoryMap[category] || category;
}

function getKnownBlockFiles(category) {
  const fileMap = {
    brush: [
      "brush_erase_all.json",
      "brush_stamp.json",
      "change_brush_transparency.json",
      "change_thickness.json",
      "set_brush_transparency.json",
      "set_color.json",
      "set_fill_color.json",
      "set_random_color.json",
      "set_thickness.json",
      "start_drawing.json",
      "start_fill.json",
      "stop_drawing.json",
      "stop_fill.json",
    ],
    calc: [
      "calc_basic.json",
      "calc_operation.json",
      "calc_rand.json",
      "change_hex_to_rgb.json",
      "change_rgb_to_hex.json",
      "change_string_case.json",
      "char_at.json",
      "choose_project_timer_action.json",
      "combine_something.json",
      "coordinate_mouse.json",
      "coordinate_object.json",
      "count_match_string.json",
      "distance_something.json",
      "get_block_count.json",
      "get_boolean_value.json",
      "get_date.json",
      "get_nickname.json",
      "get_project_timer_value.json",
      "get_user_name.json",
      "index_of_string.json",
      "length_of_string.json",
      "quotient_and_mod.json",
      "replace_string.json",
      "reverse_of_string.json",
      "set_visible_project_timer.json",
      "substring.json",
    ],
    flow: [
      "_if.json",
      "continue_repeat.json",
      "create_clone.json",
      "delete_clone.json",
      "if_else.json",
      "remove_all_clones.json",
      "repeat_basic.json",
      "repeat_inf.json",
      "repeat_while_true.json",
      "restart_project.json",
      "stop_object.json",
      "stop_repeat.json",
      "wait_second.json",
      "wait_until_true.json",
      "when_clone_start.json",
    ],
    func: [
      "function_create.json",
      "function_field_boolean.json",
      "function_field_label.json",
      "function_field_string.json",
      "function_general.json",
      "function_param_boolean.json",
      "function_param_string.json",
      "function_value.json",
      "get_func_variable.json",
      "set_func_variable.json",
      "showFunctionPropsButton.json",
    ],
    judgement: [
      "boolean_and_or.json",
      "boolean_basic_operator.json",
      "boolean_not.json",
      "is_clicked.json",
      "is_object_clicked.json",
      "is_press_some_key.json",
      "is_type.json",
      "reach_something.json",
    ],
    looks: [
      "add_effect_amount.json",
      "change_effect_amount.json",
      "change_object_index.json",
      "change_scale_size.json",
      "change_to_next_shape.json",
      "change_to_some_shape.json",
      "dialog.json",
      "dialog_time.json",
      "erase_all_effects.json",
      "flip_x.json",
      "flip_y.json",
      "hide.json",
      "remove_dialog.json",
      "reset_scale_size.json",
      "set_scale_size.json",
      "show.json",
      "stretch_scale_size.json",
    ],
    moving: [
      "bounce_wall.json",
      "direction_absolute.json",
      "direction_relative.json",
      "direction_relative_duration.json",
      "locate.json",
      "locate_object_time.json",
      "locate_x.json",
      "locate_xy.json",
      "locate_xy_time.json",
      "locate_y.json",
      "move_direction.json",
      "move_to_angle.json",
      "move_x.json",
      "move_xy_time.json",
      "move_y.json",
      "rotate_absolute.json",
      "rotate_by_time.json",
      "rotate_relative.json",
      "see_angle_object.json",
    ],
    sound: [
      "get_sound_duration.json",
      "get_sound_speed.json",
      "get_sound_volume.json",
      "play_bgm.json",
      "sound_from_to.json",
      "sound_from_to_and_wait.json",
      "sound_silent_all.json",
      "sound_something_second_wait_with_block.json",
      "sound_something_second_with_block.json",
      "sound_something_wait_with_block.json",
      "sound_something_with_block.json",
      "sound_speed_change.json",
      "sound_speed_set.json",
      "sound_volume_change.json",
      "sound_volume_set.json",
      "stop_bgm.json",
    ],
    start: [
      "message_cast.json",
      "message_cast_wait.json",
      "mouse_click_cancled.json",
      "mouse_clicked.json",
      "start_neighbor_scene.json", // 다음 장면으로 가기 블록
      "start_scene.json",
      "when_message_cast.json",
      "when_object_click.json",
      "when_object_click_canceled.json",
      "when_run_button_click.json",
      "when_scene_start.json",
      "when_some_key_pressed.json",
    ],
    variable: [
      "add_value_to_list.json",
      "ask_and_wait.json",
      "change_variable.json",
      "change_value_list_index.json",
      "get_canvas_input_value.json",
      "get_variable.json",
      "hide_list.json",
      "hide_variable.json",
      "insert_value_to_list.json",
      "is_included_in_list.json",
      "length_of_list.json",
      "listAddButton.json",
      "remove_value_from_list.json",
      "set_variable.json",
      "set_visible_answer.json",
      "show_list.json",
      "show_variable.json",
      "value_of_index_from_list.json",
      "variableAddButton.json",
    ],
  };

  return fileMap[category] || [];
}

// ===== 진짜 RAG 검색 함수 (실제 블록 데이터 활용) =====
async function searchEntryBlocks(userMessage, topK = 3) {
  const blockData = await loadEntryBlockData();

  if (!blockData || blockData.length === 0) {
    console.log("🔍 RAG: 블록 데이터 없음");
    return [];
  }

  const messageWords = userMessage
    .toLowerCase()
    .replace(/[^\w\sㄱ-ㅎ가-힣]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1);

  console.log("🔍 RAG 검색 키워드:", messageWords);
  console.log("📚 총 블록 데이터:", blockData.length, "개");

  const scored = blockData.map((block) => {
    let score = 0;

    // 실제 블록 데이터에서 검색 가능한 필드들
    const blockName = (block.name || block.fileName || "").toLowerCase();
    const blockDescription = (block.description || "").toLowerCase();
    const blockKeywords = JSON.stringify(block.keywords || []).toLowerCase();
    const blockUsageExamples = JSON.stringify(block.usage_examples || []).toLowerCase();
    const categoryName = getCategoryKorean(block.category).toLowerCase();

    // 각 검색어에 대해 가중치 적용 점수 계산
    for (const word of messageWords) {
      // 블록명 정확 매칭 (최고 점수)
      if (blockName === word || blockName.includes(word)) {
        score += SEARCH_WEIGHTS.name_exact;
      }

      // 블록명 부분 매칭
      if (blockName.includes(word.substring(0, 3))) {
        score += SEARCH_WEIGHTS.name_partial;
      }

      // 설명 매칭
      if (blockDescription.includes(word)) {
        score += SEARCH_WEIGHTS.description;
      }

      // 카테고리 매칭
      if (categoryName.includes(word)) {
        score += SEARCH_WEIGHTS.category;
      }

      // 키워드 매칭
      if (blockKeywords.includes(word)) {
        score += SEARCH_WEIGHTS.keywords;
      }

      // 사용 예시 매칭
      if (blockUsageExamples.includes(word)) {
        score += SEARCH_WEIGHTS.usage_examples;
      }
    }

    // 특별한 패턴 매칭 (동적으로 처리)
    const specialPatterns = [
      { pattern: /다음.*장면/, category: "start", boost: 5 },
      { pattern: /이전.*장면/, category: "start", boost: 5 },
      { pattern: /만약.*라면/, category: "judgement", boost: 4 },
      { pattern: /반복.*하기/, category: "flow", boost: 4 },
      { pattern: /변수.*정하기/, category: "variable", boost: 4 },
      { pattern: /스페이스.*키/, category: "start", boost: 3 },
    ];

    for (const { pattern, category, boost } of specialPatterns) {
      if (pattern.test(userMessage) && block.category === category) {
        score += boost;
      }
    }

    return { block, score };
  });

  console.log(`📊 RAG 점수 계산 완료: 최고점 ${Math.max(...scored.map((s) => s.score))}점`);

  const results = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => {
      // 검색 결과에 점수와 매칭 이유 포함
      return {
        ...item.block,
        _searchScore: item.score,
        _matchedBy: item.score > 5 ? "강한 매칭" : "일반 매칭",
      };
    });

  console.log(`🔍 RAG 검색 결과: ${results.length}개 블록`);
  if (results.length > 0) {
    console.log(
      "📋 검색된 블록들:",
      results.map((b) => ({
        name: b.name || b.fileName,
        category: getCategoryKorean(b.category),
        score: b._searchScore,
        matchedBy: b._matchedBy,
      }))
    );
  } else {
    console.log("❌ RAG 검색 실패: 매칭되는 블록 없음");
    console.log(
      "🔍 첫 번째 블록 샘플:",
      blockData[0]
        ? {
            name: blockData[0].name,
            fileName: blockData[0].fileName,
            category: blockData[0].category,
          }
        : "블록 데이터 없음"
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
        max_tokens: 200,
        temperature: 0.5,
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

// ===== 교육적 AI 응답 생성 (정확성 개선) =====
async function generateEducationalResponse(userMessage, mode, projectContext, conversationHistory = []) {
  try {
    const settings = await chrome.storage.sync.get(["openai_api_key"]);
    const apiKey = settings.openai_api_key;

    if (!apiKey || apiKey.trim() === "") {
      console.log("API 키가 설정되지 않음");
      return "API 키를 설정해주세요. 확장 프로그램 아이콘 → 설정에서 OpenAI API 키를 입력하세요.";
    }

    // 질문 분류 추가
    const classification = classifyQuestion(userMessage);
    const messageCount = conversationHistory.length;
    const conversationCount = Math.floor(messageCount / 2);

    const needsHelp =
      userMessage.includes("모르겠") ||
      userMessage.includes("막혔") ||
      userMessage.includes("도와") ||
      userMessage.includes("안 돼") ||
      userMessage.includes("안 됨") ||
      userMessage.includes("어려워");

    const attemptCount = conversationHistory.filter(
      (msg) => msg.role === "user" && (msg.content.includes("모르겠") || msg.content.includes("막혔"))
    ).length;

    let systemPrompt = `당신은 Entry(엔트리) 블록코딩 교육 전문 튜터입니다.

교육 원칙:
- 2-3문장으로 간결하게 응답
- 소크라테스식 단계적 질문으로 학습 유도
- 현재 ${conversationCount + 1}번째 대화입니다
- 학생이 ${attemptCount}번 도움 요청함

질문 유형: ${classification.type} (신뢰도: ${(classification.confidence * 100).toFixed(1)}%)
현재 상황: ${projectContext || "프로젝트 정보 없음"}
선택된 모드: ${getModeDescription(mode)}`;

    // 타입별 특별 지시사항
    switch (classification.type) {
      case "simple":
        systemPrompt += "\n간단한 블록 사용법 설명에 집중하세요.";
        break;
      case "complex":
        systemPrompt += "\n프로젝트를 단계별로 나누어 설명하세요.";
        break;
      case "debug":
        systemPrompt += "\n문제 원인 파악을 돕는 질문부터 시작하세요.";
        break;
      case "conceptual":
        systemPrompt += "\n개념을 쉬운 예시로 설명하세요.";
        break;
    }

    // RAG 검색 수행
    if (USE_RAG) {
      const relevantBlocks = await searchEntryBlocks(userMessage);

      if (relevantBlocks.length > 0) {
        const contextInfo = relevantBlocks
          .map((block) => {
            let info = `• ${getCategoryKorean(block.category)} 분류: ${block.name || block.fileName}`;
            if (block.description) info += ` - ${block.description}`;
            return info;
          })
          .join("\n");

        // 정확한 답변을 위한 컨텍스트 강화 (실제 RAG 결과 활용)
        if (relevantBlocks.length > 0) {
          const topBlock = relevantBlocks[0]; // 가장 관련성 높은 블록

          systemPrompt += `

=== RAG 검색 결과 기반 정보 ===
최고 점수 블록: ${topBlock.name || topBlock.fileName} (카테고리: ${getCategoryKorean(topBlock.category)})
검색 점수: ${topBlock._searchScore || 0}점

관련 블록들:
${relevantBlocks
  .slice(0, 3)
  .map((block, index) => `${index + 1}. ${block.name || block.fileName} - ${getCategoryKorean(block.category)} 카테고리`)
  .join("\n")}

**중요**: 위 검색 결과에 기반하여 정확한 정보만 제공하세요.`;
          // 단계별 힌트 제공 전략 (실제 RAG 데이터 활용)
          if (attemptCount === 0 && !needsHelp) {
            systemPrompt += `

**1단계 힌트 (개념 수준):**
- 구체적인 블록명이나 카테고리는 언급하지 마세요
- 일반적인 프로그래밍 개념으로만 설명
- "~하는 기능이 필요할 것 같은데, 어떤 방법이 있을까요?" 형태의 유도 질문`;
          } else if (attemptCount === 1 || (attemptCount === 0 && needsHelp)) {
            systemPrompt += `

**2단계 힌트 (카테고리 수준):**
- 이제 카테고리는 언급 가능: "${getCategoryKorean(topBlock.category)} 카테고리"
- 하지만 구체적인 블록명은 아직 비밀
- "~카테고리에서 찾아보세요" 형태로 안내`;
          } else {
            systemPrompt += `

**3단계 힌트 (구체적 안내):**
- 이제 정확한 블록명 제공: "${topBlock.name || topBlock.fileName}"
- 위치와 사용법까지 상세 안내
- 검색된 최고 점수 블록을 우선적으로 추천`;
          }
        }

        console.log(`🧠 RAG 모드: ${attemptCount + 1}단계 힌트 제공`);
      }
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-4),
      { role: "user", content: userMessage },
    ];

    const response = await callOpenAI(messages, apiKey);

    // 응답 길이 제한 (3문장 이내)
    const sentences = response.split(/[.!?]\s+/);
    let finalResponse = response;
    if (sentences.length > 3) {
      finalResponse = sentences.slice(0, 3).join(". ") + ".";
    }

    // 사용량 로깅
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

  if (errorMessage.includes("API 키")) {
    return `${randomResponse}\n\n⚠️ ${errorMessage}\n\n확장 프로그램 아이콘을 클릭하여 API 키를 설정해주세요.`;
  }

  return `${randomResponse}\n\n(연결 상태가 불안정해서 간단한 응답을 드렸어요. 다시 시도해주세요!)`;
}

// ===== 메인 AI 요청 처리 함수 =====
async function handleAIRequest(request) {
  const { message, mode, projectContext, conversationHistory = [] } = request;

  console.log("🚀 AI 요청 처리 시작:", { message, mode });

  try {
    // 1. 질문 분류 (비동기 처리)
    const classification = await classifyQuestion(message);
    console.log("📊 분류 결과:", classification);

    // 2. API 키 확인
    const settings = await chrome.storage.sync.get(["openai_api_key"]);
    if (!settings.openai_api_key?.trim()) {
      throw new Error("API 키가 설정되지 않았습니다");
    }

    // 3. 분류에 따른 응답 생성
    let response;
    let blockSequence = null;
    let relevantBlocks = [];

    // RAG 검색 (모든 타입에 적용)
    if (USE_RAG) {
      console.log("🧠 RAG 검색 시작...");
      relevantBlocks = await searchEntryBlocks(message, 5);
      console.log(`🎯 RAG 검색 완료: ${relevantBlocks.length}개 블록 발견`);

      if (relevantBlocks.length === 0) {
        console.log("⚠️ RAG 검색 실패: 관련 블록을 찾지 못했습니다");
        console.log("🔍 검색어:", message);
      }
    }

    // 분류별 처리
    switch (classification.type) {
      case "simple":
        response = await generateSimpleResponse(
          message,
          projectContext,
          conversationHistory,
          relevantBlocks,
          settings.openai_api_key
        );
        break;

      case "complex":
        const cotResult = await generateCoTResponse(
          message,
          projectContext,
          conversationHistory,
          relevantBlocks,
          settings.openai_api_key
        );
        response = cotResult.response;
        blockSequence = cotResult.sequence;
        break;

      case "debug":
        response = await generateDebugResponse(
          message,
          projectContext,
          conversationHistory,
          relevantBlocks,
          settings.openai_api_key
        );
        break;

      case "conceptual":
        response = await generateConceptualResponse(
          message,
          projectContext,
          conversationHistory,
          relevantBlocks,
          settings.openai_api_key
        );
        break;

      default:
        // 기본값: 교육적 응답
        response = await generateEducationalResponse(message, mode, projectContext, conversationHistory);
    }

    // 4. 사용량 통계 기록
    await logUsageStats(message.length, response.length, classification.type, USE_RAG);

    // 5. 응답 반환
    return {
      success: true,
      response: response,
      blockSequence: blockSequence,
      rawBlocks: relevantBlocks,
      classification: classification,
      ragUsed: USE_RAG && relevantBlocks.length > 0,
    };
  } catch (error) {
    console.error("❌ AI 요청 처리 실패:", error);
    return {
      success: false,
      response: getFallbackResponse(error.message),
      rawBlocks: [],
      blockSequence: null,
      classification: null,
    };
  }
}

// ===== 응답 전략 결정 함수 =====
function determineResponseStrategy(type) {
  const strategies = {
    simple: {
      name: "직접 답변",
      useCoT: false,
      maxSteps: 1,
      description: "즉시 답변 제공",
    },
    complex: {
      name: "Chain of Thought",
      useCoT: true,
      maxSteps: 5,
      description: "단계별 사고 과정",
    },
    debug: {
      name: "문제 해결 프로세스",
      useCoT: true,
      maxSteps: 4,
      description: "원인 분석 → 해결책",
    },
    conceptual: {
      name: "개념 설명",
      useCoT: false,
      maxSteps: 2,
      description: "정의 → 예시",
    },
  };

  return strategies[type] || strategies.simple;
}

// ===== 개선된 Simple Response 생성 =====
async function generateSimpleResponse(message, projectContext, conversationHistory, relevantBlocks, apiKey) {
  let systemPrompt = `당신은 Entry 블록코딩 도우미입니다.
질문에 대해 즉시 사용할 수 있는 간단명료한 답변을 제공하세요.

지침:
- 1-2문장으로 직접적인 답변
- 구체적인 블록명과 위치 제시
- 불필요한 설명 없이 핵심만`;

  // RAG 컨텍스트 추가
  if (relevantBlocks && relevantBlocks.length > 0) {
    const blockContext = relevantBlocks
      .map((block) => `• ${block.name || block.fileName}: ${block.description || ""}`)
      .join("\n");

    systemPrompt += `\n\n관련 블록 정보:\n${blockContext}`;
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ];

  return await callOpenAI(messages, apiKey);
}

// ===== CoT 단계 파싱 함수 =====
function parseCoTSteps(response) {
  const steps = [];
  const lines = response.split("\n");
  let currentStep = null;

  for (const line of lines) {
    const stepMatch = line.match(/^(\d+단계)[:：]\s*(.+)/);
    if (stepMatch) {
      if (currentStep) {
        steps.push(currentStep);
      }
      currentStep = {
        stepNumber: steps.length + 1,
        title: stepMatch[2].trim(),
        content: "",
        completed: false,
      };
    } else if (currentStep && line.trim()) {
      currentStep.content += line + "\n";
    }
  }

  if (currentStep) {
    steps.push(currentStep);
  }

  // 단계가 파싱되지 않으면 전체를 하나의 단계로
  if (steps.length === 0) {
    steps.push({
      stepNumber: 1,
      title: "전체 설명",
      content: response,
      completed: false,
    });
  }

  return steps;
}

// ===== 개선된 CoT Response 생성 =====
async function generateCoTResponse(message, projectContext, conversationHistory, relevantBlocks, apiKey) {
  let systemPrompt = `당신은 Entry 블록코딩 전문가입니다.
복잡한 프로젝트를 단계별로 나누어 설명하세요.

형식:
1단계: [기본 구조 설정] - 구체적 설명
2단계: [핵심 기능 구현] - 구체적 설명
3단계: [세부 기능 추가] - 구체적 설명
4단계: [테스트 및 개선] - 구체적 설명

각 단계마다:
- 목표 명시
- 필요한 블록들 나열
- 구현 방법 설명
- 주의사항 언급`;

  // RAG 컨텍스트 추가
  if (relevantBlocks && relevantBlocks.length > 0) {
    systemPrompt += `\n\n사용 가능한 블록들:\n`;
    relevantBlocks.forEach((block) => {
      systemPrompt += `- ${block.name}: ${getCategoryKorean(block.category)} 카테고리\n`;
    });
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `프로젝트: ${message}\n컨텍스트: ${projectContext}` },
  ];

  const response = await callOpenAI(messages, apiKey);

  // CoT 응답 파싱
  const steps = parseCoTSteps(response);

  return {
    response: response,
    sequence: {
      type: "cot",
      steps: steps,
      currentStep: 1,
      totalSteps: steps.length,
    },
  };
}

// ===== Debug Response (문제 해결) =====
async function generateDebugResponse(message, projectContext, conversationHistory) {
  const settings = await chrome.storage.sync.get(["openai_api_key"]);
  const apiKey = settings.openai_api_key;

  const systemPrompt = `당신은 Entry 디버깅 전문가입니다.
문제를 체계적으로 분석하고 해결책을 제시하세요.

디버깅 프로세스:
1. 증상 파악: 어떤 문제인지 명확히
2. 원인 분석: 가능한 원인들 나열
3. 해결 방법: 구체적인 수정 방법
4. 확인 사항: 테스트 방법

간결하면서도 실용적인 조언 제공`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `문제: ${message}\n컨텍스트: ${projectContext}` },
  ];

  return await callOpenAI(messages, apiKey);
}

// ===== Conceptual Response (개념 설명) =====
async function generateConceptualResponse(message, projectContext, conversationHistory) {
  const settings = await chrome.storage.sync.get(["openai_api_key"]);
  const apiKey = settings.openai_api_key;

  const systemPrompt = `당신은 프로그래밍 교육 전문가입니다.
초등학생도 이해할 수 있게 개념을 설명하세요.

설명 구조:
1. 정의: 쉬운 말로 설명
2. 비유: 일상생활 예시
3. Entry 예제: 실제 블록 사용 예

복잡한 용어 피하고 친근하게 설명`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ];

  return await callOpenAI(messages, apiKey);
}

// ===== CoT 응답 파싱 =====
function parseCoTResponse(response) {
  const steps = [];
  const stepPattern = /(\d+단계:|Step \d+:|^\d+\.)/gm;
  const parts = response.split(stepPattern).filter((part) => part.trim());

  for (let i = 0; i < parts.length; i += 2) {
    if (i + 1 < parts.length) {
      steps.push({
        stepNumber: steps.length + 1,
        title: `단계 ${steps.length + 1}`,
        content: parts[i + 1].trim(),
        completed: false,
      });
    }
  }

  // 단계가 파싱되지 않으면 전체를 하나의 단계로
  if (steps.length === 0) {
    steps.push({
      stepNumber: 1,
      title: "전체 설명",
      content: response,
      completed: false,
    });
  }

  return steps;
}

// ===== 통계 수집 개선 =====
async function logResponseStats(classification, strategy, responseTime) {
  const stats = await chrome.storage.local.get(["response_stats"]);
  const currentStats = stats.response_stats || {
    byType: {},
    avgResponseTime: {},
    cotUsage: 0,
    simpleUsage: 0,
  };

  // 타입별 통계
  currentStats.byType[classification.type] = (currentStats.byType[classification.type] || 0) + 1;

  // CoT vs Simple 통계
  if (strategy.useCoT) {
    currentStats.cotUsage++;
  } else {
    currentStats.simpleUsage++;
  }

  // 응답 시간
  if (!currentStats.avgResponseTime[classification.type]) {
    currentStats.avgResponseTime[classification.type] = [];
  }
  currentStats.avgResponseTime[classification.type].push(responseTime);

  await chrome.storage.local.set({ response_stats: currentStats });
}

// ===== 사용량 통계 =====
async function logUsageStats(messageLength, responseLength, mode, ragUsed) {
  const today = new Date().toISOString().split("T")[0];
  const stats = await chrome.storage.local.get([`stats_${today}`]);

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

  if (ragUsed) {
    todayStats.ragUsage.withRAG++;
    todayStats.ragUsage.ragSearches++;
  } else {
    todayStats.ragUsage.withoutRAG++;
  }

  await chrome.storage.local.set({
    [`stats_${today}`]: todayStats,
  });

  console.log(`📊 사용량 기록: RAG ${ragUsed ? "ON" : "OFF"}, 모드: ${mode}`);
}

async function logResponseMetrics(classification, responseTime, success) {
  const metrics = await chrome.storage.local.get(["metrics"]);
  const current = metrics.metrics || {
    byType: {},
    totalRequests: 0,
    successRate: 0,
  };

  if (!current.byType[classification.type]) {
    current.byType[classification.type] = {
      count: 0,
      avgResponseTime: 0,
      successCount: 0,
    };
  }

  const typeMetrics = current.byType[classification.type];
  typeMetrics.count++;
  if (success) typeMetrics.successCount++;
  typeMetrics.avgResponseTime = (typeMetrics.avgResponseTime * (typeMetrics.count - 1) + responseTime) / typeMetrics.count;

  current.totalRequests++;

  await chrome.storage.local.set({ metrics: current });
}

// ===== Content Script와 메시지 통신 =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateAIResponse") {
    // 비동기 처리를 위해 Promise 사용
    handleAIRequest(request)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({
          success: false,
          response: getFallbackResponse(error.message),
          error: error.message,
        });
      });
    return true; // 비동기 응답을 위해 필수
  }

  switch (request.action) {
    case "getSettings":
      chrome.storage.sync.get(["enabled", "autoAnalysis", "sidebarMode", "openai_api_key", "rag_enabled"], (data) => {
        sendResponse({
          ...data,
          hasApiKey: !!data.openai_api_key,
          ragEnabled: data.rag_enabled !== false,
          openai_api_key: undefined,
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
          console.log(`🔄 RAG 토글: ${USE_RAG ? "ON" : "OFF"}`);
          sendResponse({ success: true, ragEnabled: newState });
        });
      });
      return true;

    case "generateAIResponse":
      handleAIRequest(request)
        .then((result) => {
          sendResponse({
            success: true,
            response: result.response,
            blockSequence: result.blockSequence,
            rawBlocks: result.rawBlocks,
          });
        })
        .catch((error) => {
          sendResponse({
            success: false,
            error: error.message,
          });
        });
      return true;

    case "openSettings":
      chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
      sendResponse({ success: true });
      return true;

    default:
      break;
  }
});

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
