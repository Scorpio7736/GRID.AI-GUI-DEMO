"use strict";
(()=>{
 const KEY="gridai-demo-settings-v1",defaults=Object.freeze({sounds:true,volume:67,animations:true,typewriter:true,pinnedSidebar:false,notificationBadge:true}),media=matchMedia("(prefers-reduced-motion: reduce)");
 let values={...defaults},storageAvailable=true;
 try{const saved=JSON.parse(localStorage.getItem(KEY)||"null");if(saved&&typeof saved==="object")for(const k of Object.keys(defaults)){if(k==="volume"&&typeof saved[k]==="number"&&Number.isFinite(saved[k]))values[k]=Math.max(0,Math.min(100,Math.round(saved[k])));else if(typeof defaults[k]==="boolean"&&typeof saved[k]==="boolean")values[k]=saved[k];}}catch{storageAvailable=false;}
 const listeners=new Set(),get=()=>({...values}),motionEnabled=()=>values.animations&&!media.matches;
 function apply(){document.documentElement.dataset.gridMotion=motionEnabled()?"on":"off";document.documentElement.dataset.gridSidebar=values.pinnedSidebar?"pinned":"hover";for(const fn of listeners){try{fn(get());}catch(error){console.error("GRID settings listener failed",error);}}}
 function store(){try{localStorage.setItem(KEY,JSON.stringify(values));storageAvailable=true;}catch{storageAvailable=false;}document.getElementById("settingsSaveFeedback").textContent=storageAvailable?"Preferences saved automatically in this browser.":"Browser storage unavailable. Preferences apply for this session only.";}
 function set(key,value){if(!Object.hasOwn(defaults,key))return;if(key==="volume"){if(!Number.isFinite(Number(value)))return;value=Math.max(0,Math.min(100,Math.round(Number(value))));}else if(typeof value!=="boolean")return;values[key]=value;store();apply();}
 function reset(){values={...defaults};store();apply();}
 function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}
 window.GridSettings={get,set,reset,subscribe,motionEnabled};media.addEventListener?.("change",apply);apply();
 const fields=[...document.querySelectorAll("[data-setting]")],$=id=>document.getElementById(id);
 function sync(v){for(const field of fields){const key=field.dataset.setting;if(field.type==="checkbox")field.checked=v[key];else field.value=v[key];}$("settingsVolumeLabel").textContent=v.volume+"%";$("settingsSoundTest").disabled=!v.sounds||v.volume===0;}
 sync(get());subscribe(sync);
 for(const field of fields)field.addEventListener(field.type==="range"?"input":"change",()=>set(field.dataset.setting,field.type==="checkbox"?field.checked:Number(field.value)));
 $("settingsReset").addEventListener("click",()=>{reset();$("settingsSaveFeedback").textContent="Default preferences restored."+(storageAvailable?"":" Browser storage unavailable.");});
 $("settingsSoundTest").addEventListener("click",()=>{$("settingsSoundFeedback").textContent=window.gridTestSound?.()?"Sound preview requested.":"Sound playback unavailable or muted.";});
 $("settingsOpenNotifications").addEventListener("click",()=>window.GridHome?.setNotifications(true));
 document.querySelectorAll("[data-settings-section]").forEach(button=>button.addEventListener("click",()=>{$("settings-"+button.dataset.settingsSection)?.scrollIntoView({block:"start",behavior:motionEnabled()?"smooth":"auto"});document.querySelectorAll("[data-settings-section]").forEach(b=>b.classList.toggle("selected",b===button));}));
 if(!storageAvailable)$("settingsSaveFeedback").textContent="Browser storage unavailable. Preferences apply for this session only.";
})();
