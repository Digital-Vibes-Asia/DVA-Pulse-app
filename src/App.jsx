import React, { useState, useMemo, useRef } from "react";
import Papa from "papaparse";
import logoUrl from "./assets/logo.png";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import {
  Upload, Users, BarChart3, BookOpen, Menu, X, CheckCircle2, ArrowRight,
  Activity, FileText, AlertTriangle, Clock, Search, Download, Zap, Filter,
  ChevronRight, TrendingUp, Inbox, Target, Gauge, RefreshCw, ShieldCheck,
  PhoneCall, Sun, Moon, MessageCircle, Mail, Phone, CalendarDays, TrendingDown, ArrowDownRight, ArrowUpRight, ArrowRightLeft,
} from "lucide-react";

/* ============================== ELEVENLABS AI CALL ============================== */
// Tenant config for the voice agent. Move to per-org settings when DVAPulse goes multi-tenant.
const AI_AGENT_NAME = "Patrick";
const AI_ORG_NAME = "KPJ Nursing University";
const AI_ORG_SHORT = "KPJU";

// The widget is mounted as a singleton in index.html (hidden by default). We:
// (1) push per-lead context via the `dynamic-variables` attribute,
// (2) reveal the host element, and
// (3) dispatch the widget's own `elevenlabs-agent:expand` event to open it.
// After the call ends and the widget collapses back to its compact trigger,
// we re-hide it so the floating bubble doesn't linger.
let aiWatcher = null;
function startAiCall(lead, manager){
  const el = document.getElementById("dva-ai-call");
  if (!el) { console.warn("AI widget element not found"); return; }
  const NA = "not on file";
  const vars = {
    agent_name: AI_AGENT_NAME,
    organization_name: AI_ORG_NAME,
    organization_short: AI_ORG_SHORT,
    manager_name: manager?.name || "your Relationship Manager",
    lead_id: lead.id,
    lead_name: lead.name,
    lead_email: lead.email || NA,
    lead_phone: lead.phone || NA,
    lead_country: lead.country || "Malaysia",
    lead_location: lead.location || NA,
    lead_qualification: lead.qualification || NA,
    lead_program: lead.program || NA,
    lead_campus: lead.campus || NA,
    lead_intake: lead.intake || NA,
    lead_source: lead.source || NA,
    lead_status: lead.status || "In Progress",
  };
  el.setAttribute("dynamic-variables", JSON.stringify(vars));
  el.style.display = "";
  document.dispatchEvent(new CustomEvent("elevenlabs-agent:expand", { detail: { action: "expand" } }));

  if (aiWatcher) clearInterval(aiWatcher);
  let sawExpanded = false;
  aiWatcher = setInterval(() => {
    const root = el.shadowRoot;
    if (!root) return;
    const v = root.querySelector("[data-variant]");
    if (!v) return;
    const variant = v.getAttribute("data-variant");
    if (variant === "expanded" || variant === "fullscreen") {
      sawExpanded = true;
    } else if (sawExpanded && variant === "compact") {
      el.style.display = "none";
      clearInterval(aiWatcher);
      aiWatcher = null;
    }
  }, 500);
}

/* ============================== WHATSAPP QUICK MESSAGE ============================== */
const WA_TEMPLATES = [
  {
    key:"intro", title:"Introduction",
    desc:"First-touch hello with your name and the programme they enquired about.",
    build:(lead, manager, org) =>
      `Hi ${lead.name.split(" ")[0]}, this is ${manager.name} from ${org}. I'm following up on your interest in our ${lead.program} at ${lead.campus}. Is now a good time to chat?`,
  },
  {
    key:"followup", title:"Application follow-up",
    desc:"Check in on application progress and offer to answer questions.",
    build:(lead, manager) =>
      `Hi ${lead.name.split(" ")[0]}, just following up on your ${lead.program} application for the ${lead.intake} intake. Do you have any questions I can help with?`,
  },
  {
    key:"schedule", title:"Schedule a call",
    desc:"Propose a quick call and let them pick a time.",
    build:(lead) =>
      `Hi ${lead.name.split(" ")[0]}, when would be a good time for a 5-minute call about your ${lead.program} application? Morning or afternoon — what works better?`,
  },
  {
    key:"info", title:"Send info pack",
    desc:"Offer detailed programme materials and confirm their email.",
    build:(lead) =>
      `Hi ${lead.name.split(" ")[0]}, happy to send over the full info pack for our ${lead.program} programme at ${lead.campus}. Just confirming — is ${lead.email} still the best email?`,
  },
];

function WhatsAppModal({lead, manager, onClose, onSent}){
  if (!lead) return null;
  const phone = (lead.phone || "").replace(/\D/g,"");
  const send = (template) => {
    const msg = template.build(lead, manager, AI_ORG_NAME);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onSent(lead.id);
    onClose();
  };
  return (
    <div className="dva-wamodal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="dva-wamodal-panel" onClick={e=>e.stopPropagation()}>
        <div className="dva-wamodal-head">
          <div>
            <div className="dva-eyebrow" style={{color:"#25d366"}}>WhatsApp · {phone || "no number on file"}</div>
            <h2 style={{margin:"4px 0 0",fontSize:20,fontWeight:800,fontFamily:"'Figtree',sans-serif"}}>{lead.name}</h2>
            <div style={{fontSize:13,color:"var(--ink-2)",marginTop:2}}>
              <span className="dva-mono">{lead.id}</span> · {lead.program} · {lead.campus}
            </div>
          </div>
          <button className="dva-btn dva-btn-ghost dva-btn-sm" onClick={onClose} aria-label="Close"><X size={14}/></button>
        </div>
        <div className="dva-wamodal-body">
          {!phone && (
            <div style={{padding:"10px 12px",borderRadius:8,background:"var(--coral-soft)",color:"var(--coral)",fontSize:12.5}}>
              No phone number on file — these templates won't open WhatsApp until a number is added to the lead.
            </div>
          )}
          {WA_TEMPLATES.map(t => {
            const preview = t.build(lead, manager, AI_ORG_NAME);
            return (
              <button key={t.key} className="dva-wamodal-option" onClick={()=>send(t)} disabled={!phone}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:6}}>
                  <span style={{fontWeight:700,fontSize:14.5}}>{t.title}</span>
                  <ArrowRight size={14} style={{color:"#25d366"}}/>
                </div>
                <div style={{fontSize:12,color:"var(--ink-2)",marginBottom:8}}>{t.desc}</div>
                <div style={{fontSize:12.5,color:"var(--ink)",background:"var(--line-2)",padding:"8px 10px",borderRadius:8,lineHeight:1.5}}>
                  &ldquo;{preview}&rdquo;
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <style>{`
        .dva-wamodal-overlay{position:fixed;inset:0;z-index:80;background:rgba(12,26,36,.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:24px;}
        .dva-wamodal-panel{background:var(--surface);border-radius:18px;width:min(580px,100%);max-height:calc(100vh - 48px);overflow:auto;box-shadow:0 30px 80px -20px rgba(12,26,36,.4);border:1px solid var(--line);}
        .dva-wamodal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 22px 14px;border-bottom:1px solid var(--line-2);}
        .dva-wamodal-body{padding:14px 18px 20px;display:flex;flex-direction:column;gap:10px;}
        .dva-wamodal-option{
          text-align:left;background:transparent;border:1px solid var(--line);border-radius:12px;padding:14px;
          color:inherit;font-family:inherit;cursor:pointer;transition:.15s;
        }
        .dva-wamodal-option:hover:not(:disabled){border-color:#25d366;background:var(--line-2);}
        .dva-wamodal-option:disabled{opacity:.45;cursor:not-allowed;}
      `}</style>
    </div>
  );
}

/* ============================== EMAIL QUICK MESSAGE ============================== */
const EMAIL_TEMPLATES = [
  {
    key:"intro", title:"Introduction",
    desc:"First-touch hello introducing yourself and the programme.",
    subject:(lead, org) => `Following up on your ${lead.program} enquiry at ${org}`,
    body:(lead, manager, org) =>
`Hi ${lead.name.split(" ")[0]},

This is ${manager.name} from ${org}. I'm following up on your interest in our ${lead.program} programme at ${lead.campus}.

I'd love to learn more about your goals and answer any questions you may have about the application process for the ${lead.intake} intake.

Would you be free for a quick chat this week? Just reply with a time that suits you.

Best regards,
${manager.name}
${org}`,
  },
  {
    key:"followup", title:"Application follow-up",
    desc:"Check in on application progress and offer help.",
    subject:(lead) => `Quick check-in: your ${lead.program} application`,
    body:(lead, manager, org) =>
`Hi ${lead.name.split(" ")[0]},

Just checking in on your ${lead.program} application for the ${lead.intake} intake.

Is there anything I can help clarify — entry requirements, fees, schedule, accommodation? Happy to jump on a call or answer here.

Looking forward to hearing from you.

Best,
${manager.name}
${org}`,
  },
  {
    key:"info", title:"Send info pack",
    desc:"Formal info pack with programme details.",
    subject:(lead) => `${lead.program} info pack — ${lead.campus}`,
    body:(lead, manager, org) =>
`Hi ${lead.name.split(" ")[0]},

As promised, here's the info pack for our ${lead.program} programme at ${lead.campus}, covering:

  • Programme structure and module breakdown
  • Entry requirements (currently noted: ${lead.qualification})
  • Tuition fees and available scholarships
  • Class schedule for the ${lead.intake} intake
  • Campus facilities and accommodation

I'll send the PDF separately. Let me know what stands out and I'll set up a call to walk through it.

Best,
${manager.name}
${org}`,
  },
  {
    key:"meeting", title:"Schedule a meeting",
    desc:"Propose specific times for a face-to-face or video call.",
    subject:(lead) => `Let's schedule a chat — ${lead.program}`,
    body:(lead, manager, org) =>
`Hi ${lead.name.split(" ")[0]},

I'd like to set up a short meeting to discuss your ${lead.program} application and answer any questions in detail.

A few options that work for me this week:

  • [DAY] morning
  • [DAY] afternoon
  • [DAY] evening

Reply with the time that suits you best, and I'll send a calendar invite. We can do it over video call or you're welcome to visit the ${lead.campus} campus in person.

Best regards,
${manager.name}
${org}`,
  },
];

function EmailModal({lead, manager, onClose, onSent}){
  if (!lead) return null;
  const email = lead.email || "";
  const send = (template) => {
    const subj = template.subject(lead, AI_ORG_NAME);
    const body = template.body(lead, manager, AI_ORG_NAME);
    const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onSent(lead.id);
    onClose();
  };
  return (
    <div className="dva-emodal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="dva-emodal-panel" onClick={e=>e.stopPropagation()}>
        <div className="dva-emodal-head">
          <div>
            <div className="dva-eyebrow" style={{color:"var(--sky)"}}>Email · {email || "no email on file"}</div>
            <h2 style={{margin:"4px 0 0",fontSize:20,fontWeight:800,fontFamily:"'Figtree',sans-serif"}}>{lead.name}</h2>
            <div style={{fontSize:13,color:"var(--ink-2)",marginTop:2}}>
              <span className="dva-mono">{lead.id}</span> · {lead.program} · {lead.campus}
            </div>
          </div>
          <button className="dva-btn dva-btn-ghost dva-btn-sm" onClick={onClose} aria-label="Close"><X size={14}/></button>
        </div>
        <div className="dva-emodal-body">
          {!email && (
            <div style={{padding:"10px 12px",borderRadius:8,background:"var(--coral-soft)",color:"var(--coral)",fontSize:12.5}}>
              No email on file — templates can't be sent until an email is added to the lead.
            </div>
          )}
          {EMAIL_TEMPLATES.map(t => {
            const subjPreview = t.subject(lead, AI_ORG_NAME);
            return (
              <button key={t.key} className="dva-emodal-option" onClick={()=>send(t)} disabled={!email}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:6}}>
                  <span style={{fontWeight:700,fontSize:14.5}}>{t.title}</span>
                  <ArrowRight size={14} style={{color:"var(--sky)"}}/>
                </div>
                <div style={{fontSize:12,color:"var(--ink-2)",marginBottom:8}}>{t.desc}</div>
                <div style={{fontSize:12.5,color:"var(--ink)",background:"var(--line-2)",padding:"8px 10px",borderRadius:8,lineHeight:1.5}}>
                  <span style={{color:"var(--ink-2)",fontSize:11,letterSpacing:".06em"}}>SUBJECT</span>
                  <div style={{marginTop:2}}>{subjPreview}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <style>{`
        .dva-emodal-overlay{position:fixed;inset:0;z-index:80;background:rgba(12,26,36,.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:24px;}
        .dva-emodal-panel{background:var(--surface);border-radius:18px;width:min(580px,100%);max-height:calc(100vh - 48px);overflow:auto;box-shadow:0 30px 80px -20px rgba(12,26,36,.4);border:1px solid var(--line);}
        .dva-emodal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 22px 14px;border-bottom:1px solid var(--line-2);}
        .dva-emodal-body{padding:14px 18px 20px;display:flex;flex-direction:column;gap:10px;}
        .dva-emodal-option{
          text-align:left;background:transparent;border:1px solid var(--line);border-radius:12px;padding:14px;
          color:inherit;font-family:inherit;cursor:pointer;transition:.15s;
        }
        .dva-emodal-option:hover:not(:disabled){border-color:var(--sky);background:var(--line-2);}
        .dva-emodal-option:disabled{opacity:.45;cursor:not-allowed;}
      `}</style>
    </div>
  );
}

/* ============================== CONTACT HISTORY (mock) ============================== */
const CONTACT_METHODS = {
  ai_call:  { label:"AI call",     I:PhoneCall,     color:"var(--violet)" },
  whatsapp: { label:"WhatsApp",    I:MessageCircle, color:"#25d366" },
  email:    { label:"Email",       I:Mail,          color:"var(--sky)" },
  manual:   { label:"Direct call", I:Phone,         color:"var(--ink-2)" },
};
const CONTACT_OUTCOMES = {
  no_answer: { label:"No answer",         bg:"rgba(255,90,77,.15)", fg:"#fca5a5" },
  voicemail: { label:"Voicemail left",    bg:"rgba(148,163,184,.18)", fg:"#94a3b8" },
  delivered: { label:"Message delivered", bg:"rgba(148,163,184,.18)", fg:"#94a3b8" },
  read:      { label:"Read, no reply",    bg:"rgba(251,191,36,.15)", fg:"#fbbf24" },
  scheduled: { label:"Callback scheduled",bg:"rgba(251,191,36,.15)", fg:"#fbbf24" },
  connected: { label:"Connected",         bg:"rgba(22,163,74,.14)", fg:"#15803d" },
  declined:  { label:"Declined",          bg:"rgba(255,90,77,.15)", fg:"#fca5a5" },
};

function mockContactHistory(lead){
  if (!lead.assignedAt) return [];
  const seed = parseInt(String(lead.id).replace(/\D/g,""),10) || 0;
  const ageHours = (Date.now() - lead.assignedAt) / HOUR;
  const base = Math.min(5, Math.floor(ageHours / 18) + (seed % 2));
  const attempts = lead.firstContactAt ? Math.max(1, base) : Math.max(0, base);
  const methodKeys = ["ai_call","whatsapp","email","manual"];
  const fail = ["no_answer","voicemail","delivered","read","no_answer"];
  const out = [];
  for (let i=0; i<attempts; i++){
    const isLast = i === attempts-1;
    const method = methodKeys[(seed + i*7) % methodKeys.length];
    let outcome;
    if (isLast && lead.firstContactAt) outcome = "connected";
    else if (isLast && !lead.firstContactAt && i >= 2 && seed % 3 === 0) outcome = "scheduled";
    else outcome = fail[(seed + i*3) % fail.length];
    const at = lead.assignedAt + Math.floor((i+1) * 6 * HOUR + (seed % 5) * HOUR);
    out.push({ method, outcome, at });
  }
  return out;
}

function ContactHistoryList({lead}){
  const history = useMemo(()=>mockContactHistory(lead),[lead]);
  if (history.length === 0){
    return (
      <div style={{padding:"14px 14px",color:"var(--ink-2)",fontSize:13,textAlign:"center",border:"1px dashed var(--line)",borderRadius:10}}>
        No contact attempts on record yet.
      </div>
    );
  }
  const counts = history.reduce((a,h)=>{ a[h.method]=(a[h.method]||0)+1; return a; },{});
  return (
    <div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12,fontSize:13,color:"var(--ink-2)"}}>
        <span><b style={{color:"var(--ink)"}}>{history.length}</b> attempt{history.length===1?"":"s"} ·</span>
        {Object.entries(counts).map(([k,n])=>{
          const m=CONTACT_METHODS[k]; const I=m.I;
          return (
            <span key={k} className="badge" style={{background:"var(--line-2)",color:m.color}}>
              <I size={11}/> {n} {m.label.toLowerCase()}{n>1?"s":""}
            </span>
          );
        })}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {history.map((h,i)=>{
          const m=CONTACT_METHODS[h.method]; const o=CONTACT_OUTCOMES[h.outcome]; const I=m.I;
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",border:"1px solid var(--line)",borderRadius:10}}>
              <div style={{width:32,height:32,borderRadius:8,background:"var(--line-2)",display:"flex",alignItems:"center",justifyContent:"center",color:m.color,flexShrink:0}}>
                <I size={15}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13.5,fontWeight:600}}>{m.label}</div>
                <div className="dva-mono" style={{fontSize:11.5,color:"var(--ink-2)"}}>{new Date(h.at).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
              </div>
              <span className="badge" style={{background:o.bg,color:o.fg,flexShrink:0}}>{o.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== LEAD DETAIL MODAL ============================== */
function LeadDetailModal({lead, manager, onClose}){
  if (!lead) return null;
  const homeAddress = [lead.address, lead.location, lead.country].filter(Boolean).join(", ");
  const Row = ({label, value}) => (
    <div style={{display:"flex",flexDirection:"column",gap:2,padding:"9px 0",borderBottom:"1px solid var(--line-2)"}}>
      <span style={{fontSize:10.5,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"var(--ink-2)"}}>{label}</span>
      <span style={{fontSize:14,color:"var(--ink)",wordBreak:"break-word"}}>{value || <span style={{color:"var(--ink-2)"}}>—</span>}</span>
    </div>
  );
  const SectionH = ({children}) => (
    <h3 style={{margin:"0 0 4px",fontSize:11.5,letterSpacing:".12em",textTransform:"uppercase",color:"var(--ink-2)",fontWeight:700}}>{children}</h3>
  );
  return (
    <div className="dva-lmodal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="dva-lmodal-panel" onClick={e=>e.stopPropagation()}>
        <div className="dva-lmodal-head">
          <div>
            <div className="dva-eyebrow" style={{color:"var(--teal)"}}>Lead profile</div>
            <h2 style={{margin:"4px 0 0",fontSize:22,fontWeight:800,fontFamily:"'Figtree',sans-serif"}}>{lead.name}</h2>
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--ink-2)",marginTop:6}}>
              <span className="dva-mono">{lead.id}</span>
              <Badge status={lead.status}/>
            </div>
          </div>
          <button className="dva-btn dva-btn-ghost dva-btn-sm" onClick={onClose} aria-label="Close"><X size={14}/></button>
        </div>
        <div className="dva-lmodal-body">
          <div className="dva-lmodal-grid">
            <div>
              <SectionH>Contact</SectionH>
              <Row label="Phone" value={lead.phone}/>
              <Row label="Email" value={lead.email}/>
              <Row label="Home address" value={homeAddress}/>
            </div>
            <div>
              <SectionH>Application</SectionH>
              <Row label="Programme" value={lead.program}/>
              <Row label="Preferred campus" value={lead.campus}/>
              <Row label="Preferred intake" value={lead.intake}/>
              <Row label="Qualification" value={lead.qualification}/>
            </div>
          </div>
          <div>
            <SectionH>Pipeline</SectionH>
            <div className="dva-lmodal-grid">
              <div>
                <Row label="Source" value={lead.source}/>
                <Row label="Campaign" value={lead.campaign}/>
                <Row label="Lead score" value={<span className="dva-mono" style={{fontWeight:700}}>{lead.score}</span>}/>
              </div>
              <div>
                <Row label="Assigned manager" value={manager?.name || "unassigned"}/>
                <Row label="Created" value={fmtDate(lead.createdAt)}/>
                <Row label="First contact" value={fmtDate(lead.firstContactAt)}/>
              </div>
            </div>
          </div>
          <div>
            <SectionH>Contact history</SectionH>
            <ContactHistoryList lead={lead}/>
          </div>
        </div>
      </div>
      <style>{`
        .dva-lmodal-overlay{position:fixed;inset:0;z-index:80;background:rgba(12,26,36,.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:24px;}
        .dva-lmodal-panel{background:var(--surface);border-radius:18px;width:min(720px,100%);max-height:calc(100vh - 48px);overflow:auto;box-shadow:0 30px 80px -20px rgba(12,26,36,.4);border:1px solid var(--line);}
        .dva-lmodal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:22px 22px 16px;border-bottom:1px solid var(--line-2);}
        .dva-lmodal-body{padding:18px 22px 22px;display:flex;flex-direction:column;gap:20px;}
        .dva-lmodal-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
        @media(max-width:640px){.dva-lmodal-grid{grid-template-columns:1fr;}}
      `}</style>
    </div>
  );
}

/* ============================== THEME / STYLE ============================== */
const Style = () => (
  <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@500;600;700;800&family=Montserrat:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

  .dva {
    /* DVA official brand palette — "Digital Vibes Asia Brand CI 2023"
       Primary: DVA Red #CC1212 (P1788C) · Secondary: Dark Cool Grey #0F181E (P7547C)
       Shade/tint ramps from the CI book; green/amber kept for status semantics only. */
    --ink:#0F181E; --ink-2:#606971; --line:#DCE7F0; --line-2:#E9F2FA;
    --paper:#EFFAFF; --surface:#ffffff;
    --teal:#CC1212; --teal-2:#EA2B20; --teal-soft:#FFEAEC;
    --coral:#F9371E; --coral-soft:#FFEAEC; --amber:#e0950b; --amber-soft:#fdf0d8;
    --violet:#0F181E; --sky:#4D565D;
    color:var(--ink);
    font-family:'Montserrat',system-ui,sans-serif;
    -webkit-font-smoothing:antialiased;
    background:var(--paper);
  }
  .dva *{box-sizing:border-box;}
  .dva-mono{font-family:'JetBrains Mono',monospace;font-feature-settings:"tnum";}
  .dva-display{font-family:'Figtree',sans-serif;letter-spacing:-.02em;line-height:1.06;}
  .dva button{font-family:inherit;cursor:pointer;}
  .dva ::selection{background:var(--teal-2);color:#fff;}

  .dva-shell{min-height:100vh;}
  .dva-wrap{max-width:1180px;margin:0 auto;padding:0 26px;}

  /* nav */
  .dva-nav{position:sticky;top:0;z-index:40;background:rgba(244,249,252,.85);backdrop-filter:blur(14px);border-bottom:1px solid var(--line);}
  .dva-navrow{display:flex;align-items:center;justify-content:space-between;min-height:104px;padding:8px 0;}
  .dva-navlinks{display:flex;align-items:center;gap:6px;}
  .dva-navlink{padding:10px 18px;border-radius:999px;font-weight:600;font-size:14px;color:var(--ink-2);border:none;background:none;transition:.18s;}
  .dva-navlink:hover{color:var(--teal);background:#fff;}
  .dva-navlink.active{color:var(--teal);background:var(--teal-soft);}
  .dva-burger{display:none;border:1px solid var(--line);background:#fff;border-radius:12px;padding:8px;color:var(--ink);}
  .dva-mobile{display:none;flex-direction:column;gap:2px;padding:10px 0 14px;border-top:1px solid var(--line);}
  @media(max-width:880px){
    .dva-navlinks{display:none;} .dva-burger{display:flex;}
    .dva-mobile.open{display:flex;}
  }

  /* logo */
  .dva-logo{display:flex;align-items:center;gap:11px;border:none;background:none;padding:0;}
  .dva-logo-mark{width:38px;height:38px;border-radius:11px;background:linear-gradient(140deg,var(--ink),#2F383F);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px -8px rgba(15,24,30,.55);}
  .dva-logo-name{font-family:'Figtree';font-weight:800;font-size:19px;letter-spacing:-.01em;}
  .dva-logo-name span{color:var(--teal-2);}

  /* buttons — friendly pills */
  .dva-btn{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:12px 22px;font-weight:700;font-size:14px;border:1px solid transparent;transition:.18s;text-decoration:none;}
  .dva-btn-primary{background:var(--teal);color:#fff;}
  .dva-btn-primary:hover{background:#BE0000;transform:translateY(-1px);box-shadow:0 12px 26px -12px rgba(204,18,18,.5);}
  .dva-btn-teal{background:#2F383F;color:#fff;}
  .dva-btn-teal:hover{background:var(--ink);transform:translateY(-1px);}
  .dva-btn-ghost{background:#fff;color:var(--ink);border-color:var(--line);}
  .dva-btn-ghost:hover{border-color:var(--teal-2);color:var(--teal);}
  .dva-btn-sm{padding:8px 14px;font-size:12.5px;border-radius:999px;}
  .dva-btn[disabled]{opacity:.45;cursor:not-allowed;transform:none;}

  /* cards / surfaces — soft, open */
  .dva-card{background:var(--surface);border:1px solid var(--line);border-radius:20px;box-shadow:0 2px 10px -6px rgba(15,24,30,.08);}
  .dva-pad{padding:26px;}
  .dva-eyebrow{font-family:'JetBrains Mono';font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--teal);font-weight:500;}

  /* hero */
  .dva-hero{position:relative;overflow:hidden;border-bottom:1px solid var(--line);background:
     radial-gradient(80% 120% at 85% -10%, rgba(204,18,18,.08), transparent 60%),
     radial-gradient(60% 90% at 5% 0%, rgba(15,24,30,.06), transparent 55%);}
  .dva-hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:48px;align-items:center;padding:78px 0 82px;}
  @media(max-width:880px){.dva-hero-grid{grid-template-columns:1fr;gap:30px;padding:46px 0 52px;}}
  .dva-h1{font-size:60px;font-weight:800;margin:16px 0 0;}
  @media(max-width:880px){.dva-h1{font-size:40px;}}
  .dva-h1 em{font-style:normal;color:var(--teal-2);position:relative;}
  .dva-lead{font-size:18.5px;color:var(--ink-2);max-width:32ch;margin:20px 0 30px;line-height:1.65;}

  /* ekg pulse panel */
  .dva-pulsebox{position:relative;background:linear-gradient(155deg,#0F181E,#2F383F);border-radius:24px;padding:28px;color:#fff;overflow:hidden;box-shadow:0 30px 60px -30px rgba(15,24,30,.7);}
  .dva-pulsebox .grid-lines{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:34px 34px;}
  .ekg{stroke:var(--teal-2);stroke-width:2.4;fill:none;filter:drop-shadow(0 0 6px rgba(249,55,30,.8));stroke-dasharray:1400;stroke-dashoffset:1400;animation:ekg 3.2s linear infinite;}
  @keyframes ekg{to{stroke-dashoffset:0;}}
  .pulse-dot{width:9px;height:9px;border-radius:50%;background:var(--teal-2);box-shadow:0 0 0 0 rgba(249,55,30,.6);animation:pulse 1.8s infinite;}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(249,55,30,.5);}70%{box-shadow:0 0 0 12px rgba(249,55,30,0);}100%{box-shadow:0 0 0 0 rgba(249,55,30,0);}}

  /* persona cards */
  .dva-personas{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
  @media(max-width:880px){.dva-personas{grid-template-columns:1fr;}}
  .dva-persona{position:relative;transition:.22s;overflow:hidden;}
  .dva-persona:hover{transform:translateY(-4px);border-color:var(--teal-2);box-shadow:0 24px 44px -28px rgba(15,24,30,.35);}
  .dva-persona .ribbon{position:absolute;top:0;left:0;right:0;height:4px;}
  .dva-ico{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;}
  .dva-feat{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--ink-2);padding:6px 0;}
  .dva-feat svg{color:var(--teal-2);flex-shrink:0;}

  /* generic ui */
  .dva-stat{display:flex;flex-direction:column;gap:6px;}
  .dva-stat .k{font-family:'JetBrains Mono';font-size:30px;font-weight:700;line-height:1;}
  .dva-stat .l{font-size:12.5px;color:var(--ink-2);font-weight:600;}
  .badge{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:999px;font-family:'JetBrains Mono';letter-spacing:.02em;white-space:nowrap;}
  .dva-table{width:100%;border-collapse:collapse;font-size:13.5px;}
  .dva-table th{text-align:left;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);font-weight:700;padding:13px 16px;border-bottom:1px solid var(--line);position:sticky;top:0;background:#fff;}
  .dva-table td{padding:15px 16px;border-bottom:1px solid var(--line-2);vertical-align:middle;}
  .dva-table tr:hover td{background:var(--paper);}
  .dva-input,.dva-select{font-family:inherit;font-size:13.5px;border:1px solid var(--line);border-radius:12px;padding:10px 14px;background:#fff;color:var(--ink);outline:none;transition:.15s;}
  .dva-input:focus,.dva-select:focus{border-color:var(--teal-2);box-shadow:0 0 0 3px rgba(204,18,18,.12);}
  .dva-drop{border:2px dashed var(--line);border-radius:20px;padding:38px;text-align:center;transition:.2s;background:#fcfdfe;}
  .dva-drop.drag{border-color:var(--teal-2);background:var(--teal-soft);}
  .dva-tab{padding:9px 18px;border-radius:999px;font-weight:700;font-size:13px;border:1px solid var(--line);background:#fff;color:var(--ink-2);transition:.15s;}
  .dva-tab:hover{border-color:var(--teal-2);color:var(--teal);}
  .dva-tab.active{background:var(--teal);color:#fff;border-color:var(--teal);}
  .fade-up{animation:fadeUp .5s both;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
  .dva-progress{height:8px;border-radius:999px;background:var(--line-2);overflow:hidden;}
  .dva-progress > i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--teal),var(--teal-2));}
  `}</style>
);

/* status colors */
const STATUS = {
  New:        { bg:"#DCE7F0", fg:"#2F383F" },
  Assigned:   { bg:"#e6eefb", fg:"#2456c7" },
  Contacted:  { bg:"#efeafd", fg:"#5a45d8" },
  Qualified:  { bg:"#fdf0d8", fg:"#9a6608" },
  "In Progress":{ bg:"#fff0e9", fg:"#c5562a" },
  Converted:  { bg:"#dcf5e6", fg:"#107a43" },
  Closed:     { bg:"#eef1f0", fg:"#5c6b69" },
};
const STAGE_ORDER = ["New","Assigned","Contacted","Qualified","In Progress","Converted","Closed"];

/* ============================== MOCK DATA ============================== */
const FIRST = ["Aisha","Wei Jie","Nurul","Daniel","Priya","Hafiz","Mei Ling","Arjun","Siti","Kumar","Joanne","Faiz","Rachel","Tan","Lim","Devi","Zikri","Yuki","Brandon","Sofia","Ravi","Chloe","Iman","Marcus"];
const LAST = ["Rahman","Tan","Abdullah","Lee","Nair","Ismail","Wong","Menon","Aziz","Raj","Chong","Hassan","Lim","Subramaniam","Yusof","Goh","Krishnan","Ong","Salleh","Pillai"];
const CAMPUS = ["KL City","Subang","Johor Bahru","Penang"];
const PROGRAM = ["Foundation","Diploma in Business","BSc Computer Science","BBA Marketing","Diploma in Design","MBA"];
const CAMPAIGN = ["Meta-OpenDay","Google-Search","TikTok-Promo","Referral-Drive","Webinar-Sept","Email-Nurture"];
const SOURCE = ["Facebook","Google","TikTok","Referral","Webinar","Organic"];
const QUALIFICATION = ["SPM","A-Levels","STPM","Foundation","Diploma","Pre-U"];
const INTAKE = ["May 2026","July 2026","September 2026","November 2026","January 2027","March 2027"];
const LOCATION = ["Selangor","Kuala Lumpur","Johor","Negeri Sembilan","Penang","Perak","Sabah","Sarawak"];
const ADDRESS = [
  "12 Jalan Bukit Bintang",
  "Lot 88, Taman Tun Dr Ismail",
  "Block A-7-2, Pavilion Residences",
  "33 Jalan Sultan Ismail",
  "Unit 5-3A, Mont Kiara Banyan",
  "27 Persiaran Damansara",
  "8 Jalan Ampang Hilir",
  "Lot 14, Bandar Sunway",
  "No. 4 Jalan SS2/24",
  "House 22, Taman Desa",
];
const MANAGERS_SEED = [
  { id:"m1", name:"Sharon Lim",   active:true,  capacity:14 },
  { id:"m2", name:"Aisha Karim",  active:true,  capacity:12 },
  { id:"m3", name:"Daniel Tan",   active:true,  capacity:12 },
  { id:"m4", name:"Priya Nair",   active:true,  capacity:10 },
  { id:"m5", name:"Wei Jie Ong",  active:false, capacity:10 },
];
const pick = (a) => a[Math.floor(Math.random()*a.length)];
const HOUR = 3600*1000;

function seedLeads(managers) {
  const now = Date.now();
  const arr = [];
  for (let i=0;i<58;i++){
    const created = now - Math.floor(Math.random()*60)*24*HOUR - Math.floor(Math.random()*24)*HOUR;
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const r = Math.random();
    let status = "New";
    if (r>0.93) status="New"; else if (r>0.74) status="Assigned"; else if (r>0.58) status="Contacted";
    else if (r>0.44) status="Qualified"; else if (r>0.30) status="In Progress";
    else if (r>0.14) status="Converted"; else status="Closed";
    const lead = {
      id:"L"+(1000+i),
      name,
      email:name.toLowerCase().replace(/[^a-z]/g,".")+"@mail.com",
      phone:"+60 1"+ (Math.floor(Math.random()*9)) +"-"+ (1000000+Math.floor(Math.random()*8999999)),
      campus:pick(CAMPUS), program:pick(PROGRAM), campaign:pick(CAMPAIGN), source:pick(SOURCE),
      qualification:pick(QUALIFICATION), intake:pick(INTAKE), location:pick(LOCATION), country:"Malaysia",
      address:pick(ADDRESS),
      score:Math.floor(45+Math.random()*55),
      status, manager:null, createdAt:created, assignedAt:null, firstContactAt:null,
    };
    if (status!=="New"){
      const m = pick(managers.filter(x=>x.active));
      lead.manager = m.id;
      lead.assignedAt = created + Math.floor(Math.random()*6)*HOUR;
      if (status!=="Assigned") lead.firstContactAt = lead.assignedAt + Math.floor(Math.random()*30)*HOUR;
    }
    arr.push(lead);
  }
  return arr;
}

/* fair-rotation auto assignment — returns {leads, log} */
function autoAssign(leads, managers) {
  const active = managers.filter(m=>m.active);
  const load = {}; active.forEach(m=>load[m.id]=0);
  leads.forEach(l=>{ if(l.manager && !["Converted","Closed"].includes(l.status)) load[l.manager]=(load[l.manager]||0)+1; });
  const log = [];
  const out = leads.map(l=>{
    if (l.status!=="New" || l.manager) return l;
    const eligible = active.filter(m=>load[m.id] < m.capacity).sort((a,b)=>load[a.id]-load[b.id]);
    if (!eligible.length) return l;
    const chosen = eligible[0];
    load[chosen.id]++;
    log.push({ leadId:l.id, lead:l.name, manager:chosen.name, ts:Date.now() });
    return { ...l, manager:chosen.id, status:"Assigned", assignedAt:Date.now() };
  });
  return { leads:out, log };
}

/* SLA helper */
function sla(lead){
  if (lead.status!=="Assigned" || !lead.assignedAt) return null;
  const age = (Date.now()-lead.assignedAt)/HOUR;
  if (age>=24) return { k:"overdue", h:Math.floor(age) };
  if (age>=18) return { k:"urgent", h:Math.floor(24-age) };
  return { k:"ok", h:Math.floor(24-age) };
}
const fmtDate = (t)=> t? new Date(t).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}) : "—";

/* ============================== ATOMS ============================== */
const Logo = ({onClick}) => (
  <button className="dva-logo" onClick={onClick} aria-label="DVAPulse home" style={{padding:0,border:"none",background:"none",cursor:"pointer"}}>
    <img src={logoUrl} alt="DVAPulse" style={{height:88,width:"auto",display:"block"}}/>
  </button>
);
const Badge = ({status}) => {
  const c = STATUS[status]||{bg:"#eee",fg:"#333"};
  return <span className="badge" style={{background:c.bg,color:c.fg}}>{status}</span>;
};
const SlaBadge = ({lead}) => {
  const s = sla(lead);
  if (!s) return <span style={{color:"var(--ink-2)",fontSize:12.5}}>—</span>;
  const map = { overdue:{bg:"var(--coral-soft)",fg:"#c0271a",t:`Overdue ${s.h}h`,I:AlertTriangle},
                urgent:{bg:"var(--amber-soft)",fg:"#9a6608",t:`${s.h}h left`,I:Clock},
                ok:{bg:"#dcf5e6",fg:"#107a43",t:`${s.h}h left`,I:ShieldCheck} };
  const m = map[s.k]; const I=m.I;
  return <span className="badge" style={{background:m.bg,color:m.fg}}><I size={11}/>{m.t}</span>;
};

/* ============================== NAV ============================== */
function Nav({page,go,theme,toggleTheme}){
  const [open,setOpen]=useState(false);
  const items=[["home","Home"],["marketer","Marketer"],["manager","Sales Manager"],["executive","Executive Dashboard"],["guide","User Guide"]];
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const themeLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <nav className="dva-nav">
      <div className="dva-wrap dva-navrow">
        <Logo onClick={()=>{go("home");setOpen(false);}}/>
        <div className="dva-navlinks">
          {items.map(([k,l])=>(
            <button key={k} className={"dva-navlink"+(page===k?" active":"")} onClick={()=>go(k)}>{l}</button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button className="dva-theme-toggle" onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}><ThemeIcon size={16}/></button>
          <button className="dva-burger" onClick={()=>setOpen(o=>!o)} aria-label="Menu">{open?<X size={18}/>:<Menu size={18}/>}</button>
        </div>
      </div>
      <div className={"dva-wrap dva-mobile"+(open?" open":"")}>
        {items.map(([k,l])=>(
          <button key={k} className={"dva-navlink"+(page===k?" active":"")} style={{textAlign:"left"}} onClick={()=>{go(k);setOpen(false);}}>{l}</button>
        ))}
      </div>
    </nav>
  );
}

/* ============================== HOME ============================== */
function Home({go,stats}){
  const personas=[
    { key:"marketer", Icon:Upload, tint:"var(--teal)", title:"Marketer", desc:"Upload leads and hydrate pipelines instantly.",
      feats:["Upload CSV files","Monitor intake quality","Route hot campaigns"], cta:"Enter workspace" },
    { key:"manager", Icon:Users, tint:"var(--violet)", title:"Sales Manager", desc:"Action assigned queues and keep SLAs tight.",
      feats:["View assigned leads","Update lead status","Track performance"], cta:"Enter workspace" },
    { key:"executive", Icon:BarChart3, tint:"var(--sky)", title:"Executive Dashboard", desc:"Audit velocity and conversion in real time.",
      feats:["Real-time statistics","Manager performance","Campaign insights"], cta:"View dashboard" },
  ];
  return (
    <div>
      <section className="dva-hero">
        <div className="dva-wrap dva-hero-grid">
          <div className="fade-up">
            <span className="dva-eyebrow">Lead intake · routing · performance</span>
            <h1 className="dva-h1 dva-display">Drive sales<br/>with <em>DVAPulse</em>.</h1>
            <p className="dva-lead">The one-stop workspace for Marketers, Sales Teams, and Exec Leadership — one heartbeat for your whole funnel.</p>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <button className="dva-btn dva-btn-primary" onClick={()=>go("marketer")}>Upload leads <ArrowRight size={16}/></button>
              <button className="dva-btn dva-btn-ghost" onClick={()=>go("executive")}>See the dashboard</button>
            </div>
            <div style={{display:"flex",gap:30,marginTop:34,flexWrap:"wrap"}}>
              <div className="dva-stat"><span className="k">{stats.total}</span><span className="l">Leads in pipeline</span></div>
              <div className="dva-stat"><span className="k" style={{color:"var(--teal)"}}>{stats.conv}%</span><span className="l">Conversion rate</span></div>
              <div className="dva-stat"><span className="k">{stats.mgrs}</span><span className="l">Active managers</span></div>
            </div>
          </div>
          <div className="dva-pulsebox fade-up" style={{animationDelay:".1s"}}>
            <div className="grid-lines"/>
            <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <span className="pulse-dot"/><span style={{fontFamily:"'JetBrains Mono'",fontSize:12,letterSpacing:".12em",opacity:.85}}>LIVE FUNNEL</span>
              </div>
              <Activity size={18} style={{opacity:.7}}/>
            </div>
            <svg viewBox="0 0 460 120" style={{width:"100%",height:108,position:"relative",marginTop:8}}>
              <polyline className="ekg" points="0,70 60,70 90,70 110,30 130,100 150,55 175,70 250,70 280,70 300,20 320,108 342,60 365,70 460,70"/>
            </svg>
            <div style={{position:"relative",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:10}}>
              {[["Fresh inflow",stats.fresh],["Converted",stats.wins],["Avg score",stats.score]].map(([l,v])=>(
                <div key={l} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,padding:"12px 13px"}}>
                  <div className="dva-mono" style={{fontSize:22,fontWeight:700}}>{v}</div>
                  <div style={{fontSize:11.5,opacity:.7,marginTop:3}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="dva-wrap" style={{padding:"56px 22px 70px"}}>
        <div style={{textAlign:"center",marginBottom:34}}>
          <span className="dva-eyebrow">Three workspaces, one pulse</span>
          <h2 className="dva-display" style={{fontSize:32,fontWeight:800,margin:"10px 0 0"}}>Built for every seat in the funnel</h2>
        </div>
        <div className="dva-personas">
          {personas.map((p,i)=>{
            const I=p.Icon;
            return (
              <div key={p.key} className="dva-card dva-pad dva-persona fade-up" style={{animationDelay:`${i*.08}s`}}>
                <div className="ribbon" style={{background:p.tint}}/>
                <div className="dva-ico" style={{background:"#fff",border:`1.5px solid ${p.tint}`,color:p.tint,marginTop:6}}><I size={22}/></div>
                <h3 className="dva-display" style={{fontSize:21,fontWeight:700,margin:"16px 0 6px"}}>{p.title}</h3>
                <p style={{color:"var(--ink-2)",fontSize:14.5,margin:"0 0 14px",lineHeight:1.5}}>{p.desc}</p>
                <div style={{margin:"0 0 18px"}}>{p.feats.map(f=>(<div key={f} className="dva-feat"><CheckCircle2 size={16}/>{f}</div>))}</div>
                <button className="dva-btn dva-btn-teal dva-btn-sm" onClick={()=>go(p.key)}>{p.cta} <ChevronRight size={15}/></button>
              </div>
            );
          })}
        </div>
      </section>

      <footer style={{borderTop:"1px solid var(--line)",padding:"26px 0"}}>
        <div className="dva-wrap" style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,color:"var(--ink-2)",fontSize:13}}>
          <Logo onClick={()=>go("home")}/>
          <span>Support · support@digitalvibesasia.com</span>
        </div>
      </footer>
    </div>
  );
}

/* ============================== MARKETER ============================== */
const SAMPLE_CSV = `name,email,phone,campus,program,campaign,source,score
Iman Yusof,iman.yusof@mail.com,+60 12-3456789,KL City,Foundation,Meta-OpenDay,Facebook,72
Brandon Goh,brandon.goh@mail.com,+60 16-7788991,Subang,BSc Computer Science,Google-Search,Google,84
Devi Krishnan,devi.k@mail.com,,Penang,Diploma in Business,TikTok-Promo,TikTok,55
Marcus Ong,,+60 11-2003004,Johor Bahru,BBA Marketing,Webinar-Sept,Webinar,67
Sofia Aziz,sofia.aziz@mail.com,+60 13-5566778,KL City,MBA,Referral-Drive,Referral,91
Ravi Pillai,ravi.pillai@mail.com,+60 17-9090909,Subang,Diploma in Design,Email-Nurture,Organic,48`;

function Marketer({insert,go}){
  const [rows,setRows]=useState([]);
  const [drag,setDrag]=useState(false);
  const [done,setDone]=useState(null);
  const fileRef=useRef();

  const parse=(text)=>{
    const res=Papa.parse(text.trim(),{header:true,skipEmptyLines:true});
    const cleaned=res.data.map((r,i)=>{
      const valid = !!(r.name && r.email && r.phone);
      return { ...r, _row:i+1, _valid:valid,
        _issue: !r.name?"missing name": !r.email?"missing email": !r.phone?"missing phone":"ok" };
    });
    setRows(cleaned); setDone(null);
  };
  const onFile=(f)=>{ if(!f) return; const rd=new FileReader(); rd.onload=e=>parse(String(e.target.result)); rd.readAsText(f); };
  const validCount=rows.filter(r=>r._valid).length;

  const commit=()=>{
    const good=rows.filter(r=>r._valid).map(r=>({
      name:r.name, email:r.email, phone:r.phone,
      campus:r.campus||pick(CAMPUS), program:r.program||pick(PROGRAM),
      campaign:r.campaign||pick(CAMPAIGN), source:r.source||pick(SOURCE),
      qualification:r.qualification||pick(QUALIFICATION),
      intake:r.intake||pick(INTAKE),
      location:r.location||pick(LOCATION),
      country:r.country||"Malaysia",
      address:r.address||pick(ADDRESS),
      score:Number(r.score)||Math.floor(50+Math.random()*45),
    }));
    const log=insert(good);
    setDone({ n:good.length, log }); setRows([]);
  };

  return (
    <div className="dva-wrap" style={{padding:"34px 22px 70px"}}>
      <span className="dva-eyebrow">Marketer workspace</span>
      <h1 className="dva-display" style={{fontSize:30,fontWeight:800,margin:"8px 0 4px"}}>Upload &amp; stage leads</h1>
      <p style={{color:"var(--ink-2)",margin:"0 0 24px"}}>Drag a CSV, preview rows, validate intake quality, then batch-insert into staging — auto-assignment routes new leads instantly.</p>

      {done ? (
        <div className="dva-card dva-pad fade-up" style={{borderColor:"var(--teal-2)"}}>
          <div className="dva-ico" style={{background:"var(--teal-soft)",color:"var(--teal)"}}><CheckCircle2 size={24}/></div>
          <h3 className="dva-display" style={{fontSize:22,fontWeight:700,margin:"14px 0 4px"}}>{done.n} leads inserted into staging</h3>
          <p style={{color:"var(--ink-2)",margin:"0 0 14px"}}>The auto-assignment engine routed <b>{done.log.length}</b> new lead{done.log.length!==1?"s":""} to available managers using fair rotation.</p>
          {done.log.length>0 && (
            <div className="dva-card" style={{borderRadius:12,overflow:"hidden",marginBottom:16}}>
              <table className="dva-table">
                <thead><tr><th>Lead</th><th>Routed to</th><th>Status</th></tr></thead>
                <tbody>{done.log.map(x=>(<tr key={x.leadId}><td style={{fontWeight:600}}>{x.lead}</td><td>{x.manager}</td><td><Badge status="Assigned"/></td></tr>))}</tbody>
              </table>
            </div>
          )}
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button className="dva-btn dva-btn-teal dva-btn-sm" onClick={()=>go("manager")}>Open Sales Manager queue <ArrowRight size={15}/></button>
            <button className="dva-btn dva-btn-ghost dva-btn-sm" onClick={()=>go("executive")}>View Executive dashboard</button>
            <button className="dva-btn dva-btn-ghost dva-btn-sm" onClick={()=>setDone(null)}>Upload another batch</button>
          </div>
        </div>
      ) : rows.length===0 ? (
        <div className={"dva-drop"+(drag?" drag":"")}
          onDragOver={e=>{e.preventDefault();setDrag(true);}}
          onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);onFile(e.dataTransfer.files[0]);}}>
          <div className="dva-ico" style={{background:"var(--teal-soft)",color:"var(--teal)",margin:"0 auto 14px"}}><Upload size={24}/></div>
          <h3 className="dva-display" style={{fontSize:19,fontWeight:700,margin:"0 0 4px"}}>Drop your CSV here</h3>
          <p style={{color:"var(--ink-2)",fontSize:14,margin:"0 0 16px"}}>Columns: name, email, phone, campus, program, campaign, source, score</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{display:"none"}} onChange={e=>onFile(e.target.files[0])}/>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <button className="dva-btn dva-btn-primary dva-btn-sm" onClick={()=>fileRef.current.click()}><FileText size={15}/> Choose file</button>
            <button className="dva-btn dva-btn-ghost dva-btn-sm" onClick={()=>parse(SAMPLE_CSV)}><Zap size={15}/> Load sample batch</button>
          </div>
        </div>
      ) : (
        <div className="dva-card dva-pad fade-up">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,marginBottom:14}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <span className="badge" style={{background:"#dcf5e6",color:"#107a43"}}>{validCount} valid</span>
              {rows.length-validCount>0 && <span className="badge" style={{background:"var(--coral-soft)",color:"#c0271a"}}>{rows.length-validCount} flagged</span>}
              <span style={{color:"var(--ink-2)",fontSize:13}}>{rows.length} rows previewed</span>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="dva-btn dva-btn-ghost dva-btn-sm" onClick={()=>setRows([])}>Cancel</button>
              <button className="dva-btn dva-btn-teal dva-btn-sm" disabled={!validCount} onClick={commit}>Insert {validCount} into staging <ArrowRight size={15}/></button>
            </div>
          </div>
          <div style={{overflowX:"auto",maxHeight:380,overflowY:"auto",borderRadius:12,border:"1px solid var(--line)"}}>
            <table className="dva-table">
              <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Program</th><th>Source</th><th>Check</th></tr></thead>
              <tbody>{rows.map(r=>(
                <tr key={r._row} style={!r._valid?{background:"var(--coral-soft)"}:{}}>
                  <td className="dva-mono" style={{color:"var(--ink-2)"}}>{r._row}</td>
                  <td style={{fontWeight:600}}>{r.name||<i style={{color:"var(--coral)"}}>—</i>}</td>
                  <td>{r.email||<i style={{color:"var(--coral)"}}>—</i>}</td>
                  <td className="dva-mono" style={{fontSize:12.5}}>{r.phone||<i style={{color:"var(--coral)"}}>—</i>}</td>
                  <td>{r.program}</td><td>{r.source}</td>
                  <td>{r._valid? <span className="badge" style={{background:"#dcf5e6",color:"#107a43"}}><CheckCircle2 size={11}/>ok</span>
                       : <span className="badge" style={{background:"var(--coral-soft)",color:"#c0271a"}}><AlertTriangle size={11}/>{r._issue}</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== SALES MANAGER ============================== */
function Manager({leads,managers,setStatus,markContact,initialMid,onSignOut}){
  const active=managers.filter(m=>m.active);
  const [mid,setMid]=useState(initialMid && active.some(m=>m.id===initialMid) ? initialMid : active[0].id);
  const [waLeadId,setWaLeadId]=useState(null);
  const [emailLeadId,setEmailLeadId]=useState(null);
  const [detailLeadId,setDetailLeadId]=useState(null);
  const [f,setF]=useState({status:"",program:"",sla:""});
  const [q,setQ]=useState("");
  const me=managers.find(m=>m.id===mid);
  const waLead=waLeadId? leads.find(l=>l.id===waLeadId): null;
  const emailLead=emailLeadId? leads.find(l=>l.id===emailLeadId): null;
  const detailLead=detailLeadId? leads.find(l=>l.id===detailLeadId): null;
  const detailMgr=detailLead? managers.find(m=>m.id===detailLead.manager): null;
  const callWithAi=(l)=>{ startAiCall(l,me); markContact(l.id); };
  const mine=leads.filter(l=>l.manager===mid);
  const open=mine.filter(l=>!["Converted","Closed"].includes(l.status));
  const overdue=open.filter(l=>{const s=sla(l);return s&&s.k==="overdue";}).length;
  const conv=mine.length? Math.round(mine.filter(l=>l.status==="Converted").length/mine.length*100):0;

  const filtered=useMemo(()=>mine.filter(l=>{
    if (f.status && l.status !== f.status) return false;
    if (f.program && l.program !== f.program) return false;
    if (f.sla){
      const sk = l.firstContactAt ? "contacted" : (sla(l)?.k || "none");
      if (sk !== f.sla) return false;
    }
    if (q){
      const t = q.toLowerCase();
      if (!(l.name.toLowerCase().includes(t) || l.email.toLowerCase().includes(t) || l.phone.includes(t))) return false;
    }
    return true;
  }),[mine,f,q]);
  const hasFilters = !!(f.status || f.program || f.sla || q);
  const clearFilters = ()=>{ setF({status:"",program:"",sla:""}); setQ(""); };

  return (
    <div className="dva-wrap" style={{padding:"34px 22px 70px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:14,marginBottom:22}}>
        <div>
          <span className="dva-eyebrow">Sales Manager workspace</span>
          <h1 className="dva-display" style={{fontSize:30,fontWeight:800,margin:"8px 0 0"}}>Your assigned queue</h1>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:"var(--ink-2)",fontWeight:600}}>Signed in as</span>
          <select className="dva-select" value={mid} onChange={e=>setMid(e.target.value)} style={{fontWeight:700}}>
            {active.map(m=>(<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
          {onSignOut && <button className="dva-btn dva-btn-ghost dva-btn-sm" onClick={onSignOut}>Sign out</button>}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}} className="mgr-stats">
        {[
          {l:"Open leads",v:open.length,I:Inbox,c:"var(--teal)"},
          {l:"Overdue SLA",v:overdue,I:AlertTriangle,c:"var(--coral)"},
          {l:"Converted",v:mine.filter(l=>l.status==="Converted").length,I:Target,c:"var(--teal)"},
          {l:"Conversion",v:conv+"%",I:Gauge,c:"var(--violet)"},
        ].map(s=>{const I=s.I;return(
          <div key={s.l} className="dva-card dva-pad" style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span className="dva-mono" style={{fontSize:26,fontWeight:700,color:s.c}}>{s.v}</span>
              <I size={18} style={{color:s.c,opacity:.7}}/>
            </div>
            <div style={{fontSize:12.5,color:"var(--ink-2)",fontWeight:600,marginTop:4}}>{s.l}</div>
          </div>
        );})}
      </div>

      <div className="dva-card" style={{overflow:"hidden"}}>
        <div className="dva-pad" style={{padding:"14px 18px",borderBottom:"1px solid var(--line)",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <Users size={16} style={{color:"var(--teal)"}}/>
          <b>{me.name}</b>
          <span style={{color:"var(--ink-2)",fontSize:13}}>· {mine.length} total · capacity {me.capacity}</span>
          {hasFilters && <span style={{color:"var(--ink-2)",fontSize:13}}>· showing {filtered.length}</span>}
        </div>
        <div style={{padding:"12px 18px",borderBottom:"1px solid var(--line)",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <Filter size={15} style={{color:"var(--ink-2)"}}/>
          <div style={{position:"relative",flex:"1 1 220px",minWidth:160}}>
            <Search size={13} style={{position:"absolute",left:11,top:10,color:"var(--ink-2)"}}/>
            <input className="dva-input" placeholder="Search name, email, phone…" value={q} onChange={e=>setQ(e.target.value)} style={{paddingLeft:30,width:"100%",fontSize:12.5,padding:"7px 9px 7px 30px"}}/>
          </div>
          <select className="dva-select" value={f.status} onChange={e=>setF(s=>({...s,status:e.target.value}))} style={{fontSize:12.5}}>
            <option value="">All statuses</option>
            {STAGE_ORDER.map(s=>(<option key={s} value={s}>{s}</option>))}
          </select>
          <select className="dva-select" value={f.sla} onChange={e=>setF(s=>({...s,sla:e.target.value}))} style={{fontSize:12.5}}>
            <option value="">All SLA</option>
            <option value="overdue">Overdue</option>
            <option value="urgent">Urgent (≥18h)</option>
            <option value="ok">On track</option>
            <option value="contacted">Contacted</option>
          </select>
          <select className="dva-select" value={f.program} onChange={e=>setF(s=>({...s,program:e.target.value}))} style={{fontSize:12.5}}>
            <option value="">All programs</option>
            {PROGRAM.map(p=>(<option key={p} value={p}>{p}</option>))}
          </select>
          {hasFilters &&
            <button className="dva-btn dva-btn-ghost dva-btn-sm" onClick={clearFilters} style={{padding:"6px 10px"}}><RefreshCw size={12}/>Clear</button>}
        </div>
        <div style={{overflowX:"auto",maxHeight:520,overflowY:"auto"}}>
          <table className="dva-table">
            <thead><tr><th>Lead</th><th>Program</th><th>Score</th><th>Status</th><th>First-contact SLA</th><th style={{textAlign:"center"}}>Action</th></tr></thead>
            <tbody>
              {filtered.sort((a,b)=>STAGE_ORDER.indexOf(a.status)-STAGE_ORDER.indexOf(b.status)).map(l=>{
                const idx=STAGE_ORDER.indexOf(l.status);
                const next=STAGE_ORDER[Math.min(idx+1,STAGE_ORDER.length-1)];
                const closed=["Converted","Closed"].includes(l.status);
                return (
                  <tr key={l.id}>
                    <td><button className="dva-leadname-btn" onClick={()=>setDetailLeadId(l.id)}>{l.name}</button><div className="dva-mono" style={{fontSize:11,color:"var(--ink-2)"}}>{l.id} · {l.campus}</div></td>
                    <td>{l.program}</td>
                    <td><span className="dva-mono" style={{fontWeight:700,color:l.score>=80?"var(--teal)":l.score<55?"var(--coral)":"var(--ink)"}}>{l.score}</span></td>
                    <td>
                      <select className="dva-select" value={l.status} onChange={e=>setStatus(l.id,e.target.value)} style={{padding:"5px 8px",fontSize:12.5}}>
                        {STAGE_ORDER.map(s=>(<option key={s} value={s}>{s}</option>))}
                      </select>
                    </td>
                    <td>{l.firstContactAt? <span className="badge" style={{background:"#dcf5e6",color:"#107a43"}}><CheckCircle2 size={11}/>contacted</span> : <SlaBadge lead={l}/>}</td>
                    <td style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {!closed &&
                        <button className="dva-btn dva-btn-sm" onClick={()=>callWithAi(l)} style={{padding:"5px 9px",background:"var(--violet)",color:"#fff",border:"none"}}><PhoneCall size={13}/>Call with AI</button>}
                      {!closed &&
                        <button className="dva-btn dva-btn-sm" onClick={()=>setWaLeadId(l.id)} style={{padding:"5px 9px",background:"#25d366",color:"#fff",border:"none"}}><MessageCircle size={13}/>WhatsApp</button>}
                      {!closed &&
                        <button className="dva-btn dva-btn-sm" onClick={()=>setEmailLeadId(l.id)} style={{padding:"5px 9px",background:"var(--sky)",color:"#fff",border:"none"}}><Mail size={13}/>Email</button>}
                      {l.status==="Assigned" && !l.firstContactAt &&
                        <button className="dva-btn dva-btn-ghost dva-btn-sm" onClick={()=>markContact(l.id)} style={{padding:"5px 9px"}}><Clock size={13}/>Log contact</button>}
                      {!closed &&
                        <button className="dva-btn dva-btn-teal dva-btn-sm" onClick={()=>setStatus(l.id,next)} style={{padding:"5px 9px"}}>→ {next}</button>}
                    </td>
                  </tr>
                );
              })}
              {mine.length===0 && <tr><td colSpan={6} style={{textAlign:"center",padding:30,color:"var(--ink-2)"}}>No leads assigned yet.</td></tr>}
              {mine.length>0 && filtered.length===0 && <tr><td colSpan={6} style={{textAlign:"center",padding:30,color:"var(--ink-2)"}}>No leads match the current filters. <button className="dva-btn dva-btn-ghost dva-btn-sm" onClick={clearFilters} style={{marginLeft:8,padding:"4px 9px"}}>Clear filters</button></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@media(max-width:760px){.mgr-stats{grid-template-columns:repeat(2,1fr)!important;}}`}</style>
      <WhatsAppModal lead={waLead} manager={me} onClose={()=>setWaLeadId(null)} onSent={(id)=>markContact(id)}/>
      <EmailModal lead={emailLead} manager={me} onClose={()=>setEmailLeadId(null)} onSent={(id)=>markContact(id)}/>
      <LeadDetailModal lead={detailLead} manager={detailMgr} onClose={()=>setDetailLeadId(null)}/>
    </div>
  );
}

/* ============================== EXECUTIVE DASHBOARD ============================== */
const EXEC_TILES = [
  { key:"daily",   label:"Sales Manager Daily Performance" },
  { key:"overall", label:"Overall Sales Manager Performance View" },
  { key:"sla",     label:"24-Hour First Contact KPI View" },
  { key:"vox",     label:"Vox Conversation View" },
];

function Executive({leads, managers, reassign, onSignOut}){
  const [view, setView] = useState("hub");
  const onBack = () => setView("hub");
  return (
    <div className="dva-wrap" style={{padding:"34px 22px 70px"}}>
      {onSignOut && (
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
          <button className="dva-btn dva-btn-ghost dva-btn-sm" onClick={onSignOut}>Sign out</button>
        </div>
      )}
      {view === "hub"     && <ExecHub          leads={leads} onOpen={setView}/>}
      {view === "daily"   && <DailyPerfView    leads={leads} managers={managers} onBack={onBack}/>}
      {view === "overall" && <OverallPerfView  leads={leads} managers={managers} reassign={reassign} onBack={onBack}/>}
      {view === "sla"     && <SlaView          leads={leads} managers={managers} onBack={onBack}/>}
      {view === "vox"     && <VoxView          leads={leads} managers={managers} onBack={onBack}/>}
    </div>
  );
}

function ExecHub({leads, onOpen}){
  const sourceData = useMemo(
    () => SOURCE.map(s => ({ name:s, value: leads.filter(l=>l.source===s).length })).filter(x=>x.value>0),
    [leads]
  );
  const stageData = useMemo(
    () => STAGE_ORDER.map(s => ({ name:s, value: leads.filter(l=>l.status===s).length })).filter(x=>x.value>0),
    [leads]
  );
  const stageColors = stageData.map(d => STATUS[d.name]?.fg || "#6d5cf0");
  const tooltipStyle = { background:"#0F181E", border:"1px solid #2F383F", borderRadius:8, fontSize:12, color:"#f1f5f9" };

  return (
    <>
      <div style={{marginBottom:28}}>
        <span className="dva-eyebrow">DVAPULSE INTELLIGENCE</span>
        <h1 className="dva-display" style={{fontSize:34,fontWeight:800,margin:"10px 0 6px"}}>Sales Pipeline Cockpit View</h1>
        <p style={{color:"var(--ink-2)",margin:0,fontSize:15}}>Monitor lead flow and conversion trends</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:18,marginBottom:22}} className="exec-hub-tiles">
        {EXEC_TILES.map(t => (
          <button key={t.key} className="exec-hub-tile" onClick={()=>onOpen(t.key)}>
            <span className="exec-hub-tile-eyebrow">{t.label}</span>
            <span className="exec-hub-tile-cta">View</span>
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:18}} className="exec-hub-charts">
        <div className="dva-card dva-pad">
          <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:600,color:"var(--ink-2)"}}>Lead Source Breakdown</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sourceData} margin={{top:4,right:8,left:-12,bottom:0}}>
              <XAxis dataKey="name" tick={{fontSize:11,fill:"#94a3b8"}}/>
              <YAxis tick={{fontSize:11,fill:"#94a3b8"}} allowDecimals={false}/>
              <Tooltip cursor={{fill:"rgba(204,18,18,.06)"}} contentStyle={tooltipStyle}/>
              <Bar dataKey="value" radius={[6,6,0,0]} fill="#CC1212"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="dva-card dva-pad">
          <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:600,color:"var(--ink-2)"}}>Sales Stage Breakdown</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stageData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={2}>
                {stageData.map((_,i)=>(<Cell key={i} fill={stageColors[i]}/>))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle}/>
              <Legend wrapperStyle={{fontSize:11,color:"#94a3b8"}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function SubHeader({title, onBack, right}){
  return (
    <div style={{marginBottom:22}}>
      <button className="dva-btn dva-btn-ghost dva-btn-sm" onClick={onBack} style={{marginBottom:14}}>← Back to cockpit</button>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:12}}>
        <div>
          <span className="dva-eyebrow">DVAPULSE INTELLIGENCE</span>
          <h1 className="dva-display" style={{fontSize:30,fontWeight:800,margin:"10px 0 0"}}>{title}</h1>
        </div>
        {right}
      </div>
    </div>
  );
}

function KpiCard({label, value, sub, I, color="var(--ink)"}){
  return (
    <div className="dva-card dva-pad" style={{padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <span className="dva-mono" style={{fontSize:28,fontWeight:700,color,lineHeight:1}}>{value}</span>
        {I && <I size={19} style={{color,opacity:.6}}/>}
      </div>
      <div style={{fontSize:12.5,color:"var(--ink-2)",fontWeight:600,marginTop:8}}>
        {label}{sub && <span style={{color:"var(--teal-2)"}}> · {sub}</span>}
      </div>
    </div>
  );
}

/* ---------- Phase 2: Daily per-manager performance ---------- */
function DeltaBadge({current, prev}){
  if (current === 0 && prev === 0) return <span style={{color:"var(--ink-2)",fontSize:12}}>—</span>;
  const diff = current - prev;
  if (diff === 0) return (
    <span style={{display:"inline-flex",alignItems:"center",gap:3,color:"var(--ink-2)",fontWeight:700,fontSize:12.5}}>
      <ArrowRightLeft size={11}/> 0
    </span>
  );
  const up = diff > 0;
  const I = up ? ArrowUpRight : ArrowDownRight;
  const color = up ? "#16a34a" : "var(--coral)";
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:3,color,fontWeight:700,fontSize:12.5}}>
      <I size={11}/> {up ? "+" : ""}{diff}
    </span>
  );
}

function DailyPerfView({leads, managers, onBack}){
  const [compareKey, setCompareKey] = useState("yesterday");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const now = Date.now();
  const todayWindow = [now - 24*HOUR, now];

  const compareWindow = useMemo(()=>{
    if (compareKey === "yesterday") return [now - 48*HOUR, now - 24*HOUR];
    if (compareKey === "week")      return [now - 192*HOUR, now - 168*HOUR];
    if (compareKey === "month")     return [now - 744*HOUR, now - 720*HOUR];
    if (compareKey === "custom" && customStart && customEnd){
      const s = new Date(customStart + "T00:00:00").getTime();
      const e = new Date(customEnd + "T23:59:59").getTime();
      return [s, e];
    }
    return null;
  }, [compareKey, customStart, customEnd, now]);

  const inWindow = (win) => leads.filter(l => l.assignedAt && l.assignedAt >= win[0] && l.assignedAt < win[1]);
  const today   = useMemo(()=>inWindow(todayWindow), [leads]);
  const compare = useMemo(()=>compareWindow ? inWindow(compareWindow) : [], [leads, compareWindow]);

  const summarize = (pool) => ({
    assigned:  pool.length,
    contacted: pool.filter(l => l.firstContactAt).length,
    converted: pool.filter(l => l.status === "Converted").length,
  });
  const t = summarize(today);
  const c = summarize(compare);

  const perf = managers.map(m => {
    const tp = today.filter(l => l.manager === m.id);
    const cp = compare.filter(l => l.manager === m.id);
    const w = tp.filter(l => l.status === "Converted").length;
    return { ...m,
      assigned: tp.length, prevAssigned: cp.length,
      contacted: tp.filter(l => l.firstContactAt).length,
      open: tp.filter(l => !["Converted","Closed"].includes(l.status)).length,
      won: w,
      conv: tp.length ? Math.round(w/tp.length*100) : 0,
    };
  }).sort((a,b)=> b.assigned - a.assigned);

  const todayDate = new Date().toLocaleDateString("en-GB",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  const cmpLabelMap = { yesterday:"yesterday", week:"last week", month:"last month",
    custom: (customStart && customEnd) ? `${customStart} → ${customEnd}` : "custom range" };
  const cmpLabel = cmpLabelMap[compareKey];
  const cmpReady = compareKey !== "custom" || (customStart && customEnd);

  return (
    <>
      <SubHeader
        title="Sales Manager Daily Performance"
        onBack={onBack}
        right={
          <div style={{display:"flex",alignItems:"center",gap:8,color:"var(--ink-2)"}}>
            <CalendarDays size={16}/>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
              <span style={{fontSize:13,color:"var(--ink)",fontWeight:600}}>{todayDate}</span>
              <span style={{fontSize:11,letterSpacing:".05em",textTransform:"uppercase"}}>Last 24 hours</span>
            </div>
          </div>
        }
      />

      {/* comparison selector */}
      <div className="dva-card dva-pad" style={{padding:14,marginBottom:18,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:13,color:"var(--ink-2)",fontWeight:600}}>Compare to:</span>
        {[["yesterday","Yesterday"],["week","Last week"],["month","Last month"],["custom","Custom range"]].map(([k,l])=>(
          <button key={k} className={"dva-tab"+(compareKey===k?" active":"")} onClick={()=>setCompareKey(k)}>{l}</button>
        ))}
        {compareKey === "custom" && (
          <>
            <input type="date" className="dva-input" value={customStart} onChange={e=>setCustomStart(e.target.value)} style={{fontSize:13,padding:"6px 10px"}}/>
            <span style={{color:"var(--ink-2)"}}>→</span>
            <input type="date" className="dva-input" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} style={{fontSize:13,padding:"6px 10px"}}/>
          </>
        )}
      </div>

      {/* KPI cards with deltas */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:18}} className="exec-stats">
        {[
          { label:"Assigned (24h)",       cur:t.assigned,  prev:c.assigned,  I:Inbox,        color:"var(--ink)" },
          { label:"First contact logged", cur:t.contacted, prev:c.contacted, I:CheckCircle2, color:"var(--teal-2)" },
          { label:"Conversions (24h)",    cur:t.converted, prev:c.converted, I:Target,       color:"var(--teal-2)" },
        ].map(k => {
          const I = k.I;
          return (
            <div key={k.label} className="dva-card dva-pad" style={{padding:18}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span className="dva-mono" style={{fontSize:28,fontWeight:700,color:k.color,lineHeight:1}}>{k.cur}</span>
                <I size={19} style={{color:k.color,opacity:.6}}/>
              </div>
              <div style={{fontSize:12.5,color:"var(--ink-2)",fontWeight:600,marginTop:8}}>{k.label}</div>
              <div style={{fontSize:11.5,color:"var(--ink-2)",marginTop:8,display:"flex",alignItems:"center",gap:6}}>
                {cmpReady
                  ? <><DeltaBadge current={k.cur} prev={k.prev}/><span>vs {cmpLabel} <span className="dva-mono" style={{opacity:.7}}>({k.prev})</span></span></>
                  : <span style={{fontStyle:"italic"}}>Pick a date range to compare</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* per-manager table */}
      <div className="dva-card" style={{overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--line)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Today's per-manager performance</h3>
          {cmpReady && <span style={{fontSize:12,color:"var(--ink-2)"}}>Δ vs {cmpLabel}</span>}
        </div>
        <table className="dva-table">
          <thead><tr><th>Manager</th><th>Assigned</th><th>vs {cmpLabel}</th><th>Contacted</th><th>Open</th><th>Won</th><th>Conversion</th></tr></thead>
          <tbody>{perf.map(m => (
            <tr key={m.id}>
              <td style={{fontWeight:600}}>{m.name}{!m.active && <span style={{color:"var(--ink-2)",fontWeight:500,marginLeft:6,fontSize:12}}>· inactive</span>}</td>
              <td className="dva-mono">{m.assigned}</td>
              <td>{cmpReady ? <DeltaBadge current={m.assigned} prev={m.prevAssigned}/> : <span style={{color:"var(--ink-2)"}}>—</span>}</td>
              <td className="dva-mono">{m.contacted}</td>
              <td className="dva-mono">{m.open}</td>
              <td className="dva-mono">{m.won}</td>
              <td style={{minWidth:150}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div className="dva-progress" style={{flex:1}}><i style={{width:Math.min(m.conv,100)+"%"}}/></div>
                  <span className="dva-mono" style={{fontWeight:700,fontSize:12.5}}>{m.conv}%</span>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- Phase 3: Overall per-manager performance + filters + bulk assign + lead table ---------- */
function OverallPerfView({leads, managers, reassign, onBack}){
  const [f,setF]=useState({status:"",campus:"",program:"",campaign:""});
  const [q,setQ]=useState("");
  const [sel,setSel]=useState({});
  const [bulkMgr,setBulkMgr]=useState(managers[0].id);
  const [detailLeadId,setDetailLeadId]=useState(null);
  const detailLead=detailLeadId? leads.find(l=>l.id===detailLeadId): null;
  const detailMgr=detailLead? managers.find(m=>m.id===detailLead.manager): null;

  const filtered=useMemo(()=>leads.filter(l=>{
    if(f.status&&l.status!==f.status)return false;
    if(f.campus&&l.campus!==f.campus)return false;
    if(f.program&&l.program!==f.program)return false;
    if(f.campaign&&l.campaign!==f.campaign)return false;
    if(q){const s=q.toLowerCase();if(!(l.name.toLowerCase().includes(s)||l.email.toLowerCase().includes(s)||l.phone.includes(s)))return false;}
    return true;
  }),[leads,f,q]);

  const perf=managers.map(m=>{
    const pool=leads.filter(l=>l.manager===m.id);
    const w=pool.filter(l=>l.status==="Converted").length;
    return { ...m, total:pool.length, won:w, conv:pool.length?Math.round(w/pool.length*100):0,
             open:pool.filter(l=>!["Converted","Closed"].includes(l.status)).length };
  }).sort((a,b)=>b.conv-a.conv);

  const selIds=Object.keys(sel).filter(k=>sel[k]);
  const exportCsv=()=>{
    const cols=["id","name","email","phone","campus","program","campaign","source","score","status","manager"];
    const body=filtered.map(l=>cols.map(c=>{
      let v=l[c]; if(c==="manager") v=managers.find(m=>m.id===l.manager)?.name||""; return `"${String(v??"").replace(/"/g,'""')}"`;
    }).join(","));
    const csv=[cols.join(","),...body].join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    const a=document.createElement("a"); a.href=url; a.download="dvapulse-export.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const Sel=({id})=> <input type="checkbox" checked={!!sel[id]} onChange={e=>setSel(s=>({...s,[id]:e.target.checked}))}/>;

  return (
    <>
      <SubHeader title="Overall Sales Manager Performance" onBack={onBack}
        right={
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,color:"var(--ink-2)"}}>
              <CalendarDays size={16}/>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
                <span style={{fontSize:13,color:"var(--ink)",fontWeight:600}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</span>
                <span style={{fontSize:11,letterSpacing:".05em",textTransform:"uppercase"}}>All-time totals</span>
              </div>
            </div>
            <button className="dva-btn dva-btn-ghost dva-btn-sm" onClick={exportCsv}><Download size={15}/> Export ({filtered.length})</button>
          </div>
        }/>
      <div className="dva-card dva-pad" style={{padding:14,marginBottom:18,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <Filter size={16} style={{color:"var(--ink-2)"}}/>
        <div style={{position:"relative",flex:"1 1 200px"}}>
          <Search size={14} style={{position:"absolute",left:11,top:11,color:"var(--ink-2)"}}/>
          <input className="dva-input" placeholder="Search name, email, phone…" value={q} onChange={e=>setQ(e.target.value)} style={{paddingLeft:32,width:"100%"}}/>
        </div>
        {[["status",STAGE_ORDER,"All statuses"],["campus",CAMPUS,"All campuses"],["program",PROGRAM,"All programs"],["campaign",CAMPAIGN,"All campaigns"]].map(([key,opts,ph])=>(
          <select key={key} className="dva-select" value={f[key]} onChange={e=>setF(s=>({...s,[key]:e.target.value}))}>
            <option value="">{ph}</option>{opts.map(o=>(<option key={o} value={o}>{o}</option>))}
          </select>
        ))}
        {(f.status||f.campus||f.program||f.campaign||q) &&
          <button className="dva-btn dva-btn-ghost dva-btn-sm" onClick={()=>{setF({status:"",campus:"",program:"",campaign:""});setQ("");}}><RefreshCw size={13}/>Clear</button>}
      </div>
      <div className="dva-card" style={{overflow:"hidden",marginBottom:18}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--line)"}}>
          <h3 style={{margin:0,fontSize:15,fontWeight:700}}>All-time per-manager performance</h3>
        </div>
        <table className="dva-table">
          <thead><tr><th>Manager</th><th>Status</th><th>Assigned</th><th>Open</th><th>Won</th><th>Conversion</th></tr></thead>
          <tbody>{perf.map(m=>(
            <tr key={m.id}>
              <td style={{fontWeight:600}}>{m.name}</td>
              <td>{m.active
                ? <span className="badge" style={{background:"rgba(34,197,94,.18)",color:"#86efac"}}>active</span>
                : <span className="badge" style={{background:"rgba(148,163,184,.15)",color:"#94a3b8"}}>inactive</span>}</td>
              <td className="dva-mono">{m.total}</td><td className="dva-mono">{m.open}</td><td className="dva-mono">{m.won}</td>
              <td style={{minWidth:150}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div className="dva-progress" style={{flex:1}}><i style={{width:Math.min(m.conv,100)+"%"}}/></div>
                  <span className="dva-mono" style={{fontWeight:700,fontSize:12.5}}>{m.conv}%</span>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="dva-card" style={{overflow:"hidden"}}>
        <div style={{padding:"12px 18px",borderBottom:"1px solid var(--line)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Leads <span style={{color:"var(--ink-2)",fontWeight:500}}>({filtered.length})</span></h3>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:13,color:"var(--ink-2)"}}>{selIds.length} selected</span>
            <select className="dva-select" value={bulkMgr} onChange={e=>setBulkMgr(e.target.value)} style={{padding:"6px 9px",fontSize:12.5}}>
              {managers.map(m=>(<option key={m.id} value={m.id}>{m.name}{!m.active?" (inactive)":""}</option>))}
            </select>
            <button className="dva-btn dva-btn-teal dva-btn-sm" disabled={!selIds.length} onClick={()=>{reassign(selIds,bulkMgr);setSel({});}}>Assign selected</button>
          </div>
        </div>
        <div style={{overflowX:"auto",maxHeight:460,overflowY:"auto"}}>
          <table className="dva-table">
            <thead><tr><th style={{width:30}}></th><th>Lead</th><th>Campaign</th><th>Source</th><th>Score</th><th>Status</th><th>Manager</th><th>Created</th></tr></thead>
            <tbody>{filtered.slice(0,120).map(l=>(
              <tr key={l.id}>
                <td><Sel id={l.id}/></td>
                <td><button className="dva-leadname-btn" onClick={()=>setDetailLeadId(l.id)}>{l.name}</button><div className="dva-mono" style={{fontSize:11,color:"var(--ink-2)"}}>{l.email}</div></td>
                <td style={{fontSize:12.5}}>{l.campaign}</td><td>{l.source}</td>
                <td className="dva-mono" style={{fontWeight:700}}>{l.score}</td>
                <td><Badge status={l.status}/></td>
                <td style={{fontSize:13}}>{managers.find(m=>m.id===l.manager)?.name||<span style={{color:"var(--ink-2)"}}>unassigned</span>}</td>
                <td className="dva-mono" style={{fontSize:12,color:"var(--ink-2)"}}>{fmtDate(l.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <LeadDetailModal lead={detailLead} manager={detailMgr} onClose={()=>setDetailLeadId(null)}/>
    </>
  );
}

/* ---------- Phase 4: 24-hour first-contact SLA ---------- */
function SlaView({leads, managers, onBack}){
  const [detailLeadId,setDetailLeadId]=useState(null);
  const detailLead=detailLeadId? leads.find(l=>l.id===detailLeadId): null;
  const detailMgr=detailLead? managers.find(m=>m.id===detailLead.manager): null;
  const open = leads.filter(l => l.manager && !l.firstContactAt && !["Converted","Closed"].includes(l.status));
  const states = open.map(l => ({lead:l, sla: sla(l)})).filter(x => x.sla);
  const overdue = states.filter(s => s.sla.k === "overdue");
  const urgent  = states.filter(s => s.sla.k === "urgent");
  const ok      = states.filter(s => s.sla.k === "ok");

  const contactedRecent = leads.filter(l => l.firstContactAt && l.assignedAt);
  const avgHours = contactedRecent.length
    ? Math.round(contactedRecent.reduce((a,l) => a + (l.firstContactAt - l.assignedAt)/HOUR, 0) / contactedRecent.length)
    : 0;

  const perManager = managers.map(m => {
    const breached = overdue.filter(s => s.lead.manager === m.id);
    return { ...m, breached: breached.length, oldest: breached.reduce((a,s) => Math.max(a, s.sla.h), 0) };
  }).filter(m => m.breached > 0).sort((a,b) => b.breached - a.breached);

  return (
    <>
      <SubHeader title="24-Hour First Contact KPI" onBack={onBack}
        right={
          <div style={{display:"flex",alignItems:"center",gap:8,color:"var(--ink-2)"}}>
            <CalendarDays size={16}/>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
              <span style={{fontSize:13,color:"var(--ink)",fontWeight:600}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</span>
              <span style={{fontSize:11,letterSpacing:".05em",textTransform:"uppercase"}}>Live SLA status</span>
            </div>
          </div>
        }/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}} className="exec-stats">
        <KpiCard label="On track (<18h)"   value={ok.length}      I={ShieldCheck}   color="var(--teal-2)"/>
        <KpiCard label="Urgent (≥18h)"     value={urgent.length}  I={Clock}         color="#fbbf24"/>
        <KpiCard label="Overdue (≥24h)"    value={overdue.length} I={AlertTriangle} color="var(--coral)"/>
        <KpiCard label="Avg first-contact" value={avgHours + "h"} I={Gauge}         color="var(--violet)"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:18}} className="exec-charts">
        <div className="dva-card" style={{overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--line)"}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Managers with overdue leads</h3>
          </div>
          {perManager.length === 0
            ? <div style={{padding:30,textAlign:"center",color:"var(--ink-2)"}}>No active breaches.</div>
            : <table className="dva-table">
                <thead><tr><th>Manager</th><th>Breached</th><th>Oldest</th></tr></thead>
                <tbody>{perManager.map(m=>(
                  <tr key={m.id}>
                    <td style={{fontWeight:600}}>{m.name}</td>
                    <td className="dva-mono" style={{color:"var(--coral)"}}>{m.breached}</td>
                    <td className="dva-mono">{m.oldest}h</td>
                  </tr>
                ))}</tbody>
              </table>}
        </div>
        <div className="dva-card" style={{overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--line)"}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Breached &amp; at-risk leads</h3>
          </div>
          <div style={{maxHeight:420,overflowY:"auto"}}>
            <table className="dva-table">
              <thead><tr><th>Lead</th><th>Manager</th><th>SLA</th></tr></thead>
              <tbody>{[...overdue, ...urgent].slice(0,80).map(s=>(
                <tr key={s.lead.id}>
                  <td><button className="dva-leadname-btn" onClick={()=>setDetailLeadId(s.lead.id)}>{s.lead.name}</button><div className="dva-mono" style={{fontSize:11,color:"var(--ink-2)"}}>{s.lead.id} · {s.lead.program}</div></td>
                  <td style={{fontSize:13}}>{managers.find(m => m.id === s.lead.manager)?.name || "—"}</td>
                  <td><SlaBadge lead={s.lead}/></td>
                </tr>
              ))}
              {overdue.length + urgent.length === 0 && (
                <tr><td colSpan={3} style={{textAlign:"center",padding:30,color:"var(--ink-2)"}}>Nothing at risk right now.</td></tr>
              )}</tbody>
            </table>
          </div>
        </div>
      </div>
      <LeadDetailModal lead={detailLead} manager={detailMgr} onClose={()=>setDetailLeadId(null)}/>
    </>
  );
}

/* ---------- Phase 5: Vox Conversation View (mock) ---------- */
const VOX_OUTCOMES = [
  { stage:"VALIDATED – READY", bg:"rgba(34,197,94,.18)", fg:"#86efac", weight:6 },
  { stage:"NEEDS FOLLOW-UP",   bg:"rgba(251,191,36,.15)", fg:"#fbbf24", weight:3 },
  { stage:"DO NOT CALL",       bg:"rgba(255,90,77,.15)",  fg:"#fca5a5", weight:1 },
];
const VOX_CONCERNS = ["entry requirements","fees and scholarship options","class schedule","campus facilities","accommodation","transfer credits","internship placements"];
const VOX_CORRECTIONS = [[], ["phone updated"], ["intake shifted to next semester"], ["email corrected"], ["preferred campus changed"], [], [], ["qualification updated"]];
const VOX_CALLBACKS = ["Tomorrow 10am","Friday 3pm","Saturday 11am","Mon 4pm","Wed 2pm"];

function mockVoxCall(lead, manager){
  if (!lead.firstContactAt) return null;
  const seed = parseInt(String(lead.id).replace(/\D/g,""),10) || 0;
  const roll = seed % 10;
  let acc = 0;
  const outcome = VOX_OUTCOMES.find(o => (acc += o.weight) > roll) || VOX_OUTCOMES[0];
  return {
    id: "VOX-" + lead.id,
    leadId: lead.id,
    at: lead.firstContactAt,
    durationSec: 90 + (seed % 180),
    stage: outcome.stage, bg: outcome.bg, fg: outcome.fg,
    concern: VOX_CONCERNS[seed % VOX_CONCERNS.length],
    corrections: VOX_CORRECTIONS[seed % VOX_CORRECTIONS.length],
    callback: VOX_CALLBACKS[seed % VOX_CALLBACKS.length],
    managerName: manager?.name || "—",
  };
}

function VoxView({leads, managers, onBack}){
  const [filter, setFilter] = useState("all");
  const calls = useMemo(() =>
    leads.map(l => mockVoxCall(l, managers.find(m => m.id === l.manager)))
         .filter(Boolean)
         .sort((a,b) => b.at - a.at),
    [leads, managers]
  );
  const counts = {
    total: calls.length,
    validated: calls.filter(c => c.stage === "VALIDATED – READY").length,
    followup:  calls.filter(c => c.stage === "NEEDS FOLLOW-UP").length,
    dnc:       calls.filter(c => c.stage === "DO NOT CALL").length,
  };
  const visible = calls.filter(c =>
    filter === "all" ? true :
    filter === "validated" ? c.stage === "VALIDATED – READY" :
    filter === "followup"  ? c.stage === "NEEDS FOLLOW-UP" :
    c.stage === "DO NOT CALL"
  );
  return (
    <>
      <SubHeader title="Vox Conversation View" onBack={onBack}
        right={
          <div style={{display:"flex",alignItems:"center",gap:8,color:"var(--ink-2)"}}>
            <CalendarDays size={16}/>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
              <span style={{fontSize:13,color:"var(--ink)",fontWeight:600}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</span>
              <span style={{fontSize:11,letterSpacing:".05em",textTransform:"uppercase"}}>All-time AI calls</span>
            </div>
          </div>
        }/>
      <div className="dva-card dva-pad" style={{padding:"10px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:10,background:"rgba(109,92,240,.08)",borderColor:"rgba(109,92,240,.3)"}}>
        <Zap size={14} style={{color:"var(--violet)"}}/>
        <span style={{fontSize:12.5,color:"var(--ink-2)"}}>Mock data — Vox call summaries are synthetic until the ElevenLabs webhook backend is wired in. Each summary is deterministic per lead.</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}} className="exec-stats">
        <KpiCard label="Total Vox calls"  value={counts.total}     I={PhoneCall}/>
        <KpiCard label="Validated"        value={counts.validated} I={CheckCircle2}  color="var(--teal-2)"/>
        <KpiCard label="Needs follow-up"  value={counts.followup}  I={Clock}         color="#fbbf24"/>
        <KpiCard label="Do not call"      value={counts.dnc}       I={AlertTriangle} color="var(--coral)"/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[["all","All"],["validated","Validated"],["followup","Follow-up"],["dnc","Do not call"]].map(([k,l])=>(
          <button key={k} className={"dva-tab"+(filter===k?" active":"")} onClick={()=>setFilter(k)}>{l}</button>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {visible.slice(0,40).map(c => {
          const lead = leads.find(l => l.id === c.leadId);
          return (
            <div key={c.id} className="dva-card dva-pad" style={{padding:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span className="dva-mono" style={{fontSize:11.5,color:"var(--ink-2)"}}>{c.id}</span>
                    <span className="badge" style={{background:c.bg,color:c.fg}}>{c.stage}</span>
                  </div>
                  <div style={{fontWeight:700,fontSize:15}}>{lead?.name || "—"}</div>
                  <div style={{fontSize:12.5,color:"var(--ink-2)",marginTop:3}}>
                    Called by {AI_AGENT_NAME} for {c.managerName} · {Math.floor(c.durationSec/60)}m {c.durationSec%60}s
                  </div>
                </div>
                <div style={{fontSize:12.5,color:"var(--ink-2)",textAlign:"right"}}>
                  {new Date(c.at).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
                </div>
              </div>
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid var(--line-2)",fontSize:13,lineHeight:1.7}}>
                <div><span style={{color:"var(--ink-2)"}}>Key concern:</span> {c.concern}</div>
                {c.corrections.length > 0 && <div><span style={{color:"var(--ink-2)"}}>Corrections:</span> {c.corrections.join(", ")}</div>}
                <div><span style={{color:"var(--ink-2)"}}>{c.managerName}'s callback:</span> {c.callback}</div>
              </div>
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="dva-card dva-pad" style={{padding:40,textAlign:"center",color:"var(--ink-2)"}}>
            No calls in this category yet.
          </div>
        )}
      </div>
    </>
  );
}

const ThemeOverrideStyle = () => (
  <style>{`
    /* ---------- DARK THEME OVERRIDES (applied via .dva-theme-dark on root) ---------- */
    .dva.dva-theme-dark{
      --paper:#0F181E; --surface:#1B252C;
      --ink:#E9F2FA; --ink-2:#A7B2BA;
      --line:#2F383F; --line-2:#19232A;
      --teal:#EA2B20; --teal-2:#F54A3F; --violet:#4D565D;
      --teal-soft:rgba(234,43,32,.16);
      --coral-soft:rgba(249,55,30,.18);
      --amber-soft:rgba(224,149,11,.18);
    }
    .dva-theme-dark .dva-nav{ background:rgba(15,24,30,.85); }
    .dva-theme-dark .dva-navlink:hover{ background:var(--surface); }
    .dva-theme-dark .dva-navlink.active{ background:var(--surface); color:var(--teal-2); box-shadow:none; }
    .dva-theme-dark .dva-burger{ background:var(--surface); color:var(--ink); border-color:var(--line); }
    .dva-theme-dark .dva-btn-ghost{ background:var(--surface); color:var(--ink); border-color:var(--line); }
    .dva-theme-dark .dva-btn-ghost:hover{ background:var(--line-2); border-color:var(--ink-2); }
    .dva-theme-dark .dva-btn-primary{ background:var(--teal); color:#fff; }
    .dva-theme-dark .dva-btn-primary:hover{ background:#F54A3F; }
    .dva-theme-dark .dva-input,
    .dva-theme-dark .dva-select{ background:var(--surface); border-color:var(--line); color:var(--ink); }
    .dva-theme-dark .dva-input::placeholder{ color:var(--ink-2); }
    .dva-theme-dark .dva-table{ color:var(--ink); }
    .dva-theme-dark .dva-table th{ background:var(--line-2); color:var(--ink-2); border-bottom:1px solid var(--line); }
    .dva-theme-dark .dva-table td{ border-bottom:1px solid var(--line); }
    .dva-theme-dark .dva-table tr:hover td{ background:var(--line-2); }
    .dva-theme-dark .dva-progress{ background:var(--line); }
    .dva-theme-dark .dva-progress > i{ background:var(--teal-2); }
    .dva-theme-dark .dva-tab{ background:var(--surface); border:1px solid var(--line); color:var(--ink-2); }
    .dva-theme-dark .dva-tab.active{ background:var(--line-2); color:var(--ink); border-color:var(--teal-2); }

    /* ---------- CLICKABLE LEAD NAME (always mounted) ---------- */
    .dva-leadname-btn{
      appearance:none; -webkit-appearance:none;
      background:transparent; border:none; padding:0; margin:0;
      font:inherit; color:inherit; font-weight:600; cursor:pointer;
      text-align:left; text-decoration:none; transition:color .12s;
    }
    .dva-leadname-btn:hover{ color:var(--teal); text-decoration:underline; }

    /* ---------- THEME TOGGLE BUTTON (works in both themes) ---------- */
    .dva-theme-toggle{
      display:inline-flex; align-items:center; justify-content:center;
      width:38px; height:38px; border-radius:999px;
      background:var(--surface); border:1px solid var(--line); color:var(--ink);
      transition:.18s;
    }
    .dva-theme-toggle:hover{ border-color:var(--teal-2); color:var(--teal); }

    /* ---------- EXECUTIVE HUB TILES (auto-themed via CSS variables) ---------- */
    .exec-hub-tile{
      display:flex; flex-direction:column; align-items:flex-start; justify-content:space-between;
      gap:18px; min-height:150px; padding:28px; text-align:left; cursor:pointer;
      background:var(--surface); border:1px solid var(--line); border-radius:20px;
      transition:border-color .15s ease, transform .15s ease, background .15s ease;
      font-family:inherit; color:var(--ink);
    }
    .exec-hub-tile:hover{ border-color:var(--teal-2); transform:translateY(-1px); background:var(--line-2); }
    .exec-hub-tile-eyebrow{
      font-size:11.5px; letter-spacing:.16em; color:var(--ink-2);
      font-weight:600; text-transform:uppercase;
    }
    .exec-hub-tile-cta{
      font-family:'Figtree',sans-serif;
      font-size:30px; font-weight:800; color:var(--ink); letter-spacing:-.01em;
    }

    @media(max-width:760px){
      .exec-hub-tiles{ grid-template-columns:1fr !important; }
      .exec-hub-charts{ grid-template-columns:1fr !important; }
    }
  `}</style>
);

/* ============================== USER GUIDE ============================== */
function Guide(){
  const Section=({title,children})=>(
    <div className="dva-card dva-pad" style={{marginBottom:14}}>
      <h2 className="dva-display" style={{fontSize:20,fontWeight:700,margin:"0 0 10px"}}>{title}</h2>
      <div style={{color:"var(--ink-2)",fontSize:14.5,lineHeight:1.6}}>{children}</div>
    </div>
  );
  const Li=({children})=> <div style={{display:"flex",gap:9,padding:"4px 0"}}><ChevronRight size={16} style={{color:"var(--teal)",flexShrink:0,marginTop:2}}/><span>{children}</span></div>;
  return (
    <div className="dva-wrap" style={{padding:"34px 22px 70px",maxWidth:860}}>
      <span className="dva-eyebrow">DVAPulse user guide</span>
      <h1 className="dva-display" style={{fontSize:30,fontWeight:800,margin:"8px 0 6px"}}>How to use DVAPulse</h1>
      <p style={{color:"var(--ink-2)",margin:"0 0 24px"}}>A quick reference for core workflows, funnel status definitions, and operational tips.</p>

      <Section title="Overview">DVAPulse connects Marketers, Sales Managers, and Executive stakeholders to manage lead intake, pipeline progression, and performance reporting in one place.</Section>
      <Section title="Personas & entry points">
        <Li><b>Marketer</b> — upload CSV leads and validate data before staging.</Li>
        <Li><b>Sales Manager</b> — triage assigned leads, update stages, and track follow-ups.</Li>
        <Li><b>Executive Dashboard</b> — monitor pipeline health, assign leads, and export snapshots.</Li>
      </Section>
      <Section title="Core workflows">
        <Li><b>CSV upload</b> — drag and drop, preview rows, and batch-insert into staging.</Li>
        <Li><b>Lead assignment</b> — assign single or multiple leads to managers.</Li>
        <Li><b>Pipeline updates</b> — managers advance stages and log first-contact activity.</Li>
        <Li><b>Analytics & export</b> — filter views, then export CSV snapshots.</Li>
      </Section>
      <Section title="Conversion percentage">
        Calculated as <b>(Converted Leads ÷ Total Leads Assigned) × 100</b>. It follows the scope of the current view — team dashboards reflect all assigned leads in the selected dataset, while manager views reflect that manager's pipeline.
      </Section>
      <Section title="Sales stage statuses">
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>{STAGE_ORDER.map(s=><Badge key={s} status={s}/>)}</div>
        <Li><b>New</b> — entered the system, not yet assigned.</Li>
        <Li><b>Assigned</b> — routed to a manager, awaiting first contact.</Li>
        <Li><b>Contacted</b> — first outreach completed.</Li>
        <Li><b>Qualified</b> — meets qualification criteria.</Li>
        <Li><b>In Progress</b> — active follow-up underway.</Li>
        <Li><b>Converted</b> — successfully converted into a win.</Li>
        <Li><b>Closed</b> — closed as lost or no longer active.</Li>
      </Section>
      <Section title="Automated lead assignment">
        New leads are distributed automatically using a fair-rotation algorithm. When a lead is <b>New</b>, unassigned, and at least one manager is active and within capacity, DVAPulse assigns it instantly — preferring active managers with the fewest open leads, then rotating evenly. After assignment, the manager is recorded, status moves New → Assigned, a timestamp is captured, workload counters update, and an audit entry is logged. Executives can still reassign manually at any time.
      </Section>
      <Section title="First-contact SLA">
        The SLA measures how quickly a manager reaches out after assignment. Timers run from the assigned timestamp and flag leads as <span className="badge" style={{background:"var(--amber-soft)",color:"#9a6608"}}>urgent</span> or <span className="badge" style={{background:"var(--coral-soft)",color:"#c0271a"}}>overdue</span> when the 24-hour window is at risk or missed.
      </Section>
      <Section title="Filters, search & data sources">
        <Li>Filters apply to status, campus, program, and campaign.</Li>
        <Li>Search matches name, email, and phone.</Li>
        <Li>Exports include only the currently filtered dataset.</Li>
        <Li>Data sources: lead staging, sales-manager roster, and assignment logs.</Li>
      </Section>
      <Section title="Troubleshooting">Reach out to <b>support@digitalvibesasia.com</b> for any help.</Section>
    </div>
  );
}

/* ============================== LOGIN GATES (mock) ============================== */
function ManagerLogin({managers, onLogin}){
  const active = managers.filter(m=>m.active);
  const [mid, setMid] = useState(active[0].id);
  const [password, setPassword] = useState("");
  const me = managers.find(m=>m.id===mid);
  const submit = (e)=>{ e.preventDefault(); onLogin(mid); };
  return (
    <div className="dva-wrap" style={{padding:"56px 22px 80px",display:"flex",justifyContent:"center"}}>
      <div className="dva-card" style={{width:"min(440px,100%)",padding:32}}>
        <span className="dva-eyebrow">Sales Manager workspace</span>
        <h1 className="dva-display" style={{fontSize:26,fontWeight:800,margin:"8px 0 4px"}}>Sign in to your queue</h1>
        <p style={{color:"var(--ink-2)",margin:"0 0 22px",fontSize:14}}>Access your assigned leads, SLA timers, and contact tools.</p>
        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
          <label style={{display:"flex",flexDirection:"column",gap:6}}>
            <span style={{fontSize:11.5,fontWeight:700,color:"var(--ink-2)",letterSpacing:".08em"}}>SALES MANAGER</span>
            <select className="dva-select" value={mid} onChange={e=>setMid(e.target.value)} style={{width:"100%",fontWeight:600}}>
              {active.map(m=>(<option key={m.id} value={m.id}>{m.name}</option>))}
            </select>
          </label>
          <label style={{display:"flex",flexDirection:"column",gap:6}}>
            <span style={{fontSize:11.5,fontWeight:700,color:"var(--ink-2)",letterSpacing:".08em"}}>PASSWORD</span>
            <input type="password" className="dva-input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Any password (demo)" style={{width:"100%"}}/>
          </label>
          <button type="submit" className="dva-btn dva-btn-primary" style={{marginTop:6,justifyContent:"center"}}>Sign in as {me?.name?.split(" ")[0] || ""}</button>
          <p style={{color:"var(--ink-2)",fontSize:12,margin:"4px 0 0",textAlign:"center"}}>Demo prototype — any password is accepted.</p>
        </form>
      </div>
    </div>
  );
}

function ExecutiveLogin({onLogin}){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submit = (e)=>{ e.preventDefault(); onLogin(email || "executive@dvapulse.com"); };
  return (
    <div className="dva-wrap" style={{padding:"56px 22px 80px",display:"flex",justifyContent:"center"}}>
      <div className="dva-card" style={{width:"min(440px,100%)",padding:32}}>
        <span className="dva-eyebrow">Executive cockpit</span>
        <h1 className="dva-display" style={{fontSize:26,fontWeight:800,margin:"8px 0 4px"}}>Sign in to your dashboard</h1>
        <p style={{color:"var(--ink-2)",margin:"0 0 22px",fontSize:14}}>Pipeline KPIs, manager performance, SLA cockpit, and Vox conversations.</p>
        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
          <label style={{display:"flex",flexDirection:"column",gap:6}}>
            <span style={{fontSize:11.5,fontWeight:700,color:"var(--ink-2)",letterSpacing:".08em"}}>EMAIL</span>
            <input type="email" className="dva-input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@dvapulse.com" style={{width:"100%"}}/>
          </label>
          <label style={{display:"flex",flexDirection:"column",gap:6}}>
            <span style={{fontSize:11.5,fontWeight:700,color:"var(--ink-2)",letterSpacing:".08em"}}>PASSWORD</span>
            <input type="password" className="dva-input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Any password (demo)" style={{width:"100%"}}/>
          </label>
          <button type="submit" className="dva-btn dva-btn-primary" style={{marginTop:6,justifyContent:"center"}}>Sign in</button>
          <p style={{color:"var(--ink-2)",fontSize:12,margin:"4px 0 0",textAlign:"center"}}>Demo prototype — any email and password are accepted.</p>
        </form>
      </div>
    </div>
  );
}

/* ============================== APP ============================== */
export default function App(){
  const [managers]=useState(MANAGERS_SEED);
  const [leads,setLeads]=useState(()=>{ const {leads}=autoAssign(seedLeads(MANAGERS_SEED),MANAGERS_SEED); return leads; });
  const [page,setPage]=useState("home");
  const [theme,setTheme]=useState(()=>{
    if (typeof window==="undefined") return "light";
    return localStorage.getItem("dva-theme") || "light";
  });
  const toggleTheme=()=>setTheme(t=>{
    const next = t === "dark" ? "light" : "dark";
    try { localStorage.setItem("dva-theme", next); } catch {}
    return next;
  });
  const [mgrAuth,setMgrAuth]=useState(()=>{
    if (typeof window==="undefined") return null;
    try { return JSON.parse(localStorage.getItem("dva-mgr-auth") || "null"); } catch { return null; }
  });
  const [execAuth,setExecAuth]=useState(()=>{
    if (typeof window==="undefined") return null;
    try { return JSON.parse(localStorage.getItem("dva-exec-auth") || "null"); } catch { return null; }
  });
  const signInMgr=(mid)=>{ const v={mid,at:Date.now()}; setMgrAuth(v); try{localStorage.setItem("dva-mgr-auth",JSON.stringify(v));}catch{} };
  const signOutMgr=()=>{ setMgrAuth(null); try{localStorage.removeItem("dva-mgr-auth");}catch{} };
  const signInExec=(email)=>{ const v={email,at:Date.now()}; setExecAuth(v); try{localStorage.setItem("dva-exec-auth",JSON.stringify(v));}catch{} };
  const signOutExec=()=>{ setExecAuth(null); try{localStorage.removeItem("dva-exec-auth");}catch{} };
  const go=(p)=>{ setPage(p); if(typeof window!=="undefined") window.scrollTo(0,0); };

  const insert=(newLeads)=>{
    const base=leads.length;
    const staged=newLeads.map((l,i)=>({ ...l, id:"L"+(2000+base+i), status:"New", manager:null, createdAt:Date.now(), assignedAt:null, firstContactAt:null }));
    const { leads:assignedAll, log } = autoAssign([...leads,...staged], managers);
    setLeads(assignedAll);
    return log;
  };
  const setStatus=(id,status)=>setLeads(ls=>ls.map(l=>l.id===id?{
    ...l,status,
    firstContactAt: (l.firstContactAt|| (status!=="New"&&status!=="Assigned")? (l.firstContactAt||Date.now()):null),
  }:l));
  const markContact=(id)=>setLeads(ls=>ls.map(l=>l.id===id?{...l,status:l.status==="Assigned"?"Contacted":l.status,firstContactAt:Date.now()}:l));
  const reassign=(ids,mid)=>setLeads(ls=>ls.map(l=>ids.includes(l.id)?{
    ...l,manager:mid,status:["Converted","Closed"].includes(l.status)?l.status:(l.status==="New"?"Assigned":l.status),
    assignedAt:l.assignedAt||Date.now()
  }:l));

  const stats=useMemo(()=>{
    const assigned=leads.filter(l=>l.manager).length;
    const wins=leads.filter(l=>l.status==="Converted").length;
    return {
      total:leads.length, mgrs:managers.filter(m=>m.active).length,
      conv:assigned?Math.round(wins/assigned*100):0,
      fresh:leads.filter(l=>l.status==="New").length, wins,
      score:leads.length?Math.round(leads.reduce((a,l)=>a+l.score,0)/leads.length):0,
    };
  },[leads,managers]);

  return (
    <div className={"dva dva-shell" + (theme==="dark" ? " dva-theme-dark" : "")}>
      <Style/>
      <ThemeOverrideStyle/>
      <Nav page={page} go={go} theme={theme} toggleTheme={toggleTheme}/>
      {page==="home" && <Home go={go} stats={stats}/>}
      {page==="marketer" && <Marketer insert={insert} go={go}/>}
      {page==="manager" && (mgrAuth
        ? <Manager leads={leads} managers={managers} setStatus={setStatus} markContact={markContact} initialMid={mgrAuth.mid} onSignOut={signOutMgr}/>
        : <ManagerLogin managers={managers} onLogin={signInMgr}/>)}
      {page==="executive" && (execAuth
        ? <Executive leads={leads} managers={managers} reassign={reassign} onSignOut={signOutExec}/>
        : <ExecutiveLogin onLogin={signInExec}/>)}
      {page==="guide" && <Guide/>}
    </div>
  );
}
