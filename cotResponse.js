// cotResponse.js - Entry 블록코딩 단계별 학습 가이드 (CoT)
// 복잡한 질문에 대해 단계적으로 생각하도록 유도하는 교육적 응답 생성

class CoTResponseHandler {
  constructor() {
    // CoT 템플릿 라이브러리
    this.templates = {
      // 움직임 관련
      movement: {
        forward: this.createForwardMovementTemplate(),
        jump: this.createJumpTemplate(),
        rotate: this.createRotateTemplate(),
        follow: this.createFollowMouseTemplate(),
      },

      // 게임 제작
      games: {
        shooting: this.createShootingGameTemplate(),
        racing: this.createRacingGameTemplate(),
        avoiding: this.createAvoidingGameTemplate(),
      },

      // 상호작용
      interaction: {
        collision: this.createCollisionTemplate(),
        click: this.createClickEventTemplate(),
        keyboard: this.createKeyboardControlTemplate(),
      },

      // 애니메이션
      animation: {
        walking: this.createWalkingAnimationTemplate(),
        blinking: this.createBlinkingTemplate(),
      },
    };

    // 키워드-템플릿 매핑
    this.keywordMapping = {
      // 움직임
      앞으로: "movement.forward",
      전진: "movement.forward",
      점프: "movement.jump",
      뛰: "movement.jump",
      회전: "movement.rotate",
      돌: "movement.rotate",
      "마우스 따라": "movement.follow",

      // 게임
      슈팅: "games.shooting",
      총: "games.shooting",
      발사: "games.shooting",
      레이싱: "games.racing",
      경주: "games.racing",
      피하기: "games.avoiding",
      장애물: "games.avoiding",

      // 상호작용
      충돌: "interaction.collision",
      부딪: "interaction.collision",
      클릭: "interaction.click",
      누르: "interaction.click",
      키보드: "interaction.keyboard",

      // 애니메이션
      걷: "animation.walking",
      깜빡: "animation.blinking",
    };
  }

  /**
   * 메인 응답 생성 함수
   */
  generateResponse(message, classification) {
    console.log("🎯 CoT Response 생성 시작");

    // 1. 적절한 템플릿 선택
    const template = this.selectTemplate(message);

    if (!template) {
      console.log("⚠️ 적절한 CoT 템플릿을 찾지 못함");
      return this.createGenericCoTResponse(message);
    }

    console.log(`📚 선택된 템플릿: ${template.title}`);

    // 2. CoT 응답 구조 생성
    return {
      type: "cot",
      template: template,
      currentStep: 1,
      totalSteps: template.steps.length,
      sequence: this.formatCoTSequence(template),
    };
  }

  /**
   * 메시지 분석해서 적절한 템플릿 선택
   */
  selectTemplate(message) {
    const lowercaseMsg = message.toLowerCase();

    // 키워드 매칭으로 템플릿 찾기
    for (const [keyword, templatePath] of Object.entries(this.keywordMapping)) {
      if (lowercaseMsg.includes(keyword)) {
        const [category, type] = templatePath.split(".");
        const template = this.templates[category]?.[type];

        if (template) {
          console.log(`✅ 키워드 '${keyword}'로 템플릿 매칭: ${templatePath}`);
          return template;
        }
      }
    }

    // 키워드 매칭 실패시 의도 분석
    return this.analyzeIntentAndSelect(lowercaseMsg);
  }

  /**
   * 의도 분석 기반 템플릿 선택
   */
  analyzeIntentAndSelect(message) {
    // 게임 만들기 의도
    if (message.includes("게임") || message.includes("만들")) {
      if (message.includes("쏘") || message.includes("총")) {
        return this.templates.games.shooting;
      }
      return this.templates.games.avoiding; // 기본 게임
    }

    // 움직임 의도
    if (message.includes("움직") || message.includes("이동")) {
      return this.templates.movement.forward;
    }

    return null;
  }

  /**
   * CoT 시퀀스 포맷팅
   */
  formatCoTSequence(template) {
    return {
      title: template.title,
      totalSteps: template.steps.length,
      steps: template.steps.map((step, index) => ({
        stepNumber: index + 1,
        title: step.title,
        content: step.content,
        hints: step.hints || [],
        blocks: step.blocks || [],
        checkpoint: step.checkpoint || null,
        completed: false,
      })),
    };
  }

  /**
   * 일반적인 CoT 응답 (템플릿 없을 때)
   */
  createGenericCoTResponse(message) {
    return {
      type: "cot",
      template: {
        title: "블록 코딩 프로젝트 만들기",
        steps: [
          {
            title: "🎯 목표 정하기",
            content: "먼저 무엇을 만들고 싶은지 구체적으로 생각해봐요!",
            hints: ["어떤 동작을 만들고 싶나요?", "누가 어떻게 움직이면 좋겠어요?"],
          },
          {
            title: "🔍 필요한 블록 찾기",
            content: "목표를 달성하기 위해 어떤 블록이 필요할까요?",
            hints: ["시작 조건은?", "어떤 동작이 필요한가요?"],
          },
          {
            title: "🔗 블록 연결하기",
            content: "찾은 블록들을 논리적 순서대로 연결해봐요!",
            hints: ["순서가 중요해요", "조건을 확인하세요"],
          },
          {
            title: "✅ 테스트하기",
            content: "실행 버튼을 눌러 결과를 확인하고 수정해요!",
            hints: ["예상대로 작동하나요?", "개선할 점은?"],
          },
        ],
      },
      currentStep: 1,
      totalSteps: 4,
    };
  }

  // ===== 템플릿 생성 함수들 =====

  /**
   * 앞으로 이동 템플릿
   */
  createForwardMovementTemplate() {
    return {
      title: "캐릭터를 앞으로 이동시키기",
      description: "키보드를 눌러 캐릭터가 앞으로 가도록 만들어봐요",
      difficulty: "초급",
      steps: [
        {
          title: "🎯 목표 확인",
          content: "캐릭터를 앞으로 움직이게 하려고 해요!\n어떤 방법으로 움직이게 할까요?",
          hints: ["키보드 조작으로 움직이기", "자동으로 계속 움직이기", "마우스를 따라 움직이기"],
          question: "스페이스키를 누를 때마다 움직이게 할까요, 아니면 계속 움직이게 할까요?",
        },
        {
          title: "🔍 시작 블록 선택",
          content: "먼저 '언제' 실행할지 정해야 해요.",
          blocks: ["when_run_button_click", "when_some_key_pressed"],
          hints: ["시작 카테고리를 확인하세요", "초록색 깃발 블록이나 키 입력 블록을 찾아보세요"],
          checkpoint: "시작 블록을 작업 영역에 놓았나요?",
        },
        {
          title: "🏃 움직임 블록 추가",
          content: "이제 '어떻게' 움직일지 정해봐요.",
          blocks: ["move_direction", "move_x"],
          hints: [
            "움직임 카테고리를 확인하세요",
            "x좌표로 () 만큼 이동하기 블록을 사용해보세요",
            "양수는 오른쪽, 음수는 왼쪽이에요",
          ],
          checkpoint: "움직임 블록을 시작 블록 아래에 연결했나요?",
        },
        {
          title: "🔄 반복 추가 (선택)",
          content: "계속 움직이게 하려면 반복을 추가해요.",
          blocks: ["repeat_basic", "repeat_inf"],
          hints: ["흐름 카테고리의 반복 블록", "무한 반복이나 횟수 반복을 선택하세요"],
          optional: true,
        },
        {
          title: "✅ 테스트 및 조정",
          content: "실행 버튼을 눌러 테스트해봐요!",
          hints: ["움직이는 속도가 적당한가요?", "이동 거리를 조절해보세요", "다른 키로 바꿔볼까요?"],
          checkpoint: "캐릭터가 원하는 대로 움직이나요?",
        },
      ],
    };
  }

  /**
   * 점프 동작 템플릿
   */
  createJumpTemplate() {
    return {
      title: "캐릭터 점프 만들기",
      description: "스페이스키를 누르면 점프하는 동작을 만들어요",
      difficulty: "초급",
      steps: [
        {
          title: "🎯 점프 동작 계획",
          content: "점프는 위로 올라갔다가 내려오는 동작이에요.\n어떻게 구현할까요?",
          hints: ["y좌표를 위로 이동 (양수)", "잠시 대기", "y좌표를 아래로 이동 (음수)"],
        },
        {
          title: "🔍 키 입력 감지",
          content: "스페이스키를 누를 때 실행되도록 설정해요.",
          blocks: ["when_some_key_pressed"],
          hints: ["시작 카테고리에서 '키를 눌렀을 때' 블록", "드롭다운에서 'space' 선택"],
        },
        {
          title: "⬆️ 위로 이동",
          content: "먼저 캐릭터를 위로 올려요.",
          blocks: ["move_y", "locate_y"],
          hints: ["움직임 카테고리", "y좌표로 50만큼 이동하기", "양수 값이 위쪽이에요"],
        },
        {
          title: "⏰ 잠시 대기",
          content: "공중에 잠깐 머물게 해요.",
          blocks: ["wait_second"],
          hints: ["흐름 카테고리", "0.3초 기다리기"],
        },
        {
          title: "⬇️ 아래로 이동",
          content: "다시 원래 위치로 내려와요.",
          blocks: ["move_y"],
          hints: ["y좌표로 -50만큼 이동하기", "음수 값이 아래쪽이에요"],
        },
        {
          title: "✅ 테스트 및 개선",
          content: "점프가 자연스러운지 확인해요!",
          hints: ["점프 높이 조절하기", "대기 시간 조절하기", "부드러운 애니메이션 추가"],
        },
      ],
    };
  }

  /**
   * 슈팅 게임 템플릿
   */
  createShootingGameTemplate() {
    return {
      title: "간단한 슈팅 게임 만들기",
      description: "스페이스키로 총알을 발사하는 게임을 만들어요",
      difficulty: "중급",
      steps: [
        {
          title: "🎯 게임 구성 요소",
          content: "슈팅 게임에 필요한 요소들을 생각해봐요.",
          hints: ["플레이어 캐릭터", "총알 오브젝트", "적 캐릭터", "점수 시스템"],
          question: "어떤 것부터 만들어볼까요?",
        },
        {
          title: "🚀 플레이어 움직임",
          content: "먼저 플레이어가 좌우로 움직이도록 만들어요.",
          blocks: ["when_some_key_pressed", "move_x"],
          hints: ["왼쪽 화살표키 → x좌표 -10", "오른쪽 화살표키 → x좌표 +10"],
        },
        {
          title: "🔫 총알 복제본 만들기",
          content: "스페이스키를 누르면 총알이 발사되도록 해요.",
          blocks: ["when_some_key_pressed", "create_clone"],
          hints: ["총알 오브젝트 미리 준비", "스페이스키 입력 시 복제본 생성", "복제본은 플레이어 위치에서 생성"],
        },
        {
          title: "📍 총알 이동",
          content: "생성된 총알이 위로 날아가게 해요.",
          blocks: ["when_clone_start", "repeat_inf", "move_y"],
          hints: ["복제본이 생성되었을 때", "무한 반복으로 계속 이동", "y좌표로 10씩 이동"],
        },
        {
          title: "💥 충돌 감지",
          content: "총알이 적과 충돌하면 처리해요.",
          blocks: ["reach_something", "_if", "delete_clone"],
          hints: ["만약 적에 닿았다면", "복제본 삭제하기", "점수 증가시키기"],
        },
        {
          title: "📊 점수 시스템",
          content: "변수를 만들어 점수를 관리해요.",
          blocks: ["set_variable", "change_variable", "show_variable"],
          hints: ["점수 변수 만들기", "충돌 시 점수 +10", "화면에 점수 표시"],
        },
        {
          title: "✅ 게임 완성도 높이기",
          content: "추가 기능으로 게임을 개선해요!",
          hints: ["적이 움직이게 하기", "게임 오버 조건 추가", "효과음 넣기", "배경 음악 추가"],
        },
      ],
    };
  }

  /**
   * 회전 템플릿
   */
  createRotateTemplate() {
    return {
      title: "오브젝트 회전시키기",
      description: "다양한 방법으로 오브젝트를 회전시켜요",
      difficulty: "초급",
      steps: [
        {
          title: "🎯 회전 방식 선택",
          content: "어떤 방식으로 회전시킬까요?",
          hints: ["계속 빙글빙글 돌기", "클릭할 때마다 90도씩", "마우스 방향 바라보기"],
        },
        {
          title: "🔄 회전 블록 찾기",
          content: "움직임 카테고리에서 회전 블록을 찾아요.",
          blocks: ["rotate_relative", "rotate_absolute"],
          hints: ["시계방향으로 ( )도 회전하기", "( )도 방향 보기"],
        },
        {
          title: "🔁 반복 설정",
          content: "계속 회전하려면 반복을 추가해요.",
          blocks: ["repeat_inf", "wait_second"],
          hints: ["무한 반복 블록 사용", "회전 속도 조절을 위한 대기"],
        },
        {
          title: "✅ 테스트",
          content: "회전이 자연스러운지 확인해요!",
          hints: ["회전 각도 조절", "회전 속도 조절"],
        },
      ],
    };
  }

  /**
   * 마우스 따라가기 템플릿
   */
  createFollowMouseTemplate() {
    return {
      title: "마우스 포인터 따라가기",
      description: "오브젝트가 마우스를 따라 움직이게 해요",
      difficulty: "초급",
      steps: [
        {
          title: "🎯 추적 방식 결정",
          content: "어떻게 마우스를 따라갈까요?",
          hints: ["즉시 마우스 위치로 이동", "천천히 따라가기", "일정 거리 유지하며 따라가기"],
        },
        {
          title: "🖱️ 마우스 좌표 사용",
          content: "마우스 x, y 좌표로 이동하는 블록을 사용해요.",
          blocks: ["locate_xy", "coordinate_mouse"],
          hints: ["움직임 카테고리", "마우스 포인터로 이동하기"],
        },
        {
          title: "🔄 계속 따라가기",
          content: "무한 반복으로 계속 추적하게 해요.",
          blocks: ["repeat_inf"],
          hints: ["흐름 카테고리의 무한 반복", "반복 안에 이동 블록 넣기"],
        },
        {
          title: "✨ 부드럽게 만들기",
          content: "움직임을 더 자연스럽게 해요.",
          blocks: ["move_xy_time"],
          hints: ["( )초 동안 이동하기 블록 사용", "0.1초 정도로 설정"],
        },
      ],
    };
  }

  // 나머지 템플릿들도 비슷한 구조로...

  createRacingGameTemplate() {
    return {
      title: "레이싱 게임 만들기",
      description: "장애물을 피하며 달리는 게임",
      difficulty: "중급",
      steps: [
        {
          title: "🎯 게임 설계",
          content: "레이싱 게임의 기본 요소를 정해요.",
          hints: ["자동차", "도로", "장애물", "점수"],
        },
        {
          title: "🚗 자동차 조작",
          content: "좌우 키로 자동차를 움직여요.",
          blocks: ["when_some_key_pressed", "move_x"],
        },
        {
          title: "🛣️ 도로 움직임",
          content: "배경이 아래로 움직이는 효과를 만들어요.",
          blocks: ["repeat_inf", "move_y"],
        },
        {
          title: "🚧 장애물 생성",
          content: "랜덤하게 장애물을 만들어요.",
          blocks: ["create_clone", "calc_rand"],
        },
        {
          title: "💥 충돌 처리",
          content: "장애물과 충돌하면 게임 오버!",
          blocks: ["reach_something", "stop_object"],
        },
      ],
    };
  }

  createAvoidingGameTemplate() {
    return {
      title: "피하기 게임 만들기",
      description: "떨어지는 물체를 피하는 게임",
      difficulty: "초급",
      steps: [
        {
          title: "🎯 게임 규칙",
          content: "어떤 것을 피할까요?",
          hints: ["떨어지는 공", "움직이는 장애물"],
        },
        {
          title: "🏃 플레이어 움직임",
          content: "마우스나 키보드로 조작해요.",
          blocks: ["when_some_key_pressed", "move_x"],
        },
        {
          title: "☄️ 장애물 떨어뜨리기",
          content: "위에서 아래로 떨어지게 해요.",
          blocks: ["repeat_inf", "move_y", "locate_xy"],
        },
        {
          title: "💥 충돌 감지",
          content: "닿으면 게임 오버!",
          blocks: ["reach_something", "_if"],
        },
      ],
    };
  }

  createCollisionTemplate() {
    return {
      title: "충돌 감지 구현",
      description: "두 오브젝트가 만났을 때 반응하기",
      difficulty: "초급",
      steps: [
        {
          title: "🎯 충돌 상황",
          content: "어떤 충돌을 감지할까요?",
          hints: ["캐릭터와 아이템", "총알과 적"],
        },
        {
          title: "💥 충돌 블록",
          content: "판단 카테고리에서 충돌 블록을 찾아요.",
          blocks: ["reach_something"],
        },
        {
          title: "🔄 지속적 확인",
          content: "계속 충돌을 확인해야 해요.",
          blocks: ["repeat_inf", "_if"],
        },
        {
          title: "✨ 충돌 효과",
          content: "충돌했을 때 어떤 일이 일어날까요?",
          hints: ["소리 재생", "점수 증가", "오브젝트 삭제"],
        },
      ],
    };
  }

  createClickEventTemplate() {
    return {
      title: "클릭 이벤트 만들기",
      description: "오브젝트를 클릭하면 반응하게 하기",
      difficulty: "초급",
      steps: [
        {
          title: "🎯 클릭 효과",
          content: "클릭하면 어떤 일이 일어날까요?",
          hints: ["색 바꾸기", "소리 내기", "움직이기"],
        },
        {
          title: "🖱️ 클릭 감지",
          content: "시작 카테고리에서 클릭 블록을 찾아요.",
          blocks: ["when_object_click"],
        },
        {
          title: "✨ 반응 추가",
          content: "클릭했을 때의 동작을 추가해요.",
          blocks: ["change_effect_amount", "play_sound"],
        },
      ],
    };
  }

  createKeyboardControlTemplate() {
    return {
      title: "키보드로 조작하기",
      description: "방향키로 캐릭터 움직이기",
      difficulty: "초급",
      steps: [
        {
          title: "🎯 조작 키 정하기",
          content: "어떤 키를 사용할까요?",
          hints: ["방향키", "WASD", "스페이스바"],
        },
        {
          title: "⬆️ 위쪽 이동",
          content: "위 방향키 설정",
          blocks: ["when_some_key_pressed", "move_y"],
        },
        {
          title: "⬇️ 아래 이동",
          content: "아래 방향키 설정",
          blocks: ["when_some_key_pressed", "move_y"],
        },
        {
          title: "⬅️➡️ 좌우 이동",
          content: "좌우 방향키 설정",
          blocks: ["when_some_key_pressed", "move_x"],
        },
      ],
    };
  }

  createWalkingAnimationTemplate() {
    return {
      title: "걷기 애니메이션",
      description: "캐릭터가 걷는 것처럼 보이게 하기",
      difficulty: "중급",
      steps: [
        {
          title: "🎯 모양 준비",
          content: "걷는 동작 이미지들을 준비해요.",
          hints: ["최소 2개 이상의 모양", "발 위치가 다른 이미지"],
        },
        {
          title: "🔄 모양 바꾸기",
          content: "반복하며 모양을 바꿔요.",
          blocks: ["repeat_inf", "change_to_next_shape", "wait_second"],
        },
        {
          title: "🚶 이동과 함께",
          content: "움직이면서 애니메이션 재생",
          blocks: ["move_x"],
        },
      ],
    };
  }

  createBlinkingTemplate() {
    return {
      title: "깜빡이는 효과",
      description: "오브젝트가 깜빡이게 만들기",
      difficulty: "초급",
      steps: [
        {
          title: "🎯 깜빡임 효과",
          content: "어떻게 깜빡이게 할까요?",
          hints: ["숨기기/보이기", "투명도 조절"],
        },
        {
          title: "✨ 숨기고 보이기",
          content: "반복하며 숨기고 보여요.",
          blocks: ["repeat_basic", "hide", "wait_second", "show"],
        },
        {
          title: "⏰ 속도 조절",
          content: "대기 시간으로 속도를 조절해요.",
          hints: ["0.1초 = 빠른 깜빡임", "0.5초 = 느린 깜빡임"],
        },
      ],
    };
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = CoTResponseHandler;
}

// For browser environment
if (typeof window !== "undefined") {
  window.CoTResponseHandler = CoTResponseHandler;
}
