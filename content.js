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

// createSingleCategoryCard 함수를 전역으로 정의
window.createSingleCategoryCard = function (block) {
  const getCategoryKorean =
    window.entryHelper?.getCategoryKorean ||
    function (cat) {
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
        brush: "붓",
        text: "글상자",
      };
      return map[cat] || cat;
    };

  const getCategoryColor = function (cat) {
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
    return colors[cat] || "#757575";
  };

  const categoryName = getCategoryKorean(block.category);
  const color = getCategoryColor(block.category);
  const iconPath = chrome.runtime.getURL(`data/block_icon/${block.category}_icon.svg`);

  return `
    <div style="
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border-radius: 16px;
      padding: 20px;
      margin: 16px 0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      text-align: center;
    ">
      <div style="font-size: 14px; color: #495057; margin-bottom: 16px; font-weight: 700;">
        💡 이 카테고리를 확인하세요!
      </div>
      <div style="
        background: white;
        border: 2px solid ${color};
        border-radius: 12px;
        padding: 20px;
        display: inline-block;
      ">
        <div style="margin-bottom: 10px;">
          <img src="${iconPath}" 
               style="width: 48px; height: 48px;"
               onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=font-size:36px>📦</span>';"
               alt="${categoryName}">
        </div>
        <div style="font-weight: 700; color: ${color}; font-size: 18px;">${categoryName}</div>
      </div>
      <div style="margin-top: 16px; font-size: 13px; color: #6c757d;">
        여기서 관련 블록을 찾아보세요!
      </div>
    </div>
  `;
};

// createBlockListWithImages 함수도 전역으로 (필요한 경우)
window.createBlockListWithImages = function (blocks) {
  if (!blocks || blocks.length === 0) return "";

  let html = '<div style="margin: 10px 0;">';
  blocks.forEach((block) => {
    html += `
      <div style="
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 8px;
      ">
        <div style="font-weight: 600; margin-bottom: 6px;">
          ${block.name || block.fileName}
        </div>
        ${block.description ? `<div style="color: #666; font-size: 13px;">${block.description}</div>` : ""}
      </div>
    `;
  });
  html += "</div>";
  return html;
};

// displayLearnerProgress 함수를 전역으로
window.displayLearnerProgress = function (progress) {
  if (Math.random() < 0.3 && progress.progress >= 25) {
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

    if (window.entryHelper && window.entryHelper.addChatMessage) {
      window.entryHelper.addChatMessage(progressHtml, true, "system");
    }
  }
};

// 그 다음에 IIFE 시작
(function () {
  "use strict";

  // 기본 변수들
  let isInitialized = false;
  let sidebar = null;
  let conversationHistory = [];
  let pendingOpenRequest = false;
  let isEntryReady = false;
  let currentCoT = null;

  // 카테고리 세부사항 표시 함수
  window.showCategoryDetails = function (category) {
    console.log(`${category} 카테고리 세부사항 표시`);
    const categoryName = getCategoryKorean(category);
    setTimeout(() => {
      const chatMessages = document.getElementById("chat-messages");
      if (chatMessages) {
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
  function convertMarkdownToHTML(text) {
    if (!text) return text;

    return (
      text
        // 굵은 텍스트
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        // 기울임
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        // 인라인 코드
        .replace(/`(.*?)`/g, '<code style="background: #f4f4f4; padding: 2px 4px; border-radius: 3px;">$1</code>')
        // 제목들
        .replace(/^### (.*?)$/gm, '<h3 style="margin: 16px 0 8px 0;">$1</h3>')
        .replace(/^## (.*?)$/gm, '<h2 style="margin: 20px 0 12px 0;">$1</h2>')
        .replace(/^# (.*?)$/gm, '<h1 style="margin: 24px 0 16px 0;">$1</h1>')
        // 줄바꿈
        .replace(/\n/g, "<br>")
        // 리스트
        .replace(/^• (.*?)$/gm, "<li>$1</li>")
        .replace(/^- (.*?)$/gm, "<li>$1</li>")
        .replace(/^\d+\. (.*?)$/gm, "<li>$1</li>")
    );
  }
  // Extension context 체크 함수
  function isExtensionValid() {
    return !!(chrome.runtime && chrome.runtime.id);
  }

  // Chrome API 호출 래퍼
  async function safeStorageGet(keys) {
    if (!isExtensionValid()) {
      throw new Error("Extension context lost");
    }
    return chrome.storage.sync.get(keys);
  }

  // 모든 chrome.storage.sync.get을 safeStorageGet으로 교체
  // ===== 유틸리티 함수들 =====
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

  function getEmojiFallback(category) {
    const emojiMap = {
      start: "🚀",
      moving: "🏃",
      looks: "🎨",
      sound: "🔊",
      judgement: "🤔",
      flow: "🔄",
      variable: "📊",
      func: "⚙️",
      calc: "🔢",
      brush: "🖌️",
      text: "📝",
      repeat: "🔁",
    };
    return emojiMap[category] || "📦";
  }

  function getCategoryIconPath(category) {
    return chrome.runtime.getURL(`data/block_icon/${category}_icon.svg`);
  }

  async function loadCurrentKeyStatus() {
    try {
      // Extension이 여전히 유효한지 확인
      if (!chrome.runtime?.id) {
        console.log("Extension context lost");
        return;
      }

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
      // Extension context가 무효화된 경우
      if (error.message.includes("Extension context invalidated")) {
        console.log("Extension이 업데이트되었습니다. 페이지를 새로고침하세요.");

        // 사용자에게 알림
        const modal = document.getElementById("api-key-modal");
        if (modal) {
          modal.innerHTML = `
          <div style="padding: 20px; text-align: center;">
            <h3>Extension 재시작 필요</h3>
            <p>페이지를 새로고침해주세요 (F5)</p>
          </div>
        `;
        }
        return;
      }
      console.error("키 상태 로드 실패:", error);
    }
  }

  // ===== 사이드바 생성 =====
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

    <!-- 사이드바 토글 트리거 버튼 -->
    <div id="sidebar-trigger" class="sidebar-trigger" title="AI 도우미 열기">
      <img src="${chrome.runtime.getURL("icon.png")}" class="trigger-icon" style="width: 28px; height: 28px;">
      <span class="trigger-badge" id="notification-badge" style="display: none;">!</span>
    </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
    return document.getElementById("entry-helper-sidebar");
  }

  // ===== 채팅 메시지 추가 함수 =====
  function addChatMessage(content, isBot = false, type = "text") {
    const messagesContainer = document.getElementById("chat-messages");
    if (!messagesContainer) return;

    const messageDiv = document.createElement("div");
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

    // HTML 응답인지 체크 (response 객체에서 responseType 확인)
    const isHTML = type === "html" || (typeof content === "string" && content.includes("style="));

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
    } else if (type === "block-with-image" || type === "html" || isHTML) {
      // HTML 타입은 그대로 표시 (카드 형태 유지)
      messageDiv.className = "message bot-message";
      messageDiv.innerHTML = `
      <div class="message-avatar">
        <img src="${chrome.runtime.getURL("icon.png")}" style="width:20px;height:20px;">
      </div>
      <div class="message-content" style="max-width: 100%;">
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
      // 일반 텍스트 메시지 (마크다운 변환)
      messageDiv.className = `message ${isBot ? "bot-message" : "user-message"}`;

      // 봇 메시지이고 텍스트인 경우 마크다운 변환
      let processedContent = content;
      if (isBot && typeof content === "string" && !content.includes("<div") && !content.includes("<span")) {
        processedContent = convertMarkdownToHTML(content);
      }

      messageDiv.innerHTML = `
      <div class="message-avatar">${
        isBot ? `<img src="${chrome.runtime.getURL("icon.png")}" style="width: 20px; height: 20px;">` : "👤"
      }</div>
      <div class="message-content">
        <div class="message-text">${processedContent}</div>
        <div class="message-time">${timeStr}</div>
      </div>
    `;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // 마크다운 변환 함수 추가
  function convertMarkdownToHTML(text) {
    if (!text || typeof text !== "string") return text;

    return (
      text
        // **굵은 텍스트**
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        // *기울임*
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        // `인라인 코드`
        .replace(/`([^`]+)`/g, '<code style="background: #f4f4f4; padding: 2px 4px; border-radius: 3px;">$1</code>')
        // 줄바꿈
        .replace(/\n/g, "<br>")
    );
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

    addChatMessage(cotHtml, true, "cot");

    setTimeout(() => {
      setupCoTEventListeners(cotId, cotSequence);
    }, 100);
  }

  // ===== CoT 이벤트 리스너 설정 =====
  function setupCoTEventListeners(cotId, cotSequence) {
    const cotElement = document.getElementById(cotId);
    if (!cotElement) {
      console.error("CoT element not found:", cotId);
      return;
    }

    let currentStep = 1;

    const stepHeaders = cotElement.querySelectorAll(".cot-step-toggle");
    stepHeaders.forEach((header) => {
      header.addEventListener("click", function () {
        const stepNum = parseInt(this.dataset.stepNum);
        toggleStepContent(cotElement, stepNum);
      });
    });

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

    const completeBtn = cotElement.querySelector(".cot-complete-step");
    if (completeBtn) {
      completeBtn.addEventListener("click", function () {
        markStepComplete(cotElement, currentStep);
        if (currentStep < cotSequence.totalSteps) {
          setTimeout(() => {
            currentStep++;
            navigateToStep(cotElement, currentStep, cotSequence.totalSteps);
          }, 500);
        }
      });
    }
  }

  function toggleStepContent(cotElement, stepNum) {
    const allContents = cotElement.querySelectorAll(".step-content");
    const allHeaders = cotElement.querySelectorAll(".cot-step-toggle");

    const targetContent = cotElement.querySelector(`[data-step-content="${stepNum}"]`);
    const targetHeader = cotElement.querySelector(`[data-step-num="${stepNum}"]`);

    if (!targetContent || !targetHeader) return;

    const isExpanded = targetContent.classList.contains("expanded");

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

  function navigateToStep(cotElement, stepNum, totalSteps) {
    toggleStepContent(cotElement, stepNum);

    const progressText = cotElement.querySelector(".current-step-text");
    if (progressText) {
      progressText.textContent = stepNum;
    }

    const prevBtn = cotElement.querySelector(".cot-nav-prev");
    const nextBtn = cotElement.querySelector(".cot-nav-next");

    if (prevBtn) prevBtn.disabled = stepNum === 1;
    if (nextBtn) nextBtn.disabled = stepNum === totalSteps;
  }

  function markStepComplete(cotElement, stepNum) {
    const stepContent = cotElement.querySelector(`[data-step-content="${stepNum}"]`);
    if (stepContent && !stepContent.innerHTML.includes("✓ 완료됨")) {
      const completeMarker = document.createElement("div");
      completeMarker.style.cssText = "margin-top: 8px; color: #4caf50; font-size: 12px;";
      completeMarker.textContent = "✓ 완료됨";
      stepContent.appendChild(completeMarker);
    }
  }

  // ===== 사이드바 토글 =====
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

  // ===== 메시지 전송 함수 =====
  async function sendMessage() {
    try {
      const chatInput = document.getElementById("chat-input");
      const userMessage = chatInput.value.trim();
      if (!userMessage) return;

      // 사용자 메시지 표시
      addChatMessage(userMessage, false);
      conversationHistory.push({ role: "user", content: userMessage });

      // 입력창 초기화
      chatInput.value = "";
      chatInput.style.height = "auto";

      // 타이핑 표시기
      const typingIndicator = document.getElementById("typing-indicator");
      if (typingIndicator) {
        typingIndicator.classList.remove("hidden");
      }

      // AI 응답 요청
      chrome.runtime.sendMessage(
        {
          action: "generateAIResponse",
          message: userMessage,
          conversationHistory: conversationHistory.slice(),
        },
        async (response) => {
          // Chrome runtime 에러 체크
          if (chrome.runtime.lastError) {
            console.error("Chrome runtime 오류:", chrome.runtime.lastError);
            if (typingIndicator) {
              typingIndicator.classList.add("hidden");
            }
            addChatMessage("연결 오류가 발생했어요. 확장 프로그램을 다시 로드해주세요!", true);
            return;
          }

          console.log("AI 응답 수신:", response);

          if (typingIndicator) {
            typingIndicator.classList.add("hidden");
          }

          if (response && response.success) {
            // 분류 타입 확인
            const classification = response.classification;
            console.log(`📊 응답 타입: ${classification?.type || "unknown"}`);
            console.log(`📊 response.type: ${response.type}`);

            // CoT 응답인 경우 특별 처리
            if (response.responseType === "cot" && response.cotSequence) {
              displayCoTResponse(response.cotSequence, response.response);
            } else if (response.responseType === "html") {
              // HTML 응답은 그대로 표시
              addChatMessage(response.response, true, "html");
            } else {
              // 일반 텍스트 (마크다운 변환 적용)
              addChatMessage(response.response, true, "text");
            }

            // 대화 기록 추가
            conversationHistory.push({ role: "assistant", content: response.response });

            // RAG 블록 표시 부분 - SimpleHandler가 이미 카드를 생성한 경우 스킵
            // response.type이 'simple-card'인 경우 추가 카드 생성하지 않음
            if (response.rawBlocks && response.rawBlocks.length > 0) {
              // SimpleHandler가 생성한 카드가 아닌 경우에만 블록 표시
              if (response.type !== "simple-card" && response.type !== "simple-detailed" && response.type !== "simple-notfound") {
                console.log("RAG 블록 표시 - type이 simple이 아님:", response.type);

                const attemptCount = conversationHistory.filter(
                  (msg) =>
                    msg.role === "user" &&
                    (msg.content.includes("모르겠") || msg.content.includes("막혔") || msg.content.includes("도와"))
                ).length;

                if (attemptCount >= 2) {
                  // 여러 번 막힌 경우 - 블록 리스트 표시
                  if (typeof window.createBlockListWithImages === "function") {
                    const blockListHtml = window.createBlockListWithImages(response.rawBlocks.slice(0, 3));
                    addChatMessage(blockListHtml, true, "block-with-image");
                  }
                }
              } else {
                console.log("RAG 블록 표시 스킵 - SimpleHandler가 이미 처리함");
              }
            }

            // 학습 진행상황 표시 (선택적)
            if (
              response.learnerProgress &&
              response.learnerProgress.progress > 0 &&
              typeof window.displayLearnerProgress === "function"
            ) {
              window.displayLearnerProgress(response.learnerProgress);
            }

            // 대화 기록 관리 - 최대 10개 유지
            if (conversationHistory.length > 10) {
              conversationHistory.splice(0, conversationHistory.length - 10);
            }
          } else {
            // 에러 처리
            const errorMsg = response?.error || "연결에 문제가 있어요. 다시 시도해주세요!";
            console.error("AI 응답 오류:", errorMsg);
            addChatMessage(`죄송해요, ${errorMsg}`, true);
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
  // ===== API 키 모달 표시 =====
  function showApiKeyModal() {
    // Extension 유효성 체크
    if (!chrome.runtime?.id) {
      alert("Extension이 업데이트되었습니다. 페이지를 새로고침해주세요.");
      location.reload();
      return;
    }
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

    const closeBtn = document.getElementById("modal-close-btn");
    const testBtn = document.getElementById("modal-test-btn");
    const saveBtn = document.getElementById("modal-save-btn");
    const keyInput = document.getElementById("modal-api-key");

    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        document.getElementById("api-key-modal").remove();
      });
    }

    if (testBtn) {
      testBtn.addEventListener("click", function () {
        window.testApiKeyFromModal();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        window.saveApiKeyFromModal();
      });
    }

    if (keyInput) {
      keyInput.addEventListener("focus", function () {
        this.style.borderColor = "#3b82f6";
      });

      keyInput.addEventListener("blur", function () {
        this.style.borderColor = "#e1e5e9";
      });

      keyInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          window.saveApiKeyFromModal();
        }
      });
    }

    try {
      loadCurrentKeyStatus();
    } catch (error) {
      console.log("키 상태 로드 건너뜀:", error);
    }
  }

  // ===== 이벤트 리스너 설정 =====
  function setupEventListeners() {
    const chatInput = document.getElementById("chat-input");
    const chatSend = document.getElementById("chat-send");

    let isComposing = false;

    // API 키 설정 버튼
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

    // 한국어 입력 조합 이벤트
    if (chatInput) {
      chatInput.addEventListener("compositionstart", () => {
        isComposing = true;
      });

      chatInput.addEventListener("compositionend", () => {
        isComposing = false;
      });

      chatInput.addEventListener("keydown", async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (!isComposing) {
            await sendMessage();
          }
        }
      });

      chatInput.addEventListener("input", () => {
        chatInput.style.height = "auto";
        chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + "px";
      });
    }

    if (chatSend) {
      chatSend.addEventListener("click", sendMessage);
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

    setTimeout(() => {
      if (!isEntryReady) {
        clearInterval(checkInterval);
        updateEntryStatus(false);
        console.log("⚠️ Entry 로드 타임아웃");
      }
    }, 30000);
  }

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

    const linkElement = document.createElement("link");
    linkElement.id = styleId;
    linkElement.rel = "stylesheet";
    linkElement.href = chrome.runtime.getURL("style.css");
    document.head.appendChild(linkElement);
  }

  // ===== 초기화 함수 =====
  function initializeChatbot() {
    if (isInitialized) return;

    try {
      console.log("챗봇 초기화 시작...");

      injectStyles();
      sidebar = createSidebar();

      if (!sidebar) {
        console.error("사이드바 생성 실패");
        return;
      }

      setupEventListeners();
      checkEntryReadiness();

      isInitialized = true;
      console.log("✅ 챗봇 초기화 완료");

      if (pendingOpenRequest) {
        toggleSidebarOpen(true);
        pendingOpenRequest = false;
      }
    } catch (error) {
      console.error("❌ 챗봇 초기화 실패:", error);
    }
  }

  // ===== 페이지 로드 완료 후 초기화 =====
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeChatbot);
  } else {
    setTimeout(initializeChatbot, 100);
  }

  // 전역 함수로 노출 (디버깅용)
  window.entryHelper = {
    toggleSidebar: toggleSidebarOpen,
    isReady: () => isEntryReady,
    reinitialize: () => {
      isInitialized = false;
      initializeChatbot();
    },
    addChatMessage: addChatMessage,
    getCategoryKorean: getCategoryKorean,
  };

  // Chrome extension 메시지 리스너
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "TOGGLE_SIDEBAR") {
      toggleSidebarOpen();
    }
  });
})();
