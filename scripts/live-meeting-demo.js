"use strict";

/* GRID.AI Connect: UI-only Teams-inspired live meeting mode.
   Converts the presentation of an existing chat, never its transcript, scope
   or participant authorization. No camera/mic/voice/network APIs are used. */
(function () {
  const get = id => document.getElementById(id);
  const stage = get("liveMeetingStage");
  const grid = get("liveParticipantGrid");
  const title = get("liveMeetingTitle");
  const count = get("liveMeetingCount");
  const toggle = get("toggleLiveMeeting");
  const inspectorHelp = get("liveMeetingInspectorHelp");
  const mic = get("liveMicToggle");
  const micLabel = get("liveMicLabel");
  const camera = get("liveVideoToggle");
  const cameraLabel = get("liveVideoLabel");
  const chatToggle = get("liveChatToggle");
  const chatToggleLabel = get("liveChatToggleLabel");
  const unreadBadge = get("liveUnreadNotification");
  const leave = get("liveLeaveButton");
  const activity = get("liveSpeakingStatus");
  const main = document.querySelector(".main");
  const app = get("app");
  const topbarParticipants = get("topbarCenter");
  const workspace = get("connectWorkspace");
  const chatSide = get("connectChatSide");
  const bottomContinue = get("liveContinueControl");
  const bottomContinueButton = get("liveContinueButton");
  const bottomContinueMenu = get("liveContinueMenu");
  if (!stage || !grid || !title || !count || !toggle || !inspectorHelp ||
      !mic || !micLabel || !camera || !cameraLabel || !chatToggle ||
      !chatToggleLabel || !unreadBadge ||
      !leave || !activity || !main || !app || !topbarParticipants ||
      !workspace || !chatSide ||
      !bottomContinue || !bottomContinueButton || !bottomContinueMenu) return;

  let stageSignature = null;
  let visibleChatId = null;
  let speakingChatId = null;
  let speakingAgent = null;
  let speakingTimer = null;
  const joinAnimationTimers = new Map();

  function clearJoinAnimations() {
    for (const timer of joinAnimationTimers.values()) clearTimeout(timer);
    joinAnimationTimers.clear();
    grid.querySelectorAll("[data-live-agent]").forEach(tile => {
      tile.classList.remove("is-joining");
    });
  }

  // Two-phase transition: fade the current conversation out before swapping
  // layouts, then reveal the Live Meeting (or normal chat) in place.
  const MODE_EXIT_MS = 190;
  const MODE_ENTER_MS = 320;
  let modeExitTimer = null;
  let modeEnterTimer = null;
  let modeTransitionChatId = null;
  let requestedLiveMode = null;

  // Live Meeting chat tray: animate the grid track and panel together.
  const CHAT_TOGGLE_MS = 380;
  let chatToggleTimer = null;
  let chatToggleChatId = null;
  const lastNoticeIdByChat = new Map();
  const observedApprovalByChat = new Map();
  const unreadNotifications = new Set();

  function latestSystemNoticeId(chat) {
    let lastId = 0;
    for (const message of chat.messages || []) {
      if (message.kind === "notice" && typeof message.id === "number") {
        lastId = Math.max(lastId, message.id);
      }
    }
    return lastId;
  }

  function noteNewEvents(chat) {
    if (!chat) return;
    const id = chat.id;
    const newestId = latestSystemNoticeId(chat);
    const previousId = lastNoticeIdByChat.get(id);
    if (previousId !== undefined && newestId > previousId &&
        chat.liveMeeting && chat.liveChatVisible === false) {
      unreadNotifications.add(id);
      window.gridUiSound?.("notification");
    }
    lastNoticeIdByChat.set(id, newestId);

    const pending = chat.approval?.status === "pending" ? chat.approval : null;
    if (pending && observedApprovalByChat.get(id) !== pending) {
      observedApprovalByChat.set(id, pending);
      if (chat.liveMeeting && chat.liveChatVisible === false) {
        // A new approval requires immediate access to the decision controls.
        // Reuse the same animated show-chat path as the user-facing button.
        setChatVisible(true);
        showToast("Approval request received. Meeting chat opened for review.");
      }
    } else if (!pending) {
      observedApprovalByChat.delete(id);
    }
  }

  function finishChatPanelAnimation() {
    if (chatToggleTimer !== null) clearTimeout(chatToggleTimer);
    chatToggleTimer = null;
    chatToggleChatId = null;
    main.classList.remove("live-chat-transitioning");
  }

  function closeBottomContinueMenu(restoreFocus = false) {
    const wasOpen = !bottomContinueMenu.classList.contains("hidden");
    bottomContinueMenu.classList.add("hidden");
    bottomContinueButton.setAttribute("aria-expanded", "false");
    if (wasOpen && restoreFocus) bottomContinueButton.focus();
  }

  function cancelModeTransition() {
    if (modeExitTimer !== null) clearTimeout(modeExitTimer);
    if (modeEnterTimer !== null) clearTimeout(modeEnterTimer);
    modeExitTimer = null;
    modeEnterTimer = null;
    modeTransitionChatId = null;
    requestedLiveMode = null;
    workspace.classList.remove("live-mode-fade-out", "live-mode-fade-in");
    finishChatPanelAnimation();
    closeBottomContinueMenu();
    leave.disabled = false;
  }

  function clearSpeaking() {
    if (speakingTimer !== null) clearTimeout(speakingTimer);
    speakingTimer = null;
    speakingAgent = null;
    speakingChatId = null;
    grid.querySelectorAll("[data-live-agent]").forEach(card => card.classList.remove("is-speaking"));
    activity.textContent = "Awaiting a response · Select an agent tile to preview the speaking indicator.";
  }

  function drawSpeaking(chat) {
    const active = speakingChatId === chat?.id ? speakingAgent : null;
    grid.querySelectorAll("[data-live-agent]").forEach(card => {
      card.classList.toggle("is-speaking", card.dataset.liveAgent === active);
    });
    activity.textContent = active
      ? active + " is speaking · visual demonstration only (no audio)"
      : "Awaiting a response · Select an agent tile to preview the speaking indicator.";
  }

  function previewSpeaker(agent, duration = 2600) {
    const chat = currentChat();
    if (!chat?.liveMeeting || !chat.participants.includes(agent)) return;
    clearSpeaking();
    speakingChatId = chat.id;
    speakingAgent = agent;
    drawSpeaking(chat);
    speakingTimer = setTimeout(() => {
      speakingTimer = null;
      clearSpeaking();
    }, duration);
  }

  function agentTile(agent) {
    return '<div class="live-participant-tile" data-live-agent="' + agent + '">' +
      '<div class="live-participant-face">' + agentUiPortrait(agent, false) +
      '<span class="live-participant-pulse" aria-hidden="true"></span></div>' +
      '<strong class="live-participant-name">' + escapeHtml(agent) + '</strong>' +
      '<span class="live-participant-role">' + escapeHtml(AGENTS[agent].role) + ' · Profile only</span>' +
      '<span class="live-speaking-label">Speaking · demo</span>' +
      '<span class="live-join-caption" aria-hidden="true">JOINED</span>' +
      '<button type="button" class="live-preview-speak" data-live-demo-speak="' + agent +
      '" aria-label="Preview ' + agent + ' speaking highlight">Preview speaking</button>' +
      '</div>';
  }

  function userTile(chat) {
    const micState = chat.liveMicPreview ? "Mic on (demo)" : "Mic off";
    const camState = chat.liveCameraPreview ? "Camera on (demo)" : "Camera off";
    return '<div class="live-participant-tile live-user-tile">' +
      '<div class="live-participant-face"><span class="live-user-avatar">MC</span></div>' +
      '<strong class="live-participant-name">You · Master Control</strong>' +
      '<span class="live-participant-role">' + micState + ' · ' + camState + '</span>' +
      '<span class="live-speaking-label" style="opacity:1;color:#8793a1">Optional · No devices accessed</span>' +
      '</div>';
  }

  // Animate only invited agents that actually arrive; existing tiles should
  // never replay their entrance when rerendering the conversation.
  window.demoAnimateLiveJoin = (chatId, agent) => {
    const chat = currentChat();
    if (!chat?.liveMeeting || chat.id !== chatId || !chat.participants.includes(agent)) return;
    const tile = [...grid.querySelectorAll("[data-live-agent]")]
      .find(item => item.dataset.liveAgent === agent);
    if (!tile || !state.motionEnabled) return;

    const previous = joinAnimationTimers.get(agent);
    if (previous != null) clearTimeout(previous);
    tile.classList.remove("is-joining");
    // Force a style boundary so a rapid re-invite could restart the animation.
    void tile.offsetWidth;
    tile.classList.add("is-joining");
    const timer = setTimeout(() => {
      tile.classList.remove("is-joining");
      if (joinAnimationTimers.get(agent) === timer) joinAnimationTimers.delete(agent);
    }, 1150);
    joinAnimationTimers.set(agent, timer);
  };

  function drawTiles(chat) {
    const signature = chat.id + ":" + chat.participants.join(",");
    // Avoid replacing tile DOM on every keystroke, typing bubble or reply.
    // User tile state updates are inexpensive and only happen on a toggle.
    if (stageSignature !== signature) {
      grid.innerHTML = chat.participants.filter(agent => AGENTS[agent])
        .map(agentTile).join("") + userTile(chat);
      stageSignature = signature;
    } else {
      const tile = grid.querySelector(".live-user-tile .live-participant-role");
      if (tile) {
        tile.textContent = (chat.liveMicPreview ? "Mic on (demo)" : "Mic off") +
          " · " + (chat.liveCameraPreview ? "Camera on (demo)" : "Camera off");
      }
    }
    drawSpeaking(chat);
  }

  function syncLiveMeeting() {
    const chat = currentChat();
    const enabled = !!chat?.liveMeeting;
    const id = chat?.id ?? null;

    // Switching to a different conversation cancels a queued mode change;
    // the pending timer must never alter a now-inactive conversation.
    if (modeTransitionChatId !== null && id !== modeTransitionChatId) {
      cancelModeTransition();
    }
    if (chatToggleChatId !== null && (chatToggleChatId !== id || !enabled)) {
      finishChatPanelAnimation();
    }

    if (id !== visibleChatId || !enabled) {
      clearSpeaking();
      clearJoinAnimations();
      visibleChatId = id;
    }

    if (!enabled) stageSignature = null;
    const chatVisible = !enabled || chat.liveChatVisible !== false;
    main.classList.toggle("live-meeting-mode", enabled);
    main.classList.toggle("live-chat-hidden", !chatVisible);
    stage.classList.toggle("hidden", !enabled);

    // Hide duplicate tiny topbar portraits in Live Meeting. The same actions
    // remain available on each square tile's ⋯ menu.
    if (enabled && topbarParticipants.contains(document.activeElement)) {
      get("inviteButton")?.focus();
    }
    app.classList.toggle("live-meeting-active", enabled);
    topbarParticipants.inert = enabled;
    topbarParticipants.setAttribute("aria-hidden", String(enabled));

    // A collapsed chat must not keep keyboard focus or expose hidden controls.
    if (!chatVisible && chatSide.contains(document.activeElement)) chatToggle.focus();
    chatSide.inert = !chatVisible;
    chatSide.setAttribute("aria-hidden", String(!chatVisible));
    bottomContinue.classList.toggle("hidden", !enabled || chatVisible);
    if (!enabled || chatVisible) closeBottomContinueMenu();
    toggle.disabled = !chat || modeExitTimer !== null;
    leave.disabled = modeExitTimer !== null;
    toggle.textContent = enabled ? "Return to chat view" : "Start live meeting";
    inspectorHelp.textContent = !chat
      ? "Select a conversation to start a live meeting preview."
      : enabled
        ? "Live preview active. This is the same conversation and transcript; no real audio or video."
        : "Turn this conversation into a Teams-style Live Meeting preview without changing its transcript or participants.";

    if (!enabled) return;

    title.textContent = chat.title;
    const joining = queuedInvitations(chat).length;
    count.textContent = (chat.participants.length + 1) + " participants" +
      (joining ? " · " + joining + " joining…" : "") + " · demo";
    const isChatHidden = chat.liveChatVisible === false;
    const hasUnread = isChatHidden && unreadNotifications.has(chat.id);
    if (!isChatHidden) unreadNotifications.delete(chat.id);
    chatToggleLabel.textContent = isChatHidden ? "Show chat" : "Hide chat";
    unreadBadge.classList.toggle("hidden", !hasUnread);
    chatToggle.setAttribute("aria-label", hasUnread
      ? "Show chat — unread Grid.AI System Notification"
      : isChatHidden ? "Show chat" : "Hide chat");
    chatToggle.setAttribute("aria-pressed", String(!isChatHidden));
    chatToggle.setAttribute("aria-expanded", String(!isChatHidden));
    mic.setAttribute("aria-pressed", String(!!chat.liveMicPreview));
    mic.classList.toggle("is-on", !!chat.liveMicPreview);
    micLabel.textContent = chat.liveMicPreview ? "Mic on · demo" : "Mic off";
    camera.setAttribute("aria-pressed", String(!!chat.liveCameraPreview));
    camera.classList.toggle("is-on", !!chat.liveCameraPreview);
    cameraLabel.textContent = chat.liveCameraPreview ? "Camera on · demo" : "Camera off";
    drawTiles(chat);
  }

  function applyMeetingMode(chat, enabled) {
    finishChatPanelAnimation();
    closeBottomContinueMenu();
    chat.liveMeeting = enabled;
    window.gridUiSound?.(enabled ? "meeting-enter" : "meeting-exit");
    if (enabled) {
      chat.liveChatVisible = true;
      chat.liveMicPreview = false;
      chat.liveCameraPreview = false;
    }
    clearSpeaking();
    render();
    showToast(enabled
      ? "Live Meeting preview opened — no real microphone, video or audio."
      : "Returned to chat view. Conversation history is unchanged.");
  }

  function changeMeetingMode(enabled) {
    const chat = currentChat();
    if (!chat || modeExitTimer !== null) return;
    cancelModeTransition();
    if (!!chat.liveMeeting === enabled) return;

    // An explicit Animations OFF selection switches without a delay.
    if (!state.motionEnabled) {
      applyMeetingMode(chat, enabled);
      return;
    }

    modeTransitionChatId = chat.id;
    requestedLiveMode = enabled;
    toggle.disabled = true;
    leave.disabled = true;
    workspace.classList.add("live-mode-fade-out");

    modeExitTimer = setTimeout(() => {
      modeExitTimer = null;
      if (currentChat()?.id !== chat.id || !findChat(chat.id)) {
        cancelModeTransition();
        syncLiveMeeting();
        return;
      }

      // Swap views only after the old one is fully faded out.
      applyMeetingMode(chat, enabled);
      workspace.classList.remove("live-mode-fade-out");
      workspace.classList.add("live-mode-fade-in");

      modeEnterTimer = setTimeout(() => {
        cancelModeTransition();
        syncLiveMeeting();
      }, MODE_ENTER_MS + 50);
    }, MODE_EXIT_MS);
  }

  // If the user turns animations off during the fade, finish immediately.
  get("motionToggle")?.addEventListener("click", () => {
    if (state.motionEnabled) return;
    clearJoinAnimations();
    finishChatPanelAnimation();
    const id = modeTransitionChatId;
    const enabled = requestedLiveMode;
    const wasExiting = modeExitTimer !== null;
    cancelModeTransition();
    if (wasExiting && currentChat()?.id === id) {
      applyMeetingMode(currentChat(), enabled);
    }
    syncLiveMeeting();
  });

  toggle.addEventListener("click", () => changeMeetingMode(!currentChat()?.liveMeeting));
  leave.addEventListener("click", () => changeMeetingMode(false));
  function setChatVisible(visible) {
    const chat = currentChat();
    if (!chat?.liveMeeting || (chat.liveChatVisible !== false) === visible) return;

    // Retain the existing slide/fade transition, including fast reversals.
    if (chatToggleTimer !== null) {
      clearTimeout(chatToggleTimer);
      chatToggleTimer = null;
    }
    if (state.motionEnabled) {
      if (!main.classList.contains("live-chat-transitioning")) {
        main.classList.add("live-chat-transitioning");
        void workspace.offsetWidth;
      }
      chatToggleChatId = chat.id;
    } else {
      finishChatPanelAnimation();
    }

    chat.liveChatVisible = visible;
    if (visible) unreadNotifications.delete(chat.id);
    syncLiveMeeting();

    if (state.motionEnabled) {
      chatToggleTimer = setTimeout(finishChatPanelAnimation, CHAT_TOGGLE_MS + 40);
    }
  }

  chatToggle.addEventListener("click", () => {
    const chat = currentChat();
    if (!chat?.liveMeeting) return;
    window.gridUiSound?.("panel");
    setChatVisible(chat.liveChatVisible === false);
  });

  bottomContinueButton.addEventListener("click", () => {
    if (!currentChat()?.liveMeeting || currentChat().liveChatVisible !== false) return;
    const opening = bottomContinueMenu.classList.contains("hidden");
    if (!opening) {
      closeBottomContinueMenu();
      return;
    }
    bottomContinueMenu.classList.remove("hidden");
    bottomContinueButton.setAttribute("aria-expanded", "true");
    bottomContinueMenu.querySelector('[role="menuitem"]')?.focus();
  });
  bottomContinueMenu.addEventListener("click", event => {
    const item = event.target.closest("[data-live-continue-target]");
    if (!item) return;
    const key = item.dataset.liveContinueTarget;
    const label = CONTINUE_DESTINATIONS[key];
    if (!label) return;
    closeBottomContinueMenu(true);
    showToast(label + " — handoff preview only; no connection started.");
  });
  bottomContinueMenu.addEventListener("keydown", event => {
    const options = [...bottomContinueMenu.querySelectorAll('[role="menuitem"]')];
    const index = options.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeBottomContinueMenu(true);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      options[(index + step + options.length) % options.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      options[event.key === "Home" ? 0 : options.length - 1]?.focus();
    }
  });
  document.addEventListener("click", event => {
    if (!event.target.closest("#liveContinueControl")) closeBottomContinueMenu();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeBottomContinueMenu();
  });
  mic.addEventListener("click", () => {
    const chat = currentChat();
    if (!chat?.liveMeeting) return;
    chat.liveMicPreview = !chat.liveMicPreview;
    syncLiveMeeting();
    showToast("Microphone state is simulated. No device is accessed.");
  });
  camera.addEventListener("click", () => {
    const chat = currentChat();
    if (!chat?.liveMeeting) return;
    chat.liveCameraPreview = !chat.liveCameraPreview;
    syncLiveMeeting();
    showToast("Camera state is simulated. No video is captured.");
  });
  grid.addEventListener("click", event => {
    const target = event.target.closest("[data-live-demo-speak]");
    if (target) previewSpeaker(target.dataset.liveDemoSpeak);
  });

  // The real chat renderer is reused, including mentions, approvals and
  // scripted replies. An actual demo reply activates the corresponding tile.
  const previousRenderMessages = renderMessages;
  renderMessages = function (...args) {
    previousRenderMessages(...args);
    noteNewEvents(currentChat());
    syncLiveMeeting();
    const messageId = args[0];
    const chat = currentChat();
    if (!chat?.liveMeeting || messageId === null || messageId === undefined) return;
    const reply = chat.messages.find(item =>
      item.id === messageId && item.role && item.role !== "You" && !item.kind);
    if (!reply || !chat.participants.includes(reply.role)) return;
    // Typewriter renders 2 characters every 28ms; hold the speaking glow
    // for the displayed response without playing any audio.
    const duration = Math.max(1800, Math.min(12000,
      state.typewriter && state.motionEnabled ? Math.ceil(reply.text.length / 2) * 28 + 500 : 2600));
    previewSpeaker(reply.role, duration);
  };

  const previousRender = render;
  render = function (...args) {
    previousRender(...args);
    syncLiveMeeting();
  };

  // Temporary notifications also light the unread marker when chat is hidden,
  // even if no persistent transcript notice accompanies the toast.
  const previousShowToast = showToast;
  showToast = function (...args) {
    previousShowToast(...args);
    const chat = currentChat();
    if (chat?.liveMeeting && chat.liveChatVisible === false) {
      unreadNotifications.add(chat.id);
      syncLiveMeeting();
    }
  };

  noteNewEvents(currentChat());
  syncLiveMeeting();
})();
