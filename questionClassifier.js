// questionClassifier.js - Entry 블록코딩 질문 분류기
// BlockMappings를 활용한 개선된 버전

// BlockMappings 임포트
importScripts("blockMappings.js");

/**
 * Entry 블록코딩 질문 분류기
 * 한국어 형태소 분석 + 하이브리드 방식 (규칙 기반 + AI)
 * BlockMappings 통합 버전
 */
class EntryQuestionClassifier {
  constructor() {
    // BlockMappings 인스턴스 생성 (try-catch로 안전하게)
    try {
      this.blockMappings = new BlockMappings();
      console.log("✅ BlockMappings 로드 성공");
    } catch (error) {
      console.error("❌ BlockMappings 로드 실패:", error);
      this.blockMappings = null;
    }

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
      어딨: "어디있",
      어딨어: "어디있어",
      뭐야: "무엇이야",
      뭐하: "무엇하",
      어케: "어떻게",
      어캐: "어떻게",
      왜안돼: "왜 안돼",
      왜않돼: "왜 안돼",
      만드는: "만들기",
      바꾸는: "바꾸기",
      움직이는: "움직이기",
      하고싶은: "하기",
      쓰는: "사용",
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
          "있어",
          "있나",
          "찾아",
          "알려",
          "설명",
        ],
        negativeKeywords: ["게임", "프로그램", "프로젝트", "시스템", "애니메이션", "작품"],
        patterns: [
          /.*블록.*(?:사용|위치|어디|찾)/,
          /어떻게.*(?!만들|제작|개발)/,
          /.*방법(?!.*만들)/,
          /.*어디.*(?:있|위치)/,
          /.*찾/,
          /.*연결/,
          /.*키.*누르/,
          /.*블록.*어디/,
          /.*위치/,
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
   * 자모 단위 유사도 계산
   */
  calculateJamoSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    try {
      if (typeof Hangul === "undefined") {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        const longerLength = longer.length;
        if (longerLength === 0) return 1.0;
        const editDistance = this.calculateEditDistance(longer, shorter);
        return (longerLength - editDistance) / longerLength;
      }

      const jamo1 = Hangul.disassemble(str1);
      const jamo2 = Hangul.disassemble(str2);
      const maxLen = Math.max(jamo1.length, jamo2.length);
      if (maxLen === 0) return 1;

      let matches = 0;
      const minLen = Math.min(jamo1.length, jamo2.length);
      for (let i = 0; i < minLen; i++) {
        if (jamo1[i] === jamo2[i]) matches++;
      }

      return matches / maxLen;
    } catch (e) {
      return 0;
    }
  }

  /**
   * 편집 거리 계산
   */
  calculateEditDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  /**
   * 오타 교정 함수 (BlockMappings 활용)
   */
  correctTypos(text) {
    if (!text) return text;

    let corrected = text;

    // 🔥 0단계: Entry 동의어 변환 (제일 먼저!)
    const entrySynonyms = {
      "무한 반복": "계속 반복",
      무한반복: "계속반복",
      "무한 반복하기": "계속 반복하기",
      스프라이트: "오브젝트",
      브로드캐스트: "신호",
      영원히: "계속",
      forever: "계속 반복",
    };

    for (const [from, to] of Object.entries(entrySynonyms)) {
      const regex = new RegExp(from, "gi");
      corrected = corrected.replace(regex, to);
    }

    // 🔥 의미가 반대인 단어 쌍 (교정 금지)
    const oppositeWords = [
      ["x좌표", "y좌표"],
      ["가로", "세로"],
      ["위", "아래"],
      ["왼쪽", "오른쪽"],
      ["시작", "끝"],
      ["열기", "닫기"],
    ];

    // 1. BlockMappings의 오타 사전 활용 (null 체크 추가)
    if (this.blockMappings && this.blockMappings.commonTypos) {
      for (const [typo, correct] of Object.entries(this.blockMappings.commonTypos)) {
        const regex = new RegExp(typo, "gi");
        corrected = corrected.replace(regex, correct);
      }
    }

    // 2. 주요 키워드와 자모 유사도 비교
    const words = corrected.split(" ");

    // BlockMappings에서 모든 키워드 가져오기
    let allKeywords = [];
    if (this.blockMappings && this.blockMappings.keywordToBlocks) {
      allKeywords = Object.keys(this.blockMappings.keywordToBlocks);
    }

    const correctedWords = words.map((word) => {
      // 🔥 좌표 예외 처리 추가!
      if (/[xy]좌표/i.test(word)) {
        return word; // x좌표, y좌표는 교정하지 않음
      }
      for (const keyword of allKeywords) {
        if (/[xy]좌표/i.test(word) && /[xy]좌표/i.test(keyword) && word !== keyword) {
          continue; // x좌표 ↔ y좌표 비교 건너뛰기
        }
        const similarity = this.calculateJamoSimilarity(word, keyword);
        if (similarity > 0.85 && similarity < 1) {
          console.log(`오타 교정: ${word} → ${keyword} (유사도: ${(similarity * 100).toFixed(1)}%)`);
          return keyword;
        }
      }
      return word;
    });

    return correctedWords.join(" ");
  }

  /**
   * 초성 검색 지원
   */
  detectChosung(text) {
    if (typeof Hangul === "undefined") {
      return [];
    }

    const chosungPattern = /^[ㄱ-ㅎ]+$/;
    const words = text.split(" ");
    const results = [];

    for (const word of words) {
      if (chosungPattern.test(word)) {
        // BlockMappings의 키워드로 검색
        if (this.blockMappings && this.blockMappings.keywordToBlocks) {
          for (const keyword of Object.keys(this.blockMappings.keywordToBlocks)) {
            if (Hangul.search(keyword, word)) {
              results.push(keyword);
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * 텍스트 정규화
   */
  normalizeText(text) {
    const safeText = this.safeToString(text);
    if (!safeText) return "";

    // 1. 오타 교정
    let normalized = this.correctTypos(safeText);

    // 2. 초성 검색 결과 반영
    const chosungResults = this.detectChosung(normalized);
    if (chosungResults.length > 0) {
      console.log("초성 검색 결과:", chosungResults);
    }

    // 3. 띄어쓰기 교정
    const blockPatterns = ["반복하기", "이동하기", "시작하기", "만들기", "바꾸기"];
    blockPatterns.forEach((pattern) => {
      normalized = normalized.replace(new RegExp(pattern + "(?=\\S)", "g"), pattern + " ");
      normalized = normalized.replace(new RegExp("(?<=\\S)" + pattern, "g"), " " + pattern);
    });

    // 4. 소문자 변환 및 정리
    normalized = normalized.toLowerCase().trim();
    normalized = normalized.replace(/[^가-힣a-z0-9\sㄱ-ㅎㅏ-ㅣ]/g, " ");
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

      // 초성만 있는 경우 그대로 유지
      if (/^[ㄱ-ㅎ]+$/.test(token)) {
        processed.push(token);
        continue;
      }

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
        if (token === ending || token.includes(ending)) {
          token = token.replace(ending, normalized);
          break;
        }
      }

      // BlockMappings의 동의어 변환 (null 체크 추가)
      if (this.blockMappings && this.blockMappings.synonymMap) {
        const synonym = this.blockMappings.synonymMap[token];
        if (synonym) {
          token = synonym;
        }
      }

      if (token.length > 0) {
        processed.push(token);
      }
    }

    return processed;
  }

  /**
   * 키워드 추출 (BlockMappings 활용 또는 폴백)
   */
  extractKeywords(tokens, originalText) {
    const keywords = [];
    const blockRecommendations = [];
    const foundKeywords = new Set();

    if (!Array.isArray(tokens)) {
      tokens = [];
    }

    const safeOriginalText = this.safeToString(originalText);

    // BlockMappings 사용 가능 여부 확인
    const useBlockMappings = this.blockMappings && typeof this.blockMappings.getBlocksByKeyword === "function";

    // 1. 토큰에서 키워드 추출
    for (let token of tokens) {
      if (!token || token === "블록") continue;

      if (useBlockMappings) {
        // BlockMappings 사용
        const blockInfo = this.blockMappings.getBlocksByKeyword(token);
        if (blockInfo && !foundKeywords.has(token)) {
          keywords.push(token);
          blockRecommendations.push({
            keyword: token,
            ...blockInfo,
          });
          foundKeywords.add(token);
        }

        // 부분 매칭 (메서드가 있는 경우만)
        if (typeof this.blockMappings.findKeywordsByPartialMatch === "function") {
          const partialMatches = this.blockMappings.findKeywordsByPartialMatch(token);
          for (const match of partialMatches) {
            if (!foundKeywords.has(match)) {
              const info = this.blockMappings.getBlocksByKeyword(match);
              if (info) {
                keywords.push(match);
                blockRecommendations.push({
                  keyword: match,
                  ...info,
                });
                foundKeywords.add(match);
              }
            }
          }
        }
      } else {
        // BlockMappings 없이 기본 처리
        // 의미있는 토큰을 키워드로 사용
        if (token.length > 1 && !this.josaPatterns.includes(token)) {
          keywords.push(token);
        }
      }
    }

    // 2. 원본 텍스트에서 추가 키워드 추출
    if (safeOriginalText && useBlockMappings && this.blockMappings.keywordToBlocks) {
      const allKeywords = Object.keys(this.blockMappings.keywordToBlocks);
      for (const keyword of allKeywords) {
        if (safeOriginalText.includes(keyword) && !foundKeywords.has(keyword)) {
          const info = this.blockMappings.getBlocksByKeyword(keyword);
          if (info) {
            keywords.push(keyword);
            blockRecommendations.push({
              keyword: keyword,
              ...info,
            });
            foundKeywords.add(keyword);
          }
        }
      }
    }

    // 3. 키워드가 없으면 의미있는 토큰을 키워드로 사용
    if (keywords.length === 0) {
      const meaningfulTokens = tokens.filter((t) => t !== "블록" && t.length > 1 && !this.josaPatterns.includes(t));
      keywords.push(...meaningfulTokens);
    }

    return { keywords, blockRecommendations };
  }

  /**
   * 메인 분류 함수
   */
  async classify(message) {
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
    const safeNormalized = this.safeToString(normalized);

    if (!Array.isArray(tokens)) tokens = [];
    if (!Array.isArray(keywords)) keywords = [];

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

    // 키워드 기반 추가 점수
    this.applyKeywordBonus(keywords, scores);

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
   * 키워드 기반 추가 점수 부여
   */
  applyKeywordBonus(keywords, scores) {
    // BlockMappings 사용 가능 여부 확인
    if (!this.blockMappings || typeof this.blockMappings.getBlocksByKeyword !== "function") {
      // BlockMappings 없으면 기본 처리
      for (const keyword of keywords) {
        if (keyword.includes("반복") || keyword.includes("조건")) {
          scores.simple = (scores.simple || 0) + 0.5;
        }
        if (keyword.includes("게임") || keyword.includes("발사")) {
          scores.complex = (scores.complex || 0) + 0.5;
        }
      }
      return;
    }

    // BlockMappings 사용
    for (const keyword of keywords) {
      const blockInfo = this.blockMappings.getBlocksByKeyword(keyword);
      if (!blockInfo) continue;

      // 카테고리에 따른 점수 조정
      switch (blockInfo.category) {
        case "start":
        case "moving":
        case "looks":
        case "sound":
          scores.simple = (scores.simple || 0) + 0.5;
          break;
        case "flow":
          if (keyword === "복제" || keyword === "총알" || keyword === "발사") {
            scores.complex = (scores.complex || 0) + 0.5;
          } else {
            scores.simple = (scores.simple || 0) + 0.3;
          }
          break;
        case "variable":
        case "func":
          scores.simple = (scores.simple || 0) + 0.3;
          scores.conceptual = (scores.conceptual || 0) + 0.2;
          break;
      }
    }
  }

  /**
   * 특별 규칙 적용
   */
  applySpecialRules(normalized, scores) {
    const safeNormalized = this.safeToString(normalized);

    // "만들고 싶" 패턴
    if (safeNormalized.includes("만들고 싶") || safeNormalized.includes("만들고싶")) {
      scores.complex = (scores.complex || 0) + 2;
      scores.simple = Math.max(0, (scores.simple || 0) - 1);
    }

    // "왜...안" 패턴
    if (safeNormalized.includes("왜") && (safeNormalized.includes("안") || safeNormalized.includes("않"))) {
      scores.debug = (scores.debug || 0) + 2;
      scores.simple = Math.max(0, (scores.simple || 0) - 1);
    }

    // 비교/차이 패턴
    if (safeNormalized.includes("비교") || safeNormalized.includes("차이")) {
      scores.conceptual = (scores.conceptual || 0) + 2;
      scores.simple = Math.max(0, (scores.simple || 0) - 1);
    }

    // 게임/프로그램 + 만들기
    if (
      (safeNormalized.includes("게임") || safeNormalized.includes("프로그램")) &&
      (safeNormalized.includes("만들") || safeNormalized.includes("제작"))
    ) {
      scores.complex = (scores.complex || 0) + 3;
      scores.simple = 0;
    }

    // 오류/에러
    if (safeNormalized.includes("오류") || safeNormalized.includes("에러")) {
      scores.debug = (scores.debug || 0) + 2;
    }

    // "~란?" 패턴
    if (safeNormalized.endsWith("란?") || safeNormalized.endsWith("란")) {
      scores.conceptual = (scores.conceptual || 0) + 2;
    }

    // 위치/어디 패턴 강화
    if (safeNormalized.includes("위치") || safeNormalized.includes("어디")) {
      scores.simple = (scores.simple || 0) + 1.5;
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
}

// Chrome Extension 환경에서 사용할 수 있도록 export
if (typeof module !== "undefined" && module.exports) {
  module.exports = EntryQuestionClassifier;
}

// Service Worker 환경
if (typeof self !== "undefined") {
  self.EntryQuestionClassifier = EntryQuestionClassifier;
}
