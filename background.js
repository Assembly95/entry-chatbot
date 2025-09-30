// Entry Block Helper - Background Service Worker (개선된 RAG 시스템)

// ===== RAG 설정 =====
let USE_RAG = true;

// ===== Entry 블록 데이터 로드 및 캐싱 =====
let entryBlockData = null;
let dataLoadPromise = null;

// ===== questionClassifier.js 로드 =====
importScripts("questionClassifier.js");
let questionClassifier = new EntryQuestionClassifier();

// ===== API 키 설정 =====
const OPENAI_API_KEY = "";

// ===== 블록 검색 가중치 테이블 (개선) =====
const SEARCH_WEIGHTS = {
  name_exact: 15, // 블록명 정확 매칭 (증가)
  name_partial: 8, // 블록명 부분 매칭 (증가)
  description: 3, // 설명 매칭
  category: 2, // 카테고리 매칭
  keywords: 6, // 키워드 매칭 (증가)
  usage_examples: 2, // 사용예시 매칭
  pattern_match: 20, // 패턴 직접 매칭 (새로 추가)
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

// ===== 카테고리 한국어 변환 (Entry 공식 용어) =====
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
      "start_neighbor_scene.json",
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

// ===== 개선된 RAG 검색 함수 =====
async function searchEntryBlocks(userMessage, topK = 3) {
  const blockData = await loadEntryBlockData();

  if (!blockData || blockData.length === 0) {
    console.log("🔍 RAG: 블록 데이터 없음");
    return [];
  }

  // 특별 패턴 직접 매칭 (최우선)
  const directPatterns = [
    { pattern: /시작.*버튼.*클릭|시작하기.*버튼|실행.*버튼/, blockFile: "when_run_button_click", category: "start" },
    { pattern: /스페이스.*키/, blockFile: "when_some_key_pressed", category: "start" },
    { pattern: /다음.*장면/, blockFile: "start_neighbor_scene", category: "start" },
    { pattern: /만약.*라면/, blockFile: "_if", category: "flow" },
    { pattern: /반복.*하기/, blockFile: "repeat_basic", category: "flow" },
    { pattern: /변수.*정하기/, blockFile: "set_variable", category: "variable" },
  ];

  // 직접 패턴 매칭 검사
  for (const { pattern, blockFile, category } of directPatterns) {
    if (pattern.test(userMessage)) {
      const matchedBlock = blockData.find((block) => block.fileName === blockFile && block.category === category);
      if (matchedBlock) {
        console.log(`🎯 RAG 직접 매칭: ${matchedBlock.name || matchedBlock.fileName}`);
        return [
          {
            ...matchedBlock,
            _searchScore: 100,
            _matchedBy: "직접 패턴 매칭",
          },
        ];
      }
    }
  }

  // questionClassifier의 tokenizeKorean 사용
  if (!questionClassifier) {
    questionClassifier = new EntryQuestionClassifier();
  }

  const tokens = questionClassifier.tokenizeKorean(userMessage);
  console.log("🔍 RAG 검색 토큰:", tokens);

  const scored = blockData.map((block) => {
    let score = 0;

    const blockName = (block.name || block.fileName || "").toLowerCase();
    const blockDescription = (block.description || "").toLowerCase();
    const blockKeywords = JSON.stringify(block.keywords || []).toLowerCase();
    const blockUsageExamples = JSON.stringify(block.usage_examples || []).toLowerCase();
    const categoryName = getCategoryKorean(block.category).toLowerCase();

    // 정규화된 토큰으로 매칭
    for (const token of tokens) {
      // 블록명 정확 매칭
      if (blockName === token || blockName.includes(token)) {
        score += SEARCH_WEIGHTS.name_exact;
      }

      // 블록명 부분 매칭
      if (token.length >= 3 && blockName.includes(token.substring(0, 3))) {
        score += SEARCH_WEIGHTS.name_partial;
      }

      // 설명 매칭
      if (blockDescription.includes(token)) {
        score += SEARCH_WEIGHTS.description;
      }

      // 카테고리 매칭
      if (categoryName.includes(token)) {
        score += SEARCH_WEIGHTS.category;
      }

      // 키워드 매칭
      if (blockKeywords.includes(token)) {
        score += SEARCH_WEIGHTS.keywords;
      }

      // 사용 예시 매칭
      if (blockUsageExamples.includes(token)) {
        score += SEARCH_WEIGHTS.usage_examples;
      }
    }

    return { block, score };
  });

  console.log(`📊 RAG 점수 계산 완료: 최고점 ${Math.max(...scored.map((s) => s.score))}점`);

  const results = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // 최고 점수의 50% 이하는 제외
  const maxScore = results[0]?.score || 0;
  const threshold = maxScore * 0.5;

  const filteredResults = results
    .filter((item) => item.score >= threshold)
    .map((item) => ({
      ...item.block,
      _searchScore: item.score,
      _matchedBy: item.score > 8 ? "강한 매칭" : "일반 매칭",
    }));

  console.log(`🔍 RAG 결과: ${filteredResults.length}개 블록 발견`);

  if (filteredResults.length > 0) {
    console.log(
      "📋 검색된 블록:",
      filteredResults.map((b) => ({
        name: b.name || b.fileName,
        category: getCategoryKorean(b.category),
        score: b._searchScore,
      }))
    );
  }

  return filteredResults;
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
        temperature: 0.3, // 더 일관된 답변을 위해 낮춤
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

// ===== 개선된 교육적 응답 생성 =====
// ===== 개선된 교육적 응답 생성 (단계별 힌트) =====
async function generateEducationalResponse(userMessage, mode, projectContext, conversationHistory = []) {
  try {
    const settings = await chrome.storage.sync.get(["openai_api_key"]);
    const apiKey = settings.openai_api_key;

    if (!apiKey || apiKey.trim() === "") {
      return "API 키를 설정해주세요. 확장 프로그램 아이콘 → 설정에서 OpenAI API 키를 입력하세요.";
    }

    // 질문 분류
    const classification = classifyQuestion(userMessage);

    // 이전 대화에서 같은 주제로 도움 요청한 횟수 계산
    const helpAttempts = countHelpAttempts(conversationHistory, userMessage);

    console.log(`🎯 도움 요청 횟수: ${helpAttempts}`);

    let systemPrompt = `당신은 Entry 블록코딩 교육 전문 튜터입니다.
단계별로 힌트를 제공하는 소크라테스식 교육 방법을 사용합니다.`;

    // RAG 검색
    let relevantBlocks = [];
    if (USE_RAG) {
      relevantBlocks = await searchEntryBlocks(userMessage);

      if (relevantBlocks.length > 0) {
        const topBlock = relevantBlocks[0];
        const categoryKorean = getCategoryKorean(topBlock.category);
        const blockName = topBlock.name || topBlock.fileName;

        // 단계별 힌트 전략
        let hintLevel = determineHintLevel(helpAttempts, userMessage);

        systemPrompt = `당신은 Entry 블록코딩 튜터입니다.

사용자 질문: "${userMessage}"
정답 정보:
- 블록명: "${blockName}"
- 카테고리: "${categoryKorean}"
- 설명: ${topBlock.description || ""}

현재 힌트 레벨: ${hintLevel.level} (${hintLevel.description})

응답 규칙:
${hintLevel.instruction}

예시 응답:
${hintLevel.example}`;
      }
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-4),
      { role: "user", content: userMessage },
    ];

    const response = await callOpenAI(messages, apiKey);

    if (relevantBlocks.length > 0) {
      const correctCategory = getCategoryKorean(relevantBlocks[0].category);

      // "이벤트" 관련 모든 변형 제거
      const wrongPatterns = [
        /이벤트\s*카테고리/gi,
        /Event\s*카테고리/gi,
        /이벤트\s*탭/gi,
        /이벤트\s*블록/gi,
        /컨트롤\s*카테고리/gi,
      ];

      for (const pattern of wrongPatterns) {
        if (pattern.test(response)) {
          console.warn(`⚠️ AI가 잘못된 카테고리 사용: "이벤트" → "${correctCategory}"`);
          response = response.replace(pattern, `${correctCategory} 카테고리`);
        }
      }

      // 응답에 올바른 카테고리가 없으면 강제 삽입
      if (!response.includes(correctCategory)) {
        console.warn("⚠️ AI가 올바른 카테고리를 언급하지 않음. 강제 수정.");
        response = response.replace(/카테고리/g, `${correctCategory} 카테고리`);
      }
    }

    return response;
  } catch (error) {
    console.error("AI 응답 생성 실패:", error);
    return `죄송합니다. 오류가 발생했습니다: ${error.message}`;
  }
}

// ===== 도움 요청 횟수 계산 =====
// background.js의 countHelpAttempts 함수 개선
function countHelpAttempts(conversationHistory, currentMessage) {
  let count = 0;

  // 같은 주제인지 확인 (블록 찾기 관련)
  const topicKeywords = ["시작", "버튼", "실행", "클릭"];
  let isSameTopic = true;

  // 역순으로 순회하면서 같은 주제의 도움 요청 카운트
  for (let i = conversationHistory.length - 1; i >= 0; i -= 2) {
    if (i - 1 >= 0) {
      const userMsg = conversationHistory[i - 1].content;
      const botMsg = conversationHistory[i].content;

      // 주제가 같은지 확인
      const hasTopic = topicKeywords.some((k) => userMsg.includes(k));
      if (!hasTopic) {
        break; // 주제가 바뀌면 중단
      }

      // 도움 요청인지 확인
      const helpKeywords = ["못찾", "모르겠", "어디", "알려줘"];
      if (helpKeywords.some((k) => userMsg.includes(k))) {
        count++;
      }
    }
  }

  // 현재 메시지도 도움 요청이면 추가
  if (["못찾", "모르겠", "어디"].some((k) => currentMessage.includes(k))) {
    count++;
  }

  console.log(`📊 같은 주제 도움 요청 횟수: ${count}`);
  return count;
}

// ===== 주제 변경 감지 =====
function isTopicChanged(previousMessage, currentMessage) {
  // 간단한 주제 변경 감지 (키워드 기반)
  const prevKeywords = extractMainKeywords(previousMessage);
  const currKeywords = extractMainKeywords(currentMessage);

  // 공통 키워드가 없으면 주제 변경
  const commonKeywords = prevKeywords.filter((k) => currKeywords.includes(k));
  return commonKeywords.length === 0;
}

// ===== 주요 키워드 추출 =====
function extractMainKeywords(message) {
  const importantWords = ["시작", "이동", "반복", "조건", "변수", "소리", "블록", "게임", "프로그램"];
  return importantWords.filter((word) => message.includes(word));
}

// ===== 힌트 레벨 결정 =====
function determineHintLevel(helpAttempts, userMessage) {
  const levels = [
    {
      level: 1,
      description: "카테고리만 힌트",
      condition: (attempts) => attempts <= 1,
      instruction: `
반드시 따라야 할 규칙:
1. Entry에 "이벤트" 카테고리는 없습니다. 절대 언급하지 마세요.
2. 제공된 정답 카테고리만 사용하세요.
3. 카테고리 이름만 알려주고 블록 이름은 숨기세요.

금지 단어: "이벤트", "컨트롤", "Event", "Control"
필수 사용: 제공된 정확한 카테고리명

틀린 예시:
❌ "이벤트 카테고리에서..."
❌ "컨트롤 카테고리를..."

올바른 예시:
✅ "시작 카테고리를 살펴보세요"
✅ "시작 카테고리에 관련 블록들이 있어요"`,
      example: "시작 카테고리에 있는 블록들을 살펴보세요. 버튼과 관련된 블록이 있을 거예요.",
    },
    {
      level: 2,
      description: "카테고리 + 힌트",
      condition: (attempts) => attempts === 2,
      instruction: `
반드시 따라야 할 규칙:
1. Entry에 "이벤트" 카테고리는 없습니다.
2. 정확한 카테고리명과 블록 특징을 설명하세요.
3. 블록 이름의 키워드만 힌트로 주세요.

금지: "이벤트" 카테고리 언급
필수: "시작" 카테고리 명시`,
      example: "시작 카테고리에서 '버튼'과 '클릭'이 들어간 블록을 찾아보세요. 초록색 깃발 모양이 있어요.",
    },
    {
      level: 3,
      description: "정확한 답변",
      condition: (attempts) => attempts >= 3,
      instruction: `
정확한 블록명과 카테고리를 알려주세요.
절대 "이벤트" 카테고리라고 하지 마세요.`,
      example: "시작 카테고리에서 '시작하기 버튼을 클릭했을 때' 블록을 사용하세요.",
    },
  ];

  for (const level of levels) {
    if (level.condition(helpAttempts)) {
      return level;
    }
  }

  return levels[levels.length - 1];
}

// ===== 대화 기록에 힌트 레벨 저장 =====
function addHintLevelToHistory(conversationHistory, level) {
  // 메타데이터로 힌트 레벨 추가
  const metadata = {
    hintLevel: level,
    timestamp: Date.now(),
  };

  return {
    ...conversationHistory,
    metadata,
  };
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

  console.log("🚀 AI 요청 처리 시작:", { message, mode, ragEnabled: USE_RAG });

  try {
    // 1. 질문 분류
    const classification = classifyQuestion(message);
    console.log("📊 분류 결과:", classification);

    // 2. API 키 확인
    const settings = await chrome.storage.sync.get(["openai_api_key"]);
    if (!settings.openai_api_key?.trim()) {
      throw new Error("API 키가 설정되지 않았습니다");
    }

    // 3. RAG 검색 수행
    let relevantBlocks = [];
    if (USE_RAG) {
      console.log("🧠 RAG 검색 시작...");
      relevantBlocks = await searchEntryBlocks(message, 5);
      console.log(`🎯 RAG 검색 완료: ${relevantBlocks.length}개 블록 발견`);
    }

    // 4. 응답 생성
    const response = await generateEducationalResponse(message, mode, projectContext, conversationHistory);

    // 5. 사용량 통계 기록
    await logUsageStats(message.length, response.length, classification.type, USE_RAG);

    // 6. 응답 반환
    return {
      success: true,
      response: response,
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
      classification: null,
    };
  }
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

// ===== Chrome Extension 메시지 처리 =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "generateAIResponse":
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
      return true; // 비동기 응답

    case "getSettings":
      chrome.storage.sync.get(["enabled", "autoAnalysis", "sidebarMode", "openai_api_key", "rag_enabled"], (data) => {
        sendResponse({
          ...data,
          hasApiKey: !!data.openai_api_key,
          ragEnabled: data.rag_enabled !== false,
          openai_api_key: undefined, // 보안상 키 자체는 전송하지 않음
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

    case "openSettings":
      chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
      sendResponse({ success: true });
      return true;

    default:
      break;
  }
});

// ===== Entry URL 처리 =====
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
