"use strict";
/* Home launches a local demo conversation, never sends the user's draft. */
(() => {
  const params = new URLSearchParams(location.hash.slice(1));
  const agent = params.get("agent");
  if (!agent || !Object.prototype.hasOwnProperty.call(AGENTS, agent)) return;
  const draft = (params.get("draft") || "").slice(0, 5000);
  try { history.replaceState(history.state, "", location.pathname + location.search); }
  catch { /* Some file:// browsers restrict history changes. */ }
  createPrivateConversation(agent);
  const input = document.getElementById("messageInput");
  if (input && draft) {
    input.value = draft;
    input.dispatchEvent(new Event("input", {bubbles:true}));
    input.focus();
  }
})();
