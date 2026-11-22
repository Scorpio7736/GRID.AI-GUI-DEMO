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
  const leave = get("liveLeaveButton");
  const activity = get("liveSpeakingStatus");
  const main = document.querySelector(".main");
  const workspace = get("connectWorkspace");
  const chatSide = get("connectChatSide");
  const bottomContinue = get("liveContinueControl");
  const bottomContinueButton = get("liveContinueButton");
  const bottomContinueMenu = get("liveContinueMenu");
  if (!stage || !grid || !title || !count || !toggle || !inspectorHelp ||
      !mic || !micLabel || !camera || !cameraLabel || !chatToggle ||
      !leave || !activity || !main || !workspace || !chatSide ||
      !bottomContinue || !bottomContinueButton || !bottomContinueMenu) return;

  let stageSignature = null;
  let visibleChatId = null;
  let speakingChatId = null;
  let speakingAgent = null;
  let speakingTimer = null;

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
      visibleChatId = id;
    }

    if (!enabled) stageSignature = null;
    const chatVisible = !enabled || chat.liveChatVisible !== false;
    main.classList.toggle("live-meeting-mode", enabled);
    main.classList.toggle("live-chat-hidden", !chatVisible);
    stage.classList.toggle("hidden", !enabled);

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
    count.textContent = (chat.participants.length + 1) + " participants · demo";
    chatToggle.textContent = chat.liveChatVisible === false ? "Show chat" : "Hide chat";
    chatToggle.setAttribute("aria-pressed", String(chat.liveChatVisible !== false));
    chatToggle.setAttribute("aria-expanded", String(chat.liveChatVisible !== false));
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
  chatToggle.addEventListener("click", () => {
    const chat = currentChat();
    if (!chat?.liveMeeting) return;

    // State is applied immediately; the CSS grid track animates its width
    // (or height on mobile). A rapid reverse starts from its current size.
    finishChatPanelAnimation();
    if (state.motionEnabled) {
      chatToggleChatId = chat.id;
      main.classList.add("live-chat-transitioning");
      void workspace.offsetWidth; // Flush the starting layout for CSS transitions.
    }
    chat.liveChatVisible = chat.liveChatVisible === false;
    syncLiveMeeting();

    if (state.motionEnabled) {
      chatToggleTimer = setTimeout(finishChatPanelAnimation, CHAT_TOGGLE_MS + 40);
    }
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

  syncLiveMeeting();
})();
