"use strict";

// Visual extension: automatically derived demo presence, portraits, meeting controls and whispers.
// Loaded after chat.js to preserve the existing Connect conversation logic.
const AGENT_UI_PHOTOS = Object.freeze({
  MCP: "./Programs/Agents/MCP/MCP_HEADSHOT.png",
  MAXIS: "./Programs/Agents/Maxis/MAXIS_HEADSHOT.png",
  TRON: "./Programs/Agents/TRON/TRON_HEADSHOT.png",
  JN: "./Programs/Agents/JN/JN_HEADSHOT.png"
  // VOLT and RELAY use initials until headshot assets are added.
});
const AGENT_UI_STATUSES = [
  { id: "available", label: "Available" },
  { id: "background", label: "Working in the background" },
  { id: "user", label: "Working with User" },
  { id: "agents", label: "Working with other Agents" },
  { id: "both", label: "Working with User and Other Agents" }
];
// Presence is derived from selected chats and in-flight demo work. It is not user-set.
let selectedParticipant = null;
let openWhisperSession = null;
let whisperAnimation = null;
const agentUiPending = new Map();

function agentUiPendingChanged(chatId, agent, change) {
  if (!AGENTS[agent]) return;
  const key = chatId + ":" + agent;
  const next = Math.max(0, (agentUiPending.get(key) || 0) + change);
  if (next) agentUiPending.set(key, next);
  else agentUiPending.delete(key);

  renderAgentList();
  agentUiRenderParticipants();
  renderInspector();
}

function agentUiPublishPresence(){
  if(!window.GridPresence)return;
  const selected={},pending={},live={},chat=currentChat();
  if(chat)for(const agent of chat.participants)selected[agent]=chat.type==="meeting"?"both":"user";
  if(openWhisperSession?.chatId===chat?.id&&openWhisperSession?.agent)selected[openWhisperSession.agent]="user";
  for(const c of state.chats){
    if(c.liveMeeting&&c.type==="meeting")for(const agent of c.participants)live[agent]=true;
  }
  for(const [key,count] of agentUiPending){
    if(count<=0)continue;
    const [id,agent]=key.split(":");
    const c=findChat(Number(id));if(!c||!c.participants.includes(agent))continue;
    if(c.type==="meeting")for(const participant of c.participants)pending[participant]="agents";
    else if(pending[agent]!=="agents")pending[agent]="background";
  }
  window.GridPresence.setConnect({selected,pending,live});
}
function agentUiStatus(agent) {
  if(window.GridPresence)return window.GridPresence.get(agent).mode;
  const chat = currentChat();
  if (openWhisperSession?.agent === agent &&
      openWhisperSession.chatId === chat?.id) {
    return "user";
  }
  if (chat?.participants.includes(agent)) {
    return chat.type === "meeting" ? "both" : "user";
  }

  for (const [key, count] of agentUiPending.entries()) {
    if (count <= 0) continue;
    const separator = key.indexOf(":");
    const chatId = Number(key.slice(0, separator));
    const worker = key.slice(separator + 1);
    const workingChat = findChat(chatId);
    if (!workingChat) continue;
    if (workingChat.type === "meeting" &&
        workingChat.participants.includes(agent)) {
      return "agents";
    }
    if (worker === agent) return "background";
  }

  return "available";
}

function agentUiStatusLabel(agent) {
  if(window.GridPresence)return window.GridPresence.get(agent).label;
  return AGENT_UI_STATUSES.find(item => item.id === agentUiStatus(agent)).label;
}

function agentUiPortrait(agent, presence = false) {
  const file = AGENT_UI_PHOTOS[agent];
  const face = file
    ? `<img src="${file}" alt="" loading="lazy">`
    : `<span class="portrait-initials">${iconText(agent)}</span>`;
  const dot = presence
    ? `<span class="presence-dot presence-${agentUiStatus(agent)}" data-grid-presence-agent="${agent}" aria-hidden="true"></span>`
    : "";
  return `<span class="agent-portrait">${face}${dot}</span>`;
}

renderAgentList = function renderAgentListWithPortraits() {
  agentUiPublishPresence();
  $("agentList").innerHTML = ORDER.map(agent => `
    <div class="agent-row-wrap">
      <div class="agent-item">
        <button class="agent-open" data-quick-agent="${agent}"
                aria-label="Start a conversation with ${agent}">
          ${agentUiPortrait(agent, true)}
          <div class="item-content">
            <div class="item-title">${agent}</div>
            <div class="agent-role">${escapeHtml(AGENTS[agent].role)}</div>
            <div class="agent-presence-label" data-grid-presence-label="${agent}">${escapeHtml(agentUiStatusLabel(agent))}</div>
          </div>
        </button>
      </div>
    </div>
  `).join("");
};

function agentUiRenderParticipants() {
  const chat = currentChat();
  const isMeeting = chat?.type === "meeting";

  // Header portraits and their action menu are exclusive to agent meetings.
  // Switching to a private chat also closes any previously opened meeting menu.
  if (!isMeeting || !chat.participants.includes(selectedParticipant)) {
    selectedParticipant = null;
  }

  $("headerParticipants").innerHTML = isMeeting
    ? chat.participants.map((agent, index) => `
      <button class="header-participant" data-portrait-agent="${agent}"
              style="z-index:${selectedParticipant === agent ? 20 : chat.participants.length-index}"
              title="${agent} · ${escapeHtml(agentUiStatusLabel(agent))}"
              aria-label="Options for ${agent}: ${escapeHtml(agentUiStatusLabel(agent))}"
              aria-haspopup="menu" aria-expanded="${selectedParticipant === agent}">
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
  popup.classList.remove("hidden");
  popup.innerHTML = `
    <div class="popup-person">
      ${agentUiPortrait(agent, true)}
      <div>
        <strong>${agent}</strong>
        <small>${escapeHtml(AGENTS[agent].role)}</small>
        <div class="popup-presence">
          <span class="presence-dot presence-${agentUiStatus(agent)}" data-grid-presence-agent="${agent}" aria-hidden="true"></span>
          <span data-grid-presence-label="${agent}">${escapeHtml(agentUiStatusLabel(agent))}</span>
        </div>
      </div>
    </div>
    <button class="popup-action danger" data-portrait-action="remove"
            >
      Ask to leave
    </button>
    <button class="popup-action" data-portrait-action="whisper"
            >
      Whisper to ${agent}
    </button>
    <button class="popup-action" data-portrait-action="move"
            >
      Move to new chat
    </button>
  `;
}

function agentUiStackedPortraits(participants, limit = 6) {
  const members = participants.slice(0, limit);
  return `<span class="stacked-portraits" aria-label="${escapeHtml(participants.join(", "))}">
    ${members.map((agent, index) => `
      <span class="stacked-portrait" style="z-index:${members.length - index}">
        ${agentUiPortrait(agent, true)}
      </span>
    `).join("")}
    ${participants.length > limit ? `<span class="stacked-overflow">+${participants.length-limit}</span>` : ""}
  </span>`;
}

function agentUiEnhanceChatList() {
  document.querySelectorAll(".chat-entry").forEach(entry => {
    const chat = findChat(Number(entry.dataset.entryId));
    if (!chat) return;

    const icon = entry.querySelector(".chat-icon");
    if (icon) {
      icon.innerHTML = chat.type === "meeting"
        ? agentUiStackedPortraits(chat.participants, 3)
        : agentUiPortrait(chat.participants[0], true);
      icon.classList.toggle("stacked-icon", chat.type === "meeting");
    }

    const count = chat.messages.filter(message => message.role).length;
    const latest = [...chat.messages].reverse()
      .find(message => message.role && message.text);
    const preview = latest
      ? latest.text.replace(/\s+/g, " ").slice(0, 120)
      : "No messages yet";

    const detail = document.createElement("div");
    detail.className = "chat-hover-details";
    detail.innerHTML = `
      <div class="chat-detail-row">
        <span class="chat-detail-label">TYPE</span>
        <span>${chat.type === "meeting" ? "Agent meeting" : "Private chat"}</span>
      </div>
      <div class="chat-detail-label chat-detail-participants">PARTICIPANTS (${chat.participants.length})</div>
      <div class="chat-member-list">
        ${chat.participants.map(agent => `
          <span class="chat-member-chip">
            ${agentUiPortrait(agent, true)}
            <span>${agent}</span>
          </span>
        `).join("")}
      </div>
      <div class="chat-detail-row"><span class="chat-detail-label">MESSAGES</span><span>${count}</span></div>
      <div class="chat-detail-row"><span class="chat-detail-label">CREATED</span><span>${escapeHtml(formatDateTime(chat.createdAt))}</span></div>
      <div class="chat-detail-row"><span class="chat-detail-label">LAST ACTIVITY</span><span>${escapeHtml(formatDateTime(chat.updatedAt))}</span></div>
      <div class="chat-detail-preview">${escapeHtml(preview)}</div>
    `;
    entry.appendChild(detail);
  });
}

function agentUiEnhanceMessages() {
  const chat = currentChat();
  if (!chat) return;

  const messageRows = chat.messages.filter(m => m.role && !m.kind);
  $("messages").querySelectorAll(".message").forEach((row, index) => {
    const message = messageRows[index];
    if (!message || message.role === "You" || !AGENTS[message.role]) return;
    const avatar = row.querySelector(".message-avatar");
    if (avatar) avatar.innerHTML = agentUiPortrait(message.role, false);
  });

  $("messages").querySelectorAll(".demo-thinking-message").forEach(row => {
    const agent = row.dataset.pendingAgent;
    if (!AGENTS[agent]) return;
    const avatar = row.querySelector(".message-avatar");
    if (avatar) avatar.innerHTML = agentUiPortrait(agent, false);
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
      label.dataset.gridPresenceLabel=agent;
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
    if (sub) { const label=document.createElement("span");label.dataset.gridPresenceLabel=input.value;label.textContent=agentUiStatusLabel(input.value);sub.append(document.createTextNode(" · "),label); }
  });
}

const agentUiOldChatList = renderChatList;
renderChatList = function () {
  agentUiPublishPresence();
  agentUiOldChatList();
  agentUiEnhanceChatList();
};
const agentUiOldMessages = renderMessages;
renderMessages = function (animateId = null) {
  // The base renderer creates the message DOM; apply portraits before typing.
  // Passing null avoids starting an animation against a DOM we are still enhancing.
  agentUiOldMessages(null);
  agentUiEnhanceMessages();

  if (animateId === null) return;
  const reply = currentChat()?.messages.find(item =>
    item.id === animateId && item.role && item.role !== "You"
  );
  if (!reply) return;

  const bubble = document.getElementById("bubble-" + animateId);
  if (!bubble) return;
  if (state.typewriter && state.motionEnabled) {
    const indicator = document.createElement("div");
    indicator.id = "typing-" + animateId;
    indicator.className = "typing-label";
    const status = document.createElement("span");
    status.textContent = reply.role + " is responding";
    const skip = document.createElement("button");
    skip.className = "skip-button";
    skip.type = "button";
    skip.dataset.skipTypewriter = "";
    skip.textContent = "Skip animation";
    indicator.append(status, skip);
    bubble.parentNode.appendChild(indicator);
  }
  // Starts at the final DOM node, after the avatar upgrades.
  animateTypewriter(animateId, reply.text);
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

function agentUiRemoveFromMeeting(agent, chatId = currentChat()?.id) {
  // A departure animation may finish after the operator has selected
  // another conversation; apply the action to its original meeting.
  const chat = findChat(chatId);
  if (!chat || chat.type !== "meeting" ||
      !chat.participants.includes(agent) || chat.participants.length < 2) return false;

  chat.participants = chat.participants.filter(participant => participant !== agent);
  chat.departingAgents = (chat.departingAgents || [])
    .filter(participant => participant !== agent);
  if (chat.participants.length === 1) {
    chat.type = "private";
    if (chat.title.startsWith("Agent meeting ·")) {
      chat.title = `${chat.participants[0]} · Continued conversation`;
    }
  } else if (chat.title.startsWith("Agent meeting ·")) {
    chat.title = `Agent meeting · ${chat.participants.join(", ")}`;
  }

  chat.messages.push(makeMessage(null,
    `${agent} left the meeting (demo). Historical shared messages remain in its transcript.`,
    { kind: "notice" }
  ));
  touchChat(chat);
  if (state.currentId === chatId) selectedParticipant = null;
  saveState();
  if (state.currentId === chatId) render();
  else renderChatList();
  return true;
}

// Both the top participant menu and the Live Meeting tile menu use this
// exact action handler. Removal/move is animated before it changes the model.
function agentUiParticipantAction(action, chosenAgent = selectedParticipant) {
  const agent = chosenAgent;
  const chat = currentChat();
  if (!agent || !chat || chat.type !== "meeting" ||
      !chat.participants.includes(agent)) return false;

  if (action === "whisper") {
    selectedParticipant = null;
    agentUiRenderParticipants();
    agentUiOpenWhisper(agent);
    return true;
  }
  if (action !== "remove" && action !== "move") return false;
  if (chat.departingAgents?.includes(agent)) return false;
  if (chat.participants.length - (chat.departingAgents?.length || 0) < 2) {
    showToast("At least one agent must remain in the conversation.");
    return false;
  }

  const chatId = chat.id;
  const sourceTitle = chat.title;

  // The agent responds to the request before their tile exits. A farewell
  // stays in the existing transcript, even after the participant has left.
  chat.departingAgents ||= [];
  chat.departingAgents.push(agent);
  const farewell = makeMessage(agent, "See you guys later!", { demo: true });
  chat.messages.push(farewell);
  if (state.currentId === chatId) window.gridUiSound?.("leave");
  touchChat(chat);
  saveState();
  if (state.currentId === chatId) {
    render();
    renderMessages(farewell.id);
    if (chat.liveMeeting && chat.liveChatVisible === false) {
      showToast(agent + ": See you guys later!");
    }
  }

  const completeDeparture = () => {
    const original = findChat(chatId);
    if (original) {
      original.departingAgents = (original.departingAgents || [])
        .filter(participant => participant !== agent);
    }
    if (!agentUiRemoveFromMeeting(agent, chatId)) return;
    if (action === "remove") {
      showToast(`${agent} left the meeting.`);
      return;
    }

    // Moving is an explicit action that creates a fresh private chat.
    // Original shared history remains in the original meeting only.
    createPrivateConversation(agent);
    const newChat = currentChat();
    newChat.messages.unshift(makeMessage(null,
      `Private conversation opened from "${sourceTitle}" (demo). No shared meeting history was copied.`,
      { kind: "notice" }
    ));
    saveState();
    render();
    showToast(`${agent} moved to a new private chat.`);
  };

  selectedParticipant = null;
  agentUiRenderParticipants();
  if (chat.liveMeeting && typeof window.demoAnimateLiveRemoval === "function" &&
      window.demoAnimateLiveRemoval(chatId, agent, completeDeparture)) {
    return true;
  }
  completeDeparture();
  return true;
}

// Whispers persist inside the owning meeting but are NOT part of chat.messages.
// The existing TXT/MD exporter only exports chat.messages.
function agentUiOpenWhisper(agent) {
  const chat = currentChat();
  if (!chat || chat.type !== "meeting" || !chat.participants.includes(agent)) return;
  openWhisperSession = { chatId: chat.id, agent };
  renderAgentList();
  agentUiRenderParticipants();
  renderInspector();
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
  renderAgentList();
  agentUiRenderParticipants();
  renderInspector();
  $("whisperBackdrop").classList.remove("visible");
  $("whisperInput").value = "";
}

function agentUiRenderWhispers(animateId = null) {
  agentUiFinishWhisperTyping();
  if (!openWhisperSession) return;
  const { chatId, agent } = openWhisperSession;
  const chat = findChat(chatId);
  const messages = chat?.whispers?.[agent] || [];
  const pending = chat?.pendingWhispers?.[agent] || [];
  $("whisperMessages").innerHTML = (messages.length || pending.length)
    ? messages.map(message => `
        <div class="whisper-line ${message.role === "You" ? "mine" : ""}">
          <strong>${escapeHtml(message.role)} · ${escapeHtml(formatTime(message.createdAt))}</strong>
          <div class="whisper-bubble ${message.id === animateId ? "typing-cursor" : ""}"
               id="whisper-bubble-${message.id}">${message.id === animateId ? "" : escapeHtml(message.text)}</div>
        </div>
      `).join("") + pending.map(entry => `
        <div class="whisper-line demo-thinking-whisper" data-pending-whisper="${escapeHtml(entry.id)}">
          <strong>${escapeHtml(agent)} · Typing…</strong>
          <div class="whisper-bubble demo-thinking-bubble" role="status"
               aria-label="${escapeHtml(agent)} is typing">
            ${demoTypingDots(agent)}
          </div>
        </div>
      `).join("")
    : '<div class="whisper-empty">No whispers yet. Start a private side conversation with this agent.</div>';

  const area = $("whisperMessages");
  area.scrollTop = area.scrollHeight;

  const msg = messages.find(m => m.id === animateId);
  if (!msg) return;
  const bubble = document.getElementById("whisper-bubble-" + msg.id);
  if (!bubble) return;
  if (!state.typewriter || !state.motionEnabled) {
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
  const replyHistory=chat.whispers[agent].slice(-8).map(m=>({role:m.role,text:m.text}));
  chat.whispers[agent].push(makeMessage("You", text));
  const pendingReply = makePendingReply(agent);
  chat.pendingWhispers ||= {};
  chat.pendingWhispers[agent] ||= [];
  chat.pendingWhispers[agent].push(pendingReply);
  agentUiPendingChanged(chatId, agent, 1);
  touchChat(chat);
  $("whisperInput").value = "";
  saveState();
  agentUiRenderWhispers();

  setTimeout(() => {
    agentUiPendingChanged(chatId, agent, -1);
    const destination = findChat(chatId);
    if (!destination) return;

    if (destination.pendingWhispers?.[agent]) {
      destination.pendingWhispers[agent] = destination.pendingWhispers[agent]
        .filter(pending => pending.id !== pendingReply.id);
    }

    if (destination.type !== "meeting" || !destination.participants.includes(agent)) {
      if (openWhisperSession?.chatId === chatId && openWhisperSession?.agent === agent) {
        agentUiRenderWhispers();
      }
      return;
    }
    destination.whispers ||= {};
    destination.whispers[agent] ||= [];
    const reply = makeMessage(agent, demonstrationReply(agent, text, replyHistory), { demo: true });
    destination.whispers[agent].push(reply);
    touchChat(destination);
    saveState();
    if (openWhisperSession?.chatId === chatId && openWhisperSession?.agent === agent) {
      agentUiRenderWhispers(reply.id);
    }
  }, demoReplyDelayMs());
}

let activeMention = null;
let mentionIndex = 0;

function agentUiDismissMention() {
  activeMention = null;
  mentionIndex = 0;
  const picker = $("mentionPicker");
  if (!picker) return;
  picker.classList.add("hidden");
  picker.innerHTML = "";
}

function agentUiUpdateMentions() {
  const input = $("messageInput");
  const chat = currentChat();
  if (!chat || input.disabled || $("modalBackdrop").classList.contains("visible")) {
    agentUiDismissMention();
    return;
  }
  const cursor = input.selectionStart;
  const before = input.value.slice(0, cursor);
  const match = /(?:^|[\s(])@([a-z]{0,})$/i.exec(before);
  if (!match) {
    agentUiDismissMention();
    return;
  }
  const partial = match[1].toUpperCase();
  const candidates = chat.participants.filter(agent => agent.startsWith(partial));
  if (!candidates.length) {
    agentUiDismissMention();
    return;
  }
  activeMention = {start:cursor-partial.length-1,end:cursor,candidates};
  mentionIndex = Math.min(mentionIndex, candidates.length-1);
  const picker = $("mentionPicker");
  picker.classList.remove("hidden");
  picker.innerHTML = `
    <div class="mention-heading">TAG AN AGENT IN THIS CONVERSATION</div>
    ${candidates.map((agent, index) => `
      <button type="button" role="option" data-mention-agent="${agent}"
              aria-selected="${index===mentionIndex}"
              class="mention-option ${index===mentionIndex?"selected":""}">
        ${agentUiPortrait(agent,true)}
        <span><strong>@${agent}</strong><small>${escapeHtml(AGENTS[agent].role)}</small></span>
      </button>
    `).join("")}
  `;
}

function agentUiInsertMention(agent) {
  if (!activeMention || !activeMention.candidates.includes(agent)) return;
  const input = $("messageInput");
  const {start,end} = activeMention;
  const replacement = "@" + agent + " ";
  input.value = input.value.slice(0,start) + replacement + input.value.slice(end);
  const cursor = start + replacement.length;
  input.focus();
  input.setSelectionRange(cursor,cursor);
  agentUiDismissMention();
  input.dispatchEvent(new Event("input",{bubbles:true}));
}

function agentUiHandleMentionKeydown(event) {
  if (!activeMention) return false;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    agentUiDismissMention();
    return true;
  }
  if (event.key==="ArrowDown" || event.key==="ArrowUp") {
    event.preventDefault();
    mentionIndex = (mentionIndex + (event.key==="ArrowDown"?1:-1) +
      activeMention.candidates.length) % activeMention.candidates.length;
    agentUiUpdateMentions();
    return true;
  }
  if ((event.key==="Enter" || event.key==="Tab") && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    agentUiInsertMention(activeMention.candidates[mentionIndex]);
    return true;
  }
  return false;
}

$("mentionPicker").addEventListener("mousedown",event=>event.preventDefault());
$("mentionPicker").addEventListener("click",event=>{
  const item=event.target.closest("[data-mention-agent]");
  if(item) agentUiInsertMention(item.dataset.mentionAgent);
});
$("messageInput").addEventListener("click",agentUiUpdateMentions);
$("messageInput").addEventListener("keyup",event=>{
  if(["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) agentUiUpdateMentions();
});

$("headerParticipants").addEventListener("click", event => {
  const button = event.target.closest("[data-portrait-agent]");
  if (!button) return;
  event.stopPropagation();
  const agent = button.dataset.portraitAgent;
  selectedParticipant = selectedParticipant === agent ? null : agent;
  agentUiRenderParticipants();
});

$("participantPopup").addEventListener("click", event => {
  const button = event.target.closest("[data-portrait-action]");
  if (!button || button.disabled) return;
  event.stopPropagation();
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
});

// Update presence in place: never rebuild conversations, menus or typing text
// when the Home background simulation or another workspace changes status.
window.GridPresence?.subscribe((snapshot,changed)=>{
  for(const node of document.querySelectorAll("[data-grid-presence-agent]")){
    const agent=node.dataset.gridPresenceAgent;if(!changed.includes(agent))continue;
    for(const item of AGENT_UI_STATUSES)node.classList.remove("presence-"+item.id);
    node.classList.add("presence-"+snapshot[agent].mode);
  }
  for(const node of document.querySelectorAll("[data-grid-presence-label]")){
    const agent=node.dataset.gridPresenceLabel;if(!changed.includes(agent))continue;
    node.textContent=snapshot[agent].label+(node.classList.contains("participant-status-label")?" · Demo":"");
  }
  for(const node of document.querySelectorAll("[data-portrait-agent]")){
    const agent=node.dataset.portraitAgent;if(!changed.includes(agent))continue;
    node.title=agent+" · "+snapshot[agent].label;
    node.setAttribute("aria-label","Options for "+agent+": "+snapshot[agent].label);
  }
});
render();
