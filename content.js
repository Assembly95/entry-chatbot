(function () {
  "use strict";

  let isInitialized = false;
  let sidebar = null;
  let conversationHistory = []; // 대화 기록 저장

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
    const messageDiv = document.createElement("div");

    const now = new Date();
    const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

    // 시스템 메시지 타입 추가
    if (type === "system") {
      messageDiv.className = "message system-message";
      messageDiv.innerHTML = `
        <div class="message-content system-message-content">
          <div class="message-text">${content}</div>
        </div>
      `;
    } else {
      messageDiv.className = `message ${isBot ? "bot-message" : "user-message"}`;

      if (type === "analysis") {
        messageDiv.innerHTML = `
          <div class="message-avatar">${
            isBot ? `<img src="${chrome.runtime.getURL("icon.png")}" style="width: 20px; height: 20px;">` : "👤"
          }</div>
          <div class="message-content analysis-message">
            ${content}
            <div class="message-time">${timeStr}</div>
          </div>
        `;
      } else {
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

  // ===== Entry 프로젝트 컨텍스트 수집 =====
  function gatherProjectContext() {
    try {
      if (!isEntryReady || typeof Entry === "undefined" || !Entry.playground || !Entry.container) {
        return "Entry가 아직 준비되지 않았습니다.";
      }

      const context = [];

      // 현재 오브젝트 정보
      const currentObject = Entry.playground.object;
      if (currentObject) {
        context.push(`현재 오브젝트: ${currentObject.name || "이름없음"}`);

        // 블록 정보
        const getList = currentObject.script?.getBlockList;
        if (typeof getList === "function") {
          const blockList = getList.call(currentObject.script);
          const blockCount = blockList.length;
          context.push(`사용된 블록 수: ${blockCount}개`);

          if (blockCount > 0) {
            // 주요 블록 타입들 (처음 3개만)
            const blockTypes = blockList.slice(0, 3).map((block) => block?.type || "알 수 없는 블록");
            context.push(`주요 블록들: ${blockTypes.join(", ")}`);
          }

          // 복잡도
          const complexity = blockCount > 10 ? "복잡함" : blockCount > 3 ? "보통" : "간단함";
          context.push(`복잡도: ${complexity}`);
        }
      }

      // 전체 오브젝트 수
      const objects = Entry.container.getAllObjects?.() || [];
      context.push(`총 오브젝트 수: ${objects.length}개`);

      return context.join(" | ");
    } catch (e) {
      return `컨텍스트 수집 오류: ${e.message}`;
    }
  }

  async function toggleRAGMode() {
    try {
      console.log("RAG 모드 토글 시작");

      chrome.runtime.sendMessage({ action: "toggleRAG" }, (response) => {
        // Chrome runtime 에러 체크
        if (chrome.runtime.lastError) {
          console.error("RAG 토글 Chrome runtime 에러:", chrome.runtime.lastError);
          addChatMessage("RAG 모드 변경 중 오류가 발생했어요.", true, "system");
          return;
        }

        console.log("RAG 토글 응답:", response);

        if (response && response.success) {
          updateRAGStatus(response.ragEnabled);

          // 사용자에게 알림 메시지 추가
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

    // 한국어 입력 상태 추적 - 함수 스코프 밖으로 이동
    let isComposing = false;

    // RAG 토글 버튼 이벤트 추가 - 에러 처리 강화
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

    // 메시지 전송 함수 - 에러 처리 강화
    function sendMessage() {
      try {
        // 조합 중일 때는 전송하지 않음
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

        // 사용자 메시지를 대화 기록에 추가
        conversationHistory.push({ role: "user", content: message });

        chatInput.value = "";
        chatInput.style.height = "auto";

        // 타이핑 인디케이터 표시
        const typingIndicator = document.getElementById("typing-indicator");
        if (typingIndicator) {
          typingIndicator.classList.remove("hidden");
        }

        // 현재 선택된 모드 가져오기
        const modeSelect = document.getElementById("chat-mode-header");
        const mode = modeSelect ? modeSelect.value : "auto";

        // Entry 프로젝트 컨텍스트 수집
        const projectContext =
          typeof gatherProjectContext === "function" ? gatherProjectContext() : "컨텍스트 함수를 찾을 수 없습니다.";

        console.log("Chrome runtime에 메시지 전송 중...");

        // 실제 AI API 호출 (대화 기록 포함) - 에러 처리 강화
        chrome.runtime.sendMessage(
          {
            action: "generateAIResponse",
            message: message,
            mode: mode,
            projectContext: projectContext,
            conversationHistory: conversationHistory.slice(), // 복사본 전송
          },
          (response) => {
            console.log("AI 응답 수신:", response);

            // 타이핑 인디케이터 숨기기
            if (typingIndicator) {
              typingIndicator.classList.add("hidden");
            }

            // Chrome runtime 에러 체크
            if (chrome.runtime.lastError) {
              console.error("Chrome runtime 에러:", chrome.runtime.lastError);
              addChatMessage("연결 오류가 발생했어요. 확장 프로그램을 다시 로드해주세요!", true);
              return;
            }

            if (response && response.success) {
              addChatMessage(response.response, true);

              // AI 응답을 대화 기록에 추가
              conversationHistory.push({ role: "assistant", content: response.response });

              // 대화 기록이 너무 길면 오래된 것 삭제 (최근 10개만 유지)
              if (conversationHistory.length > 10) {
                conversationHistory = conversationHistory.slice(-10);
              }
            } else {
              const errorMessage = response?.error || "연결에 문제가 있어요. 다시 시도해주세요!";
              console.error("AI 응답 에러:", errorMessage);
              addChatMessage(`죄송해요, ${errorMessage}`, true);
            }
          }
        );
      } catch (error) {
        console.error("sendMessage 함수 에러:", error);

        // addChatMessage가 정의되어 있는지 확인 후 호출
        if (typeof addChatMessage === "function") {
          addChatMessage("메시지 전송 중 오류가 발생했어요.", true);
        } else {
          console.error("addChatMessage 함수를 찾을 수 없습니다.");
        }

        // 타이핑 인디케이터 숨기기 - 안전하게 처리
        const typingIndicator = document.getElementById("typing-indicator");
        if (typingIndicator) {
          typingIndicator.classList.add("hidden");
        }
      }
    }

    // 한국어 입력 조합 이벤트 처리 - 에러 처리 추가
    chatInput.addEventListener("compositionstart", () => {
      console.log("한국어 입력 조합 시작");
      isComposing = true;
    });

    chatInput.addEventListener("compositionend", () => {
      console.log("한국어 입력 조합 종료");
      isComposing = false;
    });

    // 버튼 클릭
    chatSend.addEventListener("click", () => {
      console.log("전송 버튼 클릭됨");
      sendMessage();
    });

    // 키보드 이벤트 (수정된 부분) - 에러 처리 강화
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        console.log("Enter 키 눌림, isComposing:", isComposing);

        // 조합 중이 아닐 때만 전송
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

    // RAG 상태 로드 후 자동으로 활성화
    loadRAGStatus();

    // 1초 후에 RAG가 비활성화되어 있으면 자동으로 켜기
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
        if (response && !response.ragEnabled) {
          console.log("RAG가 비활성화 상태 - 자동으로 활성화합니다");
          toggleRAGMode(); // 자동으로 RAG 켜기
        }
      });
    }, 1000);

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
