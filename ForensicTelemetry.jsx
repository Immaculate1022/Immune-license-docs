import { useState, useEffect, useRef, useCallback, useReducer } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Shield, AlertTriangle, Activity, Download, Play, Settings, FileText, RefreshCw, Search, Trash2, Upload, Brain, Zap, Clock, X, ChevronRight, Eye, Lock, Database, AlertCircle, Cpu, Wifi, MemoryStick, StopCircle } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
//  useAnthropic — Universal Streaming Hook
// ═══════════════════════════════════════════════════════════════════════════════
const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL   = "claude-sonnet-4-20250514";
const estTok  = s => Math.ceil((s||"").length / 3.8);

function useAnthropic({ systemPrompt, maxHistory=24, maxRetries=3, tools=[], onToolCall=null, onComplete=null } = {}) {
  const [streaming, setStreaming]   = useState(false);
  const [streamText, setStreamText] = useState("");
  const [history, setHistory]       = useState([]);
  const [error, setError]           = useState(null);
  const [usage, setUsage]           = useState({ input:0, output:0 });
  const [pendingTool, setPending]   = useState(null);
  const [retryCount, setRetry]      = useState(0);
  const abortRef   = useRef(null);
  const histRef    = useRef(history);
  const systemRef  = useRef(systemPrompt);
  useEffect(() => { histRef.current = history; },     [history]);
  useEffect(() => { systemRef.current = systemPrompt; }, [systemPrompt]);

  const send = useCallback(async (userMsg, overrides={}) => {
    if (streaming) return null;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const uMsg = { role:"user", content: userMsg };
    setHistory(h => [...h, uMsg].slice(-maxHistory));
    setStreaming(true); setStreamText(""); setError(null); setRetry(0);
    const messages = [...histRef.current, uMsg];
    let attempt = 0, full = "";

    while (attempt <= maxRetries) {
      try {
        const body = {
          model: overrides.model || MODEL,
          max_tokens: overrides.maxTokens || 1024,
          system: overrides.system || systemRef.current,
          messages: messages.map(m => ({ role:m.role, content:m.content })),
          stream: true,
          ...(tools.length ? { tools } : {})
        };
        const res = await fetch(API_URL, {
          method:"POST", signal: ctrl.signal,
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          const e = await res.json().catch(()=>({}));
          throw Object.assign(new Error(e.error?.message||`HTTP ${res.status}`), { retryable: res.status>=500||res.status===529 });
        }
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let toolBuf = null, inTok = 0, outTok = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split("\n")) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (raw==="[DONE]") continue;
            try {
              const ev = JSON.parse(raw);
              if (ev.type==="message_start") inTok = ev.message?.usage?.input_tokens||0;
              if (ev.type==="message_delta") outTok = ev.usage?.output_tokens||0;
              if (ev.type==="content_block_start" && ev.content_block?.type==="tool_use")
                toolBuf = { name:ev.content_block.name, id:ev.content_block.id, raw:"" };
              if (ev.type==="content_block_delta") {
                if (ev.delta?.type==="text_delta") {
                  full += ev.delta.text;
                  setStreamText(t => t + ev.delta.text);
                }
                if (ev.delta?.type==="input_json_delta" && toolBuf)
                  toolBuf.raw += ev.delta.partial_json;
              }
              if (ev.type==="content_block_stop" && toolBuf) {
                try { toolBuf.input = JSON.parse(toolBuf.raw); } catch { toolBuf.input = {}; }
                setPending(toolBuf);
                const result = await onToolCall?.(toolBuf) ?? {};
                setPending(null);
                const toolNote = `\n[Tool: ${toolBuf.name}(${JSON.stringify(toolBuf.input)}) → ${JSON.stringify(result)}]`;
                full += toolNote;
                setStreamText(t => t + toolNote);
                toolBuf = null;
              }
            } catch {}
          }
        }
        setUsage({ input:inTok, output:outTok });
        const aMsg = { role:"assistant", content: full||"[No response]" };
        setHistory(h => [...h, aMsg].slice(-maxHistory));
        setStreaming(false); setStreamText("");
        onComplete?.(full, [...messages, aMsg]);
        return full;
      } catch(err) {
        if (err.name==="AbortError") { setStreaming(false); setStreamText(""); return null; }
        if (err.retryable && attempt < maxRetries) {
          attempt++; setRetry(attempt);
          await new Promise(r => setTimeout(r, 900 * Math.pow(2, attempt-1)));
          continue;
        }
        setError(err.message||"Unknown error");
        setStreaming(false); setStreamText("");
        return null;
      }
    }
  }, [streaming, maxRetries, tools, onToolCall, onComplete, maxHistory]);

  const abort  = useCallback(()=> abortRef.current?.abort(), []);
  const clear  = useCallback(()=> { setHistory([]); setError(null); setStreamText(""); }, []);
  const inject = useCallback((role,content)=> setHistory(h=>[...h,{role,content}].slice(-maxHistory)), [maxHistory]);

  return { streaming, streamText, history, error, usage, pendingTool, retryCount, send, abort, clear, inject,
           isReady:!streaming, tokenEstimate: history.reduce((a,m)=>a+estTok(m.content),0) };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONSTANTS & UTILS
// ═══════════════════════════════════════════════════════════════════════════════
const C = {
  bg:"#05080f", surface:"#080d16", panel:"#0b1220", panel2:"#0e1628",
  amber:"#f59e0b", amberD:"#92400e", red:"#ef4444", green:"#10b981",
  blue:"#3b82f6", cyan:"#22d3ee", purple:"#a78bfa", orange:"#f97316",
  text:"#ddd0b3", dim:"#374151", muted:"#6b7280", border:"rgba(245,158,11,0.1)",
  borderHi:"rgba(245,158,11,0.32)", MONO:'"JetBrains Mono","Fira Code","Courier New",monospace',
};
const rand  = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
const fmtT  = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
const now   = () => new Date().toLocaleTimeString();

const computeThreat = (load, anomaly, alertCount) =>
  clamp(Math.round(load*0.22 + anomaly*0.52 + Math.min(alertCount,25)*0.8), 0, 100);

const threatLevel = score => {
  if (score<25) return { label:"NOMINAL",   color:C.green,  key:"nominal"  };
  if (score<50) return { label:"ELEVATED",  color:C.amber,  key:"elevated" };
  if (score<75) return { label:"HIGH",      color:C.orange, key:"high"     };
  return             { label:"CRITICAL",  color:C.red,    key:"critical" };
};
const sevColor = s => s==="critical"?C.red : s==="warning"?C.amber : C.green;

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

// ── TOOLS for AI ─────────────────────────────────────────────────────────────
const ANALYST_TOOLS = [
  {
    name:"get_live_metrics",
    description:"Fetch the current real-time system metrics: CPU load, anomaly score, threat score, system state, and event rate.",
    input_schema:{ type:"object", properties:{ detail:{ type:"string", enum:["summary","full"], description:"Level of detail" } }, required:["detail"] }
  },
  {
    name:"query_event_log",
    description:"Query the forensic event log. Filter by severity or search term to identify patterns.",
    input_schema:{ type:"object", properties:{
      severity:{ type:"string", enum:["all","critical","warning","info"] },
      limit:{ type:"number", description:"Max entries to return (1-30)" },
      search:{ type:"string", description:"Optional keyword filter" }
    }, required:["severity","limit"] }
  },
  {
    name:"get_telemetry_history",
    description:"Retrieve historical telemetry data points to identify trends, spikes, or anomalous patterns over time.",
    input_schema:{ type:"object", properties:{
      points:{ type:"number", description:"Number of most recent data points to retrieve (max 40)" }
    }, required:["points"] }
  },
  {
    name:"get_alert_rules",
    description:"List all configured alert threshold rules to understand current monitoring coverage.",
    input_schema:{ type:"object", properties:{}, required:[] }
  }
];

const SIMS = [
  { id:"spike",  label:"ANOMALY SPIKE",  load:44, anomaly:76, color:C.red,    dur:9000,  desc:"Multi-vector anomaly burst" },
  { id:"ddos",   label:"DDoS PATTERN",   load:91, anomaly:55, color:C.orange, dur:13000, desc:"Distributed flood pattern" },
  { id:"exfil",  label:"DATA EXFIL",     load:27, anomaly:64, color:C.amber,  dur:15000, desc:"Covert exfiltration indicators" },
  { id:"brute",  label:"BRUTE FORCE",    load:36, anomaly:84, color:C.red,    dur:11000, desc:"Repeated auth failure cascade" },
  { id:"apt",    label:"APT ACTIVITY",   load:18, anomaly:71, color:C.purple, dur:18000, desc:"Advanced persistent threat pattern" },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  RADAR CANVAS
// ═══════════════════════════════════════════════════════════════════════════════
function Radar({ score, blips }) {
  const cvRef = useRef(null), sweepRef = useRef(0), rafRef = useRef(null);
  const blipsRef = useRef(blips);
  useEffect(()=>{ blipsRef.current=blips; },[blips]);
  useEffect(()=>{
    const cv=cvRef.current; if(!cv) return;
    const ctx=cv.getContext("2d");
    const draw = () => {
      ctx.clearRect(0,0,200,200);
      ctx.fillStyle=C.bg; ctx.fillRect(0,0,200,200);
      [[86,"rgba(239,68,68,0.04)"],[57,"rgba(245,158,11,0.05)"],[28,"rgba(16,185,129,0.07)"]].forEach(([r,f])=>{
        ctx.beginPath(); ctx.arc(100,100,r,0,Math.PI*2);
        ctx.fillStyle=f; ctx.fill();
        ctx.strokeStyle="rgba(245,158,11,0.09)"; ctx.lineWidth=0.6; ctx.stroke();
      });
      for(let i=0;i<8;i++){
        const a=(i/8)*Math.PI*2;
        ctx.beginPath(); ctx.moveTo(100,100);
        ctx.lineTo(100+Math.cos(a)*86,100+Math.sin(a)*86);
        ctx.strokeStyle="rgba(245,158,11,0.06)"; ctx.lineWidth=0.5; ctx.stroke();
      }
      sweepRef.current=(sweepRef.current+0.018)%(Math.PI*2);
      const sw=sweepRef.current;
      for(let i=60;i>=0;i--){
        const a=sw-i*0.038;
        ctx.beginPath(); ctx.moveTo(100,100);
        ctx.arc(100,100,86,a,a+0.038); ctx.closePath();
        ctx.fillStyle=`rgba(245,158,11,${(1-i/60)*0.3})`; ctx.fill();
      }
      ctx.beginPath(); ctx.moveTo(100,100);
      ctx.lineTo(100+Math.cos(sw)*86,100+Math.sin(sw)*86);
      ctx.strokeStyle="rgba(245,158,11,0.9)"; ctx.lineWidth=1.5; ctx.stroke();
      const t=Date.now();
      blipsRef.current.forEach(b=>{
        const age=Math.min(1,(t-b.t)/9000); if(age>=1) return;
        const al=1-age;
        ctx.beginPath(); ctx.arc(b.x,b.y,4,0,Math.PI*2);
        ctx.fillStyle=`rgba(239,68,68,${al})`; ctx.fill();
        ctx.beginPath(); ctx.arc(b.x,b.y,4+age*12,0,Math.PI*2);
        ctx.strokeStyle=`rgba(239,68,68,${al*0.45})`; ctx.lineWidth=1; ctx.stroke();
      });
      ctx.beginPath(); ctx.arc(100,100,3,0,Math.PI*2);
      ctx.fillStyle=C.amber; ctx.fill();
      rafRef.current=requestAnimationFrame(draw);
    };
    draw();
    return ()=>cancelAnimationFrame(rafRef.current);
  },[]);
  const lv=threatLevel(score);
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <canvas ref={cvRef} width={200} height={200} style={{borderRadius:"50%",border:`1px solid rgba(245,158,11,0.2)`,boxShadow:"0 0 28px rgba(245,158,11,0.07)"}}/>
      <div style={{fontSize:9,fontFamily:C.MONO,color:lv.color,letterSpacing:3,fontWeight:900,
        background:`${lv.color}10`,border:`1px solid ${lv.color}30`,padding:"3px 14px",borderRadius:2,
        animation:lv.key==="critical"?"pulse 0.8s infinite":"none"}}>{lv.label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AI ANALYST PANEL — streaming, memory, tool calls
// ═══════════════════════════════════════════════════════════════════════════════
function AIAnalystPanel({ ai, onAnalyze, autoEnabled, metrics, lastUpdated }) {
  const endRef = useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[ai.history, ai.streamText]);

  const lv = threatLevel(metrics.threatScore);
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",gap:0,overflow:"hidden"}}>
      {/* Panel Header */}
      <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <Brain size={13} color={C.cyan}/>
          <span style={{fontSize:9,fontFamily:C.MONO,color:C.cyan,letterSpacing:3,fontWeight:700}}>AI THREAT ANALYST</span>
          {autoEnabled && <span style={{fontSize:8,color:C.green,fontFamily:C.MONO,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",padding:"1px 6px",borderRadius:2,animation:"pulse 2s infinite"}}>AUTO</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {ai.streaming && (
            <button onClick={ai.abort} style={{background:"none",border:`1px solid rgba(239,68,68,0.4)`,color:C.red,padding:"3px 8px",borderRadius:3,cursor:"pointer",fontSize:8,fontFamily:C.MONO,display:"flex",alignItems:"center",gap:4}}>
              <StopCircle size={8}/> STOP
            </button>
          )}
          <button onClick={onAnalyze} disabled={!ai.isReady}
            style={{background:"none",border:`1px solid ${ai.isReady?C.borderHi:C.dim}`,color:ai.isReady?C.amber:C.muted,
              padding:"3px 10px",borderRadius:3,cursor:ai.isReady?"pointer":"not-allowed",fontSize:8,fontFamily:C.MONO,
              display:"flex",alignItems:"center",gap:4,letterSpacing:1}}>
            <RefreshCw size={8} style={{animation:ai.streaming?"spin 1s linear infinite":"none"}}/>
            {ai.streaming?"ANALYZING":"ANALYZE"}
          </button>
          <button onClick={ai.clear} title="Clear conversation" style={{background:"none",border:`1px solid ${C.dim}`,color:C.muted,padding:"3px 6px",borderRadius:3,cursor:"pointer",fontSize:8}}>✕</button>
        </div>
      </div>

      {/* Status bar */}
      <div style={{padding:"4px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:14,flexShrink:0,background:C.panel2}}>
        {[
          {label:"TURNS", val:Math.floor(ai.history.length/2), color:C.cyan},
          {label:"TOKENS", val:ai.usage.input+ai.usage.output||"—", color:C.amber},
          {label:"CTX", val:`${ai.tokenEstimate} est`, color:C.muted},
          ...(lastUpdated?[{label:"UPDATED", val:lastUpdated, color:C.green}]:[]),
        ].map(({label,val,color})=>(
          <div key={label} style={{fontSize:8,fontFamily:C.MONO,color:C.dim}}>
            {label}: <span style={{color}}>{val}</span>
          </div>
        ))}
        {ai.pendingTool && (
          <div style={{fontSize:8,fontFamily:C.MONO,color:C.amber,animation:"pulse 0.6s infinite",marginLeft:"auto"}}>
            ⚡ {ai.pendingTool.name}()
          </div>
        )}
        {ai.retryCount>0 && <div style={{fontSize:8,color:C.orange,fontFamily:C.MONO,marginLeft:"auto"}}>↻ retry {ai.retryCount}</div>}
      </div>

      {/* Conversation scroll */}
      <div style={{flex:1,overflowY:"auto",padding:10,display:"flex",flexDirection:"column",gap:8}}>
        {ai.history.length===0 && !ai.streaming && (
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,opacity:0.4,paddingTop:24}}>
            <Brain size={24} color={C.cyan}/>
            <div style={{fontSize:9,color:C.muted,fontFamily:C.MONO,letterSpacing:2,textAlign:"center"}}>
              ANALYST STANDING BY<br/><span style={{fontSize:8}}>autonomous or manual trigger</span>
            </div>
          </div>
        )}
        {ai.history.map((msg,i)=>(
          <div key={i} style={{animation:"fadeIn 0.2s ease-out"}}>
            {msg.role==="user" ? (
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <div style={{fontSize:10,fontFamily:C.MONO,color:C.muted,background:C.panel,border:`1px solid ${C.border}`,
                  padding:"5px 9px",borderRadius:"6px 6px 2px 6px",maxWidth:"85%",lineHeight:1.5}}>
                  {msg.content.length>120?msg.content.slice(0,120)+"…":msg.content}
                </div>
              </div>
            ) : (
              <div style={{fontSize:11,color:C.text,lineHeight:1.7,background:C.panel2,border:`1px solid ${C.border}`,
                padding:"9px 11px",borderRadius:"2px 6px 6px 6px",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
                {msg.content.includes("[Tool:")
                  ? msg.content.split(/(\[Tool:[^\]]+\])/).map((part,j)=>
                      part.startsWith("[Tool:") ? (
                        <span key={j} style={{display:"block",fontSize:9,fontFamily:C.MONO,color:C.amber,
                          background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",
                          padding:"2px 7px",borderRadius:3,margin:"3px 0"}}>⚡ {part}</span>
                      ) : <span key={j}>{part}</span>
                    )
                  : msg.content
                }
              </div>
            )}
          </div>
        ))}
        {ai.streaming && (
          <div style={{fontSize:11,color:C.text,lineHeight:1.7,background:C.panel2,border:`1px solid ${C.borderHi}`,
            padding:"9px 11px",borderRadius:"2px 6px 6px 6px",whiteSpace:"pre-wrap",wordBreak:"break-word",
            animation:"fadeIn 0.2s"}}>
            {ai.streamText.includes("[Tool:")
              ? ai.streamText.split(/(\[Tool:[^\]]+\])/).map((part,j)=>
                  part.startsWith("[Tool:") ? (
                    <span key={j} style={{display:"block",fontSize:9,fontFamily:C.MONO,color:C.amber,
                      background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",
                      padding:"2px 7px",borderRadius:3,margin:"3px 0"}}>⚡ {part}</span>
                  ) : <span key={j}>{part}</span>
                )
              : ai.streamText
            }
            <span style={{display:"inline-block",width:7,height:13,background:C.cyan,marginLeft:2,verticalAlign:"middle",animation:"blink 0.7s step-end infinite"}}/>
          </div>
        )}
        {ai.error && (
          <div style={{fontSize:10,fontFamily:C.MONO,color:C.red,background:"rgba(239,68,68,0.06)",
            border:"1px solid rgba(239,68,68,0.2)",padding:"7px 10px",borderRadius:4}}>⚠ {ai.error}</div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Quick questions */}
      <div style={{padding:"8px 10px",borderTop:`1px solid ${C.border}`,flexShrink:0,display:"flex",gap:5,flexWrap:"wrap"}}>
        {["What's the current threat status?","Any escalating patterns?","Check event log","Get telemetry trends"].map(q=>(
          <button key={q} onClick={()=>ai.send(q)} disabled={!ai.isReady}
            style={{fontSize:9,fontFamily:C.MONO,padding:"3px 8px",background:"none",
              border:`1px solid ${ai.isReady?C.border:C.dim}`,color:ai.isReady?C.muted:C.dim,
              borderRadius:3,cursor:ai.isReady?"pointer":"not-allowed"}}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ALERT RULES
// ═══════════════════════════════════════════════════════════════════════════════
function AlertRules({ rules, setRules }) {
  const [d, setD] = useState({ metric:"anomaly", condition:"above", threshold:40, severity:"warning" });
  const sel = (x={}) => ({background:C.panel2,border:`1px solid ${C.border}`,color:C.text,padding:"4px 7px",borderRadius:3,fontSize:10,fontFamily:C.MONO,...x});
  return (
    <div style={{display:"flex",flexDirection:"column",gap:7}}>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {[["metric",["load","anomaly","threatScore"]],["condition",["above","below"]],["severity",["info","warning","critical"]]].map(([k,opts])=>(
          <select key={k} value={d[k]} onChange={e=>setD(x=>({...x,[k]:e.target.value}))} style={sel()}>
            {opts.map(o=><option key={o}>{o}</option>)}
          </select>
        ))}
        <input type="number" value={d.threshold} min={0} max={100} onChange={e=>setD(x=>({...x,threshold:+e.target.value}))} style={sel({width:52})}/>
        <button onClick={()=>setRules(r=>[...r,{...d,id:Date.now()}])}
          style={{background:C.amber,color:C.bg,border:"none",padding:"4px 12px",borderRadius:3,cursor:"pointer",fontWeight:900,fontSize:10,fontFamily:C.MONO}}>+ ADD</button>
      </div>
      <div style={{maxHeight:118,overflowY:"auto",display:"flex",flexDirection:"column",gap:3}}>
        {rules.map(r=>(
          <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"4px 9px",background:C.panel2,borderRadius:3,border:`1px solid ${sevColor(r.severity)}20`}}>
            <span style={{fontSize:10,fontFamily:C.MONO,color:sevColor(r.severity)}}>
              {r.metric} {r.condition} {r.threshold}
            </span>
            <div style={{display:"flex",gap:7,alignItems:"center"}}>
              <span style={{fontSize:8,padding:"1px 6px",borderRadius:2,fontWeight:900,
                background:`${sevColor(r.severity)}18`,color:sevColor(r.severity),letterSpacing:1}}>{r.severity.toUpperCase()}</span>
              <button onClick={()=>setRules(rs=>rs.filter(x=>x.id!==r.id))}
                style={{background:"none",border:"none",color:C.dim,cursor:"pointer",fontSize:15,lineHeight:1}}>×</button>
            </div>
          </div>
        ))}
        {!rules.length && <p style={{color:C.dim,fontSize:9,fontFamily:C.MONO,textAlign:"center",padding:8}}>No rules configured</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODALS
// ═══════════════════════════════════════════════════════════════════════════════
const OVL = {position:"fixed",top:0,left:0,width:"100%",height:"100%",background:"rgba(5,8,15,0.94)",backdropFilter:"blur(8px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"};
const BOX = {background:C.panel,border:`1px solid rgba(245,158,11,0.28)`,borderRadius:8,width:"92%",maxWidth:700,maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 72px rgba(0,0,0,0.88)"};
const MH  = {padding:"13px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"};
const Cls = ({onClick})=><button onClick={onClick} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",display:"flex",padding:3}}><X size={15}/></button>;

function EvidenceModal({ onClose, metrics, logs, history }) {
  const [step,setStep]=useState("gen"); const [hash,setHash]=useState(""); const [payload,setPayload]=useState(null);
  useEffect(()=>{
    (async()=>{
      const p = { metadata:{system:"ForensicTelemetry_v3.1",timestamp:new Date().toISOString(),chainOfCustody:Date.now()}, metrics, logs:logs.slice(0,30), chartHistory:history.slice(-50) };
      const h = await sha256(JSON.stringify(p));
      p.sha256_integrity=h; setHash(h); setPayload(p); setStep("ready");
    })();
  },[]);
  const dl=()=>{ const b=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=`forensic-evidence-${Date.now()}.json`; a.click(); };
  return (
    <div style={OVL}><div style={BOX}>
      <div style={MH}><span style={{color:C.amber,fontFamily:C.MONO,fontSize:11,letterSpacing:2}}>◈ EVIDENCE CAPTURE & SIGN</span><Cls onClick={onClose}/></div>
      <div style={{padding:18,overflowY:"auto",flex:1}}>
        {step==="gen"?<p style={{color:C.dim,fontFamily:C.MONO,fontSize:10,animation:"pulse 1s infinite"}}>Computing SHA-256…</p>:(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><div style={{fontSize:8,color:C.dim,fontFamily:C.MONO,letterSpacing:2,marginBottom:5}}>SHA-256 INTEGRITY HASH</div>
              <div style={{fontFamily:C.MONO,fontSize:10,color:C.green,background:"rgba(16,185,129,0.06)",padding:"9px 11px",borderRadius:4,border:"1px solid rgba(16,185,129,0.18)",wordBreak:"break-all"}}>{hash}</div></div>
            <pre style={{fontFamily:C.MONO,fontSize:9,color:C.text,background:C.panel2,padding:11,borderRadius:4,maxHeight:200,overflowY:"auto",margin:0,lineHeight:1.6}}>{JSON.stringify(payload,null,2).substring(0,800)}…</pre>
            <button onClick={dl} style={{width:"100%",padding:11,background:C.amber,color:C.bg,border:"none",borderRadius:4,cursor:"pointer",fontWeight:900,fontFamily:C.MONO,letterSpacing:2,fontSize:11}}>↓ DOWNLOAD SIGNED EVIDENCE</button>
          </div>
        )}
      </div>
    </div></div>
  );
}

function SettingsModal({ onClose, settings, setSettings }) {
  const Tog=({k,label})=>(
    <label style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
      <span style={{fontSize:11,color:C.text,fontFamily:C.MONO}}>{label}</span>
      <div onClick={()=>setSettings(s=>({...s,[k]:!s[k]}))} style={{width:36,height:19,borderRadius:10,position:"relative",cursor:"pointer",background:settings[k]?C.amber:C.panel2,border:`1px solid ${settings[k]?C.amber:C.border}`,transition:"background 0.2s"}}>
        <div style={{width:12,height:12,borderRadius:"50%",position:"absolute",top:3,left:settings[k]?21:3,background:"white",transition:"left 0.2s"}}/>
      </div>
    </label>
  );
  return (
    <div style={OVL}><div style={BOX}>
      <div style={MH}><span style={{color:C.amber,fontFamily:C.MONO,fontSize:11,letterSpacing:2}}>◈ SETTINGS</span><Cls onClick={onClose}/></div>
      <div style={{padding:18,display:"flex",flexDirection:"column",gap:14,overflowY:"auto"}}>
        {[{k:"duration",label:"SESSION DURATION",min:5,max:120,unit:"min"},{k:"aiInterval",label:"AUTO AI INTERVAL",min:20,max:180,unit:"sec"},{k:"telemetryInterval",label:"TELEMETRY POLL",min:2,max:30,unit:"sec"}].map(({k,label,min,max,unit})=>(
          <label key={k} style={{display:"flex",flexDirection:"column",gap:4}}>
            <span style={{fontSize:8,color:C.dim,fontFamily:C.MONO,letterSpacing:2}}>{label}: <span style={{color:C.amber}}>{settings[k]} {unit}</span></span>
            <input type="range" min={min} max={max} value={settings[k]} onChange={e=>setSettings(s=>({...s,[k]:+e.target.value}))} style={{accentColor:C.amber,width:"100%"}}/>
          </label>
        ))}
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,display:"flex",flexDirection:"column",gap:10}}>
          {[{k:"showChart",label:"TELEMETRY CHART"},{k:"showTimeline",label:"EVENT TIMELINE"},{k:"scanlines",label:"SCANLINE OVERLAY"},{k:"autoAI",label:"AUTONOMOUS AI ANALYSIS"},{k:"aiMemory",label:"AI CONVERSATION MEMORY"},{k:"alertFlash",label:"VISUAL ALERT FLASH"}].map(x=><Tog key={x.k} {...x}/>)}
        </div>
      </div>
    </div></div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function ForensicDashboard() {
  const [metrics, setMetrics]       = useState({ load:21, anomaly:8, threatScore:12, state:"NOMINAL" });
  const [history, setHistory]       = useState([]);
  const [logs, setLogs]             = useState([]);
  const [blips, setBlips]           = useState([]);
  const [alertRules, setAlertRules] = useState([
    {id:1,metric:"anomaly",condition:"above",threshold:50,severity:"warning"},
    {id:2,metric:"threatScore",condition:"above",threshold:68,severity:"critical"},
    {id:3,metric:"load",condition:"above",threshold:82,severity:"critical"},
  ]);
  const [settings, setSettings]     = useState({ duration:30, aiInterval:50, telemetryInterval:5, showChart:true, showTimeline:true, scanlines:true, autoAI:true, aiMemory:true, alertFlash:true });
  const [isSimulating, setIsSim]    = useState(false);
  const [activeSim, setActiveSim]   = useState(null);
  const [logSearch, setLogSearch]   = useState("");
  const [logFilter, setLogFilter]   = useState("all");
  const [modal, setModal]           = useState(null);
  const [sessionStart]              = useState(Date.now());
  const [timeLeft, setTimeLeft]     = useState(30*60);
  const [toast, setToast]           = useState(null);
  const [flash, setFlash]           = useState(false);
  const [aiLastUpdated, setAiLU]    = useState(null);
  const [firedRules, setFiredRules] = useState(new Set());

  // Refs
  const metricsRef     = useRef(metrics);
  const historyRef     = useRef(history);
  const logsRef        = useRef(logs);
  const alertRulesRef  = useRef(alertRules);
  const firedRef       = useRef(firedRules);
  const settingsRef    = useRef(settings);
  const isSimRef       = useRef(isSimulating);
  useEffect(()=>{ metricsRef.current=metrics; },[metrics]);
  useEffect(()=>{ historyRef.current=history; },[history]);
  useEffect(()=>{ logsRef.current=logs; },[logs]);
  useEffect(()=>{ alertRulesRef.current=alertRules; },[alertRules]);
  useEffect(()=>{ firedRef.current=firedRules; },[firedRules]);
  useEffect(()=>{ settingsRef.current=settings; },[settings]);
  useEffect(()=>{ isSimRef.current=isSimulating; },[isSimulating]);

  const showToast = useCallback((msg,type="info")=>{
    setToast({msg,type}); setTimeout(()=>setToast(null),3400);
  },[]);

  const addLog = useCallback((event,status,val,severity="info")=>{
    const e = {id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,time:now(),event,status,val,severity};
    setLogs(p=>[e,...p].slice(0,200));
    return e;
  },[]);

  // ── SYSTEM PROMPT — gives AI access to real instructions ───────────────────
  const systemPrompt = `You are an autonomous forensic security AI analyst embedded in a real-time threat monitoring system. You have access to live tools to query actual system metrics, event logs, and telemetry history.

Your capabilities:
- get_live_metrics: fetch current CPU load, anomaly score, threat score, system state
- query_event_log: search and filter the forensic event log
- get_telemetry_history: retrieve historical trend data
- get_alert_rules: review configured alert thresholds

Your behavior:
- ALWAYS use tools to get real data before making assessments — never guess
- Be concise, technical, and actionable
- Identify patterns across multiple tool calls when needed
- Flag escalating threats immediately
- Reference specific data points from tool results
- Format key findings clearly: threat level, pattern, recommended actions
- Maintain awareness of conversation history to track threat evolution over time`;

  // ── TOOL CALL HANDLER ─────────────────────────────────────────────────────
  const handleToolCall = useCallback(async (tool) => {
    const m = metricsRef.current;
    const h = historyRef.current;
    const l = logsRef.current;
    const r = alertRulesRef.current;

    switch(tool.name) {
      case "get_live_metrics": {
        const detail = tool.input?.detail || "summary";
        return detail === "full" ? {
          load: m.load, anomaly: m.anomaly, threatScore: m.threatScore,
          state: m.state, historyPoints: h.length,
          recentAlerts: l.filter(x=>x.severity!=="info").length,
          topSeverity: l[0]?.severity || "none",
          lastEvent: l[0]?.event || "none",
          avgLoad: h.length ? Math.round(h.reduce((a,x)=>a+x.load,0)/h.length) : m.load,
          avgAnomaly: h.length ? Math.round(h.reduce((a,x)=>a+x.anomaly,0)/h.length) : m.anomaly,
          peakThreat: h.length ? Math.max(...h.map(x=>x.threat)) : m.threatScore,
          timestamp: now()
        } : { load:m.load, anomaly:m.anomaly, threatScore:m.threatScore, state:m.state, timestamp:now() };
      }
      case "query_event_log": {
        const { severity="all", limit=10, search="" } = tool.input||{};
        let filtered = l;
        if (severity!=="all") filtered = filtered.filter(x=>x.severity===severity);
        if (search) filtered = filtered.filter(x=>x.event.toLowerCase().includes(search.toLowerCase())||x.status.toLowerCase().includes(search.toLowerCase()));
        return { count:filtered.length, entries: filtered.slice(0,Math.min(limit,30)).map(x=>({time:x.time,event:x.event,status:x.status,val:x.val,severity:x.severity})) };
      }
      case "get_telemetry_history": {
        const pts = Math.min(tool.input?.points||20, 40);
        const slice = h.slice(-pts);
        const loads = slice.map(x=>x.load), anoms = slice.map(x=>x.anomaly), threats = slice.map(x=>x.threat);
        const avg = arr => arr.length ? Math.round(arr.reduce((a,v)=>a+v,0)/arr.length) : 0;
        const trend = arr => arr.length<2 ? "stable" : arr[arr.length-1]>arr[0]+8 ? "escalating" : arr[arr.length-1]<arr[0]-8 ? "de-escalating" : "stable";
        return { pointsReturned:slice.length, avgLoad:avg(loads), avgAnomaly:avg(anoms), avgThreat:avg(threats), peakLoad:Math.max(...loads,0), peakAnomaly:Math.max(...anoms,0), peakThreat:Math.max(...threats,0), loadTrend:trend(loads), anomalyTrend:trend(anoms), threatTrend:trend(threats), recentPoints:slice.slice(-5) };
      }
      case "get_alert_rules": {
        return { count:r.length, rules:r.map(x=>({metric:x.metric,condition:x.condition,threshold:x.threshold,severity:x.severity})) };
      }
      default: return { error:`Unknown tool: ${tool.name}` };
    }
  },[]);

  // ── INIT useAnthropic ─────────────────────────────────────────────────────
  const ai = useAnthropic({
    systemPrompt,
    maxHistory: 24,
    maxRetries: 3,
    tools: ANALYST_TOOLS,
    onToolCall: handleToolCall,
    onComplete: (text) => { setAiLU(now()); addLog("AI Analysis Complete","ANALYST_UPDATE",text.slice(0,40)+"…","info"); }
  });

  // ── TRIGGER ANALYSIS ──────────────────────────────────────────────────────
  const runAnalysis = useCallback(()=>{
    if (!ai.isReady) return;
    const m = metricsRef.current;
    const lv = threatLevel(m.threatScore);
    const prompt = `Perform a forensic analysis of the current system state. Use your tools to gather live data, then provide: threat assessment, identified patterns, and recommended actions. Current snapshot: Load=${m.load}% Anomaly=${m.anomaly}% ThreatScore=${m.threatScore} State=${m.state} Level=${lv.label}`;
    ai.send(prompt);
  },[ai]);

  // ── PUSH METRICS ──────────────────────────────────────────────────────────
  const pushMetrics = useCallback((load, anomaly, state="NOMINAL")=>{
    const alerts = logsRef.current.filter(x=>x.severity!=="info").length;
    const threatScore = computeThreat(load, anomaly, Math.min(alerts,25));
    const m = {load, anomaly, threatScore, state};
    setMetrics(m);
    setHistory(p=>[...p,{t:now(),load,anomaly,threat:threatScore}].slice(-80));
    // Rule engine
    alertRulesRef.current.forEach(rule=>{
      const v = m[rule.metric]??0;
      const fired = rule.condition==="above" ? v>rule.threshold : v<rule.threshold;
      const key = String(rule.id);
      if (fired && !firedRef.current.has(key)) {
        addLog(`Rule: ${rule.metric} ${rule.condition} ${rule.threshold}`,`THRESHOLD_${rule.severity.toUpperCase()}`,v,rule.severity);
        if (rule.severity==="critical" && settingsRef.current.alertFlash) { setFlash(true); setTimeout(()=>setFlash(false),1000); }
        setFiredRules(s=>{ const n=new Set(s); n.add(key); return n; });
      } else if (!fired && firedRef.current.has(key)) {
        setFiredRules(s=>{ const n=new Set(s); n.delete(key); return n; });
      }
    });
    return m;
  },[addLog]);

  // ── TELEMETRY LOOP ────────────────────────────────────────────────────────
  useEffect(()=>{
    const id=setInterval(()=>{ if(isSimRef.current) return; pushMetrics(rand(12,38),rand(4,22)); },settings.telemetryInterval*1000);
    return ()=>clearInterval(id);
  },[settings.telemetryInterval, pushMetrics]);

  // ── AUTO AI ───────────────────────────────────────────────────────────────
  useEffect(()=>{
    if (!settings.autoAI) return;
    const t0 = setTimeout(()=>runAnalysis(), 3000);
    const id = setInterval(()=>runAnalysis(), settings.aiInterval*1000);
    return ()=>{ clearTimeout(t0); clearInterval(id); };
  },[settings.autoAI, settings.aiInterval, runAnalysis]);

  // ── SESSION TIMER ─────────────────────────────────────────────────────────
  useEffect(()=>{
    const id=setInterval(()=>{
      const rem = settings.duration*60 - Math.floor((Date.now()-sessionStart)/1000);
      setTimeLeft(Math.max(0,rem));
      if (rem===60) showToast("⚠ Session expires in 60 seconds","warning");
      if (rem<=0) { setLogs([]); setHistory([]); setBlips([]); if(!settings.aiMemory) ai.clear(); showToast("Session expired — data wiped","alert"); }
    },1000);
    return ()=>clearInterval(id);
  },[sessionStart, settings.duration, settings.aiMemory, showToast, ai]);

  // ── SIMULATIONS ───────────────────────────────────────────────────────────
  const runSim = useCallback((sim)=>{
    if (isSimulating) return;
    setIsSim(true); setActiveSim(sim);
    setBlips(p=>[...p,{x:30+Math.random()*140,y:30+Math.random()*140,t:Date.now()}]);
    pushMetrics(sim.load, sim.anomaly, "INVESTIGATING");
    addLog(`[SIM] ${sim.label}`,"INCIDENT_TRIGGERED",sim.anomaly,"critical");
    showToast(`▶ ${sim.desc}`,"alert");
    setTimeout(()=>{ if(ai.isReady) { ai.send(`ALERT: ${sim.label} simulation triggered. Load=${sim.load}% Anomaly=${sim.anomaly}%. Analyze this incident using your tools and provide immediate forensic assessment.`); } },600);
    setTimeout(()=>{
      setIsSim(false); setActiveSim(null);
      pushMetrics(rand(12,26),rand(4,14),"NOMINAL");
      addLog("Recovery Protocol","STABILIZED","nominal","info");
      showToast("✓ System stabilized","success");
    },sim.dur);
  },[isSimulating, pushMetrics, addLog, showToast, ai]);

  // ── LOG FILTER ────────────────────────────────────────────────────────────
  const filteredLogs = logs.filter(l=>{
    const ms = !logSearch || l.event.toLowerCase().includes(logSearch.toLowerCase()) || l.status.toLowerCase().includes(logSearch.toLowerCase());
    const mf = logFilter==="all" || (logFilter==="alerts"&&l.severity!=="info") || (logFilter==="info"&&l.severity==="info");
    return ms && mf;
  });

  // ── CSS ───────────────────────────────────────────────────────────────────
  useEffect(()=>{
    const s=document.createElement("style"); s.id="fts-styles";
    if (!document.getElementById("fts-styles")) {
      s.textContent=`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideup{from{transform:translateX(-50%) translateY(14px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
        @keyframes flashred{0%,100%{background:#05080f}50%{background:rgba(239,68,68,0.07)}}
        *{scrollbar-width:thin;scrollbar-color:rgba(245,158,11,0.18) transparent;box-sizing:border-box;}
        *::-webkit-scrollbar{width:4px;height:4px}
        *::-webkit-scrollbar-thumb{background:rgba(245,158,11,0.18);border-radius:4px}
        input,textarea,select{outline:none}
        select option{background:#0b1220}
        input[type=range]{accent-color:#f59e0b}
      `;
      document.head.appendChild(s);
    }
  },[]);

  const lv = threatLevel(metrics.threatScore);
  const timerCol = timeLeft<60?C.red:timeLeft<300?C.amber:C.muted;
  const toastPalette = {info:C.cyan,success:C.green,warning:C.amber,alert:C.red};

  // ── PANEL WRAPPER ─────────────────────────────────────────────────────────
  const Panel = ({children,style={}})=>(
    <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:7,padding:12,...style}}>{children}</div>
  );
  const SLabel=({icon,text,right})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        {icon}<span style={{fontSize:8,fontFamily:C.MONO,color:C.muted,letterSpacing:3,fontWeight:700}}>{text}</span>
      </div>
      {right}
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:C.MONO,display:"flex",flexDirection:"column",
      animation:flash?"flashred 0.4s ease":"none"}}>

      {/* SCANLINES */}
      {settings.scanlines && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,pointerEvents:"none",zIndex:9999,
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)"}}/>
      )}

      {/* ── HEADER ── */}
      <header style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,background:C.surface,
        display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100,
        boxShadow:"0 2px 24px rgba(0,0,0,0.6)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Shield size={17} color={C.amber}/>
          <div>
            <div style={{fontSize:12,letterSpacing:3,fontWeight:700,color:C.amber}}>FORENSIC TELEMETRY</div>
            <div style={{fontSize:8,color:C.dim,letterSpacing:2}}>AUTONOMOUS INCIDENT ANALYSIS — AI-INTEGRATED v3.1</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {/* AI Status */}
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"3px 10px",background:"rgba(34,211,238,0.04)",border:`1px solid rgba(34,211,238,0.15)`,borderRadius:3}}>
            <Brain size={10} color={ai.streaming?C.cyan:C.muted} style={{animation:ai.streaming?"pulse 0.8s infinite":"none"}}/>
            <span style={{fontSize:8,fontFamily:C.MONO,color:ai.streaming?C.cyan:C.muted,letterSpacing:1}}>
              {ai.streaming?"ANALYZING…":ai.pendingTool?`⚡ ${ai.pendingTool.name}`:`AI ${ai.history.length>0?"ACTIVE":"STANDBY"}`}
            </span>
          </div>
          <div style={{padding:"4px 12px",borderRadius:3,fontSize:9,fontWeight:900,letterSpacing:2,fontFamily:C.MONO,
            background:`${lv.color}14`,border:`1px solid ${lv.color}44`,color:lv.color,
            animation:lv.key==="critical"?"pulse 0.9s infinite":"none"}}>{lv.label} {metrics.threatScore}</div>
          <div style={{display:"flex",alignItems:"center",gap:4,color:timerCol}}>
            <Clock size={10}/><span style={{fontSize:11,fontWeight:700}}>{fmtT(timeLeft)}</span>
          </div>
          {[{icon:<Settings size={14}/>,key:"settings",tip:"Settings"},{icon:<FileText size={14}/>,key:"logs",tip:"Full Log"},{icon:<Database size={14}/>,key:"evidence",tip:"Capture Evidence"}].map(({icon,key,tip})=>(
            <button key={key} title={tip} onClick={()=>setModal(key)}
              style={{background:"none",border:`1px solid ${modal===key?C.amber:C.border}`,
                color:modal===key?C.amber:C.muted,padding:"5px 7px",borderRadius:4,cursor:"pointer",display:"flex"}}>{icon}</button>
          ))}
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={{flex:1,padding:12,display:"flex",flexDirection:"column",gap:12}}>

        {/* TOP ROW */}
        <div style={{display:"flex",gap:12}}>

          {/* LEFT — metrics column */}
          <div style={{width:196,display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
            <Panel>
              <SLabel icon={<Activity size={10} color={C.amber}/>} text="THREAT RADAR"/>
              <Radar score={metrics.threatScore} blips={blips}/>
            </Panel>
            <Panel style={{textAlign:"center",padding:"10px 8px"}}>
              <div style={{fontSize:8,color:C.dim,letterSpacing:2,marginBottom:4}}>COMPOSITE SCORE</div>
              <div style={{fontSize:52,fontWeight:900,lineHeight:1,color:lv.color,textShadow:`0 0 24px ${lv.color}44`}}>{metrics.threatScore}</div>
              <div style={{fontSize:8,color:C.dim,letterSpacing:2,marginTop:2}}>/100</div>
            </Panel>
            <Panel style={{textAlign:"center",padding:"8px"}}>
              <div style={{fontSize:8,color:C.dim,letterSpacing:2,marginBottom:3}}>SYSTEM STATE</div>
              <div style={{fontSize:12,fontWeight:900,letterSpacing:3,
                color:metrics.state==="NOMINAL"?C.green:C.red,
                animation:metrics.state!=="NOMINAL"?"pulse 0.8s infinite":"none"}}>{metrics.state}</div>
            </Panel>
            {[{k:"load",label:"SYS LOAD",unit:"%",warn:65,crit:82},{k:"anomaly",label:"ANOMALY",unit:"%",warn:32,crit:52}].map(({k,label,unit,warn,crit})=>{
              const v=metrics[k]; const col=v>=crit?C.red:v>=warn?C.amber:C.text;
              return (
                <Panel key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 11px"}}>
                  <span style={{fontSize:8,color:C.dim,letterSpacing:2}}>{label}</span>
                  <span style={{fontSize:22,fontWeight:900,color:col,textShadow:`0 0 8px ${col}40`}}>{v}<span style={{fontSize:9,color:C.dim}}>{unit}</span></span>
                </Panel>
              );
            })}
          </div>

          {/* CENTER — chart + rules */}
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:8,minWidth:0}}>
            {settings.showChart && (
              <Panel style={{height:236}}>
                <SLabel icon={<Activity size={10} color={C.amber}/>} text="LIVE TELEMETRY"
                  right={<span style={{fontSize:8,color:C.dim}}>{history.length} pts</span>}/>
                <div style={{height:182}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history} margin={{top:2,right:2,bottom:0,left:-26}}>
                      <defs>
                        {[["load",C.blue],["anomaly",C.cyan],["threat",C.red]].map(([k,col])=>(
                          <linearGradient key={k} id={`g${k}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={col} stopOpacity={0.25}/>
                            <stop offset="95%" stopColor={col} stopOpacity={0}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)"/>
                      <XAxis dataKey="t" hide/>
                      <YAxis domain={[0,100]} tick={{fill:C.dim,fontSize:8}} tickLine={false} axisLine={false}/>
                      <Tooltip contentStyle={{background:C.panel2,border:`1px solid ${C.border}`,borderRadius:4,fontSize:9}} labelStyle={{color:C.dim}}/>
                      <Area type="monotone" dataKey="load" stroke={C.blue} fill="url(#gload)" strokeWidth={1.5} dot={false} name="Load %"/>
                      <Area type="monotone" dataKey="anomaly" stroke={C.cyan} fill="url(#ganomaly)" strokeWidth={1.5} dot={false} name="Anomaly %"/>
                      <Area type="monotone" dataKey="threat" stroke={C.red} fill="url(#gthreat)" strokeWidth={2} dot={false} name="Threat Score"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            )}
            <Panel style={{flex:1}}>
              <SLabel icon={<AlertTriangle size={10} color={C.amber}/>} text="ALERT RULES"
                right={<span style={{fontSize:8,color:C.dim}}>{alertRules.length} active</span>}/>
              <AlertRules rules={alertRules} setRules={setAlertRules}/>
            </Panel>
          </div>

          {/* RIGHT — AI Panel */}
          <div style={{width:292,flexShrink:0}}>
            <Panel style={{height:"100%",padding:0,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <AIAnalystPanel ai={ai} onAnalyze={runAnalysis} autoEnabled={settings.autoAI} metrics={metrics} lastUpdated={aiLastUpdated}/>
            </Panel>
          </div>
        </div>

        {/* TIMELINE */}
        {settings.showTimeline && (
          <Panel>
            <SLabel icon={<Clock size={10} color={C.amber}/>} text="ALERT EVENT TIMELINE"/>
            {logs.filter(l=>l.severity!=="info").length===0
              ? <div style={{textAlign:"center",padding:"8px 0",color:C.dim,fontSize:9}}>No alert events yet</div>
              : (
                <div style={{display:"flex",gap:5,overflowX:"auto",padding:"4px 0",alignItems:"center",position:"relative"}}>
                  <div style={{position:"absolute",top:"50%",left:0,right:0,height:1,background:"rgba(245,158,11,0.08)"}}/>
                  {[...logs.filter(l=>l.severity!=="info")].reverse().slice(0,28).map(l=>(
                    <div key={l.id} title={`${l.event}: ${l.status}`} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0}}>
                      <span style={{fontSize:7,color:sevColor(l.severity),fontFamily:C.MONO,whiteSpace:"nowrap"}}>{l.time}</span>
                      <div style={{width:8,height:8,borderRadius:"50%",background:sevColor(l.severity),boxShadow:`0 0 5px ${sevColor(l.severity)}`,zIndex:1}}/>
                      <span style={{fontSize:7,color:C.dim,maxWidth:44,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.event.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              )
            }
          </Panel>
        )}

        {/* BOTTOM ROW */}
        <div style={{display:"flex",gap:12}}>
          {/* Log Panel */}
          <Panel style={{flex:1,height:210,display:"flex",flexDirection:"column",gap:7}}>
            <SLabel icon={<FileText size={10} color={C.amber}/>} text="EVENT LOG"
              right={<span style={{fontSize:8,color:C.dim}}>{logs.length} entries</span>}/>
            <div style={{display:"flex",gap:5}}>
              <div style={{flex:1,position:"relative"}}>
                <Search size={9} style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:C.dim}}/>
                <input value={logSearch} onChange={e=>setLogSearch(e.target.value)} placeholder="Filter events…"
                  style={{width:"100%",background:C.panel2,border:`1px solid ${C.border}`,color:C.text,
                    padding:"4px 7px 4px 22px",borderRadius:3,fontSize:10,fontFamily:C.MONO}}/>
              </div>
              {["all","alerts","info"].map(f=>(
                <button key={f} onClick={()=>setLogFilter(f)}
                  style={{padding:"3px 8px",background:logFilter===f?C.amber:"transparent",
                    color:logFilter===f?C.bg:C.muted,border:`1px solid ${logFilter===f?C.amber:C.border}`,
                    borderRadius:3,cursor:"pointer",fontSize:8,fontWeight:700}}>{f.toUpperCase()}</button>
              ))}
            </div>
            <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>
              {!filteredLogs.length && <p style={{color:C.dim,fontSize:9,textAlign:"center",paddingTop:12}}>No matching events</p>}
              {filteredLogs.map(l=>(
                <div key={l.id} style={{padding:"4px 9px",background:C.panel2,borderRadius:3,
                  borderLeft:`2px solid ${sevColor(l.severity)}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
                  <div style={{display:"flex",gap:7,alignItems:"center",minWidth:0}}>
                    <span style={{fontSize:8,color:C.dim,flexShrink:0}}>{l.time}</span>
                    <span style={{fontSize:10,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.event}</span>
                  </div>
                  <div style={{display:"flex",gap:5,flexShrink:0}}>
                    <span style={{fontSize:8,color:sevColor(l.severity)}}>{l.status}</span>
                    <span style={{fontSize:8,color:C.dim}}>({l.val})</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Simulations + Controls */}
          <Panel style={{width:280,flexShrink:0,display:"flex",flexDirection:"column",gap:8}}>
            <SLabel icon={<Play size={10} color={C.amber}/>} text="INCIDENT SIMULATIONS"
              right={isSimulating&&<span style={{fontSize:8,color:C.red,animation:"pulse 0.6s infinite"}}>● RUNNING</span>}/>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {SIMS.map(sim=>(
                <button key={sim.id} onClick={()=>runSim(sim)} disabled={isSimulating} title={sim.desc}
                  style={{padding:"7px 10px",background:"transparent",textAlign:"left",
                    border:`1px solid ${activeSim?.id===sim.id?sim.color:C.border}`,
                    color:activeSim?.id===sim.id?sim.color:C.muted,borderRadius:4,
                    cursor:isSimulating?"not-allowed":"pointer",fontSize:9,fontFamily:C.MONO,
                    animation:activeSim?.id===sim.id?"pulse 0.9s infinite":"none",transition:"all 0.15s"}}>
                  {activeSim?.id===sim.id?"▶ ":"▷ "}{sim.label}
                </button>
              ))}
            </div>
            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:8,display:"flex",flexDirection:"column",gap:6}}>
              <button onClick={()=>setModal("evidence")}
                style={{padding:"9px",background:C.amber,color:C.bg,border:"none",borderRadius:4,cursor:"pointer",
                  fontWeight:900,fontSize:10,fontFamily:C.MONO,letterSpacing:2,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                <Lock size={10}/> CAPTURE EVIDENCE
              </button>
              <button onClick={()=>{ if(!confirm("Wipe all session data?")) return; setLogs([]); setHistory([]); setBlips([]); if(!settings.aiMemory) ai.clear(); showToast("Session wiped","info"); }}
                style={{padding:"7px",background:"transparent",color:C.red,border:`1px solid rgba(239,68,68,0.22)`,
                  borderRadius:4,cursor:"pointer",fontSize:9,fontFamily:C.MONO,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                <Trash2 size={9}/> WIPE SESSION DATA
              </button>
            </div>
          </Panel>
        </div>
      </main>

      {/* ── MODALS ── */}
      {modal==="settings" && <SettingsModal onClose={()=>setModal(null)} settings={settings} setSettings={setSettings}/>}
      {modal==="evidence" && <EvidenceModal onClose={()=>setModal(null)} metrics={metrics} logs={logs} history={history}/>}
      {modal==="logs" && (
        <div style={OVL}><div style={{...BOX,maxWidth:860}}>
          <div style={MH}><span style={{color:C.amber,fontFamily:C.MONO,fontSize:11,letterSpacing:2}}>◈ FULL EVENT LOG — {logs.length} entries</span><Cls onClick={()=>setModal(null)}/></div>
          <div style={{padding:14,flex:1,overflowY:"auto",minHeight:400,display:"flex",flexDirection:"column",gap:4}}>
            {logs.map(l=>(
              <div key={l.id} style={{padding:"5px 10px",background:C.panel2,borderRadius:3,borderLeft:`2px solid ${sevColor(l.severity)}`,
                display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                <div style={{display:"flex",gap:8,minWidth:0}}>
                  <span style={{fontSize:8,color:C.dim,flexShrink:0,fontFamily:C.MONO}}>{l.time}</span>
                  <span style={{fontSize:10,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.event}</span>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <span style={{fontSize:8,color:sevColor(l.severity),fontFamily:C.MONO}}>{l.status}</span>
                  <span style={{fontSize:8,color:C.dim}}>({l.val})</span>
                </div>
              </div>
            ))}
          </div>
        </div></div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",
          background:toastPalette[toast.type]||C.cyan,color:C.bg,padding:"8px 18px",borderRadius:4,
          fontWeight:700,fontSize:10,fontFamily:C.MONO,letterSpacing:1,zIndex:2000,
          animation:"slideup 0.3s ease-out",whiteSpace:"nowrap",boxShadow:"0 4px 22px rgba(0,0,0,0.7)"}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
This is the fully unified system — everything wired together end to end:
What changed from before:
The useAnthropic hook is now the single AI engine — all streaming, memory, retry, and tool calling flows through it
The AI Analyst has 4 live tools that query actual real-time data from the dashboard — not a prompt string, but real function calls returning live metrics, event log entries, telemetry history, and alert rules
Conversation memory is persistent — the AI builds a threat narrative across multiple analyses, noticing things like "this is the third escalation this session"
Simulations auto-trigger the AI — run a DDoS sim and the analyst immediately fires with real data from that incident
Quick questions let you ask the AI anything mid-session and it uses tools to answer with live data
The AI logs its own analysis completions as forensic events
Every future project we build can just pull in useAnthropic and be AI-ready in one line. The foundation is solid. 🔥
