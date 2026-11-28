/* Regenerate the native workspace adapters after editing the standalone applications. */
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const definitions={
  "connect": {
    "html": "Chat.html",
    "styles": [
      "chat",
      "agent-ui",
      "workspace-ui",
      "connect-media-demo",
      "live-meeting-demo",
      "live-tile-layout"
    ],
    "scripts": [
      "demo-text",
      "chat",
      "agent-ui",
      "workspace-ui",
      "connect-media-demo",
      "live-meeting-demo",
      "live-tile-layout",
      "ui-sounds"
    ]
  },
  "workflow-designer": {
    "html": "Workflow-Designer.html",
    "styles": [
      "workflow-designer"
    ],
    "scripts": [
      "ui-sounds",
      "workflow-designer"
    ]
  }
};
function build(name,def,read){
  let html=read(def.html).match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"").replace(/<a class="grid-home-link"[^>]*>[\s\S]*?<\/a>/gi,"");
  html=html.replace(/<button\b[^>]*\bid="(?:soundToggle|typewriterToggle|motionToggle)"[^>]*>[\s\S]*?<\/button>/g,button=>button.replace("<button","<button hidden aria-hidden=\"true\" tabindex=\"-1\""));
  let css=def.styles.map(x=>read("styles/"+x+".css")).join("\n").replace(/:root(?=\s*\{)/g,":host").replace(/(^|\n)([ \t]*)html\s*,\s*body(?=\s*\{)/g,"$1$2.embedded-document").replace(/(^|\n)([ \t]*)body(?=\s*\{)/g,"$1$2.embedded-document").replace(/@media\s*(?=\(\s*(?:min|max)-width\s*:)/g,"@container grid-workspace ").replace(/(\d+(?:\.\d+)?)d?vh\b/g,"$1cqh").replace(/(\d+(?:\.\d+)?)d?vw\b/g,"$1cqw");
  css+="\n:host{display:block;width:100%;height:100%;container:grid-workspace / size;contain:layout paint;position:relative;background:var(--bg);color:var(--text);font:14px 'Segoe UI',Arial,sans-serif}.embedded-document{height:100%;width:100%;min-height:0;position:relative;overflow:auto}";
  if(name==="connect")css+="\n.embedded-document>.app{height:100%;min-height:0}.embedded-document{overflow:hidden}";
  else css+="\n.embedded-document .studio-brand,.embedded-document .sidebar-operator{display:none}.embedded-document .designer-shell{min-height:100%}@container grid-workspace (min-width:1051px){.embedded-document .designer-shell,.embedded-document .studio-main,.embedded-document .studio-sidebar{height:100%;min-height:0}}";
  css+="\n[hidden]{display:none!important}.embedded-document{isolation:isolate}";
  css+="\n:host([data-grid-motion=off]) *, :host([data-grid-motion=off]) *::before, :host([data-grid-motion=off]) *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}";
  let sources=def.scripts.filter(x=>x!=="ui-sounds").map(x=>{
    let s=read("scripts/"+x+".js");
    if(x==="chat"){
      const startup="syncMotionControls();\nrenderAgentList();\nrender();\nsyncInspectorControls();\nshowFirstChatEntrance();";
      if(!s.includes(startup))throw Error("Connect startup changed; update embedded generator.");
      s=s.replace(startup,"/* Startup deferred until agent-ui lexical state is initialized. */");
      s=s.replace("typewriter:true,motionEnabled:true","typewriter:window.GridSettings.get().typewriter,motionEnabled:window.GridSettings.motionEnabled()");
    }
    if(x==="agent-ui"){
      if(!s.trimEnd().endsWith("render();"))throw Error("Agent UI startup changed; update embedded generator.");
      s=s.trimEnd().slice(0,-"render();".length)+"syncMotionControls();\nrenderAgentList();\nrender();\nsyncInspectorControls();\nshowFirstChatEntrance();"+"\n";
    }
    if(x==="live-meeting-demo"||x==="live-tile-layout")s=s.replace(/(\("motionToggle"\)\?\.addEventListener\()"click"/g,'$1"grid-settings-motion"');
    if(x==="workspace-ui")s=s.replace("resizeFromPointer(event.clientX);","resizeFromPointer(event.clientX - host.getBoundingClientRect().left);");
    if(x==="chat")s=s.replace("function showToast(message) {","function showToast(message) {\n  return bridge.notice('Connect',message,currentChat()?.id ?? null);");
    if(x==="workflow-designer")s=s.replace("function notify(text) {","function notify(text) {\n    return bridge.notice('Workflow Designer',text);");
    return "// Source: scripts/"+x+".js\n"+s;
  }).join("\n;\n");
  const preferenceHook=name==="connect"?`function applyGridPreferences(value){
    const previous=state.motionEnabled;
    state.typewriter=value.typewriter;
    state.motionEnabled=window.GridSettings.motionEnabled();
    host.dataset.gridMotion=state.motionEnabled?"on":"off";
    syncMotionControls();
    if(!state.typewriter||!state.motionEnabled){finishTypewriter();agentUiFinishWhisperTyping();}
    if(previous!==state.motionEnabled)document.getElementById("motionToggle").dispatchEvent(new Event("grid-settings-motion"));
  }
  applyGridPreferences(window.GridSettings.get());
  window.GridSettings.subscribe(applyGridPreferences);
  `:`function applyGridPreferences(){host.dataset.gridMotion=window.GridSettings.motionEnabled()?"on":"off";}
  applyGridPreferences();window.GridSettings.subscribe(applyGridPreferences);
  `;
  const api=name==="connect"?`return {openAgent(agent){if(!Object.prototype.hasOwnProperty.call(AGENTS,agent))return;const existing=state.chats.find(c=>c.type==="private"&&c.participants.length===1&&c.participants[0]===agent);if(existing)selectChat(existing.id);else createPrivateConversation(agent);},openChat(id){if(findChat(Number(id)))selectChat(Number(id));},requestAutomaticApproval(){return requestAutomaticApproval();},presence(){return Object.fromEntries(ORDER.map(a=>[a,agentUiStatus(a)]));},refresh(){render();syncInspectorControls();}};`:`return {refresh(){}};`;
  return "/* GENERATED by tools/build-embedded.cjs. Edit standalone source files, then regenerate. */\nwindow.GridEmbedded = window.GridEmbedded || {};\nwindow.GridEmbedded["+JSON.stringify(name)+"] = {markup:"+JSON.stringify(html)+",css:"+JSON.stringify(css)+",mount:function(document,window,host,bridge){\n\"use strict\";\n"+sources+"\n"+preferenceHook+"\n"+api+"\n}};\n";
}
for(const [name,def] of Object.entries(definitions)){
  const output=build(name,def,p=>fs.readFileSync(path.join(root,p),"utf8"));
  fs.writeFileSync(path.join(root,"scripts/embedded-"+name+".js"),output);
}
