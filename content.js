(function () {
  "use strict";

  let isInitialized = false;
  let sidebar = null;
  let currentAnalysis = null;

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

  // Entry 객체를 사용하는 분석 (Entry가 없으면 메시지)
  function analyzeCurrentProject() {
    try {
      if (!isEntryReady || typeof Entry === "undefined" || !Entry.playground || !Entry.container) {
        return { error: "Entry가 아직 준비되지 않았습니다." };
      }

      const analysis = {
        objectCount: 0,
        currentObjectName: "없음",
        blocks: [],
        complexity: "알 수 없음",
      };

      const objects = Entry.container.getAllObjects?.() || [];
      analysis.objectCount = objects.length;

      const currentObject = Entry.playground.object;
      if (currentObject) {
        analysis.currentObjectName = currentObject.name || "이름없음";
        const getList = currentObject.script?.getBlockList;
        const blockList = typeof getList === "function" ? getList.call(currentObject.script) : [];
        analysis.blocks = blockList.slice(0, 5);
        const n = blockList.length;
        analysis.complexity = n > 10 ? "복잡함" : n > 3 ? "보통" : "간단함";
      }
      return analysis;
    } catch (e) {
      return { error: "분석 오류: " + e.message };
    }
  }

  // ===== 새로운 단일 레이아웃 사이드바 생성 =====
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
          <button id="sidebar-settings" class="control-btn" title="설정">⚙️</button>
          <button id="sidebar-pin" class="control-btn" title="고정">📌</button>
          <button id="sidebar-close" class="control-btn" title="닫기">✕</button>
        </div>
      </div>

      <!-- CoT 로그 영역 -->
      <div class="cot-log-section">
        <div class="section-title">
          <span class="title-icon">🧠</span>
          <span class="title-text">단계별 분석</span>
          <button id="analyze-refresh" class="refresh-btn" title="새로고침">🔄</button>
        </div>
        <div id="cot-log" class="cot-log">
          <div class="cot-placeholder">
            프로젝트를 분석하여 단계별 해결 방법을 제시해드릴게요!
          </div>
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
              <select id="chat-mode" class="chat-mode-select">
                <option value="auto">🎯 자동 모드</option>
                <option value="blocks">🧩 블록 도움</option>
                <option value="general">💬 일반 질문</option>
                <option value="debug">🔍 디버깅</option>
              </select>
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

  // ===== CoT 로그 업데이트 =====
  function updateCoTLog(analysis) {
    const cotLog = document.getElementById("cot-log");
    const statusIndicator = document.getElementById("entry-status");

    if (analysis.error) {
      cotLog.innerHTML = `
        <div class="cot-error">
          <div class="error-icon">❌</div>
          <div class="error-message">${analysis.error}</div>
        </div>
      `;
      statusIndicator.innerHTML = `
        <span class="status-dot error"></span>
        <span class="status-text">연결 오류</span>
      `;
      return;
    }

    // 상태 업데이트
    statusIndicator.innerHTML = `
      <span class="status-dot active"></span>
      <span class="status-text">분석 완료</span>
    `;

    // CoT 단계 생성
    const steps = generateCoTSteps(analysis);
    cotLog.innerHTML = steps
      .map(
        (step, index) => `
      <div class="cot-step" style="animation-delay: ${index * 0.1}s">
        <div class="step-header">
          <span class="step-number">${step.step}</span>
          <span class="step-title">${step.title}</span>
        </div>
        <div class="step-content">${step.content}</div>
        <div class="step-progress">
          <div class="progress-bar" style="width: ${step.progress || 100}%"></div>
        </div>
      </div>
    `
      )
      .join("");
  }

  function generateCoTSteps(analysis) {
    return [
      {
        step: 1,
        title: "🎯 현재 상황 파악",
        content: `오브젝트 '${analysis.currentObjectName}'를 분석했습니다. (복잡도: ${analysis.complexity})`,
        progress: 100,
      },
      {
        step: 2,
        title: "🧩 블록 구조 분석",
        content: `총 ${analysis.blocks.length}개의 블록으로 구성되어 있습니다.`,
        progress: 100,
      },
      {
        step: 3,
        title: "💡 개선점 도출",
        content:
          analysis.complexity === "복잡함"
            ? "코드를 함수나 반복문으로 정리하면 더 깔끔해집니다."
            : analysis.complexity === "보통"
            ? "조건문과 반복문을 활용해 기능을 확장해보세요."
            : "기본 구조가 잘 되어 있네요! 더 많은 기능을 추가해보세요.",
        progress: 80,
      },
      {
        step: 4,
        title: "🔧 다음 단계",
        content: "궁금한 점이 있으면 언제든 채팅으로 물어보세요!",
        progress: 60,
      },
    ];
  }

  // ===== UI 갱신 =====
  function performAnalysis() {
    const analysis = analyzeCurrentProject();
    updateCoTLog(analysis);
    currentAnalysis = analysis;
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
      performAnalysis();
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
    document.getElementById("sidebar-pin").addEventListener("click", () => {
      sidebar.classList.toggle("sidebar-pinned");
      const isPinned = sidebar.classList.contains("sidebar-pinned");
      document.getElementById("sidebar-pin").textContent = isPinned ? "📍" : "📌";
    });

    // 분석 새로고침
    document.getElementById("analyze-refresh").addEventListener("click", performAnalysis);

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

    // 자동 재분석 (핀 해제 상태에서만)
    setInterval(() => {
      if (sidebar.classList.contains("sidebar-open") && !sidebar.classList.contains("sidebar-pinned")) {
        performAnalysis();
      }
    }, 5000);

    // 페이지 컨텍스트에서 오는 ENTRY_READY 신호 수신
    window.addEventListener("message", (e) => {
      if (e?.data && e.data.__ENTRY_HELPER__ && e.data.type === "ENTRY_READY") {
        isEntryReady = true;
        document.getElementById("entry-status").innerHTML = `
          <span class="status-dot ready"></span>
          <span class="status-text">준비 완료</span>
        `;
        // 열려 있으면 즉시 분석
        if (sidebar.classList.contains("sidebar-open")) performAnalysis();
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
