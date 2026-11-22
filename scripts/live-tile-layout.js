"use strict";

/* GRID.AI Connect — square, user-sortable Live Meeting tiles.
   No additional conversation is created and no media API is used. */
(function () {
  const grid = document.getElementById("liveParticipantGrid");
  const stage = document.getElementById("liveMeetingStage");
  if (!grid || !stage) return;

  const YOU = "__you__";
  const GAP = 12;
  const MIN_SIZE = 132;
  const MAX_SIZE = 330;
  let dragging = null;
  let openMenuAgent = null;
  let openMenuChatId = null;
  const pendingDepartures = new Map();
  const DEPARTURE_MS = 420;

  function findAgentTile(agent) {
    return [...grid.querySelectorAll("[data-live-agent]")]
      .find(tile => tile.dataset.liveAgent === agent) || null;
  }

  function closeAgentMenu(restoreFocus = false) {
    if (!openMenuAgent) return;
    const agent = openMenuAgent;
    const tile = findAgentTile(agent);
    const trigger = tile?.querySelector(".live-cell-more");
    const menu = tile?.querySelector(".live-cell-menu");
    if (menu) menu.hidden = true;
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    tile?.classList.remove("live-cell-menu-open");
    openMenuAgent = null;
    openMenuChatId = null;
    if (restoreFocus && trigger) trigger.focus();
  }

  function toggleAgentMenu(agent) {
    const chat = currentChat();
    if (!chat?.liveMeeting || chat.type !== "meeting" ||
        !chat.participants.includes(agent)) return;
    if (openMenuAgent === agent && openMenuChatId === chat.id) {
      closeAgentMenu(true);
      return;
    }
    closeAgentMenu();
    const tile = findAgentTile(agent);
    const trigger = tile?.querySelector(".live-cell-more");
    const menu = tile?.querySelector(".live-cell-menu");
    if (!trigger || !menu) return;
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    tile.classList.add("live-cell-menu-open");
    openMenuAgent = agent;
    openMenuChatId = chat.id;
    menu.querySelector("button")?.focus();
  }

  function addAgentMenu(tile, agent) {
    if (tile.querySelector(".live-cell-more")) return;
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "live-cell-more";
    trigger.textContent = "⋯";
    trigger.dataset.liveMore = agent;
    trigger.title = "Participant options for " + agent;
    trigger.setAttribute("aria-label", "Options for " + agent);
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");

    const menu = document.createElement("div");
    menu.className = "live-cell-menu";
    menu.hidden = true;
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", agent + " participant actions");

    const options = [
      ["remove", "Remove from meeting"],
      ["whisper", "Whisper to " + agent],
      ["move", "Move to new chat"]
    ];
    for (const [action, label] of options) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.className = "live-cell-menu-action" +
        (action === "remove" ? " danger" : "");
      button.dataset.liveMenuAction = action;
      button.dataset.liveMenuAgent = agent;
      button.setAttribute("role", "menuitem");
      menu.appendChild(button);
    }
    tile.append(trigger, menu);
  }

  // The same participant state/action path is used by the header and tile
  // menus. No duplicate removal implementation or extra meeting is created.
  window.demoAnimateLiveRemoval = (chatId, agent, complete) => {
    const chat = currentChat();
    if (!chat?.liveMeeting || chat.id !== chatId ||
        !chat.participants.includes(agent) || !state.motionEnabled) return false;
    const key = chatId + ":" + agent;
    if (pendingDepartures.has(key)) return true;
    const tile = findAgentTile(agent);
    if (!tile) return false;
    closeAgentMenu();
    tile.classList.remove("is-joining");
    tile.classList.add("is-leaving");
    tile.draggable = false;
    const timer = setTimeout(() => {
      pendingDepartures.delete(key);
      complete();
    }, DEPARTURE_MS);
    pendingDepartures.set(key, {timer, complete});
    return true;
  };

  function finishPendingDepartures() {
    const departures = [...pendingDepartures.values()];
    pendingDepartures.clear();
    for (const departure of departures) {
      clearTimeout(departure.timer);
      departure.complete();
    }
  }

  function keysFor(chat) {
    if (!chat) return [];
    const available = [...chat.participants.filter(agent => AGENTS[agent]), YOU];
    const saved = Array.isArray(chat.liveTileOrder) ? chat.liveTileOrder : [];
    const keys = [...new Set(saved.filter(key => available.includes(key)))];
    for (const key of available) if (!keys.includes(key)) keys.push(key);
    chat.liveTileOrder = keys;
    return keys;
  }

  function makeArrow(label, key, direction, text) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "live-tile-shift";
    button.textContent = text;
    button.dataset.liveShift = direction;
    button.dataset.liveSortKey = key;
    button.title = direction === "back" ? "Move earlier" : "Move later";
    button.setAttribute("aria-label", "Move " + label + " " +
      (direction === "back" ? "earlier" : "later"));
    return button;
  }

  function enhanceTiles() {
    grid.querySelectorAll(".live-participant-tile").forEach(tile => {
      const key = tile.dataset.liveAgent || YOU;
      tile.dataset.liveTile = key;
      tile.draggable = !tile.classList.contains("is-leaving");
      if (key !== YOU) {
        addAgentMenu(tile, key);
        const trigger = tile.querySelector(".live-cell-more");
        if (trigger) {
          trigger.disabled = currentChat()?.type !== "meeting";
          trigger.title = trigger.disabled
            ? "Participant actions are available in shared meetings"
            : "Participant options for " + key;
        }
      }
      if (tile.querySelector(".live-tile-sort-controls")) return;
      const label = key === YOU ? "your tile" : key;
      const controls = document.createElement("div");
      controls.className = "live-tile-sort-controls";
      const grip = document.createElement("span");
      grip.className = "live-tile-drag-grip";
      grip.textContent = "⠿";
      grip.title = "Drag this tile to reorder";
      grip.setAttribute("aria-hidden", "true");
      controls.append(
        grip,
        makeArrow(label, key, "back", "‹"),
        makeArrow(label, key, "forward", "›")
      );
      tile.prepend(controls);
    });
  }

  function fitSquares() {
    const chat = currentChat();
    if (!chat?.liveMeeting || stage.classList.contains("hidden")) return;
    const width = grid.clientWidth;
    const height = grid.clientHeight;
    if (!width || !height) return;
    const count = keysFor(chat).length;
    let columns = 1, size = 0;
    const maxColumns = Math.min(count, 5);

    // Choose the largest square that fits the currently visible stage.
    for (let cols = 1; cols <= maxColumns; cols++) {
      const rows = Math.ceil(count / cols);
      const candidate = Math.min(MAX_SIZE,
        (width - (cols - 1) * GAP) / cols,
        (height - (rows - 1) * GAP) / rows);
      if (candidate > size + .5) {
        size = candidate;
        columns = cols;
      }
    }

    // Prefer legible squares to shrinking everything on short displays.
    // Extra rows remain scrollable inside the stage.
    if (size < MIN_SIZE) {
      columns = Math.min(maxColumns, Math.max(1,
        Math.floor((width + GAP) / (MIN_SIZE + GAP))));
      size = Math.min(MAX_SIZE, (width - (columns - 1) * GAP) / columns);
    }
    const rounded = Math.max(1, Math.floor(size));
    const nextCols = String(columns);
    const nextSize = rounded + "px";
    if (grid.style.getPropertyValue("--live-grid-columns") !== nextCols) {
      grid.style.setProperty("--live-grid-columns", nextCols);
    }
    if (grid.style.getPropertyValue("--live-tile-size") !== nextSize) {
      grid.style.setProperty("--live-tile-size", nextSize);
    }
    grid.classList.toggle("is-compact", rounded < 175);
    grid.classList.toggle("is-micro", rounded < 135);
  }

  function syncTiles() {
    const chat = currentChat();
    if (!chat?.liveMeeting || stage.classList.contains("hidden")) {
      closeAgentMenu();
      return;
    }
    if (openMenuAgent && (openMenuChatId !== chat.id ||
        !chat.participants.includes(openMenuAgent) ||
        !findAgentTile(openMenuAgent)?.querySelector(".live-cell-menu"))) {
      closeAgentMenu();
    }
    enhanceTiles();
    const order = keysFor(chat);
    const tiles = [...grid.querySelectorAll("[data-live-tile]")];
    const byKey = new Map(tiles.map(tile => [tile.dataset.liveTile, tile]));
    // Only move actual nodes when required. This preserves speaking/join
    // animations, focus and event listeners across ordinary chat renders.
    const current = tiles.map(tile => tile.dataset.liveTile);
    if (order.join("|") !== current.join("|")) {
      order.forEach(key => {
        const tile = byKey.get(key);
        if (tile) grid.appendChild(tile);
      });
    }
    fitSquares();
  }

  function reorder(key, destination) {
    const chat = currentChat();
    if (!chat?.liveMeeting) return;
    const order = [...keysFor(chat)];
    const sourceIndex = order.indexOf(key);
    const targetIndex = order.indexOf(destination);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    order.splice(sourceIndex, 1);
    order.splice(targetIndex, 0, key);
    chat.liveTileOrder = order;
    syncTiles();
  }

  function shift(key, direction) {
    const order = keysFor(currentChat());
    const index = order.indexOf(key);
    const nextIndex = index + (direction === "forward" ? 1 : -1);
    if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return;
    reorder(key, order[nextIndex]);
  }

  grid.addEventListener("click", event => {
    const more = event.target.closest("[data-live-more]");
    if (more) {
      event.stopPropagation();
      toggleAgentMenu(more.dataset.liveMore);
      return;
    }
    const option = event.target.closest("[data-live-menu-action]");
    if (option) {
      event.stopPropagation();
      const agent = option.dataset.liveMenuAgent;
      const action = option.dataset.liveMenuAction;
      closeAgentMenu();
      agentUiParticipantAction(action, agent);
      return;
    }
    const button = event.target.closest("[data-live-shift]");
    if (button) {
      closeAgentMenu();
      shift(button.dataset.liveSortKey, button.dataset.liveShift);
    }
  });

  grid.addEventListener("keydown", event => {
    if (event.key === "Escape" && openMenuAgent) {
      event.preventDefault();
      event.stopPropagation();
      closeAgentMenu(true);
      return;
    }
    const menuButton = event.target.closest("[data-live-menu-action]");
    if (menuButton && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const menu = menuButton.closest(".live-cell-menu");
      const options = [...menu.querySelectorAll('[role="menuitem"]')];
      const index = options.indexOf(menuButton);
      const next = event.key === "Home" ? 0
        : event.key === "End" ? options.length - 1
        : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      options[next]?.focus();
      return;
    }
    const button = event.target.closest("[data-live-shift]");
    if (!button) return;
    const step = {
      ArrowLeft: "back", ArrowUp: "back",
      ArrowRight: "forward", ArrowDown: "forward"
    }[event.key];
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    if (step) shift(button.dataset.liveSortKey, step);
    else {
      const order = keysFor(currentChat());
      reorder(button.dataset.liveSortKey,
        event.key === "Home" ? order[0] : order[order.length - 1]);
    }
  });

  function resetDrag() {
    grid.querySelectorAll(".is-dragging, .is-drop-target").forEach(tile =>
      tile.classList.remove("is-dragging", "is-drop-target"));
    dragging = null;
  }

  grid.addEventListener("dragstart", event => {
    if (event.target.closest(".live-cell-more, .live-cell-menu, .live-tile-shift")) {
      event.preventDefault();
      return;
    }
    const tile = event.target.closest("[data-live-tile]");
    if (!tile || !currentChat()?.liveMeeting || tile.classList.contains("is-leaving")) return;
    closeAgentMenu();
    dragging = tile.dataset.liveTile;
    tile.classList.add("is-dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragging);
    }
  });
  grid.addEventListener("dragover", event => {
    const tile = event.target.closest("[data-live-tile]");
    if (!tile || !dragging || tile.dataset.liveTile === dragging) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    grid.querySelectorAll(".is-drop-target").forEach(target =>
      target.classList.remove("is-drop-target"));
    tile.classList.add("is-drop-target");
  });
  grid.addEventListener("drop", event => {
    const tile = event.target.closest("[data-live-tile]");
    if (!tile || !dragging) return;
    event.preventDefault();
    const from = dragging;
    const to = tile.dataset.liveTile;
    resetDrag();
    reorder(from, to);
  });
  grid.addEventListener("dragend", resetDrag);

  // Dismiss menus outside their tile and when switching presentation modes.
  document.addEventListener("click", event => {
    if (!event.target.closest(".live-cell-more, .live-cell-menu")) {
      closeAgentMenu();
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeAgentMenu();
  });
  document.getElementById("motionToggle")?.addEventListener("click", () => {
    if (!state.motionEnabled) {
      closeAgentMenu();
      finishPendingDepartures();
    }
  });

  // Hook the completed, existing Live Meeting renderer. Invite/join
  // animations remain owned by the original script and keep working.
  const previousRender = render;
  render = function (...args) {
    previousRender(...args);
    syncTiles();
  };

  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(fitSquares).observe(grid);
  }
  window.addEventListener("resize", fitSquares);
  syncTiles();
})();
