// handlers/simpleHandler.js - 단순 블록 위치/사용법 안내 (RAG 검색 포함)

class SimpleHandler {
  constructor() {
    this.categoryInfo = {
      start: { name: "시작", emoji: "▶️", color: "#4CAF50" },
      moving: { name: "움직임", emoji: "🏃", color: "#2196F3" },
      looks: { name: "생김새", emoji: "🎨", color: "#9C27B0" },
      sound: { name: "소리", emoji: "🔊", color: "#FF9800" },
      judgement: { name: "판단", emoji: "❓", color: "#F44336" },
      flow: { name: "흐름", emoji: "🔄", color: "#FF5722" },
      variable: { name: "자료", emoji: "📦", color: "#795548" },
      func: { name: "함수", emoji: "📝", color: "#607D8B" },
      calc: { name: "계산", emoji: "🔢", color: "#009688" },
      brush: { name: "붓", emoji: "🖌️", color: "#E91E63" },
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
    console.log(`🎯 최상위 블록 선택: ${topBlock.name} (점수: ${topBlock._searchScore})`);

    // 단일 블록 응답 생성
    return this.generateSingleBlockResponse(topBlock);
  }

  /**
   * 단일 블록 응답 생성 - RAG 데이터 최대한 활용
   */
  generateSingleBlockResponse(block) {
    const category = this.categoryInfo[block.category] || { name: block.category, emoji: "📌" };

    let response = `## 🎯 "${block.name}" 블록을 찾았어요!\n\n`;

    // 위치 정보
    response += `### 📍 블록 위치\n`;
    response += `${category.emoji} **${category.name}** 카테고리에서 찾을 수 있어요.\n\n`;

    // 블록 설명 (RAG 데이터)
    if (block.description) {
      response += `### 💡 블록 설명\n`;
      response += `${block.description}\n\n`;
    }

    // 사용 방법 (RAG 데이터의 usage_steps 또는 usage_context)
    response += `### 📝 사용 방법\n`;
    response += this.getUsageGuide(block);

    // 파라미터 정보 (RAG 데이터)
    if (block.parameters && Object.keys(block.parameters).length > 0) {
      response += `\n\n### ⚙️ 설정 가능한 값\n`;
      for (const [key, value] of Object.entries(block.parameters)) {
        response += `- **${key}**: ${value}\n`;
      }
    }

    // 예시 (RAG 데이터의 example 또는 common_questions)
    if (block.example) {
      response += `\n### 🎮 예시\n`;
      response += `${block.example}\n`;
    } else if (block.common_questions && block.common_questions.length > 0) {
      response += `\n### 🎮 자주 사용되는 경우\n`;
      response += `- ${block.common_questions[0]}\n`;
    }

    // 관련 블록 (RAG 데이터)
    if (block.related_blocks && block.related_blocks.length > 0) {
      response += `\n### 🔗 함께 사용하면 좋은 블록\n`;
      block.related_blocks.forEach((related) => {
        if (typeof related === "string") {
          response += `- ${related}\n`;
        } else if (related.block_id) {
          response += `- ${related.block_id}`;
          if (related.explanation) {
            response += `: ${related.explanation}`;
          }
          response += `\n`;
        }
      });
    }

    // 팁 (RAG 데이터)
    response += `\n### 💭 팁\n`;
    response += this.getTip(block);

    return {
      success: true,
      response: response,
      type: "simple",
      blockInfo: block,
    };
  }

  /**
   * 여러 블록 응답 생성
   */
  generateMultipleBlocksResponse(blocks) {
    let response = `## 🎯 관련 블록들을 찾았어요!\n\n`;

    // 카테고리별로 그룹화
    const grouped = this.groupByCategory(blocks);

    for (const [categoryKey, categoryBlocks] of Object.entries(grouped)) {
      const category = this.categoryInfo[categoryKey] || { name: categoryKey, emoji: "📌" };

      response += `### ${category.emoji} ${category.name} 카테고리\n`;

      categoryBlocks.forEach((block) => {
        response += `- **${block.name}**`;
        if (block.description) {
          const shortDesc = block.description.length > 50 ? block.description.substring(0, 50) + "..." : block.description;
          response += `: ${shortDesc}`;
        }
        response += `\n`;
      });

      response += `\n`;
    }

    response += `### 💡 다음 단계\n`;
    response += `원하는 블록을 찾으셨나요? 구체적인 사용법이 궁금하시면 블록 이름을 말씀해주세요!`;

    return {
      success: true,
      response: response,
      type: "simple-multiple",
      blocks: blocks,
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
      if (decomposed.trigger) response += `- 시작 조건: ${decomposed.trigger}\n`;
      if (decomposed.action) response += `- 동작: ${decomposed.action}\n`;
      if (decomposed.target) response += `- 대상: ${decomposed.target}\n`;
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
      return block.step_by_step_guide.map((step) => `${step.step}. ${step.title}: ${step.instruction}`).join("\n");
    }

    // usage_steps가 있으면 사용
    if (block.usage_steps && Array.isArray(block.usage_steps)) {
      return block.usage_steps.map((step, idx) => `${idx + 1}. ${step}`).join("\n");
    }

    // usage_context가 있으면 활용
    if (block.usage_context && Array.isArray(block.usage_context)) {
      return block.usage_context.join("\n");
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

    // tips가 있으면 사용
    if (block.tips && Array.isArray(block.tips) && block.tips.length > 0) {
      return block.tips[0];
    }

    // common_mistakes가 있으면 주의사항으로 활용
    if (block.common_mistakes && Array.isArray(block.common_mistakes) && block.common_mistakes.length > 0) {
      const mistake = block.common_mistakes[0];
      if (mistake.solution) {
        return `⚠️ 주의: ${mistake.solution}`;
      }
    }

    // 기본 팁
    return "블록을 드래그해서 연결하면 프로그램이 완성돼요!";
  }
}

// Export for Service Worker
if (typeof self !== "undefined") {
  self.SimpleHandler = SimpleHandler;
}
