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
      tile.draggable = true;
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
    if (!chat?.liveMeeting || stage.classList.contains("hidden")) return;
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
    const button = event.target.closest("[data-live-shift]");
    if (button) {
      shift(button.dataset.liveSortKey, button.dataset.liveShift);
    }
  });

  grid.addEventListener("keydown", event => {
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
    const tile = event.target.closest("[data-live-tile]");
    if (!tile || !currentChat()?.liveMeeting) return;
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
