"use strict";
/* Home is a browser-only launcher; all displayed telemetry and approvals are examples. */
(() => {
  const $ = id => document.getElementById(id);
  const previews = {"command":["Command Center","Monitor delegation, agent activity and tasks."],"projects":["Project Manager","Manage projects, repositories and agent teams."],"agents":["Agent Directory","Configure agent skills, models and identities."],"integrations":["Integrations","Manage connected services, devices and MCP servers."],"system":["System Monitor","Inspect hosts, resource usage and model capacity."],"settings":["Settings","Configure permissions, appearance and policies."]};
  const approvals = [
    {id:"repo",title:"Repository changes",agent:"MAXIS",description:"Review an example source-code change before allowing a simulated repository operation.",status:"pending",comment:""},
    {id:"workflow",title:"Workflow authorization",agent:"Mcp",description:"Review an example request to activate a workflow. No workflow will be scheduled or executed.",status:"pending",comment:""}
  ];
  let selectedApproval = null, toastTimer;
  const dialog = $("homeDialog");
  const arrow = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 12h15m-6-6 6 6-6 6\"/></svg>";
  function toast(message) {
    $("homeToast").textContent = message;
    $("homeToast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("homeToast").classList.remove("show"), 2800);
  }
  function drawApprovals() {
    const pending = approvals.filter(a => a.status === "pending").length;
    const label = String(pending).padStart(2,"0");
    $("pendingCount").textContent = label;
    $("attentionCount").textContent = label;
    $("bellCount").textContent = String(pending);
    $("bellCount").hidden = !pending;
    $("pendingCaption").textContent = pending ? "Requires your attention" : "All example requests reviewed";
    $("approvalMetric").classList.toggle("approval-metric",!!pending);
    $("approvalList").replaceChildren(...approvals.map(a => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "approval-card" + (a.status !== "pending" ? " resolved "+a.status : "");
      button.dataset.approval = a.id;
      const dot = document.createElement("i");
      dot.setAttribute("aria-hidden","true");
      const copy = document.createElement("span");
      const title = document.createElement("strong"); title.textContent = a.title;
      const detail = document.createElement("small"); detail.textContent = a.agent+" · "+(a.status === "pending" ? "Approval requested" : a.status === "approved" ? "Approved in demo" : "Rejected in demo");
      copy.append(title,detail); button.append(dot,copy);
      button.insertAdjacentHTML("beforeend",arrow);
      return button;
    }));
  }
  function showDialog(title,description,eyebrow) {
    $("dialogTitle").textContent=title;
    $("dialogDescription").textContent=description;
    $("dialogEyebrow").textContent=eyebrow;
    if(!dialog.open) dialog.showModal();
  }
  function preview(key) {
    const item=previews[key]; if(!item)return;
    selectedApproval=null;
    $("dialogApproval").hidden=true;
    $("approveApproval").hidden=true;
    $("rejectApproval").hidden=true;
    showDialog(item[0],item[1]+" This application is planned and is not implemented in the current demo.","GRID.AI / PLANNED APPLICATION");
  }
  function review(id) {
    const item=approvals.find(a=>a.id===id); if(!item)return;
    selectedApproval=item;
    const pending=item.status==="pending";
    $("dialogApproval").hidden=!pending;
    $("approveApproval").hidden=!pending;
    $("rejectApproval").hidden=!pending;
    $("decisionComment").value=item.comment;
    showDialog(item.title,item.description+(pending?" This is a standalone sample approval, not a real request.":" Decision: "+item.status+" in demo."+(item.comment?" Comment: "+item.comment:"")),"GRID.AI / SIMULATED APPROVAL");
  }
  function decide(status) {
    if(!selectedApproval||selectedApproval.status!=="pending")return;
    const id=selectedApproval.id;
    selectedApproval.status=status;
    selectedApproval.comment=$("decisionComment").value.trim().slice(0,500);
    dialog.close(); drawApprovals();
    document.querySelector('[data-approval="'+id+'"]')?.focus();
    toast((status==="approved"?"Approved":"Rejected")+" in demo. No operation executed.");
  }
  function openConnect(agent,prompt="") {
    const hash=new URLSearchParams({agent});
    if(prompt) hash.set("draft",prompt);
    location.href="./Chat.html#"+hash.toString();
  }
  function showAgents(expanded) {
    $("expandAgents").setAttribute("aria-expanded",String(expanded));
    $("expandAgents").textContent=expanded?"Show less":"View all 6";
    document.querySelectorAll("[data-extra-agent]").forEach(row=>row.hidden=!expanded);
  }
  function showAttention() {
    $("attention").scrollIntoView({block:"nearest",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    ($("approvalList").querySelector(".approval-card:not(.resolved)")||$("approvalList").querySelector("button"))?.focus({preventScroll:true});
  }
  function setNav(open) {
    $("homeSidebar").classList.toggle("open",open);
    $("navToggle").setAttribute("aria-expanded",String(open));
  }
  $("navToggle").addEventListener("click",()=>setNav(!$("homeSidebar").classList.contains("open")));
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&!dialog.open&&$("homeSidebar").classList.contains("open")){setNav(false);$("navToggle").focus();}
    if(event.ctrlKey&&event.code==="Space"&&!dialog.open){event.preventDefault();$("directInput").focus();}
  });
  document.addEventListener("click",event=>{
    const button=event.target.closest("[data-preview],[data-approval],[data-agent]");
    if(button?.dataset.preview)preview(button.dataset.preview);
    else if(button?.dataset.approval)review(button.dataset.approval);
    else if(button?.dataset.agent)openConnect(button.dataset.agent);
    if(!$("homeSidebar").contains(event.target)&&!$("navToggle").contains(event.target))setNav(false);
  });
  $("directForm").addEventListener("submit",event=>{event.preventDefault();openConnect("MCP",$("directInput").value.trim());});
  $("expandAgents").addEventListener("click",()=>showAgents($("expandAgents").getAttribute("aria-expanded")!=="true"));
  $("agentsMetric").addEventListener("click",()=>{showAgents(true);$("agentActivity").scrollIntoView({block:"nearest"});$("expandAgents").focus({preventScroll:true});});
  $("approvalMetric").addEventListener("click",showAttention);
  $("notificationButton").addEventListener("click",showAttention);
  $("approveApproval").addEventListener("click",()=>decide("approved"));
  $("rejectApproval").addEventListener("click",()=>decide("rejected"));
  dialog.addEventListener("close",()=>{selectedApproval=null;});
  drawApprovals();
})();
