// Entry Block Helper - Background Service Worker (진짜 RAG 시스템 적용)

// ===== RAG 테스트 설정 =====
let USE_RAG = true; // 이것을 true/false로 바꿔가며 테스트

// ===== Entry 블록 데이터 로드 및 캐싱 =====
let entryBlockData = null;
let dataLoadPromise = null;
let questionClassifier = null;

// ===== API 키 설정 (사용자가 설정할 수 있도록 비워둠) =====
const OPENAI_API_KEY = ""; // 사용자가 직접 설정하도록 비워둠

// ===== 질문 분류기 클래스 정의 (파일 내부에 포함) =====
class EntryQuestionClassifier {
  constructor() {
    this.classificationRules = {
      simple: {
        keywords: ["어떻게", "어떤", "무엇", "뭐", "뭘", "언제", "블록", "사용법", "사용", "쓰는", "찾", "어디"],
        patterns: [/.*블록.*어디.*있/, /.*어떻게.*사용/, /.*무슨.*기능/, /.*뭐.*하는/],
        examples: ["반복 블록은 어디에 있어?", "변수는 어떻게 만들어?", "소리 블록 사용법 알려줘"],
        maxComplexity: 30,
        priority: 1,
      },
      complex: {
        keywords: [
          "만들",
          "제작",
          "개발",
          "구현",
          "프로그램",
          "게임",
          "RPG",
          "슈팅",
          "퍼즐",
          "시뮬레이션",
          "계산기",
          "시계",
          "그림판",
          "챗봇",
          "애니메이션",
        ],
        patterns: [/.*게임.*만들/, /.*구현.*하고.*싶/, /.*프로젝트.*어떻게/, /.*만들.*수.*있/, /점수.*시스템/, /.*따라.*하는/],
        examples: ["간단한 슈팅 게임 만들고 싶어", "점수 시스템은 어떻게 구현해?", "공튕기기 게임 만들어줘"],
        minComplexity: 20,
        priority: 3,
      },
      debug: {
        keywords: [
          "안돼",
          "안되",
          "안됨",
          "오류",
          "에러",
          "버그",
          "이상",
          "왜",
          "문제",
          "막혀",
          "멈춰",
          "작동",
          "고쳐",
          "해결",
          "수정",
          "바꿔",
          "틀렸",
        ],
        patterns: [/.*안\s*돼/, /.*안\s*되/, /.*왜.*안/, /.*이상해/, /.*실행.*안/, /.*움직.*않/],
        emotionalCues: ["ㅠ", "ㅜ", "...", "??", "!", ";;;"],
        examples: ["코드 실행이 안돼요", "캐릭터가 안 움직여ㅠㅠ", "왜 반복이 멈추지 않아?"],
        priority: 5,
      },
      conceptual: {
        keywords: [
          "변수",
          "함수",
          "조건문",
          "반복문",
          "리스트",
          "배열",
          "개념",
          "원리",
          "이론",
          "정의",
          "차이",
          "비교",
          "배우",
          "공부",
          "이해",
          "설명",
        ],
        patterns: [/.*차이.*뭐/, /.*개념.*설명/, /.*이란.*무엇/],
        examples: ["변수와 리스트의 차이가 뭐야?", "조건문 개념 설명해줘", "함수는 왜 사용해?"],
        priority: 2,
      },
    };
    this.CONFIDENCE_THRESHOLD = 0.65;
  }

  async classify(message, context = {}) {
    console.log("🔍 질문 분류 시작:", message);

    const processed = this.preprocessMessage(message);
    const ruleBasedResult = this.ruleBasedClassify(processed);

    if (ruleBasedResult.confidence >= this.CONFIDENCE_THRESHOLD) {
      console.log(`✅ 규칙 기반 분류 완료: ${ruleBasedResult.type} (신뢰도: ${ruleBasedResult.confidence})`);
      return ruleBasedResult;
    }

    console.log("🤖 신뢰도 부족, AI 분류 시도...");
    return await this.aiClassify(message, ruleBasedResult);
  }

  preprocessMessage(message) {
    return {
      original: message,
      normalized: message.toLowerCase().replace(/\s+/g, " ").trim(),
      length: message.length,
      wordCount: message.split(/\s+/).length,
      hasEmoticon: /[ㅠㅜㅋㅎ]|[.]{2,}|[!?]{2,}/.test(message),
      hasCode: /when_|if_|repeat_|move_/.test(message),
    };
  }

  ruleBasedClassify(processed) {
    const scores = {};

    for (const [type, rules] of Object.entries(this.classificationRules)) {
      scores[type] = this.calculateTypeScore(processed, rules);
    }

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const normalizedScores = {};
    let maxType = null;
    let maxScore = 0;

    for (const [type, score] of Object.entries(scores)) {
      normalizedScores[type] = totalScore > 0 ? score / totalScore : 0;
      if (score > maxScore) {
        maxScore = score;
        maxType = type;
      }
    }

    return {
      type: maxType,
      confidence: normalizedScores[maxType] || 0,
      scores: normalizedScores,
      method: "rule-based",
    };
  }

  calculateTypeScore(processed, rules) {
    let score = 0;
    const text = processed.normalized;

    for (const keyword of rules.keywords || []) {
      if (text.includes(keyword)) {
        score += 2 * (rules.priority || 1);
      }
    }

    for (const pattern of rules.patterns || []) {
      if (pattern.test(text)) {
        score += 3 * (rules.priority || 1);
      }
    }

    if (rules.maxComplexity && processed.length <= rules.maxComplexity) {
      score += 1;
    }
    if (rules.minComplexity && processed.length >= rules.minComplexity) {
      score += 1;
    }

    if (rules.emotionalCues && processed.hasEmoticon) {
      for (const cue of rules.emotionalCues) {
        if (text.includes(cue)) {
          score += 2;
        }
      }
    }

    return score;
  }

  async aiClassify(message, ruleResult) {
    try {
      const settings = await chrome.storage.sync.get(["openai_api_key"]);
      if (!settings.openai_api_key) {
        console.warn("⚠️ API 키 없음, 규칙 기반 결과 사용");
        return { ...ruleResult, method: "rule-based-fallback" };
      }

      const systemPrompt = `당신은 엔트리(Entry) 블록코딩 질문 분류 전문가입니다.
      
질문을 다음 4가지 중 하나로 정확히 분류하세요:
- simple: 단순한 블록 사용법이나 위치를 묻는 질문
- complex: 게임이나 프로젝트를 만드는 방법을 묻는 질문  
- debug: 오류나 문제 해결을 요청하는 질문
- conceptual: 프로그래밍 개념이나 원리를 묻는 질문

오직 타입명만 답하세요.`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.openai_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `질문: "${message}"` },
          ],
          max_tokens: 10,
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiType = data.choices[0].message.content.trim().toLowerCase();

        console.log(`🤖 AI 분류 결과: ${aiType}`);

        return {
          type: aiType,
          confidence: 0.9,
          method: "ai-classified",
          ruleBasedGuess: ruleResult.type,
        };
      }
    } catch (error) {
      console.error("AI 분류 실패:", error);
    }

    return { ...ruleResult, method: "fallback" };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  questionClassifier = new EntryQuestionClassifier();
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

                // 블록 이미지 경로 추가
                const imagePath = `data/block-images/${category}/${fileName.replace(".json", ".png")}`;
                const imageUrl = chrome.runtime.getURL(imagePath);

                // 이미지 존재 확인
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

// ===== 파일명을 한국어로 변환하는 함수 =====
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

// ===== 카테고리를 한국어로 변환하는 함수 =====
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

// ===== searchEntryBlocks 함수 개선 =====
async function searchEntryBlocks(userMessage, topK = 3) {
  const blockData = await loadEntryBlockData();

  if (!blockData || blockData.length === 0) {
    console.log("🔍 RAG: 블록 데이터 없음");
    return [];
  }

  // 1. 직접 매칭 우선 (정확한 블록명)
  const directMatches = blockData.filter((block) => {
    const blockName = block.name || "";
    return blockName.includes("만약") && blockName.includes("라면") && userMessage.includes("만약");
  });

  // 2. 특별 키워드 매칭
  const specialKeywordMatches = [];

  // 나머지 관련
  if (
    (userMessage.includes("나머지") && userMessage.includes("블록")) ||
    userMessage.includes("나눗셈") ||
    userMessage.includes("몫")
  ) {
    const mathBlocks = blockData.filter(
      (block) =>
        block.fileName === "quotient_and_mod" || (block.name && (block.name.includes("나머지") || block.name.includes("몫")))
    );
    specialKeywordMatches.push(...mathBlocks);
  }

  // 조건 관련
  if (userMessage.includes("조건") || (userMessage.includes("만약") && userMessage.includes("라면"))) {
    const conditionBlocks = blockData.filter(
      (block) => block.fileName === "_if" || block.fileName === "if_else" || (block.name && block.name.includes("만약"))
    );
    specialKeywordMatches.push(...conditionBlocks);
  }

  // 반복 관련
  if (userMessage.includes("반복") || userMessage.includes("루프")) {
    const repeatBlocks = blockData.filter(
      (block) => block.category === "repeat" || (block.category === "flow" && block.name && block.name.includes("반복"))
    );
    specialKeywordMatches.push(...repeatBlocks);
  }

  // 직접 매칭이나 특별 키워드 매칭이 있으면 우선 반환
  if (directMatches.length > 0) {
    console.log(`🎯 직접 매칭: ${directMatches.length}개 블록`);
    return directMatches.slice(0, topK);
  }

  if (specialKeywordMatches.length > 0) {
    console.log(`🎯 특별 키워드 매칭: ${specialKeywordMatches.length}개 블록`);
    return [...new Set(specialKeywordMatches)].slice(0, topK); // 중복 제거
  }

  // 3. 기존 일반 검색 로직
  const messageWords = userMessage
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0);

  console.log("🔍 검색 키워드:", messageWords);

  const scored = blockData.map((block) => {
    let score = 0;

    const searchableText = [
      block.name || "",
      block.description || "",
      getCategoryKorean(block.category),
      block.fileName || "",
      JSON.stringify(block.usage_examples || []),
      JSON.stringify(block.common_mistakes || []),
    ]
      .join(" ")
      .toLowerCase();

    // 키워드 매칭
    for (const word of messageWords) {
      if (block.name && block.name.toLowerCase().includes(word)) {
        score += 10;
        console.log(`높은 매칭: ${block.name} <- ${word}`);
      }

      if (searchableText.includes(word)) {
        score += 2;
      }

      const koreanCategory = getCategoryKorean(block.category);
      if (koreanCategory.includes(word)) {
        score += 5;
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
      results.map((b) => ({
        name: b.name || b.fileName,
        category: getCategoryKorean(b.category),
        hasImage: b.hasImage,
      }))
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

// ===== 교육적 AI 응답 생성 (단계적 힌트 시스템) =====
async function generateEducationalResponse(userMessage, mode, projectContext, conversationHistory = [], classification) {
  try {
    const settings = await chrome.storage.sync.get(["openai_api_key"]);
    const apiKey = settings.openai_api_key;

    if (!apiKey || apiKey.trim() === "") {
      console.log("API 키가 설정되지 않음");
      return "API 키를 설정해주세요. 확장 프로그램 아이콘 → 설정에서 OpenAI API 키를 입력하세요.";
    }

    const messageCount = conversationHistory.length;
    const conversationCount = Math.floor(messageCount / 2);

    const needsHelp =
      userMessage.includes("모르겠") ||
      userMessage.includes("막혔") ||
      userMessage.includes("도와") ||
      userMessage.includes("안 돼") ||
      userMessage.includes("안 되") ||
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

현재 상황: ${projectContext || "프로젝트 정보 없음"}
선택된 모드: ${getModeDescription(mode)}`;

    // 분류 정보가 있으면 활용
    if (classification) {
      systemPrompt += `\n질문 유형: ${classification.type} (신뢰도: ${(classification.confidence * 100).toFixed(1)}%)`;
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

        // 단계별 힌트 제공 전략
        if (attemptCount === 0 && !needsHelp) {
          systemPrompt += `

=== Entry 전문 지식 (1단계 - 개념 힌트) ===
찾아낸 관련 블록들:
${contextInfo}

**중요 지시사항 - 1단계 (개념 힌트):**
- 구체적인 블록명은 절대 언급하지 마세요
- "이런 상황에서는 조건을 확인하는 방법이 필요해요"처럼 개념만 설명
- "어떤 일이 일어났을 때 반응하게 하려면 어떻게 해야 할까요?" 같은 유도 질문
- 프로그래밍 개념(조건문, 반복문 등)만 간접적으로 언급
- 답을 직접 주지 말고 스스로 생각하도록 유도`;
        } else if (attemptCount === 1 || (attemptCount === 0 && needsHelp)) {
          systemPrompt += `

=== Entry 전문 지식 (2단계 - 카테고리 힌트) ===
찾아낸 관련 블록들:
${contextInfo}

**중요 지시사항 - 2단계 (카테고리 힌트):**
- 구체적인 블록명은 아직 언급하지 마세요
- "${getCategoryKorean(relevantBlocks[0]?.category || "")} 카테고리를 살펴보세요"라고 안내
- "이 카테고리에서 ~하는 블록을 찾아보세요" 형태로 힌트 제공
- 블록의 일반적인 기능은 설명해도 됨
- 여전히 정답은 직접 주지 않음`;
        } else {
          systemPrompt += `

=== Entry 전문 지식 (3단계 - 구체적 안내) ===
찾아낸 관련 블록들:
${contextInfo}

**중요 지시사항 - 3단계 (구체적 안내):**
- 이제 한국어 블록명 사용: "${relevantBlocks[0]?.name || "해당 블록"}"
- 영어 용어 절대 사용 금지 (when_object_click ❌, 오브젝트를 클릭했을 때 ✅)
- ${getCategoryKorean(relevantBlocks[0]?.category || "")} 카테고리라고 명시
- 구체적인 사용 방법과 단계별 설명 제공
- 블록을 어떻게 연결하는지 상세히 안내`;
        }

        console.log(`🧠 RAG 모드: ${attemptCount + 1}단계 힌트 제공`);
      }
    } else {
      // RAG 비활성화 시에도 단계별 접근
      if (attemptCount === 0 && !needsHelp) {
        systemPrompt += `

일반 블록코딩 원칙 (1단계):
- 개념적 설명만 제공
- "이런 기능을 하려면 어떤 종류의 블록이 필요할까요?" 질문
- 직접적인 답변 금지`;
      } else if (attemptCount === 1 || (attemptCount === 0 && needsHelp)) {
        systemPrompt += `

일반 블록코딩 원칙 (2단계):
- 관련 카테고리 언급 가능
- "시작 카테고리에서 찾아보세요" 같은 힌트
- 구체적 블록명은 아직 비공개`;
      } else {
        systemPrompt += `

일반 블록코딩 원칙 (3단계):
- 이제 구체적인 도움 제공
- 블록 이름과 사용법 설명
- 단계별 연결 방법 안내`;
      }

      console.log(`📚 일반 모드: ${attemptCount + 1}단계 힌트 제공`);
    }

    // 대화 단계별 추가 지시사항
    if (attemptCount === 0 && !needsHelp) {
      systemPrompt += `\n\n[지시] 첫 시도입니다. 답을 절대 주지 말고 개념적 질문만 하세요.
예: "어떤 일이 일어났을 때 반응하게 하려면 어떻게 해야 할까요?"`;
    } else if (attemptCount === 1 || (attemptCount === 0 && needsHelp)) {
      systemPrompt += `\n\n[지시] 두 번째 시도이거나 도움 요청입니다. 카테고리 힌트만 제공하세요.
예: "흐름 카테고리를 한번 살펴보는 게 어떨까요?"`;
    } else {
      systemPrompt += `\n\n[지시] 여러 번 시도했으니 이제 구체적인 블록명과 사용법을 알려주세요.`;
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

// ===== handleAIRequest 함수 수정 - async로 명확히 선언 =====
async function handleAIRequest(request) {
  const { message, mode, projectContext, conversationHistory = [] } = request;

  console.log("🚀 AI 요청 처리 시작:", { message, mode });

  // 1. 질문 분류
  if (!questionClassifier) {
    questionClassifier = new EntryQuestionClassifier();
  }

  const classification = await questionClassifier.classify(message, {
    previousMessages: conversationHistory,
  });

  console.log(`📊 분류 결과:`, classification);

  // 2. 분류에 따른 처리 전략 결정
  let responseStrategy = "";
  let useCoT = false;

  switch (classification.type) {
    case "simple":
      responseStrategy = "직접적인 답변과 관련 블록 제시";
      break;
    case "complex":
      responseStrategy = "단계별 구현 가이드";
      useCoT = true;
      break;
    case "debug":
      responseStrategy = "문제 진단 후 해결책 제시";
      useCoT = true;
      break;
    case "conceptual":
      responseStrategy = "개념 설명과 예시";
      break;
  }

  console.log(`📝 응답 전략: ${responseStrategy}`);

  try {
    // 3. AI 응답 생성
    const response = await generateEducationalResponse(message, mode, projectContext, conversationHistory, classification);
    console.log("💬 AI 응답 생성 완료:", response.substring(0, 100) + "...");

    // 4. RAG 블록 검색 (이미지 정보 포함)
    const relevantBlocks = await searchEntryBlocks(message, 5);
    console.log("🔍 RAG 검색 완료:", relevantBlocks.length, "개 블록 발견");

    // 블록 이미지 정보 추가
    const blocksWithImages = relevantBlocks.map((block) => ({
      ...block,
      displayInfo: {
        name: block.name || convertFileNameToKorean(block.fileName),
        category: getCategoryKorean(block.category),
        imageUrl: block.imageUrl,
        hasImage: block.hasImage,
      },
    }));

    // 5. 통계 수집
    await logClassificationStats(message, classification);

    return {
      response: response,
      rawBlocks: blocksWithImages,
      blockSequence: null,
      classification: classification,
      useCoT: useCoT,
      responseStrategy: responseStrategy,
    };
  } catch (error) {
    console.error("❌ AI 요청 처리 중 오류:", error);
    return {
      response: getFallbackResponse(error.message),
      rawBlocks: [],
      blockSequence: null,
      classification: classification,
    };
  }
}

// ===== 통계 수집 함수 =====
async function logClassificationStats(message, classification) {
  const stats = await chrome.storage.local.get(["classification_stats"]);
  const currentStats = stats.classification_stats || {
    total: 0,
    byType: {},
    byMethod: {},
  };

  currentStats.total++;
  currentStats.byType[classification.type] = (currentStats.byType[classification.type] || 0) + 1;
  currentStats.byMethod[classification.method] = (currentStats.byMethod[classification.method] || 0) + 1;

  await chrome.storage.local.set({ classification_stats: currentStats });
  console.log(`📈 분류 통계:`, currentStats);
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

// ===== Content Script와 메시지 통신 =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
            classification: result.classification,
          });
        })
        .catch((error) => {
          sendResponse({
            success: false,
            error: error.message,
          });
        });
      return true;

    case "testClassification":
      (async () => {
        if (!questionClassifier) {
          questionClassifier = new EntryQuestionClassifier();
        }

        const result = await questionClassifier.classify(request.message);
        console.log(`🧪 테스트 분류:`, {
          message: request.message,
          result: result,
        });

        sendResponse(result);
      })();
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
