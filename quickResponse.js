// quickResponse.js - Quick Response Generator for Entry Block Helper

/**
 * Quick Response Generator
 * 단순 질문에 대한 빠른 응답 생성
 */
class QuickResponseGenerator {
  constructor() {
    this.categoryInfo = {
      start: {
        name: "시작",
        emoji: "▶️",
        description: "프로그램을 시작하는 이벤트 블록들이에요",
      },
      flow: {
        name: "흐름",
        emoji: "🔄",
        description: "프로그램의 흐름을 제어하는 블록들이에요",
      },
      moving: {
        name: "움직임",
        emoji: "🏃",
        description: "오브젝트를 움직이게 하는 블록들이에요",
      },
      looks: {
        name: "생김새",
        emoji: "🎨",
        description: "오브젝트의 모양이나 효과를 바꾸는 블록들이에요",
      },
      sound: {
        name: "소리",
        emoji: "🔊",
        description: "소리를 재생하거나 제어하는 블록들이에요",
      },
      judgement: {
        name: "판단",
        emoji: "❓",
        description: "조건을 확인하는 블록들이에요",
      },
      calc: {
        name: "계산",
        emoji: "🔢",
        description: "숫자나 문자를 계산하는 블록들이에요",
      },
      variable: {
        name: "자료",
        emoji: "📦",
        description: "변수와 리스트를 관리하는 블록들이에요",
      },
      func: {
        name: "함수",
        emoji: "📝",
        description: "함수를 만들고 사용하는 블록들이에요",
      },
      hardware: {
        name: "하드웨어",
        emoji: "🔌",
        description: "하드웨어를 제어하는 블록들이에요",
      },
    };

    this.blockExamples = {
      repeat_basic: "10번 반복하기 블록 안에 이동 블록을 넣으면, 10번 이동해요",
      repeat_inf: "무한 반복하기 블록은 게임이 끝날 때까지 계속 실행돼요",
      repeat_while_true: "조건을 만족하는 동안만 반복해요 (예: 점수 < 100일 때까지)",
      _if: "만약 스페이스키를 눌렀다면, 점프하기",
      if_else: "만약 벽에 닿았다면 게임 끝내기, 아니면 계속 진행",
      move_direction: "위쪽 화살표 방향으로 10만큼 이동하기",
      move_x: "x좌표로 10만큼 이동하기 (오른쪽으로)",
      move_y: "y좌표로 10만큼 이동하기 (위쪽으로)",
      locate_xy: "x: 0, y: 0 위치로 이동하기 (화면 중앙)",
      when_some_key_pressed: "스페이스 키를 눌렀을 때 시작하기",
      when_run_button_click: "시작 버튼을 클릭했을 때 실행",
      is_press_some_key: "스페이스 키를 누르고 있는지 확인",
      is_touched: "다른 오브젝트와 닿았는지 확인",
      reach_something: "마우스나 벽에 닿았는지 확인",
      create_clone: "복제본 생성하기 (예: 총알 발사)",
      delete_clone: "복제본 삭제하기",
      when_clone_start: "복제본이 생성되었을 때",
      set_variable: "변수값을 10으로 정하기",
      change_variable: "변수값을 1만큼 바꾸기",
      get_variable: "변수값 가져오기",
      show_variable: "변수를 화면에 표시하기",
      hide_variable: "변수를 화면에서 숨기기",
    };
  }

  /**
   * 통합 응답 생성 메서드
   */
  generateResponse(question, classification, ragResults) {
    console.log("📝 Quick Response 생성");

    const keywords = classification.keywords || [];
    const questionLower = question.toLowerCase();

    // 질문 유형 파악 후 적절한 메서드 호출
    if (questionLower.includes("어디") || questionLower.includes("위치") || questionLower.includes("찾")) {
      return this.generateLocationResponse(ragResults, keywords);
    }

    if (questionLower.includes("사용법") || questionLower.includes("어떻게") || questionLower.includes("방법")) {
      return this.generateUsageResponse(ragResults, keywords);
    }

    if (
      questionLower.includes("무엇") ||
      questionLower.includes("뭐") ||
      questionLower.includes("개념") ||
      questionLower.includes("란")
    ) {
      return this.generateConceptResponse(keywords);
    }

    // 기본값: 위치 응답
    return this.generateLocationResponse(ragResults, keywords);
  }

  /**
   * 위치 관련 질문 응답 생성
   */
  generateLocationResponse(ragResults, keywords) {
    console.log("📝 Quick Response 생성 시작");
    console.log("  - RAG 결과:", ragResults);
    console.log("  - 키워드:", keywords);

    // ragResults 검증 및 배열 변환
    if (!ragResults) {
      return this.generateNotFoundResponse(keywords);
    }

    // 배열이 아닌 경우 처리
    let results = [];
    if (Array.isArray(ragResults)) {
      results = ragResults;
    } else if (typeof ragResults === "object") {
      // 객체인 경우 배열로 변환 시도
      results = Object.values(ragResults);
    } else {
      return this.generateNotFoundResponse(keywords);
    }

    if (results.length === 0) {
      return this.generateNotFoundResponse(keywords);
    }

    // 점수 계산 및 정렬
    const scoredResults = results
      .map((result) => ({
        ...result,
        displayScore: result.score || result.relevanceScore || 10, // 기본값 10
      }))
      .sort((a, b) => b.displayScore - a.displayScore);

    console.log("  - 최고 점수:", scoredResults[0].displayScore);
    console.log("  - 최상위 블록:", scoredResults[0].name);

    // RAG 결과가 있으면 무조건 성공으로 처리 (점수 체크 제거)
    // if (scoredResults[0].displayScore < 5) {
    //   return this.generateNotFoundResponse(keywords);
    // }

    // 상위 결과 선택 (최대 3개)
    const topResults = scoredResults.slice(0, 3);

    // 카테고리별 그룹화
    const byCategory = {};
    topResults.forEach((block) => {
      const category = block.category || "unknown";
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(block);
    });

    // 응답 생성
    let response = "";

    if (topResults.length === 1) {
      // 단일 결과
      const block = topResults[0];
      response = `🎯 **${block.name}** 블록을 찾았어요!\n\n`;
      response += `📍 위치: **${this.getCategoryName(block.category)}** 카테고리\n`;
      response += `${this.getCategoryEmoji(block.category)} ${this.getCategoryDescription(block.category)}\n\n`;

      if (block.description) {
        response += `💡 **설명**: ${block.description}\n`;
      }

      // 사용 예시 추가
      const example = this.getBlockExample(block.type);
      if (example) {
        response += `\n📝 **예시**: ${example}`;
      }
    } else {
      // 복수 결과
      response = `🎯 관련 블록들을 찾았어요!\n\n`;

      Object.entries(byCategory).forEach(([category, blocks]) => {
        response += `📍 **${this.getCategoryName(category)}** 카테고리\n`;
        response += `${this.getCategoryEmoji(category)} ${this.getCategoryDescription(category)}\n`;

        blocks.forEach((block) => {
          response += `  • **${block.name}**`;
          if (block.description) {
            response += ` - ${this.shortenDescription(block.description)}`;
          }
          response += "\n";
        });
        response += "\n";
      });
    }

    // 추가 도움말
    const additionalHelp = this.getAdditionalHelp(topResults[0].type);
    if (additionalHelp) {
      response += "\n" + additionalHelp;
    }

    return response;
  }

  /**
   * 사용법 관련 질문 응답 생성
   */
  generateUsageResponse(ragResults, keywords) {
    // ragResults 검증 및 배열 변환
    if (!ragResults) {
      return this.generateNotFoundResponse(keywords);
    }

    let results = [];
    if (Array.isArray(ragResults)) {
      results = ragResults;
    } else if (typeof ragResults === "object") {
      results = Object.values(ragResults);
    } else {
      return this.generateNotFoundResponse(keywords);
    }

    if (results.length === 0) {
      return this.generateNotFoundResponse(keywords);
    }

    const block = results[0];
    let response = `📖 **${block.name}** 블록 사용법\n\n`;

    // 기본 설명
    if (block.description) {
      response += `**설명**: ${block.description}\n\n`;
    }

    // 파라미터 설명
    if (block.params && block.params.length > 0) {
      response += `**입력값**:\n`;
      block.params.forEach((param) => {
        response += `  • ${param.name}: ${param.description || param.type}\n`;
      });
      response += "\n";
    }

    // 사용 예시
    const example = this.getBlockExample(block.type);
    if (example) {
      response += `**예시**: ${example}\n\n`;
    }

    // 팁 추가
    response += this.getUsageTips(block.type);

    return response;
  }

  /**
   * 개념 설명 응답 생성
   */
  generateConceptResponse(keywords) {
    const concepts = {
      반복: {
        title: "반복 블록",
        description: "같은 동작을 여러 번 실행하게 해주는 블록이에요.",
        types: [
          "• **n번 반복하기**: 정해진 횟수만큼 반복",
          "• **무한 반복하기**: 프로그램이 끝날 때까지 계속 반복",
          "• **조건 반복하기**: 특정 조건을 만족하는 동안 반복",
        ],
        tip: "게임에서 캐릭터가 계속 움직이게 하려면 반복 블록을 사용하세요!",
      },
      조건: {
        title: "조건 블록",
        description: "특정 상황에서만 코드를 실행하게 해주는 블록이에요.",
        types: ["• **만약 ~라면**: 조건이 참일 때만 실행", "• **만약 ~라면, 아니면**: 참/거짓에 따라 다른 동작 실행"],
        tip: "게임에서 충돌 감지나 점수 체크할 때 유용해요!",
      },
      변수: {
        title: "변수",
        description: "데이터를 저장하고 사용할 수 있는 상자예요.",
        types: ["• **변수 만들기**: 새로운 저장 공간 생성", "• **변수 정하기**: 값을 저장", "• **변수 바꾸기**: 값을 변경"],
        tip: "점수, 생명, 레벨 등을 저장할 때 사용해요!",
      },
    };

    // 키워드에 맞는 개념 찾기
    for (const keyword of keywords) {
      for (const [key, concept] of Object.entries(concepts)) {
        if (keyword.includes(key) || key.includes(keyword)) {
          let response = `📚 **${concept.title}** 설명\n\n`;
          response += `${concept.description}\n\n`;
          response += `**종류**:\n${concept.types.join("\n")}\n\n`;
          response += `💡 **Tip**: ${concept.tip}`;
          return response;
        }
      }
    }

    return this.generateNotFoundResponse(keywords);
  }

  /**
   * 찾지 못한 경우 응답
   */
  generateNotFoundResponse(keywords) {
    if (keywords && keywords.length > 0) {
      return (
        `🔍 "${keywords.join(", ")}" 관련 블록을 정확히 찾지 못했어요.\n\n` +
        `혹시 이런 카테고리의 블록을 찾으시나요?\n` +
        `• **흐름** - 🔄 반복, 조건 등 프로그램 흐름 제어\n` +
        `• **움직임** - 🏃 이동, 회전 등 오브젝트 동작\n` +
        `• **시작** - ▶️ 키보드, 마우스 등 이벤트 시작\n` +
        `• **판단** - ❓ 충돌, 비교 등 조건 확인\n` +
        `• **자료** - 📦 변수, 리스트 등 데이터 관리\n\n` +
        `좀 더 구체적으로 설명해주시면 정확한 블록을 찾아드릴게요!`
      );
    }

    return (
      `🔍 정확한 블록을 찾지 못했어요.\n\n` +
      `어떤 동작을 만들고 싶으신지 좀 더 자세히 설명해주시겠어요?\n\n` +
      `예시:\n` +
      `• "스페이스키를 누르면 점프하게 하고 싶어요"\n` +
      `• "캐릭터가 계속 움직이게 만들고 싶어요"\n` +
      `• "점수를 화면에 표시하고 싶어요"`
    );
  }

  /**
   * 헬퍼 메서드들
   */
  getCategoryName(category) {
    return this.categoryInfo[category]?.name || category;
  }

  getCategoryEmoji(category) {
    return this.categoryInfo[category]?.emoji || "📌";
  }

  getCategoryDescription(category) {
    return this.categoryInfo[category]?.description || "관련 블록들이에요";
  }

  getBlockExample(blockType) {
    return this.blockExamples[blockType] || null;
  }

  shortenDescription(description) {
    if (description.length > 50) {
      return description.substring(0, 50) + "...";
    }
    return description;
  }

  getAdditionalHelp(blockType) {
    if (!blockType) return "";

    if (blockType.includes("repeat")) {
      return "💡 **Tip**: 반복 블록 안에 다른 블록을 넣어서 반복할 동작을 만들어보세요!";
    }
    if (blockType.includes("if")) {
      return "💡 **Tip**: 조건 블록으로 특정 상황에서만 실행되는 코드를 만들 수 있어요!";
    }
    if (blockType.includes("move")) {
      return "💡 **Tip**: 이동 블록과 반복 블록을 함께 사용하면 계속 움직이는 효과를 만들 수 있어요!";
    }
    if (blockType.includes("variable")) {
      return "💡 **Tip**: 변수로 점수나 생명 같은 게임 데이터를 관리할 수 있어요!";
    }
    if (blockType.includes("when")) {
      return "💡 **Tip**: 시작 블록 아래에 실행할 블록들을 연결하세요!";
    }

    return "";
  }

  getUsageTips(blockType) {
    const tips = {
      repeat_basic: "💡 반복 횟수를 변수로 설정하면 동적으로 변경할 수 있어요!",
      repeat_inf: "💡 무한 반복 안에는 꼭 대기 시간이나 조건 체크를 넣어주세요!",
      _if: "💡 여러 조건을 체크하려면 조건 블록을 중첩해서 사용하세요!",
      move_direction: "💡 음수 값을 넣으면 반대 방향으로 이동해요!",
      set_variable: "💡 게임 시작할 때 변수를 초기화하는 것을 잊지 마세요!",
      when_some_key_pressed: "💡 여러 키에 반응하려면 각각 시작 블록을 만드세요!",
    };

    return tips[blockType] || "💡 블록을 드래그해서 연결하면 프로그램이 완성돼요!";
  }
}

// Service Worker 환경에서 사용 가능하도록 export
if (typeof self !== "undefined") {
  self.QuickResponseGenerator = QuickResponseGenerator;
}

// Node.js 환경 지원
if (typeof module !== "undefined" && module.exports) {
  module.exports = QuickResponseGenerator;
}
