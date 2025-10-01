// quickResponse.js - Entry 블록코딩 즉각 답변 생성 모듈
// RAG 검색 결과를 최대한 활용하여 빠르고 정확한 답변 제공

class QuickResponseHandler {
  constructor() {
    // 응답 템플릿 정의
    this.templates = {
      // 높은 신뢰도 응답
      highConfidence: {
        found: "✅ {category} 카테고리에 있는 '{blockName}' 블록을 사용하세요!\n\n{description}",
        usage: "사용법: {usage}",
        tip: "💡 팁: {tip}",
      },

      // 중간 신뢰도 응답
      mediumConfidence: {
        intro: "이런 블록들을 확인해보세요:",
        blockList: "• {category} → {blockName}",
        footer: "\n원하는 블록이 맞나요? 더 자세히 설명해주시면 정확히 찾아드릴게요!",
      },

      // 낮은 신뢰도/결과 없음
      lowConfidence: {
        notFound: "🔍 정확한 블록을 찾지 못했어요.",
        askDetail: "어떤 동작을 만들고 싶으신지 좀 더 자세히 설명해주시겠어요?",
        example: "예시: '스페이스키를 누르면 캐릭터가 점프하게 하고 싶어요'",
      },

      // 카테고리별 힌트
      categoryHints: {
        start: "🚀 프로그램이 시작되는 조건을 설정하는 블록들이에요",
        moving: "🏃 오브젝트를 움직이게 하는 블록들이에요",
        looks: "🎨 오브젝트의 모양을 바꾸는 블록들이에요",
        sound: "🔊 소리를 재생하거나 조절하는 블록들이에요",
        flow: "🔄 프로그램의 흐름을 제어하는 블록들이에요",
        judgement: "❓ 조건을 판단하는 블록들이에요",
        variable: "📦 데이터를 저장하고 관리하는 블록들이에요",
        calc: "🔢 계산을 수행하는 블록들이에요",
        func: "⚙️ 함수를 만들고 사용하는 블록들이에요",
        brush: "🖌️ 그리기 기능을 제공하는 블록들이에요",
      },
    };

    // 블록별 사용 팁
    this.blockTips = {
      when_run_button_click: "시작하기 버튼을 누르면 아래 연결된 블록들이 실행돼요",
      when_some_key_pressed: "드롭다운에서 원하는 키를 선택할 수 있어요",
      move_direction: "음수를 입력하면 반대 방향으로 이동해요",
      repeat_basic: "반복 횟수를 입력해서 같은 동작을 여러 번 실행해요",
      _if: "조건이 참일 때만 내부 블록이 실행돼요",
      set_variable: "변수에 값을 저장해서 나중에 사용할 수 있어요",
      create_clone: "현재 오브젝트의 복사본을 만들어요",
      when_clone_start: "복제본이 생성될 때 실행돼요",
    };

    // 동의어 매핑 (RAG 검색 향상용)
    this.synonyms = {
      움직이기: ["이동", "가기", "걷기", "달리기"],
      점프: ["뛰기", "도약", "올라가기"],
      회전: ["돌기", "돌리기", "회전하기"],
      충돌: ["부딪치기", "닿기", "만나기"],
      시작: ["실행", "시작하기", "켜기"],
      반복: ["계속", "반복하기", "루프"],
      조건: ["만약", "조건문", "판단"],
      변수: ["저장", "데이터", "값"],
    };
  }

  /**
   * 메인 응답 생성 함수
   */
  async generateResponse(message, ragResults, classification) {
    console.log(`📝 Quick Response 생성 시작`);
    console.log(`  - RAG 결과: ${ragResults?.length || 0}개`);

    // RAG 결과가 없는 경우
    if (!ragResults || ragResults.length === 0) {
      return this.handleNoResults(message, classification);
    }

    // 최상위 블록의 점수 확인
    const topBlock = ragResults[0];
    const score = topBlock._searchScore || 0;

    console.log(`  - 최고 점수: ${score}`);
    console.log(`  - 최상위 블록: ${topBlock.name || topBlock.fileName}`);

    // 점수에 따른 응답 전략
    if (score >= 80) {
      return this.createHighConfidenceResponse(topBlock, ragResults);
    } else if (score >= 40) {
      return this.createMediumConfidenceResponse(ragResults);
    } else {
      return this.createLowConfidenceResponse(ragResults, message);
    }
  }

  /**
   * 높은 신뢰도 응답 (정확한 블록을 찾은 경우)
   */
  createHighConfidenceResponse(block, allResults) {
    const categoryName = this.getCategoryKorean(block.category);
    const blockName = block.name || block.fileName || "블록";

    let response = this.templates.highConfidence.found
      .replace("{category}", categoryName)
      .replace("{blockName}", blockName)
      .replace("{description}", block.description || "");

    // 사용 팁 추가
    const tip = this.blockTips[block.fileName];
    if (tip) {
      response += `\n\n💡 팁: ${tip}`;
    }

    // 카테고리 힌트 추가
    const categoryHint = this.templates.categoryHints[block.category];
    if (categoryHint) {
      response += `\n\nℹ️ ${categoryHint}`;
    }

    // 관련 블록이 있으면 추가
    if (allResults.length > 1) {
      response += "\n\n📌 함께 사용하면 좋은 블록:";
      for (let i = 1; i < Math.min(3, allResults.length); i++) {
        const related = allResults[i];
        response += `\n• ${this.getCategoryKorean(related.category)} → ${related.name || related.fileName}`;
      }
    }

    return response;
  }

  /**
   * 중간 신뢰도 응답 (여러 옵션 제시)
   */
  createMediumConfidenceResponse(ragResults) {
    let response = this.templates.mediumConfidence.intro + "\n\n";

    // 상위 3개 블록 표시
    const topBlocks = ragResults.slice(0, Math.min(3, ragResults.length));

    topBlocks.forEach((block, index) => {
      const categoryName = this.getCategoryKorean(block.category);
      const blockName = block.name || block.fileName;

      // 각 블록을 박스로 감싸기
      response += `<div style="
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
    ">`;

      // 번호와 제목
      response += `<div style="
      font-weight: 600;
      margin-bottom: 6px;
    ">${index + 1}. ${categoryName} → ${blockName}</div>`;

      // 설명
      if (block.description) {
        response += `<div style="
        color: #666;
        font-size: 13px;
        line-height: 1.4;
      ">${block.description.substring(0, 100)}...</div>`;
      }

      response += `</div>`;
    });

    response += `\n${this.templates.mediumConfidence.footer}`;

    return response;
  }

  /**
   * 낮은 신뢰도 응답 (더 많은 정보 요청)
   */
  createLowConfidenceResponse(ragResults, originalMessage) {
    let response = this.templates.lowConfidence.notFound + "\n\n";

    // 가능한 카테고리 제안
    if (ragResults && ragResults.length > 0) {
      const categories = [...new Set(ragResults.map((b) => b.category))];
      response += "혹시 이런 카테고리의 블록을 찾으시나요?\n";
      categories.forEach((cat) => {
        response += `• ${this.getCategoryKorean(cat)} - ${this.templates.categoryHints[cat]}\n`;
      });
      response += "\n";
    }

    response += this.templates.lowConfidence.askDetail + "\n";
    response += this.templates.lowConfidence.example;

    return response;
  }

  /**
   * 검색 결과가 없을 때 처리
   */
  handleNoResults(message, classification) {
    let response = "🤔 해당하는 블록을 찾지 못했어요.\n\n";

    // 키워드 추출 시도
    const keywords = this.extractKeywords(message);

    if (keywords.length > 0) {
      response += `'${keywords.join("', '")}' 관련 블록을 찾고 계신가요?\n\n`;
    }

    // 일반적인 도움말 제공
    response += "Entry 블록은 다음과 같은 카테고리로 구성되어 있어요:\n\n";

    const mainCategories = ["start", "moving", "looks", "flow", "variable"];
    mainCategories.forEach((cat) => {
      response += `• ${this.getCategoryKorean(cat)}: ${this.templates.categoryHints[cat]}\n`;
    });

    response += "\n어떤 기능을 만들고 싶으신지 구체적으로 알려주시면 도와드릴게요!";

    return response;
  }

  /**
   * 키워드 추출
   */
  extractKeywords(message) {
    const words = message.split(/\s+/);
    const keywords = [];

    // 주요 키워드 매칭
    const importantWords = [
      "블록",
      "이동",
      "움직",
      "점프",
      "회전",
      "반복",
      "조건",
      "변수",
      "소리",
      "시작",
      "클릭",
      "키",
      "마우스",
    ];

    words.forEach((word) => {
      if (importantWords.some((kw) => word.includes(kw))) {
        keywords.push(word);
      }
    });

    return keywords;
  }

  /**
   * 동의어 확장을 통한 RAG 검색 개선
   */
  expandQueryWithSynonyms(message) {
    let expandedQuery = message;

    for (const [key, synonymList] of Object.entries(this.synonyms)) {
      if (message.includes(key)) {
        // 동의어 추가 (원본 유지)
        expandedQuery += " " + synonymList.join(" ");
      }
    }

    return expandedQuery;
  }

  /**
   * 카테고리 한국어 변환
   */
  getCategoryKorean(category) {
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

  /**
   * 블록 사용법 생성
   */
  generateUsageGuide(block) {
    const guides = {
      when_run_button_click: "1. 시작 카테고리에서 블록 선택\n2. 작업 영역에 드래그\n3. 아래에 실행할 블록 연결",
      move_direction: "1. 움직임 카테고리에서 블록 선택\n2. 이동 거리 입력 (예: 10)\n3. 음수는 반대 방향",
      repeat_basic: "1. 흐름 카테고리에서 블록 선택\n2. 반복 횟수 입력\n3. 반복할 블록을 내부에 넣기",
    };

    return guides[block.fileName] || "블록을 작업 영역으로 드래그하여 사용하세요.";
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = QuickResponseHandler;
}

// For browser environment
if (typeof window !== "undefined") {
  window.QuickResponseHandler = QuickResponseHandler;
}
