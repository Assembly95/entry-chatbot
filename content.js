(function () {
  "use strict";

  let isInitialized = false;
  let sidebar = null;

  // 아이콘 클릭이 초기화 전에 오면 기억해뒀다가 자동으로 열기
  let pendingOpenRequest = false;

  // ===== 엔트리 준비 플래그 =====
  let isEntryReady = false;

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
          <h3>🤖 AI 블록 도우미</h3>
          <div class="status-indicator" id="entry-status">
            <span class="status-dot"></span>
            <span class="status-text">준비 중...</span>
          </div>
        </div>
        <div class="sidebar-controls">
          <select id="chat-mode-header" class="mode-select" title="채팅 모드 선택">
            <option value="auto">🎯 자동 모드</option>
            <option value="blocks">🧩 블록 도움</option>
            <option value="general">💬 일반 질문</option>
            <option value="debug">🔍 디버깅</option>
          </select>
          <button id="sidebar-settings" class="control-btn" title="설정">⚙️</button>
          <button id="sidebar-close" class="control-btn" title="닫기">✕</button>
        </div>
      </div>

      <!-- 채팅 영역 -->
      <div class="chat-section">
        <div class="chat-container">
          <div id="chat-messages" class="chat-messages">
            <div class="message bot-message">
              <div class="message-avatar">🤖</div>
              <div class="message-content">
                <div class="message-text">
                  안녕! 무엇을 만들고 싶니? 정답을 바로 알려주지 않고, 
                  네가 스스로 생각할 수 있도록 한 단계씩 질문할게! 🙂
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
      <span class="trigger-icon">🤖</span>
      <span class="trigger-badge" id="notification-badge" style="display: none;">!</span>
    </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
    return document.getElementById("entry-helper-sidebar");
  }

  // ===== 채팅 메시지 추가 함수 =====
  function addChatMessage(content, isBot = false, type = "text") {
    const messagesContainer = document.getElementById("chat-messages");
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isBot ? "bot-message" : "user-message"}`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

    if (type === "analysis") {
      messageDiv.innerHTML = `
        <div class="message-avatar">${isBot ? "🤖" : "👤"}</div>
        <div class="message-content analysis-message">
          ${content}
          <div class="message-time">${timeStr}</div>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="message-avatar">${isBot ? "🤖" : "👤"}</div>
        <div class="message-content">
          <div class="message-text">${content}</div>
          <div class="message-time">${timeStr}</div>
        </div>
      `;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

  // ===== 이벤트 설정 =====
  function setupEventListeners() {
    const chatInput = document.getElementById("chat-input");
    const chatSend = document.getElementById("chat-send");

    // 사이드바 컨트롤
    document.getElementById("sidebar-trigger").addEventListener("click", () => toggleSidebarOpen());
    document.getElementById("sidebar-close").addEventListener("click", () => toggleSidebarOpen(false));

    // 채팅 입력
    function sendMessage() {
      const message = chatInput.value.trim();
      if (!message) return;

      addChatMessage(message, false);
      chatInput.value = "";
      chatInput.style.height = "auto";

      // 타이핑 인디케이터 표시
      document.getElementById("typing-indicator").classList.remove("hidden");

      // Mock AI 응답 (나중에 실제 AI로 대체)
      setTimeout(() => {
        document.getElementById("typing-indicator").classList.add("hidden");

        const responses = [
          "좋은 질문이네요! 어떤 부분이 어려우신가요?",
          "그 문제를 해결하기 위해 먼저 어떤 블록들을 사용해봤나요?",
          "단계별로 접근해봅시다. 먼저 무엇부터 시작하면 좋을까요?",
          "현재 코드에서 어떤 결과가 나오고 있나요?",
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addChatMessage(randomResponse, true);
      }, 1000 + Math.random() * 2000);
    }

    chatSend.addEventListener("click", sendMessage);
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
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
        document.getElementById("entry-status").innerHTML = `
          <span class="status-dot ready"></span>
          <span class="status-text">준비 완료</span>
        `;
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

    isInitialized = true;
    console.log("🚀 Entry Block Helper 초기화 완료");

    // 아이콘 클릭이 먼저 왔다면 지금 연다
    if (pendingOpenRequest) {
      const shouldOpen = pendingOpenRequest;
      pendingOpenRequest = false;
      toggleSidebarOpen(shouldOpen);
    }
  }

  // ===== 메시지 수신 (아이콘 클릭) =====
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "TOGGLE_SIDEBAR") {
      toggleSidebarOpen(true);
      sendResponse({ ok: true });
    }
  });

  // DOM 준비 즉시 초기화
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
