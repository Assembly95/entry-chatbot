// questionClassifier.js - Entry 블록코딩 질문 분류기 (오류 수정 버전)

/**
 * Entry 블록코딩 질문 분류기
 * 한국어 형태소 분석 + 하이브리드 방식 (규칙 기반 + AI)
 */
class EntryQuestionClassifier {
  constructor() {
    // 한국어 전처리를 위한 조사/어미 패턴
    this.josaPatterns = [
      "을",
      "를",
      "이",
      "가",
      "은",
      "는",
      "의",
      "에",
      "에서",
      "으로",
      "로",
      "와",
      "과",
      "이나",
      "나",
      "에게",
      "한테",
      "부터",
      "까지",
      "만",
      "도",
      "요",
      "죠",
      "네요",
      "어요",
      "아요",
      "에는",
      "에도",
      "으로도",
      "로도",
      "이야",
      "야",
    ];

    // 어미 정규화 매핑
    this.verbEndings = {
      "하고 싶어": "하기",
      하고싶어: "하기",
      할래: "하기",
      하려면: "하기",
      하려고: "하기",
      하는: "하기",
      했을때: "할때",
      눌렀을때: "누를때",
      닿았을때: "닿을때",
      누르면: "누를때",
      닿으면: "닿을때",
      하면: "할때",
    };

    // 동의어 매핑
    this.synonymMap = {
      스페이스바: "스페이스키",
      스페이스: "스페이스키",
      엔터: "엔터키",
      앞으로: "전진",
      뒤로: "후진",
      위로: "상승",
      아래로: "하강",
      쏘기: "발사",
      쏘다: "발사",
      맞추기: "충돌",
      부딪치기: "충돌",
      닿기: "충돌",
      만들기: "제작",
      움직이기: "이동",
      움직임: "이동",
    };

    // 블록 매핑 테이블 (키워드 → 블록 파일명)
    this.keywordToBlocks = {
      스페이스키: {
        blocks: ["when_some_key_pressed"],
        category: "start",
      },
      키: {
        blocks: ["when_some_key_pressed", "is_press_some_key"],
        category: "start",
      },
      이동: {
        blocks: ["move_direction", "move_x", "move_y", "locate_xy"],
        category: "moving",
      },
      전진: {
        blocks: ["move_direction", "move_x"],
        category: "moving",
      },
      후진: {
        blocks: ["move_direction", "move_x"],
        category: "moving",
      },
      상승: {
        blocks: ["move_y"],
        category: "moving",
      },
      하강: {
        blocks: ["move_y"],
        category: "moving",
      },
      반복: {
        blocks: ["repeat_basic", "repeat_inf", "repeat_while_true"],
        category: "flow",
      },
      조건: {
        blocks: ["_if", "if_else"],
        category: "flow",
      },
      만약: {
        blocks: ["_if", "if_else"],
        category: "flow",
      },
      충돌: {
        blocks: ["is_touched", "reach_something"],
        category: "judgement",
      },
      발사: {
        blocks: ["create_clone", "when_clone_start"],
        category: "flow",
      },
      복제: {
        blocks: ["create_clone", "delete_clone", "when_clone_start"],
        category: "flow",
      },
      변수: {
        blocks: ["set_variable", "get_variable", "change_variable"],
        category: "variable",
      },
      점수: {
        blocks: ["set_variable", "change_variable", "show_variable"],
        category: "variable",
      },
      총알: {
        blocks: ["create_clone", "when_clone_start", "delete_clone"],
        category: "flow",
      },
    };

    // 분류 패턴 정의
    this.patterns = {
      simple: {
        keywords: [
          "블록",
          "어떻게",
          "어떤",
          "무엇을",
          "추가",
          "사용법",
          "위치",
          "방법",
          "찾기",
          "연결",
          "어디",
          "쓰는",
          "사용",
          "누르면",
          "눌렀을때",
          "실행",
          "시작",
        ],
        negativeKeywords: ["게임", "프로그램", "프로젝트", "시스템", "애니메이션", "작품"],
        patterns: [
          /.*블록.*사용/,
          /어떻게.*(?!만들|제작|개발)/,
          /.*방법(?!.*만들)/,
          /.*어디.*있/,
          /.*찾/,
          /.*연결/,
          /.*키.*누르/,
          /.*이동.*블록/,
          /.*누르면.*실행/,
          /.*눌렀을.*때/,
          /스페이스.*실행/,
        ],
        weight: 1.0,
      },
      complex: {
        keywords: [
          "게임",
          "프로젝트",
          "애니메이션",
          "작품",
          "프로그램",
          "시스템",
          "챗봇",
          "미로",
          "그림판",
          "만들고 싶",
          "계산기",
          "타자",
          "퀴즈",
          "슈팅",
          "경주",
          "제작",
          "구현",
        ],
        patterns: [
          /.*게임.*만들/,
          /.*프로젝트.*구현/,
          /.*프로그램.*제작/,
          /.*만들고\s*싶/,
          /.*제작.*하/,
          /.*개발/,
          /.*구현/,
          /슈팅.*게임/,
        ],
        weight: 1.2,
      },
      debug: {
        keywords: [
          "오류",
          "에러",
          "안돼",
          "안됨",
          "버그",
          "문제",
          "해결",
          "작동",
          "실행",
          "안 나",
          "안나",
          "멈춰",
          "멈춤",
          "충돌",
          "감지",
          "안되",
          "않아",
          "못하",
          "실패",
        ],
        patterns: [
          /.*오류.*발생/,
          /.*작동.*안/,
          /.*안\s*돼/,
          /실행.*안/,
          /왜.*안/,
          /.*안\s*나/,
          /.*멈춰/,
          /.*버그/,
          /.*충돌.*안/,
          /.*안\s*되/,
          /.*안\s*움직/,
        ],
        weight: 1.5,
      },
      conceptual: {
        keywords: [
          "무엇",
          "원리",
          "개념",
          "설명",
          "이해",
          "차이점",
          "의미",
          "이란",
          "비교",
          "차이",
          "정의",
          "기능",
          "뭐야",
          "뭔가",
        ],
        patterns: [
          /.*무엇인가요/,
          /.*설명.*주세요/,
          /.*이란\s*무엇/,
          /.*이란$/,
          /.*원리/,
          /.*개념/,
          /.*비교/,
          /.*차이/,
          /.*의미/,
          /.*뭐야/,
          /.*뭔가요/,
        ],
        weight: 0.8,
      },
    };

    this.CONFIDENCE_THRESHOLD = 0.65;

    // 통계 수집용
    this.statistics = {
      totalClassifications: 0,
      ruleBasedClassifications: 0,
      aiClassifications: 0,
      classificationsByType: {
        simple: 0,
        complex: 0,
        debug: 0,
        conceptual: 0,
      },
    };
  }

  /**
   * 안전한 문자열 변환
   */
  safeToString(value) {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value);
  }

  /**
   * 텍스트 정규화
   */
  normalizeText(text) {
    // 안전한 문자열 변환
    const safeText = this.safeToString(text);
    if (!safeText) return "";

    let normalized = safeText.toLowerCase().trim();

    // 특수문자 제거 (한글, 영문, 숫자, 공백만 남김)
    normalized = normalized.replace(/[^가-힣a-z0-9\s]/g, " ");

    // 중복 공백 제거
    normalized = normalized.replace(/\s+/g, " ");

    return normalized;
  }

  /**
   * 한국어 형태소 분석
   */
  tokenizeKorean(text) {
    const safeText = this.safeToString(text);
    if (!safeText) return [];

    let tokens = safeText.split(" ");
    let processed = [];

    for (let token of tokens) {
      if (!token) continue;

      // 조사 제거
      for (let josa of this.josaPatterns) {
        const regex = new RegExp(josa + "$");
        if (regex.test(token)) {
          token = token.replace(regex, "");
          break;
        }
      }

      // 어미 정규화
      for (let [ending, normalized] of Object.entries(this.verbEndings)) {
        if (token.includes(ending)) {
          token = token.replace(ending, normalized);
        }
      }

      // 동의어 변환
      if (this.synonymMap[token]) {
        token = this.synonymMap[token];
      }

      if (token.length > 0) {
        processed.push(token);
      }
    }

    return processed;
  }

  /**
   * 키워드 추출 및 블록 매핑
   */
  extractKeywords(tokens, originalText) {
    const keywords = [];
    const blockRecommendations = [];

    // tokens가 배열이 아닌 경우 처리
    if (!Array.isArray(tokens)) {
      console.warn("Tokens is not an array:", tokens);
      tokens = [];
    }

    // originalText 안전한 변환
    const safeOriginalText = this.safeToString(originalText);

    // 토큰별 키워드 매칭
    for (let token of tokens) {
      if (!token) continue;

      // 정확한 매칭
      if (this.keywordToBlocks[token]) {
        keywords.push(token);
        blockRecommendations.push({
          keyword: token,
          ...this.keywordToBlocks[token],
        });
      }

      // 부분 매칭
      for (let [keyword, mapping] of Object.entries(this.keywordToBlocks)) {
        if (token.includes(keyword) || keyword.includes(token)) {
          if (!keywords.includes(keyword)) {
            keywords.push(keyword);
            blockRecommendations.push({
              keyword: keyword,
              ...mapping,
            });
          }
        }
      }
    }

    // 원본 텍스트에서 추가 키워드 추출
    if (safeOriginalText) {
      for (let [keyword, mapping] of Object.entries(this.keywordToBlocks)) {
        if (safeOriginalText.includes(keyword) && !keywords.includes(keyword)) {
          keywords.push(keyword);
          blockRecommendations.push({
            keyword: keyword,
            ...mapping,
          });
        }
      }
    }

    return { keywords, blockRecommendations };
  }

  /**
   * 메인 분류 함수
   */
  async classify(message) {
    // 입력 검증
    if (message === undefined || message === null) {
      console.warn("Message is null or undefined");
      return {
        type: "simple",
        confidence: 0.5,
        method: "error",
        keywords: [],
        scores: {},
        blockRecommendations: [],
      };
    }

    // 안전한 문자열 변환
    const messageStr = this.safeToString(message).trim();

    if (!messageStr) {
      console.warn("Empty message after conversion");
      return {
        type: "simple",
        confidence: 0.5,
        method: "empty",
        keywords: [],
        scores: {},
        blockRecommendations: [],
      };
    }

    try {
      const normalized = this.normalizeText(messageStr);
      const tokens = this.tokenizeKorean(normalized);
      const { keywords, blockRecommendations } = this.extractKeywords(tokens, normalized);

      console.log("📝 원본:", messageStr);
      console.log("🔤 정규화:", normalized);
      console.log("📦 토큰:", tokens);
      console.log("🔑 키워드:", keywords);
      console.log("🎯 추천 블록:", blockRecommendations);

      // 규칙 기반 분류
      const ruleResult = this.classifyByRulesWithTokens(normalized, tokens, keywords);
      ruleResult.keywords = keywords;
      ruleResult.blockRecommendations = blockRecommendations;

      console.log("📏 규칙 기반 결과:", ruleResult);

      // 신뢰도 체크
      if (ruleResult.confidence >= this.CONFIDENCE_THRESHOLD) {
        this.updateStatistics(ruleResult.type, "rules");
        return ruleResult;
      }

      // 신뢰도가 낮으면 AI 분류 시도
      console.log("🤖 신뢰도 부족, AI 분류 시도...");
      const aiResult = await this.classifyWithAI(messageStr);

      if (aiResult) {
        aiResult.keywords = keywords;
        aiResult.blockRecommendations = blockRecommendations;
        this.updateStatistics(aiResult.type, "ai");
        return aiResult;
      }

      // AI도 실패하면 규칙 기반 결과 사용
      this.updateStatistics(ruleResult.type, "rules-fallback");
      return { ...ruleResult, method: "rules-fallback" };
    } catch (error) {
      console.error("Classification error:", error);
      return {
        type: "simple",
        confidence: 0.5,
        method: "error",
        keywords: [],
        scores: {},
        blockRecommendations: [],
        error: error.message,
      };
    }
  }

  /**
   * 규칙 기반 분류
   */
  classifyByRulesWithTokens(normalized, tokens, keywords) {
    const scores = {};

    // normalized가 문자열이 아닌 경우 처리
    const safeNormalized = this.safeToString(normalized);

    // tokens가 배열이 아닌 경우 처리
    if (!Array.isArray(tokens)) {
      tokens = [];
    }

    // keywords가 배열이 아닌 경우 처리
    if (!Array.isArray(keywords)) {
      keywords = [];
    }

    // 각 타입별 점수 계산
    for (const [type, config] of Object.entries(this.patterns)) {
      let score = 0;

      // 부정 키워드 체크
      if (config.negativeKeywords) {
        for (const negKeyword of config.negativeKeywords) {
          if (safeNormalized.includes(negKeyword)) {
            score -= config.weight * 2;
            break;
          }
        }
      }

      // 긍정 키워드 매칭
      for (const keyword of config.keywords) {
        if (safeNormalized.includes(keyword) || tokens.includes(keyword)) {
          score += config.weight;
        }
      }

      // 정규식 패턴 매칭
      for (const pattern of config.patterns) {
        if (pattern.test(safeNormalized)) {
          score += config.weight * 1.5;
        }
      }

      scores[type] = Math.max(0, score);
    }

    // 키워드 기반 추가 점수 부여
    if (keywords.includes("스페이스키") || keywords.includes("키")) {
      scores.simple = (scores.simple || 0) + 1;
    }
    if (keywords.includes("발사") || keywords.includes("총알")) {
      scores.complex = (scores.complex || 0) + 1;
    }

    // 특별 규칙 적용
    this.applySpecialRules(safeNormalized, scores);

    // 최종 타입 결정
    const maxScore = Math.max(...Object.values(scores));
    const type = Object.keys(scores).find((key) => scores[key] === maxScore) || "simple";

    // 신뢰도 계산
    const confidence = this.calculateConfidence(maxScore, scores);

    return {
      type: type,
      confidence: confidence,
      scores: scores,
      method: "rules",
    };
  }

  /**
   * 특별 규칙 적용
   */
  applySpecialRules(normalized, scores) {
    const safeNormalized = this.safeToString(normalized);

    // "만들고 싶" 패턴 강화
    if (safeNormalized.includes("만들고 싶") || safeNormalized.includes("만들고싶")) {
      scores.complex = (scores.complex || 0) + 2;
      scores.simple = Math.max(0, (scores.simple || 0) - 1);
    }

    // "왜...안" 패턴 강화
    if (safeNormalized.includes("왜") && (safeNormalized.includes("안") || safeNormalized.includes("않"))) {
      scores.debug = (scores.debug || 0) + 2;
      scores.simple = Math.max(0, (scores.simple || 0) - 1);
    }

    // 비교/차이 패턴 강화
    if (safeNormalized.includes("비교") || safeNormalized.includes("차이")) {
      scores.conceptual = (scores.conceptual || 0) + 2;
      scores.simple = Math.max(0, (scores.simple || 0) - 1);
    }

    // 게임/프로그램 + 만들기 조합
    if (
      (safeNormalized.includes("게임") || safeNormalized.includes("프로그램")) &&
      (safeNormalized.includes("만들") || safeNormalized.includes("제작"))
    ) {
      scores.complex = (scores.complex || 0) + 3;
      scores.simple = 0;
    }

    // 오류/에러 강화
    if (safeNormalized.includes("오류") || safeNormalized.includes("에러")) {
      scores.debug = (scores.debug || 0) + 2;
    }

    // "~란?" 패턴
    if (safeNormalized.endsWith("란?") || safeNormalized.endsWith("란")) {
      scores.conceptual = (scores.conceptual || 0) + 2;
    }

    // 스페이스/키 + 이동 조합
    if (
      (safeNormalized.includes("스페이스") || safeNormalized.includes("키")) &&
      (safeNormalized.includes("이동") || safeNormalized.includes("움직"))
    ) {
      scores.simple = (scores.simple || 0) + 2;
    }
  }

  /**
   * 신뢰도 계산
   */
  calculateConfidence(maxScore, scores) {
    if (maxScore === 0) return 0.3;

    const sortedScores = Object.values(scores).sort((a, b) => b - a);
    const gap = sortedScores.length > 1 ? sortedScores[0] - sortedScores[1] : sortedScores[0];

    let confidence = Math.min(maxScore / 3, 1);

    if (gap > 2) {
      confidence = Math.min(confidence * 1.2, 1);
    }

    return Number(confidence.toFixed(3));
  }

  /**
   * AI 기반 분류
   */
  async classifyWithAI(message) {
    try {
      const result = await chrome.storage.sync.get(["openai_api_key"]);

      if (!result.openai_api_key) {
        console.log("⚠️ API 키 없음, AI 분류 건너뜀");
        return null;
      }

      const safeMessage = this.safeToString(message);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${result.openai_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `당신은 Entry 블록코딩 질문 분류 전문가입니다.
질문을 다음 4가지 중 하나로 정확히 분류하세요:
- simple: 단순한 블록 사용법이나 위치를 묻는 질문
- complex: 게임이나 프로젝트를 만드는 방법을 묻는 질문
- debug: 오류나 문제 해결을 요청하는 질문
- conceptual: 프로그래밍 개념이나 원리를 묻는 질문

반드시 타입명(simple/complex/debug/conceptual)만 답하세요.`,
            },
            {
              role: "user",
              content: `질문: "${safeMessage}"`,
            },
          ],
          max_tokens: 10,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        console.error("❌ OpenAI API 오류:", response.status);
        return null;
      }

      const data = await response.json();
      const aiType = data.choices[0].message.content.trim().toLowerCase();

      const validTypes = ["simple", "complex", "debug", "conceptual"];
      if (!validTypes.includes(aiType)) {
        console.warn("⚠️ AI가 잘못된 타입 반환:", aiType);
        return null;
      }

      console.log("🤖 AI 분류 성공:", aiType);

      return {
        type: aiType,
        confidence: 0.85,
        scores: { [aiType]: 1.0 },
        method: "ai",
      };
    } catch (error) {
      console.error("❌ AI 분류 실패:", error);
      return null;
    }
  }

  /**
   * 통계 업데이트
   */
  updateStatistics(type, method) {
    this.statistics.totalClassifications++;

    if (method === "rules" || method === "rules-fallback") {
      this.statistics.ruleBasedClassifications++;
    } else if (method === "ai") {
      this.statistics.aiClassifications++;
    }

    if (this.statistics.classificationsByType[type] !== undefined) {
      this.statistics.classificationsByType[type]++;
    }
  }

  /**
   * 통계 조회
   */
  getStatistics() {
    const total = this.statistics.totalClassifications;
    const aiRatio = total > 0 ? ((this.statistics.aiClassifications / total) * 100).toFixed(1) : 0;
    const ruleRatio = total > 0 ? ((this.statistics.ruleBasedClassifications / total) * 100).toFixed(1) : 0;

    return {
      ...this.statistics,
      aiUsageRate: aiRatio + "%",
      ruleUsageRate: ruleRatio + "%",
    };
  }

  /**
   * 분류기 리셋
   */
  reset() {
    this.statistics = {
      totalClassifications: 0,
      ruleBasedClassifications: 0,
      aiClassifications: 0,
      classificationsByType: {
        simple: 0,
        complex: 0,
        debug: 0,
        conceptual: 0,
      },
    };
  }

  /**
   * 호환성을 위한 이전 메서드
   */
  classifyByRules(message) {
    const normalized = this.normalizeText(message);
    const tokens = this.tokenizeKorean(normalized);
    const { keywords } = this.extractKeywords(tokens, normalized);
    return this.classifyByRulesWithTokens(normalized, tokens, keywords);
  }
}

// Chrome Extension 환경에서 사용할 수 있도록 export
if (typeof module !== "undefined" && module.exports) {
  module.exports = EntryQuestionClassifier;
}

// 전역 변수로도 사용 가능하도록
if (typeof window !== "undefined") {
  window.EntryQuestionClassifier = EntryQuestionClassifier;
}
