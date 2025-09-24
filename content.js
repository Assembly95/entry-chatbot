// 전역 함수들을 IIFE 외부에 선언
window.saveApiKeyFromModal = async function () {
  const keyInput = document.getElementById("modal-api-key");
  const apiKey = keyInput.value.trim();

  if (!apiKey) {
    window.showModalMessage("API 키를 입력해주세요.", "error");
    return;
  }

  if (!apiKey.startsWith("sk-")) {
    window.showModalMessage("올바른 OpenAI API 키 형식이 아닙니다.", "error");
    return;
  }

  try {
    await chrome.storage.sync.set({ openai_api_key: apiKey });

    const indicator = document.getElementById("key-status-indicator");
    const message = document.getElementById("key-status-message");
    if (indicator && message) {
      indicator.style.background = "#10b981";
      message.textContent = "키가 저장되었습니다";
    }
    keyInput.value = "";

    window.showModalMessage("API 키가 성공적으로 저장되었습니다!", "success");

    setTimeout(() => {
      const modal = document.getElementById("api-key-modal");
      if (modal) modal.remove();
    }, 1500);
  } catch (error) {
    window.showModalMessage("저장 실패: " + error.message, "error");
  }
};

// testStoredKey 함수도 전역으로 이동
window.testStoredKey = async function (apiKey) {
  window.showModalMessage("연결을 테스트하고 있습니다...", "info");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    });

    const indicator = document.getElementById("key-status-indicator");
    const message = document.getElementById("key-status-message");

    if (response.ok) {
      if (indicator && message) {
        indicator.style.background = "#10b981";
        message.textContent = "키가 정상 작동합니다";
      }
      window.showModalMessage("API 키 연결이 성공했습니다!", "success");
    } else {
      if (indicator && message) {
        indicator.style.background = "#ef4444";
      }

      let errorMessage = "연결 실패";
      if (response.status === 401) {
        errorMessage = "API 키가 유효하지 않습니다";
        if (message) message.textContent = "키 인증에 실패했습니다";
      } else if (response.status === 429) {
        errorMessage = "사용량을 초과했습니다";
        if (message) message.textContent = "사용량 초과";
      } else if (response.status === 402) {
        errorMessage = "크레딧이 부족합니다";
        if (message) message.textContent = "크레딧 부족";
      }

      window.showModalMessage(errorMessage, "error");
    }
  } catch (error) {
    const indicator = document.getElementById("key-status-indicator");
    const message = document.getElementById("key-status-message");

    if (indicator && message) {
      indicator.style.background = "#ef4444";
      message.textContent = "연결 테스트 실패";
    }
    window.showModalMessage("테스트 실패: " + error.message, "error");
  }
};

// 모달에서 API 키 테스트 (전역 함수로 이동)
window.testApiKeyFromModal = async function () {
  const keyInput = document.getElementById("modal-api-key");
  const apiKey = keyInput.value.trim();

  if (!apiKey) {
    // 저장된 키로 테스트
    try {
      const result = await chrome.storage.sync.get(["openai_api_key"]);
      if (!result.openai_api_key) {
        window.showModalMessage("먼저 API 키를 입력하거나 저장해주세요.", "error");
        return;
      }
      window.testStoredKey(result.openai_api_key);
    } catch (error) {
      window.showModalMessage("저장된 키를 불러올 수 없습니다.", "error");
    }
  } else {
    window.testStoredKey(apiKey);
  }
};

// 모달 메시지 표시 - 전역 함수로 이동
window.showModalMessage = function (message, type) {
  const statusDiv = document.getElementById("modal-status-message");
  if (!statusDiv) return;

  const colors = {
    success: { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
    error: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
    info: { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
  };

  const style = colors[type] || colors.info;
  statusDiv.style.background = style.bg;
  statusDiv.style.color = style.color;
  statusDiv.style.border = `1px solid ${style.border}`;
  statusDiv.style.display = "block";
  statusDiv.textContent = message;

  if (type === "success") {
    setTimeout(() => {
      statusDiv.style.display = "none";
    }, 3000);
  }
};

// 그 다음에 IIFE 시작
(function () {
  "use strict";
  // 기존 코드...
  let isInitialized = false;
  let sidebar = null;
  let conversationHistory = [];
  let pendingOpenRequest = false;
  let isEntryReady = false;
  let currentCoT = null;

  // 카테고리 세부사항 표시 함수
  window.showCategoryDetails = function (category) {
    console.log(`${category} 카테고리 세부사항 표시`);
    const categoryName = getCategoryKorean ? getCategoryKorean(category) : category;
    // addChatMessage 함수를 직접 호출할 수 없으므로 이벤트를 통해 처리
    setTimeout(() => {
      const chatMessages = document.getElementById("chat-messages");
      if (chatMessages) {
        // 직접 DOM에 메시지 추가
        const messageDiv = document.createElement("div");
        messageDiv.className = "message bot-message";
        messageDiv.innerHTML = `
        <div class="message-avatar">
          <img src="${chrome.runtime.getURL("icon.png")}" style="width: 20px; height: 20px;">
        </div>
        <div class="message-content">
          <div class="message-text">
            ${categoryName} 카테고리의 블록들에 대해 더 자세히 알고 싶으시군요! 어떤 부분이 궁금하신가요?
          </div>
          <div class="message-time">${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 100);
  };

  // ===== 블록 JSON -> Entry Script Array 변환 함수 =====
  function blockJsonToScriptArray(blockJson) {
    if (!blockJson || !blockJson.fileName) return [];
    return [[blockJson.fileName, [], []]];
  }

  function injectEntryProbe() {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("entryProbe.js");
    (document.head || document.documentElement).appendChild(s);
    s.onload = () => s.remove();
  }

  // ===== 카테고리별 색상 반환 =====
  function getCategoryColor(category) {
    const colors = {
      start: "#4CAF50",
      moving: "#2196F3",
      looks: "#9C27B0",
      sound: "#FF9800",
      judgement: "#F44336",
      flow: "#FF5722",
      variable: "#795548",
      func: "#607D8B",
      calc: "#009688",
      brush: "#E91E63",
      text: "#3F51B5",
    };
    return colors[category] || "#757575";
  }

  // ===== 현재 키 상태 로드 =====
  async function loadCurrentKeyStatus() {
    try {
      const result = await chrome.storage.sync.get(["openai_api_key"]);
      const indicator = document.getElementById("key-status-indicator");
      const message = document.getElementById("key-status-message");

      if (indicator && message) {
        if (result.openai_api_key) {
          indicator.style.background = "#10b981";
          message.textContent = "키가 설정되어 있습니다";
        } else {
          indicator.style.background = "#ef4444";
          message.textContent = "키가 설정되지 않음";
        }
      }
    } catch (error) {
      console.error("키 상태 로드 실패:", error);
    }
  }

  // ===== 카테고리 한국어 변환 (엔트리 용어로 수정) =====
  function getCategoryKorean(category) {
    const categoryMap = {
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
    return categoryMap[category] || category;
  }

  // ===== 카테고리 아이콘 경로 매핑 =====
  function getCategoryIconPath(category) {
    return chrome.runtime.getURL(`data/block_icon/${category}_icon.svg`);
  }

  // ===== 카테고리 아이콘 가져오기 =====
  async function getCategoryIconElement(category) {
    const iconPath = getCategoryIconPath(category);

    try {
      const response = await fetch(iconPath);
      if (response.ok) {
        return `<img src="${iconPath}" style="width: 24px; height: 24px; vertical-align: middle;" alt="${category}">`;
      }
    } catch (error) {
      console.log(`아이콘 로드 실패 (${category}):`, error);
    }

    // 폴백: 이모지 사용
    const emojiIcons = {
      start: "🚩",
      flow: "🔄",
      moving: "🏃",
      looks: "🎨",
      brush: "🖌️",
      sound: "🔊",
      judgement: "❓",
      calc: "🔢",
      variable: "📦",
      func: "⚙️",
      text: "📝",
    };

    return `<span style="font-size: 24px;">${emojiIcons[category] || "📦"}</span>`;
  }

  // ===== 카테고리 카드 생성 함수 =====
  async function createCategoryCards(blocks) {
    if (!blocks || blocks.length === 0) return "";

    // 카테고리별로 그룹화
    const blocksByCategory = {};
    blocks.forEach((block) => {
      const category = block.category;
      if (!blocksByCategory[category]) {
        blocksByCategory[category] = [];
      }
      blocksByCategory[category].push(block);
    });

    let html = `
      <div style="
        background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
        border-radius: 16px;
        padding: 20px;
        margin: 16px 0;
        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        border: 1px solid rgba(0,0,0,0.05);
      ">
        <div style="
          font-size: 14px;
          color: #495057;
          margin-bottom: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
        ">
          <span style="font-size: 18px;">📚</span>
          <span>이런 카테고리를 살펴보세요!</span>
        </div>
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        ">
    `;

    // 각 카테고리 카드 생성
    for (const [category, categoryBlocks] of Object.entries(blocksByCategory)) {
      const categoryName = getCategoryKorean(category);
      const color = getCategoryColor(category);
      const iconElement = await getCategoryIconElement(category);

      html += `
        <div style="
          background: white;
          border: 2px solid ${color}30;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        "
        onmouseover="
          this.style.transform='translateY(-4px) scale(1.02)';
          this.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)';
          this.style.borderColor='${color}';
          this.style.background='linear-gradient(135deg, ${color}08, ${color}15)';
        "
        onmouseout="
          this.style.transform='translateY(0) scale(1)';
          this.style.boxShadow='none';
          this.style.borderColor='${color}30';
          this.style.background='white';
        "
        onclick="window.showCategoryDetails && window.showCategoryDetails('${category}')"
        >
          <div style="
            position: absolute;
            top: -20px;
            right: -20px;
            width: 60px;
            height: 60px;
            background: ${color}10;
            border-radius: 50%;
            pointer-events: none;
          "></div>
          
          <div style="
            margin-bottom: 10px;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 36px;
          ">${iconElement}</div>
          
          <div style="
            font-weight: 700;
            color: ${color};
            font-size: 14px;
            margin-bottom: 4px;
            letter-spacing: -0.3px;
          ">${categoryName}</div>
          
          <div style="
            font-size: 11px;
            color: #868e96;
            font-weight: 500;
          ">블록 ${categoryBlocks.length}개</div>
          
          <div style="
            position: absolute;
            top: 8px;
            right: 8px;
            background: ${color};
            color: white;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          ">${categoryBlocks.length}</div>
        </div>
      `;
    }

    html += `
        </div>
        <div style="
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e9ecef;
          font-size: 11px;
          color: #868e96;
          text-align: center;
          font-style: italic;
        ">
          💡 카테고리를 클릭하면 해당 블록들을 자세히 볼 수 있어요!
        </div>
      </div>
    `;

    return html;
  }

  // ===== 블록 리스트 이미지 생성 =====
  function createBlockListWithImages(blocks) {
    if (!blocks || blocks.length === 0) return "";

    let html = `
    <div style="
      background: #f8f9fa; 
      border-radius: 12px; 
      padding: 16px; 
      margin: 12px 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    ">
      <div style="
        font-size: 13px; 
        color: #495057; 
        margin-bottom: 12px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span style="font-size: 16px;">🎯</span>
        <span>이런 블록들을 사용해보세요!</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
    `;

    blocks.forEach((block) => {
      const blockName = block.name || block.fileName || "알 수 없는 블록";
      const category = getCategoryKorean(block.category);
      const color = getCategoryColor(block.category);

      html += `
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e9ecef;
          transition: all 0.2s;
          cursor: pointer;
        " 
        onmouseover="this.style.transform='translateX(4px)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'"
        onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='none'">
          
          <div style="
            width: 60px;
            height: 40px;
            background: ${color};
            opacity: 0.15;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          ">
            <span style="font-size: 20px; opacity: 0.8;">📦</span>
          </div>
          
          <div style="flex: 1; min-width: 0;">
            <div style="
              font-weight: 600;
              color: #212529;
              font-size: 13px;
              margin-bottom: 2px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${blockName}</div>
            <div style="
              font-size: 11px;
              color: #6c757d;
            ">${category} 카테고리</div>
          </div>
          
          <div style="
            padding: 4px 8px;
            background: ${color};
            color: white;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            white-space: nowrap;
          ">${category}</div>
        </div>
      `;
    });

    html += `
      </div>
      <div style="
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #e9ecef;
        font-size: 11px;
        color: #6c757d;
        font-style: italic;
      ">
        💡 팁: 블록 이름을 클릭하면 자세한 설명을 볼 수 있어요!
      </div>
    </div>
    `;

    return html;
  }

  // ===== 아이콘 사전 로드 함수 =====
  async function preloadCategoryIcons() {
    const categories = ["start", "flow", "moving", "looks", "brush", "sound", "judgement", "calc", "variable", "func", "text"];
    const loadedIcons = {};

    for (const category of categories) {
      try {
        const iconPath = getCategoryIconPath(category);
        const response = await fetch(iconPath);
        if (response.ok) {
          loadedIcons[category] = iconPath;
          console.log(`✅ ${category} 아이콘 로드 성공`);
        }
      } catch (error) {
        console.log(`❌ ${category} 아이콘 로드 실패`);
      }
    }

    console.log("로드된 아이콘:", loadedIcons);
    return loadedIcons;
  }

  // ===== 간단한 사이드바 생성 =====
  function createSidebar() {
    const EXIST = document.getElementById("entry-helper-sidebar");
    if (EXIST) return EXIST;

    const html = `
    <div id="entry-helper-sidebar" class="entry-helper-sidebar">
      <!-- 헤더 -->
      <div class="sidebar-header">
        <div class="header-title">
          <h3><img src="${chrome.runtime.getURL(
            "icon.png"
          )}" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px;">AI 블록 도우미</h3>
          <div class="status-indicator" id="entry-status">
            <span class="status-dot"></span>
            <span class="status-text">준비 중...</span>
          </div>
        </div>
        <div class="sidebar-controls">
          <button id="api-key-btn" class="control-btn" title="API 키 설정">🔑</button>
          <button id="sidebar-close" class="control-btn">✕</button>
        </div>
      </div>

      <!-- 채팅 영역 -->
      <div class="chat-section">
        <div class="chat-container">
          <div id="chat-messages" class="chat-messages">
            <div class="message bot-message">
              <div class="message-avatar">
                <img src="${chrome.runtime.getURL("icon.png")}" style="width: 20px; height: 20px;">
              </div>
              <div class="message-content">
                <div class="message-text">
                  안녕! 무엇을 만들고 싶니? 정답을 바로 알려주지 않고, 
                  네가 스스로 생각할 수 있도록 한 단계씩 질문할게!
                </div>
                <div class="message-time">방금 전</div>
              </div>
            </div>
          </div>
          
          <div class="chat-input-container">
            <div class="input-header">
              <div class="input-status">
                <span id="typing-indicator" class="typing-indicator hidden">AI가 생각 중...</span>
              </div>
            </div>
            
            <div class="input-wrapper">
              <textarea id="chat-input" placeholder="질문을 적어보세요..." rows="1"></textarea>
              <button id="chat-send" class="send-button" title="전송">
                <span class="send-icon">📤</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Block Renderer (hidden) -->
    <div id="entry-hidden-renderer" style="position:fixed; left:-9999px; top:-9999px; width:800px; height:600px;"></div>

    <!-- 사이드바 토글 트리거 버튼 -->
    <div id="sidebar-trigger" class="sidebar-trigger" title="AI 도우미 열기">
      <img src="${chrome.runtime.getURL("icon.png")}" class="trigger-icon" style="width: 28px; height: 28px;">
      <span class="trigger-badge" id="notification-badge" style="display: none;">!</span>
    </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
    return document.getElementById("entry-helper-sidebar");
  }

  // ===== CoT 응답 표시 함수 =====
  function displayCoTResponse(cotSequence, fullResponse) {
    if (!cotSequence || !cotSequence.steps) {
      addChatMessage(fullResponse, true);
      return;
    }

    const cotId = `cot-${Date.now()}`;

    const cotHtml = `
    <div class="cot-response" id="${cotId}" data-total-steps="${cotSequence.totalSteps}">
      <div class="cot-header">
        <span class="cot-badge">
          <span style="margin-right: 5px;">🎯</span>
          단계별 가이드
        </span>
        <span class="cot-progress">
          <span class="current-step-text">1</span>/${cotSequence.totalSteps}
        </span>
      </div>
      <div class="cot-steps">
        ${cotSequence.steps
          .map(
            (step, index) => `
          <div class="cot-step ${index === 0 ? "active" : ""}" 
               data-step="${step.stepNumber}"
               style="margin-bottom: 12px;">
            <div class="step-header cot-step-toggle" 
                 data-step-num="${step.stepNumber}"
                 style="
                   cursor: pointer;
                   padding: 8px 12px;
                   background: ${index === 0 ? "#e3f2fd" : "#f5f5f5"};
                   border-radius: 8px;
                   display: flex;
                   align-items: center;
                   justify-content: space-between;
                 ">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="step-number" style="
                  background: #2196f3;
                  color: white;
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
                  font-weight: bold;
                ">${step.stepNumber}</span>
                <span class="step-title" style="font-weight: 600; color: #333;">
                  ${step.title}
                </span>
              </div>
              <span class="step-toggle-icon" style="color: #666;">
                ${index === 0 ? "▼" : "▶"}
              </span>
            </div>
            <div class="step-content ${index === 0 ? "expanded" : "collapsed"}" 
                 data-step-content="${step.stepNumber}"
                 style="
                   padding: ${index === 0 ? "12px" : "0 12px"};
                   background: white;
                   border-radius: 0 0 8px 8px;
                   max-height: ${index === 0 ? "500px" : "0"};
                   overflow: hidden;
                   transition: all 0.3s ease;
                 ">
              <div style="white-space: pre-wrap; line-height: 1.6;">
                ${step.content}
              </div>
              ${step.completed ? '<div style="margin-top: 8px; color: #4caf50; font-size: 12px;">✓ 완료됨</div>' : ""}
            </div>
          </div>
        `
          )
          .join("")}
      </div>
      <div class="cot-navigation" style="
        display: flex;
        gap: 8px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e0e0e0;
      ">
        <button class="cot-nav-prev" 
                data-cot-id="${cotId}"
                style="
                  padding: 8px 16px;
                  border-radius: 6px;
                  border: 1px solid #ddd;
                  background: white;
                  cursor: pointer;
                  font-size: 13px;
                " disabled>이전 단계</button>
        <button class="cot-nav-next"
                data-cot-id="${cotId}"
                style="
                  padding: 8px 16px;
                  border-radius: 6px;
                  border: 1px solid #2196f3;
                  background: #2196f3;
                  color: white;
                  cursor: pointer;
                  font-size: 13px;
                ">다음 단계</button>
        <button class="cot-complete-step"
                data-cot-id="${cotId}"
                style="
                  margin-left: auto;
                  padding: 8px 16px;
                  border-radius: 6px;
                  border: 1px solid #4caf50;
                  background: white;
                  color: #4caf50;
                  cursor: pointer;
                  font-size: 13px;
                ">현재 단계 완료</button>
      </div>
    </div>
  `;

    // HTML 추가
    addChatMessage(cotHtml, true, "cot");

    // 이벤트 리스너 설정 (DOM에 추가된 후 바로 실행)
    setTimeout(() => {
      setupCoTEventListeners(cotId, cotSequence);
    }, 100);
  }

  // ===== 열기/닫기 =====
  function toggleSidebarOpen(forceOpen = null) {
    if (!isInitialized || !sidebar) {
      pendingOpenRequest = forceOpen === null ? true : !!forceOpen;
      return;
    }
    const open = forceOpen === null ? !sidebar.classList.contains("sidebar-open") : !!forceOpen;
    if (open) {
      sidebar.classList.add("sidebar-open");
    } else {
      sidebar.classList.remove("sidebar-open");
    }
  }

  // ===== Entry 프로젝트 컨텍스트 수집 =====
  function gatherProjectContext() {
    try {
      if (!isEntryReady || typeof Entry === "undefined" || !Entry.playground || !Entry.container) {
        return "Entry가 아직 준비되지 않았습니다.";
      }

      const context = [];
      const currentObject = Entry.playground.object;
      if (currentObject) {
        context.push(`현재 오브젝트: ${currentObject.name || "이름없음"}`);

        const getList = currentObject.script?.getBlockList;
        if (typeof getList === "function") {
          const blockList = getList.call(currentObject.script);
          const blockCount = blockList.length;
          context.push(`사용된 블록 수: ${blockCount}개`);

          if (blockCount > 0) {
            const blockTypes = blockList.slice(0, 3).map((block) => block?.type || "알 수 없는 블록");
            context.push(`주요 블록들: ${blockTypes.join(", ")}`);
          }

          const complexity = blockCount > 10 ? "복잡함" : blockCount > 3 ? "보통" : "간단함";
          context.push(`복잡도: ${complexity}`);
        }
      }

      const objects = Entry.container.getAllObjects?.() || [];
      context.push(`전체 오브젝트 수: ${objects.length}개`);

      return context.join(" | ");
    } catch (e) {
      return `컨텍스트 수집 오류: ${e.message}`;
    }
  }

  // ===== RAG 토글 함수 =====
  async function toggleRAGMode() {
    try {
      console.log("RAG 모드 토글 시작");

      chrome.runtime.sendMessage({ action: "toggleRAG" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("RAG 토글 Chrome runtime 오류:", chrome.runtime.lastError);
          addChatMessage("RAG 모드 변경 중 오류가 발생했어요.", true, "system");
          return;
        }

        console.log("RAG 토글 응답:", response);

        if (response && response.success) {
          updateRAGStatus(response.ragEnabled);
          const modeText = response.ragEnabled ? "Entry 전문 지식" : "일반 AI 지식";
          addChatMessage(`🔄 모드가 변경되었습니다: ${modeText}`, true, "system");
        } else {
          console.error("RAG 토글 실패:", response);
          addChatMessage("RAG 모드 변경에 실패했어요.", true, "system");
        }
      });
    } catch (error) {
      console.error("RAG 토글 오류:", error);
      addChatMessage("RAG 모드 변경 중 예상치 못한 오류가 발생했어요.", true, "system");
    }
  }

  function updateRAGStatus(isEnabled) {
    const toggleBtn = document.getElementById("rag-toggle");
    const statusText = document.getElementById("rag-status-text");
    const statusDot = document.getElementById("rag-status-dot");

    if (toggleBtn && statusText && statusDot) {
      if (isEnabled) {
        toggleBtn.style.background = "rgba(16, 185, 129, 0.2)";
        toggleBtn.style.color = "#065f46";
        toggleBtn.title = "RAG 끄기 (현재: Entry 전문 지식)";
        statusText.textContent = "Entry 전문 지식";
        statusDot.className = "status-dot valid";
      } else {
        toggleBtn.style.background = "rgba(239, 68, 68, 0.2)";
        toggleBtn.style.color = "#991b1b";
        toggleBtn.title = "RAG 켜기 (현재: 일반 AI 지식)";
        statusText.textContent = "일반 AI 지식";
        statusDot.className = "status-dot";
      }
    }
  }

  function loadRAGStatus() {
    chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
      if (response) {
        updateRAGStatus(response.ragEnabled);
      }
    });
  }

  // ===== 채팅 메시지 추가 함수 =====
  function addChatMessage(content, isBot = false, type = "text") {
    const messagesContainer = document.getElementById("chat-messages");
    if (!messagesContainer) return;

    const messageDiv = document.createElement("div");
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

    if (type === "cot") {
      messageDiv.className = "message bot-message cot-message";
      messageDiv.innerHTML = `
      <div class="message-avatar">
        <img src="${chrome.runtime.getURL("icon.png")}" style="width:20px;height:20px;">
      </div>
      <div class="message-content" style="max-width: 100%;">
        ${content}
        <div class="message-time">${timeStr}</div>
      </div>
    `;
    } else if (type === "block-with-image") {
      messageDiv.className = "message bot-message";
      messageDiv.innerHTML = `
      <div class="message-avatar">
        <img src="${chrome.runtime.getURL("icon.png")}" style="width:20px;height:20px;">
      </div>
      <div class="message-content">
        ${content}
        <div class="message-time">${timeStr}</div>
      </div>
    `;
    } else if (type === "system") {
      messageDiv.className = "message system-message";
      messageDiv.innerHTML = `
      <div class="message-content system-message-content">
        <div class="message-text">${content}</div>
      </div>
    `;
    } else {
      messageDiv.className = `message ${isBot ? "bot-message" : "user-message"}`;
      messageDiv.innerHTML = `
      <div class="message-avatar">${
        isBot ? `<img src="${chrome.runtime.getURL("icon.png")}" style="width: 20px; height: 20px;">` : "👤"
      }</div>
      <div class="message-content">
        <div class="message-text">${content}</div>
        <div class="message-time">${timeStr}</div>
      </div>
    `;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // ===== CoT 이벤트 리스너 설정 함수 =====
  function setupCoTEventListeners(cotId, cotSequence) {
    const cotElement = document.getElementById(cotId);
    if (!cotElement) {
      console.error("CoT element not found:", cotId);
      return;
    }

    // 현재 상태 관리
    let currentStep = 1;

    // 1. 단계 토글 이벤트
    const stepHeaders = cotElement.querySelectorAll(".cot-step-toggle");
    stepHeaders.forEach((header) => {
      header.addEventListener("click", function () {
        const stepNum = parseInt(this.dataset.stepNum);
        toggleStepContent(cotElement, stepNum);
      });
    });

    // 2. 이전/다음 버튼 이벤트
    const prevBtn = cotElement.querySelector(".cot-nav-prev");
    const nextBtn = cotElement.querySelector(".cot-nav-next");

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (currentStep > 1) {
          currentStep--;
          navigateToStep(cotElement, currentStep, cotSequence.totalSteps);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (currentStep < cotSequence.totalSteps) {
          currentStep++;
          navigateToStep(cotElement, currentStep, cotSequence.totalSteps);
        }
      });
    }

    // 3. 완료 버튼 이벤트
    const completeBtn = cotElement.querySelector(".cot-complete-step");
    if (completeBtn) {
      completeBtn.addEventListener("click", function () {
        markStepComplete(cotElement, currentStep);
        // 자동으로 다음 단계로 이동
        if (currentStep < cotSequence.totalSteps) {
          setTimeout(() => {
            currentStep++;
            navigateToStep(cotElement, currentStep, cotSequence.totalSteps);
          }, 500);
        }
      });
    }
  }

  // ===== 단계 토글 함수 =====
  function toggleStepContent(cotElement, stepNum) {
    const allContents = cotElement.querySelectorAll(".step-content");
    const allHeaders = cotElement.querySelectorAll(".cot-step-toggle");

    // 클릭한 단계 찾기
    const targetContent = cotElement.querySelector(`[data-step-content="${stepNum}"]`);
    const targetHeader = cotElement.querySelector(`[data-step-num="${stepNum}"]`);

    if (!targetContent || !targetHeader) return;

    // 현재 상태 확인
    const isExpanded = targetContent.classList.contains("expanded");

    // 모든 단계 닫기
    allContents.forEach((content) => {
      content.style.maxHeight = "0";
      content.style.padding = "0 12px";
      content.classList.remove("expanded");
      content.classList.add("collapsed");
    });

    allHeaders.forEach((header) => {
      header.style.background = "#f5f5f5";
      const icon = header.querySelector(".step-toggle-icon");
      if (icon) icon.textContent = "▶";
    });

    // 클릭한 단계가 닫혀있었다면 열기
    if (!isExpanded) {
      targetContent.style.maxHeight = "500px";
      targetContent.style.padding = "12px";
      targetContent.classList.remove("collapsed");
      targetContent.classList.add("expanded");
      targetHeader.style.background = "#e3f2fd";
      const icon = targetHeader.querySelector(".step-toggle-icon");
      if (icon) icon.textContent = "▼";
    }
  }

  // ===== 단계 네비게이션 함수 =====
  function navigateToStep(cotElement, stepNum, totalSteps) {
    // 해당 단계 열기
    toggleStepContent(cotElement, stepNum);

    // 진행 상황 업데이트
    const progressText = cotElement.querySelector(".current-step-text");
    if (progressText) {
      progressText.textContent = stepNum;
    }

    // 버튼 상태 업데이트
    const prevBtn = cotElement.querySelector(".cot-nav-prev");
    const nextBtn = cotElement.querySelector(".cot-nav-next");

    if (prevBtn) prevBtn.disabled = stepNum === 1;
    if (nextBtn) nextBtn.disabled = stepNum === totalSteps;
  }

  // ===== 단계 완료 표시 함수 =====
  function markStepComplete(cotElement, stepNum) {
    const stepContent = cotElement.querySelector(`[data-step-content="${stepNum}"]`);
    if (stepContent && !stepContent.innerHTML.includes("✓ 완료됨")) {
      const completeMarker = document.createElement("div");
      completeMarker.style.cssText = "margin-top: 8px; color: #4caf50; font-size: 12px;";
      completeMarker.textContent = "✓ 완료됨";
      stepContent.appendChild(completeMarker);
    }
  }

  // ===== 이벤트 설정 =====
  function setupEventListeners() {
    const chatInput = document.getElementById("chat-input");
    const chatSend = document.getElementById("chat-send");

    let isComposing = false;

    // API 키 설정 버튼 이벤트
    const apiKeyBtn = document.getElementById("api-key-btn");
    if (apiKeyBtn) {
      apiKeyBtn.addEventListener("click", showApiKeyModal);
    }

    // 사이드바 컨트롤
    const triggerBtn = document.getElementById("sidebar-trigger");
    const closeBtn = document.getElementById("sidebar-close");

    if (triggerBtn) {
      triggerBtn.addEventListener("click", () => toggleSidebarOpen());
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => toggleSidebarOpen(false));
    }

    // 학습 진행상황 모달 표시 함수
    function showLearnerProgressModal() {
      chrome.runtime.sendMessage({ action: "getLearnerProgress" }, (response) => {
        if (response && response.success) {
          const progress = response.progress;

          const modalHtml = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.5);
          z-index: 10001;
          display: flex;
          align-items: center;
          justify-content: center;
        " id="progress-modal">
          <div style="
            background: white;
            border-radius: 12px;
            padding: 20px;
            max-width: 400px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
          ">
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 16px;
            ">
              <h3 style="margin: 0; color: #333;">📊 학습 진행상황</h3>
              <button onclick="this.closest('#progress-modal').remove()" 
                      style="border: none; background: none; font-size: 18px; cursor: pointer;">✕</button>
            </div>
            
            <div style="margin-bottom: 16px;">
              <div style="color: #666; font-size: 14px; margin-bottom: 8px;">전체 진행도</div>
              <div style="
                background: #f0f0f0;
                border-radius: 10px;
                height: 20px;
                position: relative;
              ">
                <div style="
                  background: #4caf50;
                  height: 100%;
                  border-radius: 10px;
                  width: ${progress.progress}%;
                  transition: width 0.5s ease;
                "></div>
                <div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  font-size: 12px;
                  font-weight: bold;
                  color: ${progress.progress > 50 ? "white" : "#333"};
                ">${progress.progress}%</div>
              </div>
            </div>
            
            ${
              progress.completedConcepts && progress.completedConcepts.length > 0
                ? `
              <div style="margin-bottom: 16px;">
                <div style="color: #666; font-size: 14px; margin-bottom: 8px;">완료한 개념</div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                  ${progress.completedConcepts
                    .map(
                      (concept) =>
                        `<span style="
                      background: #e8f5e9;
                      color: #2e7d32;
                      padding: 4px 8px;
                      border-radius: 12px;
                      font-size: 11px;
                    ">${concept}</span>`
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
            
            ${
              progress.recommendations && progress.recommendations.length > 0
                ? `
              <div>
                <div style="color: #666; font-size: 14px; margin-bottom: 8px;">추천사항</div>
                <ul style="margin: 0; padding-left: 16px;">
                  ${progress.recommendations
                    .map((rec) => `<li style="font-size: 13px; margin-bottom: 4px;">${rec}</li>`)
                    .join("")}
                </ul>
              </div>
            `
                : ""
            }
            
            <div style="margin-top: 16px; text-align: right;">
              <button onclick="resetProgress()" style="
                background: #f44336;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                margin-right: 8px;
              ">진행상황 초기화</button>
              <button onclick="this.closest('#progress-modal').remove()" style="
                background: #2196f3;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
              ">닫기</button>
            </div>
          </div>
        </div>
      `;

          document.body.insertAdjacentHTML("beforeend", modalHtml);
        }
      });
    }

    // 진행상황 초기화 함수
    window.resetProgress = function () {
      if (confirm("정말로 학습 진행상황을 초기화하시겠어요?")) {
        chrome.runtime.sendMessage({ action: "resetLearnerProgress" }, (response) => {
          if (response && response.success) {
            document.getElementById("progress-modal")?.remove();
            addChatMessage("학습 진행상황이 초기화되었어요! 새로운 마음으로 시작해볼까요?", true, "system");
          }
        });
      }
    };

    // 메시지 전송 함수
    async function sendMessage() {
      try {
        const message = chatInput.value.trim();
        if (!message) return;

        // 사용자 메시지 표시
        addChatMessage(message, false);
        conversationHistory.push({ role: "user", content: message });

        chatInput.value = "";
        chatInput.style.height = "auto";

        // 타이핑 표시기
        const typingIndicator = document.getElementById("typing-indicator");
        if (typingIndicator) {
          typingIndicator.classList.remove("hidden");
        }

        // AI 응답 요청 (모드 자동 설정)
        const mode = "auto"; // 모드 선택 버튼이 제거되었으므로 자동 모드로 고정
        const projectContext = gatherProjectContext();

        chrome.runtime.sendMessage(
          {
            action: "generateAIResponse",
            message: message,
            mode: mode,
            projectContext: projectContext,
            conversationHistory: conversationHistory.slice(),
          },
          async (response) => {
            console.log("AI 응답 수신:", response);

            if (typingIndicator) {
              typingIndicator.classList.add("hidden");
            }

            if (chrome.runtime.lastError) {
              console.error("Chrome runtime 오류:", chrome.runtime.lastError);
              addChatMessage("연결 오류가 발생했어요. 확장 프로그램을 다시 로드해주세요!", true);
              return;
            }

            if (response && response.success) {
              // 분류 타입 확인
              const classification = response.classification;
              console.log(`📊 응답 타입: ${classification?.type || "unknown"}`);

              // CoT 응답인 경우 특별 처리
              if (classification?.type === "complex" && response.blockSequence) {
                displayCoTResponse(response.blockSequence, response.response);
              } else {
                addChatMessage(response.response, true);
              }

              // 대화 기록 추가
              conversationHistory.push({ role: "assistant", content: response.response });

              // RAG 블록 표시
              if (response.rawBlocks && response.rawBlocks.length > 0) {
                // 대화 횟수에 따른 다른 표시 방법
                const attemptCount = conversationHistory.filter(
                  (msg) =>
                    msg.role === "user" &&
                    (msg.content.includes("모르겠") || msg.content.includes("막혔") || msg.content.includes("도와"))
                ).length;

                if (attemptCount <= 1) {
                  // 처음에는 카테고리 카드만 표시
                  console.log("📂 카테고리 카드 표시");
                  const categoryCards = await createCategoryCards(response.rawBlocks);
                  addChatMessage(categoryCards, true, "block-with-image");
                } else {
                  // 여러 번 시도 후에는 구체적인 블록 표시
                  console.log("🎯 구체적인 블록 표시");
                  const blockListHtml = createBlockListWithImages(response.rawBlocks);
                  addChatMessage(blockListHtml, true, "block-with-image");
                }
              }

              // 학습 진행상황 표시
              if (response.learnerProgress && response.learnerProgress.progress > 0) {
                displayLearnerProgress(response.learnerProgress);
              }

              // 대화 기록 관리
              if (conversationHistory.length > 10) {
                conversationHistory = conversationHistory.slice(-10);
              }
            } else {
              const errorMessage = response?.error || "연결에 문제가 있어요. 다시 시도해주세요!";
              console.error("AI 응답 오류:", errorMessage);
              addChatMessage(`죄송해요, ${errorMessage}`, true);
            }
          }
        );
      } catch (error) {
        console.error("sendMessage 함수 오류:", error);
        addChatMessage("메시지 전송 중 오류가 발생했어요.", true);

        const typingIndicator = document.getElementById("typing-indicator");
        if (typingIndicator) {
          typingIndicator.classList.add("hidden");
        }
      }
    }

    function displayLearnerProgress(progress) {
      // 너무 자주 표시되지 않도록 조건 체크
      if (Math.random() < 0.3 && progress.progress >= 25) {
        // 30% 확률로, 25% 이상 진행시에만
        const progressHtml = `
      <div style="
        background: linear-gradient(135deg, #e8f5e9, #f1f8e9);
        border-left: 4px solid #4caf50;
        border-radius: 8px;
        padding: 12px;
        margin: 8px 0;
        font-size: 12px;
      ">
        <div style="font-weight: bold; color: #2e7d32; margin-bottom: 6px;">
          📈 학습 진행상황
        </div>
        <div style="color: #388e3c;">
          전체 진행도: ${progress.progress}% 
          ${
            progress.completedConcepts && progress.completedConcepts.length > 0
              ? `| 완료한 개념: ${progress.completedConcepts.slice(0, 2).join(", ")}`
              : ""
          }
        </div>
        ${
          progress.recommendations && progress.recommendations.length > 0
            ? `<div style="margin-top: 6px; font-style: italic; color: #558b2f;">
            💡 ${progress.recommendations[0]}
          </div>`
            : ""
        }
      </div>
    `;

        addChatMessage(progressHtml, true, "system");
      }
    }

    // API 키 모달 표시 함수
    function showApiKeyModal() {
      // 기존 모달이 있으면 제거
      const existingModal = document.getElementById("api-key-modal");
      if (existingModal) {
        existingModal.remove();
      }

      const modalHtml = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.5);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    " id="api-key-modal">
      <div style="
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        ">
          <h3 style="margin: 0; color: #333; font-size: 18px;">OpenAI API 키 설정</h3>
          <button id="modal-close-btn" 
                  style="border: none; background: none; font-size: 20px; cursor: pointer; color: #666;">×</button>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #555; font-size: 14px;">
            API 키 입력
          </label>
          <input type="password" id="modal-api-key" placeholder="sk-proj-... 또는 sk-..." 
                 style="
                   width: 100%;
                   padding: 10px;
                   border: 2px solid #e1e5e9;
                   border-radius: 6px;
                   font-size: 14px;
                   box-sizing: border-box;
                   transition: border-color 0.2s;
                 ">
          <div style="
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 6px;
            font-size: 12px;
          ">
            <span id="key-status-indicator" style="
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: #ef4444;
            "></span>
            <span id="key-status-message" style="color: #666;">키가 설정되지 않음</span>
          </div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <p style="
            font-size: 12px;
            color: #666;
            line-height: 1.4;
            margin: 0;
          ">
            <a href="https://platform.openai.com/api-keys" target="_blank" 
               style="color: #3b82f6; text-decoration: none;">OpenAI 대시보드</a>에서 API 키를 발급받으세요.
          </p>
        </div>
        
        <div style="display: flex; gap: 8px;">
          <button id="modal-test-btn" style="
            flex: 1;
            padding: 10px;
            border: 2px solid #10b981;
            background: white;
            color: #10b981;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
          ">
            테스트
          </button>
          <button id="modal-save-btn" style="
            flex: 2;
            padding: 10px;
            border: none;
            background: #3b82f6;
            color: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s;
          ">
            저장하기
          </button>
        </div>
        
        <div id="modal-status-message" style="
          margin-top: 12px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          display: none;
        "></div>
      </div>
    </div>
  `;

      document.body.insertAdjacentHTML("beforeend", modalHtml);

      // 이벤트 리스너 설정
      const closeBtn = document.getElementById("modal-close-btn");
      const testBtn = document.getElementById("modal-test-btn");
      const saveBtn = document.getElementById("modal-save-btn");
      const keyInput = document.getElementById("modal-api-key");

      // 닫기 버튼
      if (closeBtn) {
        closeBtn.addEventListener("click", function () {
          document.getElementById("api-key-modal").remove();
        });
      }

      // 테스트 버튼
      if (testBtn) {
        testBtn.addEventListener("click", function () {
          window.testApiKeyFromModal();
        });
      }

      // 저장 버튼
      if (saveBtn) {
        saveBtn.addEventListener("click", function () {
          window.saveApiKeyFromModal();
        });
      }

      // 입력 필드 포커스/블러 효과
      if (keyInput) {
        keyInput.addEventListener("focus", function () {
          this.style.borderColor = "#3b82f6";
        });

        keyInput.addEventListener("blur", function () {
          this.style.borderColor = "#e1e5e9";
        });

        // Enter 키로 저장
        keyInput.addEventListener("keypress", function (e) {
          if (e.key === "Enter") {
            window.saveApiKeyFromModal();
          }
        });
      }

      // 현재 저장된 키 상태 확인
      loadCurrentKeyStatus();
    }

    // 한국어 입력 조합 이벤트 처리
    if (chatInput) {
      chatInput.addEventListener("compositionstart", () => {
        isComposing = true;
      });

      chatInput.addEventListener("compositionend", () => {
        isComposing = false;
      });

      // 키보드 이벤트
      chatInput.addEventListener("keydown", async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          console.log("Enter 키 눌림, isComposing:", isComposing);

          if (!isComposing) {
            await sendMessage();
          }
        }
      });

      // 자동 높이 조절
      chatInput.addEventListener("input", () => {
        chatInput.style.height = "auto";
        chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + "px";
      });
    }

    // 전송 버튼 이벤트
    if (chatSend) {
      chatSend.addEventListener("click", sendMessage);
    }
  }

  // ===== 초기화 함수 =====
  function initializeChatbot() {
    if (isInitialized) return;

    try {
      console.log("챗봇 초기화 시작...");

      // CSS 스타일 삽입
      injectStyles();

      // 사이드바 생성
      sidebar = createSidebar();

      if (!sidebar) {
        console.error("사이드바 생성 실패");
        return;
      }

      // 이벤트 리스너 설정
      setupEventListeners();

      // 아이콘 사전 로드
      preloadCategoryIcons();

      // Entry 준비 상태 확인
      checkEntryReadiness();

      // RAG 상태 로드
      loadRAGStatus();

      isInitialized = true;
      console.log("✅ 챗봇 초기화 완료");

      // 대기 중인 열기 요청 처리
      if (pendingOpenRequest) {
        toggleSidebarOpen(true);
        pendingOpenRequest = false;
      }
    } catch (error) {
      console.error("❌ 챗봇 초기화 실패:", error);
    }
  }

  // ===== Entry 준비 상태 확인 =====
  function checkEntryReadiness() {
    const checkInterval = setInterval(() => {
      if (typeof Entry !== "undefined" && Entry.playground && Entry.container) {
        isEntryReady = true;
        updateEntryStatus(true);
        clearInterval(checkInterval);
        console.log("✅ Entry 준비 완료");
      }
    }, 1000);

    // 30초 후 타임아웃
    setTimeout(() => {
      if (!isEntryReady) {
        clearInterval(checkInterval);
        updateEntryStatus(false);
        console.log("⚠️ Entry 로드 타임아웃");
      }
    }, 30000);
  }

  // ===== Entry 상태 업데이트 =====
  function updateEntryStatus(ready) {
    const statusElement = document.getElementById("entry-status");
    if (!statusElement) return;

    const statusDot = statusElement.querySelector(".status-dot");
    const statusText = statusElement.querySelector(".status-text");

    if (statusDot && statusText) {
      if (ready) {
        statusDot.className = "status-dot valid";
        statusText.textContent = "Entry 연결됨";
      } else {
        statusDot.className = "status-dot";
        statusText.textContent = "Entry 대기 중";
      }
    }
  }

  // ===== CSS 스타일 삽입 =====
  function injectStyles() {
    const styleId = "entry-helper-styles";
    if (document.getElementById(styleId)) return;

    const styles = `
      <style id="${styleId}">
        /* 사이드바 기본 스타일 */
        .entry-helper-sidebar {
          position: fixed;
          top: 0;
          right: -420px;
          width: 400px;
          height: 100vh;
          background: white;
          box-shadow: -2px 0 20px rgba(0,0,0,0.15);
          z-index: 10000;
          transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
        }

        .entry-helper-sidebar.sidebar-open {
          right: 0;
        }

        /* 헤더 스타일 */
        .sidebar-header {
          padding: 16px;
          border-bottom: 1px solid #e9ecef;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .header-title h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
        }

        .status-indicator, .rag-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          opacity: 0.9;
          margin-bottom: 4px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fbbf24;
          animation: pulse 2s infinite;
        }

        .status-dot.valid {
          background: #10b981;
          animation: none;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .sidebar-controls {
          display: flex;
          gap: 8px;
        }

        .control-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: rgba(255,255,255,0.2);
          color: white;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .control-btn:hover {
          background: rgba(255,255,255,0.3);
        }

        /* 채팅 영역 스타일 */
        .chat-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          scroll-behavior: smooth;
        }

        .message {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          opacity: 0;
          animation: fadeInUp 0.3s ease forwards;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 14px;
        }

        .bot-message .message-avatar {
          background: linear-gradient(135deg, #667eea, #764ba2);
        }

        .user-message .message-avatar {
          background: #f1f3f4;
        }

        .message-content {
          flex: 1;
          min-width: 0;
        }

        .message-text {
          background: #f8f9fa;
          padding: 10px 14px;
          border-radius: 16px;
          line-height: 1.5;
          font-size: 14px;
          word-wrap: break-word;
        }

        .bot-message .message-text {
          background: #e3f2fd;
          border-bottom-left-radius: 6px;
        }

        .user-message .message-text {
          background: #667eea;
          color: white;
          border-bottom-right-radius: 6px;
        }

        .message-time {
          font-size: 11px;
          color: #6c757d;
          margin-top: 4px;
          padding: 0 4px;
        }

        .system-message {
          justify-content: center;
          margin: 8px 0;
        }

        .system-message-content {
          background: rgba(16, 185, 129, 0.1);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          text-align: center;
          color: #065f46;
        }

        /* 입력 영역 스타일 */
        .chat-input-container {
          padding: 16px;
          border-top: 1px solid #e9ecef;
          background: #fafbfc;
        }

        .input-header {
          margin-bottom: 8px;
        }

        .typing-indicator {
          font-size: 12px;
          color: #6c757d;
          font-style: italic;
        }

        .typing-indicator.hidden {
          visibility: hidden;
        }

        .input-wrapper {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        #chat-input {
          flex: 1;
          padding: 10px 14px;
          border: 2px solid #e9ecef;
          border-radius: 20px;
          font-size: 14px;
          font-family: inherit;
          resize: none;
          outline: none;
          transition: border-color 0.2s;
          min-height: 20px;
          max-height: 100px;
        }

        #chat-input:focus {
          border-color: #667eea;
        }

        .send-button {
          width: 40px;
          height: 40px;
          border: none;
          background: #667eea;
          color: white;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .send-button:hover {
          background: #5a6fd8;
          transform: scale(1.05);
        }

        /* 트리거 버튼 스타일 */
        .sidebar-trigger {
          position: fixed;
          top: 50%;
          right: 20px;
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }

        .sidebar-trigger:hover {
          transform: scale(1.1) translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }

        .trigger-icon {
          transition: transform 0.3s;
        }

        .sidebar-trigger:hover .trigger-icon {
          transform: rotate(10deg);
        }

        .trigger-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 20px;
          height: 20px;
          background: #ff4757;
          color: white;
          border-radius: 50%;
          font-size: 12px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
          60% { transform: translateY(-3px); }
        }

        /* CoT 스타일 */
        .cot-response {
          border: 1px solid #e3f2fd;
          border-radius: 12px;
          overflow: hidden;
          margin: 8px 0;
        }

        .cot-header {
          background: linear-gradient(135deg, #e3f2fd, #f3e5f5);
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e0e0e0;
        }

        .cot-badge {
          background: #2196f3;
          color: white;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
        }

        .cot-progress {
          font-size: 12px;
          color: #666;
          font-weight: 500;
        }

        .cot-steps {
          padding: 16px;
        }

        .cot-navigation button {
          transition: all 0.2s;
        }

        .cot-navigation button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .cot-navigation button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* 스크롤바 스타일 */
        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }

        .chat-messages::-webkit-scrollbar-track {
          background: transparent;
        }

        .chat-messages::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }

        .chat-messages::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        /* 반응형 스타일 */
        @media (max-width: 480px) {
          .entry-helper-sidebar {
            width: 100vw;
            right: -100vw;
          }
          
          .sidebar-trigger {
            top: 10px;
            right: 10px;
            width: 48px;
            height: 48px;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML("beforeend", styles);
  }

  // ===== 페이지 로드 완료 후 초기화 =====
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeChatbot);
  } else {
    // 이미 로드된 경우 약간의 지연 후 초기화
    setTimeout(initializeChatbot, 100);
  }

  // Entry 프로브 주입
  injectEntryProbe();

  // 전역 함수로 노출 (디버깅용)
  window.entryHelper = {
    toggleSidebar: toggleSidebarOpen,
    gatherContext: gatherProjectContext,
    isReady: () => isEntryReady,
    reinitialize: () => {
      isInitialized = false;
      initializeChatbot();
    },
  };
  // Chrome extension 메시지 리스너
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "TOGGLE_SIDEBAR") {
      toggleSidebarOpen();
    }
  });
})();
