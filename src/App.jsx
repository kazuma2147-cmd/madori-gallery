import { useState, useEffect, useRef, useCallback } from "react";

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
const EMPTY_CASE = {
  buildType:"注文住宅", style:"ナチュラル", layout:"3LDK", floors:"2階建て",
  title:"", subtitle:"", area:{ land:"", building:"", total:"" }, tsubo:"",
  budget:"3,000〜3,500万円", direction:"南", location:"", year:new Date().getFullYear(),
  structure:"木造軸組", concept:"", highlights:["","","",""],
  rooms:[{ name:"LDK", floor:1, jyou:"" }],
  features:[], specs:{...EMPTY_SPECS}, image:"", images:[], youtube:"",
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

function PdfPrintModal({c, customerName, similarCases, onClose}) {
  const csi = STYLES_DEF[c.style]||STYLES_DEF["ナチュラル"];
  const mainImage = c.image||"";
  const subImages = (c.images||[]).filter(Boolean);

  // A3横: 420x297mm → 1587x1123px @96dpi
  // ページHTML生成して新ウィンドウで印刷 → 真っ白問題を根本解決

  function buildPageHtml(pageHtml) {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: A3 landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Hiragino Kaku Gothic ProN','Meiryo','Yu Gothic',sans-serif; background: white; }
  .page { width: 420mm; min-height: 297mm; page-break-after: always; page-break-inside: avoid; overflow: hidden; position: relative; }
  @media print {
    body > * { page-break-inside: avoid; }
    .page { page-break-after: always; }
  }
</style>
</head>
<body>${pageHtml}</body>
</html>`;
  }

  function acc(hex,op=1){return hex+(op<1?Math.round(op*255).toString(16).padStart(2,'0'):'');}

  // ── ページ別HTML文字列生成 ──────────────────────────────
  function p1Html() {
    const specs = [
      {l:"建物タイプ",v:c.buildType||"—"},
      {l:"スタイル",v:c.style||"—"},
      {l:"間取り",v:c.layout||"—"},
      {l:"階数",v:c.floors||"—"},
      {l:"坪数",v:c.tsubo?c.tsubo+"坪":"—"},
      {l:"予算目安",v:c.budget||"—"},
    ];
    const specItems = specs.map(s=>`
      <div style="margin-right:44px;">
        <div style="font-size:11px;color:rgba(255,255,255,.35);letter-spacing:.15em;margin-bottom:6px;">${s.l}</div>
        <div style="font-size:20px;font-weight:700;color:white;">${s.v}</div>
      </div>`).join('');
    return `<div class="page" style="background:#1a1612;display:flex;flex-direction:column;justify-content:space-between;">
      ${mainImage?`<div style="position:absolute;inset:0;background-image:url('${mainImage}');background-size:cover;background-position:center;opacity:.12;"></div>`:''}
      <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:70px 100px;">
        <div style="color:#c9a96e;font-size:14px;letter-spacing:.5em;margin-bottom:22px;">HOUSING PROPOSAL</div>
        <h1 style="color:white;font-size:64px;font-weight:700;line-height:1.35;margin-bottom:16px;letter-spacing:.04em;">${customerName}様邸<br>おすすめプラン</h1>
        <div style="color:rgba(255,255,255,.45);font-size:18px;margin-top:8px;">${c.style} / ${c.layout} / ${c.floors}</div>
      </div>
      <div style="position:relative;background:rgba(255,255,255,.05);border-top:1px solid rgba(255,255,255,.1);padding:28px 80px;display:flex;flex-wrap:wrap;">${specItems}</div>
    </div>`;
  }

  function p2Html() {
    const tags = [c.style,c.buildType].filter(Boolean).map(t=>`<span style="background:${csi.accent};color:white;padding:5px 16px;border-radius:20px;font-size:14px;font-weight:700;margin-right:8px;">${t}</span>`).join('');
    return `<div class="page" style="display:flex;flex-direction:column;background:white;">
      <div style="background:${csi.light};padding:40px 70px 32px;">
        <div style="margin-bottom:12px;">${tags}</div>
        <h2 style="margin:0 0 10px;font-size:46px;font-weight:700;color:#1a1612;line-height:1.3;">${c.title||""}</h2>
        <p style="margin:0;font-size:20px;color:#7a6a5a;line-height:1.6;">${c.subtitle||""}</p>
      </div>
      <div style="flex:1;overflow:hidden;background:#111;min-height:0;">
        ${mainImage
          ?`<img src="${mainImage}" style="width:100%;height:100%;object-fit:cover;display:block;min-height:180mm;"/>`
          :`<div style="width:100%;height:100%;min-height:180mm;background:${csi.light};display:flex;align-items:center;justify-content:center;font-size:60px;">🏠</div>`
        }
      </div>
    </div>`;
  }

  function subPageHtml(img, idx) {
    return `<div class="page" style="background:#111;display:flex;align-items:stretch;justify-content:center;">
      <img src="${img}" style="width:100%;height:100%;object-fit:cover;display:block;min-height:297mm;"/>
      <div style="position:absolute;bottom:22px;right:32px;color:rgba(255,255,255,.45);font-size:14px;">${idx+2} / ${subImages.length+1}</div>
    </div>`;
  }

  function lastPageHtml() {
    const highlights = (c.highlights||[]).filter(Boolean);
    const hlHtml = highlights.map((h,i)=>`
      <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:18px;">
        <div style="width:32px;height:32px;min-width:32px;border-radius:50%;background:${csi.accent};color:white;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;">${i+1}</div>
        <div style="font-size:16px;line-height:1.8;padding-top:5px;color:#2a201a;">${h}</div>
      </div>`).join('');

    const sizeItems = [
      {l:"坪数",v:c.tsubo?c.tsubo+"坪":"—"},
      {l:"延床面積",v:c.area?.total?c.area.total+"㎡":"—"},
      {l:"建築面積",v:c.area?.building?c.area.building+"㎡":"—"},
      {l:"敷地面積",v:c.area?.land?c.area.land+"㎡":"—"},
    ].map(s=>`
      <div style="background:#f5f2ee;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:13px;color:#8a7a6a;">${s.l}</span>
        <span style="font-size:24px;font-weight:700;color:#1a1612;">${s.v}</span>
      </div>`).join('');

    return `<div class="page" style="background:white;display:flex;flex-direction:column;padding:54px 72px;">
      <div style="font-size:11px;color:#a89a8a;letter-spacing:.3em;margin-bottom:36px;">HIGHLIGHTS &amp; PRICE &amp; SIZE</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:48px;flex:1;">
        <div>
          <div style="font-size:15px;font-weight:700;color:${csi.accent};margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid ${csi.accent};">ハイライト</div>
          ${hlHtml||'<div style="color:#a89a8a;font-size:14px;">ハイライト未設定</div>'}
        </div>
        <div>
          <div style="font-size:15px;font-weight:700;color:${csi.accent};margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid ${csi.accent};">想定建築価格</div>
          <div style="background:#1a1612;border-radius:14px;padding:36px 28px;text-align:center;margin-bottom:18px;">
            <div style="font-size:11px;color:#6a5a4a;letter-spacing:.2em;margin-bottom:12px;">予算目安</div>
            <div style="font-size:38px;font-weight:700;color:#c9a96e;line-height:1.2;">${c.budget||"—"}</div>
            ${c.tsubo?`<div style="color:rgba(255,255,255,.35);font-size:14px;margin-top:12px;">${c.tsubo}坪</div>`:''}
          </div>
          ${c.area?.total?`<div style="background:${csi.light};border-radius:10px;padding:16px;text-align:center;"><div style="font-size:11px;color:#a89a8a;margin-bottom:5px;">延床面積</div><div style="font-size:28px;font-weight:700;color:${csi.accent};">${c.area.total}<span style="font-size:15px;font-weight:400;">㎡</span></div></div>`:''}
        </div>
        <div>
          <div style="font-size:15px;font-weight:700;color:${csi.accent};margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid ${csi.accent};">大きさ</div>
          ${sizeItems}
        </div>
      </div>
    </div>`;
  }

  // ── 印刷実行 ─────────────────────────────────────────────
  function doPrint() {
    const pages = [p1Html(), p2Html(), ...subImages.map((img,i)=>subPageHtml(img,i)), lastPageHtml()];
    const fullHtml = buildPageHtml(pages.join('\n'));
    const win = window.open('', '_blank', 'width=1200,height=900');
    if(!win) { alert('ポップアップがブロックされました。許可してから再試行してください。'); return; }
    win.document.open();
    win.document.write(fullHtml);
    win.document.close();
    // 画像読み込み待ってから印刷
    win.onload = () => { setTimeout(() => { win.focus(); win.print(); }, 800); };
  }

  // ── プレビュー（縮小表示） ────────────────────────────────
  // A3横420x297mm → preview scale 0.38
  const SCALE = 0.38;
  const previewW = `${Math.round(420 * 3.7795 * SCALE)}px`; // mm to px
  const previewH = `${Math.round(297 * 3.7795 * SCALE)}px`;

  const pages = [
    {label:"表紙", content: (
      <div style={{width:"420mm",minHeight:"297mm",background:"#1a1612",display:"flex",flexDirection:"column",position:"relative"}}>
        {mainImage&&<div style={{position:"absolute",inset:0,backgroundImage:`url(${mainImage})`,backgroundSize:"cover",opacity:.13}}/>}
        <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",textAlign:"center",padding:"70px 100px"}}>
          <div style={{color:"#c9a96e",fontSize:14,letterSpacing:".4em",marginBottom:20}}>HOUSING PROPOSAL</div>
          <h1 style={{color:"white",fontSize:64,fontWeight:700,lineHeight:1.35,margin:"0 0 12px"}}>{customerName}様邸<br/>おすすめプラン</h1>
          <div style={{color:"rgba(255,255,255,.4)",fontSize:18,marginTop:8}}>{c.style} / {c.layout} / {c.floors}</div>
        </div>
        <div style={{position:"relative",background:"rgba(255,255,255,.05)",borderTop:"1px solid rgba(255,255,255,.1)",padding:"26px 80px",display:"flex",gap:44,flexWrap:"wrap"}}>
          {[{l:"建物タイプ",v:c.buildType},{l:"スタイル",v:c.style},{l:"間取り",v:c.layout},{l:"階数",v:c.floors},{l:"坪数",v:c.tsubo?c.tsubo+"坪":"—"},{l:"予算目安",v:c.budget}].map(s=>(
            <div key={s.l}><div style={{fontSize:11,color:"rgba(255,255,255,.35)",letterSpacing:".12em",marginBottom:5}}>{s.l}</div><div style={{fontSize:20,fontWeight:700,color:"white"}}>{s.v||"—"}</div></div>
          ))}
        </div>
      </div>
    )},
    {label:"P2 タイトル+メイン画像", content: (
      <div style={{width:"420mm",minHeight:"297mm",display:"flex",flexDirection:"column",background:"white"}}>
        <div style={{background:csi.light,padding:"40px 70px 30px"}}>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <span style={{background:csi.accent,color:"white",padding:"5px 16px",borderRadius:20,fontSize:14,fontWeight:700}}>{c.style}</span>
            {c.buildType&&<span style={{background:"#e8e2d8",color:"#5a4a3a",padding:"5px 14px",borderRadius:20,fontSize:13}}>{c.buildType}</span>}
          </div>
          <h2 style={{margin:"0 0 10px",fontSize:46,fontWeight:700,color:"#1a1612",lineHeight:1.3}}>{c.title||""}</h2>
          <p style={{margin:0,fontSize:20,color:"#7a6a5a",lineHeight:1.6}}>{c.subtitle||""}</p>
        </div>
        <div style={{flex:1,overflow:"hidden",background:"#111",minHeight:0}}>
          {mainImage?<img src={mainImage} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",minHeight:"180mm"}}/>
            :<div style={{width:"100%",minHeight:"180mm",background:csi.light,display:"flex",alignItems:"center",justifyContent:"center",fontSize:80}}>🏠</div>}
        </div>
      </div>
    )},
    ...subImages.map((img,i)=>({
      label:`P${i+3} 画像${i+1}`,
      content:(
        <div style={{width:"420mm",minHeight:"297mm",background:"#111",position:"relative"}}>
          <img src={img} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",minHeight:"297mm"}}/>
          <div style={{position:"absolute",bottom:22,right:32,color:"rgba(255,255,255,.4)",fontSize:16}}>{i+2}/{subImages.length+1}</div>
        </div>
      )
    })),
    {label:"最終 ハイライト+価格+大きさ", content: (
      <div style={{width:"420mm",minHeight:"297mm",background:"white",display:"flex",flexDirection:"column",padding:"54px 72px"}}>
        <div style={{fontSize:11,color:"#a89a8a",letterSpacing:".3em",marginBottom:32}}>HIGHLIGHTS & PRICE & SIZE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:48,flex:1}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:csi.accent,marginBottom:18,paddingBottom:10,borderBottom:`2px solid ${csi.accent}`}}>ハイライト</div>
            {(c.highlights||[]).filter(Boolean).map((h,i)=>(
              <div key={i} style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:18}}>
                <div style={{width:32,height:32,minWidth:32,borderRadius:"50%",background:csi.accent,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700}}>{i+1}</div>
                <div style={{fontSize:16,lineHeight:1.8,paddingTop:5,color:"#2a201a"}}>{h}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:csi.accent,marginBottom:18,paddingBottom:10,borderBottom:`2px solid ${csi.accent}`}}>想定建築価格</div>
            <div style={{background:"#1a1612",borderRadius:14,padding:"36px 28px",textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:11,color:"#6a5a4a",letterSpacing:".2em",marginBottom:12}}>予算目安</div>
              <div style={{fontSize:38,fontWeight:700,color:"#c9a96e",lineHeight:1.2}}>{c.budget||"—"}</div>
              {c.tsubo&&<div style={{color:"rgba(255,255,255,.35)",fontSize:14,marginTop:10}}>{c.tsubo}坪</div>}
            </div>
            {c.area?.total&&<div style={{background:csi.light,borderRadius:10,padding:"16px",textAlign:"center"}}><div style={{fontSize:11,color:"#a89a8a",marginBottom:5}}>延床面積</div><div style={{fontSize:28,fontWeight:700,color:csi.accent}}>{c.area.total}<span style={{fontSize:15,fontWeight:400}}>㎡</span></div></div>}
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:csi.accent,marginBottom:18,paddingBottom:10,borderBottom:`2px solid ${csi.accent}`}}>大きさ</div>
            {[{l:"坪数",v:c.tsubo?c.tsubo+"坪":"—"},{l:"延床面積",v:c.area?.total?c.area.total+"㎡":"—"},{l:"建築面積",v:c.area?.building?c.area.building+"㎡":"—"},{l:"敷地面積",v:c.area?.land?c.area.land+"㎡":"—"}].map(s=>(
              <div key={s.l} style={{background:"#f5f2ee",borderRadius:10,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:13,color:"#8a7a6a"}}>{s.l}</span>
                <span style={{fontSize:24,fontWeight:700,color:"#1a1612"}}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )},
  ];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:600,overflowY:"auto",display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 16px",fontFamily:"'Noto Serif JP','Georgia',serif"}}>
      {/* ヘッダー */}
      <div style={{background:"white",borderRadius:12,padding:"16px 22px",width:"100%",maxWidth:900,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <h2 style={{margin:0,fontSize:16,fontWeight:700}}>プレゼン資料プレビュー</h2>
          <p style={{margin:"3px 0 0",fontSize:12,color:"#8a7a6a"}}>A3横 / {pages.length}ページ / {customerName}様邸おすすめプラン</p>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{padding:"8px 18px",border:"1px solid #d4cfc5",borderRadius:8,background:"white",cursor:"pointer",fontSize:13}}>閉じる</button>
          <button onClick={doPrint} style={{padding:"8px 24px",background:"#1a1612",color:"#c9a96e",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:"pointer"}}>📥 PDF保存 / 印刷</button>
        </div>
      </div>
      <div style={{background:"rgba(201,169,110,.15)",border:"1px solid rgba(201,169,110,.4)",borderRadius:8,padding:"9px 16px",width:"100%",maxWidth:900,marginBottom:14,fontSize:12,color:"#c9a96e",flexShrink:0}}>
        💡 「PDF保存 / 印刷」→ 新しいウィンドウが開きます → 印刷ダイアログで用紙サイズ <b>「A3」</b>・向き <b>「横」</b>・余白 <b>「なし」</b> を選択 → 「PDFに保存」
      </div>

      {/* ページプレビュー横スクロール */}
      <div style={{display:"flex",gap:14,overflowX:"auto",padding:"4px 4px 12px",width:"100%",maxWidth:900,flexShrink:0}}>
        {pages.map((page,i)=>(
          <div key={i} style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,.6)",letterSpacing:".05em"}}>{page.label}</div>
            <div style={{width:previewW,height:previewH,overflow:"hidden",borderRadius:6,border:"2px solid rgba(255,255,255,.2)",background:"white",position:"relative"}}>
              <div style={{transform:`scale(${SCALE})`,transformOrigin:"top left",width:"420mm",minHeight:"297mm",pointerEvents:"none"}}>
                {page.content}
              </div>
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>P{i+1}</div>
          </div>
        ))}
      </div>
      <div style={{height:16}}/>
    </div>
  );
}


export default function App(){
  const envConfig=SUPABASE_URL&&SUPABASE_KEY?{url:SUPABASE_URL,key:SUPABASE_KEY}:null;
  const [config,setConfig]=useState(envConfig);
  const [cases,setCases]=useState([]);const [loading,setLoading]=useState(false);const [loadErr,setLoadErr]=useState("");
  const [view,setView]=useState("gallery");const [selectedCase,setSelected]=useState(null);
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

  // 管理
  const [adminUnlocked,setAdminUnlocked]=useState(false);
  const [pwInput,setPwInput]=useState("");const [pwError,setPwError]=useState(false);
  const [editingCase,setEditingCase]=useState(null);const [formData,setFormData]=useState(EMPTY_CASE);
  const [saveStatus,setSaveStatus]=useState("");const [saveErr,setSaveErr]=useState("");
  const [deleteConfirm,setDeleteConfirm]=useState(null);
  const [imgUploading,setImgUploading]=useState(false);const [addImgUploading,setAddImgUploading]=useState(false);
  const imgRef=useRef();const addImgRef=useRef();
  const [dragIdx,setDragIdx]=useState(null);

  useEffect(()=>{if(envConfig)return;try{const s=localStorage.getItem(CONFIG_KEY);if(s)setConfig(JSON.parse(s));}catch{}},[]);
  const fetchCases=useCallback(async cfg=>{if(!cfg)return;setLoading(true);setLoadErr("");try{setCases(await sbGetCases(cfg.url,cfg.key));}catch(e){setLoadErr(e.message);}finally{setLoading(false);}},[]); 
  useEffect(()=>{fetchCases(config);},[config,fetchCases]);
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

  function openNew(){setEditingCase(null);setFormData({...EMPTY_CASE,highlights:["","","",""],rooms:[{name:"LDK",floor:1,jyou:""}],features:[],images:[],image:"",youtube:"",specs:{...EMPTY_SPECS}});setSaveErr("");setView("adminForm");}
  function openEdit(c){setEditingCase(c._sbId);const d=JSON.parse(JSON.stringify({...EMPTY_CASE,...c,specs:{...EMPTY_SPECS,...(c.specs||{})}}));if(d.rooms&&d.rooms[0]&&d.rooms[0].area!==undefined&&d.rooms[0].jyou===undefined){d.rooms=d.rooms.map(r=>({...r,jyou:r.area||""}))}setFormData(d);setSaveErr("");setView("adminForm");}

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

  // ドラッグ＆ドロップ（部屋）
  function onDragStart(i){setDragIdx(i);}
  function onDragOver(e,i){e.preventDefault();if(dragIdx===null||dragIdx===i)return;const rs=[...formData.rooms];const[moved]=rs.splice(dragIdx,1);rs.splice(i,0,moved);setFormData(f=>({...f,rooms:rs}));setDragIdx(i);}
  function onDragEnd(){setDragIdx(null);}

  function setSpec(k,v){setFormData(f=>({...f,specs:{...f.specs,[k]:v}}));}

  const currentCase=selectedCase?(cases.find(c=>c._sbId===selectedCase._sbId)||selectedCase):null;
  if(!config)return <SetupScreen onSave={saveConfig}/>;

  return(
    <div style={{fontFamily:"'Noto Serif JP','Georgia',serif",background:"#faf8f5",minHeight:"100vh",color:"#1a1612"}}>
      <style>{`*{box-sizing:border-box}button,input,textarea,select{font-family:inherit}.card{transition:transform .2s,box-shadow .2s;cursor:pointer}.card:hover{transform:translateY(-3px);box-shadow:0 12px 36px rgba(0,0,0,.1)!important}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.thumb-img{cursor:pointer;transition:opacity .15s}.thumb-img:hover{opacity:.8}.pdf-print-area{display:none}.pdf-page{page-break-after:always}`}</style>

      {pdfSelectModal&&<PdfSelectModal onClose={()=>{setPdfSelectModal(null);setPdfCustomerName("");}} onGenerate={name=>{setPdfModal({c:pdfSelectModal,customerName:name});setPdfSelectModal(null);}}/>}
      {pdfModal&&<PdfPrintModal c={pdfModal.c} customerName={pdfModal.customerName} similarCases={cases.filter(x=>x._sbId!==pdfModal.c._sbId&&(x.layout===pdfModal.c.layout||x.style===pdfModal.c.style)).slice(0,3)} onClose={()=>setPdfModal(null)}/>}
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
            <div style={{display:"flex",gap:8}}><button onClick={()=>fetchCases(config)} style={{padding:"7px 14px",border:"1px solid #c9b89a",borderRadius:7,background:"white",cursor:"pointer",fontSize:12}}>↺</button><button onClick={openNew} style={{padding:"9px 20px",background:"#c9a96e",color:"white",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",fontWeight:700}}>＋ 新規追加</button></div>
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

            {/* 追加画像 */}
            <Sec title="🖼 追加画像（間取り図・パース・内観など）">
              <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:10}}>
                {(formData.images||[]).map((img,i)=>(
                  <div key={i} style={{position:"relative",width:120,height:84,borderRadius:7,overflow:"hidden",border:"1px solid #e0d8cc"}}>
                    <img src={img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
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

            {/* 基本情報 */}
            <Sec title="📋 基本情報">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11}}>
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
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:11}}>
                {[["延床面積(㎡)","total"],["建築面積(㎡)","building"],["敷地面積(㎡)","land"]].map(([l,k])=>(
                  <div key={k}><Lbl>{l}</Lbl><input type="number" value={formData.area?.[k]||""} onChange={e=>setFormData(f=>({...f,area:{...f.area,[k]:e.target.value}}))} style={inp}/></div>
                ))}
                <div><Lbl>坪数</Lbl><input type="number" value={formData.tsubo||""} onChange={e=>setFormData(f=>({...f,tsubo:e.target.value}))} style={inp} placeholder="35"/></div>
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

            {/* 部屋構成 - ドラッグ＆ドロップ */}
            <Sec title="🛋 部屋構成（ドラッグで並び替え可能）">
              <div style={{marginBottom:8,fontSize:11,color:"#a89a8a"}}>☰ をドラッグして並び替えできます</div>
              {(formData.rooms||[]).map((r,i)=>(
                <div key={i} draggable onDragStart={()=>onDragStart(i)} onDragOver={e=>onDragOver(e,i)} onDragEnd={onDragEnd}
                  style={{display:"grid",gridTemplateColumns:"auto 2.5fr 1fr 1.5fr auto",gap:7,marginBottom:7,alignItems:"end",opacity:dragIdx===i?0.5:1,background:dragIdx===i?"#f5f0e8":"transparent",borderRadius:6,padding:"2px 0"}}>
                  <div style={{cursor:"grab",color:"#a89a8a",fontSize:18,paddingBottom:6,userSelect:"none"}}>☰</div>
                  <div>
                    {i===0&&<Lbl>部屋名</Lbl>}
                    <select value={ROOM_NAMES.includes(r.name)?r.name:"__custom__"} onChange={e=>{const rs=[...formData.rooms];rs[i]={...rs[i],name:e.target.value==="__custom__"?"":e.target.value};setFormData(f=>({...f,rooms:rs}));}} style={sel}>
                      {ROOM_NAMES.map(n=><option key={n} value={n}>{n}</option>)}
                      <option value="__custom__">その他</option>
                    </select>
                    {(!ROOM_NAMES.includes(r.name)||r.name==="")&&<input value={r.name} onChange={e=>{const rs=[...formData.rooms];rs[i]={...rs[i],name:e.target.value};setFormData(f=>({...f,rooms:rs}));}} style={{...inp,marginTop:4}} placeholder="部屋名を入力"/>}
                  </div>
                  <div>
                    {i===0&&<Lbl>階</Lbl>}
                    <select value={r.floor} onChange={e=>{const rs=[...formData.rooms];rs[i]={...rs[i],floor:Number(e.target.value)};setFormData(f=>({...f,rooms:rs}));}} style={sel}>
                      <option value={1}>1階</option><option value={2}>2階</option><option value={3}>3階</option>
                    </select>
                  </div>
                  <div>
                    {i===0&&<Lbl>帖数</Lbl>}
                    <select value={JYOU_LIST.includes(String(r.jyou))?String(r.jyou):r.jyou?"その他":""} onChange={e=>{const rs=[...formData.rooms];rs[i]={...rs[i],jyou:e.target.value==="その他"?"":e.target.value};setFormData(f=>({...f,rooms:rs}));}} style={sel}>
                      <option value="">-</option>
                      {JYOU_LIST.map(j=><option key={j} value={j}>{j==="その他"?j:`${j}帖`}</option>)}
                    </select>
                    {(!JYOU_LIST.includes(String(r.jyou))&&r.jyou)||r.jyou==="その他"?<input value={r.jyou==="その他"?"":r.jyou} onChange={e=>{const rs=[...formData.rooms];rs[i]={...rs[i],jyou:e.target.value};setFormData(f=>({...f,rooms:rs}));}} style={{...inp,marginTop:4}} placeholder="帖数"/>:null}
                  </div>
                  <button onClick={()=>setFormData(f=>({...f,rooms:f.rooms.filter((_,j)=>j!==i)}))} style={{padding:"8px 9px",border:"1px solid #f5c6cb",borderRadius:5,background:"#fff5f5",color:"#c0392b",cursor:"pointer",alignSelf:"flex-end"}}>×</button>
                </div>
              ))}
              <button onClick={()=>setFormData(f=>({...f,rooms:[...f.rooms,{name:"LDK",floor:1,jyou:""}]}))} style={{padding:"6px 13px",border:"1px dashed #c9b89a",borderRadius:6,background:"transparent",cursor:"pointer",fontSize:12,color:"#6a5a4a"}}>＋ 部屋を追加</button>
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

      {/* ── DETAIL ── */}
      {view==="detail"&&currentCase&&(()=>{
        const c=currentCase;const csi=STYLES_DEF[c.style]||STYLES_DEF["ナチュラル"];const isFav=favorites.has(c._sbId);
        const f1=(c.rooms||[]).filter(r=>r.floor===1);const f2=(c.rooms||[]).filter(r=>r.floor===2);
        const allImages=[c.image,...(c.images||[])].filter(Boolean);
        let ytId=null;if(c.youtube){const m=c.youtube.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);if(m)ytId=m[1];}

        return(
          <div>
            {/* ヒーロー画像 - 大きく見やすく */}
            <div style={{position:"relative",background:"#111",maxHeight:"70vh",overflow:"hidden"}}>
              {c.image
                ?<img src={c.image} alt={c.title} style={{width:"100%",maxHeight:"70vh",objectFit:"cover",display:"block"}}/>
                :<div style={{height:420,display:"flex",alignItems:"center",justifyContent:"center",background:csi.light}}><div style={{width:500,height:300}}><HouseIllust style={c.style}/></div></div>
              }
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,.1) 40%,rgba(0,0,0,.65))"}}/>
              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"28px 40px"}}>
                <div style={{display:"flex",gap:7,marginBottom:9}}>
                  <span style={{background:csi.accent,color:"white",padding:"4px 13px",borderRadius:20,fontSize:11,fontWeight:700}}>{c.style}</span>
                  {c.buildType&&<span style={{background:"rgba(255,255,255,.18)",color:"white",padding:"4px 12px",borderRadius:20,fontSize:11,backdropFilter:"blur(4px)"}}>{c.buildType}</span>}
                </div>
                <h1 style={{color:"white",margin:"0 0 4px",fontSize:30,fontWeight:700,textShadow:"0 2px 12px rgba(0,0,0,.4)",lineHeight:1.3}}>{c.title}</h1>
                <p style={{color:"rgba(255,255,255,.88)",margin:0,fontSize:14}}>{c.subtitle}</p>
              </div>
              <button onClick={()=>{setView("gallery");setSelected(null);}} style={{position:"absolute",top:18,left:20,background:"rgba(255,255,255,.88)",border:"none",borderRadius:7,padding:"7px 14px",fontSize:12,cursor:"pointer",backdropFilter:"blur(4px)"}}>← 一覧に戻る</button>
              <button onClick={()=>{setPdfSelectModal(c);setPdfCustomerName("");}} style={{position:"absolute",top:18,left:140,background:"#c9a96e",border:"none",borderRadius:7,padding:"7px 14px",fontSize:12,cursor:"pointer",color:"white",fontWeight:700,backdropFilter:"blur(4px)"}}>📄 プレゼン資料</button>
              <button onClick={e=>toggleFav(c._sbId,e)} style={{position:"absolute",top:14,right:18,background:"rgba(255,255,255,.88)",border:"none",borderRadius:"50%",width:42,height:42,fontSize:20,cursor:"pointer",color:isFav?"#e05050":"#ccc",backdropFilter:"blur(4px)"}}>{isFav?"♥":"♡"}</button>

              {/* サムネイル（ヒーロー右下 or 下に常に表示） */}
              {allImages.length>1&&(
                <div style={{position:"absolute",bottom:16,right:20,display:"flex",gap:6}}>
                  {allImages.slice(0,5).map((img,i)=>(
                    <div key={i} onClick={e=>{e.stopPropagation();setLightbox({images:allImages,idx:i});}} className="thumb-img"
                      style={{width:54,height:40,borderRadius:5,overflow:"hidden",border:"2px solid rgba(255,255,255,.7)",cursor:"pointer"}}>
                      <img src={img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    </div>
                  ))}
                  {allImages.length>5&&<div style={{width:54,height:40,borderRadius:5,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:12,cursor:"pointer"}} onClick={e=>{e.stopPropagation();setLightbox({images:allImages,idx:5});}}>+{allImages.length-5}</div>}
                </div>
              )}
            </div>

            {/* サブ画像を常に横並びで表示 */}
            {allImages.length>1&&(
              <div style={{background:"white",borderBottom:"1px solid #f0ebe0",padding:"12px 20px",display:"flex",gap:8,overflowX:"auto"}}>
                {allImages.map((img,i)=>(
                  <div key={i} onClick={()=>setLightbox({images:allImages,idx:i})} className="thumb-img"
                    style={{flexShrink:0,width:100,height:70,borderRadius:7,overflow:"hidden",border:`2px solid ${i===0?"#c9a96e":"#e8e2d8"}`,cursor:"pointer"}}>
                    <img src={img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  </div>
                ))}
                <div style={{flexShrink:0,width:100,height:70,borderRadius:7,border:"2px dashed #e0d8cc",display:"flex",alignItems:"center",justifyContent:"center",color:"#a89a8a",fontSize:11}}>
                  全{allImages.length}枚
                </div>
              </div>
            )}

            {/* スペックバー */}
            <div style={{background:"#1a1612",padding:"0 32px",display:"flex",overflowX:"auto"}}>
              {[{l:"間取り",v:c.layout},{l:"階数",v:c.floors},{l:"坪数",v:c.tsubo?`${c.tsubo}坪`:"—"},{l:"延床",v:`${c.area?.total||"—"}㎡`},{l:"構造",v:c.structure},{l:"予算",v:c.budget,gold:true}].map((s,i)=>(
                <div key={s.l} style={{padding:"14px 18px",borderRight:i<5?"1px solid #3a3228":"none",whiteSpace:"nowrap"}}>
                  <div style={{fontSize:10,color:"#6a5a4a",marginBottom:2}}>{s.l}</div>
                  <div style={{fontSize:14,fontWeight:700,color:s.gold?"#c9a96e":"white"}}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* タブ */}
            <div style={{background:"white",borderBottom:"1px solid #e8e2d8",padding:"0 32px",display:"flex",position:"sticky",top:58,zIndex:90}}>
              {[["concept","コンセプト"],["rooms","間取り・部屋"],["specs","仕様・設備"],["gallery","写真・動画"]].map(([key,label])=>(
                <button key={key} onClick={()=>setDetailTab(key)} style={{padding:"14px 16px",border:"none",borderBottom:detailTab===key?`3px solid ${csi.accent}`:"3px solid transparent",background:"transparent",color:detailTab===key?csi.accent:"#8a7a6a",fontSize:13,fontWeight:detailTab===key?700:400,cursor:"pointer"}}>{label}</button>
              ))}
            </div>

            <div style={{maxWidth:900,margin:"0 auto",padding:"32px 36px"}}>
              {detailTab==="concept"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:28}}>
                  <div>
                    <div style={{fontSize:10,color:"#a89a8a",letterSpacing:".18em",marginBottom:9}}>CONCEPT</div>
                    <p style={{fontSize:15,lineHeight:2.0,color:"#2a201a",margin:0}}>{c.concept}</p>
                    <div style={{marginTop:20,padding:"16px 20px",background:csi.light,borderRadius:9,borderLeft:`4px solid ${csi.accent}`}}>
                      <div style={{fontSize:10,color:"#a89a8a",marginBottom:6}}>施工地 / 竣工年</div>
                      <div style={{fontWeight:700,fontSize:14}}>{c.location}</div>
                      <div style={{color:"#8a7a6a",fontSize:12,marginTop:2}}>{c.year}年竣工</div>
                    </div>
                    {(c.features||[]).length>0&&<div style={{marginTop:14}}><div style={{fontSize:10,color:"#a89a8a",letterSpacing:".18em",marginBottom:7}}>こだわりポイント</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{(c.features||[]).map(f=><span key={f} style={{padding:"4px 11px",borderRadius:20,fontSize:11,background:csi.light,color:csi.accent,border:`1px solid ${csi.accent}30`,fontWeight:600}}>{f}</span>)}</div></div>}
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#a89a8a",letterSpacing:".18em",marginBottom:9}}>HIGHLIGHTS</div>
                    {(c.highlights||[]).filter(Boolean).map((h,i)=>(
                      <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:12}}>
                        <div style={{width:24,height:24,borderRadius:"50%",background:csi.accent,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{i+1}</div>
                        <div style={{fontSize:13,lineHeight:1.7,paddingTop:3}}>{h}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailTab==="rooms"&&(
                <div>
                  <div style={{display:"grid",gridTemplateColumns:f2.length>0?"1fr 1fr":"1fr",gap:20,marginBottom:20}}>
                    {[{label:c.floors==="平屋"?"平屋":c.floors==="半平屋"?"1階（半平屋）":"1階",rooms:f1},...(f2.length>0?[{label:"2階",rooms:f2}]:[])].map(({label,rooms:rl})=>(
                      <div key={label}>
                        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}><div style={{width:3,height:16,background:csi.accent,borderRadius:2}}/><div style={{fontSize:12,fontWeight:700,color:"#5a4a3a"}}>{label}</div></div>
                        <div style={{borderRadius:9,overflow:"hidden",border:"1px solid #e8e2d8"}}>
                          {rl.map((r,i)=>(
                            <div key={i} style={{padding:"11px 16px",borderBottom:i<rl.length-1?"1px solid #f0ebe0":"none",display:"flex",justifyContent:"space-between",background:i%2===0?"white":"#faf8f5"}}>
                              <span style={{fontSize:13,fontWeight:600}}>{r.name}</span>
                              <span style={{fontSize:14,fontWeight:700,color:csi.accent}}>{r.jyou||r.area}{(r.jyou||r.area)&&<span style={{fontSize:11,color:"#8a7a6a",fontWeight:400}}>帖</span>}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{background:"#1a1612",borderRadius:9,padding:"18px 24px",display:"flex",gap:28,flexWrap:"wrap"}}>
                    {[{l:"坪数",v:c.tsubo?`${c.tsubo}坪`:"—"},{l:"延床面積",v:`${c.area?.total||"—"}㎡`},{l:"建築面積",v:`${c.area?.building||"—"}㎡`},{l:"敷地面積",v:`${c.area?.land||"—"}㎡`}].map(s=>(<div key={s.l}><div style={{fontSize:10,color:"#6a5a4a",marginBottom:2}}>{s.l}</div><div style={{fontSize:19,fontWeight:700,color:"#c9a96e"}}>{s.v}</div></div>))}
                  </div>
                </div>
              )}

              {detailTab==="specs"&&(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {[
                    {title:"キッチン・水回り",items:[["kitchen","キッチン"],["bath","浴室"],["washroom","洗面化粧台"],["toilet","トイレ"]]},
                    {title:"断熱仕様",items:[["floorInsulation","床断熱"],["wallInsulation","壁断熱"],["ceilingInsulation","天井断熱材"]]},
                    {title:"内外装仕様",items:[["outerWall","外壁"],["roof","屋根"],["sash","サッシ"],["floorMaterial","床"]]},
                    {title:"性能・仕様",items:[["ventilation","換気システム"],["longLife","長期優良住宅"],["insulationGrade","断熱等級"],["quakeGrade","耐震等級"]]},
                    {title:"太陽光・蓄電池・制震",items:[["solarKw","太陽光"],["batteryKwh","蓄電池"],["damper","制震ダンパー"]]},
                  ].map(section=>(
                    <div key={section.title} style={{borderRadius:9,overflow:"hidden",border:"1px solid #e8e2d8"}}>
                      <div style={{background:csi.light,padding:"10px 16px",fontSize:11,fontWeight:700,color:csi.accent,letterSpacing:".08em"}}>{section.title}</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",background:"white"}}>
                        {section.items.map(([k,l],i)=>{
                          let v=c.specs?.[k]||"—";
                          if(k==="solarKw"&&v!=="—")v=v+"kW";
                          if(k==="batteryKwh"&&v!=="—")v=v+"kWh";
                          return(<div key={k} style={{padding:"11px 16px",borderBottom:i<section.items.length-2?"1px solid #f0ebe0":"none",borderRight:i%2===0?"1px solid #f0ebe0":"none"}}><div style={{fontSize:11,color:"#a89a8a",marginBottom:2}}>{l}</div><div style={{fontSize:13,fontWeight:600}}>{v}</div></div>);
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {detailTab==="gallery"&&(
                <div>
                  {allImages.length>0?(
                    <div style={{marginBottom:20}}>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
                        {allImages.map((img,i)=>(
                          <div key={i} onClick={()=>setLightbox({images:allImages,idx:i})} className="thumb-img"
                            style={{aspectRatio:"4/3",borderRadius:9,overflow:"hidden",border:"1px solid #e8e2d8",cursor:"pointer"}}>
                            <img src={img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          </div>
                        ))}
                      </div>
                      <div style={{marginTop:8,fontSize:11,color:"#a89a8a",textAlign:"center"}}>クリックで拡大表示</div>
                    </div>
                  ):<div style={{textAlign:"center",padding:"40px",color:"#a89a8a"}}>画像がありません</div>}
                  {ytId&&<div style={{marginTop:4}}><div style={{fontSize:10,color:"#a89a8a",letterSpacing:".18em",marginBottom:10}}>YOUTUBE</div><div style={{position:"relative",paddingBottom:"56.25%",height:0,borderRadius:10,overflow:"hidden"}}><iframe src={`https://www.youtube.com/embed/${ytId}`} title="YouTube" frameBorder="0" allowFullScreen style={{position:"absolute",top:0,left:0,width:"100%",height:"100%"}}/></div></div>}
                  {!ytId&&c.youtube&&<div style={{padding:"10px 14px",background:"#f5f0e8",borderRadius:7,fontSize:12,color:"#8a7a6a",marginTop:8}}>動画: <a href={c.youtube} target="_blank" rel="noreferrer" style={{color:csi.accent}}>{c.youtube}</a></div>}
                </div>
              )}
            </div>

            {/* 他の事例 */}
            <div style={{background:"#f5f0e8",padding:"28px 36px"}}>
              <div style={{maxWidth:900,margin:"0 auto"}}>
                <div style={{fontSize:10,color:"#a89a8a",letterSpacing:".18em",marginBottom:16}}>他の施工事例</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
                  {cases.filter(x=>x._sbId!==c._sbId).slice(0,3).map(rc=>{const rsi=STYLES_DEF[rc.style]||STYLES_DEF["ナチュラル"];return(
                    <div key={rc._sbId} className="card" onClick={()=>{setSelected(rc);setDetailTab("concept");setView("detail");window.scrollTo(0,0);}} style={{background:"white",borderRadius:9,overflow:"hidden",border:"1px solid #e8e2d8"}}>
                      <div style={{position:"relative"}}><CaseImage c={rc} height={100}/><div style={{position:"absolute",top:6,left:6,background:rsi.accent,color:"white",padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700}}>{rc.style}</div></div>
                      <div style={{padding:"10px 13px"}}><div style={{fontWeight:700,fontSize:11,marginBottom:1}}>{rc.title}</div><div style={{fontSize:10,color:"#8a7a6a"}}>{rc.layout} / {rc.tsubo?`${rc.tsubo}坪`:rc.area?.total+"㎡"}</div></div>
                    </div>
                  );})}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
