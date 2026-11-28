"use strict";
/* Single browser-session source of simulated agent presence. No host access. */
(() => {
  const agents=Object.freeze(["MCP","MAXIS","TRON","JN","VOLT","RELAY"]);
  const labels=Object.freeze({available:"Available",background:"Working in background",user:"Working with User",agents:"Working with Agents",both:"Working with User and Agents"});
  let route="home",connect={selected:{},pending:{},live:{}},workflow={pending:false,stage:""};
  const baseline={},listeners=new Set();
  const make=(mode,source,task,detail="",label=labels[mode])=>({mode,source,task,detail,label});
  for(const agent of agents)baseline[agent]=make("available","background","Awaiting assignment","Ready for the next task");
  function resolve(agent){
    if(agent==="MCP"&&workflow.pending)return make(route==="workflow-designer"?"user":"background","workflow","Workflow Designer",workflow.stage||"Drafting workflow…",workflow.stage||"Drafting workflow…");
    if(route==="connect"&&connect.selected[agent]){
      const mode=connect.selected[agent];
      return make(mode,"connect",mode==="both"?"Active agent meeting":"Active conversation","Connect · Demo");
    }
    if(connect.live[agent])return make("agents","connect","Live agent meeting","Meeting continues in Connect · Demo");
    if(connect.pending[agent])return make(connect.pending[agent],"connect","Preparing response","Connect · Demo");
    if(agent==="MCP"&&route==="workflow-designer")return make("user","workflow","Workflow Designer","Ready to design a workflow");
    return baseline[agent];
  }
  let current=Object.fromEntries(agents.map(a=>[a,resolve(a)]));
  function publish(){
    const next=Object.fromEntries(agents.map(a=>[a,resolve(a)]));
    const changed=agents.filter(a=>JSON.stringify(current[a])!==JSON.stringify(next[a]));
    if(!changed.length)return;
    current=next;
    for(const listener of listeners){try{listener(snapshot(),changed);}catch(error){console.error("GRID presence listener failed",error);}}
  }
  function snapshot(){return Object.fromEntries(agents.map(a=>[a,{...current[a]}]));}
  window.GridPresence={
    get:agent=>({...current[agent]}),snapshot,
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    setRoute(next){route=next;publish();},
    setBaseline(agent,working,task,detail){if(!agents.includes(agent))return;baseline[agent]=working?make("background","background",task,detail):make("available","background","Awaiting assignment","Ready for the next task");publish();},
    setConnect(next){connect={selected:{...next.selected},pending:{...next.pending},live:{...next.live}};publish();},
    setWorkflow(pending,stage){workflow={pending:Boolean(pending),stage:String(stage||"")};publish();}
  };
})();
