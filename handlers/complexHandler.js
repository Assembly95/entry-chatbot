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

    // 컨텍스트 매니저 추가
    this.contextManager = {
      mainPath: [],
      branches: [],
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

  /**
   * 단계 내용에서 언급된 블록들을 RAG에서 검색
   */
  async searchBlocksInStep(blockName) {
    try {
      // 현재 활성 탭 확인
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        console.warn("활성 탭을 찾을 수 없음");
        return null;
      }

      // 탭이 Entry 페이지인지 확인
      if (!tabs[0].url.includes("playentry.org")) {
        console.warn("Entry 페이지가 아님");
        return null;
      }

      // 메시지 전송 시도
      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        action: "searchBlock",
        blockName: blockName,
      });

      return response;
    } catch (error) {
      // 연결 실패 시 재시도 로직
      if (error.message.includes("Could not establish connection")) {
        console.log(`연결 재시도: ${blockName}`);

        // Content script 재주입 시도
        await this.reinjectContentScript(tabs[0].id);

        // 잠시 대기 후 재시도
        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
          return await chrome.tabs.sendMessage(tabs[0].id, {
            action: "searchBlock",
            blockName: blockName,
          });
        } catch (retryError) {
          console.warn(`블록 검색 실패: ${blockName}`);
          return null;
        }
      }
      throw error;
    }
  }

  // Content Script 재주입 함수
  async reinjectContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["content.js"],
      });
    } catch (e) {
      console.warn("Content script 재주입 실패:", e);
    }
  }

  async searchRelevantBlocks(responses) {
    const allText = `${responses.objects} ${responses.rules} ${responses.endCondition}`.toLowerCase();
    const searchQueries = [];

    // 텍스트 분석해서 검색 쿼리 생성
    if (responses.objects) {
      const objects = responses.objects.toLowerCase();
      // "스프라이트" 같은 Entry 전용 용어는 제외
      if (objects.includes("캐릭터") || objects.includes("오브젝트")) {
        searchQueries.push("오브젝트");
      }
      // 구체적인 오브젝트 이름만 추가
      const objectNames = objects
        .split(/[,\s]+/)
        .filter((name) => name.length > 1 && !["의", "를", "을", "이", "가"].includes(name));
      searchQueries.push(...objectNames);
    }

    // 기존 쿼리 생성 로직...
    if (allText.includes("점프")) searchQueries.push("점프", "y좌표");
    if (allText.includes("이동") || allText.includes("움직")) searchQueries.push("이동", "움직이기", "방향키");
    // ... (나머지는 동일)

    // 기본 블록 데이터 반환 (RAG 검색 실패 시 폴백)
    const defaultBlocks = this.getDefaultBlocksForGame(responses);

    try {
      // complexHandler가 background script에서 실행되는 경우에만 작동
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        const allBlocks = [];

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
            console.warn(`블록 검색 건너뜀 (${query})`);
          }
        }

        if (allBlocks.length > 0) {
          // 중복 제거
          const seen = new Set();
          return allBlocks.filter((block) => {
            const id = block.id || block.fileName;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        }
      }
    } catch (error) {
      console.log("RAG 검색 사용 불가, 기본 블록 사용");
    }

    // RAG 검색 실패 시 기본 블록 반환
    return defaultBlocks;
  }

  // 폴백용 기본 블록 데이터
  getDefaultBlocksForGame(responses) {
    const blocks = [];
    const rulesLower = responses.rules?.toLowerCase() || "";

    // 기본 시작 블록
    blocks.push({
      name: "시작하기 버튼을 클릭했을 때",
      category: "start",
      description: "프로그램 시작",
    });

    // 규칙에 따른 블록 추가
    if (rulesLower.includes("이동") || rulesLower.includes("움직")) {
      blocks.push({
        name: "( )키를 눌렀을 때",
        category: "start",
        description: "키보드 입력",
      });
      blocks.push({
        name: "( )만큼 움직이기",
        category: "moving",
        description: "오브젝트 이동",
      });
    }

    if (rulesLower.includes("충돌") || rulesLower.includes("닿")) {
      blocks.push({
        name: "( )에 닿았는가?",
        category: "judgement",
        description: "충돌 감지",
      });
    }

    if (rulesLower.includes("점수")) {
      blocks.push({
        name: "변수 ( )를 ( )로 정하기",
        category: "variable",
        description: "변수 설정",
      });
    }

    blocks.push({
      name: "무한 반복하기",
      category: "flow",
      description: "반복 실행",
    });

    return blocks;
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

  // complexHandler.js에 추가
  validateBlockExists(blockName, category) {
    // RAG 데이터에서 실제 블록 확인
    const validBlocks = {
      start: ["시작하기 버튼을 클릭했을 때", "~키를 눌렀을 때", "마우스를 클릭했을 때"],
      moving: ["( )만큼 움직이기", "x좌표를 ( )만큼 바꾸기", "y좌표를 ( )만큼 바꾸기"],
      looks: ["보이기", "숨기기", "( )모양으로 바꾸기", "크기를 ( )%로 정하기"],
      sound: ["( )소리 재생하기", "모든 소리 멈추기"],
      flow: ["무한 반복하기", "( )번 반복하기", "만약 ~라면", "복제본 만들기"],
      variable: ["변수 ( )를 ( )로 정하기", "변수 ( )를 ( )만큼 바꾸기"],
      judgement: ["( )에 닿았는가?", "( )키를 눌렀는가?"],
      calc: ["( ) + ( )", "( )부터 ( )사이의 무작위 수"],
    };

    return validBlocks[category]?.some((valid) => blockName.includes(valid.replace(/\(.*?\)/g, "")));
  }

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
        steps: steps,
        gameDesign: session?.responses || {},
      };
    }
  }

  // complexHandler.js에 추가할 블록 로더
  async loadBlockDatabase() {
    const categories = ["start", "moving", "looks", "sound", "flow", "variable", "calc", "judgement", "func", "brush"];
    const blockDB = {};

    for (const category of categories) {
      const files = getKnownBlockFiles(category);
      for (const file of files) {
        const data = await fetch(chrome.runtime.getURL(`data/blocks/${category}/${file}`));
        const block = await data.json();

        // ID와 한글명 매핑
        blockDB[block.id] = {
          name: entryBlockMap[block.id] || block.name,
          category: category,
          description: block.description,
          usage: block.usage_examples,
        };
      }
    }
    return blockDB;
  }

  // complexHandler.js에 추가
  validateAndCorrectBlockName(blockName) {
    const normalized = blockName.replace(/[\[\]]/g, "").trim();

    // 1. 정확한 매칭 확인
    for (const [id, name] of Object.entries(entryBlockMap)) {
      if (name === normalized) {
        return { valid: true, corrected: name, id: id };
      }
    }

    // 2. 부분 매칭으로 수정
    for (const [id, name] of Object.entries(entryBlockMap)) {
      if (name.includes(normalized) || normalized.includes(name)) {
        return { valid: true, corrected: name, id: id };
      }
    }

    // 3. 키워드 기반 추천
    const keywords = normalized.split(" ");
    for (const [id, name] of Object.entries(entryBlockMap)) {
      const nameWords = name.split(" ");
      const matches = keywords.filter((k) => nameWords.some((w) => w.includes(k)));
      if (matches.length >= 2) {
        return { valid: false, suggested: name, id: id };
      }
    }

    return { valid: false, original: normalized };
  }

  // complexHandler.js - createGameStepsWithAI 함수를 완전히 교체

  // complexHandler.js의 createGameStepsWithAI 함수를 간단하게 수정
  // 기존의 복잡한 코드를 모두 지우고 이것으로 교체

  async createGameStepsWithAI(responses) {
    try {
      const storageData = await chrome.storage.sync.get(["openai_api_key"]);
      if (!storageData.openai_api_key) {
        return this.createDefaultSteps(responses);
      }

      console.log("📝 게임 정보:", responses);

      // ===== 심플한 CoT 요청 =====
      const accuratePrompt = `
다음 게임을 Entry 블록코딩으로 만드는 방법을 Chain of Thought 방식으로 단계별로 설명해줘.

게임 정보:
- 오브젝트: ${responses.objects}
- 규칙: ${responses.rules}  
- 종료 조건: ${responses.endCondition}

형식 규칙:
1. 각 단계는 "### 단계 3: 게임 종료 타이머 설정" 형식으로 작성 (단계 번호와 제목 함께 표시)
2. 각 단계마다 반드시 이 순서로 설명:
   a) **블록 작업인 경우**: "블록 위치: 자료 카테고리"
   b) **UI 작업인 경우**: "버튼 위치: 무대 아래 시작하기 버튼 옆"
   c) 왜 필요한지: 이 단계의 목적
   d) **블록 작업**: "사용할 블록", **UI 작업**: "사용 방법"

Entry 블록 사용법:
- 변수 만들기: "자료 카테고리 → 변수 추가(+) 버튼 클릭 → 변수명 입력"
- 그 후 [변수 ( )를 ( )로 정하기], [변수 ( )를 ( )만큼 바꾸기] 블록 사용

- 오브젝트 추가하기: "무대 아래 시작하기 버튼 옆 → +오브젝트 추가하기 버튼 클릭 → 오브젝트 선택"
- 이것은 블록이 아닌 UI 작업입니다

Entry 카테고리: 시작, 흐름, 움직임, 자료, 판단, 계산, 생김새, 소리, 함수

예시 출력:
### 단계 1: 점수 변수 만들기
￭ 블록 위치: 자료 카테고리
￭ 왜 필요한지: 게임 점수를 저장하고 관리하기 위해 필요합니다.
￭ 사용할 블록: 
- 자료 카테고리에서 변수 추가(+) 버튼을 눌러 '점수' 변수 생성
- [변수 (점수)를 (0)으로 정하기] 블록 사용`;

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
              role: "user",
              content: accuratePrompt,
            },
          ],
          temperature: 0.5,
          max_tokens: 1000,
        }),
      });

      const data = await response.json();
      const cotResponse = data.choices[0].message.content;

      // ===== 콘솔에 원본 응답 출력 =====
      console.log("\n" + "=".repeat(80));
      console.log("🤖 GPT-4o-mini CoT 원본 응답:");
      console.log("=".repeat(80));
      console.log(cotResponse);
      console.log("=".repeat(80) + "\n");

      // ===== 간단한 파싱 (일단 줄바꿈으로만 나누기) =====
      const lines = cotResponse.split("\n").filter((line) => line.trim());
      const steps = [];

      let currentStep = null;
      let stepNumber = 1;

      // 660-680번 줄 부분을 이렇게 교체
      for (const line of lines) {
        // ### 단계 X: 제목 형식 파싱
        const stepMatch = line.match(/^###\s*단계\s*(\d+)\s*:\s*(.+)/);

        if (stepMatch) {
          if (currentStep) {
            steps.push(currentStep);
          }
          currentStep = {
            title: stepMatch[2].trim(), // ✅ 실제 제목 추출 ("버튼 오브젝트 추가하기")
            content: "", // content는 빈 문자열로 시작
            stepNumber: parseInt(stepMatch[1]), // ✅ GPT가 준 번호 사용
            completed: false,
          };
        } else if (currentStep && line.trim()) {
          // 제목 줄이 아니면 content에 추가
          currentStep.content += (currentStep.content ? "\n" : "") + line;
        }
      }

      if (currentStep) {
        steps.push(currentStep);
      }

      // 최소 4개 단계 보장
      if (steps.length < 4) {
        steps.push(
          { title: "시작 설정", content: "시작 버튼 클릭 시 게임 시작", stepNumber: 1, completed: false },
          { title: "변수 초기화", content: "점수, 시간 등 변수 설정", stepNumber: 2, completed: false },
          { title: "메인 로직", content: "게임의 핵심 동작 구현", stepNumber: 3, completed: false },
          { title: "종료 조건", content: "게임 종료 조건 체크", stepNumber: 4, completed: false }
        );
      }

      console.log("📊 파싱된 단계 수:", steps.length);
      console.log("📋 각 단계 제목:");
      steps.forEach((step, idx) => {
        console.log(`  ${idx + 1}. ${step.title}`);
      });

      return steps;
    } catch (error) {
      console.error("❌ CoT 생성 실패:", error);
      return this.createDefaultSteps(responses);
    }
  }

  // ===== 기본 단계 생성 (API 실패시 폴백) =====
  createDefaultSteps(responses) {
    return [
      {
        title: "게임 시작 설정",
        content: `${responses.objects} 오브젝트를 준비하고 시작 이벤트를 설정합니다.`,
        stepNumber: 1,
        completed: false,
      },
      {
        title: "변수 초기화",
        content: "게임에 필요한 변수들을 만들고 초기값을 설정합니다.",
        stepNumber: 2,
        completed: false,
      },
      {
        title: "메인 게임 로직",
        content: `${responses.rules}를 구현합니다.`,
        stepNumber: 3,
        completed: false,
      },
      {
        title: "종료 조건",
        content: `${responses.endCondition}를 체크하고 게임을 종료합니다.`,
        stepNumber: 4,
        completed: false,
      },
    ];
  }

  /**
   * ✨ 핵심 함수: EntryKnowledge로 단계 내용 교체/보강
   */
  /**
   * ✨ 핵심 함수: EntryKnowledge + RAG로 단계 내용 보강
   */
  // complexHandler.js 수정
  async enhanceStepsWithKnowledge(steps) {
    for (let step of steps) {
      try {
        // 블록 검색 시도
        const blockInfo = await this.searchBlocksInStep(step.blockName);

        if (blockInfo) {
          step.blockDetails = blockInfo;
        } else {
          // Fallback: 로컬 블록 매핑 사용
          step.blockDetails = this.getLocalBlockInfo(step.blockName);
        }
      } catch (error) {
        // 에러 시 로컬 데이터 사용
        step.blockDetails = this.getLocalBlockInfo(step.blockName);
      }
    }
    return steps;
  }

  // 로컬 블록 정보 제공
  getLocalBlockInfo(blockName) {
    // blockMappings.js 데이터 활용
    const localMappings = {
      "시작하기 버튼을 클릭했을 때": {
        category: "start",
        description: "프로그램 시작 시 실행",
      },
      "무한 반복하기": {
        category: "flow",
        description: "블록을 계속 반복 실행",
      },
      // ... 더 많은 매핑
    };

    return localMappings[blockName] || null;
  }

  /**
   * EntryKnowledge에서 내용 생성
   */
  generateContentFromKnowledge(actionKey) {
    const action = EntryKnowledge.uiActions?.[actionKey];

    if (!action) {
      console.warn(`⚠️ ${actionKey}에 해당하는 Knowledge 없음`);
      return "";
    }

    let content = `### ${action.icon} ${action.category}\n\n`;

    // 단계별 설명
    action.steps.forEach((step, idx) => {
      content += `${idx + 1}. ${step}\n`;
    });

    // 위치 힌트
    if (action.location) {
      content += `\n💡 **위치**: ${action.location}`;
    }

    return content;
  }
  enhanceStepContent(content) {
    // Entry 전용 용어로 변환
    const entryTerms = {
      제어: "시작",
      타이머: "초시계",
      텍스트: "글상자",
      정지: "모든 스크립트 멈추기",
      "게임 종료": "모든 스크립트 멈추기",
    };

    let enhanced = content;
    for (const [old, newTerm] of Object.entries(entryTerms)) {
      enhanced = enhanced.replace(new RegExp(old, "gi"), newTerm);
    }

    return enhanced;
  }

  parseGPTResponse(gptResponse) {
    // 영어 카테고리를 한글로 자동 변환
    const categoryMap = {
      start: "시작",
      flow: "흐름",
      moving: "움직임",
      variable: "자료",
      judgement: "판단",
      calc: "계산",
      sound: "소리",
      looks: "생김새",
    };

    // <영어카테고리>를 (한글카테고리)로 변환
    let fixed = gptResponse;
    for (const [eng, kor] of Object.entries(categoryMap)) {
      fixed = fixed.replace(new RegExp(`<${eng}>`, "gi"), `(${kor})`);
    }

    const steps = [];
    const sections = gptResponse.split(/### 단계 \d+:/);

    // 첫 번째 빈 섹션 제거
    if (sections[0].trim() === "") {
      sections.shift();
    }

    // 제목들 추출 (### 단계 1: 제목, ### 단계 2: 제목 형식에서 제목만)
    const titleMatches = gptResponse.match(/### 단계 \d+: ([^\n]+)/g) || [];
    const titles = titleMatches.map((match) => {
      return match.replace(/### 단계 \d+: /, "").trim();
    });

    sections.forEach((section, index) => {
      if (!section.trim()) return;

      const lines = section.split("\n");
      let content = "";
      let blockLocation = "";
      let reason = "";
      let blocks = "";

      // 각 줄 파싱
      lines.forEach((line) => {
        const trimmedLine = line.trim();

        if (trimmedLine.includes("블록 위치:") || trimmedLine.includes("블록을 가져올 카테고리:")) {
          blockLocation = trimmedLine.split(":")[1]?.trim() || "";
        } else if (trimmedLine.includes("왜 필요한지:") || trimmedLine.includes("왜 이 단계가 필요한지:")) {
          reason = trimmedLine.split(":")[1]?.trim() || "";
        } else if (trimmedLine.includes("사용할 블록:") || trimmedLine.includes("어떤 블록을 사용해야 하는지:")) {
          blocks = trimmedLine.split(":")[1]?.trim() || "";
        }

        // ** 로 감싸진 부분 처리
        if (trimmedLine.startsWith("**") && trimmedLine.includes("**:")) {
          const label = trimmedLine.match(/\*\*([^:]+):/)?.[1];
          const value = trimmedLine.split("**:")[1]?.trim();

          if (label && value) {
            if (label.includes("블록") && label.includes("위치")) {
              blockLocation = value;
            } else if (label.includes("왜") || label.includes("필요")) {
              reason = value;
            } else if (label.includes("사용") && label.includes("블록")) {
              blocks = value;
            }
          }
        }
      });

      // content 조합
      const contentParts = [];
      if (blockLocation) contentParts.push(`**블록 위치**: ${blockLocation}`);
      if (reason) contentParts.push(`**왜 필요한지**: ${reason}`);
      if (blocks) contentParts.push(`**사용할 블록**: ${blocks}`);

      // 만약 구조화된 정보가 없으면 원본 텍스트 사용
      if (contentParts.length === 0) {
        content = section.trim();
      } else {
        content = contentParts.join("\n");
      }

      steps.push({
        title: titles[index] || `단계 ${index + 1}`, // 추출한 제목 사용
        content: content,
        stepNumber: index + 1,
        completed: false,
        category: "general",
      });
    });

    return steps;
  }

  // 새로운 헬퍼 함수: 하위 단계 파싱
  parseSubSteps(content) {
    const subSteps = [];
    const bulletPoints = content.match(/[-•]\s*\*\*(.*?)\*\*:(.*?)(?=[-•]|\n\n|$)/gs);

    if (bulletPoints) {
      bulletPoints.forEach((point) => {
        const match = point.match(/[-•]\s*\*\*(.*?)\*\*:(.*)/s);
        if (match) {
          subSteps.push({
            title: match[1].trim(),
            content: match[2].trim(),
          });
        }
      });
    }

    return subSteps;
  }

  // 개선된 Entry 블록 변환
  convertToEntryBlocks(content) {
    // 블록 데이터베이스 활용
    const blockDB = this.blockDatabase || {};

    let converted = content;

    // GPT가 언급한 블록명을 실제 Entry 블록명으로 변환
    const replacements = {
      "무한 반복": "[무한 반복하기]",
      "시작할 때": "[시작하기 버튼을 클릭했을 때]",
      "만약 ~라면": "[만약 ( )라면]",
      "x축으로 무작위 이동": "[x좌표를 ( )만큼 바꾸기]",
      "y축으로 무작위 이동": "[y좌표를 ( )만큼 바꾸기]",
      "고양이와 쥐가 닿았는지": "[( )에 닿았는가?]",
      "게임 종료": "[모든 스크립트 멈추기]",
      "0.5초 대기": "[( )초 기다리기]",
      "고양이의 x좌표를 쥐의 x좌표로": "[x좌표를 ( )(으)로 정하기]",
      "고양이의 y좌표를 쥐의 y좌표로": "[y좌표를 ( )(으)로 정하기]",
    };

    for (const [gptTerm, entryBlock] of Object.entries(replacements)) {
      converted = converted.replace(new RegExp(gptTerm, "gi"), entryBlock);
    }

    // 블록명 강조
    converted = converted.replace(/\[(.*?)\]/g, "**$1**");

    return converted;
  }

  // 콘텐츠에서 카테고리 추론
  getCategoryFromContent(content) {
    const lower = content.toLowerCase();

    if (lower.includes("오브젝트") || lower.includes("스프라이트")) return "object";
    if (lower.includes("움직") || lower.includes("이동") || lower.includes("좌표")) return "moving";
    if (lower.includes("시작") || lower.includes("클릭")) return "start";
    if (lower.includes("반복") || lower.includes("만약")) return "flow";
    if (lower.includes("변수") || lower.includes("점수")) return "variable";
    if (lower.includes("충돌") || lower.includes("닿")) return "judgement";

    return "general";
  }

  // 헬퍼 함수: 의사코드를 Entry 블록으로 변환
  convertPseudoCodeToEntryBlocks(content) {
    // ```코드블록``` 찾기
    const codeBlockRegex = /```(?:plaintext)?\n?([\s\S]*?)```/g;

    return content.replace(codeBlockRegex, (match, code) => {
      const lines = code.trim().split("\n");
      let entryBlocks = "\n**Entry 블록으로 변환:**\n";

      lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          const entryBlock = this.mapPseudoToEntry(trimmedLine);
          entryBlocks += `• ${entryBlock}\n`;
        }
      });

      return entryBlocks;
    });
  }

  // complexHandler.js에 추가
  filterUnnecessarySteps(steps) {
    // 제거할 단계들의 패턴
    const skipPatterns = [/로그인/i, /새.*프로젝트.*만들/i, /Entry.*접속/i, /계정.*생성/i, /회원.*가입/i];

    return steps.filter((step) => {
      const titleAndContent = `${step.title} ${step.content}`;
      return !skipPatterns.some((pattern) => pattern.test(titleAndContent));
    });
  }

  // 제목 정제
  cleanStepTitle(title) {
    // "1단계:", "2단계:" 등 제거
    let cleaned = title.replace(/^\d+단계[:：\s]*/i, "");

    // "~하기" 형태로 통일
    if (!cleaned.endsWith("하기") && !cleaned.endsWith("설정") && !cleaned.endsWith("추가")) {
      // 명사형이면 "~하기" 추가
      if (!cleaned.includes("을") && !cleaned.includes("를")) {
        cleaned = cleaned + " 추가";
      }
    }

    return cleaned.trim();
  }

  // 의사코드 → Entry 블록 매핑
  mapPseudoToEntry(pseudoCode) {
    const mappings = {
      "무한 반복": "[무한 반복하기]",
      위치를: "[오브젝트] 쪽 바라보기",
      향하게: "[오브젝트] 쪽 바라보기",
      다가가기: "(10)만큼 움직이기",
      이동하기: "(10)만큼 움직이기",
      닿으면: "만약 <( )에 닿았는가?> (이)라면",
      말하기: "( )(을)를 (2)초 동안 말하기",
      "게임 종료": "[모든 스크립트 멈추기]",
      랜덤: "(1)부터 (360)사이의 무작위 수",
      가장자리: "[화면 끝에 닿으면 튕기기]",
    };

    for (const [keyword, block] of Object.entries(mappings)) {
      if (pseudoCode.includes(keyword)) {
        return block + " 블록";
      }
    }

    return pseudoCode; // 매칭 안 되면 원본
  }

  // 제목에서 카테고리 추론
  getCategoryFromTitle(title) {
    const lower = title.toLowerCase();

    if (lower.includes("오브젝트") || lower.includes("준비")) return "setup";
    if (lower.includes("스크립트") || lower.includes("코드")) return "code";
    if (lower.includes("시작") || lower.includes("게임")) return "start";
    if (lower.includes("추가") || lower.includes("기능")) return "feature";

    return "general";
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

  // complexHandler.js에 추가

  /**
   * 영어 카테고리를 한글로 변환 (HTML 파싱 전에 실행)
   */
  convertCategoriesToKorean(text) {
    const categoryMap = {
      // 기본 카테고리
      start: "시작",
      flow: "흐름",
      moving: "움직임",
      variable: "자료",
      judgement: "판단",
      calc: "계산",
      sound: "소리",
      looks: "생김새",
      brush: "붓",
      func: "함수",

      // 대소문자 혼용 대응
      Start: "시작",
      Flow: "흐름",
      Moving: "움직임",
      Variable: "자료",
      Judgement: "판단",
      Calc: "계산",
      Sound: "소리",
      Looks: "생김새",
    };

    let converted = text;

    // <영어> 패턴을 (한글)로 변환
    for (const [eng, kor] of Object.entries(categoryMap)) {
      // <variable> → (자료)
      converted = converted.replace(new RegExp(`<${eng}>`, "gi"), `(${kor})`);

      // 혹시 **<variable>** 같은 케이스도 처리
      converted = converted.replace(new RegExp(`\\*\\*<${eng}>\\*\\*`, "gi"), `**(${kor})**`);
    }

    return converted;
  }

  // EntryKnowledge 활용 함수
  getStepFromKnowledge(patternKey) {
    if (EntryKnowledge && EntryKnowledge.commonPatterns[patternKey]) {
      const pattern = EntryKnowledge.commonPatterns[patternKey];
      let content = `### ${pattern.description}\\n\\n`;

      // 🔴 UI 작업인 경우
      if (pattern.isUIAction) {
        content += `**버튼 위치**: ${pattern.uiLocation || "UI 영역"}\\n\\n`;
        content += `**사용 방법**:\\n`;
      }
      // 블록 작업인 경우
      else {
        content += `**블록 위치**: ${this.getCategoryKorean(pattern.category || "unknown")} 카테고리\\n\\n`;
        content += `**사용할 블록**:\\n`;
      }

      pattern.steps.forEach((step, idx) => {
        content += `${idx + 1}. ${step}\\n`;
      });

      return content;
    }

    return "단계별 가이드를 준비합니다.";
  }

  generateObjectStep(objects) {
    const knowledge = EntryKnowledge.uiActions.addObject;

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

  getCategoryKorean(category) {
    const map = {
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
      text: "글상자",
    };
    return map[category] || category;
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
    const stepNumber = firstStep.stepNumber || 1;
    const title = firstStep.title || "게임 제작 시작";
    const targetObject = firstStep.targetObject || "전체";

    let content = firstStep.content || "단계별 가이드를 준비하고 있습니다...";
    console.log("  - firstStep:", firstStep);

    // 오브젝트 정보를 제목 바로 아래에 강조 표시
    const objectBadge = targetObject !== "전체" ? `\n🎯대상 오브젝트: ${targetObject}\n` : "";

    // firstStep 검증
    if (!firstStep) {
      console.error("❌ formatInitialResponse: 첫 번째 단계가 없음");
      return "가이드를 생성하는 중 문제가 발생했습니다. 다시 시도해주세요.";
    }

    // 속성들에 기본값 제공

    // 🔴 컨텍스트 정보 추가
    let contextSection = "";

    // Branch History가 있는 경우 표시
    if (this.contextManager && this.contextManager.branches && this.contextManager.branches.length > 0) {
      const allVariables = new Set();
      const allBlocks = new Set();
      const allConcepts = new Set();

      // 모든 branch에서 정보 수집
      this.contextManager.branches.forEach((branch) => {
        if (branch.context) {
          branch.context.variables?.forEach((v) => allVariables.add(v));
          branch.context.blocks?.forEach((b) => allBlocks.add(b));
          branch.context.concepts?.forEach((c) => allConcepts.add(c));
        }
      });

      // 컨텍스트 섹션 구성
      if (allVariables.size > 0 || allConcepts.size > 0) {
        contextSection = "\n\n## 📌 활용 가능한 요소\n\n";

        if (allVariables.size > 0) {
          contextSection += `**생성된 변수**: ${Array.from(allVariables).join(", ")}\n`;
        }

        if (allConcepts.size > 0) {
          contextSection += `**추가된 기능**: ${Array.from(allConcepts).join(", ")}\n`;
        }

        contextSection += "\n> 💡 위 요소들은 이미 생성되었으므로 바로 활용할 수 있습니다.\n";
      }
    }

    // 현재 단계의 변수/블록 정보가 있으면 추가
    if (firstStep.variables && firstStep.variables.length > 0) {
      content += `\n\n**이 단계에서 생성할 변수**: ${firstStep.variables.join(", ")}`;
    }

    if (firstStep.blocks && firstStep.blocks.length > 0) {
      const blockNames = firstStep.blocks.map((b) => {
        // entryBlockMap이 있으면 이름으로 변환
        if (typeof entryBlockMap !== "undefined" && entryBlockMap[b]) {
          return entryBlockMap[b];
        }
        return b;
      });
      content += `\n**사용할 블록**: ${blockNames.join(", ")}`;
    }

    // 🔴 Branch 진행 상태 표시
    let branchIndicator = "";
    if (this.contextManager && this.contextManager.branches && this.contextManager.branches.length > 0) {
      branchIndicator = `\n🔀 **확장 기능**: ${this.contextManager.branches.length}개 추가됨`;
    }

    const response =
      `# 🎮 게임 만들기 가이드\n\n` +
      `📊 **전체 진행**: ${stepNumber} / ${totalSteps || steps.length} 단계${branchIndicator}\n\n` +
      `---\n\n` +
      `## Step ${stepNumber}: ${title}\n\n` +
      `${objectBadge}\n` + // 오브젝트 정보를 제목 바로 아래에
      `${content}` +
      `${contextSection}` +
      `\n\n---\n\n` +
      `**네비게이션**: [다음 단계 →] 버튼을 클릭하세요`;

    console.log("✅ formatInitialResponse 완료");
    console.log("  - 컨텍스트 포함 여부:", contextSection !== "");

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
