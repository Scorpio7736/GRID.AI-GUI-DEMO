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
  if (!stage || !grid || !title || !count || !toggle || !inspectorHelp ||
      !mic || !micLabel || !camera || !cameraLabel || !chatToggle ||
      !leave || !activity || !main) return;

  let stageSignature = null;
  let visibleChatId = null;
  let speakingChatId = null;
  let speakingAgent = null;
  let speakingTimer = null;

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

    if (id !== visibleChatId || !enabled) {
      clearSpeaking();
      visibleChatId = id;
    }

    if (!enabled) stageSignature = null;
    main.classList.toggle("live-meeting-mode", enabled);
    main.classList.toggle("live-chat-hidden", enabled && chat.liveChatVisible === false);
    stage.classList.toggle("hidden", !enabled);
    toggle.disabled = !chat;
    toggle.textContent = enabled ? "Return to chat view" : "Start live meeting";
    inspectorHelp.textContent = !chat
      ? "Select a conversation to start a live meeting preview."
      : enabled
        ? "Live preview active. This is the same conversation and transcript; no real audio or video."
        : "Turn this conversation into a Teams-style call preview without changing its transcript or participants.";

    if (!enabled) return;

    title.textContent = chat.title;
    count.textContent = (chat.participants.length + 1) + " participants · demo";
    chatToggle.textContent = chat.liveChatVisible === false ? "Show chat" : "Hide chat";
    chatToggle.setAttribute("aria-pressed", String(chat.liveChatVisible !== false));
    mic.setAttribute("aria-pressed", String(!!chat.liveMicPreview));
    mic.classList.toggle("is-on", !!chat.liveMicPreview);
    micLabel.textContent = chat.liveMicPreview ? "Mic on · demo" : "Mic off";
    camera.setAttribute("aria-pressed", String(!!chat.liveCameraPreview));
    camera.classList.toggle("is-on", !!chat.liveCameraPreview);
    cameraLabel.textContent = chat.liveCameraPreview ? "Camera on · demo" : "Camera off";
    drawTiles(chat);
  }

  function changeMeetingMode(enabled) {
    const chat = currentChat();
    if (!chat) return;
    chat.liveMeeting = enabled;
    if (enabled) {
      chat.liveChatVisible = true;
      chat.liveMicPreview = false;
      chat.liveCameraPreview = false;
    }
    clearSpeaking();
    render();
    showToast(enabled
      ? "Live meeting preview opened — no real call, microphone or camera."
      : "Returned to chat view. Conversation history is unchanged.");
  }

  toggle.addEventListener("click", () => changeMeetingMode(!currentChat()?.liveMeeting));
  leave.addEventListener("click", () => changeMeetingMode(false));
  chatToggle.addEventListener("click", () => {
    const chat = currentChat();
    if (!chat?.liveMeeting) return;
    chat.liveChatVisible = chat.liveChatVisible === false;
    syncLiveMeeting();
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
