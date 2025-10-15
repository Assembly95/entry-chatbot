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

  async generateCustomCoT(session) {
    const { responses } = session;

    // AI를 사용해서 게임에 맞는 단계 생성
    const steps = await this.createGameStepsWithAI(responses);

    return {
      totalSteps: steps.length,
      currentStep: 1,
      steps: steps,
      gameDesign: responses,
    };
  }

  async createGameStepsWithAI(responses) {
    try {
      const storageData = await chrome.storage.sync.get(["openai_api_key"]);
      if (!storageData.openai_api_key) {
        // API 키 없으면 기본 템플릿 사용
        return this.createDefaultSteps(responses);
      }

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
              content: `Entry 블록코딩으로 게임을 만드는 8단계 가이드를 생성하세요.

사용자가 제공한 정보:
- 오브젝트: ${responses.objects}
- 게임 규칙: ${responses.rules}
- 종료 조건: ${responses.endCondition}

각 단계는 다음 형식의 JSON 배열로 응답하세요:
[
  {
    "stepNumber": 1,
    "title": "단계 제목",
    "content": "### 이모지 제목\\n\\n구체적인 설명과 블록 사용법",
    "blockType": "주요 사용 블록 ID" (선택사항),
    "category": "블록 카테고리" (start/moving/looks/sound/flow/variable/judgement)
  }
]

단계 구성:
1. 오브젝트 추가
2. 주인공 움직임
3. 게임 규칙 구현
4. 변수/점수 시스템
5. 상호작용/충돌
6. 종료 조건
7. 효과 추가
8. 테스트

각 단계는 구체적인 블록 이름과 연결 방법을 포함해야 합니다.`,
            },
            {
              role: "user",
              content: `다음 게임의 단계별 가이드를 만들어주세요:
오브젝트: ${responses.objects}
규칙: ${responses.rules}
종료: ${responses.endCondition}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 3000,
          response_format: { type: "json_object" },
        }),
      });

      const data = await response.json();
      const content = data.choices[0].message.content;

      // JSON 파싱
      let steps;
      try {
        const parsed = JSON.parse(content);
        steps = parsed.steps || parsed; // steps 키가 있거나 직접 배열
      } catch (e) {
        console.error("AI 응답 파싱 실패:", e);
        return this.createDefaultSteps(responses);
      }

      // completed: false 추가
      return steps.map((step) => ({
        ...step,
        completed: false,
      }));
    } catch (error) {
      console.error("AI 단계 생성 실패:", error);
      return this.createDefaultSteps(responses);
    }
  }
  // 폴백용 기본 템플릿
  createDefaultSteps(responses) {
    const steps = [];
    let stepNumber = 1;

    // 기본 8단계 템플릿
    const templates = [
      {
        title: "오브젝트 준비",
        getContent: (r) => `### 🎨 오브젝트 추가\n\n${r.objects || "캐릭터"}를 추가하세요`,
        category: "object",
      },
      {
        title: "움직임 설정",
        getContent: () => `### 🎮 키보드 조작\n\n방향키로 움직이는 블록을 추가하세요`,
        category: "moving",
      },
      {
        title: "규칙 구현",
        getContent: (r) => `### 📏 게임 규칙\n\n${r.rules || "기본 규칙"}을 구현하세요`,
        category: "flow",
      },
      {
        title: "변수 추가",
        getContent: () => `### 🏆 점수와 데이터\n\n필요한 변수를 만드세요`,
        category: "variable",
      },
      {
        title: "상호작용",
        getContent: () => `### 🎯 충돌 감지\n\n오브젝트 간 상호작용을 설정하세요`,
        category: "judgement",
      },
      {
        title: "종료 설정",
        getContent: (r) => `### 🏁 게임 종료\n\n${r.endCondition || "종료 조건"}을 설정하세요`,
        category: "flow",
      },
      {
        title: "효과 추가",
        getContent: () => `### ✨ 소리와 효과\n\n게임을 더 재미있게 만드세요`,
        category: "sound",
      },
      {
        title: "테스트",
        getContent: () => `### ✅ 최종 테스트\n\n게임을 실행하고 개선하세요`,
        category: "test",
      },
    ];

    return templates.map((template, idx) => ({
      stepNumber: idx + 1,
      title: template.title,
      content: template.getContent(responses),
      category: template.category,
      completed: false,
    }));
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
