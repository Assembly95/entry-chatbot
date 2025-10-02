// debugHandler.js - 디버그 및 오류 해결 가이드

class DebugHandler {
  constructor() {
    this.commonMistakes = {
      notWorking: {
        title: "작동하지 않음",
        checklist: [
          "실행 버튼(▶️)을 먼저 클릭했나요?",
          "블록이 서로 연결되어 있나요? (선으로 이어짐)",
          "시작 이벤트 블록이 있나요? (녹색 블록)",
          "올바른 오브젝트를 선택했나요?",
        ],
      },
      notMoving: {
        title: "움직이지 않음",
        checklist: [
          "이동 거리가 0이 아닌지 확인",
          "반복 블록 안에 이동 블록이 있는지 확인",
          "오브젝트가 화면 밖으로 나가지 않았는지 확인",
          "다른 코드가 움직임을 막고 있지 않은지 확인",
        ],
      },
      collision: {
        title: "충돌 감지 안됨",
        checklist: [
          "오브젝트 이름이 정확한지 확인",
          "충돌 감지 블록이 반복문 안에 있는지 확인",
          "오브젝트들이 실제로 겹치는지 확인",
          "투명도 때문에 안 보이는 것은 아닌지 확인",
        ],
      },
      variable: {
        title: "변수 문제",
        checklist: [
          "변수를 먼저 생성했나요?",
          "변수 이름이 정확한가요?",
          "변수 초기값을 설정했나요?",
          "변수를 화면에 표시했나요?",
        ],
      },
      infinite: {
        title: "무한 루프/멈춤",
        checklist: [
          "무한 반복 안에 대기 시간이 있나요?",
          "종료 조건이 있나요?",
          "너무 많은 복제본을 생성하지 않나요?",
          "조건이 절대 참이 되지 않는 것은 아닌가요?",
        ],
      },
    };
  }

  /**
   * 디버그 질문 처리 메인 함수
   */
  async handle(decomposed, ragResults, message) {
    console.log("🐛 DebugHandler 처리 시작");

    // 문제 유형 파악
    const problemType = this.identifyProblemType(message);

    // 대화형 디버깅 시작
    if (problemType === "unknown") {
      return this.startInteractiveDebug();
    }

    // 특정 문제에 대한 체크리스트 제공
    return this.generateDebugChecklist(problemType, message);
  }

  /**
   * 문제 유형 식별
   */
  identifyProblemType(message) {
    const lower = message.toLowerCase();

    if (lower.includes("안 움직") || lower.includes("움직이지")) {
      return "notMoving";
    }
    if (lower.includes("충돌") || lower.includes("닿")) {
      return "collision";
    }
    if (lower.includes("변수") || lower.includes("점수")) {
      return "variable";
    }
    if (lower.includes("무한") || lower.includes("멈춰") || lower.includes("멈춤")) {
      return "infinite";
    }
    if (lower.includes("작동") || lower.includes("안돼") || lower.includes("안됨")) {
      return "notWorking";
    }

    return "unknown";
  }

  /**
   * 디버그 체크리스트 생성
   */
  generateDebugChecklist(problemType, message) {
    const problem = this.commonMistakes[problemType] || this.commonMistakes.notWorking;

    let response = `## 🔍 문제 해결 도우미\n\n`;
    response += `### 🐛 문제: "${problem.title}"\n\n`;

    // 체크리스트
    response += `### ✅ 확인 사항\n\n`;
    problem.checklist.forEach((item, index) => {
      response += `**${index + 1}.** ${item}\n`;
    });

    response += `\n### 🔧 디버깅 단계\n\n`;
    response += this.getDebugSteps(problemType);

    response += `\n### 💡 추가 팁\n`;
    response += this.getDebugTips(problemType);

    response += `\n### 🤔 여전히 해결이 안 되나요?\n`;
    response += `사용 중인 블록들을 알려주시면 더 구체적으로 도와드릴게요!\n`;
    response += `예: "반복 블록 안에 이동 블록을 넣었는데 안 움직여요"`;

    return {
      response: response,
      type: "debug-checklist",
      problemType: problemType,
      requiresMoreInfo: false,
    };
  }

  /**
   * 대화형 디버깅 시작
   */
  startInteractiveDebug() {
    let response = `## 🔍 문제 해결 도우미\n\n`;
    response += `무엇이 잘 안 되고 있나요? 함께 해결해봐요!\n\n`;

    response += `### 📋 어떤 문제인가요?\n\n`;
    response += `1️⃣ **작동 자체가 안 돼요**\n`;
    response += `   → "아무것도 실행이 안 돼요"\n\n`;

    response += `2️⃣ **움직임 문제**\n`;
    response += `   → "캐릭터가 안 움직여요"\n\n`;

    response += `3️⃣ **충돌/감지 문제**\n`;
    response += `   → "닿았는데 반응이 없어요"\n\n`;

    response += `4️⃣ **변수/점수 문제**\n`;
    response += `   → "점수가 안 올라가요"\n\n`;

    response += `5️⃣ **무한 루프/멈춤**\n`;
    response += `   → "프로그램이 멈춰요"\n\n`;

    response += `### 💬 다음 정보를 알려주세요:\n`;
    response += `• 어떤 블록들을 사용했나요?\n`;
    response += `• 어떤 동작을 기대했나요?\n`;
    response += `• 실제로는 어떻게 작동하나요?\n`;

    return {
      response: response,
      type: "debug-interactive",
      requiresMoreInfo: true,
    };
  }

  /**
   * 문제별 디버깅 단계
   */
  getDebugSteps(problemType) {
    const steps = {
      notWorking:
        `1. **실행 버튼** 클릭 확인\n` +
        `2. **시작 이벤트 블록** 확인 (녹색)\n` +
        `3. **블록 연결** 상태 확인\n` +
        `4. **오브젝트 선택** 확인\n` +
        `5. 하나씩 블록을 제거하며 테스트`,

      notMoving:
        `1. **이동 거리** 값 확인 (0이 아닌지)\n` +
        `2. **방향** 설정 확인\n` +
        `3. **반복 블록** 사용 확인\n` +
        `4. **좌표** 직접 확인 (x, y 표시)\n` +
        `5. 다른 블록이 움직임을 막는지 확인`,

      collision:
        `1. **오브젝트 이름** 정확히 입력\n` +
        `2. **반복문 안**에 감지 블록 넣기\n` +
        `3. **실제 충돌** 테스트 (천천히 이동)\n` +
        `4. **조건문** 올바르게 설정\n` +
        `5. 충돌 시 동작 블록 확인`,

      variable:
        `1. **변수 생성** 먼저 하기\n` +
        `2. **초기값** 설정 (보통 0)\n` +
        `3. **변수 이름** 정확히 사용\n` +
        `4. **변수 표시** 블록 추가\n` +
        `5. 변수 변경 시점 확인`,

      infinite:
        `1. **대기 시간** 추가 (0.1초라도)\n` +
        `2. **종료 조건** 설정\n` +
        `3. **복제본 개수** 제한\n` +
        `4. **조건문** 로직 검토\n` +
        `5. 강제 정지 후 코드 수정`,
    };

    return steps[problemType] || steps.notWorking;
  }

  /**
   * 문제별 디버깅 팁
   */
  getDebugTips(problemType) {
    const tips = {
      notWorking:
        `• **말하기 블록**을 추가해서 어디까지 실행되는지 확인해보세요\n` +
        `• 가장 간단한 코드부터 시작해서 하나씩 추가해보세요\n` +
        `• 다른 오브젝트의 코드가 간섭하지 않는지 확인하세요`,

      notMoving:
        `• 좌표를 화면에 표시해서 실제로 변하는지 확인해보세요\n` +
        `• 이동 거리를 크게(50, 100) 설정해서 테스트해보세요\n` +
        `• 오브젝트가 숨김 상태는 아닌지 확인하세요`,

      collision:
        `• 충돌 감지 범위를 시각적으로 확인해보세요\n` +
        `• 오브젝트 크기를 크게 해서 테스트해보세요\n` +
        `• "말하기" 블록으로 충돌 여부를 표시해보세요`,

      variable:
        `• 변수값을 "말하기" 블록으로 확인해보세요\n` +
        `• 변수 이름에 오타가 없는지 다시 확인하세요\n` +
        `• 다른 곳에서 변수를 0으로 만들지 않는지 확인하세요`,

      infinite:
        `• Shift + 클릭으로 강제 정지할 수 있어요\n` +
        `• 반복 횟수를 제한해서 테스트해보세요\n` +
        `• 조건을 반대로 바꿔서 테스트해보세요`,
    };

    return tips[problemType] || tips.notWorking;
  }

  /**
   * 추가 정보 요청
   */
  requestMoreInfo(problemType) {
    const questions = {
      notWorking: ["어떤 시작 블록을 사용했나요?", "실행 버튼을 눌렀을 때 아무 반응이 없나요?", "오브젝트는 몇 개 사용하나요?"],
      notMoving: ["이동 블록의 숫자는 얼마로 설정했나요?", "반복 블록을 사용했나요?", "어느 방향으로 움직이게 하려고 했나요?"],
      collision: [
        "어떤 오브젝트끼리 충돌을 감지하려고 하나요?",
        "충돌 감지 블록을 반복문 안에 넣었나요?",
        "충돌했을 때 어떤 동작을 하게 했나요?",
      ],
    };

    return questions[problemType] || questions.notWorking;
  }

  /**
   * 해결 확인 메시지
   */
  generateSolutionConfirmation() {
    return (
      `### 🎉 해결되었나요?\n\n` +
      `**해결됨**: 다른 도움이 필요하시면 말씀해주세요!\n` +
      `**아직 안됨**: 사용한 블록 구성을 자세히 알려주세요.\n\n` +
      `디버깅은 프로그래밍의 중요한 과정이에요. 포기하지 마세요! 💪`
    );
  }
}

// Export for Service Worker
if (typeof self !== "undefined") {
  self.DebugHandler = DebugHandler;
}
