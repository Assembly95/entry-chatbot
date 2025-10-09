// handlers/simpleHandler.js - 단순 블록 위치/사용법 안내 (RAG 검색 포함)

class SimpleHandler {
  constructor() {
    this.categoryInfo = {
      start: { name: "시작", emoji: "▶️", color: "#00B400" },
      moving: { name: "움직임", emoji: "🏃", color: "#AD3EFB" },
      looks: { name: "생김새", emoji: "🎨", color: "#FF3A61" },
      sound: { name: "소리", emoji: "🔊", color: "#67B100" },
      judgement: { name: "판단", emoji: "❓", color: "#5A75F6" },
      flow: { name: "흐름", emoji: "🔄", color: "#19BAEA" },
      variable: { name: "자료", emoji: "📦", color: "#DD47D8" },
      func: { name: "함수", emoji: "📝", color: "#DE5C04" },
      calc: { name: "계산", emoji: "🔢", color: "#F4AF18" },
      brush: { name: "붓", emoji: "🖌️", color: "#FF9B00" },
    };
  }

  /**
   * 단순 질문 처리 메인 함수 - RAG 검색 통합
   */
  async handle(decomposed, message) {
    console.log("📦 SimpleHandler 처리 시작");

    // SimpleHandler 내부에서 RAG 검색 수행
    let ragResults = [];

    // USE_RAG가 전역변수로 있는지 확인
    const useRag = typeof USE_RAG !== "undefined" ? USE_RAG : true;

    if (useRag && typeof searchEntryBlocks !== "undefined") {
      console.log("🔍 SimpleHandler: RAG 검색 시작...");
      try {
        // decomposed도 함께 전달!
        ragResults = await searchEntryBlocks(message, 5, decomposed);
        console.log(`📚 SimpleHandler: ${ragResults.length}개 블록 발견`);

        if (ragResults.length > 0) {
          console.log("찾은 블록들:");
          ragResults.forEach((block, idx) => {
            console.log(`  ${idx + 1}. ${block.name} (${block.category})`);
          });
        }
      } catch (error) {
        console.error("RAG 검색 실패:", error);
        ragResults = [];
      }
    } else {
      console.log("⚠️ RAG 비활성화 또는 searchEntryBlocks 함수 없음");
    }

    // RAG 결과가 없으면 일반 응답
    if (!ragResults || ragResults.length === 0) {
      return this.generateGeneralHelp(decomposed, message);
    }

    // 가장 점수가 높은 블록 하나만 선택
    const topBlock = ragResults[0];
    
    // 블록 이름 임시 수정
    if (topBlock.id === 'when_run_button_click') {
      topBlock.name = '시작하기 버튼을 클릭했을 때';
    }
    
    console.log(`🎯 최상위 블록 선택: ${topBlock.name} (점수: ${topBlock._searchScore})`);

    // 사용자 질문 분석
    const isAskingLocation = message.includes("위치") || message.includes("어디");
    const isAskingUsage = message.includes("사용") || message.includes("어떻게") || message.includes("방법");
    const isAskingExample = message.includes("예제") || message.includes("예시");

    // 질문 유형에 따른 응답 생성
    if (isAskingUsage || isAskingExample) {
      return this.generateDetailedResponse(topBlock);
    } else {
      // 기본적으로 카드 형식 응답
      return this.generateCardResponse(topBlock);
    }
  }

  /**
   * 카드 형식의 간단한 응답 생성 - 이모지만 사용
   */
  generateCardResponse(block) {
    
    const category = this.categoryInfo[block.category] || { name: block.category, emoji: "📌", color: "#757575" };
    
    let response = `
<div style="
    background: linear-gradient(135deg, ${category.color}CC, ${category.color}99);
    border-radius: 16px;
    padding: 24px;
    color: white;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    margin: 16px 0;
">
    <div style="font-size: 48px; margin-bottom: 16px; text-align: center;">
        ${category.emoji}
    </div>
    <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700;">
        ${block.name}
    </h3>
    <div style="
        background: rgba(255,255,255,0.2);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
        font-weight: 600;
    ">
        📍 위치: ${category.name} 카테고리
    </div>
    <div style="
        background: rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: 12px;
        font-size: 14px;
        line-height: 1.6;
    ">
        ${block.description || "이 블록을 사용하여 프로그램을 제어할 수 있어요."}
    </div>
</div>

💡 **더 알고 싶으신가요?**
- "사용법 알려줘" - 자세한 사용 방법
- "예제 보여줘" - 실제 사용 예시
- "문제 해결" - 안 될 때 해결 방법`;

    return {
      success: true,
      response: response,
      type: "simple-card",
      blockInfo: block,
      responseType: "html"
    };
  }

  /**
   * 상세한 응답 생성 (사용법 요청 시)
   */
  generateDetailedResponse(block) {
    const category = this.categoryInfo[block.category] || { name: block.category, emoji: "📌" };

    let response = `## 📚 "${block.name}" 사용법\n\n`;

    // 블록 설명
    if (block.description) {
      response += `### 💡 설명\n`;
      response += `${block.description}\n\n`;
    }

    // 사용 방법
    response += `### 📝 사용 단계\n`;
    response += this.getUsageGuide(block);
    response += `\n`;

    // 파라미터 정보
    if (block.parameters && Object.keys(block.parameters).length > 0) {
      response += `### ⚙️ 설정 가능한 값\n`;
      for (const [key, value] of Object.entries(block.parameters)) {
        response += `• **${key}**: ${value}\n`;
      }
      response += `\n`;
    }

    // 예시
    if (block.usage_examples && block.usage_examples.length > 0) {
      response += `### 🎮 사용 예시\n`;
      const example = block.usage_examples[0];
      response += `**${example.title}**\n`;
      response += `${example.description}\n\n`;
    }

    // 팁
    response += `### 💭 팁\n`;
    response += this.getTip(block);

    return {
      success: true,
      response: response,
      type: "simple-detailed",
      blockInfo: block,
    };
  }

  /**
   * 블록을 찾지 못한 경우 일반 도움말
   */
  generateGeneralHelp(decomposed, message) {
    let response = `## 🔍 정확한 블록을 찾지 못했어요\n\n`;

    // 의도 분해 결과가 있으면 활용
    if (decomposed) {
      response += `이해한 내용:\n`;
      if (decomposed.trigger) response += `• 시작 조건: ${decomposed.trigger}\n`;
      if (decomposed.action) response += `• 동작: ${decomposed.action}\n`;
      if (decomposed.target) response += `• 대상: ${decomposed.target}\n`;
      response += `\n`;
    }

    response += `### 📚 Entry 블록 카테고리 안내\n\n`;

    for (const [key, info] of Object.entries(this.categoryInfo)) {
      response += `${info.emoji} **${info.name}**: ${this.getCategoryDescription(key)}\n`;
    }

    response += `\n### 💬 더 도와드릴까요?\n`;
    response += `찾고 있는 블록이나 만들고 싶은 기능을 구체적으로 설명해주세요!`;

    return {
      success: true,
      response: response,
      type: "simple-notfound",
    };
  }

  /**
   * 카테고리별 그룹화
   */
  groupByCategory(blocks) {
    const grouped = {};
    blocks.forEach((block) => {
      if (!grouped[block.category]) {
        grouped[block.category] = [];
      }
      grouped[block.category].push(block);
    });
    return grouped;
  }

  /**
   * 카테고리 설명
   */
  getCategoryDescription(category) {
    const descriptions = {
      start: "프로그램을 시작하는 이벤트 블록들",
      moving: "오브젝트를 움직이게 하는 블록들",
      looks: "모양과 효과를 변경하는 블록들",
      sound: "소리를 재생하고 제어하는 블록들",
      judgement: "조건을 확인하는 블록들",
      flow: "프로그램 흐름을 제어하는 블록들",
      variable: "데이터를 저장하고 관리하는 블록들",
      func: "함수를 만들고 호출하는 블록들",
      calc: "계산과 연산을 수행하는 블록들",
      brush: "그리기와 도장 관련 블록들",
    };

    return descriptions[category] || "관련 블록들";
  }

  /**
   * 블록 사용 가이드 - RAG 데이터 활용
   */
  getUsageGuide(block) {
    // step_by_step_guide가 있으면 우선 사용
    if (block.step_by_step_guide && Array.isArray(block.step_by_step_guide)) {
      return block.step_by_step_guide
        .slice(0, 3) // 처음 3단계만
        .map((step) => `${step.step}. ${step.title}`)
        .join("\n");
    }

    // 기본 사용법
    return "1. 블록을 작업 영역에 드래그\n2. 필요한 값 설정\n3. 다른 블록과 연결";
  }

  /**
   * 블록별 팁 - RAG 데이터 활용
   */
  getTip(block) {
    // debugging_tips가 있으면 활용
    if (block.debugging_tips && Array.isArray(block.debugging_tips) && block.debugging_tips.length > 0) {
      const tip = block.debugging_tips[0];
      if (tip.solutions && tip.solutions.length > 0) {
        return `💡 ${tip.solutions[0]}`;
      }
    }

    // 기본 팁
    return "💡 블록을 드래그해서 연결하면 프로그램이 완성돼요!";
  }
}

// Export for Service Worker
if (typeof self !== "undefined") {
  self.SimpleHandler = SimpleHandler;
}