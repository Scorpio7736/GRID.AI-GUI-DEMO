"use strict";

/*
 * GRID.AI Connect workspace interactions.
 * Everything is intentionally in memory: panel widths and conversation
 * ordering reset on refresh, just like the rest of this demo.
 */
(function initializeWorkspaceUi() {
  const app = document.getElementById("app");
  const leftHandle = document.getElementById("sidebarResizer");
  const rightHandle = document.getElementById("inspectorResizer");
  const list = document.getElementById("chatList");
  if (!app || !leftHandle || !rightHandle || !list) return;

  const MIN_SIDEBAR = 210;
  const MAX_SIDEBAR = 430;
  const MIN_INSPECTOR = 235;
  const MAX_INSPECTOR = 460;
  const MIN_MAIN = 370;

  let sidebarWidth = 275;
  let inspectorWidth = 290;
  let resizing = null;
  let draggedChatId = null;

  // Hover details are deliberately delayed: a passing cursor must not expand
  // conversations. CSS only opens summaries with .summary-open or keyboard focus.
  const SUMMARY_HOVER_DELAY_MS = 3000;
  let hoveredConversation = null;
  let summaryHoverTimer = null;

  function closeConversationSummary() {
    if (summaryHoverTimer !== null) {
      clearTimeout(summaryHoverTimer);
      summaryHoverTimer = null;
    }
    hoveredConversation?.classList.remove("summary-open");
    hoveredConversation = null;
  }

  list.addEventListener("pointerover", event => {
    if (event.pointerType === "touch") return;
    const entry = event.target.closest(".chat-entry");
    if (!entry || entry === hoveredConversation) return;
    closeConversationSummary();
    hoveredConversation = entry;
    summaryHoverTimer = setTimeout(() => {
      summaryHoverTimer = null;
      if (hoveredConversation === entry &&
          entry.isConnected &&
          entry.matches(":hover") &&
          !app.classList.contains("dragging-chat")) {
        entry.classList.add("summary-open");
      }
    }, SUMMARY_HOVER_DELAY_MS);
  });

  list.addEventListener("pointerout", event => {
    const entry = event.target.closest(".chat-entry");
    if (!entry || entry !== hoveredConversation) return;
    if (event.relatedTarget && entry.contains(event.relatedTarget)) return;
    closeConversationSummary();
  });

  list.addEventListener("dragstart", closeConversationSummary, true);

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function isDesktopInspector() {
    return window.matchMedia("(min-width: 1151px)").matches &&
      !app.classList.contains("inspector-collapsed");
  }

  function isInspectorResizable() {
    return window.innerWidth > 700 && (
      isDesktopInspector() ||
      (window.innerWidth <= 1150 && app.classList.contains("show-inspector"))
    );
  }

  function maxSidebarWidth() {
    const inspector = isDesktopInspector() ? inspectorWidth : 0;
    return Math.max(MIN_SIDEBAR,
      Math.min(MAX_SIDEBAR, window.innerWidth - inspector - MIN_MAIN));
  }

  function maxInspectorWidth() {
    if (window.innerWidth <= 1150) {
      return Math.max(MIN_INSPECTOR,
        Math.min(MAX_INSPECTOR, Math.floor(window.innerWidth * 0.9)));
    }
    return Math.max(MIN_INSPECTOR,
      Math.min(MAX_INSPECTOR, window.innerWidth - sidebarWidth - MIN_MAIN));
  }

  function applyWidths() {
    sidebarWidth = clamp(sidebarWidth, MIN_SIDEBAR, maxSidebarWidth());
    inspectorWidth = clamp(inspectorWidth, MIN_INSPECTOR, maxInspectorWidth());
    app.style.setProperty("--sidebar-width", sidebarWidth + "px");
    app.style.setProperty("--inspector-width", inspectorWidth + "px");
    leftHandle.setAttribute("aria-valuenow", String(sidebarWidth));
    leftHandle.setAttribute("aria-valuemax", String(maxSidebarWidth()));
    rightHandle.setAttribute("aria-valuenow", String(inspectorWidth));
    rightHandle.setAttribute("aria-valuemax", String(maxInspectorWidth()));
    leftHandle.title = "Conversations: " + sidebarWidth + "px · Drag or use arrow keys";
    rightHandle.title = "Session details: " + inspectorWidth + "px · Drag or use arrow keys";
  }

  function startResize(which, event) {
    if (event.button !== 0) return;
    if (which === "right" && !isInspectorResizable()) return;
    if (which === "left" && window.innerWidth <= 700) return;
    event.preventDefault();
    resizing = which;
    app.classList.add("is-resizing");
    (which === "left" ? leftHandle : rightHandle).classList.add("active");
  }

  function resizeFromPointer(clientX) {
    if (resizing === "left") {
      sidebarWidth = clamp(Math.round(clientX), MIN_SIDEBAR, maxSidebarWidth());
    } else if (resizing === "right") {
      inspectorWidth = clamp(Math.round(window.innerWidth - clientX),
        MIN_INSPECTOR, maxInspectorWidth());
    }
    applyWidths();
  }

  function stopResize() {
    if (!resizing) return;
    resizing = null;
    app.classList.remove("is-resizing");
    leftHandle.classList.remove("active");
    rightHandle.classList.remove("active");
  }

  leftHandle.addEventListener("pointerdown", event => startResize("left", event));
  rightHandle.addEventListener("pointerdown", event => startResize("right", event));

  window.addEventListener("pointermove", event => {
    if (!resizing) return;
    event.preventDefault();
    resizeFromPointer(event.clientX);
  }, { passive: false });

  window.addEventListener("pointerup", stopResize);
  window.addEventListener("pointercancel", stopResize);
  window.addEventListener("blur", stopResize);

  function resizeWithKeys(which, event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (which === "right" && !isInspectorResizable()) return;
    if (which === "left" && window.innerWidth <= 700) return;
    event.preventDefault();

    const amount = event.shiftKey ? 25 : 10;
    const rightward = event.key === "ArrowRight" ? 1 : -1;
    if (which === "left") {
      sidebarWidth += rightward * amount;
    } else {
      inspectorWidth -= rightward * amount;
    }
    applyWidths();
  }

  leftHandle.addEventListener("keydown", event => resizeWithKeys("left", event));
  rightHandle.addEventListener("keydown", event => resizeWithKeys("right", event));
  window.addEventListener("resize", applyWidths);
  applyWidths();

  // Keep the user-chosen order in state.chats. Rendering and searching read
  // that array without re-sorting by activity.
  function reorderConversation(sourceId, targetId, position) {
    if (sourceId === targetId) return false;
    const moved = state.chats.find(chat => chat.id === sourceId);
    if (!moved || !state.chats.some(chat => chat.id === targetId)) return false;

    const reordered = state.chats.filter(chat => chat.id !== sourceId);
    const targetIndex = reordered.findIndex(chat => chat.id === targetId);
    reordered.splice(targetIndex + (position === "after" ? 1 : 0), 0, moved);
    state.chats = reordered;
    state.openMenuId = null;
    return true;
  }

  function clearDropMarkers() {
    list.querySelectorAll(".drop-before, .drop-after").forEach(entry => {
      entry.classList.remove("drop-before", "drop-after");
    });
  }

  function finishChatDrag() {
    draggedChatId = null;
    app.classList.remove("dragging-chat");
    clearDropMarkers();
    list.querySelectorAll(".is-dragging").forEach(entry =>
      entry.classList.remove("is-dragging"));
  }

  list.addEventListener("dragstart", event => {
    const handle = event.target.closest("[data-chat-grip]");
    if (!handle) {
      event.preventDefault();
      return;
    }

    const id = Number(handle.dataset.chatGrip);
    if (!findChat(id)) {
      event.preventDefault();
      return;
    }

    draggedChatId = id;
    app.classList.add("dragging-chat");
    handle.closest(".chat-entry")?.classList.add("is-dragging");

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(id));
    }
  });

  list.addEventListener("dragover", event => {
    if (draggedChatId === null) return;
    const entry = event.target.closest(".chat-entry");
    clearDropMarkers();
    if (!entry) return;

    const targetId = Number(entry.dataset.entryId);
    if (targetId === draggedChatId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";

    const bounds = entry.getBoundingClientRect();
    const position = event.clientY < bounds.top + bounds.height / 2
      ? "before" : "after";
    entry.classList.add(position === "before" ? "drop-before" : "drop-after");
  });

  list.addEventListener("drop", event => {
    if (draggedChatId === null) return;
    event.preventDefault();

    const entry = event.target.closest(".chat-entry");
    const targetId = entry ? Number(entry.dataset.entryId) : null;
    const position = entry?.classList.contains("drop-after") ? "after" : "before";
    const sourceId = draggedChatId;

    finishChatDrag();
    if (targetId !== null && reorderConversation(sourceId, targetId, position)) {
      closeConversationSummary();
      renderChatList();
    }
  });

  list.addEventListener("dragend", finishChatDrag);

  // Keyboard alternative: focus the grip, then press Arrow Up / Arrow Down.
  list.addEventListener("keydown", event => {
    const handle = event.target.closest("[data-chat-grip]");
    if (!handle || !["ArrowUp", "ArrowDown"].includes(event.key)) return;

    const visibleIds = Array.from(list.querySelectorAll(".chat-entry"))
      .map(entry => Number(entry.dataset.entryId));
    const sourceId = Number(handle.dataset.chatGrip);
    const index = visibleIds.indexOf(sourceId);
    const nextIndex = index + (event.key === "ArrowUp" ? -1 : 1);
    if (index < 0 || nextIndex < 0 || nextIndex >= visibleIds.length) return;

    event.preventDefault();
    const targetId = visibleIds[nextIndex];
    const position = nextIndex < index ? "before" : "after";
    if (reorderConversation(sourceId, targetId, position)) {
      closeConversationSummary();
      renderChatList();
      list.querySelector('[data-chat-grip="' + sourceId + '"]')
        ?.focus({ preventScroll: true });
    }
  });
})();
