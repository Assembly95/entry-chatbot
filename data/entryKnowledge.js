// entryKnowledge.js - Entry 블록코딩 UI 및 사용법 지식 베이스

const EntryKnowledge = {
  // UI 조작 방법
  uiActions: {
    addObject: {
      steps: ["화면 왼쪽 하단의 '오브젝트 추가하기' 클릭", "오브젝트 라이브러리에서 원하는 오브젝트 선택", "추가하기 버튼 클릭"],
      location: "화면 왼쪽 하단",
      icon: "➕",
    },
    addBlock: {
      steps: [
        "왼쪽 블록 카테고리에서 원하는 카테고리 선택",
        "필요한 블록을 작업 영역으로 드래그",
        "다른 블록과 연결 (자석처럼 달라붙음)",
      ],
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
  },
};

// Export for Service Worker
if (typeof self !== "undefined") {
  self.EntryKnowledge = EntryKnowledge;
}
