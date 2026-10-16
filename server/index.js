require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { google } = require("googleapis");
const app = express();
app.disable("x-powered-by");
app.use(express.json({limit:"20kb"}));
const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${BASE_URL}/oauth2callback`;
const { GOOGLE_CLIENT_ID: CLIENT_ID, GOOGLE_CLIENT_SECRET: CLIENT_SECRET, SESSION_SECRET } = process.env;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map(s=>s.trim()).filter(Boolean);
if (!CLIENT_ID || !CLIENT_SECRET || !SESSION_SECRET) console.warn("OAuth not configured; set server environment variables.");
const oauth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const sessions = new Map(), states = new Map(), seen = new Set(), clients = new Set();
let activeChatId=null, nextPageToken=null, timer=null, lastPollAt=null, lastError=null, recent=[];
app.use((req,res,next)=>{const o=req.headers.origin;if(o && allowedOrigins.includes(o)){res.setHeader("Access-Control-Allow-Origin",o);res.setHeader("Vary","Origin");}res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type,Authorization");if(req.method==="OPTIONS")return res.sendStatus(204);next();});
app.use(express.static(path.join(__dirname,"..")));
function session(req){const t=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");return sessions.get(t)||null;}
function status(){return {configured:!!(CLIENT_ID&&CLIENT_SECRET&&SESSION_SECRET),connected:!!activeChatId,lastPollAt,lastError,recentMessages:recent.slice(-20)};}
function emit(type,data){const s=`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;for(const r of clients)r.write(s);}
function stop(){if(timer)clearTimeout(timer);timer=null;}
async function poll(){if(!activeChatId)return;try{const yt=google.youtube({version:"v3",auth:oauth});const args={liveChatId:activeChatId,part:["id","snippet","authorDetails"],maxResults:200};if(nextPageToken)args.pageToken=nextPageToken;const r=await yt.liveChatMessages.list(args);nextPageToken=r.data.nextPageToken||nextPageToken;lastPollAt=new Date().toISOString();lastError=null;for(const m of (r.data.items||[])){if(seen.has(m.id))continue;seen.add(m.id);const text=m.snippet?.displayMessage||"",author=m.authorDetails?.displayName||"Viewer",command=text.trim().split(/\s+/)[0].toLowerCase();const item={id:m.id,author,text,command,at:m.snippet?.publishedAt};recent.push(item);recent=recent.slice(-50);emit("chat",item);if(["!red","!blue","!build","!attack","!defend","!power","!forest","!castle","!chaos"].includes(command))emit("command",{command,author,text});}if(seen.size>1500){const keep=[...seen].slice(-750);seen.clear();keep.forEach(x=>seen.add(x));}timer=setTimeout(poll,Math.max(1500,Number(r.data.pollingIntervalMillis||5000)));}catch(e){lastError=e?.response?.data?.error?.message||e.message||"Polling failed";emit("status",status());timer=setTimeout(poll,10000);}}
app.get("/health",(_q,r)=>r.json({ok:true,service:"chatverse-live"}));
app.get("/api/status",(_q,r)=>r.json(status()));
app.get("/api/auth/google",(_q,r)=>{if(!CLIENT_ID||!CLIENT_SECRET||!SESSION_SECRET)return r.status(503).json({error:"Backend OAuth variables are not configured."});const state=crypto.randomBytes(24).toString("hex");states.set(state,Date.now());const url=oauth.generateAuthUrl({access_type:"offline",prompt:"consent",scope:["https://www.googleapis.com/auth/youtube.readonly","https://www.googleapis.com/auth/youtube.force-ssl"],state});r.json({url});});
app.get("/oauth2callback",async(req,res)=>{const state=String(req.query.state||""),created=states.get(state);states.delete(state);if(req.query.error)return res.status(400).send("Google authorization denied. Return to CHATVERSE and retry.");if(!created||Date.now()-created>600000)return res.status(400).send("OAuth state invalid or expired. Restart sign-in.");try{const {tokens}=await oauth.getToken(String(req.query.code||""));oauth.setCredentials(tokens);const token=crypto.randomBytes(32).toString("hex");sessions.set(token,{createdAt:Date.now()});res.send(`<!doctype html><meta name="viewport" content="width=device-width"><body style="font:16px system-ui;background:#080d1d;color:white;padding:24px"><h2>Google authorization complete</h2><p>Return to the CHATVERSE tab. This prototype session is temporary and will be lost if the server restarts.</p><script>localStorage.setItem("chatverse_session",${JSON.stringify(token)})</script></body>`);}catch(e){res.status(500).send("OAuth exchange failed. Verify the exact redirect URI and server settings.");}});
app.post("/api/find-live-chat",async(req,res)=>{if(!session(req))return res.status(401).json({error:"Sign in with Google first."});try{const yt=google.youtube({version:"v3",auth:oauth});const r=await yt.liveBroadcasts.list({part:["id","snippet","contentDetails"],mine:true,broadcastStatus:"active",maxResults:10});const b=(r.data.items||[]).find(x=>x.snippet?.liveChatId);if(!b)return res.status(404).json({error:"No active broadcast with live chat found. Start a test livestream and retry."});activeChatId=b.snippet.liveChatId;nextPageToken=null;seen.clear();recent=[];lastError=null;stop();poll();res.json({connected:true,title:b.snippet.title||"Active livestream"});}catch(e){lastError=e?.response?.data?.error?.message||e.message;res.status(502).json({error:lastError});}});
app.get("/api/events",(req,res)=>{res.setHeader("Content-Type","text/event-stream");res.setHeader("Cache-Control","no-cache");res.setHeader("Connection","keep-alive");res.flushHeaders?.();res.write(`event: status\ndata: ${JSON.stringify(status())}\n\n`);clients.add(res);req.on("close",()=>clients.delete(res));});
app.post("/api/disconnect",(_q,res)=>{stop();activeChatId=null;nextPageToken=null;seen.clear();emit("status",status());res.json({connected:false});});
app.listen(PORT,()=>console.log(`CHATVERSE LIVE listening on ${BASE_URL}`));
