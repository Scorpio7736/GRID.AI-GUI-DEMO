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
  const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)");
  const notices=approvals.map(a=>({id:"approval-"+a.id,title:a.title,detail:a.agent+" · Approval requested",approval:a.id,unread:true,time:Date.now()}));
  let nextNotice=1, navigating=false;
  const animations=new WeakMap();
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
    drawNotifications();
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
    dialog.close();
    const original=notices.find(n=>n.approval===id&&n.id==="approval-"+id);
    if(original){original.unread=false;original.detail=selectedApproval.agent+" · "+(status==="approved"?"Approved in demo":"Rejected in demo");}
    addNotice(selectedApproval.title,(status==="approved"?"Approved":"Rejected")+" in demo. No operation executed.",id);
    drawApprovals();
    document.querySelector('[data-approval="'+id+'"]')?.focus();
    toast((status==="approved"?"Approved":"Rejected")+" in demo. No operation executed.");
  }
  function openConnect(agent) {
    const hash=new URLSearchParams({agent});
    navigate("./Chat.html#"+hash.toString());
  }
  function showAgents(expanded) {
    $("expandAgents").setAttribute("aria-expanded",String(expanded));
    $("expandAgents").textContent=expanded?"Show less":"View all 6";
    animateDisclosure($("extraAgents"),expanded);
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
    if(event.key==="Escape"&&!dialog.open){
      if($("notificationButton").getAttribute("aria-expanded")==="true"){setNotifications(false,true);return;}
      if($("homeSidebar").classList.contains("open")){setNav(false);$("navToggle").focus();}
    }
  });
  document.addEventListener("click",event=>{
    const link=event.target.closest("a[href]");
    if(link&&!event.defaultPrevented&&event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&!link.hasAttribute("download")&&(!link.target||link.target==="_self")&&/^\.\/(?:Chat|Workflow-Designer)\.html$/.test(link.getAttribute("href"))){event.preventDefault();navigate(link.getAttribute("href"));return;}
    if(!$("notificationPanel").contains(event.target)&&!$("notificationButton").contains(event.target))setNotifications(false);
    const button=event.target.closest("[data-preview],[data-approval],[data-agent],[data-panel]");
    if(button?.dataset.panel) openPanel(button.dataset.panel);
    else if(button?.dataset.preview)preview(button.dataset.preview);
    else if(button?.dataset.approval)review(button.dataset.approval);
    else if(button?.dataset.agent)openConnect(button.dataset.agent);
    if(!$("homeSidebar").contains(event.target)&&!$("navToggle").contains(event.target))setNav(false);
  });
  $("expandAgents").addEventListener("click",()=>showAgents($("expandAgents").getAttribute("aria-expanded")!=="true"));
  $("agentsMetric").addEventListener("click",()=>{showAgents(true);$("agentActivity").scrollIntoView({block:"nearest"});$("expandAgents").focus({preventScroll:true});});
  $("approvalMetric").addEventListener("click",showAttention);
  $("notificationButton").addEventListener("click",()=>setNotifications($("notificationButton").getAttribute("aria-expanded")!=="true"));
  $("closeNotifications").addEventListener("click",()=>setNotifications(false,true));
  $("markNotificationsRead").addEventListener("click",()=>{notices.forEach(n=>n.unread=false);drawNotifications();});
  $("notificationApprovals").addEventListener("click",()=>{setNotifications(false);showAttention();});
  $("approveApproval").addEventListener("click",()=>decide("approved"));
  $("rejectApproval").addEventListener("click",()=>decide("rejected"));
  dialog.addEventListener("close",()=>{selectedApproval=null;});

  /* Interruptible height and opacity transitions; no hidden focusable content. */
  function animateDisclosure(element,open){
    const old=animations.get(element);
    if(old?.open===open)return;
    if(!old&&element.hidden===!open)return;
    const height=element.hidden?0:element.getBoundingClientRect().height;
    const opacity=element.hidden?0:Number(getComputedStyle(element).opacity);
    if(old){old.animation.cancel();animations.delete(element);}
    if(open)element.hidden=false;
    if(!open&&element.contains(document.activeElement)){
      const control=document.querySelector('[aria-controls="'+element.id+'"]');
      control?.focus({preventScroll:true});
    }
    element.inert=!open;
    if(reducedMotion.matches||typeof element.animate!=="function"){
      element.hidden=!open;element.inert=!open;return;
    }
    const target=element.getBoundingClientRect().height;
    const animation=element.animate([{height:height+"px",opacity,overflow:"hidden"},{height:(open?target:0)+"px",opacity:open?1:0,overflow:"hidden"}],{duration:300,easing:"cubic-bezier(.22,.72,.25,1)",fill:"both"});
    animations.set(element,{animation,open});
    animation.onfinish=()=>{
      if(animations.get(element)?.animation!==animation)return;
      element.hidden=!open;
      animation.cancel();animations.delete(element);
    };
  }
  /* Page exit is used for same-tab application launches, not external or modified clicks. */
  function navigate(href){
    if(navigating)return;
    navigating=true;
    const go=()=>{location.href=href;};
    const shell=document.querySelector(".home-shell");
    if(reducedMotion.matches||typeof shell.animate!=="function"){go();return;}
    const animation=shell.animate([{opacity:1,transform:"translateY(0)"},{opacity:0,transform:"translateY(-5px)"}],{duration:230,easing:"ease-in",fill:"forwards"});
    let finished=false;
    const finish=()=>{if(finished)return;finished=true;go();};
    animation.onfinish=finish;
    setTimeout(finish,330);
  }
  window.addEventListener("pageshow",event=>{
    navigating=false;
    if(event.persisted)document.querySelector(".home-shell").getAnimations().forEach(a=>a.cancel());
  });
  function addNotice(title,detail,approval=null){
    notices.unshift({id:"event-"+nextNotice++,title,detail,approval,unread:true,time:Date.now()});
    if(notices.length>40)notices.length=40;
    drawNotifications();
  }
  function drawNotifications(){
    const unread=notices.filter(n=>n.unread).length;
    $("bellCount").textContent=String(unread);
    $("bellCount").hidden=!unread;
    $("notificationButton").setAttribute("aria-label","Notifications, "+unread+" unread");
    $("notificationSummary").textContent=unread+" unread · Demo";
    $("markNotificationsRead").disabled=!unread;
    const list=$("notificationList");
    list.replaceChildren(...notices.map(n=>{
      const item=document.createElement("button");
      item.type="button";item.className="notification-item"+(n.unread?" unread":"");
      const dot=document.createElement("i");dot.className="notification-dot";
      const content=document.createElement("span");
      const title=document.createElement("strong");title.textContent=n.title;
      const detail=document.createElement("small");detail.textContent=n.detail;
      const time=document.createElement("time");time.dateTime=new Date(n.time).toISOString();time.textContent=new Date(n.time).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
      content.append(title,detail,time);item.append(dot,content);
      item.addEventListener("click",()=>{
        n.unread=false;drawNotifications();
        if(n.approval){setNotifications(false);review(n.approval);}
        else{setNotifications(false,true);toast(n.detail);}
      });
      return item;
    }));
  }
  function setNotifications(open,restoreFocus=false){
    const trigger=$("notificationButton");
    if(trigger.getAttribute("aria-expanded")===String(open))return;
    trigger.setAttribute("aria-expanded",String(open));
    animateDisclosure($("notificationPanel"),open);
    if(open){$("closeNotifications").focus({preventScroll:true});}
    else if(restoreFocus)trigger.focus({preventScroll:true});
  }

  drawApprovals();

  /* Agent presence: independent, staggered demo work cycles. */
  const agentTasks = {
  "MCP": [
    [
      "Coordinating delegated tasks",
      "Reviewing {n} worker proposals"
    ],
    [
      "Planning project priorities",
      "Comparing {n} backlog items"
    ],
    [
      "Checking workflow progress",
      "Validating {n} task handoffs"
    ],
    [
      "Reviewing approval queue",
      "Preparing {n} decision summaries"
    ],
    [
      "Organizing agent assignments",
      "Matching {n} tasks to specialists"
    ]
  ],
  "MAXIS": [
    [
      "Reviewing Grid.AI source code",
      "Inspecting {n} changed files"
    ],
    [
      "Checking build results",
      "Evaluating {n} test results"
    ],
    [
      "Preparing a code proposal",
      "Drafting changes across {n} modules"
    ],
    [
      "Investigating a simulated bug",
      "Tracing {n} candidate call paths"
    ],
    [
      "Reviewing repository health",
      "Checking {n} dependency entries"
    ]
  ],
  "TRON": [
    [
      "Inspecting permission boundaries",
      "Reviewing {n} access rules"
    ],
    [
      "Reviewing security observations",
      "Triaging {n} example findings"
    ],
    [
      "Checking access policies",
      "Comparing {n} policy entries"
    ],
    [
      "Auditing agent grants",
      "Validating {n} permission records"
    ],
    [
      "Inspecting connection posture",
      "Reviewing {n} example endpoints"
    ]
  ],
  "JN": [
    [
      "Organizing project files",
      "Classifying {n} example documents"
    ],
    [
      "Reviewing storage usage",
      "Checking {n} storage entries"
    ],
    [
      "Checking archive candidates",
      "Comparing {n} file metadata records"
    ],
    [
      "Indexing project references",
      "Preparing {n} catalog entries"
    ],
    [
      "Reviewing backup inventory",
      "Checking {n} example snapshots"
    ]
  ],
  "VOLT": [
    [
      "Monitoring resource capacity",
      "Sampling {n} utilization records"
    ],
    [
      "Reviewing performance trends",
      "Comparing {n} latency samples"
    ],
    [
      "Checking model utilization",
      "Evaluating {n} inference records"
    ],
    [
      "Planning resource allocation",
      "Reviewing {n} simulated workloads"
    ],
    [
      "Analyzing memory pressure",
      "Checking {n} example processes"
    ]
  ],
  "RELAY": [
    [
      "Preparing daily briefing",
      "Summarizing {n} example updates"
    ],
    [
      "Organizing notification queue",
      "Sorting {n} demo messages"
    ],
    [
      "Reviewing communication updates",
      "Drafting {n} briefing notes"
    ],
    [
      "Preparing a status report",
      "Consolidating {n} agent updates"
    ],
    [
      "Checking delivery queue",
      "Reviewing {n} sample notifications"
    ]
  ]
};
  const agentRows=Array.from(document.querySelectorAll("[data-agent]"));
  function updateAgentSummary(){
    const available=agentRows.filter(row=>row.dataset.activity==="available").length;
    $("agentMetricSummary").textContent=available+" available · "+(agentRows.length-available)+" working";
  }
  function setAgentActivity(row,working,taskIndex){
    const status=row.querySelector(".agent-status");
    const task=row.querySelector(".agent-task");
    const dot=row.querySelector(".portrait .presence");
    const mode=working?"background":"available";
    row.dataset.activity=mode;
    status.className="agent-status "+mode;
    const mark=document.createElement("i");
    status.replaceChildren(mark,document.createTextNode(working?"Working in background":"Available"));
    dot.className="presence "+mode;
    const options=agentTasks[row.dataset.agent];
    if(working){
      const item=options[taskIndex%options.length];
      task.querySelector(".task-title").textContent=item[0];
      task.querySelector(".task-detail").textContent=item[1].replace("{n}",String(2+Math.floor(Math.random()*17)))+" · Demo";
    }else{
      task.querySelector(".task-title").textContent="Awaiting assignment";
      task.querySelector(".task-detail").textContent="Ready for the next task";
    }
    updateAgentSummary();
  }
  function cycleAgent(row,working,taskIndex,firstDelay){
    setAgentActivity(row,working,taskIndex);
    const delay=firstDelay??(working?7000+Math.random()*7000:5000+Math.random()*7000);
    setTimeout(()=>{const options=agentTasks[row.dataset.agent];const next=working?taskIndex:(taskIndex+1+Math.floor(Math.random()*(options.length-1)))%options.length;cycleAgent(row,!working,next);},delay);
  }
  agentRows.forEach((row,i)=>cycleAgent(row,i%3===1,Math.floor(Math.random()*agentTasks[row.dataset.agent].length),3500+i*1700+Math.random()*2500));

  /* Rolling, synthetic resource history. No hardware or network access. */
  const metrics=[
    {name:"CPU",base:24,spread:17,color:"var(--gold)"},
    {name:"RAM",base:61,spread:5,color:"var(--cyan)"},
    {name:"GPU",base:42,spread:21,color:"var(--green)"},
    {name:"VRAM",base:73,spread:7,color:"var(--purple)"}
  ];
  function nextSample(metric,previous){
    return Math.max(0,Math.min(100,Math.round(previous+(metric.base-previous)*.25+(Math.random()-.5)*metric.spread)));
  }
  metrics.forEach(metric=>{
    metric.history=[metric.base];
    for(let i=1;i<31;i++) metric.history.push(nextSample(metric,metric.history[i-1]));
  });
  function drawResources(){
    metrics.forEach(metric=>{
      const current=metric.history.at(-1);
      const row=document.querySelector('[data-resource="'+metric.name+'"]');
      row.querySelector("progress").value=current;
      row.querySelector(".resource-value").textContent=current+"%";
      const chart=document.querySelector('[data-chart="'+metric.name+'"]');
      chart.style.setProperty("--chart-color",metric.color);
      chart.querySelector(".chart-value").textContent=current+"%";
      const points=metric.history.map((v,i)=>[26+i*189/(metric.history.length-1),80-v*.7]);
      const line=points.map(p=>p.join(",")).join(" ");
      chart.querySelector(".chart-line").setAttribute("points",line);
      chart.querySelector(".chart-area").setAttribute("d","M"+points.map(p=>p.join(",")).join(" L")+" L215,80 L26,80 Z");
      chart.querySelector("svg").setAttribute("aria-label",metric.name+" simulated utilization history, current "+current+" percent, scale zero to one hundred percent");
    });
  }
  drawResources();
  setInterval(()=>{
    metrics.forEach(metric=>{metric.history.shift();metric.history.push(nextSample(metric,metric.history.at(-1)));});
    drawResources();
  },2000);
  function setResourceDetails(open){
    animateDisclosure($("resourceDetails"),open);
    $("resourceToggle").setAttribute("aria-expanded",String(open));
    $("resourceToggle").textContent=open?"Hide details ▴":"Details ▾";
  }
  $("resourceToggle").addEventListener("click",()=>setResourceDetails($("resourceToggle").getAttribute("aria-expanded")!=="true"));

  /* Connected systems: local demo inventory, with no actual connection operations. */
  const SYSTEM_KEY="gridai-home-demo-connections-v1";
  const defaults=[
    {id:"workstation",name:"Local workstation",type:"Computer",status:"Connected"},
    {id:"linux",name:"Linux MCP server",type:"MCP server",status:"Connected"},
    {id:"g2",name:"Even G2 Glasses",type:"Device",status:"Standby"},
    {id:"codex",name:"Cloud Codex",type:"Cloud service",status:"Available"}
  ];
  const systemTypes=["Computer","MCP server","Device","Cloud service","Other"];
  const systemStatuses=["Connected","Available","Standby","Offline"];
  function loadSystems(){
    try{
      const stored=JSON.parse(localStorage.getItem(SYSTEM_KEY)||"null");
      if(Array.isArray(stored))return stored.filter(s=>s&&typeof s.id==="string"&&typeof s.name==="string"&&s.name.length<=60&&systemTypes.includes(s.type)&&systemStatuses.includes(s.status)).slice(0,32);
    }catch{}
    return defaults.map(s=>({...s}));
  }
  let systems=loadSystems(), pendingDelete=null;
  function saveSystems(){
    try{localStorage.setItem(SYSTEM_KEY,JSON.stringify(systems));return true;}catch{return false;}
  }
  function node(tag,cls,value){
    const element=document.createElement(tag);
    if(cls)element.className=cls;
    if(value!==undefined)element.textContent=value;
    return element;
  }
  function systemDot(status){
    const dot=node("i","presence "+(status==="Offline"?"offline":status==="Standby"?"user":"available"));
    dot.setAttribute("aria-hidden","true");return dot;
  }
  function drawSystems(){
    const list=$("connectionList"), managed=$("managedConnections");
    list.replaceChildren();managed.replaceChildren();
    if(!systems.length){
      list.append(node("p","panel-note","No demo systems added."));
      managed.append(node("p","panel-note","Add a system below to get started."));
      return;
    }
    systems.forEach(system=>{
      const row=node("div");
      const name=node("span");name.append(systemDot(system.status),document.createTextNode(system.name));
      row.append(name,node("small","",system.status));list.append(row);
      const card=node("div","managed-system");
      const details=node("details","system-detail");
      const summary=node("summary");summary.append(systemDot(system.status),node("strong","",system.name));
      const description=node("p","",system.type+" · "+system.status+" (simulated)");
      details.append(summary,description);
      summary.addEventListener("click",event=>{
        if(reducedMotion.matches||typeof description.animate!=="function")return;
        event.preventDefault();
        const existing=description.getAnimations()[0];
        if(existing){existing.reverse();return;}
        const opening=!details.open;
        if(opening)details.open=true;
        const height=description.getBoundingClientRect().height;
        const animation=description.animate(opening?[{height:"0px",opacity:0,overflow:"hidden"},{height:height+"px",opacity:1,overflow:"hidden"}]:[{height:height+"px",opacity:1,overflow:"hidden"},{height:"0px",opacity:0,overflow:"hidden"}],{duration:220,easing:"ease",fill:"both"});
        animation.onfinish=()=>{details.open=opening?animation.playbackRate>0:animation.playbackRate<0;animation.cancel();};
      });
      const del=node("button","system-delete",pendingDelete===system.id?"Confirm delete":"Delete");
      del.type="button";del.setAttribute("aria-label",(pendingDelete===system.id?"Confirm delete ":"Delete ")+system.name);
      del.addEventListener("click",()=>{
        if(pendingDelete!==system.id){pendingDelete=system.id;drawSystems();Array.from(managed.querySelectorAll(".system-delete")).find(b=>b.getAttribute("aria-label")==="Confirm delete "+system.name)?.focus();return;}
        systems=systems.filter(s=>s.id!==system.id);pendingDelete=null;const saved=saveSystems();drawSystems();$("systemName").focus();toast("Demo system removed."+(saved?"":" Changes could not be saved in this browser."));addNotice("System removed",system.name+" · Demo inventory");
      });
      card.append(details,del);
      if(pendingDelete===system.id){
        const cancel=node("button","text-button","Cancel");cancel.type="button";
        cancel.addEventListener("click",()=>{pendingDelete=null;drawSystems();});
        card.append(cancel);
      }
      managed.append(card);
    });
  }
  function setConnections(open){
    animateDisclosure($("connectionManager"),open);
    $("connectionsToggle").setAttribute("aria-expanded",String(open));
    $("connectionsToggle").textContent=open?"Close ▴":"Manage ▾";
    if(!open&&pendingDelete!==null){pendingDelete=null;drawSystems();}
  }
  $("connectionsToggle").addEventListener("click",()=>setConnections($("connectionsToggle").getAttribute("aria-expanded")!=="true"));
  $("addSystemForm").addEventListener("submit",event=>{
    event.preventDefault();
    const name=$("systemName").value.trim(), error=$("systemError");
    const message=!name?"Enter a system name.":systems.some(s=>s.name.toLowerCase()===name.toLowerCase())?"A system with that name already exists.":systems.length>=32?"The demo supports up to 32 systems.":"";
    error.textContent=message;error.hidden=!message;if(message)return;
    systems.push({id:globalThis.crypto?.randomUUID?.()||Date.now()+"-"+Math.random(),name,type:$("systemType").value,status:$("systemStatus").value});
    pendingDelete=null;const saved=saveSystems();drawSystems();$("addSystemForm").reset();$("systemName").focus();toast("Demo system added."+(saved?"":" Changes could not be saved in this browser."));addNotice("System added",name+" · Demo inventory");
  });
  drawSystems();
  function openPanel(key){
    const resource=key==="system";
    if(resource)setResourceDetails(true);else setConnections(true);
    $(resource?"systemResources":"connectedSystems").scrollIntoView({block:"nearest",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    $(resource?"resourceToggle":"connectionsToggle").focus({preventScroll:true});
    setNav(false);
  }

})();
