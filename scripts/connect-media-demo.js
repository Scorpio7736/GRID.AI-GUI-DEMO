"use strict";

/* UI-only media previews. No file chooser, microphone, speech synthesis,
   remote device communication, or backend integration is invoked. */
(function () {
  const get = id => document.getElementById(id);
  const attachButton = get("demoAddAttachment");
  const attachMenu = get("demoAddMenu");
  const attachTray = get("demoAttachmentTray");
  const menuRoot = get("demoAddMenuRoot");
  const linkPane = get("demoAddLinkPane");
  const linkInput = get("demoLinkInput");
  const linkConfirm = get("demoAddLinkConfirm");
  const micButton = get("demoVoiceInput");
  const micState = get("demoVoiceState");
  const messageRoot = get("messages");
  if (!attachButton || !attachMenu || !attachTray || !menuRoot ||
      !linkPane || !linkInput || !linkConfirm || !micButton || !micState || !messageRoot) return;

  const previewsByChat = new Map();
  let simulatedListening = false;
  let lastChatId = null;
  let speaking = null;
  let speakerTimer = null;

  function showAddPane(which = "root") {
    menuRoot.classList.toggle("hidden", which !== "root");
    linkPane.classList.toggle("hidden", which !== "link");
    if (which === "link") linkInput.focus();
  }

  function closeAttachmentMenu(returnFocus) {
    const wasOpen = !attachMenu.classList.contains("hidden");
    attachMenu.classList.add("hidden");
    attachButton.setAttribute("aria-expanded", "false");
    showAddPane();
    if (wasOpen && returnFocus) attachButton.focus();
  }

  function drawAttachmentChips() {
    const chat = currentChat();
    const files = chat ? (previewsByChat.get(chat.id) || []) : [];
    attachTray.replaceChildren();
    attachTray.classList.toggle("hidden", !files.length);
    files.forEach((filename, index) => {
      const chip = document.createElement("span");
      chip.className = "demo-attachment-chip";
      const text = document.createElement("span");
      text.textContent = filename + " · DEMO";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.dataset.removeDemoAttachment = String(index);
      remove.setAttribute("aria-label", "Remove demo attachment " + filename);
      chip.append(text, remove);
      attachTray.appendChild(chip);
    });
  }

  function setListening(next) {
    simulatedListening = next;
    micButton.classList.toggle("is-active", next);
    micButton.setAttribute("aria-pressed", String(next));
    micButton.setAttribute("aria-label", next ? "Stop voice input preview" : "Voice input preview");
    micState.classList.toggle("hidden", !next);
  }

  function stopSpeaker() {
    if (speakerTimer !== null) clearTimeout(speakerTimer);
    speakerTimer = null;
    speaking = null;
    messageRoot.querySelectorAll("[data-demo-speaker]").forEach(button => {
      button.classList.remove("is-active");
      button.setAttribute("aria-pressed", "false");
    });
  }

  window.demoHasAttachments = chatId => (previewsByChat.get(chatId) || []).length > 0;
  window.demoTakeAttachments = chatId => {
    const names = previewsByChat.get(chatId) || [];
    previewsByChat.delete(chatId);
    drawAttachmentChips();
    return [...names];
  };

  window.demoSyncMediaControls = () => {
    const id = currentChat()?.id ?? null;
    attachButton.disabled = id === null;
    micButton.disabled = id === null;
    if (id !== lastChatId) {
      setListening(false);
      stopSpeaker();
      closeAttachmentMenu(false);
      lastChatId = id;
    }
    drawAttachmentChips();
  };

  attachButton.addEventListener("click", () => {
    if (attachButton.disabled) return;
    const isHidden = attachMenu.classList.contains("hidden");
    if (isHidden) {
      showAddPane();
      attachMenu.classList.remove("hidden");
    } else {
      closeAttachmentMenu(false);
    }
    attachButton.setAttribute("aria-expanded", String(isHidden));
  });

  attachMenu.addEventListener("click", event => {
    const action = event.target.closest("[data-demo-add-action]");
    if (action && currentChat()) {
      if (action.dataset.demoAddAction === "link") {
        showAddPane("link");
      } else if (action.dataset.demoAddAction === "files") {
        // Visual demo only: add a generic file chip, not a real file picker
        // or a submenu that asks the user to choose a file type.
        const id = currentChat().id;
        const items = previewsByChat.get(id) || [];
        if (!items.includes("File attachment")) items.push("File attachment");
        previewsByChat.set(id, items);
        closeAttachmentMenu(true);
        drawAttachmentChips();
        showToast("File attachment added (demo preview only). No file was accessed.");
      }
      return;
    }
    if (event.target.closest("[data-demo-add-back]")) {
      showAddPane();
      attachMenu.querySelector('[data-demo-add-action="link"]')?.focus();
    }
  });

  function addLinkPreview() {
    const chat = currentChat();
    if (!chat) return;
    const input = linkInput.value.trim();
    let url;
    try {
      url = new URL(input);
    } catch {
      showToast("Enter a valid http:// or https:// link for the demo.");
      return;
    }
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname ||
        input.length > 240) {
      showToast("Use an http:// or https:// link (240 characters maximum).");
      return;
    }
    // Store only the visible URL text. No request, fetch or preview download.
    const label = "Link: " + input;
    const items = previewsByChat.get(chat.id) || [];
    if (!items.includes(label)) items.push(label);
    previewsByChat.set(chat.id, items);
    linkInput.value = "";
    closeAttachmentMenu(true);
    drawAttachmentChips();
    showToast("Link preview added. The link was not opened or fetched.");
  }

  linkConfirm.addEventListener("click", addLinkPreview);
  linkInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      addLinkPreview();
    }
  });

  attachTray.addEventListener("click", event => {
    const remove = event.target.closest("[data-remove-demo-attachment]");
    if (!remove || !currentChat()) return;
    const id = currentChat().id;
    const files = previewsByChat.get(id) || [];
    files.splice(Number(remove.dataset.removeDemoAttachment), 1);
    if (!files.length) previewsByChat.delete(id);
    drawAttachmentChips();
  });

  micButton.addEventListener("click", () => {
    if (micButton.disabled) return;
    setListening(!simulatedListening);
    showToast(simulatedListening
      ? "Voice input preview active. Microphone is not accessed."
      : "Voice input preview stopped.");
  });

  messageRoot.addEventListener("click", event => {
    const button = event.target.closest("[data-demo-speaker]");
    if (!button || !currentChat()) return;
    const messageId = Number(button.dataset.demoSpeaker);
    const exists = currentChat().messages.some(message =>
      message.id === messageId && message.role && message.role !== "You" && !message.kind);
    if (!exists) return;
    if (speaking === messageId) {
      stopSpeaker();
      showToast("AI voice preview stopped.");
      return;
    }
    stopSpeaker();
    speaking = messageId;
    button.classList.add("is-active");
    button.setAttribute("aria-pressed", "true");
    showToast("AI voice playback preview (silent demo — no audio generated).");
    speakerTimer = setTimeout(stopSpeaker, 2600);
  });

  attachMenu.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (!menuRoot.classList.contains("hidden")) closeAttachmentMenu(true);
      else showAddPane();
    }
  });
  document.addEventListener("click", event => {
    if (!event.target.closest("#demoAddWrap")) closeAttachmentMenu(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeAttachmentMenu(false);
      if (simulatedListening) setListening(false);
      stopSpeaker();
    }
  });

  // Re-render changes visible message buttons, so stop a silent preview
  // when its original button is removed; no audio playback is involved.
  const earlierRenderMessages = renderMessages;
  renderMessages = function (...args) {
    earlierRenderMessages(...args);
    stopSpeaker();
  };

  window.demoSyncMediaControls();
})();