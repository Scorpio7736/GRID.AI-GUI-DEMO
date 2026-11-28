"use strict";
/* Voice Studio: pre-recorded local MP3 audition only. No synthesis, microphone,
   API, network account, persistent data or integration with other workspaces. */
(() => {
  const $=id=>document.getElementById(id);
  const agents=[
    {id:"MCP",name:"Mcp",role:"Coordinator",image:"./Programs/Agents/MCP/MCP_HEADSHOT.png"},
    {id:"MAXIS",name:"MAXIS",role:"Software engineering",image:"./Programs/Agents/Maxis/MAXIS_HEADSHOT.png"},
    {id:"TRON",name:"TRON",role:"Security",image:"./Programs/Agents/TRON/TRON_HEADSHOT.png"},
    {id:"JN",name:"JN",role:"Files & storage",image:"./Programs/Agents/JN/JN_HEADSHOT.png"},
    {id:"VOLT",name:"VOLT",role:"Resources"},
    {id:"RELAY",name:"RELAY",role:"Communications"}
  ];
  // Add verified verbatim transcript strings here once supplied. Never invent a transcript.
  const samples=[
    {id:"Agent",name:"Agent",file:"./Audio/Voices/Agent_VOICE.mp3",transcript:""},
    {id:"Butler",name:"Butler",file:"./Audio/Voices/Butler_VOICE.mp3",transcript:""},
    {id:"Classic",name:"Classic",file:"./Audio/Voices/Classic_VOICE.mp3",transcript:""},
    {id:"Gentleman",name:"Gentleman",file:"./Audio/Voices/Gentleman_VOICE.mp3",transcript:""},
    {id:"GrandGeneral",name:"Grand General",file:"./Audio/Voices/GrandGeneral_VOICE.mp3",transcript:""},
    {id:"Humanoid",name:"Humanoid",file:"./Audio/Voices/Humanoid_VOICE.mp3",transcript:""},
    {id:"Hunter",name:"Hunter",file:"./Audio/Voices/Hunter_VOICE.mp3",transcript:""},
    {id:"PIMA",name:"PIMA",file:"./Audio/Voices/PIMA_VOICE.mp3",transcript:""},
    {id:"Royal",name:"Royal",file:"./Audio/Voices/Royal_VOICE.mp3",transcript:""}
  ];
  const assignments=new Map([["MAXIS","Humanoid"],["TRON","PIMA"],["JN","Classic"],["VOLT","Gentleman"],["RELAY","GrandGeneral"]]),transcripts=new Map(samples.map(s=>[s.id,s.transcript]));
  let selectedAgent=agents[0],selectedVoice=null,frame=null,playToken=0,activeSource="",failed=false;
  const audio=$("voiceAudio");
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  function portrait(agent,large=false){
    const n=el("div","voice-avatar"+(large?" large":""),agent.id==="MCP"?"MC":agent.id.slice(0,2));
    if(agent.image){const img=el("img");img.src=agent.image;img.alt="";img.addEventListener("error",()=>img.remove(),{once:true});n.append(img);}
    return n;
  }
  function renderAgents(){
    $("voiceAgentList").replaceChildren(...agents.map(agent=>{
      const b=el("button","voice-agent"+(selectedAgent.id===agent.id?" selected":""));b.type="button";b.setAttribute("aria-pressed",String(selectedAgent.id===agent.id));
      const text=el("span","voice-agent-copy");text.append(el("strong","",agent.name),el("small","",agent.role));
      const name=samples.find(s=>s.id===assignments.get(agent.id))?.name;
      b.append(portrait(agent),text,el("span","voice-agent-assignment",name||"Unassigned"));
      b.addEventListener("click",()=>{
        if(selectedAgent.id===agent.id)return;
        stop();
        selectedAgent=agent;
        const assigned=samples.find(s=>s.id===assignments.get(agent.id));
        chooseVoice(assigned||null);
        $("voiceFeedback").textContent=agent.name+" selected. Choose a sample and assign a voice.";
      });
      return b;
    }));
  }
  function renderCatalog(){
    $("voiceCatalog").replaceChildren(...samples.map(sample=>{
      const b=el("button","voice-sample"+(sample.id===selectedVoice?.id?" selected":""));b.type="button";b.setAttribute("aria-pressed",String(sample.id===selectedVoice?.id));
      const icon=el("span","voice-sample-icon","♪");icon.setAttribute("aria-hidden","true");
      const copy=el("span","voice-sample-copy");copy.append(el("strong","",sample.name),el("small","","Fish.Audio · MP3"));
      b.append(icon,copy,el("span","voice-sample-tag",assignments.get(selectedAgent.id)===sample.id?"ASSIGNED":sample.id===selectedVoice?.id?"SELECTED":""));
      b.addEventListener("click",()=>chooseVoice(sample));return b;
    }));
  }
  function render(){
    renderAgents();renderCatalog();
    $("voicePreviewPortrait").replaceChildren(portrait(selectedAgent,true));
    $("voicePreviewAgent").textContent=selectedAgent.name;
    $("voicePreviewName").textContent=selectedVoice?.name||"Select a voice";
    const assigned=samples.find(s=>s.id===assignments.get(selectedAgent.id));
    $("voiceAssignmentLabel").textContent=assigned?"Assigned voice: "+assigned.name:"No voice assigned";
    $("voiceAssign").textContent=selectedVoice&&assigned?.id===selectedVoice.id?"Voice assigned":"Assign to "+selectedAgent.name;
    $("voiceAssign").disabled=!selectedVoice||assigned?.id===selectedVoice?.id;
    $("voicePlay").disabled=!selectedVoice;
    $("voiceTranscriptInput").disabled=!selectedVoice;
    $("voiceClear").disabled=!assigned;
    $("voiceTranscriptInput").value=transcripts.get(selectedVoice?.id)||"";
    $("voiceApplyAll").disabled=!$("voiceTranscriptInput").value.trim();
    updateProgress();
  }
  function timeLabel(seconds){
    if(!Number.isFinite(seconds)||seconds<0)return "—";
    return Math.floor(seconds/60)+":"+String(Math.floor(seconds%60)).padStart(2,"0");
  }
  // The media clock is authoritative. Pause, seek and replay update the same caption
  // fraction; no independent character timer can drift from the audio.
  function updateProgress(){
    const duration=selectedVoice?audio.duration:NaN,valid=Number.isFinite(duration)&&duration>0;
    const fraction=valid?Math.max(0,Math.min(1,audio.currentTime/duration)):0;
    const transcript=transcripts.get(selectedVoice?.id)||"";
    const glyphs=Array.from(transcript);
    $("voiceSpokenText").textContent=glyphs.slice(0,audio.ended?glyphs.length:Math.floor(glyphs.length*fraction)).join("");
    $("voiceSpokenText").hidden=!transcript.trim();
    $("voiceTranscriptEmpty").hidden=!!transcript.trim();
    $("voiceTranscriptState").textContent=transcript.trim()?"TRANSCRIPT ENTERED":"NOT PROVIDED";
    $("voiceTranscriptProgress").textContent=Math.round(fraction*100)+"%";
    $("voiceCurrentTime").textContent=timeLabel(selectedVoice?audio.currentTime:0);
    $("voiceDuration").textContent=timeLabel(duration);
    $("voiceSeek").disabled=!valid;$("voiceSeek").max=valid?String(duration):"1";
    $("voiceSeek").value=valid?String(Math.min(duration,audio.currentTime)):"0";
    $("voiceRestart").disabled=!valid;
  }
  function setPlaying(on){
    $("voiceWave").classList.toggle("playing",on);
    $("voicePlay").textContent=on?"Ⅱ Pause":"▶ Play sample";
    $("voicePlaybackStatus").textContent=on?"PLAYING":failed?"UNAVAILABLE":audio.ended?"COMPLETE":audio.currentTime>0?"PAUSED":"READY";
    if(frame!==null){cancelAnimationFrame(frame);frame=null;}
    if(on){const tick=()=>{updateProgress();if(!audio.paused&&!audio.ended)frame=requestAnimationFrame(tick);else frame=null;};frame=requestAnimationFrame(tick);}
  }
  function stop(){
    playToken++;
    audio.pause();
    if(Number.isFinite(audio.duration))audio.currentTime=0;
    setPlaying(false);updateProgress();
  }
  function chooseVoice(sample){
    stop();selectedVoice=sample;failed=false;
    if(sample){if(activeSource!==sample.file){activeSource=sample.file;audio.src=sample.file;audio.load();}}
    else if(activeSource){activeSource="";audio.removeAttribute("src");audio.load();}
    setPlaying(false);render();$("voiceFeedback").textContent=sample?"Selected "+sample.name+". Play the sample to audition it.":"Choose a voice to preview and assign.";
  }
  async function play(){
    if(!$("voiceAudio").closest("[data-page]").hidden&&selectedVoice){
      const token=++playToken;
      if(audio.ended)audio.currentTime=0;
      failed=false;
      try{await audio.play();if(token!==playToken)return;setPlaying(!audio.paused);}
      catch(error){if(token!==playToken)return;failed=true;setPlaying(false);$("voiceFeedback").textContent="Could not play this MP3. Check that the sample is included in the deployed site and your browser allows playback.";}
    }
  }
  $("voicePlay").addEventListener("click",()=>{if(audio.paused||audio.ended)play();else{playToken++;audio.pause();setPlaying(false);}});
  $("voiceRestart").addEventListener("click",()=>{if(Number.isFinite(audio.duration)){audio.currentTime=0;updateProgress();play();}});
  $("voiceSeek").addEventListener("input",event=>{if(Number.isFinite(audio.duration)){audio.currentTime=Math.max(0,Math.min(audio.duration,Number(event.target.value)));updateProgress();}});
  audio.volume=.8;
  $("voiceVolume").addEventListener("input",event=>{audio.volume=Number(event.target.value)/100;$("voiceVolumeLabel").textContent=event.target.value+"%";});
  for(const event of ["loadedmetadata","durationchange","timeupdate","seeked"])audio.addEventListener(event,updateProgress);
  audio.addEventListener("playing",()=>setPlaying(true));
  audio.addEventListener("pause",()=>{setPlaying(false);updateProgress();});
  audio.addEventListener("ended",()=>{setPlaying(false);updateProgress();});
  audio.addEventListener("error",()=>{if(!activeSource)return;failed=true;setPlaying(false);$("voiceFeedback").textContent="The selected sample could not be loaded.";});
  $("voiceAssign").addEventListener("click",()=>{
    if(!selectedVoice)return;
    assignments.set(selectedAgent.id,selectedVoice.id);render();
    $("voiceFeedback").textContent=selectedVoice.name+" assigned to "+selectedAgent.name+" for this session. Voice Studio only.";
  });
  $("voiceClear").addEventListener("click",()=>{assignments.delete(selectedAgent.id);chooseVoice(null);$("voiceFeedback").textContent="Voice assignment cleared for "+selectedAgent.name+".";});
  $("voiceTranscriptInput").addEventListener("input",event=>{if(!selectedVoice)return;transcripts.set(selectedVoice.id,event.target.value);$("voiceApplyAll").disabled=!event.target.value.trim();updateProgress();});
  $("voiceApplyAll").addEventListener("click",()=>{
    const value=$("voiceTranscriptInput").value;if(!value.trim())return;
    if(!window.confirm("Use these exact spoken words for every voice sample in this session?"))return;
    for(const sample of samples)transcripts.set(sample.id,value);
    updateProgress();$("voiceFeedback").textContent="Transcript copied to all nine samples for this session.";
  });
  window.GridVoiceStudio={stop};
  // Metadata is loaded only when entering the studio or selecting a sample.
  function activate(){if(selectedVoice&&!activeSource)chooseVoice(selectedVoice);}
  window.GridVoiceStudio.activate=activate;
  render();
})();
