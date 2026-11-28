"use strict";

/*
  GRID.AI Connect — optional, short, original UI sound effects.
  No music, loops, recorded voice, remote assets, microphones or camera APIs.
  Web Audio is initialized only after an actual pointer/keyboard gesture.
*/
(function () {
  const button = document.getElementById("soundToggle");
  const settings = window.GridSettings;
  if (!button && !settings) return;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  const available = typeof AudioCtor === "function";
  let enabled = available && (settings?.get().sounds ?? true);
  let volume = (settings?.get().volume ?? 67)/100;
  let context = null;
  let master = null;
  let lastImportantAt = -Infinity;
  const lastByEvent = new Map();

  // [startSeconds, startHz, endHz, durationSeconds, gain, waveform].
  // All effects are under half a second; oscillators are stopped afterward.
  const cues = Object.freeze({
    invite: [
      [0, 530, 630, .105, .043, "sine"],
      [.09, 790, 860, .125, .034, "triangle"]
    ],
    join: [
      [0, 370, 420, .135, .052, "triangle"],
      [.105, 555, 610, .15, .047, "sine"],
      [.215, 785, 890, .18, .041, "sine"]
    ],
    leave: [
      [0, 720, 630, .135, .047, "sine"],
      [.105, 510, 350, .18, .038, "triangle"]
    ],
    sent: [[0, 680, 820, .075, .025, "sine"]],
    received: [
      [0, 730, 790, .07, .028, "sine"],
      [.075, 880, 820, .095, .021, "sine"]
    ],
    notification: [
      [0, 700, 760, .095, .043, "sine"],
      [.13, 925, 1000, .12, .036, "sine"]
    ],
    approval: [
      [0, 585, 615, .12, .046, "triangle"],
      [.15, 750, 810, .17, .049, "sine"],
      [.32, 640, 710, .115, .033, "sine"]
    ],
    approved: [
      [0, 465, 525, .105, .04, "sine"],
      [.105, 640, 700, .135, .042, "triangle"],
      [.23, 845, 930, .17, .036, "sine"]
    ],
    rejected: [
      [0, 460, 420, .125, .044, "triangle"],
      [.115, 350, 280, .2, .036, "sine"]
    ],
    "meeting-enter": [
      [0, 260, 520, .21, .043, "triangle"],
      [.145, 700, 870, .2, .03, "sine"]
    ],
    "meeting-exit": [
      [0, 720, 460, .19, .04, "triangle"],
      [.125, 430, 275, .155, .027, "sine"]
    ],
    panel: [[0, 510, 650, .07, .016, "sine"]],
    enabled: [[0, 680, 850, .13, .035, "sine"]],
    error: [[0, 350, 285, .17, .03, "triangle"]]
  });

  function updateButton() {
    if (!button) return;
    button.textContent = enabled ? "♫ Sounds ON" : "♪ Sounds OFF";
    button.classList.toggle("enabled", enabled);
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute("aria-label", enabled ? "Mute interface sounds" : "Enable interface sounds");
    button.title = available
      ? enabled
        ? "Mute short demo interface sound effects"
        : "Enable short demo interface sound effects"
      : "Web Audio is unavailable in this browser";
    button.disabled = !available;
    if (!available) button.textContent = "Sounds unavailable";
  }

  function unlock() {
    if (!enabled || !available) return;
    try {
      if (!context) {
        context = new AudioCtor();
        master = context.createGain();
        master.gain.value = enabled ? volume : 0;
        master.connect(context.destination);
      }
      if (context.state === "suspended") {
        const result = context.resume();
        if (result && typeof result.catch === "function") result.catch(() => {});
      }
    } catch {
      // Audio may be blocked by browser/device settings. The demo continues.
    }
  }

  function tone(start, hz, endHz, duration, gain, waveform) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const at = context.currentTime + start;
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(hz, at);
    oscillator.frequency.exponentialRampToValueAtTime(endHz, at + duration);
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(gain, at + Math.min(.015, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(at);
    oscillator.stop(at + duration + .02);
  }

  function play(name) {
    if (!enabled || !context || !cues[name]) return false;
    if (context.state === "suspended") {
      context.resume().then(() => { if (enabled && context.state === "running") play(name); }).catch(() => {});
      return true;
    }
    if (context.state !== "running") return false;

    const now = performance.now();
    // A join/leave/approval cue already communicates the event. Do not stack
    // an additional generic notification over that same occasion.
    if (name === "notification" && now - lastImportantAt < 700) return false;
    if (now - (lastByEvent.get(name) ?? -Infinity) < (name === "panel" ? 120 : 180)) {
      return false;
    }
    lastByEvent.set(name, now);
    if (!["sent", "received", "panel", "notification", "enabled"].includes(name)) {
      lastImportantAt = now;
    }

    try {
      for (const note of cues[name]) tone(...note);
      return true;
    } catch {
      return false;
    }
  }

  // Starting AudioContext only on genuine interaction respects autoplay
  // restrictions; page load and automatic initial rendering stay silent.
  const gesture = event => {
    if (event.isTrusted === false) return;
    unlock();
  };
  document.addEventListener("pointerdown", gesture, {capture: true});
  document.addEventListener("keydown", gesture, {capture: true});

  button?.addEventListener("click", () => {
    if (!available) return;
    enabled = !enabled;
    updateButton();
    if (!enabled && context && master) {
      master.gain.setTargetAtTime(0, context.currentTime, .012);
    } else if (enabled) {
      unlock();
      if (master && context) master.gain.setTargetAtTime(volume, context.currentTime, .012);
      play("enabled");
    }
  });

  settings?.subscribe(value => {
    enabled=available&&value.sounds;volume=value.volume/100;
    if(master&&context)master.gain.setTargetAtTime(enabled?volume:0,context.currentTime,.012);
    updateButton();
  });
  window.gridUiSound = play;
  window.gridTestSound = () => {unlock();return play("notification");};
  updateButton();
})();
