// 교육적 피드백 및 학습 진행 추적 시스템

class EntryEducationalFeedback {
  constructor() {
    // 학습자 진행상황 추적
    this.learnerProgress = {
      completedConcepts: new Set(),
      strugglingAreas: [],
      confidenceLevel: {},
      lastInteractionTime: null,
      sessionCount: 0,
      streakDays: 0,
    };

    // 개념별 숙련도 레벨
    this.conceptMastery = {
      "시작 블록": 0,
      "움직임 블록": 0,
      "조건 블록": 0,
      "반복 블록": 0,
      "자료 블록": 0,
      "기능 블록": 0,
    };

    // 피드백 템플릿
    this.feedbackTemplates = {
      encouragement: [
        "훌륭해요! 계속 이런 식으로 해보세요!",
        "정말 잘하고 있어요! 한 단계씩 차근차근!",
        "멋져요! 이제 감이 오시는 것 같네요!",
        "좋은 접근이에요! 이런 식으로 생각하는 게 맞아요!",
      ],

      struggle_support: [
        "괜찮아요! 처음엔 다들 어려워해요. 천천히 해봐요!",
        "이 부분이 조금 복잡하죠? 더 간단하게 나누어서 생각해볼까요?",
        "어려워 보이지만 한 번에 하나씩 해보면 분명 할 수 있어요!",
        "막힐 때는 이미 알고 있는 것부터 차근차근 시작해보세요!",
      ],

      concept_reinforcement: [
        "이 개념을 다른 상황에서도 써볼 수 있을까요?",
        "비슷한 원리가 적용되는 다른 예시도 생각해보세요!",
        "이제 이 블록의 원리를 완전히 이해하신 것 같아요!",
        "이 개념을 활용해서 더 재미있는 걸 만들어볼 수 있겠네요!",
      ],

      next_steps: [
        "이제 다음 단계로 넘어가볼까요?",
        "이걸 바탕으로 조금 더 복잡한 것도 시도해보세요!",
        "기본기가 탄탄해졌으니 응용 문제에 도전해봐요!",
        "새로운 블록도 함께 배워볼까요?",
      ],
    };

    // 개념별 설명 데이터
    this.conceptExplanations = {
      "시작 블록": {
        analogy: "프로그램의 시작 신호예요. 마치 달리기를 할 때 '시작!' 하는 신호와 같아요!",
        commonMistakes: ["시작 블록 없이 다른 블록만 놓기", "여러 개의 시작 블록을 동시에 사용하기"],
        tips: "초록색 시작 블록을 먼저 놓고, 그 아래에 실행하고 싶은 블록들을 차례대로 연결하세요!",
      },

      "조건 블록": {
        analogy:
          "조건 블록은 '만약에...'와 같아요. 예를 들어 '만약 비가 온다면 우산을 가져간다'처럼 상황에 따라 다르게 행동하게 해줘요!",
        commonMistakes: ["조건을 너무 복잡하게 만들기", "else 부분을 빼먹기"],
        tips: "간단한 조건부터 시작해보세요. '만약 스페이스키를 눌렀다면' 같은 것부터요!",
      },

      "반복 블록": {
        analogy:
          "반복 블록은 똑같은 일을 여러 번 하게 해주는 블록이에요. 계단을 오르는 것처럼 같은 동작을 여러 번 반복할 때 사용해요!",
        commonMistakes: ["무한 반복에 빠지기", "반복 횟수를 너무 크게 설정하기"],
        tips: "처음엔 반복 횟수를 작게(3~5번) 설정해서 테스트해보세요!",
      },
    };

    this.loadProgress();
  }

  // 학습자 상호작용 분석
  analyzeInteraction(userMessage, aiResponse, classification) {
    const now = Date.now();
    this.learnerProgress.lastInteractionTime = now;

    // 어려워하는 패턴 감지
    const strugglingKeywords = ["모르겠", "어려워", "안돼", "헷갈려", "막혀"];
    const isStruggling = strugglingKeywords.some((keyword) => userMessage.includes(keyword));

    if (isStruggling) {
      this.recordStrugglingArea(classification.type);
    }

    // 성공 패턴 감지
    const successKeywords = ["됐어", "성공", "작동", "완성", "해결"];
    const isSuccess = successKeywords.some((keyword) => userMessage.includes(keyword));

    if (isSuccess) {
      this.recordSuccess(classification.type);
    }

    // 개념 숙련도 업데이트
    this.updateConceptMastery(userMessage, classification);

    this.saveProgress();
  }

  // 어려워하는 영역 기록
  recordStrugglingArea(concept) {
    const area = {
      concept: concept,
      timestamp: Date.now(),
      attempts: 1,
    };

    // 기존 기록 찾기
    const existing = this.learnerProgress.strugglingAreas.find((item) => item.concept === concept);

    if (existing) {
      existing.attempts++;
      existing.timestamp = Date.now();
    } else {
      this.learnerProgress.strugglingAreas.push(area);
    }

    // 최근 10개만 유지
    if (this.learnerProgress.strugglingAreas.length > 10) {
      this.learnerProgress.strugglingAreas = this.learnerProgress.strugglingAreas
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);
    }
  }

  // 성공 기록
  recordSuccess(concept) {
    this.learnerProgress.completedConcepts.add(concept);

    // 신뢰도 레벨 업데이트
    if (!this.learnerProgress.confidenceLevel[concept]) {
      this.learnerProgress.confidenceLevel[concept] = 1;
    } else {
      this.learnerProgress.confidenceLevel[concept] = Math.min(5, this.learnerProgress.confidenceLevel[concept] + 1);
    }
  }

  // 개념 숙련도 업데이트
  updateConceptMastery(userMessage, classification) {
    const conceptKeywords = {
      "시작 블록": ["시작", "when", "클릭", "버튼"],
      "움직임 블록": ["이동", "움직", "move", "위치", "좌표"],
      "조건 블록": ["조건", "만약", "if", "판단"],
      "반복 블록": ["반복", "repeat", "loop", "계속"],
      "자료 블록": ["변수", "variable", "데이터", "저장"],
      "기능 블록": ["함수", "function", "기능"],
    };

    for (const [concept, keywords] of Object.entries(conceptKeywords)) {
      if (keywords.some((keyword) => userMessage.includes(keyword))) {
        this.conceptMastery[concept] = Math.min(10, this.conceptMastery[concept] + 1);
      }
    }
  }

  // 맞춤형 피드백 생성
  generatePersonalizedFeedback(userMessage, classification) {
    const feedback = [];

    // 1. 현재 상황 분석
    const isStruggling = this.isCurrentlyStruggling(classification.type);
    const masteryLevel = this.getConceptMasteryLevel(classification.type);
    const attemptCount = this.getAttemptCount(classification.type);

    // 2. 상황별 피드백 선택
    if (isStruggling && attemptCount > 2) {
      // 여러 번 시도했지만 어려워하는 경우
      feedback.push(this.getRandomTemplate("struggle_support"));
      feedback.push(this.getConceptExplanation(classification.type));
    } else if (masteryLevel >= 3) {
      // 어느 정도 숙련된 경우
      feedback.push(this.getRandomTemplate("concept_reinforcement"));
      feedback.push(this.getRandomTemplate("next_steps"));
    } else {
      // 일반적인 격려
      feedback.push(this.getRandomTemplate("encouragement"));
    }

    // 3. 개념 설명이 필요한 경우
    if (classification.type === "conceptual" || masteryLevel < 2) {
      const explanation = this.getConceptExplanation(classification.type);
      if (explanation) {
        feedback.push(explanation);
      }
    }

    return feedback.join("\n\n");
  }

  // 현재 어려워하고 있는지 확인
  isCurrentlyStruggling(concept) {
    const recentStruggle = this.learnerProgress.strugglingAreas.find(
      (area) => area.concept === concept && Date.now() - area.timestamp < 300000 // 5분 이내
    );
    return recentStruggle && recentStruggle.attempts >= 2;
  }

  // 개념 숙련도 레벨 조회
  getConceptMasteryLevel(concept) {
    return this.conceptMastery[concept] || 0;
  }

  // 시도 횟수 조회
  getAttemptCount(concept) {
    const struggle = this.learnerProgress.strugglingAreas.find((area) => area.concept === concept);
    return struggle ? struggle.attempts : 0;
  }

  // 랜덤 템플릿 선택
  getRandomTemplate(templateType) {
    const templates = this.feedbackTemplates[templateType] || [];
    if (templates.length === 0) return "";

    return templates[Math.floor(Math.random() * templates.length)];
  }

  // 개념 설명 조회
  getConceptExplanation(concept) {
    // 블록 카테고리 매핑
    const categoryMap = {
      simple: "시작 블록",
      complex: "조건 블록",
      debug: "반복 블록",
      conceptual: "시작 블록",
    };

    const mappedConcept = categoryMap[concept] || concept;
    const explanation = this.conceptExplanations[mappedConcept];

    if (!explanation) return "";

    return `💡 **${mappedConcept} 설명**\n${explanation.analogy}\n\n✅ **팁**: ${explanation.tips}`;
  }

  // 학습 진행상황 리포트
  generateProgressReport() {
    const completedCount = this.learnerProgress.completedConcepts.size;
    const totalConcepts = Object.keys(this.conceptMastery).length;
    const progressPercentage = Math.round((completedCount / totalConcepts) * 100);

    const report = {
      progress: progressPercentage,
      completedConcepts: Array.from(this.learnerProgress.completedConcepts),
      strengths: this.getStrongestConcepts(),
      weaknesses: this.getWeakestConcepts(),
      recommendations: this.getRecommendations(),
    };

    return report;
  }

  // 강점 분야 조회
  getStrongestConcepts() {
    return Object.entries(this.conceptMastery)
      .filter(([_, level]) => level >= 5)
      .map(([concept, _]) => concept);
  }

  // 약점 분야 조회
  getWeakestConcepts() {
    return Object.entries(this.conceptMastery)
      .filter(([_, level]) => level <= 2)
      .map(([concept, _]) => concept);
  }

  // 추천사항 생성
  getRecommendations() {
    const weak = this.getWeakestConcepts();
    const recommendations = [];

    if (weak.includes("시작 블록")) {
      recommendations.push("기본적인 시작 블록부터 차근차근 연습해보세요!");
    }

    if (weak.includes("조건 블록")) {
      recommendations.push("간단한 조건문부터 시작해서 복잡한 조건으로 발전시켜보세요!");
    }

    return recommendations;
  }

  // 진행상황 저장
  saveProgress() {
    try {
      const data = {
        learnerProgress: {
          ...this.learnerProgress,
          completedConcepts: Array.from(this.learnerProgress.completedConcepts),
        },
        conceptMastery: this.conceptMastery,
      };

      localStorage.setItem("entryHelperProgress", JSON.stringify(data));
    } catch (error) {
      console.log("진행상황 저장 실패:", error);
    }
  }

  // 진행상황 로드
  loadProgress() {
    try {
      const saved = localStorage.getItem("entryHelperProgress");
      if (saved) {
        const data = JSON.parse(saved);

        if (data.learnerProgress) {
          this.learnerProgress = {
            ...data.learnerProgress,
            completedConcepts: new Set(data.learnerProgress.completedConcepts || []),
          };
        }

        if (data.conceptMastery) {
          this.conceptMastery = { ...this.conceptMastery, ...data.conceptMastery };
        }
      }
    } catch (error) {
      console.log("진행상황 로드 실패:", error);
    }
  }

  // 리셋
  reset() {
    this.learnerProgress = {
      completedConcepts: new Set(),
      strugglingAreas: [],
      confidenceLevel: {},
      lastInteractionTime: null,
      sessionCount: 0,
      streakDays: 0,
    };

    this.conceptMastery = {
      "시작 블록": 0,
      "움직임 블록": 0,
      "조건 블록": 0,
      "반복 블록": 0,
      "자료 블록": 0,
      "기능 블록": 0,
    };

    localStorage.removeItem("entryHelperProgress");
  }
}

// 전역 사용을 위한 export
window.EntryEducationalFeedback = EntryEducationalFeedback;
