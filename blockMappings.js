// blockMappings.js - Entry 블록 매핑 테이블 (신호 블록 구분 추가)

/**
 * Entry 블록 매핑 데이터
 * 키워드와 블록의 관계를 정의
 */
class BlockMappings {
  constructor() {
    // 키워드 → 블록 매핑
    this.keywordToBlocks = {
      // ===== 시작 카테고리 =====
      시작: {
        blocks: ["when_run_button_click", "when_some_key_pressed", "when_object_click"],
        category: "start",
      },
      클릭: {
        blocks: ["when_run_button_click", "when_object_click", "when_message_cast"],
        category: "start",
      },
      키: {
        blocks: ["when_some_key_pressed", "is_press_some_key"],
        category: "start",
      },
      스페이스키: {
        blocks: ["when_some_key_pressed"],
        category: "start",
      },
      스페이스: {
        blocks: ["when_some_key_pressed"],
        category: "start",
      },
      엔터키: {
        blocks: ["when_some_key_pressed"],
        category: "start",
      },
      
      // ===== 신호 관련 (구분 강화) =====
      메시지: {
        blocks: ["when_message_cast", "message_cast", "message_cast_wait"],
        category: "start",
      },
      신호: {
        blocks: ["when_message_cast", "message_cast", "message_cast_wait"],
        category: "start",
      },
      "신호 받기": {
        blocks: ["when_message_cast"],
        category: "start",
      },
      "신호 받았을 때": {
        blocks: ["when_message_cast"],
        category: "start",
      },
      "신호 보내기": {
        blocks: ["message_cast"],  // 기다리지 않음
        category: "start",
      },
      "신호 보내고 기다리기": {
        blocks: ["message_cast_wait"],  // 기다림
        category: "start",
      },
      "보내기": {
        blocks: ["message_cast", "message_cast_wait"],
        category: "start",
      },
      "기다리기": {
        blocks: ["message_cast_wait", "wait_second"],
        category: "start",
      },

      // ===== 흐름 카테고리 =====
      반복: {
        blocks: ["repeat_basic", "repeat_inf", "repeat_while_true"],
        category: "flow",
      },
      무한: {
        blocks: ["repeat_inf"],
        category: "flow",
      },
      조건: {
        blocks: ["_if", "if_else", "repeat_while_true"],
        category: "flow",
      },
      만약: {
        blocks: ["_if", "if_else"],
        category: "flow",
      },
      아니면: {
        blocks: ["if_else"],
        category: "flow",
      },
      "기다리기": {
        blocks: ["wait_second", "wait_until_true", "message_cast_wait"],
        category: "flow",
      },
      대기: {
        blocks: ["wait_second", "wait_until_true"],
        category: "flow",
      },
      멈추기: {
        blocks: ["stop_repeat", "stop_all", "stop_object"],
        category: "flow",
      },
      정지: {
        blocks: ["stop_repeat", "stop_all", "stop_object"],
        category: "flow",
      },
      복제: {
        blocks: ["create_clone", "delete_clone", "when_clone_start"],
        category: "flow",
      },
      복사: {
        blocks: ["create_clone", "delete_clone", "when_clone_start"],
        category: "flow",
      },

      // ===== 움직임 카테고리 =====
      이동: {
        blocks: ["move_direction", "move_x", "move_y", "locate_xy"],
        category: "moving",
      },
      움직이기: {
        blocks: ["move_direction", "move_x", "move_y"],
        category: "moving",
      },
      이동하기: {
        blocks: ["move_direction", "move_x", "move_y", "locate_xy"],
        category: "moving",
      },
      위치: {
        blocks: ["locate_xy", "locate_object", "move_to_mouse"],
        category: "moving",
      },
      좌표: {
        blocks: ["locate_xy", "change_x", "change_y", "set_x", "set_y"],
        category: "moving",
      },
      x좌표: {
        blocks: ["set_x", "change_x", "move_x"],
        category: "moving",
      },
      y좌표: {
        blocks: ["set_y", "change_y", "move_y"],
        category: "moving",
      },
      회전: {
        blocks: ["rotate", "set_rotation", "rotate_to_direction"],
        category: "moving",
      },
      방향: {
        blocks: ["set_rotation", "rotate_to_direction", "see_angle"],
        category: "moving",
      },
      돌기: {
        blocks: ["rotate", "set_rotation"],
        category: "moving",
      },
      바라보기: {
        blocks: ["rotate_to_direction", "see_angle"],
        category: "moving",
      },
      마우스: {
        blocks: ["move_to_mouse", "rotate_to_mouse"],
        category: "moving",
      },

      // ===== 생김새 카테고리 =====
      크기: {
        blocks: ["set_size", "change_size"],
        category: "looks",
      },
      사이즈: {
        blocks: ["set_size", "change_size"],
        category: "looks",
      },
      모양: {
        blocks: ["change_to_next_shape", "set_shape"],
        category: "looks",
      },
      모습: {
        blocks: ["change_to_next_shape", "set_shape"],
        category: "looks",
      },
      색: {
        blocks: ["set_color", "change_color", "clear_color"],
        category: "looks",
      },
      색깔: {
        blocks: ["set_color", "change_color", "clear_color"],
        category: "looks",
      },
      색상: {
        blocks: ["set_color", "change_color", "clear_color"],
        category: "looks",
      },
      투명도: {
        blocks: ["set_transparency", "change_transparency"],
        category: "looks",
      },
      투명: {
        blocks: ["set_transparency", "change_transparency"],
        category: "looks",
      },
      효과: {
        blocks: ["set_effect", "change_effect", "clear_effect"],
        category: "looks",
      },
      말하기: {
        blocks: ["say", "say_for_seconds"],
        category: "looks",
      },
      말풍선: {
        blocks: ["say", "say_for_seconds", "think", "think_for_seconds"],
        category: "looks",
      },
      생각하기: {
        blocks: ["think", "think_for_seconds"],
        category: "looks",
      },
      보이기: {
        blocks: ["show", "hide"],
        category: "looks",
      },
      나타나기: {
        blocks: ["show"],
        category: "looks",
      },
      숨기기: {
        blocks: ["hide"],
        category: "looks",
      },
      사라지기: {
        blocks: ["hide"],
        category: "looks",
      },

      // ===== 소리 카테고리 =====
      소리: {
        blocks: ["play_sound", "play_sound_and_wait", "stop_sound"],
        category: "sound",
      },
      재생: {
        blocks: ["play_sound", "play_sound_and_wait"],
        category: "sound",
      },
      음악: {
        blocks: ["play_sound", "play_note", "play_drum"],
        category: "sound",
      },
      볼륨: {
        blocks: ["set_volume", "change_volume"],
        category: "sound",
      },
      음량: {
        blocks: ["set_volume", "change_volume"],
        category: "sound",
      },
      악기: {
        blocks: ["set_instrument", "play_note"],
        category: "sound",
      },
      음: {
        blocks: ["play_note", "play_drum", "rest"],
        category: "sound",
      },

      // ===== 판단 카테고리 =====
      충돌: {
        blocks: ["is_touched", "is_touch_wall"],
        category: "judgement",
      },
      닿기: {
        blocks: ["is_touched", "is_touch_wall", "reach_something"],
        category: "judgement",
      },
      닿았는가: {
        blocks: ["is_touched", "is_touch_wall"],
        category: "judgement",
      },
      벽: {
        blocks: ["is_touch_wall", "reach_something"],
        category: "judgement",
      },
      가장자리: {
        blocks: ["is_touch_wall", "reach_something"],
        category: "judgement",
      },
      거리: {
        blocks: ["distance_to", "distance_to_mouse"],
        category: "judgement",
      },
      비교: {
        blocks: ["is_greater", "is_equal", "is_smaller"],
        category: "judgement",
      },
      같다: {
        blocks: ["is_equal"],
        category: "judgement",
      },
      크다: {
        blocks: ["is_greater"],
        category: "judgement",
      },
      작다: {
        blocks: ["is_smaller"],
        category: "judgement",
      },
      포함: {
        blocks: ["is_included"],
        category: "judgement",
      },

      // ===== 계산 카테고리 =====
      더하기: {
        blocks: ["add", "calc_operation"],
        category: "calc",
      },
      빼기: {
        blocks: ["subtract", "calc_operation"],
        category: "calc",
      },
      곱하기: {
        blocks: ["multiply", "calc_operation"],
        category: "calc",
      },
      나누기: {
        blocks: ["divide", "calc_operation"],
        category: "calc",
      },
      계산: {
        blocks: ["calc_operation", "calc_between"],
        category: "calc",
      },
      무작위: {
        blocks: ["random_number", "random_pick"],
        category: "calc",
      },
      랜덤: {
        blocks: ["random_number", "random_pick"],
        category: "calc",
      },
      나머지: {
        blocks: ["modulo"],
        category: "calc",
      },
      반올림: {
        blocks: ["round"],
        category: "calc",
      },
      올림: {
        blocks: ["ceil"],
        category: "calc",
      },
      내림: {
        blocks: ["floor"],
        category: "calc",
      },
      절댓값: {
        blocks: ["abs"],
        category: "calc",
      },

      // ===== 자료 카테고리 =====
      변수: {
        blocks: ["set_variable", "get_variable", "change_variable"],
        category: "variable",
      },
      값: {
        blocks: ["set_variable", "get_variable", "change_variable"],
        category: "variable",
      },
      정하기: {
        blocks: ["set_variable"],
        category: "variable",
      },
      바꾸기: {
        blocks: ["change_variable", "set_variable"],
        category: "variable",
      },
      점수: {
        blocks: ["set_variable", "change_variable", "show_variable"],
        category: "variable",
      },
      생명: {
        blocks: ["set_variable", "change_variable", "show_variable"],
        category: "variable",
      },
      리스트: {
        blocks: ["add_to_list", "remove_from_list", "insert_to_list"],
        category: "variable",
      },
      목록: {
        blocks: ["add_to_list", "remove_from_list", "insert_to_list"],
        category: "variable",
      },
      추가: {
        blocks: ["add_to_list", "insert_to_list"],
        category: "variable",
      },
      삭제: {
        blocks: ["remove_from_list", "delete_all_list"],
        category: "variable",
      },

      // ===== 함수 카테고리 =====
      함수: {
        blocks: ["define_function", "call_function"],
        category: "func",
      },
      정의: {
        blocks: ["define_function"],
        category: "func",
      },
      호출: {
        blocks: ["call_function"],
        category: "func",
      },

      // ===== 하드웨어 카테고리 =====
      센서: {
        blocks: ["get_sensor_value", "is_sensor_greater"],
        category: "hardware",
      },
      LED: {
        blocks: ["set_led", "turn_off_led"],
        category: "hardware",
      },
      모터: {
        blocks: ["rotate_motor", "stop_motor"],
        category: "hardware",
      },
      서보: {
        blocks: ["set_servo_angle"],
        category: "hardware",
      },

      // ===== 게임 관련 복합 키워드 =====
      총알: {
        blocks: ["create_clone", "when_clone_start", "delete_clone"],
        category: "flow",
      },
      발사: {
        blocks: ["create_clone", "when_clone_start"],
        category: "flow",
      },
      점프: {
        blocks: ["change_y", "move_y"],
        category: "moving",
      },
      중력: {
        blocks: ["change_y", "repeat_inf"],
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
        blocks: ["move_y", "change_y"],
        category: "moving",
      },
      하강: {
        blocks: ["move_y", "change_y"],
        category: "moving",
      },
    };

    // 동의어 매핑
    this.synonymMap = {
      메세지: "메시지",
      시그널: "신호",
      브로드캐스트: "신호",
    };

    // 오타 교정 사전
    this.commonTypos = {
      스페이스바: "스페이스",
      스페바: "스페이스",
      ㅅㅍㅇㅅ: "스페이스",
    };
  }

  /**
   * 키워드로 블록 찾기
   */
  getBlocksByKeyword(keyword) {
    return this.keywordToBlocks[keyword] || null;
  }

  /**
   * 부분 매칭으로 키워드 찾기
   */
  findKeywordsByPartialMatch(partial) {
    const matches = [];
    for (const keyword of Object.keys(this.keywordToBlocks)) {
      if (keyword.includes(partial) || partial.includes(keyword)) {
        matches.push(keyword);
      }
    }
    return matches;
  }
}