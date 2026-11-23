"use strict";

/*
  GRID.AI Agentic Workflow Designer — browser-only concept prototype.
  MCP suggestions are deterministic demos, not model inference.
  Nothing reads user files, calls an API, schedules a task, or runs agents.
*/
(function () {
  const $ = id => document.getElementById(id);
  const AGENTS = Object.freeze({
    SYSTEM: "System event", MCP: "Master Control Program",
    MAXIS: "Software engineering", TRON: "Security",
    JN: "Files and storage", VOLT: "Resources",
    RELAY: "Communications", HUMAN: "Master Control approval"
  });
  const KINDS = Object.freeze({
    trigger: {icon: "◉", label: "TRIGGER"},
    process: {icon: "◇", label: "PROCESS"},
    approval: {icon: "◆", label: "APPROVAL"},
    action: {icon: "↗", label: "OUTPUT"}
  });
  const state = {flow: null, selectedStepId: null, revision: 0, nextStepId: 1, pendingReply: false, runTimer: null, runToken: 0, savedWorkflows: [], currentSavedId: null, dirty: false};
  let toastTimer = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function notify(text) {
    const toast = $("studioToast");
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }


  // Saved blueprints persist across refreshes in this browser only.
  // "Active" is a UI preview status, never a real agent or scheduled task.
  const WORKFLOW_STORAGE_KEY = "gridai-workflow-designer-library-v1";
  const MAX_LIBRARY_ENTRIES = 24;

  function readWorkflowLibrary() {
    try {
      const value = JSON.parse(window.localStorage.getItem(WORKFLOW_STORAGE_KEY) || "null");
      if (!value || value.version !== 1 || !Array.isArray(value.workflows)) return [];
      return value.workflows.filter(item =>
        item && typeof item.id === "string" &&
        typeof item.name === "string" &&
        (item.status === "active" || item.status === "saved") &&
        item.flow && typeof item.flow === "object" &&
        typeof item.flow.trigger === "string" &&
        Array.isArray(item.flow.steps) && item.flow.steps.length > 0 &&
        item.flow.steps.length <= 200 &&
        item.flow.steps.every(step => step && typeof step.id === "string" &&
          typeof step.kind === "string" && KINDS[step.kind] &&
          typeof step.title === "string" && typeof step.description === "string" &&
          typeof step.agent === "string" &&
          (!step.skill || (typeof step.skill.filename === "string" &&
            typeof step.skill.text === "string" && step.skill.text.length <= 70000 &&
            Number.isFinite(step.skill.bytes) && step.skill.bytes <= MAX_SKILL_BYTES)))
      ).slice(0, MAX_LIBRARY_ENTRIES);
    } catch {
      return [];
    }
  }

  function storeWorkflowLibrary(next) {
    try {
      window.localStorage.setItem(WORKFLOW_STORAGE_KEY,
        JSON.stringify({version: 1, workflows: next}));
    } catch {
      notify("Unable to save: browser storage is unavailable or full.");
      return false;
    }
    state.savedWorkflows = next;
    return true;
  }

  function cloneBlueprint(flow) {
    return JSON.parse(JSON.stringify(flow));
  }

  function workflowCard(record) {
    const card = el("article", "stored-workflow-card" +
      (record.status === "active" ? " is-active" : "") +
      (record.id === state.currentSavedId ? " is-selected" : ""));
    // The entire card opens the blueprint; embedded action buttons keep
    // their own independent click behavior.
    card.dataset.workflowId = record.id;
    card.tabIndex = 0;
    card.setAttribute("role", "group");
    card.setAttribute("aria-label", (record.name || "Untitled workflow") +
      " saved workflow. Press Enter or Space to open.");
    card.title = "Open " + (record.name || "Untitled workflow");
    const name = el("button", "stored-workflow-name", record.name || "Untitled workflow");
    name.type = "button";
    name.dataset.workflowAction = "open";
    name.dataset.workflowId = record.id;
    name.title = "Open this saved blueprint";
    const info = el("div", "stored-workflow-meta",
      String(record.flow.steps.length) + " steps · " + record.flow.trigger);
    const status = el("div", "stored-workflow-status",
      record.status === "active" ? "ACTIVE PREVIEW" : "SAVED DESIGN");
    const actions = el("div", "stored-workflow-actions");
    const buttonSpec = [
      ["open", "Open", ""],
      ["toggle", record.status === "active" ? "Pause" : "Activate", "workflow-activate"],
      ["delete", "Delete", "workflow-remove"]
    ];
    for (const [action, label, className] of buttonSpec) {
      const button = el("button", className, label);
      button.type = "button";
      button.dataset.workflowAction = action;
      button.dataset.workflowId = record.id;
      button.setAttribute("aria-label", label + " " + record.name);
      actions.appendChild(button);
    }
    card.append(name, info, status, actions);
    return card;
  }

  function drawWorkflowLibrary() {
    const active = state.savedWorkflows.filter(item => item.status === "active");
    const saved = state.savedWorkflows.filter(item => item.status !== "active");
    $("activeWorkflowCount").textContent = String(active.length);
    $("savedWorkflowCount").textContent = String(saved.length);
    const activeList = $("activeWorkflowList");
    const savedList = $("savedWorkflowList");
    activeList.replaceChildren(...(active.length ?
      active.map(workflowCard) :
      [el("p", "workflow-empty", "No active previews. Activate a saved design below to show it here.")]));
    savedList.replaceChildren(...(saved.length ?
      saved.map(workflowCard) :
      [el("p", "workflow-empty", "No saved blueprints yet. Build a workflow with MCP, then choose Save workflow.")]));
  }

  function updateSaveControl() {
    const button = $("saveWorkflow");
    const label = button.querySelector("span");
    button.disabled = !state.flow || (Boolean(state.currentSavedId) && !state.dirty);
    label.textContent = !state.flow ? "Save workflow" :
      !state.currentSavedId ? "Save workflow" :
      state.dirty ? "Save changes" : "Saved";
    button.title = "Save the blueprint to this browser only; no automation is started";
  }

  function saveCurrentWorkflow() {
    if (!state.flow || state.pendingReply) {
      notify("Create a workflow blueprint before saving.");
      return;
    }
    if (!state.currentSavedId && state.savedWorkflows.length >= MAX_LIBRARY_ENTRIES) {
      notify("Workflow library is full. Delete a saved design to make space.");
      return;
    }
    const id = state.currentSavedId ||
      ("flow-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8));
    const index = state.savedWorkflows.findIndex(item => item.id === id);
    const previous = index < 0 ? null : state.savedWorkflows[index];
    const date = new Date().toISOString();
    const updated = {
      id,
      name: state.flow.name,
      status: previous ? previous.status : "saved",
      flow: cloneBlueprint(state.flow),
      revision: state.revision,
      createdAt: previous ? previous.createdAt : date,
      updatedAt: date
    };
    const next = index < 0 ?
      [updated, ...state.savedWorkflows] :
      state.savedWorkflows.map(item => item.id === id ? updated : item);
    if (!storeWorkflowLibrary(next)) return;
    state.currentSavedId = id;
    state.dirty = false;
    render();
    drawWorkflowLibrary();
    notify(previous ? "Changes saved to this browser" : "Blueprint saved — activate its preview in the sidebar");
  }

  function openSavedWorkflow(record) {
    if (state.dirty && state.flow &&
        !window.confirm("Discard unsaved draft changes and open this saved blueprint?")) return;
    stopPreview();
    state.flow = cloneBlueprint(record.flow);
    state.currentSavedId = record.id;
    state.selectedStepId = null;
    state.revision = Number.isSafeInteger(record.revision) ? record.revision : 1;
    state.dirty = false;
    for (const step of state.flow.steps) {
      const match = /^step-(\d+)$/.exec(step.id);
      if (match) state.nextStepId = Math.max(state.nextStepId, Number(match[1]) + 1);
    }
    render();
    drawWorkflowLibrary();
    message("MCP", "Loaded your saved blueprint “" + record.name +
      ".” You can edit the steps and save changes. This is still a design-only preview.");
    notify("Saved blueprint opened");
  }

  function handleWorkflowLibraryAction(action, id) {
    const record = state.savedWorkflows.find(item => item.id === id);
    if (!record) return;
    if (action === "open") {
      openSavedWorkflow(record);
      return;
    }
    if (action === "toggle") {
      const status = record.status === "active" ? "saved" : "active";
      const next = state.savedWorkflows.map(item => item.id === id ?
        {...item, status, updatedAt: new Date().toISOString()} : item);
      if (!storeWorkflowLibrary(next)) return;
      drawWorkflowLibrary();
      notify(status === "active" ?
        "Active preview enabled — no schedule or agent has started" :
        "Preview paused — no workflow was running");
      return;
    }
    if (action === "delete") {
      if (!window.confirm("Delete saved blueprint “" + record.name + "” from this browser?")) return;
      const next = state.savedWorkflows.filter(item => item.id !== id);
      if (!storeWorkflowLibrary(next)) return;
      if (state.currentSavedId === id) {
        state.currentSavedId = null;
        state.dirty = Boolean(state.flow);
        render();
      }
      drawWorkflowLibrary();
      notify("Saved blueprint deleted from this browser");
    }
  }

  function newStep(kind, agent, title, description) {
    return {id: "step-" + (state.nextStepId++), kind, agent, title, description};
  }

  function isApprovalRequest(prompt) {
    return /approval|approve|review before|ask before|permission|human[- ]in[- ]the[- ]loop/i.test(prompt);
  }

  function withoutApproval(prompt) {
    return /without (?:an? )?approval|no approvals?|skip (?:the )?approval|don't ask for approval/i.test(prompt);
  }

  function readCadence(prompt) {
    const text = prompt.toLowerCase();
    const timeMatch = text.match(/\b(?:at|around)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
    let time = "9:00 AM";
    if (timeMatch) time = timeMatch[1] + ":" + (timeMatch[2] || "00") + " " + timeMatch[3].toUpperCase();
    if (/every (?:weekday|workday)/.test(text)) return "Weekdays · " + time;
    if (/every (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/.test(text)) {
      const day = text.match(/every (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)[1];
      return day.charAt(0).toUpperCase() + day.slice(1) + "s · " + time;
    }
    if (/\b(?:hourly|every hour|every 60 minutes)\b/.test(text)) return "Every hour";
    if (/\bevery (\d+) minutes?\b/.test(text)) {
      return "Every " + text.match(/\bevery (\d+) minutes?\b/)[1] + " minutes";
    }
    if (/weekly|every week/.test(text)) return "Weekly · " + time;
    if (/\bdaily\b|each day|every (?:day|morning|evening|afternoon)/.test(text)) return "Daily · " + time;
    return null;
  }

  function workflowFromPrompt(prompt) {
    const text = prompt.toLowerCase();
    const cadence = readCadence(prompt);
    const wantsApproval = isApprovalRequest(prompt) && !withoutApproval(prompt);
    const noApproval = withoutApproval(prompt);
    let name, description, trigger, steps, category;

    if (/pull request|\bpr\b|code review|github|commit|repository review/.test(text)) {
      category = "code";
      name = "Repository Review Pipeline";
      description = "Inspect incoming engineering changes, verify risks, and produce a review summary.";
      trigger = cadence || "Pull request event";
      steps = [
        newStep("trigger", "SYSTEM", cadence ? "Scheduled repository check" : "Pull request opened", "Detect a new change to review."),
        newStep("process", "MAXIS", "Analyze code changes", "Inspect changed files, logic, tests, and maintainability risks."),
        newStep("process", "TRON", "Check security impact", "Identify security concerns, permissions, and unsafe operations."),
        newStep("approval", "HUMAN", "Review findings", "Wait for Master Control to approve or reject the proposed next action."),
        newStep("action", "RELAY", "Deliver review summary", "Prepare a concise report containing findings and next steps.")
      ];
    } else if (/file|folder|duplicate|organize|archive|storage/.test(text)) {
      category = "files";
      name = "File Organization Assistant";
      description = "Inspect a folder, identify candidates for cleanup, and produce a reviewed action plan.";
      trigger = cadence || "Folder change event";
      steps = [
        newStep("trigger", "SYSTEM", cadence ? "Scheduled folder scan" : "Folder change detected", "Identify a folder or new file to inspect."),
        newStep("process", "JN", "Inventory and categorize", "Collect metadata and group files by type or purpose."),
        newStep("process", "JN", "Find cleanup candidates", "Identify duplicate candidates and proposed moves without changing files."),
        newStep("approval", "HUMAN", "Approve file plan", "Review suggested moves and deletions before any real operation is authorized."),
        newStep("action", "RELAY", "Present organization plan", "Deliver a summary of proposed file actions.")
      ];
    } else if (/monitor|resource|cpu|memory|ram|gpu|health|threshold|uptime|usage/.test(text)) {
      category = "monitor";
      name = "Resource Watch Automation";
      description = "Observe system health and escalate noteworthy changes through GRID.AI.";
      trigger = cadence || "Every hour";
      steps = [
        newStep("trigger", "SYSTEM", "Scheduled health check", "Begin a resource-health monitoring cycle."),
        newStep("process", "VOLT", "Collect resource metrics", "Review CPU, memory, disk, and related telemetry in the proposed plan."),
        newStep("process", "VOLT", "Evaluate thresholds", "Determine whether measurements require attention."),
        newStep("process", "MCP", "Triage issues", "Classify the severity and decide which results deserve escalation."),
        newStep("action", "RELAY", "Send health notification", "Prepare an alert with key findings if attention is required.")
      ];
    } else if (/brief|report|summary|summarize|digest|morning|email|update/.test(text)) {
      category = "briefing";
      name = "Engineering Briefing";
      description = "Collect project updates and assemble a useful briefing on a recurring schedule.";
      trigger = cadence || "Daily · 9:00 AM";
      steps = [
        newStep("trigger", "SYSTEM", "Scheduled briefing", "Start the briefing at the configured time."),
        newStep("process", "MCP", "Gather project activity", "Determine which repositories, tasks, and updates belong in the briefing."),
        newStep("process", "MAXIS", "Summarize progress", "Create concise development highlights, risks, and next steps."),
        newStep("approval", "HUMAN", "Review outgoing brief", "Give Master Control an opportunity to check the briefing."),
        newStep("action", "RELAY", "Deliver briefing", "Prepare the final summary for a selected delivery channel.")
      ];
    } else {
      category = "custom";
      name = "Custom Agent Workflow";
      description = "A proposed multi-agent workflow based on your objective: " + prompt.slice(0, 155) + (prompt.length > 155 ? "…" : "");
      trigger = cadence || "On demand";
      steps = [
        newStep("trigger", "SYSTEM", cadence ? "Scheduled workflow start" : "Manual request received", "Initiate the workflow when the specified condition is met."),
        newStep("process", "MCP", "Interpret objective", "Collect the context and determine which specialist work is needed."),
        newStep("process", "MAXIS", "Perform specialist analysis", "Prepare a structured proposal using the relevant task context."),
        newStep("approval", "HUMAN", "Review proposed output", "Verify and approve any sensitive action before proceeding."),
        newStep("action", "RELAY", "Deliver result", "Produce a completion report and suggested next steps.")
      ];
    }
    if (noApproval || (category === "monitor" && !wantsApproval)) {
      steps = steps.filter(step => step.kind !== "approval");
    } else if (wantsApproval && !steps.some(step => step.kind === "approval")) {
      steps.splice(steps.length - 1, 0, newStep("approval", "HUMAN", "Approve next action", "Require approval before an external or sensitive operation."));
    }
    if (/\bemail\b|e-mail/.test(text)) {
      const last = steps[steps.length - 1];
      last.title = category === "briefing" ? "Email the briefing" : "Email the result";
      last.description = "Prepare an email-ready report for the intended recipients. Sending is not connected in this demo.";
    }
    if (/notification|notify|alert/.test(text) && steps[steps.length - 1].agent === "RELAY") {
      steps[steps.length - 1].description = "Prepare an operator notification with relevant context. No real messages are sent.";
    }
    return {id: "demo-workflow", name, description, trigger, category, steps, originalPrompt: prompt};
  }

  function currentStep() {
    return state.flow && state.flow.steps.find(step => step.id === state.selectedStepId);
  }

  function stopPreview() {
    state.runToken++;
    if (state.runTimer !== null) {
      clearTimeout(state.runTimer);
      state.runTimer = null;
    }
    $("previewRun").disabled = !state.flow;
    $("previewRun").textContent = "▷ Preview run";
    document.querySelectorAll(".flow-node").forEach(node => node.classList.remove("is-running", "is-complete"));
  }

  function renderSteps() {
    const list = $("flowSteps");
    list.replaceChildren();
    if (!state.flow) return;
    state.flow.steps.forEach((step, i) => {
      if (i > 0) list.append(el("div", "flow-connector"));
      const node = el("button", "flow-node kind-" + step.kind + (step.id === state.selectedStepId ? " selected" : ""));
      node.type = "button";
      node.dataset.stepId = step.id;
      node.setAttribute("aria-label", "Edit step " + (i + 1) + ": " + step.title);
      node.setAttribute("aria-pressed", String(step.id === state.selectedStepId));
      const icon = el("span", "node-icon", KINDS[step.kind].icon);
      icon.setAttribute("aria-hidden", "true");
      const copy = el("span", "node-copy");
      const top = el("span", "node-top");
      top.append(el("span", "node-number", String(i + 1).padStart(2, "0") + " / " + KINDS[step.kind].label));
      top.append(el("span", "node-name", step.title));
      top.append(el("span", "node-agent", step.agent));
      if (step.skill) top.append(el("span", "node-skill-tag", "SKILL"));
      copy.append(top, el("span", "node-description", step.description));
      const arrow = el("span", "node-arrow", "›");
      arrow.setAttribute("aria-hidden", "true");
      node.append(icon, copy, arrow);
      node.addEventListener("click", () => {
        state.selectedStepId = step.id;
        renderSteps();
        renderInspector();
      });
      list.append(node);
    });
    list.append(el("div", "flow-connector"));
    const terminal = el("div", "flow-terminal");
    terminal.append(el("i"), document.createTextNode("WORKFLOW COMPLETE · PREVIEW"));
    list.append(terminal);
  }


  const MAX_SKILL_BYTES = 64 * 1024;

  function renderStepSkill(step) {
    const skill = step.skill;
    const fileLabel = $("skillFileStatus");
    const hasSkill = Boolean(skill && typeof skill.filename === "string" &&
      typeof skill.text === "string");
    fileLabel.textContent = hasSkill ?
      skill.filename + " · " + (skill.bytes / 1024).toFixed(1) + " KB" :
      "No skill attached";
    fileLabel.classList.toggle("has-skill", hasSkill);
    $("removeSkill").hidden = !hasSkill;
    const details = $("skillPreview");
    details.hidden = !hasSkill;
    details.open = false;
    $("skillPreviewText").textContent = hasSkill ? skill.text : "";
  }

  async function attachSkillFile(file) {
    const step = currentStep();
    const flow = state.flow;
    if (!file || !step) return;
    const filename = String(file.name || "").split(/[\\/]/).pop().slice(0, 120);
    if (!/\.(txt|md)$/i.test(filename)) {
      notify("Select a .txt or .md instruction file.");
      return;
    }
    if (file.size > MAX_SKILL_BYTES) {
      notify("Skill file too large. Maximum size is 64 KB.");
      return;
    }
    try {
      const text = await file.text();
      if (!text.trim() || text.includes("\u0000")) {
        notify("Skill instructions must contain readable text.");
        return;
      }
      // File reads are asynchronous: never attach to a different selected step.
      if (state.flow !== flow || currentStep() !== step) {
        notify("Step changed while reading the skill. Select it and upload again.");
        return;
      }
      step.skill = {filename, text, bytes: file.size};
      commitRevision();
      notify("Skill attached to " + step.title + " · save workflow to retain it");
    } catch {
      notify("Could not read that skill file.");
    }
  }

  function renderInspector() {
    const step = currentStep();
    $("stepInspector").hidden = !step;
    if (!step) return;
    $("selectedStepHeading").textContent = step.title;
    $("editStepTitle").value = step.title;
    $("editStepDescription").value = step.description;
    $("editStepAgent").value = step.agent;
    const index = state.flow.steps.indexOf(step);
    $("moveStepUp").disabled = index <= 1;
    $("moveStepDown").disabled = index === 0 || index === state.flow.steps.length - 1;
    $("removeStep").disabled = index === 0;
    renderStepSkill(step);
  }

  function render() {
    const flow = state.flow;
    $("emptyCanvas").hidden = Boolean(flow);
    $("flowSteps").hidden = !flow;
    $("draftTag").textContent = !flow ? "AWAITING INPUT" :
      state.currentSavedId ? (state.dirty ? "UNSAVED CHANGES" : "SAVED BLUEPRINT") : "EDITABLE DRAFT";
    $("flowTitle").textContent = flow ? flow.name : "Your workflow starts here";
    $("flowDescription").textContent = flow ? flow.description : "Tell MCP what you want to automate and a proposed plan will appear below.";
    $("metricSteps").textContent = flow ? flow.steps.length : "0";
    $("metricAgents").textContent = flow ? new Set(flow.steps.map(step => step.agent).filter(x => x !== "HUMAN" && x !== "SYSTEM")).size : "0";
    $("metricTrigger").textContent = flow ? flow.trigger : "—";
    $("addStep").disabled = !flow;
    $("previewRun").disabled = !flow;
    $("footerVersion").textContent = "v0." + state.revision;
    updateSaveControl();
    renderSteps();
    renderInspector();
  }

  function message(author, body) {
    const isUser = author === "user";
    const wrap = el("div", "chat-message " + (isUser ? "user-message" : "assistant-message"));
    const avatar = el("div", "message-avatar", isUser ? "YOU" : undefined);
    if (!isUser) {
      const portrait = el("img");
      portrait.src = "./Programs/Agents/MCP/MCP_HEADSHOT.png";
      portrait.alt = "";
      portrait.decoding = "async";
      avatar.append(portrait);
    }
    const column = el("div", "message-column");
    const heading = el("div", "message-author", isUser ? "You" : "MCP");
    if (!isUser) heading.append(el("span", "", " · COORDINATOR"));
    const bubble = el("div", "message-bubble", body);
    column.append(heading, bubble);
    wrap.append(avatar, column);
    $("mcpMessages").append(wrap);
    $("mcpMessages").scrollTop = $("mcpMessages").scrollHeight;
    return wrap;
  }

  function note(body) {
    $("mcpMessages").append(el("div", "workflow-note", body));
    $("mcpMessages").scrollTop = $("mcpMessages").scrollHeight;
  }

  function commitRevision() {
    stopPreview();
    state.revision++;
    state.dirty = true;
    render();
  }

  function applyEdit(text) {
    if (!state.flow) return null;
    const lower = text.toLowerCase();
    const flow = state.flow;
    const approvalIndex = flow.steps.findIndex(step => step.kind === "approval");
    if (/^(?:please )?(?:add|include|require|put|insert)\b.*(?:approval|human review|permission)/i.test(text)) {
      if (approvalIndex >= 0) return "An approval gate is already in this blueprint. You can select it to adjust its instructions.";
      const index = Math.max(1, flow.steps.length - 1);
      flow.steps.splice(index, 0, newStep("approval", "HUMAN", "Approve next action", "Master Control must approve the proposed action before continuing."));
      commitRevision();
      return "Added a human approval gate before the final output. The new step is editable on the canvas.";
    }
    if (/^(?:please )?(?:remove|delete|skip)\b.*(?:approval|human review|permission)/i.test(text)) {
      if (approvalIndex < 0) return "This blueprint does not currently have an approval gate.";
      const removed = flow.steps.splice(approvalIndex, 1)[0];
      if (state.selectedStepId === removed.id) state.selectedStepId = null;
      commitRevision();
      return "Removed the approval step from the design. For a real deployment, sensitive actions would still need policy enforcement.";
    }
    const cadence = readCadence(text);
    if (cadence && (/^(?:change|make|set|schedule|run|switch|every|please|daily|weekly|hourly)/i.test(text) ||
        /(?:instead|schedule|trigger|run it|run this)/i.test(text))) {
      flow.trigger = cadence;
      flow.steps[0].title = "Scheduled workflow start";
      flow.steps[0].description = "Proposed trigger: " + cadence + ". No schedule is actually registered.";
      commitRevision();
      return "Updated the proposed trigger to " + cadence + ". This remains a design setting until connected to a scheduler.";
    }
    if (/(?:send|deliver|notify|email).*(?:email|notification|alert)|(?:by|via) email/i.test(text) &&
        /^(?:also|please|and|send|deliver|notify|email|change|make)/i.test(text)) {
      const last = flow.steps[flow.steps.length - 1];
      last.agent = "RELAY";
      last.title = /email/i.test(text) ? "Email the result" : "Notify Master Control";
      last.description = /email/i.test(text) ? "Prepare an email with the workflow outcome; delivery requires a future integration." : "Prepare an operator notification; delivery requires a future integration.";
      commitRevision();
      return "Updated the delivery step and assigned it to RELAY. This preview does not send anything.";
    }
    const agentMatch = text.match(/\b(MCP|MAXIS|TRON|JN|VOLT|RELAY)\b/i);
    if (agentMatch && /(?:assign|use|have|switch|give|make)\b/i.test(text)) {
      const agent = agentMatch[1].toUpperCase();
      const target = flow.steps.find(step => step.kind === "process");
      if (!target) return null;
      target.agent = agent;
      commitRevision();
      return "Assigned the first processing step to " + agent + " (" + AGENTS[agent] + "). Select the step to configure it further.";
    }
    if (/^(?:rename|call|name) (?:it|the workflow|this workflow) /i.test(text)) {
      const name = text.replace(/^(?:rename|call|name) (?:it|the workflow|this workflow) /i, "").replace(/[.!]+$/, "").trim().slice(0, 90);
      if (name) {
        flow.name = name;
        commitRevision();
        return "Renamed the workflow to “" + name + ".”";
      }
    }
    return null;
  }

  function replyTo(text) {
    const edited = applyEdit(text);
    if (edited !== null) {
      message("MCP", edited);
      note("Blueprint updated · v0." + state.revision);
      return;
    }
    state.flow = workflowFromPrompt(text);
    state.currentSavedId = null;
    state.revision = 0;
    state.selectedStepId = null;
    commitRevision();
    message("MCP",
      "I've drafted “" + state.flow.name + "” as a " + state.flow.steps.length + "-step workflow.\n\n" +
      "Trigger: " + state.flow.trigger + ". I assigned the work across " +
      new Set(state.flow.steps.map(step => step.agent).filter(x => x !== "SYSTEM" && x !== "HUMAN")).size +
      " specialist agent(s)." +
      (state.flow.steps.some(step => step.kind === "approval") ? " I included a Master Control approval gate." : "") +
      "\n\nSelect a step on the canvas to edit its instructions or assigned agent. You can also tell me things like “add approval,” “run every Friday at 9 AM,” or “send the result by email.”");
    note("New workflow blueprint generated · v0." + state.revision);
    notify("Workflow blueprint generated");
  }

  function submitPrompt(value) {
    const text = value.trim();
    if (!text || state.pendingReply) return;
    message("user", text);
    $("mcpInput").value = "";
    state.pendingReply = true;
    $("sendMessage").disabled = true;
    const bubble = message("MCP", "Drafting a blueprint…");
    bubble.classList.add("pending-message");
    setTimeout(() => {
      bubble.remove();
      try {
        replyTo(text);
      } finally {
        state.pendingReply = false;
        $("sendMessage").disabled = false;
        $("mcpInput").focus({preventScroll: true});
      }
    }, 550);
  }

  function moveSelected(delta) {
    const step = currentStep();
    if (!step) return;
    const items = state.flow.steps;
    const index = items.indexOf(step);
    const nextIndex = index + delta;
    if (index <= 0 || nextIndex <= 0 || nextIndex >= items.length) return;
    items.splice(index, 1);
    items.splice(nextIndex, 0, step);
    commitRevision();
    notify("Step reordered");
  }

  function previewRun() {
    if (!state.flow) return;
    stopPreview();
    const token = state.runToken;
    const stepIds = state.flow.steps.map(step => step.id);
    $("previewRun").disabled = true;
    $("previewRun").textContent = "◉ Previewing...";
    notify("Simulating flow traversal — no agents are running");
    let index = 0;
    const iterate = () => {
      if (token !== state.runToken) return;
      document.querySelectorAll(".flow-node").forEach(node => {
        const n = stepIds.indexOf(node.dataset.stepId);
        node.classList.toggle("is-complete", n < index);
        node.classList.toggle("is-running", n === index);
      });
      if (index >= stepIds.length) {
        state.runTimer = null;
        $("previewRun").disabled = false;
        $("previewRun").textContent = "▷ Preview run";
        note("Dry-run animation complete · no work was executed");
        notify("Preview complete — no external actions");
        return;
      }
      index++;
      state.runTimer = setTimeout(iterate, 520);
    };
    iterate();
  }

  function exportWorkflow() {
    if (!state.flow) {
      notify("Design a workflow before exporting.");
      return;
    }
    const copy = {
      schemaVersion: 1,
      demoOnly: true,
      name: state.flow.name,
      description: state.flow.description,
      trigger: {display: state.flow.trigger, connected: false},
      steps: state.flow.steps.map((step, index) => ({
        position: index + 1, id: step.id, type: step.kind,
        agent: step.agent, title: step.title, instructions: step.description,
        skill: step.skill ? {fileName: step.skill.filename,
          sizeBytes: step.skill.bytes, content: step.skill.text} : null
      })),
      executionEnabled: false,
      note: "UI concept only. This JSON is not an executable GRID.AI workflow."
    };
    const blob = new Blob([JSON.stringify(copy, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "grid-ai-workflow-demo.json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Blueprint JSON exported");
  }

  $("mcpForm").addEventListener("submit", event => {
    event.preventDefault();
    submitPrompt($("mcpInput").value);
  });
  $("mcpInput").addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      submitPrompt($("mcpInput").value);
    }
  });
  document.querySelectorAll("[data-prompt]").forEach(button => {
    button.addEventListener("click", () => submitPrompt(button.dataset.prompt));
  });
  $("focusChat").addEventListener("click", () => $("mcpInput").focus());
  $("addStep").addEventListener("click", () => {
    if (!state.flow) return;
    const step = newStep("process", "MCP", "New processing step", "Describe what this agent should accomplish.");
    state.flow.steps.splice(Math.max(1, state.flow.steps.length - 1), 0, step);
    state.selectedStepId = step.id;
    commitRevision();
    $("editStepTitle").focus();
  });
  $("previewRun").addEventListener("click", previewRun);
  $("exportJson").addEventListener("click", exportWorkflow);
  $("saveWorkflow").addEventListener("click", saveCurrentWorkflow);
  $("workflowLibrary").addEventListener("click", event => {
    // Buttons always take priority, so activating or deleting never opens
    // the workflow as a side effect.
    const button = event.target.closest("[data-workflow-action]");
    if (button) {
      handleWorkflowLibraryAction(button.dataset.workflowAction, button.dataset.workflowId);
      return;
    }
    const card = event.target.closest(".stored-workflow-card[data-workflow-id]");
    if (card) handleWorkflowLibraryAction("open", card.dataset.workflowId);
  });
  $("workflowLibrary").addEventListener("keydown", event => {
    // Make the card itself keyboard-accessible without intercepting Enter
    // or Space on its child buttons.
    const card = event.target;
    if (!card.matches(".stored-workflow-card[data-workflow-id]") ||
        (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    handleWorkflowLibraryAction("open", card.dataset.workflowId);
  });
  $("resetFlow").addEventListener("click", () => {
    if (state.flow && state.dirty && !window.confirm("Discard unsaved changes and start a new draft?")) return;
    stopPreview();
    state.flow = null;
    state.selectedStepId = null;
    state.currentSavedId = null;
    state.dirty = false;
    state.revision = 0;
    render();
    message("MCP", "New draft started. What should we automate next?");
    notify("New workflow draft ready");
  });
  $("skillUpload").addEventListener("change", async event => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (file) await attachSkillFile(file);
  });
  $("removeSkill").addEventListener("click", () => {
    const step = currentStep();
    if (!step || !step.skill) return;
    delete step.skill;
    commitRevision();
    notify("Custom skill removed from this step");
  });
  $("closeInspector").addEventListener("click", () => {
    state.selectedStepId = null;
    renderSteps();
    renderInspector();
  });
  $("editStepTitle").addEventListener("input", event => {
    const step = currentStep();
    if (!step) return;
    step.title = event.target.value;
    $("selectedStepHeading").textContent = step.title || "Untitled step";
    state.revision++;
    state.dirty = true;
    $("footerVersion").textContent = "v0." + state.revision;
    $("draftTag").textContent = state.currentSavedId ? "UNSAVED CHANGES" : "EDITABLE DRAFT";
    updateSaveControl();
    renderSteps();
  });
  $("editStepDescription").addEventListener("input", event => {
    const step = currentStep();
    if (!step) return;
    step.description = event.target.value;
    state.revision++;
    state.dirty = true;
    $("footerVersion").textContent = "v0." + state.revision;
    $("draftTag").textContent = state.currentSavedId ? "UNSAVED CHANGES" : "EDITABLE DRAFT";
    updateSaveControl();
    renderSteps();
  });
  $("editStepAgent").addEventListener("change", event => {
    const step = currentStep();
    if (!step) return;
    step.agent = event.target.value;
    commitRevision();
  });
  $("moveStepUp").addEventListener("click", () => moveSelected(-1));
  $("moveStepDown").addEventListener("click", () => moveSelected(1));
  $("removeStep").addEventListener("click", () => {
    const step = currentStep();
    if (!step || step.kind === "trigger") return;
    state.flow.steps = state.flow.steps.filter(item => item.id !== step.id);
    state.selectedStepId = null;
    commitRevision();
    notify("Step removed from draft");
  });
  state.savedWorkflows = readWorkflowLibrary();
  drawWorkflowLibrary();
  render();
})();
