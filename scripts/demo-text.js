"use strict";
/* Local, deterministic language matching for GRID.AI's GUI demo.
   No inference, external lookups, host operations or persistent memory. */
const GridDemoText = (() => {
  const domains = {
    MAXIS: /\b(?:code|coding|software|programming|repository|repositories|repo|github|git|commit|branch|merge|pull request|build|compile|tests?|testing|debug|bugs?|exception|stack trace|api|function|refactor|database|sql|javascript|python|c#|dotnet)\b/i,
    TRON: /\b(?:security|secure|firewall|malware|virus|threat|vulnerabilit\w*|permissions?|authentication|credentials?|secrets?|access control|audit|phishing|encryption)\b/i,
    JN: /\b(?:files?|folders?|directories|storage|drive|archive|backup|duplicates?|disk space|documents?|cleanup|organize files)\b/i,
    VOLT: /\b(?:cpu|gpu|vram|ram|memory usage|performance|resources?|hardware|telemetry|capacity|latency|slow|overheating|simulation|utilization|model usage)\b/i,
    RELAY: /\b(?:emails?|inbox|notifications?|messages?|messaging|delivery|alerts?|briefings?|reports?|calendar|reminders?|whatsapp|teams|outlook)\b/i,
    MCP: /\b(?:plan|planning|coordinate|delegate|delegation|tasks?|workflow|agents?|meeting|project|priorit\w*|roadmap|assign)\b/i
  };
  const topicNames={MAXIS:"software development",TRON:"security",JN:"files and storage",VOLT:"system performance",RELAY:"communications",MCP:"coordination"};
  const intents=[
    ["identity",/\b(?:who are you|what (?:do you do|are you|can you do|is your (?:role|job|purpose))|introduce yourself|(?:tell me about|describe) yourself|your responsibilities|your purpose|your role)\b/i],
    ["memory",/\b(?:remember|recall|what did (?:i|we) say|conversation (?:history|context)|export context|persistent memory)\b/i],
    ["approval",/\b(?:approv\w*|authorization|authoriz\w*|consent|permission to|confirm before)\b/i],
    ["debug",/\b(?:debug\w*|bugs?|exceptions?|stack trace|crash\w*|fail(?:ed|ing|ure|ures)?|errors?|broken|not working|fix)\b/i],
    ["review",/\b(?:review|inspect|audit|analy[sz]e|check|assess|compare|verify|investigate|find|identify|detect|search)\b/i],
    ["status",/\b(?:status|progress|how(?:'s| is) (?:it|the|your)|how are you doing|what are you working on|update on|health|are you busy)\b/i],
    ["explain",/\b(?:explain|what (?:is|are|does)|how (?:does|do|would|can|to)|why|difference between|teach)\b/i],
    ["plan",/\b(?:plan|outline|recommend|suggest|strategy|approach|roadmap|next steps|delegate|coordinate)\b/i],
    ["action",/\b(?:create|build|write|make|send|email|delete|remove|install|run|execute|update|change|implement|organize|schedule|deploy|commit|push|merge|backup|summarize)\b/i]
  ];
  const clean=s=>String(s??"").replace(/(^|\s)@[a-z0-9_-]+\b/gi,"$1").replace(/\s+/g," ").trim();
  const social=s=>{
    if(/^(?:hi|hey|hello|good (?:morning|afternoon|evening))(?:[\s,!]+(?:there|everyone|team|guys|mcp|maxis|tron|jn|volt|relay))*[.!?]*$/i.test(s))return "greeting";
    if(/^(?:thank(?:s| you)(?: so much| a lot)?|much appreciated|awesome|great|nice|cool|perfect|sounds good|got it)[.! ]*$/i.test(s))return "thanks";
    if(/^(?:bye|goodbye|see you(?: later)?|talk later|good night)[.! ]*$/i.test(s))return "farewell";
    if(/^(?:how are you(?: doing)?|how's it going|what's up)[?! .]*$/i.test(s))return "checkin";
    return null;
  };
  function classify(input,history=[]){
    const text=clean(input), exact=social(text);
    if(exact)return {intent:exact,domain:null,text,followup:false};
    const scores=Object.entries(domains).map(([name,re])=>[name,(text.match(new RegExp(re.source,"gi"))||[]).length]);
    scores.sort((a,b)=>b[1]-a[1]);
    let domain=scores[0][1]?scores[0][0]:null;
    let intent=intents.find(([,re])=>re.test(text))?.[0]||"unknown";
    const followup=/^(?:yes|no|sure|okay|ok|go ahead|continue|do it|what about|how about|and |also |why\??$|how\??$|tell me more|more detail|what next|next step|elaborate|can you expand)/i.test(text);
    if((followup || intent==="memory") && !domain){
      const prior=history.slice(-6).reverse().find(m=>m.role==="You"&&clean(m.text)&&!social(clean(m.text))&&!/^(?:yes|no|sure|okay|ok|go ahead|continue|do it|tell me more|more detail|what next)[.!? ]*$/i.test(clean(m.text)));
      if(prior){
        const previous=classify(prior.text,[]);
        domain=previous.domain;
        if(intent==="unknown")intent=/^(?:yes|sure|okay|ok|go ahead|do it)/i.test(text)?"approval":previous.intent==="unknown"?"plan":previous.intent;
        return {intent,domain,text,followup:true,previous:clean(prior.text).slice(0,160)};
      }
    }
    return {intent,domain,text,followup};
  }
  const roles={
    MCP:{greet:["Hey, Master Control. What are we tackling today?","Hello. I’m ready to coordinate. What’s the priority?"],thanks:["Of course. I’ll be here when you need the next plan.","Anytime. We can move on to the next item whenever you’re ready."],focus:"Define the objective, break it into bounded tasks, match specialists to the work, then establish review and approval gates.",question:"What outcome should we prioritize?",status:"My coordination interface is available. No live worker jobs are connected."},
    MAXIS:{greet:["Hey! Got a bug or a feature you want to work through?","MAXIS here. What are we building?"],thanks:["Happy to help. We can tackle the next change when you're ready.","No problem. Keep the tests in mind."],focus:"Identify the relevant source files, reproduce the issue or define acceptance criteria, propose a minimal patch, then verify tests.",question:"Which repository, file, language, or error should we start with?",status:"Ready for software tasks. I haven’t inspected a real repository or run a build in this demo."},
    TRON:{greet:["TRON online. What security question can I help with?","Hello. Ready to review risks and permission boundaries."],thanks:["Understood. Keep the scope and approval boundaries clear.","You're welcome. I’ll be here if another risk needs review."],focus:"Identify the assets and access boundaries, collect read-only evidence, classify risks, and recommend mitigations for review.",question:"Which system, permission, or security finding should we examine?",status:"Available for a read-only security review. No live scan or host evidence is available."},
    JN:{greet:["Hi! Need a hand organizing files or storage?","JN here. What needs sorting out?"],thanks:["Anytime. Keep the originals safe until the plan is reviewed.","Glad to help. We can organize the next batch when you’re ready."],focus:"Inventory the target files, compare metadata and duplicate candidates, propose an organized destination, and request approval before moving or deleting anything.",question:"Which folder, file types, or storage destination are involved?",status:"Ready to plan storage work. I haven’t accessed or changed any real files."},
    VOLT:{greet:["VOLT online. Want to look at performance or resource usage?","Hey. Tell me what’s running slowly."],thanks:["No problem. A good baseline makes the next optimization easier.","Glad to help. We can compare resource limits next."],focus:"Establish a CPU, GPU, RAM and VRAM baseline, identify the likely bottleneck, change one variable at a time, and compare measurements.",question:"Which machine, workload, and resource measurement should we focus on?",status:"Available for performance analysis. The demo has no actual hardware telemetry."},
    RELAY:{greet:["Hi! Need a briefing, message, or notification plan?","RELAY here. What should we communicate?"],thanks:["You're welcome. Let me know if you need another draft.","Happy to help. We can refine the message whenever you like."],focus:"Identify the audience, channel, content and timing, draft the communication, then confirm the destination before any real send.",question:"Who should receive it, through which channel, and when?",status:"Ready to prepare communications. No live inbox, calendar or delivery service is connected."}
  };
  const specific={
    MAXIS:{
      debug:"Start with the exact error and steps to reproduce it. I’d isolate the failing component, check the smallest relevant change, and add a regression test.",
      review:"I’d inspect the affected modules, trace the behavior, look for edge cases and test coverage, then separate required fixes from optional improvements.",
      action:"I can help outline the implementation: establish the inputs and expected behavior, make the smallest coherent change, and define validation tests."
    },
    TRON:{
      debug:"I’d distinguish an actual security incident from a configuration or access issue. Start with the observed error and non-sensitive evidence; don't disable protections just to test.",
      review:"I’d check authorization scope, least privilege, exposed secrets, and auditability. I would report evidence and recommended remediation before any change."
    },
    JN:{
      review:"I’d start with a read-only inventory, compare names, sizes and hashes where available, and distinguish verified duplicates from merely similar files.",
      action:"I’d create a proposed folder map and a move/copy list first. Keep originals and verify the destination before any deletion."
    },
    VOLT:{
      debug:"I’d separate compute saturation, memory pressure, storage latency and model-loading overhead. Compare idle versus loaded measurements before tuning.",
      review:"I’d compare utilization and latency over the same workload and time window, looking for sustained saturation rather than a single spike."
    },
    RELAY:{
      action:"I can prepare a draft communication with the requested audience, subject, key points and delivery timing. Actual sending requires a connected service and approval.",
      review:"I’d separate actionable messages from informational updates, group by urgency, and highlight deadlines or decisions that need attention."
    },
    MCP:{
      plan:"I’d split this into a discovery task, specialist proposals, a review checkpoint and a final operator decision. Each worker should have a specific deliverable and bounded permissions.",
      action:"I’d turn this into a bounded assignment, choose the appropriate specialist, and collect a proposal before requesting authorization."
    }
  };
  function pick(options,history){
    const last=history.slice(-6).map(m=>m.text);
    const remaining=options.filter(x=>!last.includes(x));
    const pool=remaining.length?remaining:options;
    return pool[Math.floor(Math.random()*pool.length)];
  }
  function reply(agent,input,history=[],bio=""){
    const role=roles[agent]||roles.MCP;
    const x=classify(input,history);
    const demo=" (Demo only — no external operation performed.)";
    switch(x.intent){
      case "greeting":return pick(role.greet,history);
      case "thanks":return pick(role.thanks,history);
      case "farewell":return "See you later. I'll be available when you return.";
      case "checkin":return "Doing well — "+role.status.charAt(0).toLowerCase()+role.status.slice(1);
      case "identity":return bio+"\n\nThis is my simulated role in the GUI demo.";
      case "memory":return x.previous?"In this conversation, your earlier request was: “"+x.previous+"”. I can use the visible demo transcript, not persistent memory.":"I can use recent messages in this conversation, within its permitted scope. I don't have access to other chats or persistent GRID.AI memory.";
      case "status":return role.status+(x.domain&&x.domain!==agent?" For "+topicNames[x.domain]+", "+x.domain+" would be the relevant specialist.":"");
      case "approval":return (x.previous?"I understand that you're following up on the earlier request. ":"")+"I can outline the proposed operation and the scope to review. A chat reply is not an execution approval; use the demo approval card to review a simulated request."+demo;
    }
    if(x.domain&&x.domain!==agent&&agent!=="MCP"){
      return "That sounds primarily like "+topicNames[x.domain]+". "+x.domain+" is the specialist for that. From my side, "+role.focus.charAt(0).toLowerCase()+role.focus.slice(1)+"\n\n"+role.question+demo;
    }
    const prefix=x.followup&&x.previous?"Continuing from your earlier request: ":"";
    if(x.intent==="unknown")return prefix+"I can help work through that, but I need a little more detail. "+role.question;
    if(agent==="MCP"&&x.domain&&x.domain!=="MCP"){
      return prefix+"I'd route the "+topicNames[x.domain]+" portion to "+x.domain+". "+(specific[x.domain]?.[x.intent]||roles[x.domain].focus)+"\n\nI'll keep the assignment bounded and review the result before any real action."+demo;
    }
    const body=specific[agent]?.[x.intent]||role.focus;
    return prefix+body+"\n\n"+role.question+demo;
  }
  function route(input,participants,history=[]){
    const x=classify(input,history);
    return x.domain&&participants.includes(x.domain)?x.domain:participants.includes("MCP")?"MCP":participants[0];
  }
  return {classify,reply,route};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=GridDemoText;
