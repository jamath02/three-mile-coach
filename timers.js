/* Offline custom interval timers for the Tools tab. */
(()=>{
"use strict";
const KEY="threeMileCoach.timers.v1";
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const defaults=[
 {id:"hiit",name:"5 × 5 HIIT Circuit",rounds:5,rest:15,steps:Array.from({length:5},(_,i)=>({name:"Exercise "+(i+1),seconds:40}))},
 {id:"run",name:"Jog / Hard / Sprint",rounds:10,rest:0,steps:[{name:"Jog",seconds:30},{name:"Hard",seconds:20},{name:"Sprint",seconds:10}]}
];
let saved=[],current=null,segments=[],index=0,remaining=0,running=false,deadline=0,tickHandle=null,audio=null,locked=false,lastCountdown=4;
const clone=x=>JSON.parse(JSON.stringify(x));
const fmt=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");};
function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");saved=Array.isArray(v)?v.filter(x=>x&&typeof x.name==="string"&&Array.isArray(x.steps)):[];}catch{saved=[];}}
function persist(){localStorage.setItem(KEY,JSON.stringify(saved));}
function normalize(t){return {id:t.id||("timer-"+Date.now()),name:String(t.name||"Custom timer").slice(0,80),rounds:Math.min(100,Math.max(1,Math.round(Number(t.rounds)||1))),rest:Math.min(3600,Math.max(0,Math.round(Number(t.rest)||0))),steps:(t.steps||[]).slice(0,30).map(s=>({name:String(s.name||"Interval").slice(0,60),seconds:Math.min(3600,Math.max(1,Math.round(Number(s.seconds)||1)))}))};}
function sequence(t){let out=[];for(let r=1;r<=t.rounds;r++)for(let i=0;i<t.steps.length;i++){const s=t.steps[i];out.push({name:s.name,seconds:s.seconds,round:r,work:true});if(t.rest&&(r!==t.rounds||i!==t.steps.length-1))out.push({name:"Rest",seconds:t.rest,round:r,work:false});}return out;}
function renderSaved(){const opts=[...defaults,...saved];$("timerSelect").innerHTML=opts.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join("");}
function readForm(){const steps=[...document.querySelectorAll("#timerSteps .timer-step")].map(el=>({name:el.querySelector(".timer-name").value.trim()||"Interval",seconds:Number(el.querySelector(".timer-seconds").value)}));const t=normalize({id:current?.id,name:$("timerName").value,rounds:$("timerRounds").value,rest:$("timerRest").value,steps});if(!steps.length||steps.some(s=>!Number.isInteger(s.seconds)||s.seconds<1||s.seconds>3600))throw Error("Each interval must be between 1 and 3600 seconds.");if(!Number.isInteger(Number($("timerRounds").value))||Number($("timerRounds").value)<1||Number($("timerRounds").value)>100)throw Error("Rounds must be between 1 and 100.");if(!Number.isInteger(Number($("timerRest").value))||Number($("timerRest").value)<0||Number($("timerRest").value)>3600)throw Error("Rest must be between 0 and 3600 seconds.");return t;}
function stepRow(step){const row=document.createElement("div");row.className="timer-step";row.style.cssText="display:grid;grid-template-columns:minmax(0,1fr) 95px 40px;gap:8px;align-items:end;margin:8px 0";row.innerHTML='<div><label>Phase / exercise</label><input class="timer-name" maxlength="60" placeholder="Exercise" value="'+esc(step.name)+'"></div><div><label>Seconds</label><input class="timer-seconds" type="number" min="1" max="3600" step="1" value="'+step.seconds+'"></div><button type="button" class="secondary timer-remove" aria-label="Remove interval">×</button>';row.querySelector("button").onclick=()=>{row.remove();updateSummary();};$("timerSteps").appendChild(row);}
function loadTimer(t){stop();current=clone(t);$("timerName").value=t.name;$("timerRounds").value=t.rounds;$("timerRest").value=t.rest;$("timerSteps").replaceChildren();t.steps.forEach(stepRow);updateSummary();$("timerMessage").textContent="Timer loaded. Edit it or press Start.";}
function updateSummary(){try{const t=readForm();const s=sequence(t);$("timerSummary").textContent=s.length+" phases · "+fmt(s.reduce((n,x)=>n+x.seconds,0))+" total";}catch{$("timerSummary").textContent="Check your timer settings.";}}
function sound(long=false){
 try{
  audio=audio||new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state==="suspended")audio.resume().catch(()=>{});
  const o=audio.createOscillator(),g=audio.createGain();
  const startAt=audio.currentTime,duration=long?1.5:.16;
  o.type="square";o.frequency.value=long?740:1100;
  g.gain.setValueAtTime(.0001,startAt);
  g.gain.exponentialRampToValueAtTime(long?.13:.17,startAt+.015);
  g.gain.setValueAtTime(long?.13:.17,startAt+duration-.035);
  g.gain.exponentialRampToValueAtTime(.0001,startAt+duration);
  o.connect(g);g.connect(audio.destination);
  o.start(startAt);o.stop(startAt+duration+.01);
 }catch{}
}
function startPhaseSound(){lastCountdown=4;sound(!!segments[index]?.work);}
function stop(){running=false;if(tickHandle!==null){clearInterval(tickHandle);tickHandle=null;}locked=false;}
function display(){const s=segments[index];$("timerClock").textContent=fmt(remaining);$("timerPhase").textContent=s?s.name:"Ready";$("timerPosition").textContent=s?"Round "+s.round+"/"+current.rounds+" · Phase "+(index+1)+"/"+segments.length:"Choose a timer and press Start";$("timerNext").textContent=s&&segments[index+1]?"Next: "+segments[index+1].name+" ("+fmt(segments[index+1].seconds)+")":s?"Final phase":"";
 $("timerClock").style.color=s&&!s.work?"var(--warn)":"var(--accent)";
 $("timerPause").disabled=!segments.length;$("timerSkip").disabled=!segments.length;$("timerPause").textContent=running?"Pause":"Resume";
}
function finish(){stop();segments=[];remaining=0;display();$("timerPhase").textContent="Workout complete!";$("timerMessage").textContent="Workout complete.";sound(true);}
function advance(){index++;if(index>=segments.length){finish();return;}remaining=segments[index].seconds;deadline=performance.now()+remaining*1000;startPhaseSound();display();}
function tick(){if(!running)return;const left=Math.max(0,Math.ceil((deadline-performance.now())/1000));if(left!==remaining){remaining=left;display();}if(left<lastCountdown){for(let second=Math.min(3,lastCountdown-1);second>=Math.max(1,left);second--)sound(false);lastCountdown=left;}if(deadline<=performance.now())advance();}
function start(){try{const t=readForm();segments=sequence(t);if(!segments.length)throw Error("Add at least one interval.");stop();current=t;locked=true;index=0;remaining=segments[0].seconds;running=true;deadline=performance.now()+remaining*1000;tickHandle=setInterval(tick,100);startPhaseSound();display();$("timerMessage").textContent="Timer running. Keep this page open and visible for reliable cues.";}catch(e){$("timerMessage").textContent=e.message;}}
function pause(){if(!segments.length)return;if(running){remaining=Math.max(0,Math.ceil((deadline-performance.now())/1000));running=false;}else{running=true;deadline=performance.now()+remaining*1000;lastCountdown=Math.min(4,remaining+1);}display();}
function skip(){if(!segments.length)return;advance();}
function reset(){stop();segments=[];index=0;remaining=0;display();$("timerMessage").textContent="Timer reset.";}
function saveTimer(){try{const t=readForm();if(!t.steps.length)throw Error("Add an interval before saving.");t.id="timer-"+Date.now();saved.push(t);persist();renderSaved();$("timerSelect").value=t.id;current=t;$("timerMessage").textContent="Saved on this device: "+t.name;}catch(e){$("timerMessage").textContent=e.message;}}
function removeSaved(){const id=$("timerSelect").value;if(defaults.some(x=>x.id===id)){$("timerMessage").textContent="Built-in presets cannot be deleted.";return;}saved=saved.filter(t=>t.id!==id);persist();renderSaved();loadTimer(defaults[0]);$("timerSelect").value="hiit";}
function init(){
 const host=$("paces");if(!host)return;
 const section=document.createElement("div");section.className="card";section.innerHTML=`
 <h2>Custom workout timers</h2><p class="small">Build HIIT circuits or running intervals. Timers are saved on this device.</p>
 <label for="timerSelect">Timer preset / saved timer</label><select id="timerSelect"></select>
 <div class="two" style="margin-top:10px"><button type="button" class="secondary" id="timerLoad">Load timer</button><button type="button" class="secondary" id="timerDelete">Delete saved timer</button></div>
 <label for="timerName">Timer name</label><input id="timerName" maxlength="80">
 <div class="two"><div><label for="timerRounds">Rounds</label><input id="timerRounds" type="number" min="1" max="100" step="1"></div><div><label for="timerRest">Rest after each exercise (seconds)</label><input id="timerRest" type="number" min="0" max="3600" step="1"></div></div>
 <h3 style="margin-top:16px">Exercises / phases</h3><div id="timerSteps"></div>
 <button type="button" class="secondary" id="timerAdd">+ Add exercise / phase</button>
 <div id="timerSummary" class="small" style="margin:12px 0"></div>
 <button type="button" class="secondary" id="timerSave" style="width:100%">Save as custom timer</button>
 <div style="text-align:center;margin:22px 0 10px;padding:18px 10px;background:var(--panel2);border-radius:16px" role="timer" aria-live="off">
  <div id="timerPosition" class="small">Ready</div><div id="timerPhase" style="font-size:23px;font-weight:800;margin:10px 0">Ready</div>
  <div id="timerClock" style="font-size:clamp(62px,16vw,96px);font-weight:900;font-variant-numeric:tabular-nums;line-height:1.1;color:var(--accent)">0:00</div>
  <div id="timerNext" class="small" style="margin-top:10px"></div>
 </div>
 <div class="two"><button type="button" id="timerStart">Start from beginning</button><button type="button" class="secondary" id="timerPause" disabled>Pause</button></div>
 <div class="two" style="margin-top:8px"><button type="button" class="secondary" id="timerSkip" disabled>Skip phase</button><button type="button" class="ghost" id="timerReset">Reset</button></div>
 <p id="timerMessage" class="small" role="status" aria-live="polite" style="margin-top:12px"></p>
 <p class="small">A long beep signals the start of each exercise; three short beeps mark the final three seconds of each phase. Audio cues require your device to be unmuted. On phones, keep the app visible and the screen awake; browsers may pause background timers.</p>`;
 host.insertBefore(section,host.firstChild);load();renderSaved();loadTimer(defaults[0]);
 $("timerLoad").onclick=()=>{const t=[...defaults,...saved].find(t=>t.id===$("timerSelect").value);if(t)loadTimer(t);};
 $("timerDelete").onclick=removeSaved;$("timerAdd").onclick=()=>{stepRow({name:"New exercise",seconds:40});updateSummary();};
 $("timerSave").onclick=saveTimer;$("timerStart").onclick=start;$("timerPause").onclick=pause;$("timerSkip").onclick=skip;$("timerReset").onclick=reset;
 section.addEventListener("input",e=>{if(e.target.closest("#timerSteps")||["timerRounds","timerRest"].includes(e.target.id))updateSummary();});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&running)tick();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
