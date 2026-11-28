"use strict";
/* Persistent route shell: native shadow-root workspaces, no document reloads or iframes. */
(() => {
  const $=id=>document.getElementById(id);
  const workspace=$("gridWorkspace"), pages=Array.from(workspace.querySelectorAll("[data-page]"));
  const config={
    home:["Home","home"],connect:["Connect","connect"],"workflow-designer":["Workflow Designer","workflow-designer"],
    "command-center":["Command Center","planned","Monitor agent activity, delegation and tasks."],
    projects:["Project Manager","planned","Manage project repositories, teams and objectives."],
    agents:["Agent Directory","planned","Configure agent identities, skills, models and permissions."],
    integrations:["Integrations","planned","Yet to be added."],"system-monitor":["System Monitor","planned","Yet to be added."],
    "files":["File Manager","planned","Yet to be added."],
    "skills":["Skills Manager","planned","Yet to be added."],
    "models":["Model Manager","planned","Yet to be added."],
    "voice-studio":["Voice Studio","planned","Yet to be added."],
    "terminal":["Terminal","planned","Yet to be added."],
    settings:["Settings","settings"]
  };
  const motion=matchMedia("(prefers-reduced-motion: reduce)");
  const instances=new Map();let active=null,revision=0,transition=null;
  const nav=document.querySelector(".home-nav"), indicator=document.createElement("i");
  indicator.className="nav-indicator";indicator.setAttribute("aria-hidden","true");nav.prepend(indicator);
  function parse(){
    const [raw,query=""]=location.hash.slice(1).split("?");
    const route=Object.hasOwn(config,raw)?raw:"home";
    return {route,params:Object.fromEntries(new URLSearchParams(query))};
  }
  function markRoute(route){
    nav.querySelectorAll("[data-route]").forEach(link=>{
      const selected=link.dataset.route===route;link.classList.toggle("current",selected);
      if(selected)link.setAttribute("aria-current","page");else link.removeAttribute("aria-current");
    });
    const link=nav.querySelector('[data-route="'+route+'"]');
    if(link)indicator.style.transform="translateY("+(link.offsetTop+(link.offsetHeight-20)/2)+"px)";
    $("workspaceName").textContent=config[route][0].toUpperCase();
    document.title="GRID.AI | "+config[route][0];
  }
  function mount(name){
    if(instances.has(name))return instances.get(name);
    const source=window.GridEmbedded[name],host=$(name==="connect"?"connectHost":"workflowHost");
    if(!source)throw Error("Missing workspace "+name);
    const root=host.shadowRoot||host.attachShadow({mode:"open"});
    root.replaceChildren();
    const sheet=document.createElement("style");sheet.textContent=source.css;
    const body=document.createElement("div");body.className="embedded-document";body.innerHTML=source.markup;
    root.append(sheet,body);
    // Adapt legacy document-level queries and event delegation to the isolated workspace.
    const doc={
      getElementById:id=>root.getElementById(id),querySelector:s=>root.querySelector(s),querySelectorAll:s=>root.querySelectorAll(s),
      createElement:document.createElement.bind(document),createTextNode:document.createTextNode.bind(document),
      addEventListener:root.addEventListener.bind(root),removeEventListener:root.removeEventListener.bind(root),
      get activeElement(){return root.activeElement;},body
    };
    const local=new EventTarget(),globals=Object.create(null);
    const win=new Proxy(globals,{
      get(target,key){
        if(key==="innerWidth")return host.clientWidth||workspace.clientWidth;
        if(key==="innerHeight")return host.clientHeight||workspace.clientHeight;
        if(key==="matchMedia")return query=>{
          const m=query.match(/^\(\s*(min|max)-width:\s*(\d+)px\s*\)$/);
          if(!m)return window.matchMedia(query);
          const width=host.clientWidth||workspace.clientWidth;
          return {matches:m[1]==="min"?width>=Number(m[2]):width<=Number(m[2]),media:query};
        };
        if(key==="addEventListener")return (type,fn,options)=>(type==="resize"?local:window).addEventListener(type,fn,options);
        if(key==="removeEventListener")return (type,fn,options)=>(type==="resize"?local:window).removeEventListener(type,fn,options);
        if(Object.hasOwn(target,key))return target[key];
        const value=window[key];return typeof value==="function"?value.bind(window):value;
      },
      set(target,key,value){target[key]=value;return true;}
    });
    const bridge={notice(title,detail,chatId){
      window.GridHome.addNotice(title,detail,null,()=>open(name,chatId==null?{}:{chat:String(chatId)}));
    }};
    const api=source.mount(doc,win,host,bridge);
    const resize=()=>{if(host.clientWidth>0)local.dispatchEvent(new Event("resize"));};
    if(typeof ResizeObserver!=="undefined")new ResizeObserver(resize).observe(host);
    const instance={api,resize};instances.set(name,instance);return instance;
  }
  function pageFor(route){return pages.find(p=>p.dataset.page===config[route][1]);}
  function animate(element,from,to,duration){
    if(!window.GridSettings.motionEnabled()||!element.animate)return null;
    return element.animate([from,to],{duration,easing:"cubic-bezier(.22,.72,.25,1)",fill:"both"});
  }
  async function apply(route,params={}){
    const token=++revision;
    if(transition){transition.cancel();transition=null;}
    const next=pageFor(route),previous=active? pageFor(active):null;
    markRoute(route);
    window.GridHome.setNav(false);
    window.GridHome.setNotifications(false);
    if(previous&&previous!==next){
      previous.inert=true;
      const exit=animate(previous,{opacity:1,transform:"translateY(0)"},{opacity:0,transform:"translateY(-5px)"},180);
      transition=exit;
      if(exit)try{await exit.finished;}catch{}
      if(token!==revision)return;
      if(exit)exit.cancel();
    }
    if(token!==revision)return;
    pages.forEach(p=>{p.hidden=p!==next;p.inert=p!==next;});
    if(config[route][1]==="planned"){$("plannedTitle").textContent=config[route][0];$("plannedDescription").textContent=config[route][2]==="Yet to be added."?config[route][2]:config[route][2]+" This workspace is not yet implemented.";}
    active=route;
    window.GridPresence.setRoute(route);
    if(route==="connect"||route==="workflow-designer"){
      try{
        const instance=mount(route);
        instance.resize();
        if(route==="connect"&&params.agent)instance.api.openAgent(params.agent);
        if(route==="connect"&&params.chat)instance.api.openChat(params.chat);
        requestAnimationFrame(()=>{if(active===route)instance.resize();});
      }catch(error){
        console.error("GRID.AI workspace could not initialize",error);
        const host=$(route==="connect"?"connectHost":"workflowHost");
        const target=host.shadowRoot||host;const failure=document.createElement("p");failure.textContent="Unable to initialize this demo workspace. Refresh to retry.";failure.style.cssText="padding:24px;color:#f07878";target.append(failure);
      }
    }
    if(route==="home"&&(params.attention||params.approval)){
      requestAnimationFrame(()=>{if(token!==revision)return;window.GridHome.showAttention();if(params.approval)window.GridHome.review(params.approval);});
    }
    if(previous!==next){
      const enter=animate(next,{opacity:0,transform:"translateY(5px)"},{opacity:1,transform:"translateY(0)"},300);
      transition=enter;
      if(enter)try{await enter.finished;}catch{}
      if(token===revision){enter?.cancel();transition=null;}
    }
  }
  function open(route,params={}){
    if(!Object.hasOwn(config,route))route="home";
    const serial=new URLSearchParams(Object.entries(params).filter(([,v])=>v!==undefined&&v!==null));
    const hash="#"+route+(serial.size?"?"+serial.toString():"");
    if(location.hash!==hash)history.pushState(null,"",hash);
    return apply(route,params);
  }
  window.GridRouter={open,presence:()=>Object.fromEntries(Object.entries(window.GridPresence.snapshot()).map(([agent,record])=>[agent,record.mode]))};
  document.addEventListener("click",event=>{
    const link=event.target.closest?.("a[data-route]");
    if(!link||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
    event.preventDefault();open(link.dataset.route);
  });
  window.addEventListener("popstate",()=>{const p=parse();apply(p.route,p.params);});
  window.addEventListener("hashchange",()=>{const p=parse();apply(p.route,p.params);});
  window.addEventListener("resize",()=>{if(active)markRoute(active);});
  const initial=parse();apply(initial.route,initial.params);
  // The timer exists once in the shell and survives workspace navigation.
  // No request is generated while the page is hidden or while the preference is off.
  let approvalTimer=null;
  const delay=(min,max)=>min+Math.floor(Math.random()*(max-min+1));
  function scheduleApproval(first=false){
    clearTimeout(approvalTimer);
    approvalTimer=null;
    if(!window.GridSettings.get().automaticApprovals)return;
    approvalTimer=setTimeout(()=>{
      approvalTimer=null;
      try{
        if(!document.hidden&&window.GridSettings.get().automaticApprovals&&!document.querySelector("dialog[open]")){
          // Lazy initialization does not change the route or select a conversation.
          mount("connect").api.requestAutomaticApproval();
        }
      }catch(error){console.error("GRID demo approval generator failed",error);}
      finally{scheduleApproval();}
    },first?delay(20000,35000):delay(35000,75000));
  }
  let automaticEnabled=window.GridSettings.get().automaticApprovals;
  window.GridSettings.subscribe(value=>{
    if(value.automaticApprovals===automaticEnabled)return;
    automaticEnabled=value.automaticApprovals;
    scheduleApproval(true);
  });
  scheduleApproval(true);
})();
