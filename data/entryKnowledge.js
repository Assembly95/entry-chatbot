// entryKnowledge.js - Entry 블록코딩 UI 및 사용법 지식 베이스

const EntryKnowledge = {
  // UI 조작 방법
  // 기존 uiActions에 더 추가
  uiActions: {
    addObject: {
      steps: [
        "화면 왼쪽 하단의 [오브젝트 추가하기(+)] 버튼 클릭",
        "오브젝트 라이브러리에서 원하는 오브젝트 선택",
        "[추가하기] 버튼 클릭",
        "무대에서 원하는 위치로 드래그하여 배치",
      ],
      location: "화면 왼쪽 하단",
      icon: "➕",
      category: "오브젝트 관리",
    },

    createVariable: {
      steps: [
        "[자료] 카테고리 클릭",
        "[변수 만들기] 버튼 클릭",
        "변수 이름 입력 (예: 점수)",
        "[확인] 버튼 클릭",
        "[변수를 0으로 정하기] 블록으로 초기값 설정",
      ],
      location: "자료 카테고리",
      icon: "📦",
      category: "자료",
    },

    addBlock: {
      steps: [
        "왼쪽 블록 카테고리에서 원하는 카테고리 선택",
        "필요한 블록을 작업 영역으로 드래그",
        "다른 블록과 연결 (자석처럼 달라붙음)",
      ],
      location: "왼쪽 블록 팔레트",
      icon: "🧩",
      category: "블록 조작",
    },

    runProject: {
      steps: ["화면 상단의 [▶️ 시작하기] 버튼 클릭", "테스트 후 [⬛ 정지하기] 버튼으로 중지"],
      location: "화면 상단",
      icon: "▶️",
      category: "실행",
    },

    setTimer: {
      steps: ["[계산] 카테고리 클릭", "[초시계] 블록 찾기", "[초시계 초기화하기] 블록으로 시작", "조건문에서 [초시계] 값 확인"],
      location: "계산 카테고리",
      icon: "⏱️",
      category: "계산",
    },
    // Entry 전용 용어 (다른 플랫폼 용어 → Entry 용어)
    officialTerminology: {
      // Scratch 등 → Entry
      스프라이트: "오브젝트",
      캔버스: "무대",
      타이머: "초시계",
      이벤트: "시작",
      스크립트: "코드",
      브로드캐스트: "신호",
      클론: "복제본",
      백드롭: "장면",

      // 일반 용어 → Entry 용어
      "버튼 오브젝트": "오브젝트",
      화면: "무대",
    },

    runProject: {
      steps: ["화면 상단의 **▶️ 시작** 버튼 클릭", "**■ 정지** 버튼으로 중지"],
    },
    createVariable: {
      steps: ["**자료** 카테고리 클릭", "**변수 만들기** 버튼 클릭", "변수 이름 입력", "**확인** 버튼 클릭"],
    },
  },

  // 블록 카테고리별 위치
  blockCategories: {
    start: "시작 - 프로그램 시작 이벤트",
    moving: "움직임 - 오브젝트 이동/회전",
    looks: "생김새 - 모양/효과 변경",
    sound: "소리 - 음향 효과",
    flow: "흐름 - 반복/조건문",
    variable: "자료 - 변수/리스트",
    judgement: "판단 - 조건 확인",
    calc: "계산 - 연산 블록",
  },

  // 공통 작업 패턴
  commonPatterns: {
    keyboardControl: {
      description: "키보드로 캐릭터 조작",
      blocks: ["when_some_key_pressed", "move_direction"],
      steps: ["시작 카테고리에서 **[키]를 눌렀을 때** 블록 추가", "움직임 카테고리에서 **( )만큼 움직이기** 블록 연결"],
    },
    scoreSystem: {
      description: "점수 시스템 만들기",
      blocks: ["set_variable", "change_variable", "show_variable"],
      steps: ["변수 '점수' 생성", "시작 시 **점수를 0으로 정하기**", "조건 발생 시 **점수를 1만큼 바꾸기**"],
    },
    objectAdd: {
      description: "버튼 오브젝트 추가하기",
      blocks: [], // UI 작업이므로 빈 배열
      isUIAction: true, // 🔴 UI 작업 플래그 추가
      uiLocation: "무대 아래 시작하기 버튼 옆", // 🔴 UI 위치 정보
      steps: [
        "오브젝트 목록 우측 하단 **[+오브젝트 추가하기]** 버튼 클릭",
        "버튼 오브젝트 선택",
        "원하는 위치에 버튼 오브젝트를 옮기기",
      ],
    },
  },
};

// Export for Service Worker
if (typeof self !== "undefined") {
  self.EntryKnowledge = EntryKnowledge;
}
