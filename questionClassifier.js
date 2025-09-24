// questionClassifier.js - 새 파일 생성

class EntryQuestionClassifier {
  constructor() {
    // 엔트리 도메인 특화 분류 규칙
    this.classificationRules = {
      // 1. SIMPLE: 단순 블록 사용법
      simple: {
        keywords: [
          // 기본 질문 패턴
          "어떻게",
          "어떤",
          "무엇",
          "뭐",
          "뭘",
          "언제",
          // 블록 관련
          "블록",
          "사용법",
          "사용",
          "쓰는",
          "찾",
          "어디",
          // 기능 질문
          "기능",
          "역할",
          "의미",
          "설명",
          "알려",
        ],
        patterns: [/.*블록.*어디.*있/, /.*어떻게.*사용/, /.*무슨.*기능/, /.*뭐.*하는/],
        examples: ["반복 블록은 어디에 있어?", "변수는 어떻게 만들어?", "소리 블록 사용법 알려줘"],
        maxComplexity: 30, // 짧은 질문
        priority: 1,
      },

      // 2. COMPLEX: 프로젝트/게임 만들기
      complex: {
        keywords: [
          // 제작 관련
          "만들",
          "제작",
          "개발",
          "구현",
          "프로그램",
          // 게임 타입
          "게임",
          "RPG",
          "슈팅",
          "퍼즐",
          "시뮬레이션",
          // 복잡한 기능
          "시스템",
          "알고리즘",
          "로직",
          "AI",
          "인공지능",
          // 프로젝트 타입
          "계산기",
          "시계",
          "그림판",
          "챗봇",
          "애니메이션",
        ],
        patterns: [
          /.*게임.*만들/,
          /.*구현.*하고.*싶/,
          /.*프로젝트.*어떻게/,
          /.*만들.*수.*있/,
          /점수.*시스템/,
          /.*따라.*하는/, // "마우스 따라 움직이는"
        ],
        examples: ["간단한 슈팅 게임 만들고 싶어", "점수 시스템은 어떻게 구현해?", "공튕기기 게임 만들어줘"],
        minComplexity: 20, // 보통 긴 질문
        priority: 3,
      },

      // 3. DEBUG: 오류/문제 해결
      debug: {
        keywords: [
          // 문제 상황
          "안돼",
          "안되",
          "안됨",
          "오류",
          "에러",
          "버그",
          // 감정 표현
          "이상",
          "왜",
          "문제",
          "막혀",
          "멈춰",
          "작동",
          // 수정 요청
          "고쳐",
          "해결",
          "수정",
          "바꿔",
          "틀렸",
        ],
        patterns: [/.*안\s*돼/, /.*안\s*되/, /.*왜.*안/, /.*이상해/, /.*실행.*안/, /.*움직.*않/],
        emotionalCues: ["ㅠ", "ㅜ", "...", "??", "!", ";;;"],
        examples: ["코드 실행이 안돼요", "캐릭터가 안 움직여ㅠㅠ", "왜 반복이 멈추지 않아?"],
        priority: 5, // 최우선 처리
      },

      // 4. CONCEPTUAL: 프로그래밍 개념
      conceptual: {
        keywords: [
          // 프로그래밍 개념
          "변수",
          "함수",
          "조건문",
          "반복문",
          "리스트",
          "배열",
          // 개념 질문
          "개념",
          "원리",
          "이론",
          "정의",
          "차이",
          "비교",
          // 학습 관련
          "배우",
          "공부",
          "이해",
          "설명",
        ],
        patterns: [/.*차이.*뭐/, /.*개념.*설명/, /.*이란.*무엇/],
        examples: ["변수와 리스트의 차이가 뭐야?", "조건문 개념 설명해줘", "함수는 왜 사용해?"],
        priority: 2,
      },
    };

    // 신뢰도 임계값
    this.CONFIDENCE_THRESHOLD = 0.65;
  }

  // 메인 분류 함수
  async classify(message, context = {}) {
    console.log("🔍 질문 분류 시작:", message);

    // 1. 전처리
    const processed = this.preprocessMessage(message);

    // 2. 규칙 기반 분류
    const ruleBasedResult = this.ruleBasedClassify(processed);

    // 3. 신뢰도 확인
    if (ruleBasedResult.confidence >= this.CONFIDENCE_THRESHOLD) {
      console.log(`✅ 규칙 기반 분류 완료: ${ruleBasedResult.type} (신뢰도: ${ruleBasedResult.confidence})`);
      return ruleBasedResult;
    }

    // 4. 신뢰도가 낮으면 OpenAI API 사용
    console.log("🤖 신뢰도 부족, AI 분류 시도...");
    return await this.aiClassify(message, ruleBasedResult);
  }

  // 메시지 전처리
  preprocessMessage(message) {
    return {
      original: message,
      normalized: message.toLowerCase().replace(/\s+/g, " ").trim(),
      length: message.length,
      wordCount: message.split(/\s+/).length,
      hasEmoticon: /[ㅠㅜㅋㅎ]|[.]{2,}|[!?]{2,}/.test(message),
      hasCode: /when_|if_|repeat_|move_/.test(message), // 엔트리 블록 이름
    };
  }

  // 규칙 기반 분류
  ruleBasedClassify(processed) {
    const scores = {};

    for (const [type, rules] of Object.entries(this.classificationRules)) {
      scores[type] = this.calculateTypeScore(processed, rules);
    }

    // 정규화 및 최고 점수 찾기
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const normalizedScores = {};
    let maxType = null;
    let maxScore = 0;

    for (const [type, score] of Object.entries(scores)) {
      normalizedScores[type] = score / totalScore;
      if (score > maxScore) {
        maxScore = score;
        maxType = type;
      }
    }

    return {
      type: maxType,
      confidence: normalizedScores[maxType],
      scores: normalizedScores,
      method: "rule-based",
    };
  }

  // 타입별 점수 계산
  calculateTypeScore(processed, rules) {
    let score = 0;
    const text = processed.normalized;

    // 키워드 매칭
    for (const keyword of rules.keywords || []) {
      if (text.includes(keyword)) {
        score += 2 * (rules.priority || 1);
      }
    }

    // 패턴 매칭
    for (const pattern of rules.patterns || []) {
      if (pattern.test(text)) {
        score += 3 * (rules.priority || 1);
      }
    }

    // 길이 체크
    if (rules.maxComplexity && processed.length <= rules.maxComplexity) {
      score += 1;
    }
    if (rules.minComplexity && processed.length >= rules.minComplexity) {
      score += 1;
    }

    // 감정 단서 (디버그용)
    if (rules.emotionalCues && processed.hasEmoticon) {
      for (const cue of rules.emotionalCues) {
        if (text.includes(cue)) {
          score += 2;
        }
      }
    }

    return score;
  }

  // AI 기반 분류 (OpenAI API)
  async aiClassify(message, ruleResult) {
    try {
      const settings = await chrome.storage.sync.get(["openai_api_key"]);
      if (!settings.openai_api_key) {
        console.warn("⚠️ API 키 없음, 규칙 기반 결과 사용");
        return { ...ruleResult, method: "rule-based-fallback" };
      }

      const systemPrompt = `당신은 엔트리(Entry) 블록코딩 질문 분류 전문가입니다.
      
질문을 다음 4가지 중 하나로 정확히 분류하세요:
- simple: 단순한 블록 사용법이나 위치를 묻는 질문
- complex: 게임이나 프로젝트를 만드는 방법을 묻는 질문  
- debug: 오류나 문제 해결을 요청하는 질문
- conceptual: 프로그래밍 개념이나 원리를 묻는 질문

오직 타입명만 답하세요.`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.openai_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `질문: "${message}"` },
          ],
          max_tokens: 10,
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiType = data.choices[0].message.content.trim().toLowerCase();

        console.log(`🤖 AI 분류 결과: ${aiType}`);

        return {
          type: aiType,
          confidence: 0.9, // AI 분류는 높은 신뢰도 부여
          method: "ai-classified",
          ruleBasedGuess: ruleResult.type,
        };
      }
    } catch (error) {
      console.error("AI 분류 실패:", error);
    }

    // AI 실패시 규칙 기반 결과 사용
    return { ...ruleResult, method: "fallback" };
  }
}

// 전역으로 내보내기
window.EntryQuestionClassifier = EntryQuestionClassifier;
