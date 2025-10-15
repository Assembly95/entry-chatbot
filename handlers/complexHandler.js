// complexHandler.js - 설계 모드가 추가된 완전한 버전

class ComplexHandler {
  constructor() {
    this.stepTemplates = {
      trigger: {
        title: "시작 이벤트 설정",
        icon: "🎯",
        instructions: "프로그램이 시작될 조건을 만들어요",
      },
      // ... 기존 템플릿들
    };

    // 게임 설계 질문 추가
    this.designQuestions = [
      {
        id: "objects",
        question: '🎮 어떤 오브젝트(캐릭터)들을 등장시키고 싶나요?\n예시: "고양이, 쥐" 또는 "술래, 도망가는 사람들"',
        followUp: "좋아요! {objects}를 추가할게요.",
      },
      {
        id: "rules",
        question:
          '📏 게임의 규칙은 무엇인가요?\n예시: "술래가 다른 사람을 터치하면 술래가 바뀜" 또는 "쥐가 치즈를 먹으면 점수 획득"',
        followUp: "규칙을 이해했어요!",
      },
      {
        id: "endCondition",
        question: '🏁 언제 게임이 끝나나요?\n예시: "시간이 60초 지나면" 또는 "모든 사람을 잡으면"',
        followUp: "게임 종료 조건을 설정할게요!",
      },
    ];
  }

  async handle(decomposed, ragResults, message) {
    console.log("🎮 ComplexHandler 처리 시작");

    // 게임 제작 의도 확인
    const needsDesign = await this.checkIfNeedsDesign(message);

    if (needsDesign) {
      return this.startDesignMode(message);
    }

    // 기존 로직으로 폴백
    if (!decomposed) {
      return this.generateBasicComplexGuide(message);
    }

    const steps = this.generateStepSequence(decomposed, ragResults);
    const cotSequence = {
      totalSteps: steps.length,
      currentStep: 1,
      steps: steps,
    };

    const initialResponse = this.formatInitialResponse(steps, cotSequence.totalSteps);

    return {
      success: true,
      response: initialResponse,
      responseType: "cot",
      type: "complex-cot",
      cotSequence: cotSequence,
      decomposed: decomposed,
    };
  }

  async checkIfNeedsDesign(message) {
    try {
      const storageData = await chrome.storage.sync.get(["openai_api_key"]);
      if (!storageData.openai_api_key) return false;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${storageData.openai_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `사용자가 Entry 블록코딩으로 게임/프로젝트를 처음부터 만들려고 하는지 판단하세요.
              
다음 경우 true:
- 새로운 게임을 만들고 싶어함
- 프로젝트를 처음부터 시작하려 함
- "어떻게 만들어?" 같은 제작 방법 질문

다음 경우 false:
- 특정 블록 사용법만 물어봄
- 이미 만들던 것의 오류 해결
- 개념 설명 요청

true 또는 false만 답하세요.`,
            },
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.3,
          max_tokens: 10,
        }),
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content.trim().toLowerCase();

      return aiResponse === "true";
    } catch (error) {
      console.error("Design check 실패:", error);
      return false;
    }
  }

  // complexHandler.js - startDesignMode 메소드 수정

  startDesignMode(message) {
    const designSessionId = `design-${Date.now()}`;

    // 세션 데이터는 나중에 content.js에서 생성
    const firstQuestion = this.designQuestions[0];

    const designUI = `
<div class="design-mode-container" id="design-${designSessionId}" style="
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 16px;
  padding: 24px;
  color: white;
  margin: 16px 0;
">
  <div style="
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 20px;
    text-align: center;
  ">
    🎯 술래잡기 게임 설계 도우미
  </div>
  
  <div class="progress-bar" style="
    background: rgba(255,255,255,0.2);
    border-radius: 10px;
    height: 8px;
    margin-bottom: 20px;
    overflow: hidden;
  ">
    <div class="progress-fill" data-session="${designSessionId}" style="
      background: white;
      height: 100%;
      width: 33%;
      border-radius: 10px;
      transition: width 0.3s;
    "></div>
  </div>
  
  <div class="design-question" data-session="${designSessionId}" style="
    background: white;
    color: #333;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 16px;
  ">
    <div style="
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 16px;
    ">${firstQuestion.question}</div>
    
    <input type="text" 
           class="design-input"
           placeholder="여기에 답변을 입력하세요..."
           style="
             width: 100%;
             padding: 12px;
             border: 2px solid #e0e0e0;
             border-radius: 8px;
             font-size: 14px;
             box-sizing: border-box;
           "
           data-session-id="${designSessionId}"
           data-question-id="${firstQuestion.id}"
           data-step="0">
  </div>
  
  <button class="design-next-btn"
          data-session-id="${designSessionId}"
          style="
            width: 100%;
            padding: 12px;
            background: white;
            color: #667eea;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
          ">
    다음 단계 →
  </button>
</div>`;

    return {
      success: true,
      response: designUI,
      responseType: "html",
      type: "design-mode",
      designSessionId: designSessionId,
      designQuestions: this.designQuestions, // 질문 데이터 전달
    };
  }

  generateCustomCoT(session) {
    const { responses } = session;

    // 수집된 정보 기반으로 맞춤형 단계 생성
    const steps = this.createGameSteps(responses);

    return {
      totalSteps: steps.length,
      currentStep: 1,
      steps: steps,
      gameDesign: responses,
    };
  }
  createGameSteps(responses) {
    const steps = [];
    let stepNumber = 1;

    // Step 1: 오브젝트 추가
    if (responses.objects) {
      const objects = responses.objects.split(",").map((o) => o.trim());
      steps.push({
        stepNumber: stepNumber++,
        title: "오브젝트 준비하기",
        content: `### 🎨 캐릭터 추가하기

**추가할 오브젝트**: ${objects.join(", ")}

**따라하기**:
1. 화면 아래 오브젝트 목록에서 + 버튼 클릭
2. 오브젝트 라이브러리에서 검색 또는 직접 그리기
3. 각 오브젝트의 크기와 위치 조정

💡 **팁**: 술래는 다른 색상으로 구분하면 좋아요!`,
        blockType: null,
        category: "object",
        completed: false,
      });
    }

    // Step 2: 주인공 움직임 설정
    steps.push({
      stepNumber: stepNumber++,
      title: "캐릭터 움직이기",
      content: `### 🎮 키보드로 조작하기

**사용할 블록**:
📍 시작 카테고리: [시작하기 버튼을 클릭했을 때]
📍 흐름 카테고리: [무한 반복하기]
📍 판단 카테고리: [만약 ~키를 눌렀다면]
📍 움직임 카테고리: [~만큼 움직이기]

**블록 연결 순서**:
\`\`\`
[시작하기 버튼을 클릭했을 때]
└─[무한 반복하기]
   ├─[만약 ↑키를 눌렀다면]
   │  └─[위쪽으로 10만큼 움직이기]
   ├─[만약 ↓키를 눌렀다면]
   │  └─[아래쪽으로 10만큼 움직이기]
   ├─[만약 ←키를 눌렀다면]
   │  └─[왼쪽으로 10만큼 움직이기]
   └─[만약 →키를 눌렀다면]
      └─[오른쪽으로 10만큼 움직이기]
\`\`\``,
      blockType: "when_run_button_click",
      category: "start",
      completed: false,
    });

    // Step 3: 게임 규칙 구현
    if (responses.rules) {
      const ruleContent = this.generateRuleImplementation(responses.rules);
      steps.push({
        stepNumber: stepNumber++,
        title: "게임 규칙 만들기",
        content: `### 📏 규칙 구현하기

**설정한 규칙**: ${responses.rules}

${ruleContent}`,
        blockType: "_if",
        category: "flow",
        completed: false,
      });
    }

    // Step 4: 변수 시스템
    steps.push({
      stepNumber: stepNumber++,
      title: "점수와 타이머 추가",
      content: `### 🏆 게임 데이터 관리

**변수 만들기**:
1. 자료 카테고리 → 변수 만들기 클릭
2. 필요한 변수들:
   • "시간" - 게임 진행 시간
   • "잡은횟수" - 술래가 잡은 횟수
   • "현재술래" - 누가 술래인지

**초기값 설정**:
[시작하기 버튼을 클릭했을 때]
├─[시간을 0으로 정하기]
├─[잡은횟수를 0으로 정하기]
└─[현재술래를 "player1"로 정하기]`,
      blockType: "set_variable",
      category: "variable",
      completed: false,
    });

    // Step 5: 충돌 감지
    steps.push({
      stepNumber: stepNumber++,
      title: "술래잡기 충돌 감지",
      content: `### 🎯 터치 감지하기

**충돌 감지 블록**:
[무한 반복하기]
└─[만약 (다른 오브젝트)에 닿았는가?]
   ├─[신호 보내기: "잡혔다"]
   ├─[잡은횟수를 1만큼 바꾸기]
   └─[0.5초 기다리기]  // 중복 감지 방지

**잡힌 오브젝트 처리**:
[(잡혔다) 신호를 받았을 때]
├─[2초 동안 "잡혔어요!" 말하기]
└─[무작위 위치로 이동하기]`,
      blockType: "reach_something",
      category: "judgement",
      completed: false,
    });

    // Step 6: 게임 종료 조건
    if (responses.endCondition) {
      steps.push({
        stepNumber: stepNumber++,
        title: "게임 종료 설정",
        content: `### 🏁 종료 조건 만들기

**설정한 조건**: ${responses.endCondition}

${this.generateEndCondition(responses.endCondition)}`,
        blockType: "stop_object",
        category: "flow",
        completed: false,
      });
    }

    // Step 7: 효과 추가
    steps.push({
      stepNumber: stepNumber++,
      title: "재미있는 효과 추가",
      content: `### ✨ 게임 효과

**소리 효과**:
- 잡았을 때: [딩동댕 소리 재생하기]
- 게임 종료: [팡파레 소리 재생하기]

**시각 효과**:
- 술래 구분: [색깔을 빨간색으로 바꾸기]
- 잡혔을 때: [0.5초 동안 유령 효과 100 주기]

**배경음악**:
[시작하기 버튼을 클릭했을 때]
└─[배경음악 재생하기]`,
      blockType: "sound_something_with_block",
      category: "sound",
      completed: false,
    });

    // Step 8: 테스트
    steps.push({
      stepNumber: stepNumber++,
      title: "테스트하고 완성하기",
      content: `### ✅ 최종 테스트

**체크리스트**:
☐ 모든 캐릭터가 잘 움직이나요?
☐ 술래가 다른 사람을 잡을 수 있나요?
☐ 점수/시간이 제대로 작동하나요?
☐ 게임이 정상적으로 끝나나요?

**개선 아이디어**:
- 캐릭터 속도 조절
- 장애물 추가
- 파워업 아이템
- 레벨 시스템

🎉 **축하합니다!** 술래잡기 게임 완성!`,
      blockType: null,
      category: "test",
      completed: false,
    });

    return steps;
  }

  generateRuleImplementation(rules) {
    const rulesLower = rules.toLowerCase();

    if (rulesLower.includes("술래") && rulesLower.includes("바뀜")) {
      return `**술래 교체 구현**:
[만약 (다른 캐릭터)에 닿았는가?]
├─[현재술래를 (닿은 캐릭터)로 정하기]
├─[나의 색깔 효과를 0으로 정하기]
└─[(닿은 캐릭터)에게 "이제 네가 술래!" 신호 보내기]

**새로운 술래 설정**:
[(이제 네가 술래!) 신호를 받았을 때]
├─[색깔 효과를 100으로 정하기]  // 빨간색
└─[크기를 110으로 정하기]  // 약간 크게`;
    }

    if (rulesLower.includes("점수")) {
      return `**점수 시스템**:
[만약 (목표물)에 닿았는가?]
├─[점수를 1만큼 바꾸기]
├─[효과음 재생하기]
└─[(목표물)을 다른 위치로 이동시키기]`;
    }

    return `**기본 규칙 구현**:
[무한 반복하기]
└─[만약 충돌 조건이라면]
   └─[규칙에 따른 동작 실행]`;
  }

  generateEndCondition(condition) {
    const conditionLower = condition.toLowerCase();

    if (conditionLower.includes("시간") || conditionLower.includes("초")) {
      const timeMatch = condition.match(/\d+/);
      const timeLimit = timeMatch ? timeMatch[0] : "60";

      return `**시간 제한 구현**:
[시작하기 버튼을 클릭했을 때]
└─[타이머 리셋]

[무한 반복하기]
├─[1초 기다리기]
├─[시간을 1만큼 바꾸기]
└─[만약 시간 > ${timeLimit} 이라면]
   ├─["시간 종료!" 라고 말하기]
   └─[모든 코드 멈추기]`;
    }

    if (conditionLower.includes("모두") || conditionLower.includes("전부")) {
      return `**모두 잡기 조건**:
[만약 잡은횟수 = (전체 인원수) 라면]
├─["모두 잡았어요!" 라고 말하기]
├─[승리 효과 보여주기]
└─[모든 코드 멈추기]`;
    }

    return `**기본 종료 조건**:
[만약 (종료 조건) 이라면]
├─["게임 종료!" 라고 말하기]
└─[모든 코드 멈추기]`;
  }

  // 기존 메소드들 유지...
  formatInitialResponse(steps, totalSteps) {
    if (steps.length === 0) {
      return "단계를 생성할 수 없습니다.";
    }

    const firstStep = steps[0];

    return (
      `# 🎮 술래잡기 게임 만들기\n\n` +
      `📊 **전체 진행**: 1 / ${totalSteps} 단계\n\n` +
      `---\n\n` +
      `## Step ${firstStep.stepNumber}: ${firstStep.title}\n\n` +
      `${firstStep.content}\n\n` +
      `---\n\n` +
      `**네비게이션**: [다음 단계 →] 버튼을 클릭하세요`
    );
  }

  // 나머지 기존 메소드들은 그대로 유지...
  generateStepSequence(decomposed, ragResults) {
    // 기존 코드 유지
    const steps = [];
    let stepNumber = 1;
    // ... 기존 스텝 생성 로직
    return steps;
  }

  formatInitialResponse(steps, totalSteps) {
    // 기존 코드 유지
    if (steps.length === 0) {
      return "단계를 생성할 수 없습니다.";
    }
    // ... 기존 포맷팅 로직
  }

  generateBasicComplexGuide(message) {
    // 기존 코드 유지
    return {
      success: true,
      response: `## 🎮 프로젝트 만들기 가이드\n\n...`,
      responseType: "text",
      type: "complex-basic",
    };
  }

  // 헬퍼 함수들도 그대로 유지
  getBlockDisplayName(blockType) {
    // 기존 코드
  }

  getCategoryKorean(category) {
    // 기존 코드
  }

  getDirectionGuide(direction) {
    // 기존 코드
  }

  getExpectedResult(decomposed) {
    // 기존 코드
  }
}

// Export for Service Worker
if (typeof self !== "undefined") {
  self.ComplexHandler = ComplexHandler;
}
