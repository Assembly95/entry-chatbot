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

  // background.js의 searchEntryBlocks 함수 활용
  async searchRelevantBlocks(responses) {
    const allText = `${responses.objects} ${responses.rules} ${responses.endCondition}`.toLowerCase();
    const searchQueries = [];

    // 텍스트 분석해서 검색 쿼리 생성
    if (allText.includes("점프")) searchQueries.push("점프", "y좌표", "스페이스");
    if (allText.includes("이동") || allText.includes("움직")) searchQueries.push("이동", "움직이기", "방향키");
    if (allText.includes("충돌") || allText.includes("닿")) searchQueries.push("닿았는가", "충돌");
    if (allText.includes("점수")) searchQueries.push("변수", "점수");
    if (allText.includes("시간")) searchQueries.push("타이머", "기다리기");
    if (allText.includes("반복")) searchQueries.push("반복", "무한");
    if (allText.includes("소리")) searchQueries.push("소리", "재생");

    const allBlocks = [];

    // background.js의 searchEntryBlocks 함수 호출
    for (const query of searchQueries) {
      try {
        const results = await chrome.runtime.sendMessage({
          action: "searchBlocks",
          query: query,
          topK: 5,
        });

        if (results && results.blocks) {
          allBlocks.push(...results.blocks);
        }
      } catch (error) {
        console.error(`블록 검색 실패 (${query}):`, error);
      }
    }

    // 중복 제거
    const seen = new Set();
    return allBlocks.filter((block) => {
      const id = block.id || block.fileName;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
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
    🎯 게임 제작 가이드
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

  // 블록 정보를 AI용으로 포맷팅
  formatBlocksForAI(blocks) {
    if (!blocks || blocks.length === 0) {
      return "관련 블록을 찾을 수 없습니다.";
    }

    // 카테고리별로 그룹화
    const byCategory = {};
    blocks.forEach((block) => {
      const cat = block.category || "unknown";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(block);
    });

    let formatted = "";
    for (const [category, categoryBlocks] of Object.entries(byCategory)) {
      formatted += `\n[${category} 카테고리]\n`;
      categoryBlocks.forEach((block) => {
        formatted += `- ${block.name || block.fileName}`;
        if (block.description) formatted += `: ${block.description.substring(0, 50)}`;
        formatted += `\n`;
      });
    }

    return formatted;
  }

  async generateCustomCoT(session) {
    console.log("🎮 generateCustomCoT 시작");
    console.log("  - session:", session);

    try {
      const { responses } = session;

      if (!responses) {
        console.error("❌ generateCustomCoT: responses가 없음");
        return {
          totalSteps: 1,
          currentStep: 1,
          steps: [
            {
              stepNumber: 1,
              title: "시작하기",
              content: "게임 제작을 시작합니다.",
              category: "start",
              completed: false,
            },
          ],
          gameDesign: {},
        };
      }

      console.log("  - responses:", responses);

      // AI를 사용해서 게임에 맞는 단계 생성
      const steps = await this.createGameStepsWithAI(responses);
      console.log("  - 생성된 steps:", steps);

      // steps 검증
      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        console.error("❌ generateCustomCoT: 단계 생성 실패, 기본 템플릿 사용");
        const defaultSteps = this.createDefaultSteps(responses);

        if (!defaultSteps || defaultSteps.length === 0) {
          console.error("❌ generateCustomCoT: 기본 템플릿도 실패");
          return {
            totalSteps: 1,
            currentStep: 1,
            steps: [
              {
                stepNumber: 1,
                title: "오류",
                content: "가이드 생성에 실패했습니다.",
                category: "error",
                completed: false,
              },
            ],
            gameDesign: responses,
          };
        }

        return {
          totalSteps: defaultSteps.length,
          currentStep: 1,
          steps: defaultSteps,
          gameDesign: responses,
        };
      }

      const result = {
        totalSteps: steps.length,
        currentStep: 1,
        steps: steps,
        gameDesign: responses,
      };

      console.log("✅ generateCustomCoT 완료:", result);
      return result;
    } catch (error) {
      console.error("❌ generateCustomCoT 오류:", error);
      return {
        totalSteps: 1,
        currentStep: 1,
        steps: [
          {
            stepNumber: 1,
            title: "오류 발생",
            content: `가이드 생성 중 오류가 발생했습니다: ${error.message}`,
            category: "error",
            completed: false,
          },
        ],
        gameDesign: session?.responses || {},
      };
    }
  }

  // complexHandler.js - createGameStepsWithAI 함수에 로깅 추가

  async createGameStepsWithAI(responses) {
    try {
      const storageData = await chrome.storage.sync.get(["openai_api_key"]);
      if (!storageData.openai_api_key) {
        return this.createDefaultSteps(responses);
      }

      // Entry Knowledge 로드
      let entryKnowledge = null;
      if (typeof EntryKnowledge !== "undefined") {
        entryKnowledge = EntryKnowledge;
      }

      // 관련 블록들을 RAG로 검색
      const relevantBlocks = await this.searchRelevantBlocks(responses);
      console.log("🔍 RAG 검색된 블록들:", relevantBlocks);

      // blockInfo 변수 정의 (이 부분이 누락되었음)
      const blockInfo = this.formatBlocksForAI(relevantBlocks);
      console.log("📝 포맷된 블록 정보:", blockInfo);

      const systemPrompt = `Entry 블록코딩 가이드 생성 AI입니다.

중요 규칙:
1. 카테고리는 정확한 이름만 사용 (설명 추가 금지)
2. 블록 이름은 [대괄호]로 표시
3. 입력값은 작은따옴표로 표시 (예: '10')

Entry 카테고리 (정확한 이름만):
- 시작
- 움직임
- 생김새
- 소리
- 흐름
- 판단
- 자료
- 계산
- 붓

절대 금지 표현:
❌ "흐름 - 반복/조건문"
❌ "움직임 - 오브젝트 이동/회전"
❌ "자료 - 변수 관리"

올바른 표현:
✅ "흐름 카테고리"
✅ "움직임 카테고리에서"
✅ "[무한 반복하기] 블록"

검색된 블록들:
${blockInfo}

작성 예시:
"1. 흐름 카테고리 클릭
2. [무한 반복하기] 블록 추가
3. 값을 '10'으로 설정"

JSON 응답 형식:
{
  "steps": [
    {
      "stepNumber": 1,
      "title": "제목",
      "content": "### 🎨 제목\\n\\n1. 시작 카테고리 클릭\\n2. [시작하기 버튼을 클릭했을 때] 블록 추가\\n3. 움직임 카테고리에서 [( )만큼 움직이기] 선택\\n4. 값을 '10'으로 설정",
      "category": "카테고리명"
    }
  ]
}`;

      const userPrompt = `"${responses.objects}" 게임 제작 가이드를 만들어주세요:
- 오브젝트: ${responses.objects}
- 규칙: ${responses.rules}
- 종료: ${responses.endCondition}`;

      console.log("📤 GPT-4o-mini로 보내는 프롬프트:");
      console.log("System:", systemPrompt);
      console.log("User:", userPrompt);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${storageData.openai_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      });

      const data = await response.json();

      console.log("📥 GPT-4o-mini 원본 응답:", data);

      // AI 응답 내용 추출
      const aiResponseContent = data.choices[0].message.content;

      console.log("💬 GPT-4o-mini 응답 텍스트:");
      console.log(aiResponseContent);

      // JSON 파싱
      let parsed;
      try {
        parsed = JSON.parse(aiResponseContent);
        console.log("✅ 파싱된 JSON:", parsed);
      } catch (parseError) {
        console.error("❌ JSON 파싱 실패:", parseError);
        console.log("원본 텍스트:", aiResponseContent);
        return this.createDefaultSteps(responses);
      }

      const steps = parsed.steps || [];

      console.log("📋 생성된 단계 수:", steps.length);
      steps.forEach((step, idx) => {
        console.log(`Step ${idx + 1}: ${step.title}`);
        console.log(`  내용 길이: ${step.content?.length || 0}자`);
        console.log(`  카테고리: ${step.category}`);
      });

      return steps.map((step, idx) => ({
        stepNumber: step.stepNumber || idx + 1,
        title: step.title || `단계 ${idx + 1}`,
        content: step.content || "",
        category: step.category || "general",
        completed: false,
      }));
    } catch (error) {
      console.error("❌ AI 단계 생성 실패:", error);
      return this.createDefaultSteps(responses);
    }
  }

  // 유연한 기본 템플릿
  createFlexibleSteps(responses) {
    const steps = [];

    // 사용자 입력에 따라 동적으로 단계 생성
    if (responses.objects) {
      steps.push({
        stepNumber: steps.length + 1,
        title: "오브젝트 준비",
        content: this.generateObjectStep(responses.objects),
        category: "object",
      });
    }

    // 규칙에 따른 단계 추가
    if (responses.rules) {
      const ruleSteps = this.analyzeRules(responses.rules);
      steps.push(...ruleSteps);
    }

    // 종료 조건 단계
    if (responses.endCondition) {
      steps.push({
        stepNumber: steps.length + 1,
        title: "게임 종료 설정",
        content: this.generateEndConditionStep(responses.endCondition),
        category: "flow",
      });
    }

    // 기본 테스트 단계는 항상 추가
    steps.push({
      stepNumber: steps.length + 1,
      title: "테스트 및 디버깅",
      content: "### ✅ 게임 테스트\\n\\n게임을 실행하고 문제점을 찾아 수정하세요.",
      category: "test",
    });

    return steps.map((step) => ({ ...step, completed: false }));
  }

  // EntryKnowledge 활용 함수
  getStepFromKnowledge(patternKey) {
    if (EntryKnowledge && EntryKnowledge.commonPatterns[patternKey]) {
      const pattern = EntryKnowledge.commonPatterns[patternKey];
      let content = `### ${pattern.description}\\n\\n`;

      pattern.steps.forEach((step, idx) => {
        content += `${idx + 1}. ${step}\\n`;
      });

      return content;
    }

    return "단계별 가이드를 준비합니다.";
  }

  generateObjectStep(objects) {
    const knowledge = EntryKnowledge.uiActions.addObject;
    let content = `### 🎨 ${objects} 추가하기\\n\\n`;

    knowledge.steps.forEach((step, idx) => {
      content += `${idx + 1}. ${step}\\n`;
    });

    return content;
  }

  generateEndConditionStep(condition) {
    let content = `### 🏁 종료 조건: ${condition}\\n\\n`;

    // 조건 분석
    if (condition.includes("시간")) {
      content += "1. 타이머 변수 생성\\n";
      content += "2. 매 초마다 타이머 증가\\n";
      content += "3. 조건 체크 후 게임 종료\\n";
    } else if (condition.includes("점수")) {
      content += "1. 점수 조건 확인 블록 추가\\n";
      content += "2. 목표 달성 시 종료 처리\\n";
    } else {
      content += "1. 종료 조건 설정\\n";
      content += "2. 게임 종료 처리\\n";
    }

    return content;
  }

  // 규칙 분석 함수
  analyzeRules(rules) {
    const steps = [];
    const rulesLower = rules.toLowerCase();

    // 규칙에 따른 필요 단계 분석
    if (rulesLower.includes("점수") || rulesLower.includes("카운트")) {
      steps.push({
        title: "점수 시스템",
        content: this.getStepFromKnowledge("scoreSystem"),
        category: "variable",
      });
    }

    if (rulesLower.includes("이동") || rulesLower.includes("움직")) {
      steps.push({
        title: "움직임 구현",
        content: this.getStepFromKnowledge("keyboardControl"),
        category: "moving",
      });
    }

    if (rulesLower.includes("충돌") || rulesLower.includes("닿")) {
      steps.push({
        title: "충돌 감지",
        content: "### 🎯 충돌 감지 설정\\n\\n충돌 판정과 결과 처리를 구현합니다.",
        category: "judgement",
      });
    }

    return steps.map((step, idx) => ({
      ...step,
      stepNumber: idx + 2, // 오브젝트 단계 다음부터
    }));
  }

  // 폴백용 기본 템플릿
  createDefaultSteps(responses) {
    const steps = [];
    let stepNumber = 1;

    const templates = [
      {
        title: "오브젝트 준비",
        getContent: (r) => `### 🎨 캐릭터 추가

1. [+오브젝트] 버튼 클릭
2. ${r.objects || "캐릭터"} 선택
3. [적용하기] 클릭
4. 화면에 배치`,
        category: "object",
      },
      {
        title: "움직임 설정",
        getContent: () => `### 🎮 키보드 조작

1. 시작 카테고리 클릭
2. [스페이스 키를 눌렀을 때] 블록 추가
3. 움직임 카테고리 클릭
4. [( )만큼 움직이기] 블록 연결
5. 값을 '10'으로 설정`,
        category: "moving",
      },
      {
        title: "규칙 구현",
        getContent: (r) => `### 📏 게임 규칙

1. 흐름 카테고리 선택
2. [무한 반복하기] 블록 추가
3. 판단 카테고리에서 [만약 ~라면] 선택
4. 조건 설정: ${r.rules || "충돌 체크"}`,
        category: "flow",
      },
      {
        title: "변수 추가",
        getContent: () => `### 🏆 점수 시스템

1. 자료 카테고리 클릭
2. [변수 만들기] 버튼 클릭
3. 이름: '점수' 입력
4. [점수를 0으로 정하기] 추가`,
        category: "variable",
      },
      {
        title: "충돌 감지",
        getContent: () => `### 🎯 상호작용

1. 판단 카테고리 선택
2. [~에 닿았는가?] 블록 선택
3. 충돌 대상 설정
4. [만약 ~라면] 안에 넣기`,
        category: "judgement",
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

  formatInitialResponse(steps, totalSteps) {
    console.log("📝 formatInitialResponse 호출됨");
    console.log("  - steps:", steps);
    console.log("  - totalSteps:", totalSteps);

    // steps 배열 검증
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      console.error("❌ formatInitialResponse: 유효하지 않은 steps 배열");
      return "게임 제작 가이드를 준비 중입니다...";
    }

    const firstStep = steps[0];
    console.log("  - firstStep:", firstStep);

    // firstStep 검증
    if (!firstStep) {
      console.error("❌ formatInitialResponse: 첫 번째 단계가 없음");
      return "가이드를 생성하는 중 문제가 발생했습니다. 다시 시도해주세요.";
    }

    // 속성들에 기본값 제공
    const stepNumber = firstStep.stepNumber || 1;
    const title = firstStep.title || "게임 제작 시작";
    const content = firstStep.content || "단계별 가이드를 준비하고 있습니다...";

    const response =
      `# 🎮 게임 만들기 가이드\n\n` +
      `📊 **전체 진행**: ${stepNumber} / ${totalSteps || steps.length} 단계\n\n` +
      `---\n\n` +
      `## Step ${stepNumber}: ${title}\n\n` +
      `${content}\n\n` +
      `---\n\n` +
      `**네비게이션**: [다음 단계 →] 버튼을 클릭하세요`;

    console.log("✅ formatInitialResponse 완료");
    return response;
  }

  // 나머지 기존 메소드들은 그대로 유지...
  generateStepSequence(decomposed, ragResults) {
    // 기존 코드 유지
    const steps = [];
    let stepNumber = 1;
    // ... 기존 스텝 생성 로직
    return steps;
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
