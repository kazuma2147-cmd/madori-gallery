import React, { useState, useEffect, useRef, useCallback } from "react";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "admin1234";
const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL   || "";
const SUPABASE_KEY   = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const CONFIG_KEY     = "madori-sb-config";

const STYLES_DEF = {
  ホテルライク:     { accent:"#2a2218", light:"#f0ede8" },
  ナチュラル:       { accent:"#6b7c48", light:"#f2f5ed" },
  和モダン:         { accent:"#7c5c3a", light:"#f7f2ed" },
  インダストリアル: { accent:"#4a4040", light:"#eeeceb" },
  シンプルモダン:   { accent:"#4a4a4a", light:"#f5f5f5" },
  北欧:             { accent:"#3a6b7c", light:"#edf4f7" },
};
const STYLE_LIST      = Object.keys(STYLES_DEF);
const LAYOUT_LIST     = ["1LDK","2LDK","3LDK","4LDK","5LDK","6LDK以上"];
const FLOOR_LIST      = ["平屋","半平屋","2階建て"];
const BUILD_TYPE_LIST = ["注文住宅","規格住宅"];
const STRUCT_LIST     = ["木造軸組","木造2×4","鉄骨造","RC造"];
const DIR_LIST        = ["北","北東","東","南東","南","南西","西","北西"];
const BUDGET_LIST     = ["〜1,000万円","1,000〜1,500万円","1,500〜2,000万円","2,000〜2,500万円","2,500〜3,000万円","3,000〜3,500万円","3,500〜4,000万円","4,000〜4,500万円","4,500〜5,000万円","5,000万円〜"];
const TSUBO_LIST      = ["〜20坪","20〜25坪","25〜30坪","30〜35坪","35〜40坪","40〜45坪","45〜50坪","50坪〜"];

const ROOM_NAMES = ["LDK","洋室1","洋室2","洋室3","洋室4","洋室5","書斎","SCL","FCL","WICL","PT"];
const JYOU_LIST  = ["4.5","6","7","7.5","8","8.5","10","12","14","16","18","20","その他"];

const SOLAR_KW   = ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15"];
const BATTERY_KWH= ["4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20"];

const SPEC_OPTS = {
  kitchen:         ["タカラスタンダード","TOTO","LIXIL","クリナップ"],
  bath:            ["タカラスタンダード","TOTO"],
  washroom:        ["タカラスタンダード","TOTO","LIXIL","造作"],
  toilet:          ["TOTO","LIXIL","Panasonic"],
  floorInsulation: ["アクリア"],
  wallInsulation:  ["アクリア","アクアフォーム"],
  ceilingInsulation:["アクリア","アクアフォーム（屋根）"],
  outerWall:       ["窯業系サイディング"],
  roof:            ["ガルバリウム鋼板","スレート","瓦"],
  sash:            ["アルミ樹脂複合サッシ（ペアガラス）","樹脂サッシ（ペアガラス）","樹脂サッシ（トリプルガラス）"],
  floorMaterial:   ["コンビットリアージュ","コンビットグラード","コンビットランダム"],
  ventilation:     ["1種","3種"],
  longLife:        ["有","無"],
  insulationGrade: ["5","6","7"],
  quakeGrade:      ["1","2","3"],
  damper:          ["有","無"],
};

const FEAT_CATEGORIES = [
  { label:"① 家事・生活動線", items:["回遊動線","家事ラク動線","洗濯完結動線","玄関直通洗面"] },
  { label:"② 収納",           items:["パントリー","ファミリークローゼット","ウォークインクローゼット","シューズクローゼット","階段下収納","大容量収納","収納率高め"] },
  { label:"③ 空間提案",       items:["吹抜け","畳コーナー","書斎","スタディコーナー","ランドリールーム","中庭","ガレージ","スキップフロア","勾配天井"] },
  { label:"④ 暮らし方",       items:["子育て向き","共働き向き","二世帯向き","老後安心","ペット対応","在宅ワーク","家事時短","収納重視","家族団らん"] },
  { label:"⑤ デザイン・仕様", items:["アイランドキッチン","ペニンシュラキッチン","大開口","造作洗面台"] },
];

const EMPTY_SPECS = {
  kitchen:"", bath:"", washroom:"", toilet:"",
  floorInsulation:"", wallInsulation:"", ceilingInsulation:"",
  outerWall:"", roof:"", sash:"", floorMaterial:"",
  ventilation:"", longLife:"", insulationGrade:"", quakeGrade:"",
  solarKw:"", batteryKwh:"", damper:"",
};
const DEFAULT_SPECS = {
  kitchen:"タカラスタンダード", bath:"タカラスタンダード", washroom:"タカラスタンダード", toilet:"TOTO",
  floorInsulation:"アクリア", wallInsulation:"アクリア", ceilingInsulation:"アクリア",
  outerWall:"窯業系サイディング", roof:"ガルバリウム鋼板", sash:"アルミ樹脂複合サッシ（ペアガラス）", floorMaterial:"コンビットリアージュ",
  ventilation:"3種", longLife:"", insulationGrade:"5", quakeGrade:"3",
  solarKw:"", batteryKwh:"", damper:"",
};
const EMPTY_CASE = {
  buildType:"注文住宅", style:"ナチュラル", layout:"3LDK", floors:"2階建て",
  title:"", subtitle:"", area:{ land:"", floor1:"", floor2:"", total:"" }, tsubo:"", productName:"",
  budget:"3,000〜3,500万円", direction:"南", location:"", year:new Date().getFullYear(),
  structure:"木造軸組", concept:"", highlights:["","","",""],
  rooms:[{ name:"LDK", floor:1, jyou:"" }],
  features:[], specs:{...EMPTY_SPECS}, image:"", images:[], floorImages:[], youtube:"",
};

function parseBudget(str) {
  if (!str) return [0,99999];
  const nums=(str.match(/[\d,]+/g)||[]).map(n=>parseInt(n.replace(/,/g,""),10));
  if(str.startsWith("〜")) return [0,nums[0]||99999];
  if(str.endsWith("〜"))   return [nums[0]||0,99999];
  return [nums[0]||0,nums[1]||nums[0]||99999];
}
function matchBudget(b,f){if(!f||!b)return true;const[a,c]=parseBudget(b),[d,e]=parseBudget(f);return a<=e&&c>=d;}

function sbHeaders(key,extra={}){return{"apikey":key,"Authorization":`Bearer ${key}`,"Content-Type":"application/json","Prefer":"return=representation",...extra};}
async function sbGetCases(url,key){const r=await fetch(`${url}/rest/v1/cases?select=*&order=id.asc`,{headers:sbHeaders(key)});if(!r.ok)throw new Error(`取得失敗: ${r.status}`);return(await r.json()).map(r=>({...r.data,_sbId:r.id}));}
async function sbInsertCase(url,key,d){const{_sbId,...data}=d;const r=await fetch(`${url}/rest/v1/cases`,{method:"POST",headers:sbHeaders(key),body:JSON.stringify({data})});if(!r.ok)throw new Error(`追加失敗: ${r.status}`);const rows=await r.json();return{...rows[0].data,_sbId:rows[0].id};}
async function sbUpdateCase(url,key,id,d){const{_sbId,...data}=d;const r=await fetch(`${url}/rest/v1/cases?id=eq.${id}`,{method:"PATCH",headers:sbHeaders(key),body:JSON.stringify({data})});if(!r.ok)throw new Error(`更新失敗: ${r.status}`);const rows=await r.json();return{...rows[0].data,_sbId:rows[0].id};}
async function sbDeleteCase(url,key,id){const r=await fetch(`${url}/rest/v1/cases?id=eq.${id}`,{method:"DELETE",headers:sbHeaders(key,{"Prefer":"return=minimal"})});if(!r.ok)throw new Error(`削除失敗: ${r.status}`);}
async function sbUploadImage(url,key,file){const ext=file.name.split(".").pop();const fn=`${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;const r=await fetch(`${url}/storage/v1/object/case-images/${fn}`,{method:"POST",headers:{"apikey":key,"Authorization":`Bearer ${key}`,"Content-Type":file.type,"x-upsert":"true"},body:file});if(!r.ok)throw new Error(`画像アップ失敗: ${r.status}`);return`${url}/storage/v1/object/public/case-images/${fn}`;}
async function sbTestConnection(url,key){let r;try{r=await fetch(`${url}/rest/v1/cases?select=id&limit=1`,{headers:sbHeaders(key)});}catch(e){throw new Error(`ネットワークエラー: ${e.message}`);}if(r.status===401)throw new Error("認証エラー");if(!r.ok)throw new Error(`エラー ${r.status}`);return true;}

// ── 金額管理 DB関数 ──────────────────────────────────────────
async function sbGetPriceItems(url,key,caseId){
  // caseIdあり→その事例専用、なし→全件取得
  const filter = caseId ? `&case_id=eq.${caseId}` : '';
  const r=await fetch(`${url}/rest/v1/price_items?select=*&order=sort_order.asc,id.asc${filter}`,{headers:sbHeaders(key)});
  if(!r.ok)return[];
  try{return await r.json();}catch{return[];}
}
async function sbUpsertPriceItem(url,key,item){
  const{id,...data}=item;
  if(id){
    const r=await fetch(`${url}/rest/v1/price_items?id=eq.${id}`,{method:"PATCH",headers:sbHeaders(key),body:JSON.stringify(data)});
    if(!r.ok){const t=await r.text();throw new Error(`更新失敗 ${r.status}: ${t}`);}
    return(await r.json())[0];
  }else{
    const r=await fetch(`${url}/rest/v1/price_items`,{method:"POST",headers:sbHeaders(key),body:JSON.stringify(data)});
    if(!r.ok){const t=await r.text();throw new Error(`追加失敗 ${r.status}: ${t}`);}
    const rows=await r.json();
    return rows[0];
  }
}
async function sbDeletePriceItem(url,key,id){const r=await fetch(`${url}/rest/v1/price_items?id=eq.${id}`,{method:"DELETE",headers:sbHeaders(key,{"Prefer":"return=minimal"})});if(!r.ok)throw new Error("削除失敗");}

function HouseIllust({style}){
  const si=STYLES_DEF[style]||STYLES_DEF["ナチュラル"];
  if(style==="ホテルライク")return(<svg viewBox="0 0 280 180" fill="none" style={{width:"100%",height:"100%"}}><rect width="280" height="180" fill={si.light}/><rect x="30" y="40" width="220" height="108" fill="#e8e4de"/><rect x="30" y="40" width="220" height="6" fill="#2a2218"/><rect x="55" y="56" width="70" height="50" fill="#c8c0b0" opacity="0.7"/><rect x="140" y="56" width="70" height="50" fill="#c8c0b0" opacity="0.7"/><rect x="120" y="86" width="22" height="62" fill="#2a2218"/></svg>);
  if(style==="和モダン")return(<svg viewBox="0 0 280 180" fill="none" style={{width:"100%",height:"100%"}}><rect width="280" height="180" fill={si.light}/><polygon points="15,72 140,38 265,72" fill="#3a2e24"/><rect x="25" y="73" width="230" height="75" fill="#d4c4b0"/><rect x="38" y="85" width="50" height="45" fill="#e8e0d0" opacity="0.9"/><rect x="103" y="85" width="50" height="45" fill="#e8e0d0" opacity="0.9"/></svg>);
  if(style==="インダストリアル")return(<svg viewBox="0 0 280 180" fill="none" style={{width:"100%",height:"100%"}}><rect width="280" height="180" fill={si.light}/><rect x="20" y="50" width="240" height="98" fill="#d8d4d0"/><rect x="20" y="50" width="240" height="10" fill="#4a4040"/><rect x="40" y="68" width="60" height="50" fill="#b8b0a8" opacity="0.8"/><rect x="120" y="68" width="60" height="50" fill="#b8b0a8" opacity="0.8"/></svg>);
  if(style==="シンプルモダン")return(<svg viewBox="0 0 280 180" fill="none" style={{width:"100%",height:"100%"}}><rect width="280" height="180" fill={si.light}/><rect x="35" y="48" width="210" height="100" fill="white" stroke="#d8d8d8" strokeWidth="1"/><rect x="35" y="48" width="210" height="5" fill="#4a4a4a"/><rect x="55" y="65" width="80" height="55" fill="#d0e0ec" opacity="0.8"/></svg>);
  if(style==="北欧")return(<svg viewBox="0 0 280 180" fill="none" style={{width:"100%",height:"100%"}}><rect width="280" height="180" fill={si.light}/><polygon points="50,78 140,22 230,78" fill="#4a6b7c"/><rect x="55" y="78" width="170" height="70" fill="#e8f0f5"/><rect x="68" y="86" width="36" height="28" rx="1" fill="white"/><rect x="70" y="88" width="32" height="24" fill="#9cc4d8" opacity="0.75"/></svg>);
  return(<svg viewBox="0 0 280 180" fill="none" style={{width:"100%",height:"100%"}}><rect width="280" height="180" fill={si.light}/><polygon points="30,80 140,25 250,80" fill="#a08050"/><rect x="30" y="78" width="220" height="72" fill="#d4b896"/><rect x="48" y="88" width="38" height="32" rx="2" fill="#c8d9c0" opacity="0.85"/><rect x="170" y="88" width="38" height="32" rx="2" fill="#c8d9c0" opacity="0.85"/><rect x="113" y="108" width="28" height="42" rx="14" fill="#a08050"/></svg>);
}

function CaseImage({c,height=200}){
  const [err,setErr]=useState(false);
  return(<div style={{height,overflow:"hidden",background:STYLES_DEF[c.style]?.light||"#f5f0e8"}}>{c.image&&!err?<img src={c.image} alt={c.title} onError={()=>setErr(true)} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<HouseIllust style={c.style}/>}</div>);
}

function Sec({title,children}){return(<div style={{background:"white",borderRadius:10,border:"1px solid #e8e2d8",overflow:"hidden"}}><div style={{background:"#f5f2ee",padding:"10px 18px",fontSize:12,fontWeight:700,color:"#3a3028",borderBottom:"1px solid #e8e2d8"}}>{title}</div><div style={{padding:18}}>{children}</div></div>);}
const inp={width:"100%",padding:"9px 12px",border:"1px solid #d4cfc5",borderRadius:7,fontSize:13,outline:"none",background:"white",boxSizing:"border-box"};
const sel={width:"100%",padding:"9px 8px",border:"1px solid #d4cfc5",borderRadius:7,fontSize:12,background:"white",boxSizing:"border-box"};
function Lbl({children}){return <div style={{fontSize:11,color:"#6a5a4a",marginBottom:5}}>{children}</div>;}

// プルダウン+自由入力コンボ
function SpecSelect({value,onChange,opts,placeholder=""}){
  const hasOpt=opts.includes(value);
  return(
    <div>
      <select value={hasOpt?value:""} onChange={e=>onChange(e.target.value)} style={sel}>
        <option value="">選択してください</option>
        {opts.map(o=><option key={o} value={o}>{o}</option>)}
        <option value="__custom__">その他（直接入力）</option>
      </select>
      {(!hasOpt&&value)||value==="__custom__"?
        <input value={value==="__custom__"?"":value} onChange={e=>onChange(e.target.value)} style={{...inp,marginTop:4}} placeholder={placeholder||"直接入力"}/>
      :null}
    </div>
  );
}

const SQL_SETUP=`create table cases (
  id bigint generated always as identity primary key,
  data jsonb not null,
  created_at timestamptz default now()
);
alter table cases enable row level security;
create policy "Allow all" on cases
  for all using (true) with check (true);`;

function SetupScreen({onSave}){
  const [url,setUrl]=useState("");const [key,setKey]=useState("");
  const [testing,setTesting]=useState(false);const [status,setStatus]=useState(null);
  const [errMsg,setErrMsg]=useState("");const [copied,setCopied]=useState(false);
  function cleanUrl(raw){let u=raw.trim().replace(/\/$/,"");if(!u.startsWith("http")&&u.length>10)u=`https://${u}.supabase.co`;try{const p=new URL(u);u=p.origin;}catch{}return u;}
  async function handleTest(){if(!url||!key)return;setTesting(true);setStatus(null);const cu=cleanUrl(url);try{await sbTestConnection(cu,key.trim());setStatus("ok");setUrl(cu);}catch(e){setStatus("error");setErrMsg(`試行URL: ${cu}\n${e.message}`);}finally{setTesting(false);}}
  function handleSave(){if(status!=="ok")return;onSave({url:cleanUrl(url),key:key.trim()});}
  return(
    <div style={{minHeight:"100vh",background:"#faf8f5",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px",fontFamily:"'Noto Serif JP','Georgia',serif"}}>
      <div style={{width:"100%",maxWidth:600}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <svg width="48" height="48" viewBox="0 0 28 28" fill="none" style={{margin:"0 auto 12px",display:"block"}}><path d="M14 3L3 11v14h8v-8h6v8h8V11L14 3z" stroke="#c9a96e" strokeWidth="1.5" fill="none" strokeLinejoin="round"/></svg>
          <h1 style={{margin:0,fontSize:22,fontWeight:700}}>間取り検索</h1>
        </div>
        <div style={{background:"white",borderRadius:12,border:"1px solid #e8e2d8",padding:"20px 24px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>① Supabase SQL Editorで実行</div>
          <div style={{position:"relative"}}>
            <pre style={{background:"#1a1612",color:"#c9a96e",padding:"14px 16px",borderRadius:8,fontSize:11,lineHeight:1.7,overflow:"auto",margin:0}}>{SQL_SETUP}</pre>
            <button onClick={()=>{navigator.clipboard.writeText(SQL_SETUP).then(()=>setCopied(true));setTimeout(()=>setCopied(false),2000);}} style={{position:"absolute",top:8,right:8,background:copied?"#4caf50":"#c9a96e",color:"white",border:"none",borderRadius:5,padding:"3px 10px",fontSize:11,cursor:"pointer"}}>{copied?"✓":"コピー"}</button>
          </div>
        </div>
        <div style={{background:"white",borderRadius:12,border:"1px solid #e8e2d8",padding:"20px 24px"}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>② APIキーを入力</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><Lbl>Project URL</Lbl><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" style={inp}/></div>
            <div><Lbl>anon key（eyJ...）</Lbl><input value={key} onChange={e=>setKey(e.target.value)} type="password" style={inp}/></div>
          </div>
          {status==="ok"&&<div style={{marginTop:10,padding:"8px 14px",background:"#e8f5e9",borderRadius:6,color:"#2e7d32",fontSize:13}}>✓ 接続成功！</div>}
          {status==="error"&&<div style={{marginTop:10,padding:"8px 14px",background:"#fce4e4",borderRadius:6,color:"#c0392b",fontSize:12,whiteSpace:"pre-wrap"}}>✕ {errMsg}</div>}
          <div style={{display:"flex",gap:10,marginTop:14}}>
            <button onClick={handleTest} disabled={!url||!key||testing} style={{padding:"10px 20px",border:"1px solid #c9b89a",borderRadius:7,background:"white",cursor:"pointer",fontSize:13}}>{testing?"確認中...":"接続テスト"}</button>
            <button onClick={handleSave} disabled={status!=="ok"} style={{flex:1,padding:"10px",background:status==="ok"?"#1a1612":"#d4cfc5",color:status==="ok"?"#c9a96e":"#9a9090",border:"none",borderRadius:7,fontSize:14,fontWeight:700,cursor:status==="ok"?"pointer":"not-allowed"}}>始める →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureFilter({selected,onChange}){
  const [open,setOpen]=useState({});
  return(
    <div style={{borderTop:"1px solid #f0ebe0",paddingTop:14,marginTop:6}}>
      <div style={{fontSize:11,color:"#8a7a6a",marginBottom:10,fontWeight:600}}>こだわり条件</div>
      {FEAT_CATEGORIES.map(cat=>(
        <div key={cat.label} style={{border:"1px solid #e8e2d8",borderRadius:8,overflow:"hidden",marginBottom:5}}>
          <button onClick={()=>setOpen(p=>({...p,[cat.label]:!p[cat.label]}))} style={{width:"100%",padding:"8px 12px",background:open[cat.label]?"#f5f2ee":"white",border:"none",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,fontWeight:600,color:"#3a3028",fontFamily:"inherit"}}>
            <span>{cat.label}{cat.items.some(i=>selected.includes(i))&&<span style={{marginLeft:6,background:"#c9a96e",color:"white",borderRadius:20,padding:"1px 6px",fontSize:10}}>{cat.items.filter(i=>selected.includes(i)).length}</span>}</span>
            <span style={{fontSize:10,color:"#a89a8a"}}>{open[cat.label]?"▲":"▼"}</span>
          </button>
          {open[cat.label]&&(
            <div style={{padding:"8px 12px",display:"flex",flexWrap:"wrap",gap:4,background:"white",borderTop:"1px solid #f0ebe0"}}>
              {cat.items.map(item=>{const a=selected.includes(item);return(<button key={item} onClick={()=>onChange(item)} style={{padding:"4px 10px",borderRadius:20,border:`1px solid ${a?"#c9a96e":"#e0d8cc"}`,background:a?"#fff8ee":"white",color:a?"#7a5a2a":"#5a4a3a",fontSize:11,fontWeight:a?700:400,cursor:"pointer",fontFamily:"inherit"}}>{item}</button>);})}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ライトボックス
function Lightbox({images,idx,onClose,onPrev,onNext}){
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();if(e.key==="ArrowLeft")onPrev();if(e.key==="ArrowRight")onNext();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[]);
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <img src={images[idx]} onClick={e=>e.stopPropagation()} style={{maxWidth:"90vw",maxHeight:"90vh",objectFit:"contain",borderRadius:8}}/>
      {images.length>1&&<>
        <button onClick={e=>{e.stopPropagation();onPrev();}} style={{position:"absolute",left:20,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.2)",border:"none",borderRadius:"50%",width:44,height:44,color:"white",fontSize:20,cursor:"pointer"}}>‹</button>
        <button onClick={e=>{e.stopPropagation();onNext();}} style={{position:"absolute",right:20,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.2)",border:"none",borderRadius:"50%",width:44,height:44,color:"white",fontSize:20,cursor:"pointer"}}>›</button>
        <div style={{position:"absolute",bottom:20,color:"rgba(255,255,255,.7)",fontSize:13}}>{idx+1} / {images.length}</div>
      </>}
      <button onClick={onClose} style={{position:"absolute",top:16,right:20,background:"none",border:"none",color:"white",fontSize:28,cursor:"pointer"}}>✕</button>
    </div>
  );
}


/* ══════════════════════════════════
   PDF プレゼン資料モーダル
══════════════════════════════════ */
function PdfSelectModal({onClose, onGenerate}) {
  const [name, setName] = useState("");
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,fontFamily:"'Noto Serif JP','Georgia',serif"}}>
      <div style={{background:"white",borderRadius:16,padding:"36px 40px",width:380,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:12}}>📄</div>
        <h2 style={{margin:"0 0 6px",fontSize:19}}>プレゼン資料を作成</h2>
        <p style={{margin:"0 0 22px",color:"#8a7a6a",fontSize:13}}>お客様名を入力してください</p>
        <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&name.trim())onGenerate(name.trim());}}
          placeholder="例: 田中" style={{width:"100%",padding:"10px 14px",border:"1px solid #d4cfc5",borderRadius:8,fontSize:15,outline:"none",marginBottom:20,boxSizing:"border-box",textAlign:"center"}}
          autoFocus/>
        <div style={{fontSize:12,color:"#a89a8a",marginBottom:16}}>「◯◯様邸おすすめプラン」の形式で表紙に表示されます</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",border:"1px solid #d4cfc5",borderRadius:8,background:"white",cursor:"pointer",fontSize:13}}>キャンセル</button>
          <button onClick={()=>{if(name.trim())onGenerate(name.trim());}} disabled={!name.trim()}
            style={{flex:2,padding:"10px",background:name.trim()?"#1a1612":"#d4cfc5",color:name.trim()?"#c9a96e":"#9a9090",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:name.trim()?"pointer":"not-allowed"}}>
            PDF を作成 →
          </button>
        </div>
      </div>
    </div>
  );
}

function PdfPrintModal({c, customerName, similarCases, onClose, priceItemsForPdf=[]}) {
  // ── v0デザイントークン（globals.cssから忠実に変換）──────────
  // oklch(0.98 0.005 250)=背景, oklch(0.30 0.08 250)=primary(navy)
  const V = {
    bg:        "#f5f7fa",   // background (secondary も同系)
    card:      "#ffffff",   // card
    fg:        "#252d3d",   // foreground
    primary:   "#1e3a5f",   // primary (navy)
    primaryFg: "#f5f7fa",   // primary-foreground
    secondary: "#edf0f5",   // secondary (薄い青グレー)
    muted:     "#5c6b7a",   // muted-foreground
    border:    "#d0d8e4",   // border
    accent:    "#3a6090",   // accent
  };
  const SERIF = "Georgia,'Noto Serif JP','Times New Roman',serif";
  const SANS  = "'Hiragino Kaku Gothic ProN','Meiryo','Yu Gothic',sans-serif";

  const mainImage   = c.image||"";
  const floorImages = (c.floorImages||[]).filter(Boolean);  // 間取り画像
  const parsImages  = (c.images||[]).filter(Boolean);       // パース・内観
  const subImages   = floorImages; // 後方互換: floorCardで使用
  const f1rooms    = (c.rooms||[]).filter(r=>r.floor===1);
  const f2rooms    = (c.rooms||[]).filter(r=>r.floor===2);
  const today      = new Date().toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'});
  const sp         = c.specs||{};

  // 予算→万円
  function parseMid(str) {
    if(!str) return 0;
    const n=(str.match(/[\d,]+/g)||[]).map(s=>parseInt(s.replace(/,/g,""),10));
    if(!n.length) return 0;
    if(str.startsWith("〜")) return n[0];
    if(str.endsWith("〜"))   return n[0]*1.1;
    return (n[0]+(n[1]||n[0]))/2;
  }
  const midMan = parseMid(c.budget);
  const fmtYen = v => v>0 ? "¥"+Math.round(v*10000).toLocaleString() : "—";

  // ── 共通HTML部品 ─────────────────────────────────────────
  function hdr() {
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 44px;background:#ffffff;border-bottom:2px solid ${V.border};flex-shrink:0;position:relative;z-index:10;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:38px;height:38px;background:${V.primary};border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:20px;color:white;">🏠</div>
        <div>
          <p style="font-size:15px;font-weight:700;letter-spacing:.12em;color:${V.fg};font-family:${SANS};margin:0 0 2px;">Tatsuken Archi Design</p>
          <p style="font-size:12px;color:${V.muted};font-family:${SANS};margin:0;">Architectural Presentation</p>
        </div>
      </div>
      <div style="text-align:right;font-family:${SANS};">
        <p style="font-size:10px;color:${V.muted};margin:0 0 2px;">作成日</p>
        <p style="font-size:14px;font-weight:600;color:${V.fg};margin:0;">${today}</p>
      </div>
    </div>`;
  }

  // P2以降: ヘッダーなし（空）
  function pageHdr(title) {
    return "";
  }

  function secTitle(text) {
    return `<div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;">
      <h3 style="font-family:${SERIF};font-size:22px;font-weight:500;color:${V.fg};white-space:nowrap;">${text}</h3>
      <div style="flex:1;height:1px;background:${V.border};"></div>
    </div>`;
  }

  // ── P1: Header + Hero + Specs ─────────────────────────────
  function p1Html() {
    const landArea  = c.area?.land||"";
    const totalArea = c.area?.total||"";
    const tsuboLand  = landArea  ? "（"+(Number(landArea) /3.306).toFixed(2)+"坪）":"";
    const tsuboTotal = c.tsubo   ? "（"+c.tsubo+"坪）"
                     : totalArea ? "（"+(Number(totalArea)/3.306).toFixed(2)+"坪）":"";
    return `
    ${hdr()}
    <!-- P1: 左テキスト+面積カード / 右2×2写真グリッド -->
    <div style="flex:1;background:white;display:flex;flex-direction:column;padding:20px 36px;gap:16px;overflow:hidden;position:relative;z-index:1;">
      <div style="display:grid;grid-template-columns:45% 55%;gap:20px;flex:1;min-height:0;">
        <!-- 左: テキスト + 面積カード -->
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div style="background:transparent;border-radius:6px;padding:32px 36px;flex:1;display:flex;flex-direction:column;justify-content:center;">
            <p style="font-size:13px;letter-spacing:.22em;color:${V.primary};text-transform:uppercase;margin-bottom:12px;font-family:${SANS};">${customerName}様邸</p>
            <h2 style="font-family:${SERIF};font-size:38px;font-weight:500;letter-spacing:-.01em;color:${V.fg};line-height:1.3;margin:0 0 18px;">${c.title||""}</h2>
            <p style="font-size:14px;line-height:1.85;color:${V.muted};margin:0 0 24px;font-family:${SANS};white-space:pre-line;">${c.subtitle||""}</p>
            <div style="display:flex;align-items:center;gap:14px;">
              <div style="width:44px;height:1px;background:${V.primary};"></div>
              <span style="font-size:11px;letter-spacing:.28em;color:${V.muted};text-transform:uppercase;font-family:${SANS};">Design Concept</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div style="background:${V.secondary};border-radius:6px;padding:16px 20px;display:flex;align-items:center;gap:12px;">
              <span style="color:${V.primary};font-size:20px;">📐</span>
              <div>
                <p style="font-size:10px;letter-spacing:.12em;color:${V.muted};font-family:${SANS};margin-bottom:3px;">敷地面積</p>
                <p style="font-size:16px;font-weight:600;color:${V.fg};font-family:${SANS};">${landArea?landArea+"m²":"—"} <span style="font-size:12px;font-weight:400;color:${V.muted};">${tsuboLand}</span></p>
              </div>
            </div>
            <div style="background:${V.secondary};border-radius:6px;padding:16px 20px;display:flex;align-items:center;gap:12px;">
              <span style="color:${V.primary};font-size:20px;">🏠</span>
              <div>
                <p style="font-size:10px;letter-spacing:.12em;color:${V.muted};font-family:${SANS};margin-bottom:3px;">延床面積</p>
                <p style="font-size:16px;font-weight:600;color:${V.fg};font-family:${SANS};">${totalArea?totalArea+"m²":"—"} <span style="font-size:12px;font-weight:400;color:${V.muted};">${tsuboTotal}</span></p>
              </div>
            </div>
          </div>
        </div>
        <!-- 右: 写真2×2グリッド（最大4枚） -->
        <div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:8px;min-height:0;">
          ${[mainImage,...parsImages.slice(0,3)].filter(Boolean).slice(0,4).map(img=>`
            <div style="border-radius:5px;overflow:hidden;background:#c5d5e5;">
              <img src="${img}" style="width:100%;height:100%;object-fit:cover;display:block;"/>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
  }

  // ── 間取りカード共通 ─────────────────────────────────────
  function floorCard(img,label,rooms) {
    const jyouTotal = rooms.reduce((s,r)=>s+(parseFloat(r.jyou)||0),0);
    const tags = rooms.map(r=>`<span style="background:${V.card};color:${V.fg};padding:4px 10px;border-radius:3px;font-size:12px;display:inline-block;margin:0 5px 5px 0;font-family:${SANS};">${r.name}${r.jyou?"（"+r.jyou+"帖）":""}</span>`).join('');
    return `<div style="background:${V.secondary};border-radius:6px;overflow:hidden;flex:1;display:flex;flex-direction:column;min-height:0;">
      <div style="flex:1;overflow:hidden;background:${V.secondary};position:relative;min-height:0;display:flex;align-items:center;justify-content:center;">
        ${img?`<img src="${img}" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;"/>`:`<div style="display:flex;align-items:center;justify-content:center;font-size:80px;">🏠</div>`}
        <div style="position:absolute;bottom:12px;left:12px;background:${V.primary};padding:5px 14px;border-radius:3px;">
          <span style="color:white;font-size:13px;font-weight:600;font-family:${SANS};">${label}</span>
        </div>
      </div>
      <div style="padding:14px 18px;background:${V.secondary};flex-shrink:0;">
        ${jyouTotal>0?`<p style="font-size:12px;color:${V.muted};font-family:${SANS};margin-bottom:8px;">床面積: <span style="font-weight:600;color:${V.fg};font-size:14px;">${jyouTotal.toFixed(1)}㎡</span></p>`:""}
        <div style="display:flex;flex-wrap:wrap;">${tags}</div>
      </div>
    </div>`;
  }

  // ── P2: 1F間取り（1枚フル） ───────────────────────────────
  function p2Html() {
    const label1 = c.floors==="平屋"?"平屋":"1階";
    return `
    <div style="flex:1;background:${V.card};display:flex;flex-direction:column;padding:16px 32px 16px;gap:0;overflow:hidden;">
      ${secTitle("間取りプラン")}
      ${floorCard(subImages[0],label1,f1rooms)}
    </div>`;
  }

  // ── P2b: 2F間取り（2階建てのみ追加） ─────────────────────
  function p2bHtml() {
    return `
    <div style="flex:1;background:${V.card};display:flex;flex-direction:column;padding:16px 32px 16px;gap:0;overflow:hidden;">
      ${secTitle("間取りプラン（2階）")}
      ${floorCard(subImages[1],"2階",f2rooms)}
    </div>`;
  }

  // ── P3: インテリア + 設備 ─────────────────────────────────
  function p3Html() {
    const iImgs   = parsImages.slice(0,4);  // パース画像を使用
    const iLabels = ["リビング・ダイニング","キッチン","主寝室","バスルーム"];
    const imgCards = iImgs.map((img,i)=>`
      <div>
        <div style="border-radius:4px;overflow:hidden;aspect-ratio:4/3;background:#c5d5e5;">
          <img src="${img}" style="width:100%;height:100%;object-fit:cover;display:block;"/>
        </div>
        <p style="margin:12px 0 0;font-size:14px;font-weight:500;color:${V.fg};font-family:${SANS};">${iLabels[i]||"写真"+(i+1)}</p>
      </div>`).join('');

    const specCats = [
      {icon:"🌡",label:"断熱・気密",items:[
        sp.floorInsulation&&`床断熱: ${sp.floorInsulation}`,
        sp.wallInsulation&&`壁断熱: ${sp.wallInsulation}`,
        sp.ceilingInsulation&&`天井: ${sp.ceilingInsulation}`,
        sp.sash&&sp.sash,
        sp.insulationGrade&&`断熱等級${sp.insulationGrade}`,
        sp.ventilation&&`全熱交換換気（${sp.ventilation}種）`,
      ].filter(Boolean)},
      {icon:"🏗",label:"構造・耐震",items:[
        sp.quakeGrade&&`耐震等級${sp.quakeGrade}相当`,
        sp.damper==="有"&&"制震ダンパー採用",
        c.structure&&`${c.structure}工法`,
        sp.longLife==="有"&&"長期優良住宅対応",
      ].filter(Boolean)},
      {icon:"🔧",label:"設備・内装",items:[
        sp.kitchen&&`システムキッチン（${sp.kitchen}）`,
        sp.bath&&`ユニットバス（${sp.bath}）`,
        sp.washroom&&`洗面台（${sp.washroom}）`,
        sp.toilet&&`トイレ（${sp.toilet}）`,
        sp.floorMaterial&&sp.floorMaterial,
      ].filter(Boolean)},
      {icon:"⚡",label:"省エネ・スマート",items:[
        sp.solarKw&&`太陽光発電（${sp.solarKw}kW）`,
        sp.batteryKwh&&`蓄電池（${sp.batteryKwh}kWh）`,
      ].filter(Boolean)},
    ];
    const specCards = specCats.map(cat=>`
      <div style="border:1px solid ${V.border};border-radius:6px;background:${V.card};padding:20px 18px;display:flex;flex-direction:column;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="width:40px;height:40px;border-radius:5px;background:${V.primary}18;display:flex;align-items:center;justify-content:center;font-size:20px;">${cat.icon}</div>
          <h4 style="font-size:15px;font-weight:600;color:${V.fg};font-family:${SANS};">${cat.label}</h4>
        </div>
        <ul style="list-style:none;margin:0;padding:0;flex:1;">
          ${cat.items.length>0
            ?cat.items.map(it=>`<li style="display:flex;align-items:flex-start;gap:8px;font-size:13px;color:${V.muted};padding:7px 0;border-bottom:1px solid ${V.border}30;font-family:${SANS};"><span style="margin-top:7px;width:6px;height:6px;min-width:6px;border-radius:50%;background:${V.primary}60;"></span>${it}</li>`).join('')
            :`<li style="font-size:13px;color:#b0bec5;font-family:${SANS};">未設定</li>`}
        </ul>
      </div>`).join('');

    const highlights = (c.highlights||[]).filter(Boolean);
    const hlHtml = highlights.map((h,i)=>`
      <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;background:${V.card};border-radius:4px;border:1px solid ${V.border};">
        <div style="width:26px;height:26px;min-width:26px;border-radius:50%;background:${V.primary};color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;font-family:${SANS};">${i+1}</div>
        <p style="font-size:15px;line-height:1.75;color:${V.fg};margin:0;padding-top:3px;font-family:${SANS};">${h}</p>
      </div>`).join('');
    return `
    <div style="flex:1;background:${V.card};display:flex;flex-direction:column;padding:22px 36px 22px;gap:0;overflow:hidden;">
      ${c.concept?`
      <div style="margin-bottom:16px;min-height:86mm;display:flex;flex-direction:column;justify-content:center;">
        ${secTitle("コンセプト")}
        <p style="font-size:18px;line-height:2.2;color:${V.fg};margin:0;font-family:${SANS};">${c.concept}</p>
      </div>`:""}
      ${highlights.length>0?`
      <div style="margin-bottom:14px;">
        ${secTitle("デザインハイライト")}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">${hlHtml}</div>
      </div>`:""}
      <div style="flex:1;display:flex;flex-direction:column;min-height:0;">
        ${secTitle("標準設備・仕様")}
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:14px;flex:1;min-height:0;">${specCards}</div>
      </div>
    </div>`;
  }

  // ── P4: 見積り + フッター ─────────────────────────────────
  function p4Html() {
    // 金額管理データ優先、なければ予算から自動計算
    function calcAmt(item){ return item.calc_type==="unit_price"?(Number(item.unit_price)||0)*(Number(item.quantity)||1):(Number(item.amount)||0); }
    // この事例専用 or グローバルテンプレートのみ
    const clientItems = (priceItemsForPdf||[]).filter(p=>p.display_client&&(p.case_id===c._sbId||!p.case_id));
    const hasPriceData = clientItems.length>0;
    const pdfTotal = hasPriceData ? clientItems.reduce((s,p)=>s+calcAmt(p),0) : (()=>{
      const honTai=midMan>0?Math.round(midMan*0.78):0;
      const futai=midMan>0?Math.round(midMan*0.09):0;
      const shohi=midMan>0?Math.round(midMan*0.07):0;
      const option=Math.round((Number(sp.solarKw||0)*30)+(Number(sp.batteryKwh||0)*15));
      return honTai+futai+shohi+option;
    })();

    // 行HTML生成
    let rowHtml = "";
    if(hasPriceData) {
      // カテゴリ別に集計
      const cats=[...new Set(clientItems.map(p=>p.category))];
      rowHtml = cats.map(cat=>{
        const items=clientItems.filter(p=>p.category===cat);
        const catTotal=items.reduce((s,p)=>s+calcAmt(p),0);
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid ${V.border};">
          <p style="font-size:15px;font-weight:500;color:${V.fg};font-family:${SANS};">${cat}</p>
          <p style="font-size:16px;font-weight:600;color:${V.fg};font-family:${SANS};">¥${catTotal.toLocaleString()}</p>
        </div>`;
      }).join('');
    } else {
      const honTai=midMan>0?Math.round(midMan*0.78):0;
      const futai=midMan>0?Math.round(midMan*0.09):0;
      const shohi=midMan>0?Math.round(midMan*0.07):0;
      const option=Math.round((Number(sp.solarKw||0)*30)+(Number(sp.batteryKwh||0)*15));
      rowHtml=[
        {label:"本体工事費",note:"建物本体・標準設備含む",val:honTai},
        {label:"付帯工事費",note:"外構・地盤改良・給排水等",val:futai},
        {label:"諸費用",note:"登記・ローン諸費用・各種申請等",val:shohi},
        {label:"オプション費",note:"太陽光・蓄電池・採用設備等",val:option},
      ].map(r=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid ${V.border};">
        <div>
          <p style="font-size:15px;font-weight:500;color:${V.fg};font-family:${SANS};">${r.label}</p>
          <p style="font-size:11px;color:${V.muted};margin-top:2px;font-family:${SANS};">${r.note}</p>
        </div>
        <p style="font-size:16px;font-weight:500;color:${V.fg};font-family:${SANS};">${r.val>0?"¥"+r.val.toLocaleString():"—"}</p>
      </div>`).join('');
    }

    return `

    <section style="background:${V.card};padding:40px 40px 28px;">
      ${secTitle("概算建築費")}
      <div style="border:1px solid ${V.border};border-radius:6px;overflow:hidden;background:${V.bg};">
        <div>${rowHtml}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:22px 28px;background:${V.primary};">
          <p style="font-size:16px;font-weight:600;color:white;font-family:${SANS};">合計金額</p>
          <p style="font-size:28px;font-weight:800;color:white;font-family:${SANS};">¥${pdfTotal>0?pdfTotal.toLocaleString():(c.budget||"—")}</p>
        </div>
      </div>
      <p style="font-size:11px;color:${V.muted};margin-top:12px;font-family:${SANS};">※本価格は概算です。敷地条件・仕様選定・法規条件・施工条件により変動する場合があります。</p>
    </section>
    <!-- Footer -->
    <section style="background:${V.card};border-top:1px solid ${V.border};padding:32px 40px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:28px;">
        <div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <div style="width:38px;height:38px;background:${V.primary};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:18px;color:white;">🏠</div>
            <div>
              <p style="font-size:12px;color:${V.muted};font-family:${SANS};">タツケン</p>
              <p style="font-size:16px;font-weight:500;color:${V.fg};font-family:${SANS};">Tatsuken Archi Design</p>
            </div>
          </div>
          <p style="font-size:13px;color:${V.muted};font-family:${SANS};">担当：${customerName}様邸 担当者</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;padding-top:4px;">
          <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:${V.muted};font-family:${SANS};">📍 兵庫県姫路市南条639</div>
          <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:${V.muted};font-family:${SANS};">📞 079-280-3181</div>
        </div>
      </div>
      <div style="border-top:1px solid ${V.border};padding-top:20px;text-align:center;">
        <p style="font-size:11px;color:${V.muted};font-family:${SANS};">本プレゼンテーションボードの内容は企画段階のものであり、実際の仕様と異なる場合があります。</p>
      </div>
    </section>`;
  }

  // ── 新ウィンドウ印刷 ──────────────────────────────────────
  function doPrint() {
    const isTwoStory = c.floors==="2階建て" || f2rooms.length>0;
    const pages = [p1Html(),p2Html(),...(isTwoStory?[p2bHtml()]:[]),p3Html(),p4Html(priceItemsForPdf)];
    const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"/>
<style>@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}</style>
<style>
  @page{size:A3 landscape;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Hiragino Kaku Gothic ProN','Meiryo','Yu Gothic',sans-serif;background:white;}
  .page{width:420mm;height:297mm;page-break-after:always;overflow:hidden;display:flex;flex-direction:column;background:white;position:relative;}
  section{flex-shrink:0;}
  img{display:block;}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
</style></head><body>
${pages.map(p=>`<div class="page">${p}</div>`).join('\n')}
</body></html>`;
    const win = window.open('','_blank','width=1500,height=960');
    if(!win){alert('ポップアップを許可してから再試行してください');return;}
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = ()=>{ setTimeout(()=>{ win.focus(); win.print(); }, 1500); };
  }

  // ── JSXプレビュー ─────────────────────────────────────────
  const SCALE = 0.34;
  const PW = Math.round(420*3.7795*SCALE);
  const PH = Math.round(297*3.7795*SCALE);

  // P1用ヘッダー（写真背景スタイル）
  const HDR = ()=>(
    <div style={{position:"relative",height:68,overflow:"hidden",flexShrink:0}}>
      {mainImage&&<img src={mainImage} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>}
      <div style={{position:"absolute",inset:0,background:"#ffffff"}}/>
      <div style={{position:"relative",height:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 44px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:36,height:36,background:V.primary,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"white"}}>🏠</div>
          <p style={{fontSize:16,fontWeight:700,letterSpacing:".12em",color:"white",margin:0}}>Tatsuken Archi Design</p>
        </div>
        <div style={{textAlign:"right"}}>
          <p style={{fontSize:10,color:"rgba(255,255,255,.6)",marginBottom:2}}>作成日</p>
          <p style={{fontSize:14,fontWeight:600,color:"white",margin:0}}>{today}</p>
        </div>
      </div>
    </div>
  );
  // P2以降: ヘッダーなし
  const PhotoHDR = ()=>null;
  const SecTitle = ({text})=>(
    <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
      <h3 style={{fontFamily:SERIF,fontSize:22,fontWeight:500,color:V.fg,whiteSpace:"nowrap"}}>{text}</h3>
      <div style={{flex:1,height:1,background:V.border}}/>
    </div>
  );

  const previews = [
    {label:"P1 表紙",node:(
      <div style={{width:"420mm",height:"297mm",background:"white",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <HDR/>
        <div style={{flex:1,background:"white",display:"flex",flexDirection:"column",padding:"20px 36px",gap:16,overflow:"hidden"}}>
          {/* ヒーロー: secondaryブロックの上下が画像に合う */}
          <div style={{display:"grid",gridTemplateColumns:"50% 50%",background:V.secondary,borderRadius:6,overflow:"hidden",flex:1,minHeight:0}}>
            <div style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:"44px 44px 40px 44px"}}>
              <p style={{fontSize:15,letterSpacing:".22em",color:V.primary,textTransform:"uppercase",marginBottom:14}}>{customerName}様邸</p>
              <h2 style={{fontFamily:SERIF,fontSize:44,fontWeight:500,color:V.fg,lineHeight:1.3,margin:"0 0 22px"}}>{c.title||""}</h2>
              <p style={{fontSize:16,lineHeight:1.85,color:V.muted,margin:"0 0 32px",whiteSpace:"pre-line"}}>{c.subtitle||""}</p>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <div style={{width:52,height:1,background:V.primary}}/>
                <span style={{fontSize:12,letterSpacing:".28em",color:V.muted}}>Design Concept</span>
              </div>
            </div>
            <div style={{overflow:"hidden",display:"flex",alignItems:"stretch"}}>
              {mainImage
                ?<img src={mainImage} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                :<div style={{width:"100%",background:"#c5d5e5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:80}}>🏠</div>}
            </div>
          </div>
          {/* 面積: 個別にsecondaryカード・周囲は白余白 */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,flexShrink:0}}>
            {[
              {icon:"📐",label:"敷地面積",v:c.area?.land?c.area.land+"m²":"—",t:c.area?.land?"（"+(Number(c.area.land)/3.306).toFixed(2)+"坪）":""},
              {icon:"🏠",label:"延床面積",v:c.area?.total?c.area.total+"m²":"—",t:c.tsubo?"（"+c.tsubo+"坪）":c.area?.total?"（"+(Number(c.area.total)/3.306).toFixed(2)+"坪）":""}
            ].map((s,i)=>(
              <div key={i} style={{background:V.secondary,borderRadius:6,padding:"22px 32px",display:"flex",alignItems:"center",gap:18}}>
                <span style={{color:V.primary,fontSize:26}}>{s.icon}</span>
                <div>
                  <p style={{fontSize:12,letterSpacing:".14em",color:V.muted,marginBottom:5}}>{s.label}</p>
                  <p style={{fontSize:22,fontWeight:600,color:V.fg}}>{s.v} <span style={{fontSize:15,fontWeight:400,color:V.muted}}>{s.t}</span></p>
                </div>
              </div>
            ))}
          </div>
          {/* パース4枚 */}
          {subImages.slice(2,6).length>0&&(
            <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(parsImages.slice(0,4).length,4)},1fr)`,gap:10,flexShrink:0}}>
              {parsImages.slice(0,3).filter(Boolean).map((img,i)=>(
                <div key={i} style={{borderRadius:5,overflow:"hidden",aspectRatio:"4/3",background:"#c5d5e5"}}>
                  <img src={img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )},
    {label:"P2 1F間取り",node:(
      <div style={{width:"420mm",height:"297mm",background:V.card,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{flex:1,background:V.card,display:"flex",flexDirection:"column",padding:"20px 32px 20px",overflow:"hidden"}}>
          <SecTitle text="間取りプラン"/>
          <div style={{background:V.secondary,borderRadius:6,overflow:"hidden",flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
            <div style={{flex:1,overflow:"hidden",background:"#c5d5e5",position:"relative",minHeight:0}}>
              {floorImages[0]?<img src={floorImages[0]} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:80}}>🏠</div>}
              <div style={{position:"absolute",bottom:14,left:14,background:V.primary,padding:"6px 18px",borderRadius:3}}><span style={{color:"white",fontSize:14,fontWeight:600}}>{c.floors==="平屋"?"平屋":"1階"}</span></div>
            </div>
            <div style={{padding:"20px 24px",background:V.secondary}}>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{f1rooms.map((r,j)=><span key={j} style={{background:V.card,color:V.fg,padding:"5px 12px",borderRadius:3,fontSize:12}}>{r.name}{r.jyou?"（"+r.jyou+"帖）":""}</span>)}</div>
            </div>
          </div>
        </div>
      </div>
    )},
    ...(c.floors==="2階建て"?[{label:"P3 2F間取り",node:(
      <div style={{width:"420mm",height:"297mm",background:V.card,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{flex:1,background:V.card,display:"flex",flexDirection:"column",padding:"20px 32px 20px",overflow:"hidden"}}>
          <SecTitle text="間取りプラン（2階）"/>
          <div style={{background:V.secondary,borderRadius:6,overflow:"hidden",flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
            <div style={{flex:1,overflow:"hidden",background:"#c5d5e5",position:"relative",minHeight:0}}>
              {floorImages[1]?<img src={floorImages[1]} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:80}}>🏠</div>}
              <div style={{position:"absolute",bottom:14,left:14,background:V.primary,padding:"6px 18px",borderRadius:3}}><span style={{color:"white",fontSize:14,fontWeight:600}}>2階</span></div>
            </div>
            <div style={{padding:"20px 24px",background:V.secondary}}>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{f2rooms.map((r,j)=><span key={j} style={{background:V.card,color:V.fg,padding:"5px 12px",borderRadius:3,fontSize:12}}>{r.name}{r.jyou?"（"+r.jyou+"帖）":""}</span>)}</div>
            </div>
          </div>
        </div>
      </div>
    )}]:[]),
    {label:"P(n) コンセプト+ハイライト+設備",node:(
      <div style={{width:"420mm",height:"297mm",background:V.bg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* P2以降ヘッダーなし */}
        <div style={{flex:1,background:V.card,display:"flex",flexDirection:"column",padding:"20px 36px 20px",gap:0,overflow:"hidden"}}>
          {c.concept&&(
            <div style={{marginBottom:14}}>
              <SecTitle text="コンセプト"/>
              <p style={{fontSize:17,lineHeight:2.1,color:V.fg,margin:0}}>{c.concept}</p>
            </div>
          )}
          {(c.highlights||[]).filter(Boolean).length>0&&(
            <div style={{marginBottom:14}}>
              <SecTitle text="デザインハイライト"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                {(c.highlights||[]).filter(Boolean).map((h,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 13px",background:V.secondary,borderRadius:4}}>
                    <div style={{width:24,height:24,minWidth:24,borderRadius:"50%",background:V.primary,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{i+1}</div>
                    <p style={{fontSize:13,lineHeight:1.7,color:V.fg,margin:0,paddingTop:2}}>{h}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
            <SecTitle text="標準設備・仕様"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,flex:1}}>
              {[{icon:"🌡",l:"断熱・気密"},{icon:"🏗",l:"構造・耐震"},{icon:"🔧",l:"設備・内装"},{icon:"⚡",l:"省エネ"}].map((cat,i)=>(
                <div key={i} style={{border:`1px solid ${V.border}`,borderRadius:5,background:V.card,padding:"16px 14px",display:"flex",flexDirection:"column"}}>
                  <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
                    <div style={{width:34,height:34,borderRadius:4,background:V.primary+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{cat.icon}</div>
                    <h4 style={{fontSize:13,fontWeight:600,color:V.fg,margin:0}}>{cat.l}</h4>
                  </div>
                  <div style={{fontSize:11,color:V.muted}}>各種仕様</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )},
    {label:"P(n+1) 概算建築費+フッター",node:(
      <div style={{width:"420mm",height:"297mm",background:V.card,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <PhotoHDR/>
        <div style={{background:V.card,padding:"28px 36px 20px",flex:1}}>
          <SecTitle text="概算建築費"/>
          <div style={{border:`1px solid ${V.border}`,borderRadius:6,overflow:"hidden",background:V.bg}}>
            {(()=>{
              function ca(item){return item.calc_type==="unit_price"?(Number(item.unit_price)||0)*(Number(item.quantity)||1):(Number(item.amount)||0);}
              const ci=(priceItemsForPdf||[]).filter(p=>p.display_client);
              const hasPD=ci.length>0;
              const total=hasPD?ci.reduce((s,p)=>s+ca(p),0):0;
              const rows=hasPD?[...new Set(ci.map(p=>p.category))].map(cat=>({label:cat,val:ci.filter(p=>p.category===cat).reduce((s,p)=>s+ca(p),0)}))
                :[{label:"本体工事費",val:0},{label:"付帯工事費",val:0},{label:"諸費用",val:0}];
              return(<>
                {rows.map((r,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 22px",borderBottom:`1px solid ${V.border}`,background:V.bg}}>
                    <span style={{fontSize:14,fontWeight:500,color:V.fg}}>{r.label}</span>
                    <span style={{fontSize:14,fontWeight:600,color:V.fg}}>{r.val>0?"¥"+r.val.toLocaleString():"—"}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 22px",background:V.primary}}>
                  <span style={{fontSize:15,color:"white",fontWeight:600}}>合計金額</span>
                  <span style={{fontSize:24,color:"white",fontWeight:800}}>{total>0?"¥"+total.toLocaleString():(c.budget||"—")}</span>
                </div>
              </>);
            })()}
          </div>
          <p style={{fontSize:11,color:V.muted,marginTop:10}}>※本価格は概算です。敷地条件・仕様・法規条件により変動する場合があります。</p>
        </div>
        <div style={{background:V.card,borderTop:`1px solid ${V.border}`,padding:"24px 40px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,background:V.primary,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:18}}>🏠</div>
            <div><p style={{fontSize:12,color:V.muted}}>タツケン</p><p style={{fontSize:15,fontWeight:500,color:V.fg}}>Tatsuken Archi Design</p></div>
          </div>
          <div style={{textAlign:"right",fontSize:12,color:V.muted,lineHeight:1.9}}>
            <div>📍 兵庫県姫路市南条639</div><div>📞 079-280-3181</div>
          </div>
        </div>
        <div style={{background:V.bg,borderTop:`1px solid ${V.border}`,padding:"10px 40px",textAlign:"center",fontSize:10,color:V.muted}}>
          本プレゼンテーションボードの内容は企画段階のものであり、実際の仕様と異なる場合があります。
        </div>
      </div>
    )},
  ];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(5,15,35,.90)",zIndex:600,overflowY:"auto",display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 16px",fontFamily:SANS}}>
      <div style={{background:"white",borderRadius:10,padding:"16px 24px",width:"100%",maxWidth:1000,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <h2 style={{margin:0,fontSize:16,fontWeight:600,color:V.fg}}>プレゼン資料プレビュー</h2>
          <p style={{margin:"3px 0 0",fontSize:12,color:V.muted}}>A3横 / {previews.length}ページ / {customerName}様邸</p>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{padding:"8px 18px",border:`1px solid ${V.border}`,borderRadius:6,background:"white",cursor:"pointer",fontSize:13,color:V.fg}}>閉じる</button>
          <button onClick={doPrint} style={{padding:"8px 26px",background:V.primary,color:"white",border:"none",borderRadius:6,fontSize:14,fontWeight:600,cursor:"pointer"}}>📥 PDF保存 / 印刷</button>
        </div>
      </div>
      <div style={{background:"rgba(30,58,95,.2)",border:"1px solid rgba(100,160,230,.3)",borderRadius:7,padding:"9px 16px",width:"100%",maxWidth:1000,marginBottom:14,fontSize:12,color:"#90c0f0",flexShrink:0}}>
        💡 「PDF保存 / 印刷」→ 新ウィンドウ → 用紙 <b>A3</b>・向き <b>横</b>・余白 <b>なし</b>・「PDFに保存」
      </div>
      <div style={{display:"flex",gap:16,overflowX:"auto",padding:"4px 4px 14px",width:"100%",maxWidth:1000,flexShrink:0}}>
        {previews.map((page,i)=>(
          <div key={i} style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,.65)"}}>{page.label}</div>
            <div style={{width:PW+"px",height:PH+"px",overflow:"hidden",borderRadius:6,border:"1px solid rgba(255,255,255,.2)",background:V.bg}}>
              <div style={{transform:`scale(${SCALE})`,transformOrigin:"top left",pointerEvents:"none"}}>{page.node}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{height:16}}/>
    </div>
  );
}



// ══════════════════════════════════════════════════════════
// 金額管理コンポーネント
// ══════════════════════════════════════════════════════════

const PRICE_CATEGORIES = ["建物本体","付帯工事","外構","カーテン","エアコン","TVアンテナ","地盤改良工事","オプション","設計申請","その他"];
const CALC_TYPES = [{v:"fixed",l:"固定金額"},{v:"unit_price",l:"数量×単価"},{v:"differential",l:"標準差額"},{v:"manual",l:"手入力"}];

const EMPTY_PRICE_ITEM = {
  category:"建物本体", name:"", calc_type:"fixed",
  amount:0, unit_price:0, quantity:1,
  display_client:true, display_internal:true,
  sort_order:0, note:"", valid_from:"", valid_to:""
};

function PriceAdmin({config, priceItems, setPriceItems}) {
  const [editItem, setEditItem] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [delConfirm, setDelConfirm] = React.useState(null);
  const inp = {padding:"7px 10px",border:"1px solid #d4cfc5",borderRadius:6,fontSize:13,width:"100%",boxSizing:"border-box"};
  const sel = {...inp};

  function openNew(cat) {
    setEditItem({...EMPTY_PRICE_ITEM, category:cat||"建物本体", sort_order:priceItems.filter(p=>p.category===(cat||"建物本体")).length*10});
  }
  function openEdit(item) { setEditItem({...item}); }

  async function save() {
    if(!editItem.name.trim()){alert("項目名を入力してください");return;}
    setSaving(true);
    try {
      const saved = await sbUpsertPriceItem(config.url,config.key,editItem);
      if(editItem.id) {
        setPriceItems(prev=>prev.map(p=>p.id===saved.id?saved:p));
      } else {
        setPriceItems(prev=>[...prev,saved]);
      }
      setEditItem(null);
    } catch(e){alert("保存失敗: "+e.message);}
    finally{setSaving(false);}
  }

  async function del(id) {
    try{await sbDeletePriceItem(config.url,config.key,id);setPriceItems(prev=>prev.filter(p=>p.id!==id));setDelConfirm(null);}
    catch(e){alert("削除失敗: "+e.message);}
  }

  // カテゴリ別に集計
  const grouped = PRICE_CATEGORIES.reduce((acc,cat)=>{
    const items = priceItems.filter(p=>p.category===cat);
    if(items.length>0) acc[cat]=items;
    return acc;
  },{});
  // 登録済みでないカテゴリも
  const allCats = [...new Set([...PRICE_CATEGORIES,...priceItems.map(p=>p.category)])];

  function calcAmount(item) {
    if(item.calc_type==="unit_price") return (Number(item.unit_price)||0)*(Number(item.quantity)||1);
    return Number(item.amount)||0;
  }
  const totalClient = priceItems.filter(p=>p.display_client).reduce((s,p)=>s+calcAmount(p),0);

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{margin:"0 0 4px",fontSize:20}}>金額内訳の管理</h2>
          <div style={{fontSize:13,color:"#8a7a6a"}}>お客様表示合計: <strong>¥{totalClient.toLocaleString()}</strong></div>
        </div>
        <button onClick={()=>openNew()} style={{padding:"9px 20px",background:"#1e3a5f",color:"white",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",fontWeight:700}}>＋ 項目追加</button>
      </div>

      {/* Supabaseテーブル作成SQL案内 */}
      {priceItems.length===0&&(
        <div style={{background:"#f0f4ff",border:"1px solid #c0d0f0",borderRadius:8,padding:"14px 18px",marginBottom:20,fontSize:12,color:"#3a5a8a"}}>
          <strong>📋 初回セットアップ</strong>: SupabaseのSQL Editorで以下を実行してください:<br/>
          <code style={{display:"block",marginTop:8,padding:"8px",background:"white",borderRadius:4,fontSize:11,whiteSpace:"pre",overflowX:"auto"}}>
{`-- 既にテーブルがある場合はこちらを実行:
ALTER TABLE price_items ADD COLUMN IF NOT EXISTS case_id TEXT;

-- 新規作成の場合:
CREATE TABLE price_items (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL DEFAULT '建物本体',
  name TEXT NOT NULL,
  calc_type TEXT DEFAULT 'fixed',
  amount NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  quantity NUMERIC DEFAULT 1,
  display_client BOOLEAN DEFAULT true,
  display_internal BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  note TEXT DEFAULT '',
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE price_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON price_items FOR ALL USING (true) WITH CHECK (true);`}
          </code>
        </div>
      )}

      {/* カテゴリ別リスト */}
      {allCats.map(cat=>{
        const items = priceItems.filter(p=>p.category===cat);
        if(items.length===0&&!PRICE_CATEGORIES.includes(cat)) return null;
        const catTotal = items.filter(p=>p.display_client).reduce((s,p)=>s+calcAmount(p),0);
        return(
          <div key={cat} style={{background:"white",borderRadius:10,border:"1px solid #e8e2d8",marginBottom:14,overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"#f5f0e8",borderBottom:"1px solid #e8e2d8"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontWeight:700,fontSize:14}}>{cat}</span>
                <span style={{fontSize:12,color:"#8a7a6a"}}>{items.length}項目</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                {catTotal>0&&<span style={{fontSize:13,fontWeight:700,color:"#1a1612"}}>¥{catTotal.toLocaleString()}</span>}
                <button onClick={()=>openNew(cat)} style={{padding:"4px 12px",border:"1px solid #c9b89a",borderRadius:5,background:"white",cursor:"pointer",fontSize:12,color:"#6a5a4a"}}>＋ 追加</button>
              </div>
            </div>
            {items.length===0?(
              <div style={{padding:"12px 16px",fontSize:12,color:"#b0a090"}}>項目なし</div>
            ):(
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#faf8f5"}}>
                  {["項目名","計算方式","金額","お客様表示","社内表示","操作"].map(h=>(
                    <th key={h} style={{padding:"7px 10px",textAlign:"left",color:"#8a7a6a",fontWeight:600,borderBottom:"1px solid #e8e2d8"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {items.sort((a,b)=>a.sort_order-b.sort_order).map(item=>(
                    <tr key={item.id} style={{borderBottom:"1px solid #f0ebe0"}}>
                      <td style={{padding:"8px 10px",fontWeight:500}}>{item.name}</td>
                      <td style={{padding:"8px 10px",color:"#8a7a6a"}}>{CALC_TYPES.find(c=>c.v===item.calc_type)?.l||item.calc_type}</td>
                      <td style={{padding:"8px 10px",fontWeight:600}}>¥{calcAmount(item).toLocaleString()}</td>
                      <td style={{padding:"8px 10px",textAlign:"center"}}>
                        <span style={{background:item.display_client?"#d4edda":"#f8d7da",color:item.display_client?"#155724":"#721c24",padding:"2px 8px",borderRadius:10,fontSize:11}}>
                          {item.display_client?"表示":"非表示"}
                        </span>
                      </td>
                      <td style={{padding:"8px 10px",textAlign:"center"}}>
                        <span style={{background:item.display_internal?"#cce5ff":"#f8d7da",color:item.display_internal?"#004085":"#721c24",padding:"2px 8px",borderRadius:10,fontSize:11}}>
                          {item.display_internal?"表示":"非表示"}
                        </span>
                      </td>
                      <td style={{padding:"8px 10px"}}>
                        <div style={{display:"flex",gap:5}}>
                          <button onClick={()=>openEdit(item)} style={{padding:"3px 10px",border:"1px solid #c9b89a",borderRadius:4,background:"white",cursor:"pointer",fontSize:11}}>編集</button>
                          <button onClick={()=>setDelConfirm(item.id)} style={{padding:"3px 8px",border:"1px solid #f5c6cb",borderRadius:4,background:"#fff5f5",color:"#c0392b",cursor:"pointer",fontSize:11}}>削除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      {/* 編集モーダル */}
      {editItem&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
          <div style={{background:"white",borderRadius:12,padding:"28px 32px",width:540,maxHeight:"90vh",overflowY:"auto"}}>
            <h3 style={{margin:"0 0 20px",fontSize:17}}>{editItem.id?"項目を編集":"新規項目を追加"}</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:4}}>項目名 *</label>
                <input value={editItem.name} onChange={e=>setEditItem(p=>({...p,name:e.target.value}))} style={inp} placeholder="例: 木造軸組工法　本体工事"/>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:4}}>カテゴリ</label>
                <select value={editItem.category} onChange={e=>setEditItem(p=>({...p,category:e.target.value}))} style={sel}>
                  {PRICE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:4}}>計算方式</label>
                <select value={editItem.calc_type} onChange={e=>setEditItem(p=>({...p,calc_type:e.target.value}))} style={sel}>
                  {CALC_TYPES.map(c=><option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
              {editItem.calc_type==="unit_price"?(
                <>
                  <div>
                    <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:4}}>単価（円）</label>
                    <input type="number" value={editItem.unit_price} onChange={e=>setEditItem(p=>({...p,unit_price:Number(e.target.value)}))} style={inp}/>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:4}}>数量</label>
                    <input type="number" value={editItem.quantity} onChange={e=>setEditItem(p=>({...p,quantity:Number(e.target.value)}))} style={inp}/>
                  </div>
                </>
              ):(
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:4}}>金額（円）</label>
                  <input type="number" value={editItem.amount} onChange={e=>setEditItem(p=>({...p,amount:Number(e.target.value)}))} style={inp} placeholder="例: 25000000"/>
                </div>
              )}
              <div>
                <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:4}}>表示順</label>
                <input type="number" value={editItem.sort_order} onChange={e=>setEditItem(p=>({...p,sort_order:Number(e.target.value)}))} style={inp}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,justifyContent:"flex-end"}}>
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
                  <input type="checkbox" checked={editItem.display_client} onChange={e=>setEditItem(p=>({...p,display_client:e.target.checked}))}/>
                  お客様に表示
                </label>
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
                  <input type="checkbox" checked={editItem.display_internal} onChange={e=>setEditItem(p=>({...p,display_internal:e.target.checked}))}/>
                  社内のみ表示
                </label>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:4}}>有効開始日</label>
                <input type="date" value={editItem.valid_from||""} onChange={e=>setEditItem(p=>({...p,valid_from:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:4}}>有効終了日</label>
                <input type="date" value={editItem.valid_to||""} onChange={e=>setEditItem(p=>({...p,valid_to:e.target.value}))} style={inp}/>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:4}}>備考</label>
                <input value={editItem.note||""} onChange={e=>setEditItem(p=>({...p,note:e.target.value}))} style={inp} placeholder="社内メモ"/>
              </div>
            </div>
            <div style={{padding:"10px 14px",background:"#f5f0e8",borderRadius:6,fontSize:13,marginBottom:16,color:"#6a5a4a"}}>
              <strong>計算金額プレビュー:</strong> ¥{(editItem.calc_type==="unit_price"?(Number(editItem.unit_price)||0)*(Number(editItem.quantity)||1):(Number(editItem.amount)||0)).toLocaleString()}
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setEditItem(null)} style={{padding:"9px 20px",border:"1px solid #d4cfc5",borderRadius:7,background:"white",cursor:"pointer",fontSize:13}}>キャンセル</button>
              <button onClick={save} disabled={saving} style={{padding:"9px 24px",background:"#1e3a5f",color:"white",border:"none",borderRadius:7,fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer"}}>
                {saving?"保存中...":"保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認 */}
      {delConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
          <div style={{background:"white",borderRadius:12,padding:"28px 32px",textAlign:"center",maxWidth:300}}>
            <div style={{fontSize:32,marginBottom:10}}>🗑️</div>
            <h3 style={{margin:"0 0 8px"}}>削除しますか？</h3>
            <p style={{color:"#6a5a4a",fontSize:13,margin:"0 0 20px"}}>この操作は取り消せません。</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>setDelConfirm(null)} style={{padding:"8px 18px",border:"1px solid #d4cfc5",borderRadius:6,background:"white",cursor:"pointer"}}>キャンセル</button>
              <button onClick={()=>del(delConfirm)} style={{padding:"8px 18px",background:"#c0392b",color:"white",border:"none",borderRadius:6,cursor:"pointer",fontWeight:700}}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 事例専用金額エディタ（管理フォーム内） ────────────────────
function CasePriceEditor({config, caseId, priceItems, setPriceItems}) {
  const [editItem, setEditItem] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const inp = {padding:"7px 10px",border:"1px solid #d4cfc5",borderRadius:6,fontSize:13,width:"100%",boxSizing:"border-box"};
  const sel = {...inp};

  // この事例に紐づく項目
  const caseId_str = caseId ? String(caseId) : null;
  const caseItems = priceItems.filter(p=>String(p.case_id)===caseId_str);

  function calcAmt(item){ return item.calc_type==="unit_price"?(Number(item.unit_price)||0)*(Number(item.quantity)||1):(Number(item.amount)||0); }
  const total = caseItems.filter(p=>p.display_client).reduce((s,p)=>s+calcAmt(p),0);

  function openNew() {
    setEditItem({category:"建物本体",name:"",calc_type:"fixed",amount:0,unit_price:0,quantity:1,display_client:true,display_internal:true,sort_order:caseItems.length*10,note:"",case_id:caseId_str});
  }

  async function save() {
    if(!editItem.name.trim()){alert("項目名を入力してください");return;}
    if(!caseId){alert("先に事例を保存してから金額を登録してください");return;}
    if(!config?.url||!config?.key){alert("設定エラー: Supabase接続情報がありません");return;}
    setSaving(true);
    try {
      // case_idを文字列として確実に設定
      const item = {...editItem, case_id:String(caseId)};
      // amountを確実に数値に
      if(item.calc_type!=="unit_price"){item.amount=Number(item.amount)||0;}
      console.log("Saving price item:", item);
      const saved = await sbUpsertPriceItem(config.url,config.key,item);
      console.log("Saved:", saved);
      if(!saved){throw new Error("保存結果が空です");}
      if(editItem.id){setPriceItems(prev=>prev.map(p=>p.id===saved.id?saved:p));}
      else{setPriceItems(prev=>[...prev,saved]);}
      // 保存後に全件再読み込みして確実に反映
      sbGetPriceItems(config.url,config.key).then(all=>setPriceItems(all)).catch(()=>{});
      setEditItem(null);
    } catch(e){
      console.error("Price save error:", e);
      alert("保存失敗: "+e.message+" ※SupabaseのSQL Editor: ALTER TABLE price_items ADD COLUMN IF NOT EXISTS case_id TEXT;");
    }
    finally{setSaving(false);}
  }

  async function del(id) {
    if(!window.confirm("削除しますか？"))return;
    try{await sbDeletePriceItem(config.url,config.key,id);setPriceItems(prev=>prev.filter(p=>p.id!==id));}
    catch(e){alert("削除失敗: "+e.message);}
  }

  if(!caseId) return(
    <div style={{padding:"12px 14px",background:"#fff3cd",borderRadius:7,fontSize:12,color:"#856404",border:"1px solid #ffc107"}}>
      💡 まず右上の「登録する」ボタンで事例を保存してください。保存後に金額を登録できます。
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:13,color:"#3a3028"}}>
          合計: <strong>¥{total.toLocaleString()}</strong>
          <span style={{fontSize:11,color:"#8a7a6a",marginLeft:8}}>（お客様表示分）</span>
        </div>
        <button onClick={openNew} style={{padding:"6px 14px",background:"#1e3a5f",color:"white",border:"none",borderRadius:6,fontSize:12,cursor:"pointer",fontWeight:700}}>＋ 追加</button>
      </div>

      {caseItems.length===0?(
        <div style={{padding:"12px",background:"#faf8f5",borderRadius:6,fontSize:12,color:"#a89a8a",textAlign:"center"}}>まだ金額項目がありません</div>
      ):(
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:8}}>
          <thead><tr style={{background:"#f5f0e8"}}>
            {["カテゴリ","項目名","金額","表示","操作"].map(h=>(
              <th key={h} style={{padding:"6px 8px",textAlign:"left",color:"#8a7a6a",fontWeight:600,borderBottom:"1px solid #e8e2d8"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {caseItems.sort((a,b)=>a.sort_order-b.sort_order).map(item=>(
              <tr key={item.id} style={{borderBottom:"1px solid #f0ebe0"}}>
                <td style={{padding:"6px 8px",color:"#8a7a6a"}}>{item.category}</td>
                <td style={{padding:"6px 8px",fontWeight:500}}>{item.name}</td>
                <td style={{padding:"6px 8px",fontWeight:600}}>¥{calcAmt(item).toLocaleString()}</td>
                <td style={{padding:"6px 8px",textAlign:"center"}}>
                  <span style={{background:item.display_client?"#d4edda":"#f8d7da",color:item.display_client?"#155724":"#721c24",padding:"2px 7px",borderRadius:9,fontSize:10}}>
                    {item.display_client?"表示":"非表示"}
                  </span>
                </td>
                <td style={{padding:"6px 8px"}}>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>setEditItem({...item})} style={{padding:"2px 8px",border:"1px solid #c9b89a",borderRadius:4,background:"white",cursor:"pointer",fontSize:11}}>編集</button>
                    <button onClick={()=>del(item.id)} style={{padding:"2px 7px",border:"1px solid #f5c6cb",borderRadius:4,background:"#fff5f5",color:"#c0392b",cursor:"pointer",fontSize:11}}>削除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 編集モーダル */}
      {editItem&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400}}>
          <div style={{background:"white",borderRadius:12,padding:"24px 28px",width:480,maxHeight:"85vh",overflowY:"auto"}}>
            <h3 style={{margin:"0 0 16px",fontSize:16}}>{editItem.id?"金額項目を編集":"金額項目を追加"}</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:3}}>項目名 *</label>
                <input value={editItem.name} onChange={e=>setEditItem(p=>({...p,name:e.target.value}))} style={inp} placeholder="例: 木造軸組工法 本体工事"/>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:3}}>カテゴリ</label>
                <select value={editItem.category} onChange={e=>setEditItem(p=>({...p,category:e.target.value}))} style={sel}>
                  {["建物本体","付帯工事","外構","カーテン","エアコン","TVアンテナ","地盤改良工事","オプション","設計申請","その他"].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:3}}>計算方式</label>
                <select value={editItem.calc_type} onChange={e=>setEditItem(p=>({...p,calc_type:e.target.value}))} style={sel}>
                  <option value="fixed">固定金額</option>
                  <option value="unit_price">数量×単価</option>
                  <option value="manual">手入力</option>
                </select>
              </div>
              {editItem.calc_type==="unit_price"?(
                <>
                  <div>
                    <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:3}}>単価（円）</label>
                    <input type="number" value={editItem.unit_price} onChange={e=>setEditItem(p=>({...p,unit_price:Number(e.target.value)}))} style={inp}/>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:3}}>数量</label>
                    <input type="number" step="0.1" value={editItem.quantity} onChange={e=>setEditItem(p=>({...p,quantity:Number(e.target.value)}))} style={inp}/>
                  </div>
                </>
              ):(
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:3}}>金額（円）</label>
                  <input type="number" value={editItem.amount} onChange={e=>setEditItem(p=>({...p,amount:Number(e.target.value)}))} style={inp} placeholder="例: 25000000"/>
                </div>
              )}
              <div>
                <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:3}}>表示順</label>
                <input type="number" value={editItem.sort_order} onChange={e=>setEditItem(p=>({...p,sort_order:Number(e.target.value)}))} style={inp}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,justifyContent:"flex-end"}}>
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
                  <input type="checkbox" checked={editItem.display_client} onChange={e=>setEditItem(p=>({...p,display_client:e.target.checked}))}/>
                  お客様に表示
                </label>
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
                  <input type="checkbox" checked={editItem.display_internal} onChange={e=>setEditItem(p=>({...p,display_internal:e.target.checked}))}/>
                  社内のみ表示
                </label>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{display:"block",fontSize:11,color:"#8a7a6a",marginBottom:3}}>備考</label>
                <input value={editItem.note||""} onChange={e=>setEditItem(p=>({...p,note:e.target.value}))} style={inp} placeholder="社内メモ"/>
              </div>
            </div>
            <div style={{padding:"8px 12px",background:"#f5f0e8",borderRadius:5,fontSize:12,marginBottom:14,color:"#6a5a4a"}}>
              金額: ¥{(editItem.calc_type==="unit_price"?(Number(editItem.unit_price)||0)*(Number(editItem.quantity)||1):(Number(editItem.amount)||0)).toLocaleString()}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setEditItem(null)} style={{padding:"8px 16px",border:"1px solid #d4cfc5",borderRadius:6,background:"white",cursor:"pointer",fontSize:13}}>キャンセル</button>
              <button onClick={save} disabled={saving} style={{padding:"8px 20px",background:"#1e3a5f",color:"white",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer"}}>
                {saving?"保存中...":"保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// ══════════════════════════════════════════════════════════
// その他費用計算コンポーネント
// ══════════════════════════════════════════════════════════
// ── OtherCosts共通定数 ────────────────────────────────────
const OC_V={fg:"#252d3d",primary:"#1e3a5f",secondary:"#edf0f5",muted:"#5c6b7a",border:"#d0d8e4",card:"#ffffff",bg:"#f5f7fa"};

function OCSel({value,onChange,opts}){
  return(<select value={value} onChange={e=>onChange(Number(e.target.value))}
    style={{padding:"7px 10px",border:`1px solid ${OC_V.border}`,borderRadius:5,fontSize:13,background:"white",width:"100%"}}>
    {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
  </select>);
}
function OCInp({value,onChange,placeholder=""}){
  return(<input type="text" inputMode="numeric" value={value}
    onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,"");onChange(v);}}
    placeholder={placeholder}
    style={{padding:"7px 10px",border:`1px solid ${OC_V.border}`,borderRadius:5,fontSize:13,
      background:"white",width:"100%",boxSizing:"border-box"}}/>);
}
function OCRow({label,amt,children}){
  const nv=Number(amt)||0;
  return(
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",
      padding:"10px 0",borderBottom:`1px solid ${OC_V.border}50`,gap:12}}>
      <div style={{fontSize:13,color:OC_V.fg,flex:"0 0 auto",maxWidth:"55%"}}>{label}</div>
      <div style={{flex:"0 0 200px",minWidth:0}}>
        {children}
        {nv>0&&<div style={{fontSize:11,color:OC_V.muted,marginTop:3,textAlign:"right"}}>¥{nv.toLocaleString()}</div>}
      </div>
    </div>
  );
}
function OCSubTotal({label,total}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",padding:"12px 16px",
      background:OC_V.primary+"18",borderRadius:6,marginTop:12}}>
      <span style={{fontSize:13,fontWeight:700,color:OC_V.primary}}>{label}</span>
      <span style={{fontSize:15,fontWeight:800,color:OC_V.primary}}>¥{total.toLocaleString()}</span>
    </div>
  );
}

// ── 土地代金入力セクション ─────────────────────────────────
function LandPriceSection({landPrice='', onChange}) {
  const V = OC_V;
  const SANS = "'Noto Sans JP','Hiragino Kaku Gothic ProN','Meiryo',sans-serif";
  const SERIF = "Georgia,'Noto Serif JP',serif";
  const nv = Number(landPrice)||0;
  return(
    <section style={{background:V.card,padding:"28px 32px",fontFamily:SANS,borderTop:`1px solid ${V.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
        <h3 style={{fontFamily:SERIF,fontSize:20,fontWeight:500,color:V.fg,margin:0,whiteSpace:"nowrap"}}>土地代金</h3>
        <div style={{flex:1,height:1,background:V.border}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"end"}}>
        <div>
          <label style={{display:"block",fontSize:12,color:V.muted,marginBottom:6}}>土地代金（円）</label>
          <input type="text" inputMode="numeric" value={landPrice}
            onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,"");onChange(v);}}
            placeholder="例: 15000000"
            style={{width:"100%",padding:"10px 14px",border:`2px solid ${nv>0?V.primary:V.border}`,
              borderRadius:7,fontSize:16,boxSizing:"border-box",
              outline:"none",transition:"border-color .15s"}}/>
          {nv>0&&<div style={{fontSize:12,color:V.muted,marginTop:5}}>
            約 {Math.round(nv/10000).toLocaleString()}万円
          </div>}
        </div>
        <div style={{background:V.secondary,borderRadius:8,padding:"16px 20px"}}>
          <div style={{fontSize:11,color:V.muted,marginBottom:4}}>入力中の土地代金</div>
          <div style={{fontSize:24,fontWeight:800,color:nv>0?V.primary:V.muted}}>
            {nv>0 ? `¥${nv.toLocaleString()}` : "未入力"}
          </div>
          <div style={{fontSize:11,color:V.muted,marginTop:4}}>
            ※その他費用の土地・諸費用タブと連動しています
          </div>
        </div>
      </div>
    </section>
  );
}

function OCLoanCalc({basePriceTotal=0, otherTotal=0, landPrice=0}) {
  const [loanRate,  setLoanRate]  = React.useState(1.5);
  const [loanYears, setLoanYears] = React.useState(35);
  const [downPay,   setDownPay]   = React.useState("");
  const V = OC_V;
  const SANS = "'Noto Sans JP','Hiragino Kaku Gothic ProN','Meiryo',sans-serif";

  const combined = basePriceTotal + landPrice + otherTotal;
  // 100万単位で切り上げ
  const roundedUp = combined>0 ? Math.ceil(combined/1000000)*1000000 : 0;
  const loanBase = Math.max(0, roundedUp - (Number(downPay)||0)*10000);
  const monthRate = loanRate/100/12;
  const months = loanYears*12;
  const [bonusTimes, setBonusTimes] = React.useState(2); // 年2回
  const [bonusAmt,   setBonusAmt]   = React.useState(""); // 1回あたり手入力
  // ボーナス分を除いた毎月元利均等
  const bonusAnnual = (Number(bonusAmt)||0) * bonusTimes;
  const bonusTotal = bonusAnnual * loanYears;
  const loanBaseAdj = Math.max(0, loanBase - bonusTotal);
  const monthly = loanBaseAdj>0&&monthRate>0
    ? Math.round(loanBaseAdj*(monthRate*Math.pow(1+monthRate,months))/(Math.pow(1+monthRate,months)-1))
    : loanBaseAdj>0 ? Math.round(loanBaseAdj/months) : 0;

  if(combined===0) return null;

  return(
    <div style={{marginTop:20,fontFamily:SANS}}>
      {/* 合計表示 */}
      <div style={{background:V.secondary,borderRadius:8,padding:"16px 20px",marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
          <span style={{fontSize:13,color:V.muted}}>本体価格</span>
          <span style={{fontSize:14,fontWeight:600,color:V.fg}}>¥{basePriceTotal.toLocaleString()}</span>
        </div>
        {landPrice>0&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
            <span style={{fontSize:13,color:V.muted}}>土地代金</span>
            <span style={{fontSize:14,fontWeight:600,color:V.fg}}>¥{landPrice.toLocaleString()}</span>
          </div>
        )}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${V.border}`}}>
          <span style={{fontSize:13,color:V.muted}}>その他費用（諸経費）</span>
          <span style={{fontSize:14,fontWeight:600,color:V.fg}}>¥{otherTotal.toLocaleString()}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
          <span style={{fontSize:14,fontWeight:700,color:V.fg}}>合計金額</span>
          <span style={{fontSize:18,fontWeight:800,color:V.primary}}>¥{combined.toLocaleString()}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
          <span style={{fontSize:12,color:V.muted}}>借入額（100万単位切り上げ）</span>
          <span style={{fontSize:16,fontWeight:700,color:V.primary}}>¥{roundedUp.toLocaleString()}</span>
        </div>
      </div>

      {/* ローン試算 */}
      <div style={{background:V.secondary,borderRadius:8,padding:"18px 20px"}}>
        <div style={{fontSize:14,fontWeight:700,color:V.fg,marginBottom:14}}>🏦 月々の返済目安</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:10}}>
          <div>
            <label style={{display:"block",fontSize:11,color:V.muted,marginBottom:4}}>頭金（万円）</label>
            <input type="text" inputMode="numeric" value={downPay}
              onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,"");setDownPay(v);}}
              placeholder="0"
              style={{width:"100%",padding:"7px 10px",border:`1px solid ${V.border}`,borderRadius:5,fontSize:13,boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{display:"block",fontSize:11,color:V.muted,marginBottom:4}}>金利（%）</label>
            <input type="number" step="0.001" value={loanRate}
              onChange={e=>setLoanRate(Number(e.target.value))}
              style={{width:"100%",padding:"7px 10px",border:`1px solid ${V.border}`,borderRadius:5,fontSize:13}}/>
          </div>
          <div>
            <label style={{display:"block",fontSize:11,color:V.muted,marginBottom:4}}>返済年数</label>
            <select value={loanYears} onChange={e=>setLoanYears(Number(e.target.value))}
              style={{width:"100%",padding:"7px 10px",border:`1px solid ${V.border}`,borderRadius:5,fontSize:13}}>
              {[10,15,20,25,30,35,40,45,50].map(y=><option key={y} value={y}>{y}年</option>)}
            </select>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div>
            <label style={{display:"block",fontSize:11,color:V.muted,marginBottom:4}}>ボーナス払い（1回あたり・円）</label>
            <input type="text" inputMode="numeric" value={bonusAmt}
              onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,"");setBonusAmt(v);}}
              placeholder="例: 100000（0なら毎月のみ）"
              style={{width:"100%",padding:"7px 10px",border:`1px solid ${V.border}`,borderRadius:5,fontSize:13,boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{display:"block",fontSize:11,color:V.muted,marginBottom:4}}>ボーナス回数（年）</label>
            <select value={bonusTimes} onChange={e=>setBonusTimes(Number(e.target.value))}
              style={{width:"100%",padding:"7px 10px",border:`1px solid ${V.border}`,borderRadius:5,fontSize:13}}>
              <option value={1}>年1回</option>
              <option value={2}>年2回（夏・冬）</option>
            </select>
          </div>
        </div>
        {monthly>0&&(
          <div style={{background:V.primary,borderRadius:7,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginBottom:4}}>月々返済目安</div>
              <div style={{fontSize:30,fontWeight:800,color:"white"}}>¥{monthly.toLocaleString()}<span style={{fontSize:14,fontWeight:400}}>/ 月</span></div>
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.5)",textAlign:"right"}}>
              借入: ¥{loanBase.toLocaleString()}<br/>
              金利{loanRate}% · {loanYears}年
            </div>
          </div>
        )}
        <div style={{marginTop:10,fontSize:11,color:V.muted}}>※金利・借入条件・諸費用により実際の返済額は異なります</div>
      </div>
    </div>
  );
}

function OtherCosts({basePriceTotal=0, landPrice='', onLandPriceChange=null}) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState("futai");

  // ── 付帯工事 ── 初期値設定
  const [gaiko,      setGaiko]      = React.useState(2000000);
  const [curtain,    setCurtain]    = React.useState(300000);
  const [aircon,     setAircon]     = React.useState(500000);
  const [antenna,    setAntenna]    = React.useState(100000);
  const [jiban,      setJiban]      = React.useState(800000);
  const [futaiOther, setFutaiOther] = React.useState("");

  // ── 土地・諸費用 ──
  // landPriceは外部から管理（概算建築費と合計するため）
  const [brokerAmt,  setBrokerAmt]  = React.useState(""); // 手入力
  const [landTax,    setLandTax]    = React.useState("");
  const [fixedTax,   setFixedTax]   = React.useState("");
  const [waterFee,   setWaterFee]   = React.useState("");
  const [sewerFee,   setSewerFee]   = React.useState("");
  const [stamp,      setStamp]      = React.useState(0); // 選択

  // ── 銀行諸費用 ── (登記費用もここへ)
  const [bankFee,    setBankFee]    = React.useState("55000");
  const [bankStamp,  setBankStamp]  = React.useState("20200");
  const [guarantee,  setGuarantee]  = React.useState("800000");
  const [tsunagi,    setTsunagi]    = React.useState("300000");
  const [insurance,  setInsurance]  = React.useState(250000);
  const [regTransfer,setRegTransfer]= React.useState(150000);
  const [regBuild,   setRegBuild]   = React.useState(200000);
  const [regMortgage,setRegMortgage]= React.useState(150000);
  const [regOther,   setRegOther]   = React.useState("");

  const V=OC_V;
  const SANS="'Noto Sans JP','Hiragino Kaku Gothic ProN','Meiryo',sans-serif";
  const SERIF="Georgia,'Noto Serif JP',serif";
  const Sel=OCSel; const Inp=OCInp; const Row=OCRow; const SubTotal=OCSubTotal;

  const n = v => Number(v)||0;
  const futaiTotal  = gaiko+curtain+aircon+antenna+jiban+n(futaiOther);
  const landTotal   = n(brokerAmt)+n(landTax)+n(fixedTax)+n(waterFee)+n(sewerFee)+stamp; // 土地代金は除く（上の入力欄で管理）
  const regTotal    = regTransfer+regBuild+regMortgage+n(regOther);
  const bankTotal   = n(bankFee)+n(bankStamp)+n(guarantee)+n(tsunagi)+insurance+regTotal;
  const grandTotal  = futaiTotal+landTotal+bankTotal;

  const tabs=[{k:"futai",l:"付帯工事"},{k:"land",l:"土地関連費用"},{k:"bank",l:"銀行諸費用"}];
  const stampOpts=[{v:0,l:"0円"},{v:200,l:"200円"},{v:500,l:"500円"},{v:1000,l:"1,000円"},
    {v:5000,l:"5,000円"},{v:10000,l:"10,000円"}];
  const regOpts=[{v:0,l:"0円（含まない）"},...[5,10,15,20,25,30,35,40,45,50].map(n=>({v:n*10000,l:`${n}万円`}))];

  return(
    <section style={{background:V.card,padding:"32px 32px",fontFamily:SANS,borderTop:`1px solid ${V.border}`}}>
      {/* その他費用ヘッダー */}
      <div>
        <button onClick={()=>setOpen(!open)}
          style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",
            background:"none",border:"none",cursor:"pointer",padding:0,marginBottom:open?20:0}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <h3 style={{fontFamily:SERIF,fontSize:20,fontWeight:500,color:V.fg,margin:0}}>その他費用の目安</h3>
            <div style={{height:1,width:60,background:V.border}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {grandTotal>0&&!open&&<span style={{fontSize:14,fontWeight:700,color:V.primary}}>合計 ¥{grandTotal.toLocaleString()}</span>}
            <span style={{fontSize:20,color:V.muted}}>{open?"▲":"▼"}</span>
          </div>
        </button>
      </div>

      {open&&(
        <>
          {/* タブ */}
          <div style={{display:"flex",gap:0,borderBottom:`2px solid ${V.border}`,marginBottom:20}}>
            {tabs.map(t=>(
              <button key={t.k} onClick={()=>setTab(t.k)}
                style={{padding:"9px 22px",border:"none",background:"transparent",cursor:"pointer",
                  fontSize:13,fontWeight:tab===t.k?700:400,color:tab===t.k?V.primary:V.muted,
                  borderBottom:tab===t.k?`3px solid ${V.primary}`:"3px solid transparent",marginBottom:-2}}>
                {t.l}
              </button>
            ))}
          </div>

          {/* 付帯工事 */}
          {tab==="futai"&&(
            <div>
              <Row label="外構工事" amt={gaiko}>
                <Sel value={gaiko} onChange={setGaiko} opts={[{v:0,l:"0万円（含まない）"},...[10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160,170,180,190,200,210,220,230,240,250,260,270,280,290,300,350,400,450,500].map(n=>({v:n*10000,l:`${n}万円`}))]}/>
              </Row>
              <Row label="カーテン・ブラインド" amt={curtain}>
                <Sel value={curtain} onChange={setCurtain} opts={[{v:0,l:"0万円（含まない）"},...[5,10,15,20,25,30,35,40,45,50].map(n=>({v:n*10000,l:`${n}万円`}))]}/>
              </Row>
              <Row label="エアコン" amt={aircon}>
                <Sel value={aircon} onChange={setAircon} opts={[{v:0,l:"0万円（含まない）"},...[10,20,30,40,50,60,70,80,90,100].map(n=>({v:n*10000,l:`${n}万円`}))]}/>
              </Row>
              <Row label="TVアンテナ" amt={antenna}>
                <Sel value={antenna} onChange={setAntenna} opts={[{v:0,l:"なし（0円）"},{v:100000,l:"10万円"}]}/>
              </Row>
              <Row label="地盤改良工事" amt={jiban}>
                <Sel value={jiban} onChange={setJiban} opts={[{v:0,l:"0万円（不要）"},...[10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160,170,180,190,200].map(n=>({v:n*10000,l:`${n}万円`}))]}/>
              </Row>
              <Row label="その他" amt={n(futaiOther)}>
                <Inp value={futaiOther} onChange={setFutaiOther} placeholder="直接入力（円）"/>
              </Row>
              <SubTotal label="付帯工事　小計" total={futaiTotal}/>
            </div>
          )}

          {/* 土地・諸費用 */}
          {tab==="land"&&(
            <div>

              <Row label="仲介手数料" amt={n(brokerAmt)}>
                <Inp value={brokerAmt} onChange={setBrokerAmt} placeholder="手入力（円）"/>
              </Row>
              <Row label="不動産取得税" amt={n(landTax)}>
                <Inp value={landTax} onChange={setLandTax} placeholder="概算（円）"/>
              </Row>
              <Row label="固定資産税（精算分）" amt={n(fixedTax)}>
                <Inp value={fixedTax} onChange={setFixedTax} placeholder="概算（円）"/>
              </Row>
              <Row label="水道分担金" amt={n(waterFee)}>
                <Inp value={waterFee} onChange={setWaterFee} placeholder="概算（円）"/>
              </Row>
              <Row label="下水道受益者負担金" amt={n(sewerFee)}>
                <Inp value={sewerFee} onChange={setSewerFee} placeholder="概算（円）"/>
              </Row>
              <Row label="契約印紙代" amt={stamp}>
                <Sel value={stamp} onChange={setStamp} opts={stampOpts}/>
              </Row>
              <SubTotal label="土地関連費用（仲介・税金等）　小計" total={landTotal}/>
            </div>
          )}

          {/* 銀行諸費用 + 登記費用 */}
          {tab==="bank"&&(
            <div>
              <Row label="事務手数料" amt={n(bankFee)}>
                <Inp value={bankFee} onChange={setBankFee} placeholder="例: 55000"/>
              </Row>
              <Row label="印紙代" amt={n(bankStamp)}>
                <Inp value={bankStamp} onChange={setBankStamp} placeholder="例: 20200"/>
              </Row>
              <Row label="保証料（借入金額の2.2%目安）" amt={n(guarantee)}>
                <Inp value={guarantee} onChange={setGuarantee} placeholder="保証料（円）"/>
              </Row>
              <Row label="つなぎ融資手数料・利息" amt={n(tsunagi)}>
                <Inp value={tsunagi} onChange={setTsunagi} placeholder="例: 300000"/>
              </Row>
              <Row label="火災保険" amt={insurance}>
                <Sel value={insurance} onChange={setInsurance} opts={[{v:0,l:"0万円（別途）"},...[5,10,15,20,25,30,35,40,45,50].map(n=>({v:n*10000,l:`${n}万円`}))]}/>
              </Row>
              <div style={{padding:"8px 0 4px",borderBottom:`1px solid ${V.border}50`}}>
                <div style={{fontSize:13,fontWeight:600,color:V.fg,marginBottom:8}}>登記費用</div>
                {[
                  {label:"所有権移転登記",val:regTransfer,set:setRegTransfer},
                  {label:"建物表示保存登記",val:regBuild,set:setRegBuild},
                  {label:"抵当権設定登記",val:regMortgage,set:setRegMortgage},
                ].map(({label,val,set})=>(
                  <Row key={label} label={label} amt={val}>
                    <Sel value={val} onChange={set} opts={regOpts}/>
                  </Row>
                ))}
                <Row label="その他" amt={n(regOther)}>
                  <Inp value={regOther} onChange={setRegOther} placeholder="直接入力（円）"/>
                </Row>
              </div>
              <SubTotal label="銀行諸費用・登記費用　小計" total={bankTotal}/>
            </div>
          )}

          {/* 全体合計 */}
          <div style={{marginTop:20,padding:"20px 24px",background:V.primary,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginBottom:4}}>その他費用（土地含む）　合計</div>
            </div>
            <div style={{fontSize:28,fontWeight:800,color:"white"}}>¥{grandTotal.toLocaleString()}</div>
          </div>
          <div style={{marginTop:10,fontSize:11,color:V.muted}}>※上記はあくまで目安です。実際の費用は条件により異なります。</div>

          {/* 本体+諸費用 合計 → 借入額 → ローン試算 */}
          <OCLoanCalc basePriceTotal={basePriceTotal} otherTotal={grandTotal} landPrice={n(landPrice)}/>
        </>
      )}
    </section>
  );
}

// ── お客様向け金額表示コンポーネント ─────────────────────────
function PriceSection({priceItems, totalOverride, productName='', tsubo, buildingArea, totalArea}) {
  const [expanded, setExpanded] = React.useState(false);

  const V = {fg:"#252d3d",primary:"#1e3a5f",secondary:"#edf0f5",muted:"#5c6b7a",border:"#d0d8e4",card:"#ffffff"};
  const SANS = "'Noto Sans JP','Hiragino Kaku Gothic ProN','Meiryo',sans-serif";
  const SERIF = "Georgia,'Noto Serif JP',serif";

  function calcAmt(item){
    if(item.calc_type==="unit_price") return (Number(item.unit_price)||0)*(Number(item.quantity)||1);
    return Number(item.amount)||0;
  }

  const clientItems = priceItems.filter(p=>p.display_client);
  const total = clientItems.reduce((s,p)=>s+calcAmt(p),0);

  // カテゴリ別集計
  const cats = [...new Set(clientItems.map(p=>p.category))];
  const catTotals = cats.map(cat=>({
    cat, total:clientItems.filter(p=>p.category===cat).reduce((s,p)=>s+calcAmt(p),0),
    items:clientItems.filter(p=>p.category===cat)
  })).filter(c=>c.total>0);

  // 坪単価計算: 本体価格 / 延床坪数
  const tsuboNum = Number(tsubo)||0;
  const totalAreaNum = Number(totalArea)||0;
  const tsuboForCalc = tsuboNum>0 ? tsuboNum : (totalAreaNum>0 ? totalAreaNum/3.306 : 0);
  // 本体(建物本体カテゴリ)の金額
  const honTaiItems = clientItems.filter(p=>p.category==="建物本体");
  const honTaiTotal = honTaiItems.reduce((s,p)=>s+calcAmt(p),0);
  const tsuboPriceMan = (honTaiTotal>0 && tsuboForCalc>0) ? Math.round(honTaiTotal/tsuboForCalc/10000) : 0;
  // 施工面積坪数
  const buildingAreaNum = Number(buildingArea)||0;
  const buildingTsubo = buildingAreaNum>0 ? (buildingAreaNum/3.306).toFixed(1) : "";

  // priceItemsが登録されていればそれを使う、なければtotalOverrideを使う
  const displayTotal = total>0 ? total : 0;


  if(displayTotal===0&&priceItems.length===0) return null;

  return(
    <section style={{background:V.card,padding:"40px 32px",fontFamily:SANS}}>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:28}}>
        <h3 style={{fontFamily:SERIF,fontSize:22,fontWeight:500,color:V.fg,margin:0,whiteSpace:"nowrap"}}>概算建築費</h3>
        <div style={{flex:1,height:1,background:V.border}}/>
      </div>

      {/* メイン合計: 左=商品情報 右=金額 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
        {/* 左: 商品名・面積情報 */}
        <div style={{background:V.secondary,borderRadius:10,padding:"24px 28px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          {productName&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:V.muted,letterSpacing:".1em",marginBottom:4}}>商品名</div>
              <div style={{fontSize:28,fontWeight:800,color:V.primary,letterSpacing:".05em"}}>{productName}</div>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {tsuboForCalc>0&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"6px 0",borderBottom:`1px solid ${V.border}`}}>
                <span style={{fontSize:12,color:V.muted}}>延床面積</span>
                <span style={{fontSize:15,fontWeight:700,color:V.fg}}>
                  {totalAreaNum>0&&<span style={{fontSize:12,fontWeight:400,color:V.muted,marginRight:4}}>{totalAreaNum}㎡</span>}
                  {tsuboForCalc.toFixed(1)}<span style={{fontSize:12,fontWeight:400}}>坪</span>
                </span>
              </div>
            )}
            {buildingTsubo&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"6px 0",borderBottom:`1px solid ${V.border}`}}>
                <span style={{fontSize:12,color:V.muted}}>施工面積</span>
                <span style={{fontSize:15,fontWeight:700,color:V.fg}}>
                  {buildingAreaNum>0&&<span style={{fontSize:12,fontWeight:400,color:V.muted,marginRight:4}}>{buildingAreaNum}㎡</span>}
                  {buildingTsubo}<span style={{fontSize:12,fontWeight:400}}>坪</span>
                </span>
              </div>
            )}
            {tsuboPriceMan>0&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"6px 0"}}>
                <span style={{fontSize:12,color:V.muted}}>坪単価</span>
                <span style={{fontSize:15,fontWeight:700,color:V.primary}}>{tsuboPriceMan}<span style={{fontSize:12,fontWeight:400}}>万円</span></span>
              </div>
            )}
          </div>
        </div>
        {/* 右: 合計金額 */}
        <div style={{background:V.primary,borderRadius:10,padding:"24px 28px",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.6)",letterSpacing:".1em",marginBottom:8}}>合計金額（税込概算）</div>
            <div style={{fontSize:36,fontWeight:800,color:"white"}}>¥{displayTotal.toLocaleString()}</div>

          </div>
          {catTotals.length>0&&(
            <button onClick={()=>setExpanded(!expanded)} style={{marginTop:16,padding:"9px 16px",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:7,color:"white",cursor:"pointer",fontSize:13,fontWeight:600,alignSelf:"flex-start"}}>
              {expanded?"▲ 閉じる":"▼ 内訳を見る"}
            </button>
          )}
        </div>
      </div>

      {/* カテゴリ大分類（常時表示） */}
      <div style={{background:V.secondary,borderRadius:8,overflow:"hidden",marginBottom:16}}>
        {catTotals.map((c,i)=>(
          <div key={c.cat} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:i<catTotals.length-1?`1px solid ${V.border}`:"none"}}>
            <span style={{fontSize:15,fontWeight:500,color:V.fg}}>{c.cat}</span>
            <span style={{fontSize:15,fontWeight:700,color:V.fg}}>¥{c.total.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* 詳細内訳（展開時） */}
      {expanded&&catTotals.length>0&&(
        <div style={{border:`1px solid ${V.border}`,borderRadius:8,overflow:"hidden",marginBottom:16}}>
          {catTotals.map((c,ci)=>(
            <div key={c.cat}>
              <div style={{padding:"10px 18px",background:"#f8f9fa",borderBottom:`1px solid ${V.border}`,fontWeight:700,fontSize:13,color:V.primary}}>
                {c.cat}
              </div>
              {c.items.map((item,ii)=>(
                <div key={item.id||ii} style={{display:"flex",justifyContent:"space-between",padding:"11px 18px 11px 28px",borderBottom:`1px solid ${V.border}40`,background:V.card}}>
                  <div>
                    <div style={{fontSize:13,color:V.fg}}>{item.name}</div>
                    {item.calc_type==="unit_price"&&<div style={{fontSize:11,color:V.muted}}>¥{Number(item.unit_price).toLocaleString()} × {item.quantity}</div>}
                    {item.note&&<div style={{fontSize:11,color:V.muted}}>{item.note}</div>}
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:V.fg}}>¥{calcAmt(item).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"16px 18px",background:V.primary}}>
            <span style={{fontSize:15,fontWeight:700,color:"white"}}>合計</span>
            <span style={{fontSize:18,fontWeight:800,color:"white"}}>¥{displayTotal.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* 注意文言 */}
      <div style={{padding:"12px 16px",background:"#fffbe6",border:"1px solid #ffe082",borderRadius:6,fontSize:12,color:"#7a6a3a"}}>
        ※本価格は概算です。敷地条件・仕様選定・法規条件・施工条件により変動する場合があります。詳細はご相談ください。
      </div>
    </section>
  );
}

export default function App(){
  const envConfig=SUPABASE_URL&&SUPABASE_KEY?{url:SUPABASE_URL,key:SUPABASE_KEY}:null;
  const [config,setConfig]=useState(envConfig);
  const [cases,setCases]=useState([]);const [loading,setLoading]=useState(false);const [loadErr,setLoadErr]=useState("");
  const [view,setView]=useState("gallery");const [selectedCase,setSelected]=useState(null);
  const [priceItems,setPriceItems]=useState([]);
  const [priceLoaded,setPriceLoaded]=useState(false);
  const [priceFormOpen,setPriceFormOpen]=useState(false);
  const [editingPrice,setEditingPrice]=useState(null);
  const [loanRate,setLoanRate]=useState(1.5);
  const [loanYears,setLoanYears]=useState(35);
  const [favorites,setFavorites]=useState(new Set());

  // PDF プレゼン
  const [pdfSelectModal,setPdfSelectModal]=useState(null);
  const [pdfModal,setPdfModal]=useState(null);
  const [pdfCustomerName,setPdfCustomerName]=useState("");

  // フィルター（複数選択対応）
  const [filterBuildType,setFBuildType]=useState("");
  const [filterStyles,setFStyles]=useState([]);    // 複数選択
  const [filterLayouts,setFLayouts]=useState([]);  // 複数選択
  const [filterFloor,setFFloor]=useState("");
  const [filterBudget,setFBudget]=useState("");
  const [filterTsubo,setFTsubo]=useState("");
  const [filterFeatures,setFFeatures]=useState([]);
  const [showFavs,setShowFavs]=useState(false);

  // 詳細
  const [detailTab,setDetailTab]=useState("concept");
  const [lightbox,setLightbox]=useState(null); // {images, idx}
  const [landPriceInput,setLandPriceInput]=useState(""); // 土地代金（詳細ページ用）

  // 管理
  const [adminUnlocked,setAdminUnlocked]=useState(false);
  const [pwInput,setPwInput]=useState("");const [pwError,setPwError]=useState(false);
  const [editingCase,setEditingCase]=useState(null);const [formData,setFormData]=useState(EMPTY_CASE);
  const [saveStatus,setSaveStatus]=useState("");const [saveErr,setSaveErr]=useState("");
  const [deleteConfirm,setDeleteConfirm]=useState(null);
  const [imgUploading,setImgUploading]=useState(false);const [addImgUploading,setAddImgUploading]=useState(false);const [floorImgUploading,setFloorImgUploading]=useState(false);const [aiAnalyzing,setAiAnalyzing]=useState(false);const [aiFloor,setAiFloor]=useState(null);const [aiGenerating,setAiGenerating]=useState(false);
  const [batchProcessing,setBatchProcessing]=useState(false);const [batchProgress,setBatchProgress]=useState({done:0,total:0,errors:0});
  const imgRef=useRef();const addImgRef=useRef();const floorImgRef=useRef();
  const [dragIdx,setDragIdx]=useState(null);
  const [imgDragIdx,setImgDragIdx]=useState(null);

  useEffect(()=>{if(envConfig)return;try{const s=localStorage.getItem(CONFIG_KEY);if(s)setConfig(JSON.parse(s));}catch{}},[]);
  const fetchCases=useCallback(async cfg=>{if(!cfg)return;setLoading(true);setLoadErr("");try{setCases(await sbGetCases(cfg.url,cfg.key));}catch(e){setLoadErr(e.message);}finally{setLoading(false);}},[]); 
  useEffect(()=>{fetchCases(config);},[config,fetchCases]);

  // price_items: configが変わるたびに全件再取得
  useEffect(()=>{
    if(config?.url&&config?.key){
      sbGetPriceItems(config.url,config.key)
        .then(items=>{ setPriceItems(items); setPriceLoaded(true); })
        .catch(()=>setPriceLoaded(true));
    }
  },[config]);
  function saveConfig(cfg){localStorage.setItem(CONFIG_KEY,JSON.stringify(cfg));setConfig(cfg);}

  const filtered=cases.filter(c=>{
    if(filterBuildType&&c.buildType!==filterBuildType)return false;
    if(filterStyles.length>0&&!filterStyles.includes(c.style))return false;
    if(filterLayouts.length>0&&!filterLayouts.includes(c.layout))return false;
    if(filterFloor&&c.floors!==filterFloor)return false;
    if(filterBudget&&!matchBudget(c.budget,filterBudget))return false;
    if(filterTsubo){const t=Number(c.tsubo)||0;
      if(filterTsubo==="〜20坪"&&t>=20)return false;
      else if(filterTsubo==="20〜25坪"&&(t<20||t>=25))return false;
      else if(filterTsubo==="25〜30坪"&&(t<25||t>=30))return false;
      else if(filterTsubo==="30〜35坪"&&(t<30||t>=35))return false;
      else if(filterTsubo==="35〜40坪"&&(t<35||t>=40))return false;
      else if(filterTsubo==="40〜45坪"&&(t<40||t>=45))return false;
      else if(filterTsubo==="45〜50坪"&&(t<45||t>=50))return false;
      else if(filterTsubo==="50坪〜"&&t<50)return false;
    }
    if(filterFeatures.length>0&&!filterFeatures.every(f=>c.features?.includes(f)))return false;
    if(showFavs&&!favorites.has(c._sbId))return false;
    return true;
  });

  function toggleFav(sbId,e){e?.stopPropagation();setFavorites(p=>{const s=new Set(p);s.has(sbId)?s.delete(sbId):s.add(sbId);return s;});}
  function toggleFF(item){setFFeatures(p=>p.includes(item)?p.filter(x=>x!==item):[...p,item]);}
  function toggleStyle(s){setFStyles(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);}
  function toggleLayout(s){setFLayouts(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);}
  function clearFilters(){setFBuildType("");setFStyles([]);setFLayouts([]);setFFloor("");setFBudget("");setFTsubo("");setFFeatures([]);}
  const hasFilter=filterBuildType||filterStyles.length>0||filterLayouts.length>0||filterFloor||filterBudget||filterTsubo||filterFeatures.length>0;

  function openNew(){setEditingCase(null);setFormData({...EMPTY_CASE,highlights:["","","",""],rooms:[{name:"LDK",floor:1,jyou:""}],features:[],images:[],image:"",youtube:"",specs:{...DEFAULT_SPECS}});setSaveErr("");setView("adminForm");}
  function openEdit(c){setEditingCase(c._sbId);const d=JSON.parse(JSON.stringify({...EMPTY_CASE,...c,specs:Object.fromEntries(Object.keys(DEFAULT_SPECS).map(k=>[k,(c.specs||{})[k]||(DEFAULT_SPECS[k]||"")]))}));if(d.rooms&&d.rooms[0]&&d.rooms[0].area!==undefined&&d.rooms[0].jyou===undefined){d.rooms=d.rooms.map(r=>({...r,jyou:r.area||""}))}if(!d.floorImages||d.floorImages.length===0){d.floorImages=[];d.images=d.images||[];}setFormData(d);setSaveErr("");setView("adminForm");}

  async function handleSaveCase(){
    if(!formData.title){setSaveErr("タイトルを入力してください");return;}
    setSaveStatus("saving");setSaveErr("");
    try{
      let result;
      if(editingCase!=null){result=await sbUpdateCase(config.url,config.key,editingCase,formData);setCases(p=>p.map(c=>c._sbId===editingCase?result:c));}
      else{result=await sbInsertCase(config.url,config.key,formData);setCases(p=>[...p,result]);}
      setSaveStatus("saved");setTimeout(()=>{setSaveStatus("");setView("admin");},800);
    }catch(e){setSaveStatus("error");setSaveErr(e.message);}
  }
  async function handleDelete(sbId){
    try{await sbDeleteCase(config.url,config.key,sbId);setCases(p=>p.filter(c=>c._sbId!==sbId));}catch(e){alert(`削除失敗: ${e.message}`);}
    setDeleteConfirm(null);if(selectedCase?._sbId===sbId)setView("admin");
  }
  async function handleMainImg(e){const file=e.target.files?.[0];if(!file)return;setImgUploading(true);try{const u=await sbUploadImage(config.url,config.key,file);setFormData(f=>({...f,image:u}));}catch(e){alert(e.message);}finally{setImgUploading(false);if(imgRef.current)imgRef.current.value="";}}
  async function handleAddImg(e){const file=e.target.files?.[0];if(!file)return;setAddImgUploading(true);try{const u=await sbUploadImage(config.url,config.key,file);setFormData(f=>({...f,images:[...(f.images||[]),u]}));}catch(e){alert(e.message);}finally{setAddImgUploading(false);if(addImgRef.current)addImgRef.current.value="";}}
  async function handleFloorImg(e){const file=e.target.files?.[0];if(!file)return;setFloorImgUploading(true);try{const u=await sbUploadImage(config.url,config.key,file);setFormData(f=>({...f,floorImages:[...(f.floorImages||[]),u]}));}catch(e){alert(e.message);}finally{setFloorImgUploading(false);if(floorImgRef.current)floorImgRef.current.value="";}}
  async function analyzeFloorPlan(imgUrl, floorNum) {
    setAiAnalyzing(true); setAiFloor(floorNum);
    try {
      // 画像をbase64に変換
      const imgContent = await resizeImageToBase64(imgUrl, 1000);
      if(!imgContent) throw new Error('画像の読み込みに失敗しました');
      const base64 = imgContent.source.data;
      const mediaType = 'image/jpeg';

      const res = await fetch('/api/analyze',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:1000,
          messages:[{
            role:'user',
            content:[
              imgContent,
              {type:'text',text:`この間取り図を見て、各部屋の名前と帖数を抽出してください。
必ずJSON配列のみを返してください（説明文なし）。
形式: [{"name":"LDK","jyou":"19"},{"name":"洋室1","jyou":"6"},...]
- nameは日本語の部屋名（LDK、洋室、主寝室、和室、玄関、洗面、浴室、トイレ、書斎、WICLなど）
- jyouは帖数の数値文字列（不明な場合は""）
- 廊下・収納等の小さなスペースは省略可
- 帖数が書いてない場合は""とする`}
            ]
          }]
        })
      });
      if(!res.ok){const t=await res.text();throw new Error(`APIエラー(${res.status}): ${t.slice(0,200)}`);}
      const data = await res.json();
      if(data.error) throw new Error(`APIエラー: ${data.error.message||JSON.stringify(data.error)}`);
      const text = data.content?.[0]?.text||'';
      // JSONを抽出
      const match = text.match(/\[.*\]/s);
      if(!match) throw new Error('解析結果を取得できませんでした');
      const rooms = JSON.parse(match[0]);
      // 既存の対象階の部屋を削除して新規追加
      setFormData(f=>{
        const kept = (f.rooms||[]).filter(r=>r.floor!==floorNum);
        const newRooms = rooms.map(r=>({name:r.name||'',floor:floorNum,jyou:r.jyou||''}));
        return {...f, rooms:[...kept,...newRooms]};
      });
      alert(`${floorNum===1?'1階':'2階'}の部屋を${rooms.length}件自動入力しました。内容を確認してください。`);
    } catch(e) {
      alert('AI解析エラー: '+e.message);
    } finally {
      setAiAnalyzing(false); setAiFloor(null);
    }
  }

  // 画像URLをリサイズしてbase64に変換（最大800px・品質0.7）
  async function resizeImageToBase64(url, maxSize=800) {
    return new Promise(async (resolve) => {
      try {
        const r = await fetch(url);
        const b = await r.blob();
        const bmp = await createImageBitmap(b);
        const scale = Math.min(1, maxSize / Math.max(bmp.width, bmp.height));
        const w = Math.round(bmp.width * scale);
        const h = Math.round(bmp.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const b64 = dataUrl.split(',')[1];
        resolve({type:'image', source:{type:'base64', media_type:'image/jpeg', data:b64}});
      } catch(e) { resolve(null); }
    });
  }

  // AI全自動生成: 画像から タイトル・サブタイトル・コンセプト・ハイライトを生成
  async function autoGenerateAll() {
    const allImgs = [formData.image,...(formData.floorImages||[]),...(formData.images||[])].filter(Boolean);
    if(allImgs.length===0){ alert('先にメイン画像・間取り画像・パース画像を登録してください'); return; }
    setAiGenerating(true);
    try {
      // 外観/パース画像（最大2枚）+ 間取り画像（最大2枚）をbase64変換
      const perspTargets = [formData.image,...(formData.images||[])].filter(Boolean).slice(0,2);
      const floorTargets = (formData.floorImages||[]).filter(Boolean).slice(0,2);
      const [perspImgs, floorImgs] = await Promise.all([
        Promise.all(perspTargets.map(url=>resizeImageToBase64(url, 800))),
        Promise.all(floorTargets.map(url=>resizeImageToBase64(url, 800))),
      ]);
      const validImgs = [...perspImgs.filter(Boolean), ...floorImgs.filter(Boolean)];

      const styleInfo = `建物タイプ:${formData.buildType||''} スタイル:${formData.style||''} 間取り:${formData.layout||''} 階数:${formData.floors||''}`;
      const roomInfo = (formData.rooms||[]).filter(r=>r.name).map(r=>`${r.name}${r.jyou?r.jyou+'帖':''}`).join('・');
      const allFeatures = FEAT_CATEGORIES.flatMap(c=>c.items).join('・');

      const res = await fetch('/api/analyze',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:2000,
          messages:[{
            role:'user',
            content:[
              ...validImgs,
              {type:'text',text:`あなたは住宅プレゼンのプロライターです。
画像と以下の情報から、住宅のプレゼン資料用テキストを生成してください。

建物情報: ${styleInfo}
部屋構成: ${roomInfo||'不明'}
選択可能なこだわりタグ: ${allFeatures}

【面積の読み取り方】
間取り図に「1F 67.23㎡」「延床面積 123.45㎡」「敷地面積 200.00㎡」などの数値が記載されていればそれを読み取ってください。
記載がない場合は "" にしてください。数値のみ（単位なし）で返してください。

以下のJSON形式のみで返してください（余計な文字一切不要）:
{
  "title": "キャッチーで詩的な住宅タイトル（15文字以内）",
  "subtitle": "暮らしの魅力を伝えるサブタイトル（30文字以内）",
  "concept": "この家のコンセプトや設計の想いを3〜5文（200文字程度・です・ます調）",
  "highlights": ["特徴1（20文字以内）","特徴2","特徴3","特徴4","特徴5"],
  "features": ["タグ1","タグ2"],
  "area": { "floor1": "67.23", "floor2": "55.00", "land": "200.00" }
}
※ area の値は数値文字列（例: "67.23"）または不明なら ""。絶対に説明文を入れないこと。`}
            ]
          }]
        })
      });
      if(!res.ok){const t=await res.text();throw new Error(`APIエラー(${res.status}): ${t.slice(0,200)}`);}
      const data = await res.json();
      if(data.error) throw new Error(`APIエラー: ${data.error.message||JSON.stringify(data.error)}`);
      const text = data.content?.[0]?.text||'';
      const match = text.match(/\{[\s\S]*\}/);
      if(!match) throw new Error('生成結果を取得できませんでした');
      const result = JSON.parse(match[0]);
      setFormData(f=>{
        const f1 = result.area?.floor1 || f.area?.floor1 || "";
        const f2 = result.area?.floor2 || f.area?.floor2 || "";
        const land = result.area?.land || f.area?.land || "";
        const total = f1 && f2 ? (Number(f1)+Number(f2)).toFixed(2) : f1||f2||f.area?.total||"";
        const tsubo = total ? (Number(total)/3.306).toFixed(1) : f.tsubo||"";
        return {
          ...f,
          title: result.title||f.title,
          subtitle: result.subtitle||f.subtitle,
          concept: result.concept||f.concept,
          highlights: result.highlights?.length>0 ? result.highlights : f.highlights,
          features: result.features?.length>0 ? result.features : f.features,
          area: { ...f.area, floor1: f1, floor2: f2, land, total },
          tsubo,
        };
      });
      alert('タイトル・コンセプト・こだわり・面積を生成しました！内容を確認して必要に応じて修正してください。');
    } catch(e) {
      alert('AI生成エラー: '+e.message);
    } finally {
      setAiGenerating(false);
    }
  }

  async function batchAutoGenerate() {
    const targets = cases.filter(c=>{
      const hasImg = !!(c.image||(c.images||[]).length>0||(c.floorImages||[]).length>0);
      const missingData = !c.concept || !(c.features||[]).length || !c.area?.floor1;
      return hasImg && missingData;
    });
    if(targets.length===0){ alert('未入力の物件（画像あり）が見つかりませんでした'); return; }
    if(!window.confirm(`${targets.length}件の物件にAI自動入力を行います。しばらく時間がかかります。よろしいですか？`)) return;
    setBatchProcessing(true);
    setBatchProgress({done:0,total:targets.length,errors:0});
    const allFeatures = FEAT_CATEGORIES.flatMap(c=>c.items).join('・');
    let errors = 0;
    for(let i=0;i<targets.length;i++){
      const c = targets[i];
      try {
        const perspTargets = [c.image,...(c.images||[])].filter(Boolean).slice(0,2);
        const floorTargets = (c.floorImages||[]).filter(Boolean).slice(0,2);
        const [perspImgs, floorImgs] = await Promise.all([
          Promise.all(perspTargets.map(url=>resizeImageToBase64(url, 800))),
          Promise.all(floorTargets.map(url=>resizeImageToBase64(url, 800))),
        ]);
        const validImgs = [...perspImgs.filter(Boolean), ...floorImgs.filter(Boolean)];
        if(validImgs.length===0){ errors++; setBatchProgress(p=>({...p,done:p.done+1,errors:p.errors+1})); continue; }

        const styleInfo = `建物タイプ:${c.buildType||''} スタイル:${c.style||''} 間取り:${c.layout||''} 階数:${c.floors||''}`;
        const roomInfo = (c.rooms||[]).filter(r=>r.name).map(r=>`${r.name}${r.jyou?r.jyou+'帖':''}`).join('・');

        const res = await fetch('/api/analyze',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            model:'claude-sonnet-4-20250514',
            max_tokens:2000,
            messages:[{
              role:'user',
              content:[
                ...validImgs,
                {type:'text',text:`あなたは住宅プレゼンのプロライターです。
画像と以下の情報から、住宅のプレゼン資料用テキストを生成してください。

建物情報: ${styleInfo}
部屋構成: ${roomInfo||'不明'}
選択可能なこだわりタグ: ${allFeatures}

【面積の読み取り方】
間取り図に「1F 67.23㎡」「延床面積 123.45㎡」「敷地面積 200.00㎡」などの数値が記載されていればそれを読み取ってください。
記載がない場合は "" にしてください。数値のみ（単位なし）で返してください。

以下のJSON形式のみで返してください（余計な文字一切不要）:
{
  "title": "キャッチーで詩的な住宅タイトル（15文字以内）",
  "subtitle": "暮らしの魅力を伝えるサブタイトル（30文字以内）",
  "concept": "この家のコンセプトや設計の想いを3〜5文（200文字程度・です・ます調）",
  "highlights": ["特徴1（20文字以内）","特徴2","特徴3","特徴4","特徴5"],
  "features": ["タグ1","タグ2"],
  "area": { "floor1": "67.23", "floor2": "55.00", "land": "200.00" }
}
※ area の値は数値文字列（例: "67.23"）または不明なら ""。絶対に説明文を入れないこと。`}
              ]
            }]
          })
        });
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if(data.error) throw new Error(data.error.message||'APIエラー');
        const text = data.content?.[0]?.text||'';
        const match = text.match(/\{[\s\S]*\}/);
        if(!match) throw new Error('生成結果を取得できませんでした');
        const result = JSON.parse(match[0]);

        const f1 = result.area?.floor1 || c.area?.floor1 || "";
        const f2 = result.area?.floor2 || c.area?.floor2 || "";
        const land = result.area?.land || c.area?.land || "";
        const total = f1 && f2 ? (Number(f1)+Number(f2)).toFixed(2) : f1||f2||c.area?.total||"";
        const tsubo = total ? (Number(total)/3.306).toFixed(1) : c.tsubo||"";

        const updated = {
          ...c,
          title: result.title||c.title,
          subtitle: result.subtitle||c.subtitle,
          concept: result.concept||c.concept,
          highlights: result.highlights?.length>0 ? result.highlights : (c.highlights||[]),
          features: result.features?.length>0 ? result.features : (c.features||[]),
          area: { ...(c.area||{}), floor1: f1, floor2: f2, land, total },
          tsubo,
        };
        await sbUpdateCase(config.url, config.key, c._sbId, updated);
        setCases(p=>p.map(x=>x._sbId===c._sbId?{...updated,_sbId:c._sbId}:x));
      } catch(e) {
        errors++;
      }
      setBatchProgress({done:i+1,total:targets.length,errors});
      if(i<targets.length-1) await new Promise(r=>setTimeout(r,500));
    }
    setBatchProcessing(false);
    alert(`一括AI自動入力が完了しました。\n成功: ${targets.length-errors}件 / エラー: ${errors}件`);
  }

  async function batchApplyDefaultSpecs() {
    const targets = cases.filter(c => {
      const sp = c.specs || {};
      return Object.keys(DEFAULT_SPECS).some(k => DEFAULT_SPECS[k] && !sp[k]);
    });
    if(targets.length===0){ alert('仕様が未入力の物件が見つかりませんでした'); return; }
    if(!window.confirm(`${targets.length}件の物件の未入力仕様にデフォルト値を適用します。よろしいですか？`)) return;
    let errors = 0;
    for(const c of targets){
      try{
        const newSpecs = Object.fromEntries(Object.keys(DEFAULT_SPECS).map(k=>[k,(c.specs||{})[k]||(DEFAULT_SPECS[k]||"")]));
        const updated = {...c, specs: newSpecs};
        await sbUpdateCase(config.url, config.key, c._sbId, updated);
        setCases(p=>p.map(x=>x._sbId===c._sbId?{...updated,_sbId:c._sbId}:x));
      }catch(e){ errors++; }
    }
    alert(`仕様デフォルト適用が完了しました。\n成功: ${targets.length-errors}件 / エラー: ${errors}件`);
  }

  // ドラッグ＆ドロップ（部屋）
  function onDragStart(i){setDragIdx(i);}
  function onImgDragStart(i){setImgDragIdx(i);}
  function onImgDragOver(e,i){e.preventDefault();if(imgDragIdx===null||imgDragIdx===i)return;const imgs=[...(formData.images||[])];const[moved]=imgs.splice(imgDragIdx,1);imgs.splice(i,0,moved);setFormData(f=>({...f,images:imgs}));setImgDragIdx(i);}
  function onImgDragEnd(){setImgDragIdx(null);}
  function onDragOver(e,i){e.preventDefault();if(dragIdx===null||dragIdx===i)return;const rs=[...formData.rooms];const[moved]=rs.splice(dragIdx,1);rs.splice(i,0,moved);setFormData(f=>({...f,rooms:rs}));setDragIdx(i);}
  function onDragEnd(){setDragIdx(null);}

  function setSpec(k,v){setFormData(f=>({...f,specs:{...f.specs,[k]:v}}));}

  const currentCase=selectedCase?(cases.find(c=>c._sbId===selectedCase._sbId)||selectedCase):null;
  if(!config)return <SetupScreen onSave={saveConfig}/>;

  return(
    <div style={{fontFamily:"'Noto Serif JP','Georgia',serif",background:"#faf8f5",minHeight:"100vh",color:"#1a1612"}}>
      <style>{`*{box-sizing:border-box}button,input,textarea,select{font-family:inherit}.card{transition:transform .2s,box-shadow .2s;cursor:pointer}.card:hover{transform:translateY(-3px);box-shadow:0 12px 36px rgba(0,0,0,.1)!important}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.thumb-img{cursor:pointer;transition:opacity .15s}.thumb-img:hover{opacity:.8}.pdf-print-area{display:none}.pdf-page{page-break-after:always}`}</style>

      {pdfSelectModal&&<PdfSelectModal onClose={()=>{setPdfSelectModal(null);setPdfCustomerName("");}} onGenerate={name=>{setPdfModal({c:pdfSelectModal,customerName:name});setPdfSelectModal(null);}}/>}
      {pdfModal&&<PdfPrintModal c={pdfModal.c} customerName={pdfModal.customerName} similarCases={cases.filter(x=>x._sbId!==pdfModal.c._sbId&&(x.layout===pdfModal.c.layout||x.style===pdfModal.c.style)).slice(0,3)} onClose={()=>setPdfModal(null)} priceItemsForPdf={priceItems}/>}
      {lightbox&&<Lightbox images={lightbox.images} idx={lightbox.idx} onClose={()=>setLightbox(null)} onPrev={()=>setLightbox(l=>({...l,idx:(l.idx-1+l.images.length)%l.images.length}))} onNext={()=>setLightbox(l=>({...l,idx:(l.idx+1)%l.images.length}))}/>}

      <header style={{background:"white",borderBottom:"1px solid #e8e2d8",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",height:58}}>
          <div onClick={()=>setView("gallery")} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none"><path d="M14 3L3 11v14h8v-8h6v8h8V11L14 3z" stroke="#c9a96e" strokeWidth="1.5" fill="none" strokeLinejoin="round"/></svg>
            <div><div style={{fontSize:15,fontWeight:700,letterSpacing:".04em"}}>間取り検索</div><div style={{fontSize:9,color:"#a89a8a",letterSpacing:".12em"}}>Powered by Supabase</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {favorites.size>0&&<button onClick={()=>{setShowFavs(!showFavs);setView("gallery");}} style={{padding:"5px 12px",border:`1px solid ${showFavs?"#c9a96e":"#e0d8cc"}`,borderRadius:20,background:showFavs?"#fff8ee":"white",cursor:"pointer",fontSize:12,color:showFavs?"#c9a96e":"#5a4a3a"}}>♥ {favorites.size}</button>}
            <button onClick={()=>setView(["admin","adminForm"].includes(view)?"gallery":(adminUnlocked?"admin":"adminLogin"))} style={{padding:"5px 12px",border:"1px solid #e0d8cc",borderRadius:20,background:["admin","adminForm"].includes(view)?"#fff8ee":"white",cursor:"pointer",fontSize:12,color:"#8a7a6a"}}>{["admin","adminForm"].includes(view)?"← ギャラリーへ":"⚙ 管理"}</button>
          </div>
        </div>
      </header>

      {loading&&<div style={{textAlign:"center",padding:"60px",color:"#8a7a6a"}}>読み込み中...</div>}
      {loadErr&&<div style={{margin:"20px 28px",padding:"12px 16px",background:"#fce4e4",borderRadius:8,color:"#c0392b",fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>⚠ {loadErr}</span><button onClick={()=>fetchCases(config)} style={{padding:"4px 12px",border:"1px solid #c0392b",borderRadius:5,background:"white",color:"#c0392b",cursor:"pointer",fontSize:12}}>再試行</button></div>}

      {/* ── ADMIN LOGIN ── */}
      {view==="adminLogin"&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"80vh"}}>
          <div style={{background:"white",borderRadius:14,padding:"36px 44px",border:"1px solid #e8e2d8",textAlign:"center",width:340}}>
            <div style={{fontSize:32,marginBottom:14}}>🔐</div>
            <h2 style={{margin:"0 0 16px",fontSize:18}}>管理パネル</h2>
            <input type="password" value={pwInput} onChange={e=>setPwInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){if(pwInput===ADMIN_PASSWORD){setAdminUnlocked(true);setView("admin");setPwError(false);}else setPwError(true);}}} placeholder="パスワード" style={{...inp,marginBottom:8,border:`1px solid ${pwError?"#e74c3c":"#d4cfc5"}`}}/>
            {pwError&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:8}}>パスワードが違います</div>}
            <button onClick={()=>{if(pwInput===ADMIN_PASSWORD){setAdminUnlocked(true);setView("admin");setPwError(false);}else setPwError(true);}} style={{width:"100%",padding:10,background:"#1a1612",color:"#c9a96e",border:"none",borderRadius:8,fontSize:14,cursor:"pointer",fontWeight:700}}>ログイン</button>
          </div>
        </div>
      )}

      {/* ── ADMIN PANEL ── */}
      {view==="admin"&&adminUnlocked&&(
        <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 28px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h2 style={{margin:0,fontSize:20}}>間取り事例の管理</h2>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
                <button onClick={batchAutoGenerate} disabled={batchProcessing} style={{padding:"9px 16px",background:batchProcessing?"#a89a8a":"#1e3a5f",color:"white",border:"none",borderRadius:8,fontSize:13,cursor:batchProcessing?"not-allowed":"pointer",fontWeight:700}}>
                  {batchProcessing?`⏳ 処理中... ${batchProgress.done}/${batchProgress.total}件`:"🤖 未入力物件を一括AI自動入力"}
                </button>
                <button onClick={batchApplyDefaultSpecs} style={{padding:"9px 16px",background:"#5a7a5a",color:"white",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",fontWeight:700}}>⚙ 仕様デフォルト一括適用</button>
                <button onClick={()=>fetchCases(config)} style={{padding:"7px 14px",border:"1px solid #c9b89a",borderRadius:7,background:"white",cursor:"pointer",fontSize:12}}>↺</button>
                <button onClick={openNew} style={{padding:"9px 20px",background:"#c9a96e",color:"white",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",fontWeight:700}}>＋ 新規追加</button>
              </div>
          </div>
          {cases.length===0&&!loading&&<div style={{textAlign:"center",padding:"60px",color:"#8a7a6a"}}><div style={{fontSize:40,opacity:.3,marginBottom:10}}>🏠</div><div>事例がまだありません</div></div>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:18}}>
            {cases.map(c=>{const csi=STYLES_DEF[c.style]||STYLES_DEF["ナチュラル"];return(
              <div key={c._sbId} style={{background:"white",borderRadius:11,overflow:"hidden",border:"1px solid #e8e2d8"}}>
                <div style={{position:"relative"}}><CaseImage c={c} height={120}/><div style={{position:"absolute",top:7,left:7,background:csi.accent,color:"white",padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700}}>{c.style}</div></div>
                <div style={{padding:"12px 14px"}}>
                  <div style={{fontWeight:700,fontSize:12,marginBottom:2}}>{c.title||"（未設定）"}</div>
                  <div style={{fontSize:11,color:"#8a7a6a",marginBottom:10}}>{c.buildType} / {c.layout} / {c.floors}</div>
                  <div style={{display:"flex",gap:7}}><button onClick={()=>openEdit(c)} style={{flex:1,padding:"6px",border:"1px solid #c9b89a",borderRadius:6,background:"white",cursor:"pointer",fontSize:12}}>✏ 編集</button><button onClick={()=>setDeleteConfirm(c._sbId)} style={{padding:"6px 11px",border:"1px solid #f5c6cb",borderRadius:6,background:"#fff5f5",color:"#c0392b",cursor:"pointer",fontSize:12}}>削除</button></div>
                </div>
              </div>
            );})}
          </div>
          {deleteConfirm&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}><div style={{background:"white",borderRadius:12,padding:"32px 36px",textAlign:"center",maxWidth:320,width:"90%"}}><div style={{fontSize:36,marginBottom:12}}>🗑️</div><h3 style={{margin:"0 0 6px"}}>削除しますか？</h3><p style={{color:"#6a5a4a",fontSize:13,margin:"0 0 20px"}}>データも削除されます。</p><div style={{display:"flex",gap:10,justifyContent:"center"}}><button onClick={()=>setDeleteConfirm(null)} style={{padding:"9px 20px",border:"1px solid #d4cfc5",borderRadius:7,background:"white",cursor:"pointer"}}>キャンセル</button><button onClick={()=>handleDelete(deleteConfirm)} style={{padding:"9px 20px",background:"#c0392b",color:"white",border:"none",borderRadius:7,cursor:"pointer",fontWeight:700}}>削除する</button></div></div></div>}
        </div>
      )}

      {/* ── ADMIN FORM ── */}
      {view==="adminForm"&&adminUnlocked&&(
        <div style={{maxWidth:840,margin:"0 auto",padding:"28px 28px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div><button onClick={()=>setView("admin")} style={{background:"none",border:"none",cursor:"pointer",color:"#8a7a6a",fontSize:13,padding:0,marginBottom:3}}>← 一覧へ</button><h2 style={{margin:0,fontSize:19}}>{editingCase!=null?"事例を編集":"新規事例を追加"}</h2></div>
            <button onClick={handleSaveCase} disabled={saveStatus==="saving"} style={{padding:"9px 24px",background:saveStatus==="saving"?"#8a7a6a":"#1a1612",color:"#c9a96e",border:"none",borderRadius:8,fontSize:14,cursor:saveStatus==="saving"?"not-allowed":"pointer",fontWeight:700}}>{saveStatus==="saving"?"保存中...":saveStatus==="saved"?"✓ 保存済み":"保存する"}</button>
          </div>
          {saveErr&&<div style={{marginBottom:14,padding:"10px 14px",background:"#fce4e4",borderRadius:8,color:"#c0392b",fontSize:13}}>⚠ {saveErr}</div>}

          <div style={{display:"flex",flexDirection:"column",gap:16}}>

            {/* メイン写真 */}
            <Sec title="📷 メイン写真">
              <div style={{display:"flex",gap:18,alignItems:"flex-start"}}>
                <div style={{width:180,height:120,borderRadius:9,overflow:"hidden",border:"1px solid #e0d8cc",flexShrink:0,background:"#f5f0e8"}}>{formData.image?<img src={formData.image} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"#a89a8a",fontSize:12}}>プレビュー</div>}</div>
                <div style={{flex:1}}>
                  <label style={{display:"inline-block",padding:"9px 16px",background:imgUploading?"#a89a8a":"#c9a96e",color:"white",borderRadius:7,cursor:imgUploading?"not-allowed":"pointer",fontSize:13,fontWeight:600}}>{imgUploading?"アップ中...":"📁 写真を選ぶ"}<input ref={imgRef} type="file" accept="image/*" onChange={handleMainImg} style={{display:"none"}} disabled={imgUploading}/></label>
                  {formData.image&&<button onClick={()=>setFormData(f=>({...f,image:""}))} style={{marginTop:7,display:"block",padding:"4px 10px",border:"1px solid #f5c6cb",borderRadius:5,background:"#fff5f5",color:"#c0392b",cursor:"pointer",fontSize:11}}>削除</button>}
                </div>
              </div>
            </Sec>

            {/* 間取り画像 */}
            <Sec title="📐 間取り画像（平屋・1F・2F）">
              <div style={{fontSize:11,color:"#a89a8a",marginBottom:8}}>間取り図を登録後、🤖 ボタンでAIが部屋名・帖数を自動入力します</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:10}}>
                {(formData.floorImages||[]).map((img,i)=>{
                  const floorNum = i===0?1:2;
                  const floorLabel = i===0?(formData.floors==="平屋"?"平屋":"1F"):"2F";
                  const isAnalyzing = aiAnalyzing&&aiFloor===floorNum;
                  return(
                    <div key={i} style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                      <div style={{position:"relative",width:120,height:84,borderRadius:7,overflow:"hidden",border:"2px solid #b8d4e8"}}>
                        <img src={img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        <div style={{position:"absolute",bottom:2,left:4,color:"white",fontSize:10,background:"rgba(30,58,95,.7)",padding:"1px 5px",borderRadius:3}}>{floorLabel}</div>
                        <button onClick={()=>setFormData(f=>({...f,floorImages:f.floorImages.filter((_,j)=>j!==i)}))} style={{position:"absolute",top:3,right:3,background:"rgba(192,57,43,.85)",border:"none",borderRadius:"50%",width:18,height:18,color:"white",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                      </div>
                      <button onClick={()=>analyzeFloorPlan(img,floorNum)} disabled={isAnalyzing||aiAnalyzing}
                        style={{width:120,padding:"5px 0",border:"none",borderRadius:6,background:isAnalyzing?"#a89a8a":"#1e3a5f",color:"white",fontSize:11,cursor:isAnalyzing||aiAnalyzing?"not-allowed":"pointer",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                        {isAnalyzing?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⏳</span>解析中...</>:<>🤖 AI自動入力</>}
                      </button>
                    </div>
                  );
                })}
                {(formData.floorImages||[]).length<2&&(
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    <label style={{width:120,height:84,borderRadius:7,border:"2px dashed #b8d4e8",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:floorImgUploading?"not-allowed":"pointer",background:"white",color:"#5a8aaa",fontSize:11,gap:3}}>
                      {floorImgUploading?"...":<><span style={{fontSize:22}}>＋</span><span>間取り追加</span></>}
                      <input ref={floorImgRef} type="file" accept="image/*" onChange={handleFloorImg} style={{display:"none"}} disabled={floorImgUploading}/>
                    </label>
                  </div>
                )}
              </div>
            </Sec>

            {/* パース・内観画像 */}
            <Sec title="🖼 パース・内観画像（外観・室内・パースなど）">
              <div style={{fontSize:11,color:"#a89a8a",marginBottom:8}}>☰ でドラッグ並び替え可能</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:10}}>
                {(formData.images||[]).map((img,i)=>(
                  <div key={i} draggable onDragStart={()=>onImgDragStart(i)} onDragOver={e=>onImgDragOver(e,i)} onDragEnd={onImgDragEnd}
                    style={{position:"relative",width:120,height:84,borderRadius:7,overflow:"hidden",border:`2px solid ${imgDragIdx===i?"#c9a96e":"#e0d8cc"}`,cursor:"grab",opacity:imgDragIdx===i?0.5:1,flexShrink:0}}>
                    <img src={img} style={{width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none"}}/>
                    <div style={{position:"absolute",top:2,left:3,color:"rgba(255,255,255,.8)",fontSize:12,pointerEvents:"none"}}>☰</div>
                    <button onClick={()=>setFormData(f=>({...f,images:f.images.filter((_,j)=>j!==i)}))} style={{position:"absolute",top:3,right:3,background:"rgba(192,57,43,.85)",border:"none",borderRadius:"50%",width:18,height:18,color:"white",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                  </div>
                ))}
                <label style={{width:120,height:84,borderRadius:7,border:"2px dashed #c9b89a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:addImgUploading?"not-allowed":"pointer",background:"white",color:"#8a7a6a",fontSize:11,gap:3}}>
                  {addImgUploading?"...":<><span style={{fontSize:22}}>＋</span><span>追加</span></>}
                  <input ref={addImgRef} type="file" accept="image/*" onChange={handleAddImg} style={{display:"none"}} disabled={addImgUploading}/>
                </label>
              </div>
            </Sec>

            {/* YouTube */}
            <Sec title="▶ YouTubeリンク">
              <input value={formData.youtube||""} onChange={e=>setFormData(f=>({...f,youtube:e.target.value}))} style={inp} placeholder="https://www.youtube.com/watch?v=..."/>
            </Sec>

            {/* AI一括生成 */}
            <div style={{background:"linear-gradient(135deg,#1e3a5f,#2d5a8e)",borderRadius:10,padding:"18px 20px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{color:"white",fontWeight:700,fontSize:15,marginBottom:4}}>🤖 AI一括自動生成</div>
                <div style={{color:"rgba(255,255,255,.7)",fontSize:12}}>画像からタイトル・サブタイトル・コンセプト・ハイライトを自動生成</div>
                <div style={{color:"rgba(255,255,255,.55)",fontSize:11,marginTop:3}}>※ メイン画像またはパース画像を先に登録してください</div>
              </div>
              <button onClick={autoGenerateAll} disabled={aiGenerating}
                style={{padding:"10px 20px",background:aiGenerating?"rgba(255,255,255,.2)":"rgba(255,255,255,.95)",color:aiGenerating?"rgba(255,255,255,.6)":"#1e3a5f",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:aiGenerating?"not-allowed":"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6,minWidth:140,justifyContent:"center"}}>
                {aiGenerating?<><span>⏳</span>生成中...</>:<><span>✨</span>自動生成</>}
              </button>
            </div>

            {/* 基本情報 */}
            <Sec title="📋 基本情報">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11}}>
                <div style={{gridColumn:"1/-1",marginBottom:4}}>
                  <Lbl>商品名</Lbl>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:6}}>
                    {["FourS","Poche","colore","racie","stela"].map(p=>(
                      <button type="button" key={p} onClick={()=>setFormData(f=>({...f,productName:f.productName===p?"":p}))}
                        style={{padding:"6px 16px",border:`1px solid ${formData.productName===p?"#1e3a5f":"#d4cfc5"}`,borderRadius:20,background:formData.productName===p?"#1e3a5f":"white",color:formData.productName===p?"white":"#5a4a3a",cursor:"pointer",fontSize:13,fontWeight:formData.productName===p?700:400}}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <input value={formData.productName||""} onChange={e=>setFormData(f=>({...f,productName:e.target.value}))} style={{...inp}} placeholder="その他の場合は直接入力"/>
                </div>
                <div style={{gridColumn:"1/-1"}}><Lbl>タイトル *</Lbl><input value={formData.title} onChange={e=>setFormData(f=>({...f,title:e.target.value}))} style={inp} placeholder="例: 光と緑に包まれる、家族の居場所"/></div>
                <div style={{gridColumn:"1/-1"}}><Lbl>サブタイトル</Lbl><input value={formData.subtitle} onChange={e=>setFormData(f=>({...f,subtitle:e.target.value}))} style={inp}/></div>
                {[{l:"建物タイプ",k:"buildType",opts:BUILD_TYPE_LIST},{l:"スタイル",k:"style",opts:STYLE_LIST},{l:"間取り",k:"layout",opts:LAYOUT_LIST},{l:"階数",k:"floors",opts:FLOOR_LIST},{l:"構造",k:"structure",opts:STRUCT_LIST},{l:"向き",k:"direction",opts:DIR_LIST}].map(({l,k,opts})=>(
                  <div key={k}><Lbl>{l}</Lbl><select value={formData[k]} onChange={e=>setFormData(f=>({...f,[k]:e.target.value}))} style={sel}>{opts.map(o=><option key={o}>{o}</option>)}</select></div>
                ))}
                <div><Lbl>竣工年</Lbl><input type="number" value={formData.year} onChange={e=>setFormData(f=>({...f,year:Number(e.target.value)}))} style={inp}/></div>
                <div><Lbl>施工地</Lbl><input value={formData.location} onChange={e=>setFormData(f=>({...f,location:e.target.value}))} style={inp}/></div>
                <div><Lbl>予算目安</Lbl>
                  <select value={BUDGET_LIST.includes(formData.budget)?formData.budget:""} onChange={e=>setFormData(f=>({...f,budget:e.target.value}))} style={sel}>
                    <option value="">選択してください</option>
                    {BUDGET_LIST.map(b=><option key={b} value={b}>{b}</option>)}
                  </select>
                  {!BUDGET_LIST.includes(formData.budget)&&formData.budget&&<input value={formData.budget} onChange={e=>setFormData(f=>({...f,budget:e.target.value}))} style={{...inp,marginTop:4}} placeholder="直接入力"/>}
                </div>
              </div>
            </Sec>

            {/* 面積・坪数 */}
            <Sec title="📐 面積・坪数">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11,marginBottom:12}}>
                <div>
                  <Lbl>1階面積(㎡)</Lbl>
                  <input type="number" step="0.01" value={formData.area?.floor1||""} onChange={e=>{
                    const f1=e.target.value;
                    const f2=formData.area?.floor2||"";
                    const total=f1&&f2?(Number(f1)+Number(f2)).toFixed(2):f1?f1:f2?f2:"";
                    const tsubo=total?(Number(total)/3.306).toFixed(1):"";
                    setFormData(f=>({...f,area:{...f.area,floor1:f1,total},tsubo}));
                  }} style={inp} placeholder="例: 60.66"/>
                </div>
                <div>
                  <Lbl>2階面積(㎡)　{formData.floors==="平屋"?"（平屋は不要）":""}</Lbl>
                  <input type="number" step="0.01" value={formData.area?.floor2||""} onChange={e=>{
                    const f2=e.target.value;
                    const f1=formData.area?.floor1||"";
                    const total=f1&&f2?(Number(f1)+Number(f2)).toFixed(2):f1?f1:f2?f2:"";
                    const tsubo=total?(Number(total)/3.306).toFixed(1):"";
                    setFormData(f=>({...f,area:{...f.area,floor2:f2,total},tsubo}));
                  }} style={{...inp,background:formData.floors==="平屋"?"#f5f0e8":"white"}} placeholder="例: 60.66" disabled={formData.floors==="平屋"}/>
                </div>
                <div>
                  <Lbl>敷地面積(㎡)</Lbl>
                  <input type="number" step="0.01" value={formData.area?.land||""} onChange={e=>setFormData(f=>({...f,area:{...f.area,land:e.target.value}}))} style={inp} placeholder="例: 200"/>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
                <div style={{background:"#f5f0e8",borderRadius:7,padding:"10px 14px"}}>
                  <div style={{fontSize:11,color:"#8a7a6a",marginBottom:3}}>延床面積（自動計算）</div>
                  <div style={{fontSize:18,fontWeight:700,color:"#1a1612"}}>{formData.area?.total?`${formData.area.total}㎡`:"—"}</div>
                </div>
                <div style={{background:"#f5f0e8",borderRadius:7,padding:"10px 14px"}}>
                  <div style={{fontSize:11,color:"#8a7a6a",marginBottom:3}}>坪数（自動計算）</div>
                  <div style={{fontSize:18,fontWeight:700,color:"#1a1612"}}>{formData.tsubo?`${formData.tsubo}坪`:"—"}</div>
                </div>
              </div>
            </Sec>

            {/* コンセプト */}
            <Sec title="💬 コンセプト"><textarea rows={4} value={formData.concept} onChange={e=>setFormData(f=>({...f,concept:e.target.value}))} style={{...inp,resize:"vertical"}} placeholder="この住まいのコンセプトや設計の想いを記入してください"/></Sec>

            {/* ハイライト */}
            <Sec title="✦ ハイライト（最大5項目）">
              {(formData.highlights||[]).map((h,i)=>(
                <div key={i} style={{display:"flex",gap:7,marginBottom:7,alignItems:"center"}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:"#1a1612",color:"#c9a96e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{i+1}</div>
                  <input value={h} onChange={e=>{const hl=[...formData.highlights];hl[i]=e.target.value;setFormData(f=>({...f,highlights:hl}));}} style={{...inp,flex:1}} placeholder={`ハイライト ${i+1}`}/>
                  {formData.highlights.length>1&&<button onClick={()=>setFormData(f=>({...f,highlights:f.highlights.filter((_,j)=>j!==i)}))} style={{padding:"5px 9px",border:"1px solid #f5c6cb",borderRadius:5,background:"#fff5f5",color:"#c0392b",cursor:"pointer"}}>×</button>}
                </div>
              ))}
              {(formData.highlights||[]).length<5&&<button onClick={()=>setFormData(f=>({...f,highlights:[...f.highlights,""]}))} style={{padding:"6px 12px",border:"1px dashed #c9b89a",borderRadius:6,background:"transparent",cursor:"pointer",fontSize:12,color:"#6a5a4a"}}>＋ 追加</button>}
            </Sec>

            {/* 金額内訳（この事例専用） */}
            <Sec title="💴 金額内訳（この事例専用）">
              <div style={{fontSize:11,color:"#a89a8a",marginBottom:10}}>
                この事例専用の金額内訳を登録します。登録するとプレゼンと詳細ページに反映されます。
              </div>
              <CasePriceEditor config={config} caseId={editingCase} priceItems={priceItems} setPriceItems={setPriceItems}/>
            </Sec>

            {/* 部屋構成 - 1F/2F分割表示 */}
            <Sec title="🛋 部屋構成">
              {[{floorNum:1,label:"1階",addLabel:"＋ 1階に部屋を追加"},{...(formData.floors!=="平屋"?{floorNum:2,label:"2階",addLabel:"＋ 2階に部屋を追加"}:{floorNum:null})}].filter(f=>f.floorNum).map(({floorNum,label,addLabel})=>{
                const floorRooms=(formData.rooms||[]).filter(r=>r.floor===floorNum);
                const floorBg=floorNum===1?"#f0f4ff":"#fff8f0";
                const floorAccent=floorNum===1?"#3a6aaa":"#aa6a3a";
                return(
                  <div key={floorNum} style={{marginBottom:16,border:`1px solid ${floorAccent}30`,borderRadius:8,overflow:"hidden"}}>
                    <div style={{background:floorNum===1?"#1e3a5f":"#5a3a1e",padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{color:"white",fontSize:13,fontWeight:700}}>{label}</span>
                      <span style={{color:"rgba(255,255,255,.6)",fontSize:11}}>{floorRooms.length}部屋</span>
                    </div>
                    <div style={{padding:"10px 12px",background:floorBg}}>
                      {floorRooms.length===0&&<div style={{fontSize:12,color:"#a89a8a",padding:"6px 0"}}>部屋が未登録です</div>}
                      {(formData.rooms||[]).map((r,i)=>r.floor!==floorNum?null:(
                        <div key={i} draggable onDragStart={()=>onDragStart(i)} onDragOver={e=>onDragOver(e,i)} onDragEnd={onDragEnd}
                          style={{display:"grid",gridTemplateColumns:"auto 2fr 1.5fr auto",gap:7,marginBottom:7,alignItems:"center",opacity:dragIdx===i?0.5:1,background:dragIdx===i?"#f5f0e8":"white",borderRadius:6,padding:"8px 10px",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
                          <div style={{cursor:"grab",color:"#a89a8a",fontSize:16,userSelect:"none"}}>☰</div>
                          <div>
                            <select value={ROOM_NAMES.includes(r.name)?r.name:"__custom__"} onChange={e=>{const rs=[...formData.rooms];rs[i]={...rs[i],name:e.target.value==="__custom__"?"":e.target.value};setFormData(f=>({...f,rooms:rs}));}} style={{...sel,fontSize:13}}>
                              {ROOM_NAMES.map(n=><option key={n} value={n}>{n}</option>)}
                              <option value="__custom__">その他</option>
                            </select>
                            {(!ROOM_NAMES.includes(r.name)||r.name==="")&&<input value={r.name} onChange={e=>{const rs=[...formData.rooms];rs[i]={...rs[i],name:e.target.value};setFormData(f=>({...f,rooms:rs}));}} style={{...inp,marginTop:4,fontSize:12}} placeholder="部屋名を入力"/>}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            <input type="number" min="0.5" max="50" step="0.5" value={r.jyou||""}
                              onChange={e=>{const rs=[...formData.rooms];rs[i]={...rs[i],jyou:e.target.value};setFormData(f=>({...f,rooms:rs}));}}
                              placeholder="帖" style={{...inp,width:60,textAlign:"center",fontSize:13}}/>
                            <span style={{fontSize:12,color:"#8a7a6a"}}>帖</span>
                          </div>
                          <button onClick={()=>setFormData(f=>({...f,rooms:f.rooms.filter((_,j)=>j!==i)}))} style={{padding:"6px 8px",border:"1px solid #f5c6cb",borderRadius:5,background:"#fff5f5",color:"#c0392b",cursor:"pointer"}}>×</button>
                        </div>
                      ))}
                      <button onClick={()=>setFormData(f=>({...f,rooms:[...f.rooms,{name:"LDK",floor:floorNum,jyou:""}]}))} style={{padding:"5px 12px",border:"1px dashed #c9b89a",borderRadius:6,background:"transparent",cursor:"pointer",fontSize:12,color:"#6a5a4a",marginTop:2}}>{addLabel}</button>
                    </div>
                  </div>
                );
              })}
            </Sec>

            {/* こだわり */}
            <Sec title="⊕ こだわり">
              <div style={{marginBottom:10,display:"flex",flexWrap:"wrap",gap:5}}>{(formData.features||[]).map(f=>(<span key={f} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"3px 10px",borderRadius:20,border:"1px solid #c9b89a",fontSize:12,background:"#fff8ee"}}>{f}<button onClick={()=>setFormData(fd=>({...fd,features:fd.features.filter(x=>x!==f)}))} style={{background:"none",border:"none",color:"#c0392b",cursor:"pointer",padding:0,fontSize:13}}>×</button></span>))}</div>
              {FEAT_CATEGORIES.map(cat=>(
                <div key={cat.label} style={{marginBottom:9}}>
                  <div style={{fontSize:11,color:"#8a7a6a",marginBottom:4,fontWeight:600}}>{cat.label}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{cat.items.filter(f=>!(formData.features||[]).includes(f)).map(f=>(<button key={f} onClick={()=>setFormData(fd=>({...fd,features:[...(fd.features||[]),f]}))} style={{padding:"3px 10px",border:"1px dashed #c9b89a",borderRadius:20,background:"white",cursor:"pointer",fontSize:11,color:"#6a5a4a"}}>＋{f}</button>))}</div>
                </div>
              ))}
            </Sec>

            {/* 設備仕様 */}
            <Sec title="🔧 設備仕様">
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:"#5a4a3a",marginBottom:8,paddingBottom:5,borderBottom:"1px solid #f0ebe0"}}>キッチン・水回り</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[["kitchen","キッチン"],["bath","浴室"],["washroom","洗面化粧台"],["toilet","トイレ"]].map(([k,l])=>(<div key={k}><Lbl>{l}</Lbl><SpecSelect value={formData.specs?.[k]||""} onChange={v=>setSpec(k,v)} opts={SPEC_OPTS[k]}/></div>))}
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:"#5a4a3a",marginBottom:8,paddingBottom:5,borderBottom:"1px solid #f0ebe0"}}>断熱仕様</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  {[["floorInsulation","床断熱"],["wallInsulation","壁断熱"],["ceilingInsulation","天井断熱材"]].map(([k,l])=>(<div key={k}><Lbl>{l}</Lbl><SpecSelect value={formData.specs?.[k]||""} onChange={v=>setSpec(k,v)} opts={SPEC_OPTS[k]}/></div>))}
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:"#5a4a3a",marginBottom:8,paddingBottom:5,borderBottom:"1px solid #f0ebe0"}}>内外装仕様</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[["outerWall","外壁"],["roof","屋根"],["sash","サッシ"],["floorMaterial","床"]].map(([k,l])=>(<div key={k}><Lbl>{l}</Lbl><SpecSelect value={formData.specs?.[k]||""} onChange={v=>setSpec(k,v)} opts={SPEC_OPTS[k]}/></div>))}
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:"#5a4a3a",marginBottom:8,paddingBottom:5,borderBottom:"1px solid #f0ebe0"}}>性能・仕様</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[["ventilation","換気システム"],["longLife","長期優良住宅"],["insulationGrade","断熱等級"],["quakeGrade","耐震等級"]].map(([k,l])=>(<div key={k}><Lbl>{l}</Lbl><SpecSelect value={formData.specs?.[k]||""} onChange={v=>setSpec(k,v)} opts={SPEC_OPTS[k]}/></div>))}
                </div>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"#5a4a3a",marginBottom:8,paddingBottom:5,borderBottom:"1px solid #f0ebe0"}}>太陽光・蓄電池・制震</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  <div><Lbl>太陽光（kW）</Lbl>
                    <select value={formData.specs?.solarKw||""} onChange={e=>setSpec("solarKw",e.target.value)} style={sel}>
                      <option value="">なし</option>
                      {SOLAR_KW.map(v=><option key={v} value={v}>{v}kW</option>)}
                    </select>
                  </div>
                  <div><Lbl>蓄電池（kWh）</Lbl>
                    <select value={formData.specs?.batteryKwh||""} onChange={e=>setSpec("batteryKwh",e.target.value)} style={sel}>
                      <option value="">なし</option>
                      {BATTERY_KWH.map(v=><option key={v} value={v}>{v}kWh</option>)}
                    </select>
                  </div>
                  <div><Lbl>制震ダンパー</Lbl>
                    <select value={formData.specs?.damper||""} onChange={e=>setSpec("damper",e.target.value)} style={sel}>
                      <option value="">-</option>
                      {SPEC_OPTS.damper.map(v=><option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </Sec>

            <div style={{display:"flex",justifyContent:"flex-end",gap:10,paddingTop:4}}>
              <button onClick={()=>setView("admin")} style={{padding:"9px 20px",border:"1px solid #d4cfc5",borderRadius:7,background:"white",cursor:"pointer",fontSize:13}}>キャンセル</button>
              <button onClick={handleSaveCase} disabled={saveStatus==="saving"} style={{padding:"9px 26px",background:saveStatus==="saving"?"#8a7a6a":"#1a1612",color:"#c9a96e",border:"none",borderRadius:7,cursor:saveStatus==="saving"?"not-allowed":"pointer",fontSize:14,fontWeight:700}}>{editingCase!=null?"更新する":"登録する"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── GALLERY ── */}
      {view==="gallery"&&!loading&&(
        <div style={{maxWidth:1440,margin:"0 auto",padding:"24px 28px",display:"flex",gap:22,alignItems:"flex-start"}}>
          {/* 左サイドバー */}
          <div style={{width:230,flexShrink:0,background:"white",borderRadius:12,padding:"16px 14px",border:"1px solid #e8e2d8",position:"sticky",top:66,maxHeight:"calc(100vh - 90px)",overflowY:"auto"}}>
            <div style={{fontSize:10,color:"#a89a8a",letterSpacing:".18em",marginBottom:12,fontWeight:600}}>絞り込む</div>

            <div style={{marginBottom:13}}>
              <div style={{fontSize:11,color:"#8a7a6a",marginBottom:5,fontWeight:600}}>建物タイプ</div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>{BUILD_TYPE_LIST.map(s=>{const a=filterBuildType===s;return(<button key={s} onClick={()=>setFBuildType(a?"":s)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${a?"#c9a96e":"#e0d8cc"}`,background:a?"#fff8ee":"white",color:a?"#7a5a2a":"#5a4a3a",fontSize:12,fontWeight:a?700:400,textAlign:"left",cursor:"pointer"}}>{a?"✓ ":""}{s}</button>);})}</div>
            </div>

            <div style={{borderTop:"1px solid #f0ebe0",marginBottom:13}}/>
            <div style={{marginBottom:13}}>
              <div style={{fontSize:11,color:"#8a7a6a",marginBottom:5,fontWeight:600}}>スタイル <span style={{fontSize:10,color:"#a89a8a"}}>(複数選択可)</span></div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>{STYLE_LIST.map(s=>{const a=filterStyles.includes(s);const csi=STYLES_DEF[s];return(<button key={s} onClick={()=>toggleStyle(s)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${a?(csi?.accent||"#c9a96e"):"#e0d8cc"}`,background:a?(csi?.light||"#fff8ee"):"white",color:a?(csi?.accent||"#7a5a2a"):"#5a4a3a",fontSize:12,fontWeight:a?700:400,textAlign:"left",cursor:"pointer"}}>{a?"✓ ":""}{s}</button>);})}</div>
            </div>

            <div style={{borderTop:"1px solid #f0ebe0",marginBottom:13}}/>
            <div style={{marginBottom:13}}>
              <div style={{fontSize:11,color:"#8a7a6a",marginBottom:5,fontWeight:600}}>間取り <span style={{fontSize:10,color:"#a89a8a"}}>(複数選択可)</span></div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>{LAYOUT_LIST.map(s=>{const a=filterLayouts.includes(s);return(<button key={s} onClick={()=>toggleLayout(s)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${a?"#c9a96e":"#e0d8cc"}`,background:a?"#fff8ee":"white",color:a?"#7a5a2a":"#5a4a3a",fontSize:12,fontWeight:a?700:400,textAlign:"left",cursor:"pointer"}}>{a?"✓ ":""}{s}</button>);})}</div>
            </div>

            <div style={{borderTop:"1px solid #f0ebe0",marginBottom:13}}/>
            <div style={{marginBottom:13}}>
              <div style={{fontSize:11,color:"#8a7a6a",marginBottom:5,fontWeight:600}}>階数</div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>{FLOOR_LIST.map(s=>{const a=filterFloor===s;return(<button key={s} onClick={()=>setFFloor(a?"":s)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${a?"#c9a96e":"#e0d8cc"}`,background:a?"#fff8ee":"white",color:a?"#7a5a2a":"#5a4a3a",fontSize:12,fontWeight:a?700:400,textAlign:"left",cursor:"pointer"}}>{a?"✓ ":""}{s}</button>);})}</div>
            </div>

            <div style={{borderTop:"1px solid #f0ebe0",marginBottom:13}}/>
            <div style={{marginBottom:13}}>
              <div style={{fontSize:11,color:"#8a7a6a",marginBottom:5,fontWeight:600}}>坪数</div>
              <select value={filterTsubo} onChange={e=>setFTsubo(e.target.value)} style={{width:"100%",padding:"7px 9px",border:"1px solid #d4cfc5",borderRadius:7,fontSize:12,background:"white",outline:"none"}}>
                <option value="">指定なし</option>
                {TSUBO_LIST.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{borderTop:"1px solid #f0ebe0",marginBottom:13}}/>
            <div style={{marginBottom:6}}>
              <div style={{fontSize:11,color:"#8a7a6a",marginBottom:5,fontWeight:600}}>予算目安</div>
              <select value={filterBudget} onChange={e=>setFBudget(e.target.value)} style={{width:"100%",padding:"7px 9px",border:"1px solid #d4cfc5",borderRadius:7,fontSize:12,background:"white",outline:"none"}}>
                <option value="">指定なし</option>
                {BUDGET_LIST.map(b=><option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <FeatureFilter selected={filterFeatures} onChange={toggleFF}/>
            {hasFilter&&<button onClick={clearFilters} style={{marginTop:12,width:"100%",padding:"6px",border:"1px dashed #c9b89a",borderRadius:7,background:"transparent",color:"#8a7a6a",fontSize:11,cursor:"pointer"}}>✕ リセット</button>}
          </div>

          {/* 右：カード */}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,color:"#8a7a6a",marginBottom:16}}><span style={{fontWeight:700,color:"#1a1612",fontSize:20}}>{filtered.length}</span> 件</div>
            {filtered.length===0?<div style={{textAlign:"center",padding:"80px 0",color:"#8a7a6a"}}><div style={{fontSize:44,marginBottom:14,opacity:.3}}>🏠</div><div>条件に合う事例が見つかりません</div></div>
            :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:20}}>
              {filtered.map((c,idx)=>{
                const csi=STYLES_DEF[c.style]||STYLES_DEF["ナチュラル"];const isFav=favorites.has(c._sbId);
                return(<div key={c._sbId} className="card" onClick={()=>{setSelected(c);setDetailTab("concept");setView("detail");window.scrollTo(0,0);}} style={{background:"white",borderRadius:13,overflow:"hidden",border:"1px solid #e8e2d8",boxShadow:"0 2px 8px rgba(0,0,0,.05)",animation:`fadeUp .3s ease ${idx*.04}s both`}}>
                  <div style={{position:"relative"}}>
                    <CaseImage c={c} height={190}/>
                    <div style={{position:"absolute",top:10,left:10,display:"flex",gap:4}}>
                      <span style={{background:csi.accent,color:"white",padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:700}}>{c.style}</span>
                      {c.buildType&&<span style={{background:"rgba(0,0,0,.45)",color:"white",padding:"3px 9px",borderRadius:20,fontSize:10}}>{c.buildType}</span>}
                    </div>
                    <button onClick={e=>toggleFav(c._sbId,e)} style={{position:"absolute",top:7,right:9,background:"white",border:"none",borderRadius:"50%",width:30,height:30,fontSize:16,cursor:"pointer",boxShadow:"0 2px 7px rgba(0,0,0,.12)",color:isFav?"#e05050":"#ccc"}}>{isFav?"♥":"♡"}</button>
                  </div>
                  <div style={{padding:"16px 18px 18px"}}>
                    <div style={{display:"flex",gap:5,marginBottom:9,flexWrap:"wrap"}}>{[c.layout,c.floors,c.tsubo?`${c.tsubo}坪`:null].filter(Boolean).map(t=><span key={t} style={{padding:"2px 8px",background:"#f5f0e8",borderRadius:20,fontSize:10,color:"#6a5a4a"}}>{t}</span>)}</div>
                    <h3 style={{margin:"0 0 3px",fontSize:15,fontWeight:700,lineHeight:1.4}}>{c.title}</h3>
                    <p style={{margin:"0 0 12px",fontSize:11,color:"#7a6a5a",lineHeight:1.6}}>{c.subtitle}</p>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",borderTop:"1px solid #f0ebe0",paddingTop:10}}>
                      <div><div style={{fontSize:10,color:"#a89a8a",marginBottom:1}}>{c.tsubo?"坪数":"延床"}</div><div style={{fontWeight:700,fontSize:14}}>{c.tsubo||c.area?.total}<span style={{fontSize:10,color:"#8a7a6a",fontWeight:400}}>{c.tsubo?"坪":"㎡"}</span></div></div>
                      <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#a89a8a",marginBottom:1}}>予算</div><div style={{fontWeight:700,fontSize:11,color:"#5a4a3a"}}>{c.budget}</div></div>
                      <div style={{display:"flex",gap:5}}>
                        <button onClick={e=>{e.stopPropagation();setPdfSelectModal(c);}} style={{padding:"5px 8px",background:"#f5f0e8",border:"1px solid #e0d8cc",borderRadius:5,fontSize:10,color:"#7a6a5a",cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>📄</button>
                        <div style={{background:csi.accent,color:"white",borderRadius:6,padding:"6px 12px",fontSize:11,fontWeight:700}}>詳しく →</div>
                      </div>
                    </div>
                  </div>
                </div>);
              })}
            </div>}
          </div>
        </div>
      )}

      {/* ── DETAIL（v0デザイン準拠） ── */}
      {view==="detail"&&currentCase&&(()=>{
        const c=currentCase;
        const csi=STYLES_DEF[c.style]||STYLES_DEF["ナチュラル"];
        const isFav=favorites.has(c._sbId);
        const f1=(c.rooms||[]).filter(r=>r.floor===1);
        const f2=(c.rooms||[]).filter(r=>r.floor===2);
        const floorImages=(c.floorImages||[]).filter(Boolean);
        const parsImages=(c.images||[]).filter(Boolean);
        const subImages=floorImages; // 間取り画像（後方互換）
        const allImages=[c.image,...parsImages].filter(Boolean);
        const sp=c.specs||{};
        let ytId=null;if(c.youtube){const m=c.youtube.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);if(m)ytId=m[1];}

        // v0デザイントークン
        const V={bg:"#f5f7fa",card:"#ffffff",fg:"#252d3d",primary:"#1e3a5f",secondary:"#edf0f5",muted:"#5c6b7a",border:"#d0d8e4"};
        const SERIF="'Noto Serif JP',Georgia,'Times New Roman',serif";
        const SANS="'Noto Sans JP','Hiragino Kaku Gothic ProN','Meiryo',sans-serif";

        function SecTitle({text}){return(
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
            <h3 style={{fontFamily:SERIF,fontSize:22,fontWeight:500,color:V.fg,whiteSpace:"nowrap",margin:0}}>{text}</h3>
            <div style={{flex:1,height:1,background:V.border}}/>
          </div>
        );}

        const landArea=c.area?.land||"";
        const totalArea=c.area?.total||"";
        const tsuboLand=landArea?"（"+(Number(landArea)/3.306).toFixed(2)+"坪）":"";
        const tsuboTotal=c.tsubo?"（"+c.tsubo+"坪）":totalArea?"（"+(Number(totalArea)/3.306).toFixed(2)+"坪）":"";

        // 見積もり計算
        function parseMid(str){if(!str)return 0;const n=(str.match(/[\d,]+/g)||[]).map(s=>parseInt(s.replace(/,/g,""),10));if(!n.length)return 0;if(str.startsWith("〜"))return n[0];if(str.endsWith("〜"))return n[0]*1.1;return(n[0]+(n[1]||n[0]))/2;}
        const midMan=parseMid(c.budget);
        const fmtYen=v=>v>0?"¥"+Math.round(v*10000).toLocaleString():"—";
        const honTai=midMan>0?Math.round(midMan*0.78):0;
        const futai=midMan>0?Math.round(midMan*0.09):0;
        const shohi=midMan>0?Math.round(midMan*0.07):0;
        const option=Math.round((Number(sp.solarKw||0)*30)+(Number(sp.batteryKwh||0)*15));
        const total=honTai+futai+shohi+option;

        const specCats=[
          {icon:"🌡",label:"断熱・気密",items:[sp.floorInsulation&&`床断熱: ${sp.floorInsulation}`,sp.wallInsulation&&`壁断熱: ${sp.wallInsulation}`,sp.ceilingInsulation&&`天井: ${sp.ceilingInsulation}`,sp.sash&&sp.sash,sp.insulationGrade&&`断熱等級${sp.insulationGrade}`,sp.ventilation&&`換気（${sp.ventilation}種）`].filter(Boolean)},
          {icon:"🏗",label:"構造・耐震",items:[sp.quakeGrade&&`耐震等級${sp.quakeGrade}相当`,sp.damper==="有"&&"制震ダンパー採用",c.structure&&`${c.structure}工法`,sp.longLife==="有"&&"長期優良住宅対応"].filter(Boolean)},
          {icon:"🔧",label:"設備・内装",items:[sp.kitchen&&`キッチン: ${sp.kitchen}`,sp.bath&&`浴室: ${sp.bath}`,sp.washroom&&`洗面: ${sp.washroom}`,sp.toilet&&`トイレ: ${sp.toilet}`,sp.floorMaterial&&sp.floorMaterial].filter(Boolean)},
          {icon:"⚡",label:"省エネ・スマート",items:[sp.solarKw&&`太陽光（${sp.solarKw}kW）`,sp.batteryKwh&&`蓄電池（${sp.batteryKwh}kWh）`,sp.damper==="有"&&"制震ダンパー"].filter(Boolean)},
        ];
        const iLabels=["リビング・ダイニング","キッチン","主寝室","バスルーム"];

        return(
          <div style={{fontFamily:SANS,background:V.bg,minHeight:"100vh",color:V.fg}}>

            {/* ── ヘッダー（v0準拠） ── */}
            <div style={{background:V.card,borderBottom:`1px solid ${V.border}`,padding:"16px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:40,height:40,background:V.primary,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"white"}}>🏠</div>
                <div>
                  <p style={{fontSize:14,fontWeight:700,letterSpacing:".12em",color:V.fg,margin:0}}>Tatsuken Archi Design</p>
                  <p style={{fontSize:12,color:V.muted,margin:0}}>Architectural Presentation</p>
                </div>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <button onClick={e=>toggleFav(c._sbId,e)} style={{width:36,height:36,borderRadius:"50%",border:`1px solid ${V.border}`,background:V.card,cursor:"pointer",fontSize:18,color:isFav?"#e05050":"#ccc",display:"flex",alignItems:"center",justifyContent:"center"}}>{isFav?"♥":"♡"}</button>
                <button onClick={()=>{setPdfSelectModal(c);}} style={{padding:"8px 16px",background:V.primary,color:"white",border:"none",borderRadius:4,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:SANS}}>📄 プレゼン資料</button>
                <button onClick={()=>{setView("gallery");setSelected(null);window.scrollTo(0,0);}} style={{padding:"8px 16px",border:`1px solid ${V.border}`,borderRadius:4,background:V.card,cursor:"pointer",fontSize:13,color:V.muted,fontFamily:SANS}}>← 一覧へ戻る</button>
              </div>
            </div>

            <div style={{maxWidth:1100,margin:"0 auto"}}>

              {/* ── ヒーローセクション（v0準拠） ── */}
              <section style={{background:V.secondary,overflow:"hidden"}}>
                <div style={{padding:"0 32px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
                    <div style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:"48px 24px 48px 0"}}>
                      <p style={{fontSize:13,letterSpacing:".2em",color:V.primary,textTransform:"uppercase",marginBottom:10,margin:"0 0 10px"}}>{c.buildType||""} {c.style}</p>
                      <h2 style={{fontFamily:SERIF,fontSize:"clamp(20px,3vw,38px)",fontWeight:500,letterSpacing:"-.01em",color:V.fg,lineHeight:1.2,margin:"0 0 18px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.title}</h2>
                      <p style={{fontSize:16,lineHeight:1.75,color:V.muted,margin:"0 0 24px",whiteSpace:"pre-line"}}>{c.subtitle}</p>
                      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
                        <div style={{width:48,height:1,background:V.primary}}/>
                        <span style={{fontSize:11,letterSpacing:".25em",color:V.muted,textTransform:"uppercase"}}>Design Concept</span>
                      </div>
                      <p style={{fontSize:15,lineHeight:2.0,color:V.fg,margin:0}}>{c.concept}</p>
                    </div>
                    <div style={{overflow:"hidden",position:"relative",display:"flex",alignItems:"center",justifyContent:"center",background:V.secondary}}>
                      {c.image
                        ?<img src={c.image} alt={c.title} style={{width:"100%",height:"auto",maxHeight:"100%",objectFit:"contain",display:"block"}}/>
                        :<div style={{width:"100%",height:"100%",background:"#c5d5e5",display:"flex",alignItems:"center",justifyContent:"center"}}><HouseIllust style={c.style}/></div>
                      }
                    </div>
                  </div>
                </div>
              </section>

              {/* ── 物件概要（敷地・延床） ── */}
              <section style={{background:V.card,padding:"24px 32px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  {[{icon:"📐",label:"敷地面積",v:landArea?landArea+"m² "+tsuboLand:"—"},{icon:"🏠",label:"延床面積",v:totalArea?totalArea+"m² "+tsuboTotal:"—"},{icon:"📋",label:"間取り",v:c.layout||"—"},{icon:"🏗",label:"構造",v:c.structure||"—"},{icon:"📅",label:"竣工年",v:c.year?c.year+"年":""},{icon:"📍",label:"施工地",v:c.location||"—"}].map((s,i)=>(
                    <div key={i} style={{display:"flex",flexDirection:"column",gap:6,borderRadius:4,border:`1px solid ${V.border}`,background:V.bg,padding:"14px 16px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:15}}>{s.icon}</span>
                        <span style={{fontSize:11,letterSpacing:".1em",color:V.muted}}>{s.label}</span>
                      </div>
                      <p style={{fontSize:15,fontWeight:500,color:V.fg,margin:0}}>{s.v}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── 写真ギャラリー ── */}
              {parsImages.length>0&&(
                <section style={{background:V.secondary,padding:"40px 32px"}}>
                  <SecTitle text="フォトギャラリー"/>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
                    {parsImages.map((img,i)=>(
                      <div key={i} onClick={()=>setLightbox({images:parsImages,idx:i})} style={{borderRadius:4,overflow:"hidden",aspectRatio:"4/3",cursor:"pointer",background:"#c5d5e5",transition:"opacity .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.opacity=".85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                        <img src={img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      </div>
                    ))}
                  </div>

                </section>
              )}


              {/* ── ハイライト ── */}
              {(c.highlights||[]).filter(Boolean).length>0&&(
                <section style={{background:V.bg,padding:"40px 32px"}}>
                  <SecTitle text="デザインハイライト"/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                    {(c.highlights||[]).filter(Boolean).map((h,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"16px",background:V.card,borderRadius:4,border:`1px solid ${V.border}`}}>
                        <div style={{width:32,height:32,minWidth:32,borderRadius:"50%",background:V.primary,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{i+1}</div>
                        <p style={{fontSize:14,lineHeight:1.7,color:V.fg,margin:0,paddingTop:5}}>{h}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── こだわりタグ ── */}
              {(c.features||[]).length>0&&(
                <section style={{background:V.secondary,padding:"32px 32px"}}>
                  <SecTitle text="こだわりポイント"/>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {(c.features||[]).map(f=>(
                      <span key={f} style={{background:V.card,color:V.primary,border:`1px solid ${V.border}`,padding:"6px 16px",borderRadius:2,fontSize:13,fontWeight:500}}>{f}</span>
                    ))}
                  </div>
                </section>
              )}

              {/* ── 間取りプラン: 登録した全画像を表示 ── */}
              <section style={{background:V.bg,padding:"40px 32px"}}>
                <SecTitle text="間取りプラン"/>
                {(()=>{
                  const maxImgs=c.floors==="平屋"?1:2;
                  const floorImgs=floorImages.slice(0,maxImgs);
                  if(floorImgs.length>0) return(
                  <div style={{display:"grid",gridTemplateColumns:floorImgs.length===1?"1fr":"1fr 1fr",gap:20}}>
                    {floorImgs.map((img,i)=>{
                      const floorLabel=i===0?(c.floors==="平屋"?"平屋":"1階"):"2階";
                      const roomsForFloor=i===0?f1:f2;
                      return(
                        <div key={i} style={{overflow:"hidden",borderRadius:4,border:`1px solid ${V.border}`,background:V.card,display:"flex",flexDirection:"column"}}>
                          <div style={{position:"relative",overflow:"hidden",background:"#c5d5e5"}}>
                            <img src={img} style={{width:"100%",height:"auto",display:"block",objectFit:"cover",cursor:"zoom-in"}}
                              onClick={()=>setLightbox({images:floorImgs.map(x=>x),idx:i})}/>
                            <div style={{position:"absolute",bottom:14,left:14,background:V.primary,padding:"5px 14px",borderRadius:2}}>
                              <span style={{color:"white",fontSize:13,fontWeight:500}}>{floorLabel}</span>
                            </div>
                            <div style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,.45)",borderRadius:4,padding:"3px 7px",fontSize:11,color:"white",cursor:"pointer"}}
                              onClick={()=>setLightbox({images:floorImgs,idx:i})}>🔍 拡大</div>
                          </div>
                          {roomsForFloor.length>0&&(
                            <div style={{padding:"16px 18px"}}>
                              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                                {roomsForFloor.map((r,j)=><span key={j} style={{background:V.secondary,color:V.fg,padding:"4px 10px",borderRadius:2,fontSize:12}}>{r.name}{r.jyou?"（"+r.jyou+"帖）":""}</span>)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>);
                  return(
                  <div style={{display:"grid",gridTemplateColumns:f2.length>0?"1fr 1fr":"1fr",gap:20}}>
                    {[{label:c.floors==="平屋"?"平屋":"1階",rooms:f1},...(f2.length>0?[{label:"2階",rooms:f2}]:[])].map((fl,i)=>(
                      <div key={i} style={{overflow:"hidden",borderRadius:4,border:`1px solid ${V.border}`,background:V.card}}>
                        <div style={{padding:"60px",background:V.secondary,display:"flex",alignItems:"center",justifyContent:"center"}}><HouseIllust style={c.style}/></div>
                        <div style={{padding:"16px 18px",display:"flex",flexWrap:"wrap",gap:6}}>{fl.rooms.map((r,j)=><span key={j} style={{background:V.secondary,color:V.fg,padding:"4px 10px",borderRadius:2,fontSize:12}}>{r.name}{r.jyou?"（"+r.jyou+"帖）":""}</span>)}</div>
                      </div>
                    ))}
                  </div>
                  );
                })()}
              </section>

              {/* ── 内外観イメージ ── */}
              {parsImages.slice(0,4).length>0&&(
                <section style={{background:V.secondary,padding:"40px 32px"}}>
                  <SecTitle text="内外観イメージ"/>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:20}}>
                    {parsImages.slice(0,4).map((img,i)=>(
                      <div key={i} style={{cursor:"pointer",borderRadius:4,overflow:"hidden",aspectRatio:"4/3",background:"#c5d5e5"}} onClick={()=>setLightbox({images:parsImages,idx:i})}>
                        <img src={img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── 標準設備・仕様 ── */}
              <section style={{background:V.bg,padding:"40px 32px"}}>
                <SecTitle text="標準設備・仕様"/>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
                  {specCats.map((cat,i)=>(
                    <div key={i} style={{borderRadius:4,border:`1px solid ${V.border}`,background:V.card,padding:"18px 16px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                        <div style={{width:36,height:36,borderRadius:4,background:V.primary+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{cat.icon}</div>
                        <h4 style={{fontSize:14,fontWeight:500,color:V.fg,margin:0}}>{cat.label}</h4>
                      </div>
                      <ul style={{listStyle:"none",margin:0,padding:0}}>
                        {cat.items.length>0
                          ?cat.items.map((it,j)=>(
                            <li key={j} style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:13,color:V.muted,padding:"5px 0",borderBottom:`1px solid ${V.border}40`}}>
                              <span style={{marginTop:7,width:5,height:5,minWidth:5,borderRadius:"50%",background:V.primary+"60"}}/>
                              {it}
                            </li>
                          ))
                          :<li style={{fontSize:12,color:"#b0bec5"}}>未設定</li>
                        }
                      </ul>
                    </div>
                  ))}
                </div>
              </section>


              {/* ── 本体価格に含まれるもの ── */}
              <section style={{background:V.card,padding:"40px 32px"}}>
                <SecTitle text="本体価格に含まれるもの"/>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
                  {[
                    {icon:"🏠",label:"住宅性能・品質",items:[
                      "断熱等性能等級 5以上 / 一次エネルギー消費量等級 5以上",
                      "ZEH基準採用およびBELS評価基準採用",
                      "高気密・高断熱仕様",
                      "長期優良住宅対応およびフラット35S対応",
                      "高耐久・高耐雪仕様、シロアリ・防火対策",
                    ]},
                    {icon:"🛡",label:"保証・アフターサポート",items:[
                      "構造保証・雨漏り保証・地盤品質：各20年間",
                      "住宅設備保証：10年間",
                      "アフターサービス（24時間365日受付）",
                    ]},
                    {icon:"🔨",label:"工事・施工関連",items:[
                      "ベタ基礎",
                      "電気配線工事、配管工事、屋内外給排水工事",
                      "外部コンセント、散水栓",
                      "仮設工事",
                    ]},
                    {icon:"📋",label:"調査・管理・申請",items:[
                      "現地調査・地盤調査",
                      "建築確認申請",
                      "設計費、現場管理費",
                    ]},
                    {icon:"⚙",label:"設備・仕様",items:[
                      "システムキッチン、システムバス、洗面化粧台、節水トイレ",
                      "オール電化（エコキュート含む）",
                      "LED照明、高性能サッシ＋網戸",
                      "24時間換気システム、収納棚",
                    ]},
                  ].map((cat,i)=>(
                    <div key={i} style={{borderRadius:6,border:`1px solid ${V.border}`,background:V.bg,padding:"18px 16px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                        <div style={{width:34,height:34,borderRadius:4,background:V.primary+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{cat.icon}</div>
                        <h4 style={{fontSize:13,fontWeight:700,color:V.fg,margin:0}}>{cat.label}</h4>
                      </div>
                      <ul style={{listStyle:"none",margin:0,padding:0}}>
                        {cat.items.map((it,j)=>(
                          <li key={j} style={{display:"flex",alignItems:"flex-start",gap:7,fontSize:12,color:V.muted,padding:"5px 0",borderBottom:`1px solid ${V.border}40`}}>
                            <span style={{marginTop:6,width:5,height:5,minWidth:5,borderRadius:"50%",background:V.primary+"60",flexShrink:0}}/>
                            {it}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
              {/* ── YouTube ── */}
              {ytId&&(
                <section style={{background:V.bg,padding:"40px 32px"}}>
                  <SecTitle text="動画"/>
                  <div style={{position:"relative",paddingBottom:"56.25%",height:0,borderRadius:4,overflow:"hidden"}}>
                    <iframe src={`https://www.youtube.com/embed/${ytId}`} title="YouTube" frameBorder="0" allowFullScreen style={{position:"absolute",top:0,left:0,width:"100%",height:"100%"}}/>
                  </div>
                </section>
              )}

              {/* ── 概算建築費 ── */}
              {(()=>{
                const casePI = priceItems.filter(p=>p.display_client&&String(p.case_id)===String(c._sbId));
                const bpTotal = casePI.reduce((s,p)=>s+(p.calc_type==="unit_price"?(Number(p.unit_price)||0)*(Number(p.quantity)||1):(Number(p.amount)||0)),0);
                return(<>
                  <PriceSection
                    priceItems={casePI}
                    caseId={c._sbId}
                    totalOverride={0}
                    productName={c.productName||""}
                    tsubo={c.tsubo}
                    buildingArea={c.area?.building}
                    totalArea={c.area?.total}
                  />
                  {/* ── 土地代金 ── */}
                  <LandPriceSection landPrice={landPriceInput} onChange={setLandPriceInput}/>
                  {/* ── その他費用 ── */}
                  <OtherCosts basePriceTotal={bpTotal} landPrice={landPriceInput} onLandPriceChange={setLandPriceInput}/>
                </>);
              })()}

              {/* ── フッター ── */}
              <section style={{background:V.card,borderTop:`1px solid ${V.border}`,padding:"36px 32px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:32,marginBottom:28}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                      <div style={{width:38,height:38,background:V.primary,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:18}}>🏠</div>
                      <div><p style={{fontSize:12,color:V.muted,margin:0}}>タツケン</p><p style={{fontSize:16,fontWeight:500,color:V.fg,margin:0}}>Tatsuken Archi Design</p></div>
                    </div>
                    <p style={{fontSize:13,color:V.muted,margin:0}}>担当：佐藤 太郎</p>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10,paddingTop:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:V.muted}}>📍 兵庫県姫路市南条639</div>
                    <div style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:V.muted}}>📞 079-280-3181</div>
                  </div>
                </div>
                <div style={{borderTop:`1px solid ${V.border}`,paddingTop:20,textAlign:"center"}}>
                  <p style={{fontSize:12,color:V.muted,margin:0}}>本ページの内容は企画段階のものであり、実際の仕様と異なる場合があります。</p>
                </div>
              </section>

              {/* ── 他の施工事例 ── */}
              <section style={{background:V.bg,padding:"40px 32px"}}>
                <SecTitle text="他の施工事例"/>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
                  {cases.filter(x=>x._sbId!==c._sbId).slice(0,3).map(rc=>{
                    const rsi=STYLES_DEF[rc.style]||STYLES_DEF["ナチュラル"];
                    return(
                      <div key={rc._sbId} className="card" onClick={()=>{setSelected(rc);setView("detail");window.scrollTo(0,0);}} style={{background:V.card,borderRadius:4,overflow:"hidden",border:`1px solid ${V.border}`}}>
                        <div style={{position:"relative",aspectRatio:"16/9",overflow:"hidden",background:"#c5d5e5"}}>
                          <CaseImage c={rc} height={160}/>
                          <div style={{position:"absolute",top:8,left:8,background:rsi.accent,color:"white",padding:"2px 10px",borderRadius:2,fontSize:11,fontWeight:700}}>{rc.style}</div>
                        </div>
                        <div style={{padding:"14px 16px"}}>
                          <h4 style={{fontSize:14,fontWeight:600,margin:"0 0 4px",color:V.fg}}>{rc.title}</h4>
                          <p style={{fontSize:12,color:V.muted,margin:0}}>{rc.layout} / {rc.tsubo?rc.tsubo+"坪":(rc.area?.total||"—")+"㎡"} / {rc.budget}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
