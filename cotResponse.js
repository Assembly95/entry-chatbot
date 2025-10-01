// cotResponse.js - Chain of Thought Response Generator for Entry Block Helper

/**
 * CoT Response Generator
 * 복잡한 질문에 대한 단계별 사고 과정을 포함한 응답 생성
 */
class CoTResponseGenerator {
  constructor() {
    this.projectTemplates = {
      슈팅게임: {
        steps: [
          "플레이어 캐릭터 설정하기",
          "키보드로 캐릭터 움직이기",
          "총알 발사 구현하기",
          "적 캐릭터 만들기",
          "충돌 감지 추가하기",
          "점수 시스템 만들기",
          "게임 오버 조건 설정하기",
        ],
        blocks: ["when_some_key_pressed", "move_direction", "create_clone", "is_touched", "set_variable"],
      },
      미로게임: {
        steps: [
          "미로 맵 디자인하기",
          "플레이어 시작 위치 설정",
          "방향키로 이동 구현",
          "벽 충돌 감지",
          "목표 지점 도달 체크",
          "타이머 추가하기",
        ],
        blocks: ["when_some_key_pressed", "move_x", "move_y", "is_touched", "_if", "repeat_basic"],
      },
      점프게임: {
        steps: [
          "캐릭터 기본 이동 설정",
          "중력 효과 구현",
          "점프 동작 만들기",
          "장애물 생성 및 이동",
          "충돌 감지",
          "점수 및 라이프 시스템",
        ],
        blocks: ["when_some_key_pressed", "change_y", "repeat_inf", "is_touched", "set_variable"],
      },
    };
  }

  /**
   * CoT 응답 생성 메인 함수
   */
  async generateResponse(question, classification, ragResults) {
    console.log("🧠 CoT Response 생성 시작");
    console.log("  - 질문 타입:", classification.type);
    console.log("  - 키워드:", classification.keywords);

    let response = "";

    switch (classification.type) {
      case "complex":
        response = await this.generateComplexResponse(question, classification, ragResults);
        break;
      case "debug":
        response = await this.generateDebugResponse(question, classification, ragResults);
        break;
      case "conceptual":
        response = await this.generateConceptualResponse(question, classification, ragResults);
        break;
      default:
        response = await this.generateDefaultCotResponse(question, classification, ragResults);
    }

    return response;
  }

  /**
   * 복잡한 프로젝트 관련 응답
   */
  async generateComplexResponse(question, classification, ragResults) {
    let response = "## 🎮 프로젝트 만들기 가이드\n\n";

    // 프로젝트 타입 식별
    const projectType = this.identifyProjectType(question, classification.keywords);

    if (projectType && this.projectTemplates[projectType]) {
      const template = this.projectTemplates[projectType];

      response += `### "${projectType}" 만들기\n\n`;
      response += "프로젝트를 단계별로 만들어볼게요!\n\n";

      // 사고 과정 표시
      response += "**💭 생각 과정:**\n";
      response += "1. 먼저 필요한 기능들을 파악하고\n";
      response += "2. 각 기능에 맞는 블록을 찾아서\n";
      response += "3. 단계별로 구현해나가면 됩니다\n\n";

      // 단계별 가이드
      response += "**📋 구현 단계:**\n\n";
      template.steps.forEach((step, index) => {
        response += `**${index + 1}단계: ${step}**\n`;
        response += this.getStepDetails(step, ragResults);
        response += "\n";
      });

      // 필요한 주요 블록들
      response += "\n**🔧 필요한 주요 블록:**\n";
      template.blocks.forEach((blockType) => {
        const block = this.findBlockInRag(blockType, ragResults);
        if (block) {
          response += `• **${block.name}** (${this.getCategoryName(block.category)})\n`;
        }
      });

      // 추가 팁
      response += "\n**💡 팁:**\n";
      response += "• 작은 기능부터 하나씩 완성해가세요\n";
      response += "• 자주 테스트하면서 문제를 바로바로 해결하세요\n";
      response += "• 변수를 활용해서 게임 상태를 관리하세요\n";
    } else {
      // 일반적인 프로젝트 가이드
      response += "프로젝트를 만들 때는 다음과 같은 순서로 접근해보세요:\n\n";
      response += "**1. 기획 단계** 🎯\n";
      response += "   • 무엇을 만들지 명확히 정하기\n";
      response += "   • 필요한 기능 리스트 작성\n\n";

      response += "**2. 기본 구조 만들기** 🏗️\n";
      response += "   • 시작 이벤트 블록 배치\n";
      response += "   • 기본 동작 구현\n\n";

      response += "**3. 기능 추가** ⚙️\n";
      response += "   • 조건문으로 게임 규칙 추가\n";
      response += "   • 변수로 점수/상태 관리\n\n";

      response += "**4. 테스트 및 개선** 🔧\n";
      response += "   • 버그 찾아 수정\n";
      response += "   • 난이도 조절\n";
    }

    return response;
  }

  /**
   * 디버깅 관련 응답
   */
  async generateDebugResponse(question, classification, ragResults) {
    let response = "## 🔍 문제 해결 가이드\n\n";

    response += "**💭 문제 분석 과정:**\n";
    response += "1. 어떤 동작을 기대했는지 확인\n";
    response += "2. 실제로 어떻게 동작하는지 관찰\n";
    response += "3. 차이가 나는 부분 찾기\n";
    response += "4. 해당 부분의 블록 확인\n\n";

    // 일반적인 문제들과 해결법
    response += "**🔧 자주 발생하는 문제들:**\n\n";

    if (question.includes("안 움직") || question.includes("안움직")) {
      response += "**📍 캐릭터가 움직이지 않는 경우:**\n";
      response += "• 시작 이벤트 블록이 있는지 확인\n";
      response += "• 이동 블록의 값이 0이 아닌지 확인\n";
      response += "• 반복 블록 안에 이동 블록이 있는지 확인\n\n";
    }

    if (question.includes("충돌") || question.includes("닿")) {
      response += "**📍 충돌 감지가 안 되는 경우:**\n";
      response += "• 오브젝트 이름이 정확한지 확인\n";
      response += "• 충돌 감지 블록이 반복문 안에 있는지 확인\n";
      response += "• 오브젝트들이 실제로 겹치는지 확인\n\n";
    }

    if (question.includes("반복") || question.includes("멈춰") || question.includes("멈춤")) {
      response += "**📍 반복이 제대로 안 되는 경우:**\n";
      response += "• 무한 반복인지 횟수 반복인지 확인\n";
      response += "• 반복 조건이 올바른지 확인\n";
      response += "• 반복 블록 안에 대기 시간이 있는지 확인\n\n";
    }

    // 디버깅 팁
    response += "**🎯 디버깅 팁:**\n";
    response += "• 말하기 블록으로 변수 값 확인하기\n";
    response += "• 한 부분씩 나누어서 테스트하기\n";
    response += "• 속도를 느리게 해서 관찰하기\n";
    response += "• 블록을 하나씩 비활성화하며 원인 찾기\n";

    return response;
  }

  /**
   * 개념 설명 응답
   */
  async generateConceptualResponse(question, classification, ragResults) {
    let response = "## 📚 프로그래밍 개념 설명\n\n";

    const keywords = classification.keywords;

    response += "**💭 이해를 돕기 위한 설명:**\n\n";

    // 주요 개념별 설명
    if (keywords.some((k) => k.includes("반복"))) {
      response += "**🔄 반복이란?**\n";
      response += "같은 동작을 여러 번 실행하는 것을 말해요.\n";
      response += "• 예시: 10걸음 걷기 = 1걸음 걷기를 10번 반복\n";
      response += "• 장점: 코드가 간결해지고 수정이 쉬워요\n\n";

      response += "**반복의 종류:**\n";
      response += "1. **횟수 반복**: 정해진 횟수만큼 반복\n";
      response += "2. **무한 반복**: 끝나지 않고 계속 반복\n";
      response += "3. **조건 반복**: 조건이 참인 동안 반복\n\n";
    }

    if (keywords.some((k) => k.includes("조건") || k.includes("만약"))) {
      response += "**❓ 조건문이란?**\n";
      response += "특정 조건에 따라 다른 동작을 하는 것을 말해요.\n";
      response += '• 예시: "만약 비가 온다면 우산을 쓴다"\n';
      response += "• 장점: 상황에 따른 유연한 처리 가능\n\n";

      response += "**조건문 활용:**\n";
      response += "• 게임 오버 체크\n";
      response += "• 충돌 감지\n";
      response += "• 점수에 따른 레벨 변경\n\n";
    }

    if (keywords.some((k) => k.includes("변수"))) {
      response += "**📦 변수란?**\n";
      response += "데이터를 저장하는 상자라고 생각하면 돼요.\n";
      response += "• 예시: 점수, 생명, 레벨 등을 저장\n";
      response += "• 특징: 언제든지 값을 바꿀 수 있어요\n\n";

      response += "**변수 사용법:**\n";
      response += "1. **만들기**: 변수 생성\n";
      response += "2. **정하기**: 값을 설정\n";
      response += "3. **바꾸기**: 값을 증가/감소\n";
      response += "4. **사용하기**: 조건이나 계산에 활용\n\n";
    }

    if (keywords.some((k) => k.includes("함수"))) {
      response += "**📝 함수란?**\n";
      response += "여러 블록을 하나로 묶어 이름을 붙인 것이에요.\n";
      response += '• 예시: "점프하기" 함수 = 여러 동작을 묶음\n';
      response += "• 장점: 재사용 가능, 코드 정리\n\n";
    }

    // 실습 제안
    response += "**🎯 실습해보기:**\n";
    response += "간단한 예제를 만들어보면서 개념을 익혀보세요!\n";
    response += "• 반복: 도형 그리기\n";
    response += "• 조건: 클릭 게임\n";
    response += "• 변수: 카운터 만들기\n";

    return response;
  }

  /**
   * 기본 CoT 응답
   */
  async generateDefaultCotResponse(question, classification, ragResults) {
    let response = "## 💡 도움말\n\n";

    response += "**💭 분석 과정:**\n";
    response += `질문을 분석한 결과, ${classification.type} 관련 내용으로 보입니다.\n\n`;

    if (ragResults && ragResults.length > 0) {
      response += "**📌 관련 블록:**\n";
      ragResults.slice(0, 3).forEach((block) => {
        response += `• **${block.name}** - ${block.description || "관련 블록"}\n`;
      });
      response += "\n";
    }

    response += "**🎯 추천 접근 방법:**\n";
    response += "1. 목표를 명확히 정의하기\n";
    response += "2. 필요한 블록 찾기\n";
    response += "3. 단계별로 구현하기\n";
    response += "4. 테스트 및 수정하기\n";

    return response;
  }

  /**
   * 헬퍼 메서드들
   */
  identifyProjectType(question, keywords) {
    const questionLower = question.toLowerCase();

    if (questionLower.includes("슈팅") || questionLower.includes("총")) {
      return "슈팅게임";
    }
    if (questionLower.includes("미로")) {
      return "미로게임";
    }
    if (questionLower.includes("점프") || questionLower.includes("플랫폼")) {
      return "점프게임";
    }

    return null;
  }

  getStepDetails(step, ragResults) {
    const stepDetails = {
      "플레이어 캐릭터 설정하기": "• 오브젝트 추가하기\n• 시작 위치 설정 (x:0, y:0)\n• 크기와 모양 조절",
      "키보드로 캐릭터 움직이기": '• "~키를 눌렀을 때" 블록 사용\n• 방향키마다 이동 블록 연결\n• 이동 속도 조절',
      "총알 발사 구현하기": "• 스페이스키 입력 감지\n• 복제본 생성하기 블록 사용\n• 총알 이동 방향 설정",
      "적 캐릭터 만들기": "• 새 오브젝트 추가\n• 무작위 위치 생성\n• 자동 이동 패턴 설정",
      "충돌 감지 추가하기": '• "~에 닿았는가?" 블록 사용\n• 조건문으로 처리\n• 효과음이나 애니메이션 추가',
      "점수 시스템 만들기": "• 점수 변수 생성\n• 충돌 시 점수 증가\n• 화면에 점수 표시",
      "게임 오버 조건 설정하기": "• 생명 변수 추가\n• 조건 확인 후 모든 스크립트 정지\n• 게임 오버 메시지 표시",
    };

    return stepDetails[step] || "• 관련 블록을 찾아 구현해보세요";
  }

  findBlockInRag(blockType, ragResults) {
    if (!ragResults) return null;
    return ragResults.find((block) => block.type === blockType);
  }

  getCategoryName(category) {
    const categoryNames = {
      start: "시작",
      flow: "흐름",
      moving: "움직임",
      looks: "생김새",
      sound: "소리",
      judgement: "판단",
      calc: "계산",
      variable: "자료",
      func: "함수",
      hardware: "하드웨어",
    };

    return categoryNames[category] || category;
  }
}

// Service Worker 환경에서 사용 가능하도록 export
if (typeof self !== "undefined") {
  self.CoTResponseGenerator = CoTResponseGenerator;
}

// Node.js 환경 지원
if (typeof module !== "undefined" && module.exports) {
  module.exports = CoTResponseGenerator;
}
