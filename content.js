(function () {
  "use strict";

  let isInitialized = false;
  let sidebar = null;
  let conversationHistory = [];
  let pendingOpenRequest = false;
  let isEntryReady = false;
  let currentCoT = null;

  // 블록 렌더러 인스턴스 추가
  const blockRenderer = new EntryBlockRenderer();

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
          <!-- RAG 상태 표시 추가 -->
          <div class="rag-status" id="rag-status">
            <span class="status-dot" id="rag-status-dot"></span>
            <span class="status-text" id="rag-status-text">RAG 로딩 중...</span>
          </div>
        </div>
        <div class="sidebar-controls">
          <select id="chat-mode-header" class="mode-select" title="채팅 모드 선택">
            <option value="auto">🎯 자동 모드</option>
            <option value="blocks">🧩 블록 도움</option>
            <option value="general">💬 일반 질문</option>
            <option value="debug">🔍 디버깅</option>
          </select>
          <!-- RAG 토글 버튼 추가 -->
          <button id="rag-toggle" class="control-btn rag-btn" title="RAG 모드 전환">🧠</button>
          <button id="sidebar-settings" class="control-btn" title="설정">⚙️</button>
          <button id="sidebar-close" class="control-btn" title="닫기">✕</button>
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
                  네가 스스로 생각할 수 있도록 한 단계씩 질문할게! 🙂
                  
                  <br><br><small>💡 상단의 🧠 버튼으로 RAG 모드를 전환할 수 있어요!</small>
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

  // ===== 채팅 메시지 추가 함수 =====
  function addChatMessage(content, isBot = false, type = "text") {
    const messagesContainer = document.getElementById("chat-messages");
    if (!messagesContainer) return;

    const messageDiv = document.createElement("div");
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

    if (type === "block-with-image") {
      // 블록 이미지와 함께 표시하는 새로운 타입
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
    } else if (type === "image") {
      messageDiv.className = `message ${isBot ? "bot-message" : "user-message"}`;
      messageDiv.innerHTML = `
        <div class="message-avatar">
          ${isBot ? `<img src="${chrome.runtime.getURL("icon.png")}" style="width:20px;height:20px;">` : "👤"}
        </div>
        <div class="message-content">
          <img src="${content}" style="max-width:100%; max-height:200px; border-radius:8px; display:block;"/>
          <div class="message-time">${timeStr}</div>
        </div>
      `;
    } else if (type === "block-step") {
      // 블록 단계 메시지를 위한 새로운 타입
      messageDiv.className = "message bot-message";
      messageDiv.innerHTML = `
        <div class="message-avatar">
          <img src="${chrome.runtime.getURL("icon.png")}" style="width: 20px; height: 20px;">
        </div>
        <div class="message-content">
          ${content}
          <div class="message-time">${timeStr}</div>
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
      const displayInfo = block.displayInfo || {};
      const blockName = displayInfo.name || block.name || block.fileName || "알 수 없는 블록";
      const category = displayInfo.category || getCategoryKorean(block.category);
      const color = getCategoryColor(block.category);
      const hasImage = displayInfo.hasImage || block.hasImage;
      const imageUrl = displayInfo.imageUrl || block.imageUrl;

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
    `;

      // 블록 이미지 또는 대체 아이콘
      if (hasImage && imageUrl) {
        html += `
        <div style="
          width: 60px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
        ">
          <img src="${imageUrl}" 
               style="max-width: 100%; max-height: 100%; object-fit: contain;"
               onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;background:${color};opacity:0.2;display:flex;align-items:center;justify-content:center;color:${color};font-weight:bold;font-size:20px;\\'>📦</div>'"
               alt="${blockName}">
        </div>
      `;
      } else {
        // 이미지가 없을 때 카테고리 색상으로 대체 아이콘
        html += `
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
      `;
      }

      // 블록 정보
      html += `
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
  // ===== 블록 렌더링 이미지 함수 =====
  function renderBlockImage(scriptJSON) {
    return new Promise((resolve) => {
      window.postMessage({ __ENTRY_HELPER__: true, type: "RENDER_BLOCK", script: scriptJSON }, "*");

      function handler(e) {
        if (e?.data && e.data.__ENTRY_HELPER__ && e.data.type === "BLOCK_RENDERED") {
          window.removeEventListener("message", handler);
          resolve(e.data.dataUrl);
        }
      }
      window.addEventListener("message", handler);
    });
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

  function loadRAGStatus() {
    chrome.runtime.sendMessage({ action: "getSettings" }, async (response) => {
      if (response) {
        updateRAGStatus(response.ragEnabled);
      }
    });
  }

  // ===== 이벤트 설정 =====
  function setupEventListeners() {
    const chatInput = document.getElementById("chat-input");
    const chatSend = document.getElementById("chat-send");

    let isComposing = false;

    // RAG 토글 버튼 이벤트
    const ragToggleBtn = document.getElementById("rag-toggle");
    if (ragToggleBtn) {
      ragToggleBtn.addEventListener("click", () => {
        console.log("RAG 토글 이벤트 발생!");
        toggleRAGMode();
      });
      console.log("RAG 이벤트 리스너 연결 완료");
    } else {
      console.error("RAG 버튼을 찾을 수 없음");
    }

    // 사이드바 컨트롤
    document.getElementById("sidebar-trigger").addEventListener("click", () => toggleSidebarOpen());
    document.getElementById("sidebar-close").addEventListener("click", () => toggleSidebarOpen(false));

    // 메시지 전송 함수
    function sendMessage() {
      try {
        if (isComposing) {
          console.log("한국어 입력 조합 중이므로 전송 중지");
          return;
        }

        const message = chatInput.value.trim();
        if (!message) {
          console.log("빈 메시지는 전송하지 않음");
          return;
        }

        console.log("메시지 전송 시작:", message);
        addChatMessage(message, false);

        conversationHistory.push({ role: "user", content: message });

        chatInput.value = "";
        chatInput.style.height = "auto";

        const typingIndicator = document.getElementById("typing-indicator");
        if (typingIndicator) {
          typingIndicator.classList.remove("hidden");
        }

        const modeSelect = document.getElementById("chat-mode-header");
        const mode = modeSelect ? modeSelect.value : "auto";
        const projectContext = gatherProjectContext();

        console.log("Chrome runtime에 메시지 전송 중...");

        // 실제 AI API 호출
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
              addChatMessage(response.response, true);
              conversationHistory.push({ role: "assistant", content: response.response });


              conversationHistory.push({ role: "assistant", content: response.response });
              // 블록 이미지와 함께 표시 (개선된 버전)
              if (response.rawBlocks && response.rawBlocks.length > 0) {
                console.log("🎯 블록 이미지 표시:", response.rawBlocks);
                const blockListHtml = createBlockListWithImages(response.rawBlocks);
                addChatMessage(blockListHtml, true, "block-with-image");
              }
              if (conversationHistory.length > 10) {
                conversationHistory = conversationHistory.slice(-10);
              }

              // blockSequence가 있으면 엔트리 스타일 블록 이미지 표시
              // RAG 검색 결과 블록 리스트 표시 (새로 추가)
              if (response.rawBlocks && response.rawBlocks.length > 0) {
                console.log("🎯 RAG 블록 리스트 표시");
                const blockListSvg = blockRenderer.renderBlockList(response.rawBlocks);

                const blockListHtml = `
    <div style="background: #f8f9fa; border-radius: 8px; padding: 12px; margin: 8px 0;">
      <div style="font-size: 12px; color: #6c757d; margin-bottom: 8px;">📦 관련 블록들:</div>
      ${blockListSvg}
    </div>
  `;

                addChatMessage(blockListHtml, true, "block-step");
              }

              // 구조화된 블록 시퀀스 표시 (기존 코드 수정)
              if (response.blockSequence && response.blockSequence.blocks && response.blockSequence.blocks.length > 0) {
                console.log("🖼️ 블록 시퀀스 표시");
                try {
                  // blockRenderer 사용
                  const blockSvg = blockRenderer.renderBlocks(response.blockSequence.blocks);

                  const htmlContent = `
      <div class="block-step-container" style="
        background: #ffffff;
        border: 1px solid #dee2e6;
        border-radius: 12px;
        padding: 12px;
        margin: 8px 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      ">
        ${
          response.blockSequence.step
            ? `<h4 style="margin: 0 0 8px 0; color: #495057; font-size: 13px;">${response.blockSequence.step}단계: ${response.blockSequence.title}</h4>`
            : ""
        }
        ${blockSvg}
        ${
          response.blockSequence.nextHint
            ? `<p style="margin: 10px 0 0 0; color: #28a745; font-size: 12px; font-style: italic;">💡 ${response.blockSequence.nextHint}</p>`
            : ""
        }
      </div>
    `;

                  addChatMessage(htmlContent, true, "block-step");
                } catch (error) {
                  console.error("블록 이미지 생성 실패:", error);
                  addChatMessage(
                    `📦 필요한 블록들: ${response.blockSequence.blocks.map((b) => b.name || b.fileName).join(", ")}`,
                    true
                  );
                }
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

    // 한국어 입력 조합 이벤트 처리
    chatInput.addEventListener("compositionstart", () => {
      isComposing = true;
    });

    chatInput.addEventListener("compositionend", () => {
      isComposing = false;
    });

    // 버튼 클릭
    chatSend.addEventListener("click", () => {
      sendMessage();
    });

    // 키보드 이벤트
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        console.log("Enter 키 눌림, isComposing:", isComposing);

        if (!isComposing) {
          sendMessage();
        }
      }
    });

    // 자동 높이 조절
    chatInput.addEventListener("input", () => {
      chatInput.style.height = "auto";
      chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + "px";
    });

    // 페이지 컨텍스트에서 오는 ENTRY_READY 신호 수신
    window.addEventListener("message", (e) => {
      if (e?.data && e.data.__ENTRY_HELPER__ && e.data.type === "ENTRY_READY") {
        isEntryReady = true;
        const entryStatus = document.getElementById("entry-status");
        if (entryStatus) {
          entryStatus.innerHTML = `
          <span class="status-dot ready"></span>
          <span class="status-text">준비 완료</span>
        `;
        }
        testBlockRender();
      }
    });
  }

  // ===== 초기화 =====
  function initialize() {
    if (isInitialized) return;
    console.log("🤖 Entry Block Helper 시작...");

    sidebar = createSidebar();
    setupEventListeners();
    injectEntryProbe();

    loadRAGStatus();

    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
        if (response && !response.ragEnabled) {
          console.log("RAG가 비활성화 상태 - 자동으로 활성화합니다");
          toggleRAGMode();
        }
      });
    }, 1000);

    isInitialized = true;
    console.log("🚀 Entry Block Helper 초기화 완료");

    if (pendingOpenRequest) {
      const shouldOpen = pendingOpenRequest;
      pendingOpenRequest = false;
      toggleSidebarOpen(shouldOpen);
    }
  }

  // ===== 블록 이미지 렌더링 테스트 함수 =====
  async function testBlockRender() {
    const exampleScript = [["when_run_button_click", [], [["repeat_inf", [], [["move_direction", [10], []]]]]]];
    try {
      const url = await renderBlockImage(exampleScript);
      if (url) {
        addChatMessage("🎉 Entry 연결 완료! 블록 이미지를 생성할 수 있어요.", true, "system");
      } else {
        console.warn("블록 렌더링 실패");
      }
    } catch (error) {
      console.warn("블록 렌더링 테스트 오류:", error);
    }
  }

  // ===== 메시지 수신 (아이콘 클릭) - 중복 제거 =====
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "TOGGLE_SIDEBAR") {
      toggleSidebarOpen(true);
      sendResponse({ ok: true });
      return true;
    }

    // AI_RESPONSE는 sendMessage 함수의 콜백에서만 처리하도록 제거
  });

  // 카테고리별 색상 반환
  function getCategoryColor(category) {
    const colors = {
      start: "#4CAF50",
      moving: "#2196F3",
      looks: "#9C27B0",
      sound: "#FF9800",
      judgement: "#F44336",
      repeat: "#FF5722",
      variable: "#795548",
      func: "#607D8B",
      calc: "#009688",
      brush: "#E91E63",
      flow: "#3F51B5",
    };
    return colors[category] || "#757575";
  }

  // 카테고리 한국어 변환 (content script용)
  function getCategoryKorean(category) {
    const categoryMap = {
      start: "시작",
      moving: "움직임",
      looks: "모양",
      sound: "소리",
      judgement: "판단",
      repeat: "반복",
      variable: "변수",
      func: "함수",
      calc: "계산",
      brush: "붓",
      flow: "흐름",
    };
    return categoryMap[category] || category;
  }

  // 엔트리 실제 블록 스타일로 SVG 생성하는 새 함수 추가
  function generateEntryStyleBlockImage(stepData) {
    const { blocks, step, title, explanation } = stepData;

    const svgWidth = 280; // 320 -> 280으로 축소
    const svgHeight = Math.max(150, blocks.length * 50 + 60); // 간격도 조정

    let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: #ffffff; border-radius: 8px;">`;

    svg += `<rect width="100%" height="100%" fill="#ffffff" stroke="#e9ecef" stroke-width="1" rx="8"/>`;

    svg += `<text x="${
      svgWidth / 2
    }" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#495057">${step}단계: ${title}</text>`;

    blocks.forEach((block, index) => {
      const x = 20; // 30 -> 20으로 조정
      const y = 40 + index * 45; // 간격 축소

      svg += generateEntryStyleBlock(block, x, y, 240, 38); // 크기 조정

      if (index < blocks.length - 1) {
        const arrowY = y + 42;
        svg += `<path d="M${svgWidth / 2 - 5},${arrowY} L${svgWidth / 2},${arrowY + 8} L${svgWidth / 2 + 5},${arrowY} L${
          svgWidth / 2 + 3
        },${arrowY + 2} L${svgWidth / 2},${arrowY + 6} L${svgWidth / 2 - 3},${arrowY + 2} Z" fill="#6c757d"/>`;
      }
    });

    svg += `</svg>`;
    return svg;
  }

  // 엔트리 실제 블록 모양으로 그리는 함수 추가
  function generateEntryStyleBlock(block, x, y, width, height) {
    const entryColors = {
      start: "#4CAF50",
      moving: "#3F51B5",
      looks: "#9C27B0",
      sound: "#FF9800",
      judgement: "#F44336",
      repeat: "#FF5722",
      variable: "#795548",
      func: "#607D8B",
      calc: "#009688",
      brush: "#E91E63",
      flow: "#3F51B5",
    };

    const color = entryColors[block.category] || "#757575";
    const blockName = block.name || block.fileName || "Unknown Block";

    let blockSvg = "";

    if (block.category === "judgement") {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const r = height / 2 - 2;
      blockSvg += `<polygon points="${cx - r},${cy} ${cx - r / 2},${cy - r} ${cx + r / 2},${cy - r} ${cx + r},${cy} ${
        cx + r / 2
      },${cy + r} ${cx - r / 2},${cy + r}" fill="${color}" stroke="${color}" stroke-width="2"/>`;
    } else if (block.category === "calc") {
      blockSvg += `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${
        height / 2
      }" fill="${color}" stroke="${color}" stroke-width="2"/>`;
    } else if (block.category === "flow" && block.fileName === "_if") {
      blockSvg += `<path d="M${x + width} ${y + 5} L${x + 15} ${y + 5} L${x + 5} ${y + 15} L${x + 5} ${y + height - 15} L${
        x + 15
      } ${y + height - 5} L${x + width} ${y + height - 5} L${x + width - 10} ${y + height - 15} L${x + 20} ${y + height - 15} L${
        x + 20
      } ${y + 15} L${x + width - 10} ${y + 15} Z" fill="${color}" stroke="${color}" stroke-width="1"/>`;
    } else {
      blockSvg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}" stroke="${color}" stroke-width="2" rx="12" ry="12"/>`;
      blockSvg += `<rect x="${x - 3}" y="${y + height / 2 - 5}" width="6" height="10" fill="${color}"/>`;
      blockSvg += `<rect x="${x + width - 3}" y="${y + height / 2 - 5}" width="6" height="10" fill="${color}"/>`;
    }

    let displayText = blockName;
    if (displayText.length > 20) {
      displayText = displayText.substring(0, 17) + "...";
    }

    const textX = x + width / 2;
    const textY = y + height / 2 + 5;

    blockSvg += `<text x="${textX}" y="${textY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="white" font-weight="bold">${displayText}</text>`;

    return blockSvg;
  }
// content.js에 추가할 함수들
// 기존 코드 아래에 이 함수들을 추가하세요

// ===== 카테고리 관련 새로운 함수들 =====

// 카테고리 아이콘 경로 매핑
function getCategoryIconPath(category) {
  const iconPath = chrome.runtime.getURL(`data/block_icon/${category}_icon.svg`);
  return iconPath;
}

// 카테고리 아이콘 가져오기 (SVG 우선, 실패시 이모지 폴백)
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
    start: '🚩',
    flow: '🔄',
    moving: '🏃',
    looks: '🎨',
    brush: '🖌️',
    sound: '🔊',
    judgement: '❓',
    calc: '🔢',
    variable: '📦',
    func: '⚙️'
  };
  
  return `<span style="font-size: 24px;">${emojiIcons[category] || '📦'}</span>`;
}

// 카테고리 카드 생성 함수 (새로 추가)
async function createCategoryCards(blocks) {
  if (!blocks || blocks.length === 0) return "";

  // 카테고리별로 그룹화
  const blocksByCategory = {};
  blocks.forEach(block => {
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

// 카테고리 상세 표시 함수
window.showCategoryDetails = async function(category) {
  const categoryName = getCategoryKorean(category);
  const iconElement = await getCategoryIconElement(category);
  const color = getCategoryColor(category);
  
  const detailHTML = `
    <div style="
      background: linear-gradient(135deg, ${color}10, ${color}05);
      border-left: 4px solid ${color};
      border-radius: 8px;
      padding: 12px 16px;
      margin: 8px 0;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      ">
        ${iconElement}
        <span style="
          font-weight: 700;
          color: ${color};
          font-size: 14px;
        ">${categoryName} 카테고리</span>
      </div>
      <div style="
        font-size: 12px;
        color: #495057;
        line-height: 1.5;
      ">
        이 카테고리에서 필요한 블록을 찾아보세요! 블록 팔레트에서 ${categoryName} 탭을 클릭하면 관련 블록들을 볼 수 있어요.
      </div>
    </div>
  `;
  
  addChatMessage(detailHTML, true, "block-with-image");
};

// 아이콘 사전 로드 함수
async function preloadCategoryIcons() {
  const categories = ['start', 'flow', 'moving', 'looks', 'brush', 'sound', 'judgement', 'calc', 'variable', 'func'];
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
  
  console.log('로드된 아이콘:', loadedIcons);
  return loadedIcons;
}

// ===== sendMessage 함수 수정 부분 =====
// 기존 sendMessage 함수에서 이 부분을 찾아서 수정하세요:

// response 처리 부분에서
if (response && response.success) {
  // AI 텍스트 응답 표시
  addChatMessage(response.response, true);
  conversationHistory.push({ role: "assistant", content: response.response });

  // 대화 횟수에 따라 다른 UI 표시
  const attemptCount = conversationHistory.filter(
    (msg) => msg.role === "user" && 
    (msg.content.includes("모르겠") || msg.content.includes("막혔") || msg.content.includes("도와"))
  ).length;

  if (response.rawBlocks && response.rawBlocks.length > 0) {
    if (attemptCount <= 1) {
      // 처음에는 카테고리만 표시
      console.log("📂 카테고리 카드 표시");
      const categoryCards = await createCategoryCards(response.rawBlocks); // await 추가
      addChatMessage(categoryCards, true, "block-with-image");
    } else {
      // 여러 번 시도 후에는 구체적인 블록 표시
      console.log("🎯 구체적인 블록 표시");
      const blockListHtml = createBlockListWithImages(response.rawBlocks);
      addChatMessage(blockListHtml, true, "block-with-image");
    }
  }
}

// ===== initialize 함수 수정 부분 =====
// 기존 initialize 함수에 아이콘 사전 로드 추가:

function initialize() {
  if (isInitialized) return;
  console.log("🤖 Entry Block Helper 시작...");

  sidebar = createSidebar();
  setupEventListeners();
  injectEntryProbe();
  
  // 아이콘 사전 로드 추가
  preloadCategoryIcons().then(icons => {
    console.log('카테고리 아이콘 준비 완료:', Object.keys(icons).length + '개');
  });

  loadRAGStatus();

  // ... 나머지 코드
}
  function displayEntryBlockImageInChat(blocks, stepData) {
    console.log("🖼️ 엔트리 스타일 블록 이미지 표시");

    // blockRenderer 사용하여 SVG 생성
    const svgContent = blockRenderer.renderBlocks(stepData || blocks);

    const htmlContent = `
    <div class="block-step-container" style="
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 12px;
      padding: 12px;
      margin: 8px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      max-width: 100%;
      overflow: hidden;
    ">
      ${
        stepData
          ? `<h4 style="margin: 0 0 8px 0; color: #495057; font-size: 13px;">${stepData.step}단계: ${stepData.title}</h4>`
          : ""
      }
      ${
        stepData?.explanation
          ? `<p style="margin: 0 0 10px 0; color: #6c757d; font-size: 12px; line-height: 1.4;">${stepData.explanation}</p>`
          : ""
      }
      <div style="text-align: center; overflow-x: auto; overflow-y: hidden;">
        <div style="display: inline-block; max-width: 100%;">${svgContent}</div>
      </div>
      ${
        stepData?.nextHint
          ? `<p style="margin: 10px 0 0 0; color: #28a745; font-size: 12px; font-style: italic;">💡 ${stepData.nextHint}</p>`
          : ""
      }
    </div>
  `;

    addChatMessage(htmlContent, true, "block-step");
    console.log("✅ 엔트리 스타일 블록 이미지 표시 완료");
  }

  // DOM 준비 즉시 초기화
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
