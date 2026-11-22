"use strict";

// Visual extension: per-agent demo presence, portrait controls, meeting whispers.
// Loaded after chat.js to preserve the existing Connect conversation logic.
const AGENT_UI_PHOTOS = {
  MCP: "./Programs/Agents/MCP/MCP_HEADSHOT.png"
  // Add other agent image paths here when those assets exist.
};
const AGENT_UI_STATUSES = [
  { id: "available", label: "Available" },
  { id: "background", label: "Working in the background" },
  { id: "user", label: "Working with User" },
  { id: "agents", label: "Working with other Agents" },
  { id: "both", label: "Working with User and Other Agents" }
];
const AGENT_UI_STATUS_KEY = "gridai-agent-demo-status-v1";
let agentUiStatuses = {};
try {
  const parsed = JSON.parse(localStorage.getItem(AGENT_UI_STATUS_KEY) || "{}");
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    agentUiStatuses = parsed;
  }
} catch (_) {
  agentUiStatuses = {};
}

let openAgentStatusMenu = null;
let selectedParticipant = null;
let openWhisperSession = null;
let whisperAnimation = null;

function agentUiStatus(agent) {
  const value = agentUiStatuses[agent];
  return AGENT_UI_STATUSES.some(item => item.id === value) ? value : "available";
}

function agentUiStatusLabel(agent) {
  return AGENT_UI_STATUSES.find(item => item.id === agentUiStatus(agent)).label;
}

function agentUiPortrait(agent, presence = false) {
  const file = AGENT_UI_PHOTOS[agent];
  const face = file
    ? `<img src="${file}" alt="" loading="lazy">`
    : `<span class="portrait-initials">${iconText(agent)}</span>`;
  const dot = presence
    ? `<span class="presence-dot presence-${agentUiStatus(agent)}" aria-hidden="true"></span>`
    : "";
  return `<span class="agent-portrait">${face}${dot}</span>`;
}

function agentUiSetStatus(agent, status) {
  if (!AGENTS[agent] || !AGENT_UI_STATUSES.some(s => s.id === status)) return;
  agentUiStatuses[agent] = status;
  openAgentStatusMenu = null;
  try {
    localStorage.setItem(AGENT_UI_STATUS_KEY, JSON.stringify(agentUiStatuses));
  } catch (_) {
    showToast("Status changed, but browser storage is unavailable.");
  }
  renderAgentList();
  agentUiRenderParticipants();
  renderInspector();
  showToast(`${agent}: ${agentUiStatusLabel(agent)} (demo status)`);
}

renderAgentList = function renderAgentListWithPortraits() {
  $("agentList").innerHTML = ORDER.map(agent => {
    const status = agentUiStatus(agent);
    const open = openAgentStatusMenu === agent;
    return `
      <div class="agent-row-wrap">
        <div class="agent-item">
          <button class="agent-open" data-quick-agent="${agent}"
                  aria-label="Start a conversation with ${agent}">
            ${agentUiPortrait(agent, true)}
            <div class="item-content">
              <div class="item-title">${agent}</div>
              <div class="agent-role">${escapeHtml(AGENTS[agent].role)}</div>
              <div class="agent-presence-label">${escapeHtml(agentUiStatusLabel(agent))}</div>
            </div>
          </button>
          <button class="agent-status-button" data-agent-status="${agent}"
                  aria-label="Change ${agent} status" aria-expanded="${open}"
                  aria-haspopup="menu">
            <span class="presence-dot presence-${status}" aria-hidden="true"></span>
            <span aria-hidden="true">▾</span>
          </button>
        </div>
        ${open ? `
          <div class="agent-status-menu" role="menu">
            <div class="agent-status-menu-title">MANUAL DEMO STATUS · ${agent}</div>
            ${AGENT_UI_STATUSES.map(option => `
              <button role="menuitemradio" data-set-agent-status="${option.id}"
                      data-status-for="${agent}" aria-checked="${status === option.id}">
                <span class="presence-dot presence-${option.id}" aria-hidden="true"></span>
                ${escapeHtml(option.label)}
                ${status === option.id ? '<span class="selected-check">✓</span>' : ""}
              </button>
            `).join("")}
          </div>
        ` : ""}
      </div>
    `;
  }).join("");
};

function agentUiRenderParticipants() {
  const chat = currentChat();
  if (!chat || !chat.participants.includes(selectedParticipant)) {
    selectedParticipant = null;
  }

  $("headerParticipants").innerHTML = chat
    ? chat.participants.map(agent => `
      <button class="header-participant" data-portrait-agent="${agent}"
              title="${agent} · ${escapeHtml(agentUiStatusLabel(agent))}"
              aria-label="${agent} options" aria-haspopup="menu"
              aria-expanded="${selectedParticipant === agent}">
        ${agentUiPortrait(agent, true)}
      </button>
    `).join("")
    : "";

  const popup = $("participantPopup");
  if (!selectedParticipant) {
    popup.classList.add("hidden");
    popup.innerHTML = "";
    return;
  }

  const agent = selectedParticipant;
  const inMeeting = chat.type === "meeting";
  popup.classList.remove("hidden");
  popup.innerHTML = `
    <div class="popup-person">
      ${agentUiPortrait(agent, true)}
      <div>
        <strong>${agent}</strong>
        <small>${escapeHtml(AGENTS[agent].role)}</small>
        <div class="popup-presence">
          <span class="presence-dot presence-${agentUiStatus(agent)}" aria-hidden="true"></span>
          ${escapeHtml(agentUiStatusLabel(agent))}
        </div>
      </div>
    </div>
    <button class="popup-action danger" data-portrait-action="remove"
            ${inMeeting ? "" : 'disabled title="Meeting only"'}>
      Remove from meeting
    </button>
    <button class="popup-action" data-portrait-action="whisper"
            ${inMeeting ? "" : 'disabled title="Meeting only"'}>
      Whisper to ${agent}
    </button>
    <button class="popup-action" data-portrait-action="move"
            ${inMeeting ? "" : 'disabled title="Meeting only"'}>
      Move to new chat
    </button>
  `;
}

function agentUiEnhanceChatList() {
  document.querySelectorAll(".chat-entry").forEach(entry => {
    const chat = findChat(Number(entry.dataset.entryId));
    if (!chat || chat.type === "meeting") return;
    const icon = entry.querySelector(".chat-icon");
    if (!icon) return;
    icon.innerHTML = agentUiPortrait(chat.participants[0], true);
  });
}

function agentUiEnhanceMessages() {
  const chat = currentChat();
  if (!chat) return;

  if (chat.type === "private") {
    const intro = $("messages").querySelector(".conversation-intro .intro-symbol");
    if (intro) intro.innerHTML = agentUiPortrait(chat.participants[0], true);
  }

  const messageRows = chat.messages.filter(m => m.role && !m.kind);
  $("messages").querySelectorAll(".message").forEach((row, index) => {
    const message = messageRows[index];
    if (!message || message.role === "You" || !AGENTS[message.role]) return;
    const avatar = row.querySelector(".message-avatar");
    if (avatar) avatar.innerHTML = agentUiPortrait(message.role, false);
  });
}

function agentUiEnhanceInspector() {
  const chat = currentChat();
  if (!chat) return;

  $("participantList").querySelectorAll(".participant").forEach((row, index) => {
    const agent = chat.participants[index];
    if (!AGENTS[agent]) return;
    const avatar = row.querySelector(".agent-icon");
    if (avatar) avatar.outerHTML = agentUiPortrait(agent, true);
    const sub = row.querySelector("small");
    if (sub) {
      const label = document.createElement("div");
      label.className = "participant-status-label";
      label.textContent = agentUiStatusLabel(agent) + " · Demo";
      sub.after(label);
    }
  });
}

function agentUiEnhanceAgentModal() {
  document.querySelectorAll("#modalBody .modal-agent").forEach(row => {
    const input = row.querySelector("input");
    if (!input || !AGENTS[input.value]) return;
    const oldIcon = row.querySelector(".agent-icon");
    if (oldIcon) oldIcon.outerHTML = agentUiPortrait(input.value, true);
    const sub = row.querySelector("small");
    if (sub) sub.textContent += " · " + agentUiStatusLabel(input.value);
  });
}

const agentUiOldChatList = renderChatList;
renderChatList = function () {
  agentUiOldChatList();
  agentUiEnhanceChatList();
};
const agentUiOldMessages = renderMessages;
renderMessages = function (animateId = null) {
  agentUiOldMessages(animateId);
  agentUiEnhanceMessages();
};
const agentUiOldInspector = renderInspector;
renderInspector = function () {
  agentUiOldInspector();
  agentUiEnhanceInspector();
};
const agentUiOldModal = openModal;
openModal = function (...args) {
  agentUiOldModal(...args);
  agentUiEnhanceAgentModal();
};
const agentUiOldRender = render;
render = function () {
  agentUiOldRender();
  renderAgentList();
  agentUiRenderParticipants();
};

function agentUiRemoveFromMeeting(agent) {
  const chat = currentChat();
  if (!chat || chat.type !== "meeting" || !chat.participants.includes(agent)) return false;

  chat.participants = chat.participants.filter(participant => participant !== agent);
  if (chat.participants.length === 1) {
    chat.type = "private";
    if (chat.title.startsWith("Agent meeting ·")) {
      chat.title = `${chat.participants[0]} · Continued conversation`;
    }
  } else if (chat.title.startsWith("Agent meeting ·")) {
    chat.title = `Agent meeting · ${chat.participants.join(", ")}`;
  }

  chat.messages.push(makeMessage(null,
    `${agent} removed from the meeting (demo). Historical shared messages remain in its transcript.`,
    { kind: "notice" }
  ));
  touchChat(chat);
  selectedParticipant = null;
  saveState();
  render();
  return true;
}

function agentUiParticipantAction(action) {
  const agent = selectedParticipant;
  const chat = currentChat();
  if (!agent || !chat || chat.type !== "meeting") return;

  if (action === "remove") {
    if (agentUiRemoveFromMeeting(agent)) showToast(`${agent} removed from meeting.`);
  } else if (action === "whisper") {
    selectedParticipant = null;
    agentUiRenderParticipants();
    agentUiOpenWhisper(agent);
  } else if (action === "move") {
    const sourceTitle = chat.title;
    if (!agentUiRemoveFromMeeting(agent)) return;
    createPrivateConversation(agent);
    const newChat = currentChat();
    newChat.messages.unshift(makeMessage(null,
      `Private conversation opened from "${sourceTitle}" (demo). No shared meeting history was copied.`,
      { kind: "notice" }
    ));
    saveState();
    render();
    showToast(`${agent} moved to a new private chat.`);
  }
}

// Whispers persist inside the owning meeting but are NOT part of chat.messages.
// The existing TXT/MD exporter only exports chat.messages.
function agentUiOpenWhisper(agent) {
  const chat = currentChat();
  if (!chat || chat.type !== "meeting" || !chat.participants.includes(agent)) return;
  openWhisperSession = { chatId: chat.id, agent };
  $("whisperTitle").textContent = "Whisper to " + agent;
  $("whisperAvatar").innerHTML = agentUiPortrait(agent, true);
  $("whisperBackdrop").classList.add("visible");
  agentUiRenderWhispers();
  $("whisperInput").focus();
}

function agentUiFinishWhisperTyping() {
  if (!whisperAnimation) return;
  cancelAnimationFrame(whisperAnimation.frame);
  whisperAnimation.bubble.textContent = whisperAnimation.text;
  whisperAnimation.bubble.classList.remove("typing-cursor");
  whisperAnimation = null;
}

function agentUiCloseWhisper() {
  agentUiFinishWhisperTyping();
  openWhisperSession = null;
  $("whisperBackdrop").classList.remove("visible");
  $("whisperInput").value = "";
}

function agentUiRenderWhispers(animateId = null) {
  agentUiFinishWhisperTyping();
  if (!openWhisperSession) return;
  const { chatId, agent } = openWhisperSession;
  const chat = findChat(chatId);
  const messages = chat?.whispers?.[agent] || [];
  $("whisperMessages").innerHTML = messages.length
    ? messages.map(message => `
        <div class="whisper-line ${message.role === "You" ? "mine" : ""}">
          <strong>${escapeHtml(message.role)} · ${escapeHtml(formatTime(message.createdAt))}</strong>
          <div class="whisper-bubble ${message.id === animateId ? "typing-cursor" : ""}"
               id="whisper-bubble-${message.id}">${message.id === animateId ? "" : escapeHtml(message.text)}</div>
        </div>
      `).join("")
    : '<div class="whisper-empty">No whispers yet. Start a private side conversation with this agent.</div>';

  const area = $("whisperMessages");
  area.scrollTop = area.scrollHeight;

  const msg = messages.find(m => m.id === animateId);
  if (!msg) return;
  const bubble = document.getElementById("whisper-bubble-" + msg.id);
  if (!bubble) return;
  if (!state.typewriter || reducedMotion.matches) {
    bubble.textContent = msg.text;
    bubble.classList.remove("typing-cursor");
    return;
  }

  const animation = { bubble, text: msg.text, frame: 0, start: null };
  whisperAnimation = animation;
  function step(time) {
    if (whisperAnimation !== animation) return;
    if (animation.start === null) animation.start = time;
    const length = Math.min(msg.text.length,
      Math.floor((time - animation.start) / TYPEWRITER_MS_PER_CHAR) + 1);
    bubble.textContent = msg.text.slice(0, length);
    area.scrollTop = area.scrollHeight;
    if (length < msg.text.length) {
      animation.frame = requestAnimationFrame(step);
    } else {
      bubble.classList.remove("typing-cursor");
      whisperAnimation = null;
    }
  }
  animation.frame = requestAnimationFrame(step);
}

function agentUiSendWhisper() {
  if (!openWhisperSession) return;
  const text = $("whisperInput").value.trim();
  if (!text) return;

  const { chatId, agent } = openWhisperSession;
  const chat = findChat(chatId);
  if (!chat || chat.type !== "meeting" || !chat.participants.includes(agent)) {
    agentUiCloseWhisper();
    showToast("Agent is no longer part of this meeting.");
    return;
  }

  chat.whispers ||= {};
  chat.whispers[agent] ||= [];
  chat.whispers[agent].push(makeMessage("You", text));
  touchChat(chat);
  $("whisperInput").value = "";
  saveState();
  agentUiRenderWhispers();

  setTimeout(() => {
    const destination = findChat(chatId);
    if (!destination || destination.type !== "meeting" ||
        !destination.participants.includes(agent)) return;
    destination.whispers ||= {};
    destination.whispers[agent] ||= [];
    const reply = makeMessage(agent, demonstrationReply(agent, text), { demo: true });
    destination.whispers[agent].push(reply);
    touchChat(destination);
    saveState();
    if (openWhisperSession?.chatId === chatId && openWhisperSession?.agent === agent) {
      agentUiRenderWhispers(reply.id);
    }
  }, 450);
}

$("agentList").addEventListener("click", event => {
  const choice = event.target.closest("[data-set-agent-status]");
  if (choice) {
    agentUiSetStatus(choice.dataset.statusFor, choice.dataset.setAgentStatus);
    return;
  }
  const button = event.target.closest("[data-agent-status]");
  if (button) {
    openAgentStatusMenu = openAgentStatusMenu === button.dataset.agentStatus
      ? null : button.dataset.agentStatus;
    renderAgentList();
  }
});

$("headerParticipants").addEventListener("click", event => {
  const button = event.target.closest("[data-portrait-agent]");
  if (!button) return;
  const agent = button.dataset.portraitAgent;
  selectedParticipant = selectedParticipant === agent ? null : agent;
  agentUiRenderParticipants();
});

$("participantPopup").addEventListener("click", event => {
  const button = event.target.closest("[data-portrait-action]");
  if (!button || button.disabled) return;
  agentUiParticipantAction(button.dataset.portraitAction);
});

$("sendWhisper").addEventListener("click", agentUiSendWhisper);
$("closeWhisper").addEventListener("click", agentUiCloseWhisper);
$("whisperInput").addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    agentUiSendWhisper();
  }
});
$("whisperBackdrop").addEventListener("click", event => {
  if (event.target === $("whisperBackdrop")) agentUiCloseWhisper();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && openWhisperSession) agentUiCloseWhisper();
});

document.addEventListener("click", event => {
  if (selectedParticipant && !event.target.closest(".topbar-center")) {
    selectedParticipant = null;
    agentUiRenderParticipants();
  }
  if (openAgentStatusMenu && !event.target.closest(".agent-row-wrap")) {
    openAgentStatusMenu = null;
    renderAgentList();
  }
});

render();
