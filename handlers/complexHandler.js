// complexHandler.js - 복합 동작 단계별 안내 (CoT 방식)

class ComplexHandler {
  constructor() {
    this.stepTemplates = {
      trigger: {
        title: "시작 이벤트 설정",
        icon: "🎯",
        instructions: "프로그램이 시작될 조건을 만들어요",
      },
      object: {
        title: "오브젝트 선택",
        icon: "👤",
        instructions: "동작을 수행할 대상을 선택해요",
      },
      action: {
        title: "동작 블록 추가",
        icon: "⚡",
        instructions: "실행할 동작을 연결해요",
      },
      value: {
        title: "값 설정",
        icon: "🔧",
        instructions: "블록의 세부 값을 조정해요",
      },
      condition: {
        title: "조건 추가",
        icon: "❓",
        instructions: "특정 상황에서만 실행되도록 설정해요",
      },
      test: {
        title: "테스트 및 완성",
        icon: "✅",
        instructions: "작동을 확인하고 완성해요",
      },
    };
  }

  /**
   * 복합 질문 처리 메인 함수
   */
  async handle(decomposed, ragResults, message) {
    console.log("🎮 ComplexHandler 처리 시작");

    // 의도 분해가 없으면 기본 응답
    if (!decomposed) {
      return this.generateBasicComplexGuide(message);
    }

    // 단계별 시퀀스 생성
    const steps = this.generateStepSequence(decomposed, ragResults);

    // CoT 형식으로 포맷팅
    const cotSequence = {
      totalSteps: steps.length,
      currentStep: 1,
      steps: steps,
    };

    // 초기 응답 생성 (첫 번째 단계)
    const initialResponse = this.formatInitialResponse(steps, cotSequence.totalSteps);

    return {
      response: initialResponse,
      type: "cot",
      cotSequence: cotSequence,
      decomposed: decomposed,
    };
  }

  /**
   * 단계별 시퀀스 생성
   */
  generateStepSequence(decomposed, ragResults) {
    const steps = [];
    let stepNumber = 1;

    // Step 1: 시작 이벤트 (트리거)
    if (decomposed.trigger) {
      steps.push(this.createTriggerStep(stepNumber++, decomposed.trigger, ragResults));
    }

    // Step 2: 오브젝트 선택 (필요한 경우)
    if (decomposed.target && decomposed.target !== "이 오브젝트") {
      steps.push(this.createObjectStep(stepNumber++, decomposed.target));
    }

    // Step 3: 메인 동작
    if (decomposed.action) {
      steps.push(this.createActionStep(stepNumber++, decomposed.action, decomposed.direction, ragResults));
    }

    // Step 4: 조건 (있는 경우)
    if (decomposed.condition) {
      steps.push(this.createConditionStep(stepNumber++, decomposed.condition, ragResults));
    }

    // Step 5: 값 조정
    if (decomposed.direction || decomposed.action) {
      steps.push(this.createValueStep(stepNumber++, decomposed));
    }

    // Step 6: 테스트
    steps.push(this.createTestStep(stepNumber++, decomposed));

    return steps;
  }

  /**
   * 트리거 단계 생성
   */
  createTriggerStep(stepNumber, trigger, ragResults) {
    const blockMap = {
      스페이스키: "when_some_key_pressed",
      스페이스: "when_some_key_pressed",
      클릭: "when_object_click",
      시작: "when_run_button_click",
      메시지: "when_message_cast",
    };

    let blockType = "when_run_button_click";
    for (const [key, value] of Object.entries(blockMap)) {
      if (trigger.includes(key)) {
        blockType = value;
        break;
      }
    }

    return {
      stepNumber: stepNumber,
      title: "시작 이벤트 설정하기",
      content:
        `### 🎯 ${trigger} 조건 만들기\n\n` +
        `**사용할 블록**: [${this.getBlockDisplayName(blockType)}]\n\n` +
        `📍 **위치**: 시작 카테고리 (녹색)\n\n` +
        `**따라하기**:\n` +
        `1. 왼쪽 블록 팔레트에서 "시작" 카테고리 클릭\n` +
        `2. "${this.getBlockDisplayName(blockType)}" 블록 찾기\n` +
        `3. 블록을 작업 영역으로 드래그\n` +
        `${blockType === "when_some_key_pressed" ? '4. 블록의 드롭다운에서 "스페이스" 선택\n' : ""}\n` +
        `💡 **팁**: 이 블록이 프로그램의 시작점이 됩니다!`,
      blockType: blockType,
      category: "start",
      completed: false,
    };
  }

  /**
   * 오브젝트 선택 단계 생성
   */
  createObjectStep(stepNumber, target) {
    return {
      stepNumber: stepNumber,
      title: "오브젝트 선택하기",
      content:
        `### 👤 ${target} 선택\n\n` +
        `**작업 대상 설정**\n\n` +
        `**따라하기**:\n` +
        `1. 화면 아래 오브젝트 목록 확인\n` +
        `2. "${target}" 클릭하여 선택\n` +
        `3. 선택된 오브젝트가 하이라이트됨\n\n` +
        `💡 **팁**: 선택된 오브젝트에 코드가 적용됩니다!`,
      blockType: null,
      category: "object",
      completed: false,
    };
  }

  /**
   * 동작 단계 생성
   */
  createActionStep(stepNumber, action, direction, ragResults) {
    const actionMap = {
      이동: { block: "move_direction", category: "moving" },
      움직: { block: "move_direction", category: "moving" },
      회전: { block: "rotate_relative", category: "moving" },
      말하: { block: "say", category: "looks" },
      소리: { block: "play_sound", category: "sound" },
      반복: { block: "repeat_basic", category: "flow" },
    };

    let blockInfo = { block: "move_direction", category: "moving" };
    for (const [key, value] of Object.entries(actionMap)) {
      if (action.includes(key)) {
        blockInfo = value;
        break;
      }
    }

    return {
      stepNumber: stepNumber,
      title: "동작 블록 연결하기",
      content:
        `### ⚡ ${action} 동작 추가\n\n` +
        `**사용할 블록**: [${this.getBlockDisplayName(blockInfo.block)}]\n\n` +
        `📍 **위치**: ${this.getCategoryKorean(blockInfo.category)} 카테고리\n\n` +
        `**따라하기**:\n` +
        `1. "${this.getCategoryKorean(blockInfo.category)}" 카테고리 클릭\n` +
        `2. "${this.getBlockDisplayName(blockInfo.block)}" 블록 찾기\n` +
        `3. Step 1의 블록 아래에 연결\n` +
        `   (블록이 자석처럼 달라붙습니다!)\n\n` +
        `💡 **팁**: 블록이 제대로 연결되면 선이 이어집니다!`,
      blockType: blockInfo.block,
      category: blockInfo.category,
      completed: false,
    };
  }

  /**
   * 조건 단계 생성
   */
  createConditionStep(stepNumber, condition, ragResults) {
    return {
      stepNumber: stepNumber,
      title: "조건 설정하기",
      content:
        `### ❓ ${condition} 조건 추가\n\n` +
        `**사용할 블록**: [만약 ~라면]\n\n` +
        `📍 **위치**: 흐름 카테고리\n\n` +
        `**따라하기**:\n` +
        `1. "흐름" 카테고리에서 조건 블록 찾기\n` +
        `2. 조건 블록을 동작 블록 위에 추가\n` +
        `3. 조건 설정 (판단 블록 사용)\n` +
        `4. 동작 블록을 조건 블록 안으로 이동\n\n` +
        `💡 **팁**: 조건이 참일 때만 동작이 실행됩니다!`,
      blockType: "_if",
      category: "flow",
      completed: false,
    };
  }

  /**
   * 값 설정 단계 생성
   */
  createValueStep(stepNumber, decomposed) {
    const direction = decomposed.direction || "기본값";
    const directionGuide = this.getDirectionGuide(direction);

    return {
      stepNumber: stepNumber,
      title: "세부 값 조정하기",
      content:
        `### 🔧 블록 값 설정\n\n` +
        `**조정할 값들**:\n\n` +
        directionGuide +
        `\n**따라하기**:\n` +
        `1. 숫자 부분을 클릭\n` +
        `2. 원하는 값 입력\n` +
        `3. 방향 화살표 클릭으로 방향 변경\n\n` +
        `💡 **실험해보기**:\n` +
        `• 큰 숫자 = 빠른/많은 동작\n` +
        `• 작은 숫자 = 느린/적은 동작\n` +
        `• 음수 = 반대 방향`,
      blockType: null,
      category: "setting",
      completed: false,
    };
  }

  /**
   * 테스트 단계 생성
   */
  createTestStep(stepNumber, decomposed) {
    const trigger = decomposed.trigger || "시작 버튼";
    const expectedResult = this.getExpectedResult(decomposed);

    return {
      stepNumber: stepNumber,
      title: "테스트하고 완성하기",
      content:
        `### ✅ 작동 확인\n\n` +
        `**실행 방법**:\n` +
        `1. ▶️ 실행 버튼 클릭\n` +
        `2. ${trigger} 실행\n\n` +
        `**예상 결과**:\n` +
        `${expectedResult}\n\n` +
        `**문제 해결**:\n` +
        `❌ 작동하지 않나요?\n` +
        `• 블록이 모두 연결되었는지 확인\n` +
        `• 실행 버튼을 먼저 눌렀는지 확인\n` +
        `• 오브젝트가 올바르게 선택되었는지 확인\n\n` +
        `🎉 **축하합니다!** 프로그램을 완성했어요!`,
      blockType: null,
      category: "test",
      completed: false,
    };
  }

  /**
   * 초기 응답 포맷팅
   */
  formatInitialResponse(steps, totalSteps) {
    if (steps.length === 0) {
      return "단계를 생성할 수 없습니다.";
    }

    const firstStep = steps[0];

    return (
      `# 🎮 블록 코딩 단계별 가이드\n\n` +
      `📊 **전체 진행**: 1 / ${totalSteps} 단계\n\n` +
      `---\n\n` +
      `## Step ${firstStep.stepNumber}: ${firstStep.title}\n\n` +
      `${firstStep.content}\n\n` +
      `---\n\n` +
      `**네비게이션**: [다음 단계 →] 버튼을 클릭하세요`
    );
  }

  /**
   * 기본 복합 가이드 (의도 분해 실패시)
   */
  generateBasicComplexGuide(message) {
    return {
      response:
        `## 🎮 프로젝트 만들기 가이드\n\n` +
        `복잡한 동작을 만들려면 여러 블록을 조합해야 해요!\n\n` +
        `### 일반적인 순서:\n` +
        `1. **시작 이벤트** 설정 (언제 실행?)\n` +
        `2. **동작 블록** 추가 (무엇을 할까?)\n` +
        `3. **조건** 추가 (특별한 상황?)\n` +
        `4. **반복** 설정 (계속 실행?)\n` +
        `5. **테스트** (잘 작동하나?)\n\n` +
        `구체적으로 무엇을 만들고 싶은지 다시 설명해주세요!`,
      type: "complex-basic",
    };
  }

  /**
   * 헬퍼 함수들
   */
  getBlockDisplayName(blockType) {
    const names = {
      when_some_key_pressed: "~키를 눌렀을 때",
      when_run_button_click: "시작하기 버튼을 클릭했을 때",
      when_object_click: "이 오브젝트를 클릭했을 때",
      move_direction: "~만큼 움직이기",
      rotate_relative: "~도 회전하기",
      repeat_basic: "~번 반복하기",
      _if: "만약 ~라면",
      say: "~라고 말하기",
    };
    return names[blockType] || blockType;
  }

  getCategoryKorean(category) {
    const map = {
      start: "시작",
      moving: "움직임",
      looks: "생김새",
      sound: "소리",
      flow: "흐름",
      judgement: "판단",
      variable: "자료",
      calc: "계산",
    };
    return map[category] || category;
  }

  getDirectionGuide(direction) {
    if (direction.includes("앞") || direction.includes("전진")) {
      return `• **방향**: 오른쪽 (0도)\n• **거리**: 10 (기본값)`;
    } else if (direction.includes("뒤") || direction.includes("후진")) {
      return `• **방향**: 왼쪽 (180도)\n• **거리**: 10 (기본값)`;
    } else if (direction.includes("위")) {
      return `• **방향**: 위쪽 (90도)\n• **거리**: 10 (기본값)`;
    }
    return `• **방향**: 원하는 방향 선택\n• **거리/값**: 10 (기본값)`;
  }

  getExpectedResult(decomposed) {
    const target = decomposed.target || "오브젝트";
    const action = decomposed.action || "동작";
    const direction = decomposed.direction || "";

    return `✨ ${target}가 ${action} ${direction}`.trim() + "합니다!";
  }
}

// Export for Service Worker
if (typeof self !== "undefined") {
  self.ComplexHandler = ComplexHandler;
}
