/* Cloud add-on for 3-Mile Coach. Existing local training data remains intact. */
(() => {
"use strict";
const URL="https://ixfsdsetzghgzepwmypx.supabase.co";
const KEY="sb_publishable_Eh5HciV0-rmIYLBe7Y5mpQ_Tth_-BE1";
const SESSION_KEY="threeMileCoach.supabase.session";
const LOCAL_KEY="threeMileCoach.daily.v1";
let session=null, daily={logs:{},weights:{},dirty:{}}, busy=false;
const $=id=>document.getElementById(id);
const htmlEscape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function message(s){$("cloudStatus").textContent=s;}
function localSave(){localStorage.setItem(LOCAL_KEY,JSON.stringify(daily));}
function localLoad(){try{const x=JSON.parse(localStorage.getItem(LOCAL_KEY)||"{}");daily={logs:x.logs||{},weights:x.weights||{},dirty:x.dirty||{}};}catch{}}
function loadSession(){try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||"null");}catch{session=null;}}
function setSession(x){session=x; if(x)localStorage.setItem(SESSION_KEY,JSON.stringify(x));else localStorage.removeItem(SESSION_KEY);renderAuth();}
async function request(path,opts={}){
 const headers={"apikey":KEY,"Content-Type":"application/json",...opts.headers};
 if(session?.access_token)headers.Authorization="Bearer "+session.access_token;
 let res=await fetch(URL+path,{...opts,headers});
 if(res.status===401&&session?.refresh_token&&!opts.noRefresh){
  const rr=await fetch(URL+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"apikey":KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:session.refresh_token})});
  if(rr.ok){setSession(await rr.json());return request(path,{...opts,noRefresh:true});}
  setSession(null);
 }
 const raw=await res.text();let value;try{value=raw?JSON.parse(raw):null;}catch{value=raw;}
 if(!res.ok)throw Error(value?.msg||value?.message||value?.error_description||("HTTP "+res.status));
 return value;
}
function dateForSelected(){
 const w=Number($("weekSelect")?.value||1);
 if(!data.startDate)return new Date().toLocaleDateString("en-CA");
 const d=new Date(data.startDate+"T12:00:00");d.setDate(d.getDate()+(w-1)*7);
 return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function renderAuth(){
 $("cloudAuth").hidden=!!session?.access_token;
 $("cloudAccount").hidden=!session?.access_token;
 $("cloudAccountEmail").textContent=session?.user?.email||"Signed in";
}
function renderDaily(){
 const date=$("dailyDate").value;
 const x=daily.logs[date]||{};
 for(const k of ["distance","duration","calf","effort","notes"]) $("daily_"+k).value=x[k]??"";
 $("daily_completed").checked=!!x.completed;
 const w=daily.weights[date];$("daily_weight").value=w?.weight??"";
 $("dailyWeightField").hidden=new Date(date+"T12:00:00").getDay()!==1;
}
function showDaily(){
 const container=document.createElement("div");
 container.innerHTML=`
 <div class="card"><h2>Account & cloud sync</h2>
 <div id="cloudAuth">
 <p class="small">Sign in with the Supabase email account you created. Your existing local training records remain on this device.</p>
 <label>Email</label><input id="cloudEmail" type="email" autocomplete="username">
 <label>Password</label><input id="cloudPassword" type="password" autocomplete="current-password">
 <button id="cloudSignIn" style="width:100%;margin-top:12px">Sign in</button></div>
 <div id="cloudAccount" hidden><div class="row"><span id="cloudAccountEmail" class="small"></span><button id="cloudSignOut" class="secondary">Sign out</button></div>
 <button id="cloudSync" class="secondary" style="width:100%;margin-top:12px">Sync daily logs and weigh-ins</button></div>
 <p class="small" id="cloudStatus" role="status" aria-live="polite">Daily entries save locally; sign in to sync to your account.</p></div>
 <div class="card"><h2>Daily training log</h2>
 <label>Date</label><input type="date" id="dailyDate">
 <label><input type="checkbox" id="daily_completed" style="width:auto;margin-right:8px">Workout completed</label>
 <div class="two"><div><label>Distance (miles)</label><input id="daily_distance" type="number" min="0" step="0.01"></div><div><label>Duration (minutes)</label><input id="daily_duration" type="number" min="0" step="0.1"></div></div>
 <label>Calf status</label><select id="daily_calf"><option value="">Select</option><option>No symptoms</option><option>Mild tightness</option><option>Persistent tightness</option><option>Pain</option></select>
 <label>Effort</label><select id="daily_effort"><option value="">Select</option><option>Easy</option><option>Moderate</option><option>Hard</option><option>Very hard</option></select>
 <label>Daily notes / strength exercises, sets, reps and weights</label><textarea id="daily_notes" rows="4" placeholder="e.g. Goblet squat 3x10 @ 53 lb; calf felt good"></textarea>
 <div id="dailyWeightField"><label>Monday body weight (lb)</label><input id="daily_weight" type="number" min="0" step="0.1"></div>
 <button id="dailySave" style="width:100%;margin-top:12px">Save daily entry</button>
 <p class="small">Daily records are saved on this device first. When signed in, Save also uploads the selected date to Supabase. Use Sync to retrieve other devices' entries.</p></div>`;
 $("log").appendChild(container);
 $("dailyDate").value=new Date().toLocaleDateString("en-CA");
 $("dailyDate").addEventListener("change",renderDaily);
 $("cloudSignIn").addEventListener("click",signIn);
 $("cloudSignOut").addEventListener("click",()=>{setSession(null);message("Signed out. Local entries are retained.");});
 $("cloudSync").addEventListener("click",sync);
 $("dailySave").addEventListener("click",saveDaily);
 renderAuth();renderDaily();
}
async function signIn(){
 try{
  const email=$("cloudEmail").value.trim(),password=$("cloudPassword").value;
  if(!email||!password){message("Enter your email and password.");return;}
  const x=await request("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email,password})});
  setSession(x);$("cloudPassword").value="";message("Signed in. Select Sync to retrieve cloud records.");
 }catch(e){message("Sign-in failed: "+e.message);}
}
async function upsert(table,record,conflict){
 await request("/rest/v1/"+table+"?on_conflict="+encodeURIComponent(conflict),{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(record)});
}
async function uploadDate(date){
 if(!session?.access_token)return;
 const user=session.user?.id;if(!user)throw Error("No authenticated user ID");
 const x=daily.logs[date];
 if(x){
  await upsert("daily_logs",{user_id:user,log_date:date,completed:!!x.completed,calf_status:x.calf||null,effort:({"Easy":2,"Moderate":5,"Hard":7,"Very hard":9}[x.effort]??null),notes:JSON.stringify({text:x.notes||"",distance_miles:x.distance||null,duration_minutes:x.duration||null})},"user_id,log_date");
 }
 const w=daily.weights[date];
 if(w?.weight!==undefined&&w.weight!==""){
  await upsert("weight_entries",{user_id:user,entry_date:date,weight:Number(w.weight),weight_unit:"lb"},"user_id,entry_date");
 }
}
async function saveDaily(){
 const date=$("dailyDate").value;if(!date){message("Choose a date.");return;}
 const x={completed:$("daily_completed").checked};
 for(const k of ["distance","duration","calf","effort","notes"])x[k]=$("daily_"+k).value;
 daily.logs[date]=x;
 if(new Date(date+"T12:00:00").getDay()===1&&$("daily_weight").value!=="")daily.weights[date]={weight:$("daily_weight").value};
 daily.dirty[date]=true;localSave();message("Saved locally"+(session?.access_token?"; uploading…":". Sign in to sync."));
 if(session?.access_token){try{await uploadDate(date);delete daily.dirty[date];localSave();message("Saved locally and synced to Supabase.");}catch(e){message("Saved locally; cloud upload failed: "+e.message);}}
}
async function sync(){
 if(busy||!session?.access_token)return;busy=true;message("Syncing…");
 try{
  // Only upload edits that have not yet been confirmed by Supabase.
  // Never push all cached records: stale caches on a second device must not overwrite cloud data.
  for(const date of Object.keys(daily.dirty)){
   await uploadDate(date);
   delete daily.dirty[date];localSave();
  }
  const logs=await request("/rest/v1/daily_logs?select=log_date,completed,calf_status,effort,notes&order=log_date.asc");
  const weights=await request("/rest/v1/weight_entries?select=entry_date,weight,weight_unit&order=entry_date.asc");
  for(const row of logs||[]){
   if(daily.dirty[row.log_date])continue;
   let extra={};try{extra=JSON.parse(row.notes||"{}");}catch{extra={text:row.notes||""};}
   daily.logs[row.log_date]={completed:row.completed,calf:row.calf_status||"",effort:({2:"Easy",5:"Moderate",7:"Hard",9:"Very hard"}[row.effort]||""),notes:extra.text||"",distance:extra.distance_miles??"",duration:extra.duration_minutes??""};
  }
  for(const row of weights||[])if(!daily.dirty[row.entry_date])daily.weights[row.entry_date]={weight:row.weight,unit:row.weight_unit};
  localSave();renderDaily();message("Synced "+(logs?.length||0)+" daily logs and "+(weights?.length||0)+" weigh-ins.");
 }catch(e){message("Sync incomplete; local data preserved: "+e.message);}
 finally{busy=false;}
}

localLoad();loadSession();showDaily();
})();
