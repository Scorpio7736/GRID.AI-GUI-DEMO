"use strict";

/*
  GRID.AI CONNECT v2
  Standalone browser-only prototype.

  No model, repository, OS, or network integration.
  Browser localStorage is the only demo persistence.
*/

const STORAGE_KEY = "gridai-connect-demo-v2";
const TYPEWRITER_MS_PER_CHAR = 18;

const AGENTS = {
  MCP: {
    role: "Coordinator",
    description: "Master Control Program",
    welcome: "I'm MCP, the Master Control Program. I coordinate requests, specialist agents, and reviewed task workflows."
  },
  MAXIS: {
    role: "Software development",
    description: "Software engineering specialist",
    welcome: "I'm MAXIS. I specialize in software engineering, debugging, repository inspection, and reviewed development workflows."
  },
  TRON: {
    role: "Security",
    description: "Security analyst",
    welcome: "I'm TRON. I focus on security observations, evidence, permission boundaries, and host protection status."
  },
  JN: {
    role: "Storage and files",
    description: "Storage and archival specialist",
    welcome: "I'm JN. I help reason about files, storage organization, archival workflows, and duplicate candidates."
  },
  VOLT: {
    role: "Resources",
    description: "Resource analyst",
    welcome: "I'm VOLT. I focus on system resource telemetry, performance, capacity, and simulation pacing."
  },
  RELAY: {
    role: "Communications",
    description: "Communications specialist",
    welcome: "I'm RELAY. I help with notifications, communication records, and task briefings."
  }
};

const ORDER = ["MCP", "MAXIS", "TRON", "JN", "VOLT", "RELAY"];

const $ = id => document.getElementById(id);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nowISO() {
  return new Date().toISOString();
}

function defaultState() {
  return {
    chats: [],
    currentId: null,
    nextId: 1,
    nextMessageId: 1,
    typewriter: true
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.chats)) return defaultState();

    const chats = parsed.chats.filter(chat =>
      chat &&
      Number.isInteger(chat.id) &&
      typeof chat.title === "string" &&
      Array.isArray(chat.participants) &&
      Array.isArray(chat.messages)
    );

    const maxId = Math.max(0, ...chats.map(c => c.id));
    const maxMessageId = Math.max(
      0,
      ...chats.flatMap(c => c.messages.map(m => Number(m.id) || 0))
    );

    return {
      chats,
      currentId: chats.some(c => c.id === parsed.currentId)
        ? parsed.currentId
        : (chats[0]?.id ?? null),
      nextId: Math.max(maxId + 1, Number(parsed.nextId) || 1),
      nextMessageId: Math.max(maxMessageId + 1, Number(parsed.nextMessageId) || 1),
      typewriter: parsed.typewriter !== false
    };
  } catch (error) {
    console.warn("Could not load demo history:", error);
    return defaultState();
  }
}

const state = {
  ...loadState(),
  search: "",
  openMenuId: null,
  modal: null
};

let activeAnimation = null;
let toastTimer = null;
const pendingReplyTimers = new Set();

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

function saveState() {
  const saved = {
    chats: state.chats,
    currentId: state.currentId,
    nextId: state.nextId,
    nextMessageId: state.nextMessageId,
    typewriter: state.typewriter
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    return true;
  } catch (error) {
    console.warn("Demo history could not be saved:", error);
    showToast("Browser storage unavailable. Changes may not survive reload.");
    return false;
  }
}

function currentChat() {
  return state.chats.find(c => c.id === state.currentId) || null;
}

function findChat(id) {
  return state.chats.find(c => c.id === id) || null;
}

function iconText(agent) {
  return {
    MCP: "MCP",
    MAXIS: "MX",
    TRON: "TR",
    JN: "JN",
    VOLT: "V",
    RELAY: "RL"
  }[agent] || "?";
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("visible");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 3000);
}

function makeMessage(role, text, extras = {}) {
  return {
    id: state.nextMessageId++,
    role,
    text,
    createdAt: nowISO(),
    ...extras
  };
}

function makeChat(title, type, participants, messages = []) {
  const timestamp = nowISO();

  return {
    id: state.nextId++,
    title,
    type,
    participants: [...participants],
    messages,
    approval: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function touchChat(chat) {
  chat.updatedAt = nowISO();
}

function formatTime(iso) {
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateTime(iso) {
  if (!iso) return "Unknown";

  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleString();
}

function renderChatList() {
  const query = state.search.trim().toLowerCase();

  const chats = [...state.chats]
    .sort((a, b) =>
      (b.updatedAt || "").localeCompare(a.updatedAt || "")
    )
    .filter(chat =>
      chat.title.toLowerCase().includes(query) ||
      chat.participants.some(p => p.toLowerCase().includes(query))
    );

  $("chatCount").textContent = state.chats.length;

  $("chatList").innerHTML = chats.map(chat => {
    const isMeeting = chat.type === "meeting";
    const selected = chat.id === state.currentId;
    const menuOpen = chat.id === state.openMenuId;

    const last = [...chat.messages]
      .reverse()
      .find(m => m.role && m.text);

    const preview = last
      ? last.text.replace(/\s+/g, " ").slice(0, 110)
      : "New conversation";

    return `
      <div class="chat-entry ${selected ? "active" : ""}"
           data-entry-id="${chat.id}">

        <div class="chat-top">
          <button class="chat-select" data-select-chat="${chat.id}"
                  title="${escapeHtml(chat.title)}">
            <div class="chat-icon ${isMeeting ? "meeting" : ""}">
              ${isMeeting ? "MT" : iconText(chat.participants[0])}
            </div>
            <div class="item-content">
              <div class="item-title">${escapeHtml(chat.title)}</div>
              <div class="item-sub">${escapeHtml(preview)}</div>
            </div>
          </button>

          <button class="chat-more" data-menu-chat="${chat.id}"
                  aria-label="Options for ${escapeHtml(chat.title)}"
                  aria-expanded="${menuOpen}"
                  aria-haspopup="menu">⋯</button>
        </div>

        ${menuOpen ? `
          <div class="chat-menu" role="menu">
            <button role="menuitem" data-chat-action="rename"
                    data-chat-id="${chat.id}">
              <span class="menu-icon">✎</span> Rename chat
            </button>
            <button role="menuitem" data-chat-action="txt"
                    data-chat-id="${chat.id}">
              <span class="menu-icon">TXT</span> Export context (.txt)
            </button>
            <button role="menuitem" data-chat-action="md"
                    data-chat-id="${chat.id}">
              <span class="menu-icon">MD</span> Export context (.md)
            </button>
            <div class="menu-divider"></div>
            <button role="menuitem" class="danger"
                    data-chat-action="delete"
                    data-chat-id="${chat.id}">
              <span class="menu-icon">×</span> Forget / Delete chat
            </button>
          </div>
        ` : ""}
      </div>
    `;
  }).join("") || `
    <div style="padding:13px;color:var(--muted);font-size:12px">
      ${query ? "No matching conversations." : "No conversations yet."}
    </div>
  `;
}

function renderAgentList() {
  $("agentList").innerHTML = ORDER.map(name => `
    <button class="agent-item" data-quick-agent="${name}">
      <div class="agent-icon">${iconText(name)}</div>
      <div class="item-content">
        <div class="item-title">${name}</div>
        <div class="agent-role">${escapeHtml(AGENTS[name].role)}</div>
      </div>
      <span style="color:var(--gold-dim);font-size:16px">+</span>
    </button>
  `).join("");
}

function finishTypewriter() {
  if (!activeAnimation) return;

  cancelAnimationFrame(activeAnimation.frame);

  const { bubble, fullText, indicator } = activeAnimation;
  bubble.textContent = fullText;
  bubble.classList.remove("typing-cursor");

  if (indicator) indicator.remove();

  activeAnimation = null;
}

function scrollToBottom() {
  const thread = $("thread");
  thread.scrollTop = thread.scrollHeight;
}

function animateTypewriter(messageId, fullText) {
  const bubble = document.getElementById("bubble-" + messageId);
  const indicator = document.getElementById("typing-" + messageId);

  if (!bubble) return;

  if (!state.typewriter || reducedMotion.matches) {
    bubble.textContent = fullText;
    if (indicator) indicator.remove();
    scrollToBottom();
    return;
  }

  finishTypewriter();

  bubble.textContent = "";
  bubble.classList.add("typing-cursor");

  const animation = {
    bubble,
    indicator,
    fullText,
    frame: 0,
    start: null
  };

  activeAnimation = animation;

  function draw(time) {
    if (activeAnimation !== animation) return;

    if (animation.start === null) animation.start = time;

    const elapsed = time - animation.start;
    const count = Math.min(
      fullText.length,
      Math.floor(elapsed / TYPEWRITER_MS_PER_CHAR) + 1
    );

    bubble.textContent = fullText.slice(0, count);
    scrollToBottom();

    if (count < fullText.length) {
      animation.frame = requestAnimationFrame(draw);
    } else {
      bubble.classList.remove("typing-cursor");
      if (indicator) indicator.remove();
      activeAnimation = null;
    }
  }

  animation.frame = requestAnimationFrame(draw);
}

function renderMessages(animateId = null) {
  finishTypewriter();

  const chat = currentChat();

  if (!chat) {
    $("messages").innerHTML = `
      <div class="empty-state">
        <div class="intro-symbol">◈</div>
        <h2>Welcome to Grid.AI Connect</h2>
        <p>
          Select an agent to begin a private conversation,
          or create a meeting with multiple Grid.AI agents.
        </p>
        <button class="primary-button" id="emptyNewChat">
          + New conversation
        </button>
      </div>
    `;
    return;
  }

  const symbol = chat.type === "meeting"
    ? "◈"
    : iconText(chat.participants[0]);

  const subtitle = chat.type === "meeting"
    ? "Shared agent meeting"
    : "Private agent conversation";

  let html = `
    <div class="conversation-intro">
      <div class="intro-symbol">${symbol}</div>
      <h2>${escapeHtml(chat.title)}</h2>
      <p>
        ${subtitle}. This standalone demo uses browser-local
        messages and scripted agent responses.
      </p>
    </div>
    <div class="session-divider">
      <span>Conversation preview</span>
    </div>
  `;

  for (const message of chat.messages) {
    if (message.kind === "divider") {
      html += `
        <div class="session-divider">
          <span>${escapeHtml(message.text)}</span>
        </div>
      `;
      continue;
    }

    if (message.kind === "notice") {
      html += `
        <div class="notice">${escapeHtml(message.text)}</div>
      `;
      continue;
    }

    const isUser = message.role === "You";
    const isAnimating = message.id === animateId &&
      !isUser && state.typewriter && !reducedMotion.matches;

    html += `
      <article class="message ${isUser ? "user" : ""}">
        <div class="message-avatar">
          ${isUser ? "YOU" : iconText(message.role)}
        </div>

        <div class="message-body">
          <div class="message-meta">
            <strong>${escapeHtml(message.role)}</strong>
            <span>${escapeHtml(formatTime(message.createdAt))}</span>
          </div>

          <div class="bubble" id="bubble-${message.id}">${
            isAnimating ? "" : escapeHtml(message.text)
          }</div>

          ${message.demo ? `
            <div class="message-note">
              DEMO RESPONSE · NOT MODEL GENERATED
            </div>
          ` : ""}

          ${isAnimating ? `
            <div class="typing-label" id="typing-${message.id}">
              ${escapeHtml(message.role)} is responding
              <button class="skip-button" data-skip-typewriter>
                Skip animation
              </button>
            </div>
          ` : ""}
        </div>
      </article>
    `;
  }

  if (chat.approval) {
    const status = chat.approval.status;

    html += `
      <div class="approval-card">
        <div class="eyebrow">DEMO / ACTION REVIEW</div>
        <h3>Run a registered development test</h3>
        <p>
          Example operation: run a scoped .NET test against
          an authorized workspace. No real task has been
          submitted to Grid.AI.
        </p>

        ${status === "pending" ? `
          <div class="actions">
            <button class="primary-button" data-approval="approved">
              Approve in demo
            </button>
            <button class="secondary-button" data-approval="rejected">
              Reject
            </button>
          </div>
        ` : `
          <div class="state">
            ${status === "approved"
              ? "Approved in prototype · Nothing executed"
              : "Rejected in prototype · Nothing executed"}
          </div>
        `}
      </div>
    `;
  }

  $("messages").innerHTML = html;

  if (animateId !== null) {
    const message = chat.messages.find(m => m.id === animateId);

    if (message) {
      animateTypewriter(message.id, message.text);
    }
  }

  requestAnimationFrame(scrollToBottom);
}

function renderInspector() {
  const chat = currentChat();

  $("infoType").textContent = !chat
    ? "None"
    : chat.type === "meeting" ? "Shared meeting" : "Private";

  $("participantList").innerHTML = chat
    ? chat.participants.map(name => `
        <div class="participant">
          <div class="agent-icon">${iconText(name)}</div>
          <div>
            <strong>${name}</strong>
            <small>${escapeHtml(AGENTS[name].role)}</small>
          </div>
        </div>
      `).join("")
    : `<div style="color:var(--muted);font-size:12px">
         No active conversation
       </div>`;

  $("privacyInfo").textContent = !chat
    ? "Select an agent or create a meeting."
    : chat.type === "meeting"
      ? "This meeting has its own shared transcript. Previous private conversation history is not automatically added when a new shared meeting is created."
      : "This conversation is scoped to its selected agent. Inviting specialists creates a fresh shared meeting without importing earlier private messages.";

  $("inviteButton").disabled = !chat ||
    !chat.participants.includes("MCP");

  $("demoApprovalButton").disabled = !chat;
}

function render() {
  const chat = currentChat();

  $("conversationTitle").textContent = chat
    ? chat.title : "Grid.AI Connect";

  $("conversationSubtitle").textContent = !chat
    ? "Choose a conversation"
    : chat.type === "meeting"
      ? chat.participants.join(" · ")
      : "Private conversation";

  $("messageInput").placeholder = !chat
    ? "Start a conversation first..."
    : chat.type === "meeting"
      ? "Message the meeting, or use @MAXIS..."
      : `Message ${chat.participants[0]}...`;

  $("messageInput").disabled = !chat;
  $("sendButton").disabled = !chat;

  $("typewriterToggle").textContent =
    state.typewriter ? "Typewriter ON" : "Typewriter OFF";

  $("typewriterToggle").classList.toggle(
    "enabled", state.typewriter
  );

  renderChatList();
  renderMessages();
  renderInspector();
}

function selectChat(id) {
  finishTypewriter();

  if (!findChat(id)) return;

  state.currentId = id;
  state.openMenuId = null;

  $("app").classList.remove("show-sidebar", "show-inspector");

  saveState();
  render();
}

/* CONVERSATION CREATION */

function createPrivateConversation(agent) {
  if (!AGENTS[agent]) return;

  const chat = makeChat(
    `${agent} · New conversation`,
    "private",
    [agent],
    []
  );

  chat.messages.push(makeMessage(agent, AGENTS[agent].welcome, {
    demo: true
  }));

  state.chats.unshift(chat);
  state.currentId = chat.id;
  state.openMenuId = null;

  saveState();
  render();

  const introId = chat.messages[0].id;
  renderMessages(introId);
  $("messageInput").focus();
}

function createMeeting(agents) {
  if (agents.length < 2 || agents.length > 6) return;

  const title = `Agent meeting · ${agents.join(", ")}`;

  const chat = makeChat(title, "meeting", agents);

  chat.messages.push(makeMessage(null,
    "New shared meeting · Demo",
    { kind: "divider" }
  ));

  const speaker = agents.includes("MCP") ? "MCP" : agents[0];

  chat.messages.push(makeMessage(
    speaker,
    `Meeting created with ${agents.join(", ")}.\n\nYou can direct questions to an agent using @NAME. Meeting messages are shared with selected participants. This is a UI demonstration.`,
    { demo: true }
  ));

  state.chats.unshift(chat);
  state.currentId = chat.id;
  state.openMenuId = null;

  saveState();
  render();

  const introId = chat.messages[chat.messages.length - 1].id;
  renderMessages(introId);

  $("messageInput").focus();
}

/* SCRIPTED DEMO CHAT */

function chooseAgent(message, chat) {
  if (chat.type === "private") {
    return chat.participants[0];
  }

  const directed = message.match(/@([A-Za-z]+)/);

  if (directed) {
    const target = directed[1].toUpperCase();

    if (!chat.participants.includes(target)) {
      return null;
    }

    return target;
  }

  const text = message.toLowerCase();
  const specialties = [
    ["MAXIS", /code|program|build|compile|test|debug|repository/],
    ["TRON", /security|firewall|virus|threat|defender/],
    ["JN", /file|storage|drive|archive|duplicate|folder/],
    ["VOLT", /cpu|gpu|ram|resource|performance|simulation/],
    ["RELAY", /notification|message|inbox|delivery|alert/],
    ["MCP", /plan|coordinate|task|workflow|agent/]
  ];

  for (const [name, pattern] of specialties) {
    if (chat.participants.includes(name) && pattern.test(text)) {
      return name;
    }
  }

  return chat.participants.includes("MCP")
    ? "MCP"
    : chat.participants[0];
}

function demonstrationReply(agent, message) {
  const text = message.toLowerCase();

  if (/\b(hello|hi|hey)\b/.test(text)) {
    return `Hello. I'm ${agent}, Grid.AI's ${AGENTS[agent].role.toLowerCase()} specialist.\n\nThis is a scripted response demonstrating the conversation interface.`;
  }

  if (/memory|remember|context/.test(text)) {
    return "Grid.AI's real architecture supports scoped persistent memory and conversation recall.\n\nThis HTML demonstration does not access those memories. You can export this conversation's context using its three-dot menu.";
  }

  if (/build|compile|code|test|debug/.test(text)) {
    return "I would begin by inspecting the registered workspace, reviewing relevant files and instructions, and preparing a bounded development plan.\n\nActual builds, edits, and verification require authorized host operations. This browser demo cannot execute or verify them.";
  }

  if (/permission|approve|access/.test(text)) {
    return "GRID separates access permissions from exact task and file-change approvals.\n\nA connected interface would display the host-validated operation, its scope, risk level, and consent requirements before execution.";
  }

  if (/status|system|health/.test(text)) {
    return "The Connect interface prototype is running.\n\nThe Grid.AI host is not connected, so real model status, simulation state, hardware telemetry, and security information are unavailable.";
  }

  if (/meeting|agent|coordinate/.test(text)) {
    return "MCP coordinates Grid.AI's specialist agents. Shared meetings contain selected participants, their conversation scope, and directed messages.\n\nThe graphical interface could also display task proposals, pending approvals, and verified results.";
  }

  return `As ${agent}, I would handle this through my ${AGENTS[agent].role.toLowerCase()} responsibilities.\n\nA connected implementation would provide a local-model response using authorized context. This response is scripted for the UI demonstration.`;
}

function sendMessage() {
  const input = $("messageInput");
  const text = input.value.trim();

  if (!text) return;

  if (text.length > 5000) {
    showToast("Demo messages are limited to 5,000 characters.");
    return;
  }

  const chat = currentChat();
  if (!chat) return;

  finishTypewriter();

  chat.messages.push(makeMessage("You", text, { demo: false }));
  touchChat(chat);

  input.value = "";
  input.style.height = "auto";

  const agent = chooseAgent(text, chat);
  const chatId = chat.id;

  if (!agent) {
    chat.messages.push(makeMessage(null,
      "That agent is not part of this meeting. Invite the agent before directing a message.",
      { kind: "notice" }
    ));

    saveState();
    render();
    return;
  }

  saveState();
  render();

  const timer = setTimeout(() => {
    pendingReplyTimers.delete(timer);

    const destination = findChat(chatId);
    if (!destination) return;

    const reply = makeMessage(
      agent,
      demonstrationReply(agent, text),
      { demo: true }
    );

    destination.messages.push(reply);
    touchChat(destination);

    saveState();

    if (state.currentId === chatId) {
      renderChatList();
      renderMessages(reply.id);
    } else {
      renderChatList();
    }
  }, 450);

  pendingReplyTimers.add(timer);
}

/* MODAL SYSTEM */

function openModal(type, chatId = null, preferredAgent = "MCP") {
  state.modal = { type, chatId };

  const chat = chatId !== null ? findChat(chatId) : currentChat();

  let title = "";
  let description = "";
  let button = "Confirm";
  let body = "";

  if (type === "new") {
    title = "New conversation";
    description = "Which Grid.AI agent would you like to speak with?";
    button = "Start conversation";

    body = ORDER.map(name => `
      <label class="modal-agent">
        <input type="radio" name="selectedAgent" value="${name}"
               ${name === preferredAgent ? "checked" : ""}>
        <div class="agent-icon">${iconText(name)}</div>
        <div>
          <strong>${name}</strong>
          <small>${escapeHtml(AGENTS[name].description)}</small>
        </div>
      </label>
    `).join("");
  }

  if (type === "meeting") {
    title = "Create agent meeting";
    description = "Select 2–6 agents for a new shared meeting.";
    button = "Create meeting";

    body = ORDER.map(name => `
      <label class="modal-agent">
        <input type="checkbox" name="meetingAgent" value="${name}"
               ${["MCP","MAXIS"].includes(name) ? "checked" : ""}>
        <div class="agent-icon">${iconText(name)}</div>
        <div>
          <strong>${name}</strong>
          <small>${escapeHtml(AGENTS[name].role)}</small>
        </div>
      </label>
    `).join("");
  }

  if (type === "invite" && chat) {
    title = "Invite agents";
    description = "Choose additional participants. A new shared conversation will be created without copying private history.";
    button = "Create shared meeting";

    body = ORDER.map(name => {
      const alreadyIncluded = chat.participants.includes(name);
      return `
        <label class="modal-agent">
          <input type="checkbox" name="inviteAgent" value="${name}"
                 ${alreadyIncluded ? "checked disabled" : ""}>
          <div class="agent-icon">${iconText(name)}</div>
          <div>
            <strong>${name}</strong>
            <small>${escapeHtml(AGENTS[name].role)}${
              alreadyIncluded ? " · Existing participant" : ""
            }</small>
          </div>
        </label>
      `;
    }).join("");
  }

  if (type === "rename" && chat) {
    title = "Rename conversation";
    description = "Enter a new name for this conversation.";
    button = "Save name";

    body = `
      <input class="modal-input" id="renameInput"
             maxlength="90"
             aria-label="Conversation name"
             value="${escapeHtml(chat.title)}">
    `;
  }

  if (type === "delete" && chat) {
    title = "Forget this conversation?";
    description = `You are about to delete "${chat.title}" from the standalone demo.`;
    button = "Delete conversation";

    body = `
      <div class="modal-warning">
        This removes the conversation and its messages from this
        browser's Grid.AI demo history.
        <br><br>
        This action cannot be undone. Export the conversation
        first if you want to keep its context.
        <br><br>
        It does not delete anything from the actual Grid.AI
        host, database, or repository.
      </div>
    `;
  }

  $("modalTitle").textContent = title;
  $("modalDescription").textContent = description;
  $("modalBody").innerHTML = body;
  $("modalError").textContent = "";
  $("confirmModal").textContent = button;

  $("confirmModal").className =
    type === "delete" ? "danger-button" : "primary-button";

  $("modalBackdrop").classList.add("visible");

  if (type === "rename") {
    setTimeout(() => {
      const input = $("renameInput");
      input?.focus();
      input?.select();
    }, 0);
  }
}

function closeModal() {
  $("modalBackdrop").classList.remove("visible");
  state.modal = null;
}

function modalError(message) {
  $("modalError").textContent = message;
}

function confirmModal() {
  if (!state.modal) return;

  const { type, chatId } = state.modal;
  const chat = chatId !== null ? findChat(chatId) : currentChat();

  if (type === "new") {
    const selected = document.querySelector(
      'input[name="selectedAgent"]:checked'
    );

    if (!selected) {
      modalError("Select an agent.");
      return;
    }

    closeModal();
    createPrivateConversation(selected.value);
    return;
  }

  if (type === "meeting") {
    const selected = [...document.querySelectorAll(
      'input[name="meetingAgent"]:checked'
    )].map(input => input.value);

    if (selected.length < 2 || selected.length > 6) {
      modalError("Select between 2 and 6 agents.");
      return;
    }

    closeModal();
    createMeeting(selected);
    return;
  }

  if (type === "invite") {
    if (!chat) return;

    const added = [...document.querySelectorAll(
      'input[name="inviteAgent"]:checked'
    )].map(input => input.value);

    if (!added.length) {
      modalError("Select at least one new participant.");
      return;
    }

    const combined = ORDER.filter(name =>
      chat.participants.includes(name) || added.includes(name)
    );

    if (combined.length < 2 || combined.length > 6) {
      modalError("A meeting must have between 2 and 6 agents.");
      return;
    }

    closeModal();
    createMeeting(combined);
    showToast("New shared meeting created. Private history was not imported.");
    return;
  }

  if (type === "rename") {
    if (!chat) return;

    const name = $("renameInput").value.trim();

    if (!name) {
      modalError("The conversation name cannot be empty.");
      return;
    }

    if (name.length > 90) {
      modalError("Use 90 characters or fewer.");
      return;
    }

    chat.title = name;
    touchChat(chat);

    closeModal();
    saveState();
    render();

    showToast("Conversation renamed.");
    return;
  }

  if (type === "delete") {
    if (!chat) return;

    const deletedId = chat.id;

    if (state.currentId === deletedId) {
      finishTypewriter();
    }

    state.chats = state.chats.filter(c => c.id !== deletedId);

    if (state.currentId === deletedId) {
      const next = [...state.chats]
        .sort((a, b) =>
          (b.updatedAt || "").localeCompare(a.updatedAt || "")
        )[0];

      state.currentId = next?.id ?? null;
    }

    state.openMenuId = null;

    closeModal();
    saveState();
    render();

    showToast("Conversation deleted from local demo history.");
  }
}

/* CONTEXT FILE GENERATION */

function sanitizedFilename(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 65) || "conversation";
}

function exportContext(chatId, format) {
  const chat = findChat(chatId);
  if (!chat) return;

  if (!["txt", "md"].includes(format)) return;

  const exportedAt = nowISO();
  const isMarkdown = format === "md";

  const details = [
    ["Conversation", chat.title],
    ["Type", chat.type === "meeting" ? "Agent meeting" : "Private conversation"],
    ["Participants", chat.participants.join(", ")],
    ["Created", formatDateTime(chat.createdAt)],
    ["Last updated", formatDateTime(chat.updatedAt)],
    ["Exported", formatDateTime(exportedAt)],
    ["Source", "Grid.AI Connect standalone browser demo"],
    ["Backend verification", "None — demonstration content"]
  ];

  let content = "";

  if (isMarkdown) {
    content += `# ${chat.title.replace(/\r?\n/g, " ")}\n\n`;
    content += `## Conversation information\n\n`;

    for (const [key, value] of details) {
      content += `**${key}:** ${String(value).replace(/\r?\n/g, " ")}\n\n`;
    }

    content += `> This file contains a browser-local demonstration transcript. Scripted agent replies are not verified model or host output.\n\n`;
    content += `## Transcript\n\n`;

    for (const message of chat.messages) {
      if (message.kind === "divider") {
        content += `---\n\n**Session event:** ${message.text}\n\n`;
        continue;
      }

      if (message.kind === "notice") {
        content += `**Notice:** ${message.text}\n\n`;
        continue;
      }

      const time = formatDateTime(message.createdAt);
      const label = message.demo
        ? " (scripted demo response)"
        : "";

      content += `### ${message.role}${label} — ${time}\n\n`;

      // Use an adaptive fence so user-written backticks
      // cannot prematurely terminate a Markdown code block.
      const runs = message.text.match(/`+/g) || [];
      const longest = Math.max(2, ...runs.map(r => r.length));
      const fence = "`".repeat(longest + 1);

      content += `${fence}text\n${message.text}\n${fence}\n\n`;
    }

    if (chat.approval) {
      content += `## Demonstration action review\n\n`;
      content += `Status: ${chat.approval.status}\n\n`;
      content += `No host operation was executed.\n`;
    }
  } else {
    content += "GRID.AI CONNECT — CONVERSATION CONTEXT\n";
    content += "=".repeat(47) + "\n\n";

    for (const [key, value] of details) {
      content += `${key}: ${value}\n`;
    }

    content += "\n";
    content += "NOTE: Demo content. No model or host verification.\n";
    content += "\n" + "=".repeat(47) + "\n";
    content += "TRANSCRIPT\n";
    content += "=".repeat(47) + "\n\n";

    for (const message of chat.messages) {
      if (message.kind === "divider") {
        content += `--- ${message.text} ---\n\n`;
        continue;
      }

      if (message.kind === "notice") {
        content += `[NOTICE] ${message.text}\n\n`;
        continue;
      }

      content += `[${formatDateTime(message.createdAt)}] ${message.role}`;
      if (message.demo) content += " [SCRIPTED DEMO]";
      content += `\n${message.text}\n\n`;
      content += "-".repeat(47) + "\n\n";
    }

    if (chat.approval) {
      content += `DEMO ACTION REVIEW: ${chat.approval.status}\n`;
      content += `No host operation was executed.\n`;
    }
  }

  const blob = new Blob([content], {
    type: isMarkdown
      ? "text/markdown;charset=utf-8"
      : "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  const stamp = new Date().toISOString().slice(0, 10);

  anchor.href = url;
  anchor.download =
    `GridAI_${sanitizedFilename(chat.title)}_${stamp}.${format}`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  state.openMenuId = null;
  renderChatList();
  showToast(`Context exported as ${format.toUpperCase()}.`);
}

/* CHAT MENU ACTIONS */

function handleChatAction(action, id) {
  const chat = findChat(id);
  if (!chat) return;

  state.openMenuId = null;

  switch (action) {
    case "rename":
      openModal("rename", id);
      renderChatList();
      break;

    case "txt":
      exportContext(id, "txt");
      break;

    case "md":
      exportContext(id, "md");
      break;

    case "delete":
      openModal("delete", id);
      renderChatList();
      break;
  }
}

/* APPROVAL DEMONSTRATION */

function showApprovalExample() {
  const chat = currentChat();
  if (!chat) return;

  chat.approval = { status: "pending" };

  saveState();
  renderMessages();

  $("app").classList.remove("show-inspector");
  showToast("Demonstration approval ready for review.");
}

function updateApproval(status) {
  const chat = currentChat();
  if (!chat?.approval) return;

  chat.approval.status = status;
  touchChat(chat);

  saveState();
  renderMessages();

  showToast(
    status === "approved"
      ? "Approved in demo. No operation executed."
      : "Example request rejected."
  );
}

/* EVENTS */

$("newChatButton").addEventListener("click", () => {
  openModal("new");
});

$("meetingButton").addEventListener("click", () => {
  openModal("meeting");
});

$("newMeetingRight").addEventListener("click", () => {
  openModal("meeting");
});

$("inviteButton").addEventListener("click", () => {
  const chat = currentChat();
  if (chat) openModal("invite", chat.id);
});

$("sendButton").addEventListener("click", sendMessage);

$("messageInput").addEventListener("keydown", event => {
  if (event.key === "Enter" &&
      !event.shiftKey &&
      !event.isComposing) {
    event.preventDefault();
    sendMessage();
  }
});

$("messageInput").addEventListener("input", event => {
  const input = event.target;
  input.style.height = "auto";
  input.style.height =
    Math.min(input.scrollHeight, 170) + "px";
});

$("typewriterToggle").addEventListener("click", () => {
  state.typewriter = !state.typewriter;

  if (!state.typewriter) finishTypewriter();

  saveState();

  $("typewriterToggle").textContent =
    state.typewriter ? "Typewriter ON" : "Typewriter OFF";

  $("typewriterToggle").classList.toggle(
    "enabled", state.typewriter
  );

  showToast(
    state.typewriter
      ? "Typewriter responses enabled."
      : "Typewriter responses disabled."
  );
});

$("chatSearch").addEventListener("input", event => {
  state.search = event.target.value;
  state.openMenuId = null;
  renderChatList();
});

$("chatList").addEventListener("click", event => {
  const select = event.target.closest("[data-select-chat]");
  const menu = event.target.closest("[data-menu-chat]");
  const action = event.target.closest("[data-chat-action]");

  if (action) {
    handleChatAction(
      action.dataset.chatAction,
      Number(action.dataset.chatId)
    );
    return;
  }

  if (menu) {
    const id = Number(menu.dataset.menuChat);

    state.openMenuId = state.openMenuId === id
      ? null
      : id;

    renderChatList();
    return;
  }

  if (select) {
    selectChat(Number(select.dataset.selectChat));
  }
});

$("agentList").addEventListener("click", event => {
  const item = event.target.closest("[data-quick-agent]");
  if (!item) return;

  openModal("new", null, item.dataset.quickAgent);
});

$("messages").addEventListener("click", event => {
  if (event.target.closest("#emptyNewChat")) {
    openModal("new");
    return;
  }

  if (event.target.closest("[data-skip-typewriter]")) {
    finishTypewriter();
    return;
  }

  const approval = event.target.closest("[data-approval]");
  if (approval) {
    updateApproval(approval.dataset.approval);
  }
});

$("demoApprovalButton").addEventListener(
  "click", showApprovalExample
);

$("menuButton").addEventListener("click", () => {
  $("app").classList.toggle("show-sidebar");
  $("app").classList.remove("show-inspector");
});

$("inspectorButton").addEventListener("click", () => {
  $("app").classList.toggle("show-inspector");
  $("app").classList.remove("show-sidebar");
});

$("closeInspector").addEventListener("click", () => {
  $("app").classList.remove("show-inspector");
});

$("cancelModal").addEventListener("click", closeModal);
$("confirmModal").addEventListener("click", confirmModal);

$("modalBackdrop").addEventListener("click", event => {
  if (event.target === $("modalBackdrop")) {
    closeModal();
  }
});

$("modalBody").addEventListener("keydown", event => {
  if (event.key === "Enter" &&
      state.modal?.type === "rename") {
    event.preventDefault();
    confirmModal();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (state.modal) {
      closeModal();
    } else if (activeAnimation) {
      finishTypewriter();
    } else {
      state.openMenuId = null;
      $("app").classList.remove(
        "show-sidebar", "show-inspector"
      );
      renderChatList();
    }
  }
});

document.addEventListener("click", event => {
  if (state.openMenuId !== null &&
      !event.target.closest(".chat-entry")) {
    state.openMenuId = null;
    renderChatList();
  }
});

/* STARTUP */

renderAgentList();
render();
