// Supabase Edge Function: personal Garmin activity import.
// Deploy with JWT verification enabled. Never expose GARMIN_API_KEY or service role to the browser.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const required=(name:string)=>{const v=Deno.env.get(name);if(!v)throw new Error("Missing server secret: "+name);return v;};
const numeric=(x:unknown)=>typeof x==="number"&&Number.isFinite(x)?x:null;

Deno.serve(async req=>{
 if(req.method!=="POST")return json({error:"POST required"},405);
 try{
  const auth=req.headers.get("Authorization");
  if(!auth?.startsWith("Bearer "))return json({error:"Sign in required"},401);
  const url=required("SUPABASE_URL");
  const anon=required("SUPABASE_ANON_KEY");
  const admin=required("SUPABASE_SERVICE_ROLE_KEY");
  const owner=required("GARMIN_OWNER_USER_ID");
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:userError}=await userClient.auth.getUser();
  if(userError||!user)return json({error:"Invalid user session"},401);
  if(user.id!==owner)return json({error:"Garmin import not configured for this user"},403);

  const tokenResponse=await fetch("https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token",{
   method:"POST",headers:{Authorization:"ApiKey "+required("GARMIN_API_KEY")}
  });
  if(!tokenResponse.ok)return json({error:"Garmin token request failed",status:tokenResponse.status},502);
  const tokenText=(await tokenResponse.text()).trim();
  let accessToken=tokenText;
  if(tokenText.startsWith("{")){const tokenJson=JSON.parse(tokenText);accessToken=tokenJson.access_token??tokenJson.accessToken;}
  if(typeof accessToken!=="string"||!accessToken)return json({error:"Garmin token response did not contain an access token"},502);

  const activitiesUrl=new URL("https://personal.connectapi.garmin.com/activitylist-service/activities/search/activities");
  activitiesUrl.searchParams.set("start","0");activitiesUrl.searchParams.set("limit","30");
  const response=await fetch(activitiesUrl,{headers:{Authorization:"Bearer "+accessToken,Accept:"*/*"}});
  if(!response.ok)return json({error:"Garmin activity request failed",status:response.status},502);
  const body=await response.json();
  const items=Array.isArray(body)?body:Array.isArray(body?.activities)?body.activities:null;
  if(!items)return json({error:"Unexpected Garmin activity list response"},502);

  const rows=items.flatMap((a:Record<string,unknown>)=>{
   const id=a.activityId;
   const start=a.startTimeGMT??a.startTimeLocal;
   if(id==null||!start)return [];
   const type=a.activityType as Record<string,unknown>|undefined;
   const duration=numeric(a.duration);
   const distance=numeric(a.distance);
   const pace=duration!==null&&distance!==null&&distance>0?duration/(distance/1000):null;
   return [{
    user_id:user.id,source:"garmin",external_id:String(id),
    activity_type:String(type?.typeKey??"unknown"),
    activity_name:String(a.activityName??"Garmin activity"),
    started_at:String(start).includes("T")?String(start).replace(" ","T")+(String(start).endsWith("Z")?"":"Z"):String(start).replace(" ","T")+"Z",
    duration_seconds:duration===null?null:Math.round(duration),distance_meters:distance,average_pace_seconds_per_km:pace,
    average_heart_rate:numeric(a.averageHR)===null?null:Math.round(numeric(a.averageHR)!),max_heart_rate:numeric(a.maxHR)===null?null:Math.round(numeric(a.maxHR)!),
    calories:numeric(a.calories)===null?null:Math.round(numeric(a.calories)!),average_cadence:numeric(a.averageRunningCadenceInStepsPerMinute),
    raw_data:a
   }];
  });
  const db=createClient(url,admin,{auth:{autoRefreshToken:false,persistSession:false}});
  if(rows.length){
   const {error}=await db.from("activities").upsert(rows,{onConflict:"user_id,source,external_id"});
   if(error)return json({error:"Supabase activity insert failed",detail:error.message},500);
  }
  return json({ok:true,fetched:items.length,imported:rows.length});
 }catch(e){return json({error:e instanceof Error?e.message:"Unexpected import error"},500);}
});
