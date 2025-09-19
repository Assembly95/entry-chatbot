(function () {
  "use strict";

  let isInitialized = false;
  let sidebar = null;
  let conversationHistory = [];
  let pendingOpenRequest = false;
  let isEntryReady = false;
  let currentCoT = null;

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

    if (type === "system") {
      messageDiv.className = "message system-message";
      messageDiv.innerHTML = `
        <div class="message-content system-message-content">
          <div class="message-text">${content}</div>
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
    chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
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
          (response) => {
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
              console.log("🔨 Content에서 받은 전체 응답:", response);

              // 여기서 직접 메시지 추가 (중복 방지)
              addChatMessage(response.response, true);

              conversationHistory.push({ role: "assistant", content: response.response });

              if (conversationHistory.length > 10) {
                conversationHistory = conversationHistory.slice(-10);
              }

              // blockSequence가 있으면 엔트리 스타일 블록 이미지 표시
              if (response.blockSequence && response.blockSequence.blocks && response.blockSequence.blocks.length > 0) {
                console.log("🖼️ 엔트리 스타일 블록 이미지 생성");
                try {
                  const entryStyleSvg = generateEntryStyleBlockImage(response.blockSequence);
                  displayEntryBlockImageInChat(entryStyleSvg, response.blockSequence);
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

  // 기존 chat-messages 영역에 블록 이미지 표시하는 함수 추가
  function displayEntryBlockImageInChat(svgContent, blockSequence) {
    console.log("🖼️ 엔트리 스타일 블록 이미지 표시");

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
        <h4 style="margin: 0 0 8px 0; color: #495057; font-size: 13px;">${blockSequence.step}단계: ${blockSequence.title}</h4>
        ${
          blockSequence.explanation
            ? `<p style="margin: 0 0 10px 0; color: #6c757d; font-size: 12px; line-height: 1.4;">${blockSequence.explanation}</p>`
            : ""
        }
        <div style="text-align: center; overflow-x: auto; overflow-y: hidden;">
          <div style="display: inline-block; max-width: 100%;">${svgContent}</div>
        </div>
        ${
          blockSequence.nextHint
            ? `<p style="margin: 10px 0 0 0; color: #28a745; font-size: 12px; font-style: italic;">💡 ${blockSequence.nextHint}</p>`
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
