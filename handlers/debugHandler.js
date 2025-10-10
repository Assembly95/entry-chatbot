// debugHandler.js - 연구 기반 오류 패턴을 통합한 디버깅 핸들러

class DebugHandler {
  constructor() {
    // NuzzleBug 논문 기반 Entry/Scratch 공통 오류 패턴
    this.researchPatterns = {
      // 1. 조건 검사를 반복 블록 밖에 배치 (가장 흔한 오류)
      conditionOutsideLoop: {
        title: "조건 검사가 한 번만 실행됨",
        frequency: 68, // 68%의 학습자가 경험
        symptoms: [
          "처음에만 작동하고 그 다음은 안 돼요",
          "충돌을 한 번만 감지해요",
          "키를 계속 눌러도 한 번만 반응해요",
          "게임 중에 조건 체크가 안 돼요",
        ],
        diagnosis: "조건 블록이 반복문 밖에 있어서 한 번만 실행됩니다",
        quickCheck: ["**만약 ~라면** 블록이 어디 있나요?", "**무한 반복하기** 블록 안에 있나요?", "시작 블록 바로 아래 있나요?"],
        solutions: [
          "**만약 ~라면** 블록을 **무한 반복하기** 블록 안으로 이동",
          "조건은 게임 내내 계속 체크되어야 합니다",
          "반복문 밖의 조건은 프로그램 시작 시 한 번만 실행됩니다",
        ],
        visualExample: `
❌ 잘못된 구조:
┌─[시작하기 클릭]
├─[만약 스페이스키 눌렸다면]  ← 한 번만 체크!
│  └─[10만큼 점프하기]
└─[무한 반복하기]
   └─[중력 효과]

✅ 올바른 구조:
┌─[시작하기 클릭]
└─[무한 반복하기]
   ├─[만약 스페이스키 눌렸다면]  ← 계속 체크!
   │  └─[10만큼 점프하기]
   └─[중력 효과]`,
        preventionTip: "💡 게임 로직은 항상 무한 반복 안에!",
      },

      // 2. 변수 범위 설정 오류
      variableScope: {
        title: "변수 범위 설정 오류",
        frequency: 45,
        symptoms: [
          "다른 오브젝트에서 변수가 안 보여요",
          "점수가 각 스프라이트마다 따로 계산돼요",
          "변수값이 공유가 안 돼요",
          "복제본마다 변수가 다르게 작동해요",
        ],
        diagnosis: "변수가 '이 스프라이트만'으로 설정되어 있습니다",
        quickCheck: [
          "변수를 만들 때 어떤 옵션을 선택했나요?",
          "변수 옆에 스프라이트 이름이 표시되나요?",
          "모든 스프라이트에서 같은 변수를 사용하나요?",
        ],
        solutions: [
          "변수 삭제 후 다시 생성 시 **'모든 스프라이트'** 선택",
          "게임 점수/생명 = 모든 스프라이트",
          "개별 속도/상태 = 이 스프라이트만",
        ],
        visualExample: `
변수 생성 시:
┌─────────────────────┐
│ 새 변수             │
│ 이름: [점수]        │
│ ◯ 이 스프라이트만   │ ← 개별 데이터
│ ● 모든 스프라이트   │ ← 공유 데이터 ✅
└─────────────────────┘`,
        preventionTip: "💡 전역 데이터는 '모든 스프라이트' 선택!",
      },

      // 3. 메시지/신호 송수신 오류
      messageNotReceived: {
        title: "신호/메시지 송수신 오류",
        frequency: 42,
        symptoms: [
          "신호를 보냈는데 반응이 없어요",
          "다른 오브젝트가 움직이지 않아요",
          "신호 받기가 작동 안 해요",
          "연쇄 동작이 실행되지 않아요",
        ],
        diagnosis: "신호 이름 불일치 또는 수신 블록 누락",
        quickCheck: [
          "보내는 신호 이름과 받는 신호 이름이 100% 같나요?",
          "대소문자, 띄어쓰기까지 확인했나요?",
          "받는 오브젝트에 수신 블록이 있나요?",
        ],
        solutions: [
          "**[신호 보내기]**의 이름 확인",
          "**[~신호 받았을 때]** 블록의 이름 확인",
          "철자, 띄어쓰기, 대소문자 정확히 일치시키기",
          "드롭다운에서 동일한 신호 선택하기",
        ],
        visualExample: `
❌ 오류 예시:
스프라이트1: [신호 보내기: "시작"]
스프라이트2: [신호 받았을 때: "시작 "] ← 띄어쓰기!

✅ 올바른 예시:
스프라이트1: [신호 보내기: "게임시작"]
스프라이트2: [신호 받았을 때: "게임시작"] ← 정확히 일치!`,
        preventionTip: "💡 신호 이름은 복사-붙여넣기 추천!",
      },

      // 4. 복제본 생성/처리 오류
      cloneIssues: {
        title: "복제본 관련 오류",
        frequency: 38,
        symptoms: [
          "복제본이 생성되지 않아요",
          "복제본이 사라지지 않아요",
          "원본과 복제본이 같이 움직여요",
          "복제본이 너무 많이 생성돼요",
        ],
        diagnosis: "복제본 블록 사용법 오류",
        quickCheck: [
          "**[복제본 생성하기]** 블록이 있나요?",
          "**[복제본이 생성되었을 때]** 블록이 있나요?",
          "복제본 삭제 조건이 있나요?",
        ],
        solutions: [
          "원본 동작: 일반 시작 블록 아래",
          "복제본 동작: **[복제본이 생성되었을 때]** 아래",
          "복제본 제거: **[이 복제본 삭제]** 사용",
          "복제 제한: 변수로 개수 관리",
        ],
        visualExample: `
올바른 구조:
┌─[시작하기 클릭]        ← 원본용
├─[숨기기]
└─[무한 반복하기]
   └─[1초 기다리기]
   └─[나 자신의 복제본 생성]

┌─[복제본이 생성되었을 때] ← 복제본용
├─[보이기]
├─[무작위 위치로 이동]
└─[5초 후 이 복제본 삭제]`,
        preventionTip: "💡 원본과 복제본 코드는 별도로 작성!",
      },

      // 5. 블록 실행 순서 오류
      blockOrder: {
        title: "블록 실행 순서 오류",
        frequency: 35,
        symptoms: [
          "동작 순서가 뒤바뀌어요",
          "동시에 실행되어야 하는데 순차적으로 실행돼요",
          "기다리기가 작동하지 않아요",
          "애니메이션이 끊겨요",
        ],
        diagnosis: "블록 연결 순서나 병렬 실행 이해 부족",
        quickCheck: [
          "블록들이 위에서 아래로 연결되어 있나요?",
          "기다리기 블록 위치가 적절한가요?",
          "여러 스크립트를 동시에 실행하려 했나요?",
        ],
        solutions: [
          "순차 실행: 블록을 위아래로 연결",
          "동시 실행: 별도의 시작 블록 사용",
          "타이밍 조절: **[~초 기다리기]** 사용",
          "부드러운 움직임: **[~초 동안 ~로 이동]** 사용",
        ],
        visualExample: `
순차 실행:          동시 실행:
┌─[시작]           ┌─[시작]      ┌─[시작]
├─[동작1]          └─[동작1]     └─[동작2]
└─[동작2]          
                   두 개의 별도 스크립트!`,
        preventionTip: "💡 순서가 중요하면 연결, 동시면 분리!",
      },
    };

    // 기존 일반 오류 패턴
    this.generalPatterns = {
      notWorking: {
        title: "전혀 작동하지 않음",
        frequency: 25,
        symptoms: ["아무 반응이 없어요", "실행이 안 돼요"],
        quickCheck: ["실행 버튼(▶️)을 클릭했나요?", "시작 이벤트 블록(녹색)이 있나요?", "블록들이 연결되어 있나요?"],
        solutions: ["시작 블록 확인", "블록 연결 확인", "오브젝트 선택 확인"],
      },

      notMoving: {
        title: "움직이지 않음",
        frequency: 30,
        symptoms: ["캐릭터가 안 움직여요", "이동이 안 돼요"],
        quickCheck: ["이동 거리가 0이 아닌가요?", "화면 밖으로 나갔나요?", "다른 코드가 막고 있나요?"],
        solutions: ["이동값 확인", "좌표 초기화", "충돌 확인"],
      },

      collision: {
        title: "충돌 감지 실패",
        frequency: 28,
        symptoms: ["닿았는데 감지 안 돼요", "충돌이 작동 안 해요"],
        quickCheck: ["오브젝트 이름이 정확한가요?", "충돌 감지가 반복문 안에 있나요?", "오브젝트가 실제로 겹치나요?"],
        solutions: ["이름 확인", "반복문 확인", "히트박스 확인"],
      },
    };

    // 모든 패턴 통합
    this.allPatterns = {
      ...this.researchPatterns,
      ...this.generalPatterns,
    };
  }

  /**
   * 메인 핸들러 - RAG 검색 통합
   */
  async handle(decomposed, message) {
    console.log("🐛 DebugHandler 처리 시작");

    // 1. 패턴 매칭으로 문제 식별
    const problemType = this.identifyProblem(message);
    console.log(`🔍 식별된 문제 유형: ${problemType}`);

    // 2. RAG 검색으로 관련 블록 찾기
    let ragResults = [];
    if (typeof searchEntryBlocks !== "undefined") {
      try {
        ragResults = await searchEntryBlocks(message, 3);
        console.log(`📚 관련 블록 ${ragResults.length}개 발견`);
      } catch (error) {
        console.error("RAG 검색 실패:", error);
      }
    }

    // 3. 문제 유형에 따른 응답 생성
    if (problemType && this.allPatterns[problemType]) {
      return this.generateSmartDiagnosis(problemType, ragResults, message);
    } else {
      return this.startInteractiveDebug(message, ragResults);
    }
  }

  /**
   * 지능형 문제 식별
   */
  identifyProblem(message) {
    const lower = message.toLowerCase();

    // 연구 기반 패턴 우선 체크 (더 정확함)

    // 1. 조건 반복 문제
    if (
      lower.includes("한 번만") ||
      lower.includes("처음만") ||
      lower.includes("처음에만") ||
      (lower.includes("키") && lower.includes("안")) ||
      (lower.includes("충돌") && lower.includes("한번"))
    ) {
      return "conditionOutsideLoop";
    }

    // 2. 변수 범위 문제
    if (
      (lower.includes("변수") || lower.includes("점수")) &&
      (lower.includes("안 보") || lower.includes("공유") || lower.includes("다른") || lower.includes("각자"))
    ) {
      return "variableScope";
    }

    // 3. 신호/메시지 문제
    if (
      lower.includes("신호") ||
      lower.includes("메시지") ||
      lower.includes("메세지") ||
      (lower.includes("보냈") && lower.includes("안"))
    ) {
      return "messageNotReceived";
    }

    // 4. 복제본 문제
    if (lower.includes("복제") || lower.includes("복사") || lower.includes("클론") || lower.includes("총알")) {
      return "cloneIssues";
    }

    // 5. 순서 문제
    if (lower.includes("순서") || lower.includes("동시에") || lower.includes("먼저") || lower.includes("나중에")) {
      return "blockOrder";
    }

    // 일반 패턴 체크
    if (lower.includes("안 움직") || lower.includes("움직이지")) {
      return "notMoving";
    }

    if ((lower.includes("충돌") || lower.includes("닿")) && !lower.includes("한번")) {
      return "collision";
    }

    if (lower.includes("작동") || lower.includes("안돼") || lower.includes("안됨")) {
      return "notWorking";
    }

    return null;
  }

  /**
   * 스마트 진단 생성
   */
  generateSmartDiagnosis(problemType, ragResults, message) {
    const pattern = this.allPatterns[problemType];
    if (!pattern) return this.generateFallbackResponse(message);

    // 응답 HTML 생성
    let response = `
<div style="
  background: linear-gradient(135deg, #fff5f5, #ffe0e0);
  border-radius: 16px;
  padding: 24px;
  border-left: 4px solid #ff4444;
  margin: 16px 0;
">
  <h2 style="color: #cc0000; margin: 0 0 16px 0;">
    🔍 문제 진단: ${pattern.title}
  </h2>
  
  ${
    pattern.frequency
      ? `
  <div style="
    background: rgba(255,255,255,0.8);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
  ">
    📊 <strong>통계</strong>: Entry 학습자의 약 <span style="color: #ff4444; font-weight: bold;">${pattern.frequency}%</span>가 이 실수를 경험합니다.
  </div>
  `
      : ""
  }
  
  <div style="margin: 16px 0;">
    <h3 style="color: #333; margin-bottom: 8px;">증상 체크 ✓</h3>
    <ul style="list-style: none; padding: 0;">
      ${pattern.symptoms
        .map(
          (s) => `
        <li style="margin: 4px 0; padding: 8px; background: white; border-radius: 4px;">
          ${this.checkSymptom(s, message) ? "✅" : "⬜"} ${s}
        </li>
      `
        )
        .join("")}
    </ul>
  </div>
  
  <div style="
    background: #fff9e6;
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
    border: 1px solid #ffd700;
  ">
    <h3 style="color: #ff8800; margin: 0 0 8px 0;">🔬 진단</h3>
    <p style="margin: 0; font-weight: 600;">
      ${pattern.diagnosis}
    </p>
  </div>
  
  <div style="margin: 16px 0;">
    <h3 style="color: #333; margin-bottom: 8px;">🔧 빠른 체크리스트</h3>
    ${pattern.quickCheck
      .map(
        (check, idx) => `
      <div style="
        background: white;
        border-radius: 8px;
        padding: 12px;
        margin: 8px 0;
        border-left: 3px solid #4CAF50;
      ">
        <strong>체크 ${idx + 1}:</strong> ${check}
      </div>
    `
      )
      .join("")}
  </div>
  
  <div style="
    background: #e8f5e9;
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
  ">
    <h3 style="color: #2e7d32; margin: 0 0 12px 0;">✅ 해결 방법</h3>
    ${pattern.solutions
      .map(
        (solution, idx) => `
      <div style="margin: 8px 0; padding: 8px;">
        <strong style="color: #2e7d32;">Step ${idx + 1}:</strong> ${solution}
      </div>
    `
      )
      .join("")}
  </div>
  
  ${
    pattern.visualExample
      ? `
  <div style="
    background: #f5f5f5;
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
    font-family: monospace;
    white-space: pre-wrap;
    font-size: 13px;
    border: 1px solid #ddd;
  ">
    <h4 style="margin: 0 0 12px 0; color: #555;">📝 코드 예시</h4>
${pattern.visualExample}
  </div>
  `
      : ""
  }
  
  <div style="
    background: linear-gradient(135deg, #e3f2fd, #bbdefb);
    border-radius: 8px;
    padding: 12px;
    margin-top: 16px;
    border: 1px solid #2196f3;
  ">
    ${pattern.preventionTip}
  </div>
</div>

${ragResults.length > 0 ? this.generateRelatedBlocks(ragResults) : ""}

<div style="
  margin-top: 20px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px dashed #999;
">
  <strong>🤔 여전히 해결이 안 되나요?</strong><br>
  다음 정보를 알려주세요:<br>
  • 사용한 블록 구성<br>
  • 기대한 동작<br>
  • 실제 동작<br>
</div>
    `;

    return {
      success: true,
      response: response,
      type: "debug-diagnosis",
      problemType: problemType,
      confidence: pattern.frequency ? pattern.frequency / 100 : 0.7,
      responseType: "html",
    };
  }

  /**
   * 증상 체크
   */
  checkSymptom(symptom, message) {
    const lower = message.toLowerCase();
    const symptomLower = symptom.toLowerCase();

    // 간단한 키워드 매칭
    const keywords = symptomLower.split(" ").filter((w) => w.length > 2);
    return keywords.some((keyword) => lower.includes(keyword));
  }

  /**
   * 관련 블록 표시
   */
  generateRelatedBlocks(ragResults) {
    if (!ragResults || ragResults.length === 0) return "";

    return `
<div style="
  margin-top: 20px;
  padding: 16px;
  background: #f0f4f8;
  border-radius: 8px;
">
  <h4 style="margin: 0 0 12px 0;">🔗 관련 블록</h4>
  ${ragResults
    .slice(0, 3)
    .map(
      (block) => `
    <div style="
      background: white;
      padding: 8px 12px;
      margin: 6px 0;
      border-radius: 4px;
      border-left: 3px solid ${this.getCategoryColor(block.category)};
    ">
      <strong>${block.name}</strong>
      <span style="color: #666; font-size: 12px; margin-left: 8px;">
        (${this.getCategoryName(block.category)})
      </span>
    </div>
  `
    )
    .join("")}
</div>
    `;
  }

  /**
   * 대화형 디버깅 시작
   */
  startInteractiveDebug(message, ragResults) {
    let response = `
<div style="
  background: linear-gradient(135deg, #e8eaf6, #c5cae9);
  border-radius: 16px;
  padding: 24px;
  margin: 16px 0;
">
  <h2 style="color: #3f51b5; margin: 0 0 16px 0;">
    🔍 디버깅 도우미
  </h2>
  
  <p style="margin-bottom: 20px;">
    함께 문제를 해결해봐요! 어떤 문제인지 선택해주세요:
  </p>
  
  <div style="display: grid; gap: 12px;">
    ${Object.entries(this.researchPatterns)
      .map(
        ([key, pattern]) => `
      <div style="
        background: white;
        border-radius: 8px;
        padding: 16px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.3s;
        position: relative;
      " onmouseover="this.style.borderColor='#3f51b5'" onmouseout="this.style.borderColor='transparent'">
        <div style="
          position: absolute;
          top: 8px;
          right: 8px;
          background: #ff4444;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
        ">${pattern.frequency}%</div>
        <strong style="color: #3f51b5;">${pattern.title}</strong>
        <p style="margin: 8px 0 0 0; color: #666; font-size: 13px;">
          ${pattern.symptoms[0]}
        </p>
      </div>
    `
      )
      .join("")}
  </div>
  
  <div style="
    margin-top: 20px;
    padding: 16px;
    background: rgba(255,255,255,0.8);
    border-radius: 8px;
  ">
    <strong>💬 또는 문제를 직접 설명해주세요:</strong>
    <ul style="margin: 8px 0 0 0; color: #666;">
      <li>어떤 블록을 사용했나요?</li>
      <li>어떤 동작을 기대했나요?</li>
      <li>실제로 어떻게 작동하나요?</li>
    </ul>
  </div>
</div>
    `;

    return {
      success: true,
      response: response,
      type: "debug-interactive",
      requiresMoreInfo: true,
      responseType: "html",
    };
  }

  /**
   * 폴백 응답
   */
  generateFallbackResponse(message) {
    return {
      success: true,
      response: `
## 🔍 디버깅 도우미

문제를 정확히 파악하지 못했어요. 다음 정보를 확인해주세요:

### 기본 체크리스트
✅ 실행 버튼을 눌렀나요?
✅ 시작 이벤트 블록이 있나요?
✅ 블록들이 제대로 연결되어 있나요?
✅ 올바른 오브젝트를 선택했나요?

### 자주 발생하는 실수들
- **조건이 한 번만 체크됨** → 반복문 안에 넣기
- **변수가 공유 안 됨** → '모든 스프라이트' 설정
- **신호가 전달 안 됨** → 이름 정확히 일치시키기
- **복제본 문제** → 생성과 삭제 코드 분리

구체적인 증상을 알려주시면 더 정확히 도와드릴게요!
      `,
      type: "debug-fallback",
      responseType: "markdown",
    };
  }

  /**
   * 카테고리 헬퍼 함수들
   */
  getCategoryName(category) {
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
    };
    return map[category] || category;
  }

  getCategoryColor(category) {
    const colors = {
      start: "#00B400",
      moving: "#4C97FF",
      looks: "#9966FF",
      sound: "#CF63CF",
      judgement: "#5CB1D6",
      flow: "#FFAB19",
      variable: "#FF8C1A",
      func: "#FF6680",
      calc: "#59C059",
    };
    return colors[category] || "#757575";
  }
}

// Export for Service Worker
if (typeof self !== "undefined") {
  self.DebugHandler = DebugHandler;
}
