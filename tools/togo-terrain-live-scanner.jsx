import { useState, useEffect } from "react";

// ---------- Konstanten ----------
const RATE = 655.957;
const ZONES = ["Agoè","Adidogomé","Sanguéra","Baguida/Avépozo","Adétikopé/PIA","Davié/Tsévié","Noépé","Kpalimé","Aného","Atakpamé"];
const BENCH = {"Agoè":31000,"Adidogomé":27000,"Baguida/Avépozo":54000,"Adétikopé/PIA":8000,"Sanguéra":18000,"Davié/Tsévié":6500,"Noépé":9000,"Kpalimé":5500,"Aného":15000,"Atakpamé":5000};
const PAPER_SCORE = {TF:40,TFcours:32,"3T":25,PV:12,PS:0,unbekannt:8};
const PAPER_LABEL = {TF:"Titre Foncier",TFcours:"TF en cours","3T":"3 Tampons",PV:"Plan visé",PS:"Plan simple ⚠",unbekannt:"Papiere unklar"};
const STATUSES = ["Neu","Kontaktiert","Besichtigt","Due Diligence","Verhandlung","⭐ Favorit","❌ Verworfen"];
const DD_ITEMS = ["Papiere & NUP geprüft","GFU: lastenfrei","Eigentümer-Abgleich","Nachbarn befragt","Grenzen/Geometer ok"];

const C = { ink:"#14231c", paper:"#f7f5ef", card:"#fff", green:"#1f6f43", gold:"#c8930a", goldSoft:"#f3e3bb", red:"#b3402e", muted:"#6d7a72", line:"#dcd7c9" };

function scoreOf(p){
  let s = PAPER_SCORE[p.papers] ?? 8;
  const bench = BENCH[p.zone] || 20000;
  const ppm = p.price / p.size;
  const r = ppm / bench;
  s += r<=0.6?35: r<=0.85?28: r<=1.1?20: r<=1.4?10: 3;
  s += 8; // Lage neutral (Live-Funde haben selten Meterangabe)
  s += Math.min(10,(p.dd||[]).filter(Boolean).length*2);
  return Math.round(s);
}
const fmtF = n => (+n).toLocaleString("de-DE");
const fmtE = n => Math.round(n/RATE).toLocaleString("de-DE");

// ---------- App ----------
export default function TerrainScanner(){
  const [tab,setTab] = useState("scan");
  const [zone,setZone] = useState("Agoè");
  const [budget,setBudget] = useState(13000000);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [suggestions,setSuggestions] = useState([]);
  const [cands,setCands] = useState([]);
  const [loaded,setLoaded] = useState(false);

  // Laden aus persistentem Speicher
  useEffect(()=>{ (async()=>{
    try{ const r = await window.storage.get("terrain-candidates");
      if(r?.value) setCands(JSON.parse(r.value)); }catch(e){/* Schlüssel existiert noch nicht */}
    setLoaded(true);
  })(); },[]);

  // Speichern bei Änderung
  useEffect(()=>{ if(!loaded) return; (async()=>{
    try{ await window.storage.set("terrain-candidates", JSON.stringify(cands)); }catch(e){ console.error(e); }
  })(); },[cands,loaded]);

  // ---------- KI-Live-Scan ----------
  async function liveScan(){
    setLoading(true); setError(""); setSuggestions([]);
    try{
      const prompt = `Du bist ein Immobilien-Rechercheassistent für Togo. Suche im Web nach AKTUELLEN Grundstücksanzeigen (terrain à vendre) in der Zone "${zone}" (Togo, Region Lomé/Maritime), Budget maximal ${budget} FCFA. Nutze Quellen wie coinafrique, keur-immo, immoask, habitat-afrik, immautogo, agoloo, expat.com.

Gib AUSSCHLIESSLICH ein JSON-Array zurück, ohne Markdown, ohne Erklärtext. Jedes Element:
{"name":"Kurzbezeichnung mit Quartier","zone":"${zone}","price":Zahl_FCFA,"size":Zahl_m2 (1 Lot=600, halb=300, viertel=150),"papers":"TF"|"TFcours"|"3T"|"PV"|"PS"|"unbekannt","source":"Plattformname","url":"Link falls vorhanden sonst leer","note":"1 Satz Besonderheit"}

Maximal 8 Einträge. Nur Anzeigen mit konkretem Preis. Wenn du keine findest, gib [] zurück.`;
      const resp = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1000,
          messages:[{role:"user",content:prompt}],
          tools:[{type:"web_search_20250305",name:"web_search"}] })
      });
      const data = await resp.json();
      const text = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n");
      const clean = text.replace(/```json|```/g,"").trim();
      const start = clean.indexOf("["), end = clean.lastIndexOf("]");
      if(start===-1||end===-1) throw new Error("Keine strukturierten Treffer erhalten – nochmal versuchen.");
      const arr = JSON.parse(clean.slice(start,end+1));
      const valid = arr.filter(x=>x&&x.price>0&&x.size>0).map(x=>({...x, zone, id:Math.random().toString(36).slice(2)}));
      if(!valid.length) setError("Keine passenden Anzeigen gefunden – Zone wechseln oder Budget erhöhen.");
      setSuggestions(valid);
    }catch(e){ setError("Scan fehlgeschlagen: "+e.message); }
    setLoading(false);
  }

  function adopt(s){
    setCands(c=>[...c,{ id:Date.now()+Math.random(), name:s.name, zone:s.zone, price:s.price, size:s.size,
      papers:s.papers||"unbekannt", url:s.url||"", notes:(s.note||"")+(s.source?` [${s.source}]`:""),
      status:"Neu", dd:[false,false,false,false,false] }]);
    setSuggestions(sug=>sug.filter(x=>x.id!==s.id));
  }
  const setStatus=(id,v)=>setCands(c=>c.map(p=>p.id===id?{...p,status:v}:p));
  const toggleDD=(id,i)=>setCands(c=>c.map(p=>p.id===id?{...p,dd:p.dd.map((d,j)=>j===i?!d:d)}:p));
  const del=id=>{ if(confirm("Kandidat löschen?")) setCands(c=>c.filter(p=>p.id!==id)); };
  function exportJSON(){
    const blob=new Blob([JSON.stringify(cands,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download="togo-terrains-"+new Date().toISOString().slice(0,10)+".json"; a.click();
  }

  const sorted=[...cands].sort((a,b)=>scoreOf(b)-scoreOf(a));

  return (
  <div style={{fontFamily:'"Avenir Next","Segoe UI",system-ui,sans-serif',background:C.paper,minHeight:"100vh",color:C.ink,paddingBottom:60}}>
    <div style={{height:8,background:`repeating-linear-gradient(90deg,${C.green} 0 40px,${C.gold} 40px 60px,${C.ink} 60px 70px,${C.red} 70px 80px)`}}/>
    <div style={{maxWidth:1000,margin:"0 auto",padding:"24px 16px 0"}}>
      <div style={{fontSize:11,letterSpacing:".2em",textTransform:"uppercase",color:C.gold,fontWeight:700}}>Operation Titre Foncier · Live-Edition</div>
      <h1 style={{fontFamily:"Georgia,serif",fontSize:"clamp(24px,4.5vw,36px)",margin:"6px 0 6px"}}>Terrain-Scanner <em style={{color:C.green}}>mit KI-Live-Scan</em></h1>
      <p style={{color:C.muted,fontSize:14,maxWidth:640}}>Zone & Budget wählen → Claude durchsucht die togolesischen Portale live und liefert strukturierte Vorschläge. Ein Tap übernimmt sie in deine Kandidaten mit Score & Due-Diligence-Pipeline. Daten bleiben gespeichert.</p>

      {/* Tabs */}
      <div style={{display:"flex",gap:8,margin:"16px 0",flexWrap:"wrap"}}>
        {[["scan","🛰 Live-Scan"],["list",`📋 Kandidaten (${cands.length})`]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"10px 18px",borderRadius:99,cursor:"pointer",
            font:"inherit",fontWeight:700,fontSize:14,
            border:`2px solid ${tab===id?C.green:C.line}`, color:tab===id?C.green:C.muted,
            background:tab===id?"#eef5ef":C.card}}>{label}</button>
        ))}
      </div>

      {/* SCAN TAB */}
      {tab==="scan" && <div>
        <div style={{background:C.card,border:`1px solid ${C.line}`,borderRadius:14,padding:16,marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:12}}>
            <div>
              <label style={{fontSize:11.5,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Zone</label>
              <select value={zone} onChange={e=>setZone(e.target.value)}
                style={{width:"100%",padding:9,border:`1px solid ${C.line}`,borderRadius:8,font:"inherit",marginTop:3,background:"#fdfcf8"}}>
                {ZONES.map(z=><option key={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:11.5,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Max. Budget (FCFA)</label>
              <input type="number" value={budget} onChange={e=>setBudget(+e.target.value)}
                style={{width:"100%",padding:9,border:`1px solid ${C.line}`,borderRadius:8,font:"inherit",marginTop:3,background:"#fdfcf8"}}/>
              <div style={{fontSize:12,color:C.muted,marginTop:2}}>≈ {fmtE(budget)} €</div>
            </div>
          </div>
          <button onClick={liveScan} disabled={loading}
            style={{width:"100%",padding:13,background:loading?C.muted:C.green,color:"#fff",border:"none",
              borderRadius:10,font:"inherit",fontWeight:700,fontSize:15,cursor:loading?"wait":"pointer"}}>
            {loading? "🛰 Claude durchsucht die Portale… (10–30 s)" : "🛰 Live-Scan starten"}
          </button>
          {error && <div style={{marginTop:10,background:"#fbeeea",borderLeft:`4px solid ${C.red}`,padding:"9px 12px",fontSize:13,color:"#5f2419",borderRadius:"0 8px 8px 0"}}>{error}</div>}
        </div>

        {suggestions.length>0 && <div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:20,marginBottom:8}}>Vorschläge ({suggestions.length})</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:12}}>
            {suggestions.map(s=>(
              <div key={s.id} style={{background:C.card,border:`1px solid ${C.line}`,borderRadius:12,padding:14}}>
                <div style={{fontSize:11.5,color:C.gold,fontWeight:700,textTransform:"uppercase"}}>{s.zone} · {s.source||"Web"}</div>
                <div style={{fontWeight:700,fontSize:15,margin:"2px 0 6px"}}>{s.name}</div>
                <div style={{fontSize:13.5}}>💰 <b>{fmtF(s.price)} F</b> ≈ {fmtE(s.price)} € · 📐 {s.size} m²</div>
                <div style={{fontSize:13.5,margin:"2px 0"}}>📄 {PAPER_LABEL[s.papers]||s.papers} · {fmtF(Math.round(s.price/s.size))} F/m²</div>
                {s.note && <div style={{fontSize:12.5,color:C.muted,margin:"4px 0"}}>📝 {s.note}</div>}
                {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:C.gold,wordBreak:"break-all"}}>Quelle ↗</a>}
                <button onClick={()=>adopt(s)} style={{width:"100%",marginTop:8,padding:9,background:C.ink,color:C.goldSoft,
                  border:"none",borderRadius:8,font:"inherit",fontWeight:700,fontSize:13,cursor:"pointer"}}>➕ Als Kandidat übernehmen</button>
              </div>
            ))}
          </div>
          <div style={{background:"#eef5ef",borderLeft:`4px solid ${C.green}`,padding:"9px 12px",fontSize:12.5,marginTop:12,borderRadius:"0 8px 8px 0"}}>
            KI-Funde immer an der Quelle verifizieren (Link öffnen, Verkäufer kontaktieren) – Preise & Papierstatus können in Anzeigen ungenau sein. Die harte Prüfung passiert wie immer beim GFU.
          </div>
        </div>}
      </div>}

      {/* LIST TAB */}
      {tab==="list" && <div>
        {sorted.length===0 && <div style={{textAlign:"center",color:C.muted,padding:"40px 10px",background:C.card,border:`1px dashed ${C.line}`,borderRadius:12}}>Noch keine Kandidaten – starte einen Live-Scan! 🛰</div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
          {sorted.map(p=>{
            const sc=scoreOf(p), col=sc>=70?C.green:sc>=45?C.gold:C.red;
            return (
            <div key={p.id} style={{background:C.card,border:`1px solid ${C.line}`,borderRadius:12,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:11.5,color:C.gold,fontWeight:700,textTransform:"uppercase"}}>{p.zone}</div>
                  <div style={{fontWeight:700,fontSize:15}}>{p.name}</div>
                </div>
                <span title="Score 0–100" style={{background:col,color:"#fff",fontFamily:"Georgia,serif",fontWeight:700,fontSize:17,padding:"4px 10px",borderRadius:8}}>{sc}</span>
              </div>
              <div style={{fontSize:13.5,marginTop:6}}>💰 <b>{fmtF(p.price)} F</b> ≈ {fmtE(p.price)} € · 📐 {p.size} m²</div>
              <div style={{fontSize:13.5}}>📄 {PAPER_LABEL[p.papers]||p.papers} · {fmtF(Math.round(p.price/p.size))} F/m²</div>
              {p.notes && <div style={{fontSize:12.5,color:C.muted,marginTop:4}}>📝 {p.notes}</div>}
              {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:C.gold,wordBreak:"break-all"}}>Anzeige ↗</a>}
              <select value={p.status} onChange={e=>setStatus(p.id,e.target.value)}
                style={{width:"100%",marginTop:8,padding:7,border:`1px solid ${C.line}`,borderRadius:8,font:"inherit",fontSize:13,background:"#faf8f1"}}>
                {STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
              <div style={{marginTop:8,fontSize:12.5}}>
                {DD_ITEMS.map((d,i)=>(
                  <label key={i} style={{display:"flex",gap:6,padding:"2px 0",cursor:"pointer",color:p.dd[i]?C.ink:C.muted}}>
                    <input type="checkbox" checked={!!p.dd[i]} onChange={()=>toggleDD(p.id,i)} style={{accentColor:C.green}}/>{d}
                  </label>
                ))}
              </div>
              <button onClick={()=>del(p.id)} style={{width:"100%",marginTop:8,padding:7,background:"#faf8f1",
                border:`1px solid ${C.line}`,borderRadius:8,font:"inherit",fontSize:12.5,cursor:"pointer",color:C.muted}}>Löschen</button>
            </div>);
          })}
        </div>
        {cands.length>0 && <button onClick={exportJSON} style={{marginTop:14,padding:"9px 16px",border:`1px solid ${C.line}`,
          borderRadius:8,background:C.card,font:"inherit",fontSize:13,cursor:"pointer"}}>⬇ Export (JSON-Backup)</button>}
      </div>}
    </div>
  </div>);
}
