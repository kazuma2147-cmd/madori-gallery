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
const BUDGET_LIST     = ["〜1,500万円","1,500〜2,000万円","2,000〜2,500万円","2,500〜3,000万円","3,000〜3,500万円","3,500〜4,000万円","4,000万円〜"];

const FEAT_CATEGORIES = [
  { label:"① 家事・生活動線", items:["回遊動線","家事ラク動線","洗濯完結動線","玄関直通洗面"] },
  { label:"② 収納",           items:["パントリー","ファミリークローゼット","ウォークインクローゼット","シューズクローゼット","階段下収納","大容量収納","収納率高め"] },
  { label:"③ 空間提案",       items:["吹抜け","畳コーナー","書斎","スタディコーナー","ランドリールーム","中庭","ガレージ","スキップフロア","勾配天井"] },
  { label:"④ 暮らし方",       items:["子育て向き","共働き向き","二世帯向き","老後安心","ペット対応","在宅ワーク","家事時短","収納重視","家族団らん"] },
  { label:"⑤ デザイン・仕様", items:["アイランドキッチン","ペニンシュラキッチン","大開口","造作洗面台"] },
];

const EMPTY_CASE = {
  buildType:"注文住宅",
  style:"ナチュラル", layout:"3LDK", floors:"2階建て",
  title:"", subtitle:"",
  area:{ land:"", building:"", total:"" },
  tsubo:"",
  budget:"3,000〜3,500万円", direction:"南", location:"", year:new Date().getFullYear(),
  structure:"木造軸組", concept:"",
  highlights:["","","",""],
  rooms:[{ name:"LDK", floor:1, area:"" }],
  features:[],
  specs:{ kitchen:"", bath:"", washroom:"", toilet:"", floorInsulation:"", wallInsulation:"", ceilingInsulation:"", outerWall:"", roof:"", sash:"", floorMaterial:"", ventilation:"", longLife:"", insulationGrade:"", quakeGrade:"" },
  image:"", images:[],
  youtube:"",
};

function parseBudget(str) {
  if (!str) return [0, 99999];
  const nums = (str.match(/[\d,]+/g)||[]).map(n=>parseInt(n.replace(/,/g,""),10));
  if (str.startsWith("〜")) return [0, nums[0]||99999];
  if (str.endsWith("〜"))   return [nums[0]||0, 99999];
  return [nums[0]||0, nums[1]||nums[0]||99999];
}
function matchBudget(budgetStr, filter) {
  if (!filter||!budgetStr) return true;
  const [clo,chi]=parseBudget(budgetStr), [flo,fhi]=parseBudget(filter);
  return clo<=fhi && chi>=flo;
}

function sbHeaders(key, extra={}) {
  return { "apikey":key, "Authorization":`Bearer ${key}`, "Content-Type":"application/json", "Prefer":"return=representation", ...extra };
}
async function sbGetCases(url,key) {
  const res=await fetch(`${url}/rest/v1/cases?select=*&order=id.asc`,{headers:sbHeaders(key)});
  if(!res.ok) throw new Error(`取得失敗: ${res.status} ${await res.text()}`);
  return (await res.json()).map(r=>({...r.data,_sbId:r.id}));
}
async function sbInsertCase(url,key,caseData) {
  const {_sbId,...data}=caseData;
  const res=await fetch(`${url}/rest/v1/cases`,{method:"POST",headers:sbHeaders(key),body:JSON.stringify({data})});
  if(!res.ok) throw new Error(`追加失敗: ${res.status} ${await res.text()}`);
  const rows=await res.json(); return {...rows[0].data,_sbId:rows[0].id};
}
async function sbUpdateCase(url,key,sbId,caseData) {
  const {_sbId,...data}=caseData;
  const res=await fetch(`${url}/rest/v1/cases?id=eq.${sbId}`,{method:"PATCH",headers:sbHeaders(key),body:JSON.stringify({data})});
  if(!res.ok) throw new Error(`更新失敗: ${res.status} ${await res.text()}`);
  const rows=await res.json(); return {...rows[0].data,_sbId:rows[0].id};
}
async function sbDeleteCase(url,key,sbId) {
  const res=await fetch(`${url}/rest/v1/cases?id=eq.${sbId}`,{method:"DELETE",headers:sbHeaders(key,{"Prefer":"return=minimal"})});
  if(!res.ok) throw new Error(`削除失敗: ${res.status} ${await res.text()}`);
}
async function sbUploadImage(url,key,file) {
  const ext=file.name.split(".").pop();
  const filename=`${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const res=await fetch(`${url}/storage/v1/object/case-images/${filename}`,{method:"POST",headers:{"apikey":key,"Authorization":`Bearer ${key}`,"Content-Type":file.type,"x-upsert":"true"},body:file});
  if(!res.ok) throw new Error(`画像アップ失敗: ${res.status} ${await res.text()}`);
  return `${url}/storage/v1/object/public/case-images/${filename}`;
}
async function sbTestConnection(url,key) {
  let res;
  try { res=await fetch(`${url}/rest/v1/cases?select=id&limit=1`,{headers:sbHeaders(key)}); }
  catch(e) { throw new Error(`ネットワークエラー: ${e.message}`); }
  if(res.status===401) throw new Error("認証エラー: APIキーが正しくありません");
  if(res.status===404) throw new Error("テーブルが見つかりません");
  if(!res.ok){const b=await res.text().catch(()=>""); throw new Error(`エラー ${res.status}: ${b.slice(0,120)}`);}
  return true;
}

function HouseIllust({style}) {
  const si=STYLES_DEF[style]||STYLES_DEF["ナチュラル"];
  if(style==="ホテルライク") return(<svg viewBox="0 0 280 180" fill="none" style={{width:"100%",height:"100%"}}><rect width="280" height="180" fill={si.light}/><rect x="30" y="40" width="220" height="108" fill="#e8e4de"/><rect x="30" y="40" width="220" height="6" fill="#2a2218"/><rect x="55" y="56" width="70" height="50" fill="#c8c0b0" opacity="0.7"/><rect x="140" y="56" width="70" height="50" fill="#c8c0b0" opacity="0.7"/><rect x="120" y="86" width="22" height="62" fill="#2a2218"/><rect x="0" y="148" width="280" height="32" fill="#d8d4ce" opacity="0.5"/></svg>);
  if(style==="和モダン") return(<svg viewBox="0 0 280 180" fill="none" style={{width:"100%",height:"100%"}}><rect width="280" height="180" fill={si.light}/><polygon points="15,72 140,38 265,72" fill="#3a2e24"/><rect x="25" y="73" width="230" height="75" fill="#d4c4b0"/><rect x="38" y="85" width="50" height="45" fill="#e8e0d0" opacity="0.9"/><line x1="63" y1="85" x2="63" y2="130" stroke="#7c5c3a" strokeWidth="1"/><rect x="103" y="85" width="50" height="45" fill="#e8e0d0" opacity="0.9"/><rect x="0" y="148" width="280" height="32" fill="#e8e0d0" opacity="0.5"/></svg>);
  if(style==="インダストリアル") return(<svg viewBox="0 0 280 180" fill="none" style={{width:"100%",height:"100%"}}><rect width="280" height="180" fill={si.light}/><rect x="20" y="50" width="240" height="98" fill="#d8d4d0"/><rect x="20" y="50" width="240" height="10" fill="#4a4040"/><rect x="40" y="68" width="60" height="50" fill="#b8b0a8" opacity="0.8"/><rect x="120" y="68" width="60" height="50" fill="#b8b0a8" opacity="0.8"/><rect x="195" y="68" width="40" height="50" fill="#b8b0a8" opacity="0.8"/><rect x="115" y="108" width="26" height="40" fill="#4a4040"/><rect x="0" y="148" width="280" height="32" fill="#c8c4c0" opacity="0.5"/></svg>);
  if(style==="シンプルモダン") return(<svg viewBox="0 0 280 180" fill="none" style={{width:"100%",height:"100%"}}><rect width="280" height="180" fill={si.light}/><rect x="35" y="48" width="210" height="100" fill="white" stroke="#d8d8d8" strokeWidth="1"/><rect x="35" y="48" width="210" height="5" fill="#4a4a4a"/><rect x="55" y="65" width="80" height="55" fill="#d0e0ec" opacity="0.8"/><rect x="100" y="112" width="20" height="36" fill="#c0c0c0"/><rect x="0" y="148" width="280" height="32" fill="#ebebeb" opacity="0.7"/></svg>);
  if(style==="北欧") return(<svg viewBox="0 0 280 180" fill="none" style={{width:"100%",height:"100%"}}><rect width="280" height="180" fill={si.light}/><polygon points="50,78 140,22 230,78" fill="#4a6b7c"/><rect x="55" y="78" width="170" height="70" fill="#e8f0f5"/><rect x="68" y="86" width="36" height="28" rx="1" fill="white"/><rect x="70" y="88" width="32" height="24" fill="#9cc4d8" opacity="0.75"/><line x1="86" y1="88" x2="86" y2="112" stroke="white" strokeWidth="1.5"/><line x1="70" y1="100" x2="102" y2="100" stroke="white" strokeWidth="1.5"/><rect x="172" y="86" width="36" height="28" rx="1" fill="white"/><rect x="118" y="112" width="24" height="36" rx="12" fill="white"/><rect x="120" y="114" width="20" height="32" rx="10" fill="#c45a3a"/><rect x="0" y="148" width="280" height="32" fill="#d8eaf2" opacity="0.7"/></svg>);
  return(<svg viewBox="0 0 280 180" fill="none" style={{width:"100%",height:"100%"}}><rect width="280" height="180" fill={si.light}/><polygon points="30,80 140,25 250,80" fill="#a08050"/><rect x="30" y="78" width="220" height="72" fill="#d4b896"/><rect x="48" y="88" width="38" height="32" rx="2" fill="#c8d9c0" opacity="0.85"/><rect x="170" y="88" width="38" height="32" rx="2" fill="#c8d9c0" opacity="0.85"/><rect x="113" y="108" width="28" height="42" rx="14" fill="#a08050"/><rect x="0" y="148" width="280" height="32" fill="#c8d5b5" opacity="0.6"/></svg>);
}

function CaseImage({c,height=200}) {
  const [err,setErr]=useState(false);
  return(<div style={{height,overflow:"hidden",background:STYLES_DEF[c.style]?.light||"#f5f0e8",position:"relative"}}>{c.image&&!err?<img src={c.image} alt={c.title} onError={()=>setErr(true)} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<HouseIllust style={c.style}/>}</div>);
}

function Sec({title,children}) {
  return(<div style={{background:"white",borderRadius:10,border:"1px solid #e8e2d8",overflow:"hidden"}}><div style={{background:"#f5f2ee",padding:"10px 18px",fontSize:12,fontWeight:700,color:"#3a3028",borderBottom:"1px solid #e8e2d8"}}>{title}</div><div style={{padding:18}}>{children}</div></div>);
}
const inp={width:"100%",padding:"9px 12px",border:"1px solid #d4cfc5",borderRadius:7,fontSize:13,outline:"none",background:"white",boxSizing:"border-box"};
const sel={width:"100%",padding:"9px 8px",border:"1px solid #d4cfc5",borderRadius:7,fontSize:12,background:"white",boxSizing:"border-box"};
function Lbl({children}){return <div style={{fontSize:11,color:"#6a5a4a",marginBottom:5}}>{children}</div>;}

const SQL_SETUP=`-- ① casesテーブルを作成
create table cases (
  id bigint generated always as identity primary key,
  data jsonb not null,
  created_at timestamptz default now()
);
-- ② RLS有効化
alter table cases enable row level security;
-- ③ ポリシー作成
create policy "Allow all" on cases
  for all using (true) with check (true);`;

function SetupScreen({onSave}) {
  const [url,setUrl]=useState(""); const [key,setKey]=useState("");
  const [testing,setTesting]=useState(false); const [status,setStatus]=useState(null);
  const [errMsg,setErrMsg]=useState(""); const [copied,setCopied]=useState(false);
  function cleanUrl(raw){let u=raw.trim().replace(/\/$/,"");if(!u.startsWith("http")&&u.length>10)u=`https://${u}.supabase.co`;try{const p=new URL(u);u=p.origin;}catch{}return u;}
  async function handleTest(){if(!url||!key)return;setTesting(true);setStatus(null);const cu=cleanUrl(url);try{await sbTestConnection(cu,key.trim());setStatus("ok");setUrl(cu);}catch(e){setStatus("error");setErrMsg(`試行URL: ${cu}\n${e.message}`);}finally{setTesting(false);}}
  function handleSave(){if(status!=="ok")return;onSave({url:cleanUrl(url),key:key.trim()});}
  function copySQL(){navigator.clipboard.writeText(SQL_SETUP).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});}
  return(
    <div style={{minHeight:"100vh",background:"#faf8f5",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px",fontFamily:"'Noto Serif JP','Georgia',serif"}}>
      <div style={{width:"100%",maxWidth:640}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <svg width="48" height="48" viewBox="0 0 28 28" fill="none" style={{margin:"0 auto 12px",display:"block"}}><path d="M14 3L3 11v14h8v-8h6v8h8V11L14 3z" stroke="#c9a96e" strokeWidth="1.5" fill="none" strokeLinejoin="round"/></svg>
          <h1 style={{margin:0,fontSize:22,fontWeight:700}}>間取り検索</h1>
          <p style={{margin:"8px 0 0",color:"#8a7a6a",fontSize:13}}>Supabase 接続設定</p>
        </div>
        <div style={{background:"white",borderRadius:14,border:"1px solid #e8e2d8",marginBottom:16,overflow:"hidden"}}>
          <div style={{background:"#1a1612",padding:"14px 22px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{background:"#c9a96e",color:"#1a1612",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>1</span>
            <span style={{color:"white",fontWeight:700,fontSize:14}}>Supabase でテーブルを作成する</span>
          </div>
          <div style={{padding:"18px 22px"}}>
            <p style={{margin:"0 0 14px",fontSize:13,color:"#5a4a3a",lineHeight:1.8}}><a href="https://supabase.com" target="_blank" rel="noreferrer" style={{color:"#3a6b7c",fontWeight:700}}>supabase.com</a> でプロジェクトを作成し、<b>SQL Editor</b> で以下のSQLを実行してください。</p>
            <div style={{position:"relative"}}><pre style={{background:"#1a1612",color:"#c9a96e",padding:"16px 18px",borderRadius:8,fontSize:11,lineHeight:1.7,overflow:"auto",margin:0,fontFamily:"monospace"}}>{SQL_SETUP}</pre><button onClick={copySQL} style={{position:"absolute",top:10,right:10,background:copied?"#4caf50":"#c9a96e",color:"white",border:"none",borderRadius:5,padding:"4px 12px",fontSize:11,cursor:"pointer"}}>{copied?"コピー済み ✓":"コピー"}</button></div>
          </div>
        </div>
        <div style={{background:"white",borderRadius:14,border:"1px solid #e8e2d8",overflow:"hidden"}}>
          <div style={{background:"#1a1612",padding:"14px 22px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{background:"#c9a96e",color:"#1a1612",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>2</span>
            <span style={{color:"white",fontWeight:700,fontSize:14}}>APIキーを入力して接続</span>
          </div>
          <div style={{padding:"18px 22px"}}>
            <p style={{margin:"0 0 16px",fontSize:12,color:"#8a7a6a",lineHeight:1.7}}>Supabase の <b>Settings → API Keys → Legacy anon</b> タブの anon キー（eyJ...）を使用してください。</p>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div><Lbl>Project URL</Lbl><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://xxxxxxxxxxxx.supabase.co" style={inp}/></div>
              <div><Lbl>anon key</Lbl><input value={key} onChange={e=>setKey(e.target.value)} placeholder="eyJ..." type="password" style={inp}/></div>
            </div>
            {status==="ok" && <div style={{marginTop:12,padding:"10px 14px",background:"#e8f5e9",borderRadius:7,color:"#2e7d32",fontSize:13,fontWeight:600}}>✓ 接続成功！</div>}
            {status==="error" && <div style={{marginTop:12,padding:"10px 14px",background:"#fce4e4",borderRadius:7,color:"#c0392b",fontSize:12,whiteSpace:"pre-wrap"}}>✕ {errMsg}</div>}
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button onClick={handleTest} disabled={!url||!key||testing} style={{padding:"10px 22px",border:"1px solid #c9b89a",borderRadius:7,background:"white",cursor:(!url||!key||testing)?"not-allowed":"pointer",fontSize:13,color:"#5a4a3a",fontFamily:"inherit",opacity:(!url||!key)?0.5:1}}>{testing?"確認中...":"接続テスト"}</button>
              <button onClick={handleSave} disabled={status!=="ok"} style={{flex:1,padding:"10px",background:status==="ok"?"#1a1612":"#d4cfc5",color:status==="ok"?"#c9a96e":"#9a9090",border:"none",borderRadius:7,fontSize:14,fontWeight:700,cursor:status==="ok"?"pointer":"not-allowed",fontFamily:"inherit"}}>この設定で始める →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureFilter({selected,onChange}) {
  const [open,setOpen]=useState({});
  const toggle=label=>setOpen(p=>({...p,[label]:!p[label]}));
  return(
    <div style={{borderTop:"1px solid #f0ebe0",paddingTop:14,marginTop:6}}>
      <div style={{fontSize:11,color:"#8a7a6a",marginBottom:10,fontWeight:600}}>こだわり条件</div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {FEAT_CATEGORIES.map(cat=>(
          <div key={cat.label} style={{border:"1px solid #e8e2d8",borderRadius:8,overflow:"hidden"}}>
            <button onClick={()=>toggle(cat.label)} style={{width:"100%",padding:"9px 14px",background:open[cat.label]?"#f5f2ee":"white",border:"none",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,fontWeight:600,color:"#3a3028",fontFamily:"inherit"}}>
              <span>{cat.label}{cat.items.some(i=>selected.includes(i))&&<span style={{marginLeft:7,background:"#c9a96e",color:"white",borderRadius:20,padding:"1px 7px",fontSize:10}}>{cat.items.filter(i=>selected.includes(i)).length}</span>}</span>
              <span style={{fontSize:10,color:"#a89a8a"}}>{open[cat.label]?"▲":"▼"}</span>
            </button>
            {open[cat.label]&&(
              <div style={{padding:"10px 14px",display:"flex",flexWrap:"wrap",gap:5,background:"white",borderTop:"1px solid #f0ebe0"}}>
                {cat.items.map(item=>{const active=selected.includes(item);return(<button key={item} onClick={()=>onChange(item)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${active?"#c9a96e":"#e0d8cc"}`,background:active?"#fff8ee":"white",color:active?"#7a5a2a":"#5a4a3a",fontSize:11,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit"}}>{item}</button>);})}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const envConfig=SUPABASE_URL&&SUPABASE_KEY?{url:SUPABASE_URL,key:SUPABASE_KEY}:null;
  const [config,setConfig]=useState(envConfig);
  const [cases,setCases]=useState([]); const [loading,setLoading]=useState(false); const [loadErr,setLoadErr]=useState("");
  const [view,setView]=useState("gallery"); const [selectedCase,setSelected]=useState(null);
  const [favorites,setFavorites]=useState(new Set());
  const [filterBuildType,setFBuildType]=useState(""); const [filterStyle,setFStyle]=useState("");
  const [filterLayout,setFLayout]=useState(""); const [filterFloor,setFFloor]=useState("");
  const [filterBudget,setFBudget]=useState(""); const [filterTsuboMin,setFTsuboMin]=useState(""); const [filterTsuboMax,setFTsuboMax]=useState("");
  const [filterFeatures,setFFeatures]=useState([]); const [showFavs,setShowFavs]=useState(false);
  const [detailTab,setDetailTab]=useState("concept"); const [detailImgIdx,setDetailImgIdx]=useState(0);
  const [adminUnlocked,setAdminUnlocked]=useState(false); const [pwInput,setPwInput]=useState(""); const [pwError,setPwError]=useState(false);
  const [editingCase,setEditingCase]=useState(null); const [formData,setFormData]=useState(EMPTY_CASE);
  const [saveStatus,setSaveStatus]=useState(""); const [saveErr,setSaveErr]=useState("");
  const [deleteConfirm,setDeleteConfirm]=useState(null);
  const [imgUploading,setImgUploading]=useState(false); const [addImgUploading,setAddImgUploading]=useState(false);
  const imgRef=useRef(); const addImgRef=useRef();

  useEffect(()=>{if(envConfig)return;try{const s=localStorage.getItem(CONFIG_KEY);if(s)setConfig(JSON.parse(s));}catch{}},[]);
  const fetchCases=useCallback(async cfg=>{if(!cfg)return;setLoading(true);setLoadErr("");try{setCases(await sbGetCases(cfg.url,cfg.key));}catch(e){setLoadErr(e.message);}finally{setLoading(false);}},[]); 
  useEffect(()=>{fetchCases(config);},[config,fetchCases]);
  function saveConfig(cfg){localStorage.setItem(CONFIG_KEY,JSON.stringify(cfg));setConfig(cfg);}

  const filtered=cases.filter(c=>{
    if(filterBuildType&&c.buildType!==filterBuildType)return false;
    if(filterStyle&&c.style!==filterStyle)return false;
    if(filterLayout&&c.layout!==filterLayout)return false;
    if(filterFloor&&c.floors!==filterFloor)return false;
    if(filterBudget&&!matchBudget(c.budget,filterBudget))return false;
    if(filterTsuboMin&&Number(c.tsubo)<Number(filterTsuboMin))return false;
    if(filterTsuboMax&&Number(c.tsubo)>Number(filterTsuboMax))return false;
    if(filterFeatures.length>0&&!filterFeatures.every(f=>c.features?.includes(f)))return false;
    if(showFavs&&!favorites.has(c._sbId))return false;
    return true;
  });
  function toggleFav(sbId,e){e?.stopPropagation();setFavorites(p=>{const s=new Set(p);s.has(sbId)?s.delete(sbId):s.add(sbId);return s;});}
  function toggleFF(item){setFFeatures(p=>p.includes(item)?p.filter(x=>x!==item):[...p,item]);}
  function clearFilters(){setFBuildType("");setFStyle("");setFLayout("");setFFloor("");setFBudget("");setFTsuboMin("");setFTsuboMax("");setFFeatures([]);}
  const hasFilter=filterBuildType||filterStyle||filterLayout||filterFloor||filterBudget||filterTsuboMin||filterTsuboMax||filterFeatures.length>0;

  function openNew(){setEditingCase(null);setFormData({...EMPTY_CASE,highlights:["","","",""],rooms:[{name:"LDK",floor:1,area:""}],features:[],images:[],image:"",youtube:"",specs:{...EMPTY_CASE.specs}});setSaveErr("");setView("adminForm");}
  function openEdit(c){setEditingCase(c._sbId);setFormData(JSON.parse(JSON.stringify({...EMPTY_CASE,...c,specs:{...EMPTY_CASE.specs,...(c.specs||{})}})));setSaveErr("");setView("adminForm");}

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
  async function handleMainImg(e){const file=e.target.files?.[0];if(!file)return;setImgUploading(true);try{setFormData(f=>({...f,image:""}));const u=await sbUploadImage(config.url,config.key,file);setFormData(f=>({...f,image:u}));}catch(e){alert(`アップ失敗: ${e.message}`);}finally{setImgUploading(false);if(imgRef.current)imgRef.current.value="";}}
  async function handleAddImg(e){const file=e.target.files?.[0];if(!file)return;setAddImgUploading(true);try{const u=await sbUploadImage(config.url,config.key,file);setFormData(f=>({...f,images:[...(f.images||[]),u]}));}catch(e){alert(`アップ失敗: ${e.message}`);}finally{setAddImgUploading(false);if(addImgRef.current)addImgRef.current.value="";}}

  const currentCase=selectedCase?(cases.find(c=>c._sbId===selectedCase._sbId)||selectedCase):null;
  if(!config) return <SetupScreen onSave={saveConfig}/>;

  return(
    <div style={{fontFamily:"'Noto Serif JP','Georgia',serif",background:"#faf8f5",minHeight:"100vh",color:"#1a1612"}}>
      <style>{`*{box-sizing:border-box}button,input,textarea,select{font-family:inherit}.card{transition:transform .2s,box-shadow .2s;cursor:pointer}.card:hover{transform:translateY(-4px);box-shadow:0 14px 40px rgba(0,0,0,.11)!important}.chip{transition:all .14s;cursor:pointer}.chip:hover{opacity:.8}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <header style={{background:"white",borderBottom:"1px solid #e8e2d8",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 32px",height:60}}>
          <div onClick={()=>setView("gallery")} style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 3L3 11v14h8v-8h6v8h8V11L14 3z" stroke="#c9a96e" strokeWidth="1.5" fill="none" strokeLinejoin="round"/></svg>
            <div><div style={{fontSize:16,fontWeight:700,letterSpacing:".06em",lineHeight:1.1}}>間取り検索</div><div style={{fontSize:9,color:"#a89a8a",letterSpacing:".15em"}}>Powered by Supabase</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {favorites.size>0&&<button onClick={()=>{setShowFavs(!showFavs);setView("gallery");}} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",border:`1px solid ${showFavs?"#c9a96e":"#e0d8cc"}`,borderRadius:20,background:showFavs?"#fff8ee":"white",cursor:"pointer",fontSize:12,color:showFavs?"#c9a96e":"#5a4a3a"}}>♥ {favorites.size}</button>}
            <button onClick={()=>setView(["admin","adminForm"].includes(view)?"gallery":(adminUnlocked?"admin":"adminLogin"))} style={{padding:"6px 14px",border:"1px solid #e0d8cc",borderRadius:20,background:["admin","adminForm"].includes(view)?"#fff8ee":"white",cursor:"pointer",fontSize:12,color:"#8a7a6a"}}>{["admin","adminForm"].includes(view)?"← ギャラリーへ":"⚙ 管理"}</button>
          </div>
        </div>
      </header>

      {loading&&<div style={{textAlign:"center",padding:"60px",color:"#8a7a6a"}}>読み込み中...</div>}
      {loadErr&&<div style={{margin:"24px 32px",padding:"14px 18px",background:"#fce4e4",borderRadius:8,color:"#c0392b",fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>⚠ {loadErr}</span><button onClick={()=>fetchCases(config)} style={{padding:"5px 14px",border:"1px solid #c0392b",borderRadius:5,background:"white",color:"#c0392b",cursor:"pointer",fontSize:12}}>再試行</button></div>}

      {view==="adminLogin"&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"80vh"}}>
          <div style={{background:"white",borderRadius:16,padding:"40px 48px",border:"1px solid #e8e2d8",textAlign:"center",width:360}}>
            <div style={{fontSize:36,marginBottom:16}}>🔐</div>
            <h2 style={{margin:"0 0 6px",fontSize:20}}>管理パネル</h2>
            <p style={{margin:"0 0 20px",color:"#8a7a6a",fontSize:13}}>パスワードを入力してください</p>
            <input type="password" value={pwInput} onChange={e=>setPwInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){if(pwInput===ADMIN_PASSWORD){setAdminUnlocked(true);setView("admin");setPwError(false);}else setPwError(true);}}} placeholder="パスワード" style={{...inp,marginBottom:8,border:`1px solid ${pwError?"#e74c3c":"#d4cfc5"}`}}/>
            {pwError&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:8}}>パスワードが違います</div>}
            <button onClick={()=>{if(pwInput===ADMIN_PASSWORD){setAdminUnlocked(true);setView("admin");setPwError(false);}else setPwError(true);}} style={{width:"100%",padding:11,background:"#1a1612",color:"#c9a96e",border:"none",borderRadius:8,fontSize:14,cursor:"pointer",fontWeight:700}}>ログイン</button>
            <div style={{marginTop:14,fontSize:11,color:"#b0a898"}}>初期PW: admin1234</div>
          </div>
        </div>
      )}

      {view==="admin"&&adminUnlocked&&(
        <div style={{maxWidth:1100,margin:"0 auto",padding:"32px 32px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
            <div><h2 style={{margin:0,fontSize:22}}>間取り事例の管理</h2><p style={{margin:"4px 0 0",color:"#8a7a6a",fontSize:13}}>事例の追加・編集・削除</p></div>
            <div style={{display:"flex",gap:10}}><button onClick={()=>fetchCases(config)} style={{padding:"8px 16px",border:"1px solid #c9b89a",borderRadius:7,background:"white",cursor:"pointer",fontSize:12}}>↺ 再読込</button><button onClick={openNew} style={{padding:"10px 22px",background:"#c9a96e",color:"white",border:"none",borderRadius:8,fontSize:14,cursor:"pointer",fontWeight:700}}>＋ 新規追加</button></div>
          </div>
          {cases.length===0&&!loading&&<div style={{textAlign:"center",padding:"60px",color:"#8a7a6a"}}><div style={{fontSize:48,opacity:.3,marginBottom:12}}>🏠</div><div>事例がまだありません。</div></div>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:20}}>
            {cases.map(c=>{const csi=STYLES_DEF[c.style]||STYLES_DEF["ナチュラル"];return(
              <div key={c._sbId} style={{background:"white",borderRadius:12,overflow:"hidden",border:"1px solid #e8e2d8"}}>
                <div style={{position:"relative"}}><CaseImage c={c} height={130}/><div style={{position:"absolute",top:8,left:8,background:csi.accent,color:"white",padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:700}}>{c.style}</div></div>
                <div style={{padding:"14px 16px"}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{c.title||"（タイトル未設定）"}</div>
                  <div style={{fontSize:11,color:"#8a7a6a",marginBottom:12}}>{c.buildType} / {c.layout} / {c.floors}</div>
                  <div style={{display:"flex",gap:8}}><button onClick={()=>openEdit(c)} style={{flex:1,padding:"7px",border:"1px solid #c9b89a",borderRadius:6,background:"white",cursor:"pointer",fontSize:12,fontWeight:600}}>✏ 編集</button><button onClick={()=>setDeleteConfirm(c._sbId)} style={{padding:"7px 12px",border:"1px solid #f5c6cb",borderRadius:6,background:"#fff5f5",color:"#c0392b",cursor:"pointer",fontSize:12}}>削除</button></div>
                </div>
              </div>
            );})}
          </div>
          {deleteConfirm&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}><div style={{background:"white",borderRadius:14,padding:"36px 40px",textAlign:"center",maxWidth:340,width:"90%"}}><div style={{fontSize:40,marginBottom:14}}>🗑️</div><h3 style={{margin:"0 0 8px"}}>削除しますか？</h3><p style={{color:"#6a5a4a",fontSize:13,margin:"0 0 24px"}}>データも削除されます。</p><div style={{display:"flex",gap:10,justifyContent:"center"}}><button onClick={()=>setDeleteConfirm(null)} style={{padding:"10px 22px",border:"1px solid #d4cfc5",borderRadius:7,background:"white",cursor:"pointer"}}>キャンセル</button><button onClick={()=>handleDelete(deleteConfirm)} style={{padding:"10px 22px",background:"#c0392b",color:"white",border:"none",borderRadius:7,cursor:"pointer",fontWeight:700}}>削除する</button></div></div></div>}
        </div>
      )}

      {view==="adminForm"&&adminUnlocked&&(
        <div style={{maxWidth:820,margin:"0 auto",padding:"32px 32px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
            <div><button onClick={()=>setView("admin")} style={{background:"none",border:"none",cursor:"pointer",color:"#8a7a6a",fontSize:13,padding:0,marginBottom:4}}>← 管理一覧へ</button><h2 style={{margin:0,fontSize:20}}>{editingCase!=null?"事例を編集":"新規事例を追加"}</h2></div>
            <button onClick={handleSaveCase} disabled={saveStatus==="saving"} style={{padding:"10px 26px",background:saveStatus==="saving"?"#8a7a6a":"#1a1612",color:"#c9a96e",border:"none",borderRadius:8,fontSize:14,cursor:saveStatus==="saving"?"not-allowed":"pointer",fontWeight:700}}>{saveStatus==="saving"?"保存中...":saveStatus==="saved"?"✓ 保存しました":"保存する"}</button>
          </div>
          {saveErr&&<div style={{marginBottom:16,padding:"12px 16px",background:"#fce4e4",borderRadius:8,color:"#c0392b",fontSize:13}}>⚠ {saveErr}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:18}}>

            <Sec title="📷 メイン写真">
              <div style={{display:"flex",gap:20,alignItems:"flex-start"}}>
                <div style={{width:200,height:130,borderRadius:10,overflow:"hidden",border:"1px solid #e0d8cc",flexShrink:0,background:"#f5f0e8"}}>{formData.image?<img src={formData.image} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.style.display="none"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"#a89a8a",fontSize:12}}>プレビュー</div>}</div>
                <div style={{flex:1}}>
                  <label style={{display:"inline-block",padding:"10px 18px",background:imgUploading?"#a89a8a":"#c9a96e",color:"white",borderRadius:7,cursor:imgUploading?"not-allowed":"pointer",fontSize:13,fontWeight:600}}>{imgUploading?"アップロード中...":"📁 メイン写真を選ぶ"}<input ref={imgRef} type="file" accept="image/*" onChange={handleMainImg} style={{display:"none"}} disabled={imgUploading}/></label>
                  {formData.image&&<button onClick={()=>setFormData(f=>({...f,image:""}))} style={{marginTop:8,display:"block",padding:"5px 12px",border:"1px solid #f5c6cb",borderRadius:5,background:"#fff5f5",color:"#c0392b",cursor:"pointer",fontSize:11}}>削除</button>}
                </div>
              </div>
            </Sec>

            <Sec title="🖼 追加画像（間取り図・パース・内観など）">
              <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:12}}>
                {(formData.images||[]).map((img,i)=>(
                  <div key={i} style={{position:"relative",width:130,height:90,borderRadius:8,overflow:"hidden",border:"1px solid #e0d8cc"}}>
                    <img src={img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    <button onClick={()=>setFormData(f=>({...f,images:f.images.filter((_,j)=>j!==i)}))} style={{position:"absolute",top:4,right:4,background:"rgba(192,57,43,.9)",border:"none",borderRadius:"50%",width:20,height:20,color:"white",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                  </div>
                ))}
                <label style={{width:130,height:90,borderRadius:8,border:"2px dashed #c9b89a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:addImgUploading?"not-allowed":"pointer",background:"white",color:"#8a7a6a",fontSize:11,gap:4}}>
                  {addImgUploading?"...":<><span style={{fontSize:24}}>＋</span><span>画像を追加</span></>}
                  <input ref={addImgRef} type="file" accept="image/*" onChange={handleAddImg} style={{display:"none"}} disabled={addImgUploading}/>
                </label>
              </div>
              <p style={{margin:0,fontSize:11,color:"#a89a8a"}}>間取り図・外観パース・内観写真など複数枚追加できます</p>
            </Sec>

            <Sec title="▶ YouTubeリンク">
              <Lbl>YouTube動画URL</Lbl>
              <input value={formData.youtube||""} onChange={e=>setFormData(f=>({...f,youtube:e.target.value}))} style={inp} placeholder="https://www.youtube.com/watch?v=..."/>
            </Sec>

            <Sec title="📋 基本情報">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <div style={{gridColumn:"1/-1"}}><Lbl>タイトル *</Lbl><input value={formData.title} onChange={e=>setFormData(f=>({...f,title:e.target.value}))} style={inp} placeholder="例: 光と緑に包まれる、家族の居場所"/></div>
                <div style={{gridColumn:"1/-1"}}><Lbl>サブタイトル</Lbl><input value={formData.subtitle} onChange={e=>setFormData(f=>({...f,subtitle:e.target.value}))} style={inp} placeholder="例: 木の温もりと大きな窓が織りなす明るい住まい"/></div>
                {[{l:"建物タイプ",k:"buildType",opts:BUILD_TYPE_LIST},{l:"スタイル",k:"style",opts:STYLE_LIST},{l:"間取り",k:"layout",opts:LAYOUT_LIST},{l:"階数",k:"floors",opts:FLOOR_LIST},{l:"構造",k:"structure",opts:STRUCT_LIST},{l:"向き",k:"direction",opts:DIR_LIST}].map(({l,k,opts})=>(
                  <div key={k}><Lbl>{l}</Lbl><select value={formData[k]} onChange={e=>setFormData(f=>({...f,[k]:e.target.value}))} style={sel}>{opts.map(o=><option key={o}>{o}</option>)}</select></div>
                ))}
                {[{l:"竣工年",k:"year",type:"number"},{l:"施工地",k:"location"},{l:"予算目安",k:"budget"}].map(({l,k,type})=>(
                  <div key={k}><Lbl>{l}</Lbl><input type={type||"text"} value={formData[k]} onChange={e=>setFormData(f=>({...f,[k]:type==="number"?Number(e.target.value):e.target.value}))} style={inp}/></div>
                ))}
              </div>
            </Sec>

            <Sec title="📐 面積・坪数">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12}}>
                {[["延床面積(㎡)","total"],["建築面積(㎡)","building"],["敷地面積(㎡)","land"]].map(([l,k])=>(
                  <div key={k}><Lbl>{l}</Lbl><input type="number" value={formData.area?.[k]||""} onChange={e=>setFormData(f=>({...f,area:{...f.area,[k]:e.target.value}}))} style={inp}/></div>
                ))}
                <div><Lbl>坪数</Lbl><input type="number" value={formData.tsubo||""} onChange={e=>setFormData(f=>({...f,tsubo:e.target.value}))} style={inp} placeholder="例: 35"/></div>
              </div>
            </Sec>

            <Sec title="💬 コンセプト"><textarea rows={4} value={formData.concept} onChange={e=>setFormData(f=>({...f,concept:e.target.value}))} style={{...inp,resize:"vertical"}} placeholder="この住まいのコンセプトや設計の想いを記入してください"/></Sec>

            <Sec title="✦ ハイライト（最大5項目）">
              {(formData.highlights||[]).map((h,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:"#1a1612",color:"#c9a96e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
                  <input value={h} onChange={e=>{const hl=[...formData.highlights];hl[i]=e.target.value;setFormData(f=>({...f,highlights:hl}));}} style={{...inp,flex:1}} placeholder={`ハイライト ${i+1}`}/>
                  {formData.highlights.length>1&&<button onClick={()=>setFormData(f=>({...f,highlights:f.highlights.filter((_,j)=>j!==i)}))} style={{padding:"6px 10px",border:"1px solid #f5c6cb",borderRadius:5,background:"#fff5f5",color:"#c0392b",cursor:"pointer"}}>×</button>}
                </div>
              ))}
              {(formData.highlights||[]).length<5&&<button onClick={()=>setFormData(f=>({...f,highlights:[...f.highlights,""]}))} style={{padding:"7px 14px",border:"1px dashed #c9b89a",borderRadius:6,background:"transparent",cursor:"pointer",fontSize:12,color:"#6a5a4a"}}>＋ 追加</button>}
            </Sec>

            <Sec title="🛋 部屋構成">
              {(formData.rooms||[]).map((r,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:8,marginBottom:8,alignItems:"end"}}>
                  <div>{i===0&&<Lbl>部屋名</Lbl>}<input value={r.name} onChange={e=>{const rs=[...formData.rooms];rs[i]={...rs[i],name:e.target.value};setFormData(f=>({...f,rooms:rs}));}} style={inp} placeholder="例: 主寝室"/></div>
                  <div>{i===0&&<Lbl>階</Lbl>}<select value={r.floor} onChange={e=>{const rs=[...formData.rooms];rs[i]={...rs[i],floor:Number(e.target.value)};setFormData(f=>({...f,rooms:rs}));}} style={sel}><option value={1}>1階</option><option value={2}>2階</option><option value={3}>3階</option></select></div>
                  <div>{i===0&&<Lbl>面積(㎡)</Lbl>}<input type="number" value={r.area||""} onChange={e=>{const rs=[...formData.rooms];rs[i]={...rs[i],area:Number(e.target.value)};setFormData(f=>({...f,rooms:rs}));}} style={inp}/></div>
                  <button onClick={()=>setFormData(f=>({...f,rooms:f.rooms.filter((_,j)=>j!==i)}))} style={{padding:"9px 10px",border:"1px solid #f5c6cb",borderRadius:5,background:"#fff5f5",color:"#c0392b",cursor:"pointer",alignSelf:"flex-end"}}>×</button>
                </div>
              ))}
              <button onClick={()=>setFormData(f=>({...f,rooms:[...f.rooms,{name:"",floor:1,area:""}]}))} style={{padding:"7px 14px",border:"1px dashed #c9b89a",borderRadius:6,background:"transparent",cursor:"pointer",fontSize:12,color:"#6a5a4a"}}>＋ 部屋を追加</button>
            </Sec>

            <Sec title="⊕ こだわり">
              <div style={{marginBottom:10,display:"flex",flexWrap:"wrap",gap:6}}>{(formData.features||[]).map(f=>(<span key={f} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 12px",borderRadius:20,border:"1px solid #c9b89a",fontSize:12,background:"#fff8ee"}}>{f}<button onClick={()=>setFormData(fd=>({...fd,features:fd.features.filter(x=>x!==f)}))} style={{background:"none",border:"none",color:"#c0392b",cursor:"pointer",padding:0,fontSize:13}}>×</button></span>))}</div>
              {FEAT_CATEGORIES.map(cat=>(
                <div key={cat.label} style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:"#8a7a6a",marginBottom:5,fontWeight:600}}>{cat.label}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{cat.items.filter(f=>!(formData.features||[]).includes(f)).map(f=>(<button key={f} onClick={()=>setFormData(fd=>({...fd,features:[...(fd.features||[]),f]}))} style={{padding:"4px 11px",border:"1px dashed #c9b89a",borderRadius:20,background:"white",cursor:"pointer",fontSize:11,color:"#6a5a4a"}}>＋{f}</button>))}</div>
                </div>
              ))}
            </Sec>

            <Sec title="🔧 設備仕様">
              {[
                {title:"キッチン・水回り",cols:2,items:[["kitchen","キッチン"],["bath","浴室"],["washroom","洗面化粧台"],["toilet","トイレ"]]},
                {title:"断熱仕様",cols:3,items:[["floorInsulation","床断熱"],["wallInsulation","壁断熱"],["ceilingInsulation","天井断熱材"]]},
                {title:"内外装仕様",cols:2,items:[["outerWall","外壁"],["roof","屋根"],["sash","サッシ"],["floorMaterial","床"]]},
                {title:"その他仕様",cols:2,items:[["ventilation","換気システム"],["longLife","長期優良"],["insulationGrade","断熱等級"],["quakeGrade","耐震等級"]]},
              ].map(section=>(
                <div key={section.title} style={{marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#5a4a3a",marginBottom:8,paddingBottom:6,borderBottom:"1px solid #f0ebe0"}}>{section.title}</div>
                  <div style={{display:"grid",gridTemplateColumns:`repeat(${section.cols},1fr)`,gap:10}}>
                    {section.items.map(([k,l])=>(<div key={k}><Lbl>{l}</Lbl><input value={formData.specs?.[k]||""} onChange={e=>setFormData(f=>({...f,specs:{...f.specs,[k]:e.target.value}}))} style={inp}/></div>))}
                  </div>
                </div>
              ))}
            </Sec>

            <div style={{display:"flex",justifyContent:"flex-end",gap:12,paddingTop:4}}>
              <button onClick={()=>setView("admin")} style={{padding:"10px 22px",border:"1px solid #d4cfc5",borderRadius:7,background:"white",cursor:"pointer",fontSize:13}}>キャンセル</button>
              <button onClick={handleSaveCase} disabled={saveStatus==="saving"} style={{padding:"10px 28px",background:saveStatus==="saving"?"#8a7a6a":"#1a1612",color:"#c9a96e",border:"none",borderRadius:7,cursor:saveStatus==="saving"?"not-allowed":"pointer",fontSize:14,fontWeight:700}}>{editingCase!=null?"更新する":"登録する"}</button>
            </div>
          </div>
        </div>
      )}

      {view==="gallery"&&!loading&&(
        <div style={{maxWidth:1280,margin:"0 auto",padding:"28px 32px"}}>
          <div style={{background:"white",borderRadius:14,padding:"18px 22px",border:"1px solid #e8e2d8",marginBottom:26}}>
            <div style={{fontSize:10,color:"#a89a8a",letterSpacing:".18em",marginBottom:14}}>条件で絞り込む</div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:"#8a7a6a",marginBottom:7}}>建物タイプ</div>
              <div style={{display:"flex",gap:5}}>{BUILD_TYPE_LIST.map(s=>{const active=filterBuildType===s;return(<button key={s} className="chip" onClick={()=>setFBuildType(active?"":s)} style={{padding:"5px 16px",borderRadius:20,border:`1px solid ${active?"#c9a96e":"#e0d8cc"}`,background:active?"#fff8ee":"white",color:active?"#7a5a2a":"#5a4a3a",fontSize:12,fontWeight:active?700:400}}>{s}</button>);})}</div>
            </div>
            <div style={{display:"flex",gap:20,flexWrap:"wrap",marginBottom:14}}>
              <div><div style={{fontSize:11,color:"#8a7a6a",marginBottom:7}}>スタイル</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{STYLE_LIST.map(s=>{const active=filterStyle===s;const csi=STYLES_DEF[s];return(<button key={s} className="chip" onClick={()=>setFStyle(active?"":s)} style={{padding:"5px 13px",borderRadius:20,border:`1px solid ${active?(csi?.accent||"#c9a96e"):"#e0d8cc"}`,background:active?(csi?.light||"#fff8ee"):"white",color:active?(csi?.accent||"#7a5a2a"):"#5a4a3a",fontSize:11,fontWeight:active?700:400}}>{s}</button>);})}</div></div>
              <div><div style={{fontSize:11,color:"#8a7a6a",marginBottom:7}}>間取り</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{LAYOUT_LIST.map(s=>{const active=filterLayout===s;return(<button key={s} className="chip" onClick={()=>setFLayout(active?"":s)} style={{padding:"5px 13px",borderRadius:20,border:`1px solid ${active?"#c9a96e":"#e0d8cc"}`,background:active?"#fff8ee":"white",color:active?"#7a5a2a":"#5a4a3a",fontSize:11,fontWeight:active?700:400}}>{s}</button>);})}</div></div>
              <div><div style={{fontSize:11,color:"#8a7a6a",marginBottom:7}}>階数</div><div style={{display:"flex",gap:5}}>{FLOOR_LIST.map(s=>{const active=filterFloor===s;return(<button key={s} className="chip" onClick={()=>setFFloor(active?"":s)} style={{padding:"5px 13px",borderRadius:20,border:`1px solid ${active?"#c9a96e":"#e0d8cc"}`,background:active?"#fff8ee":"white",color:active?"#7a5a2a":"#5a4a3a",fontSize:11,fontWeight:active?700:400}}>{s}</button>);})}</div></div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:"#8a7a6a",marginBottom:7}}>坪数</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="number" value={filterTsuboMin} onChange={e=>setFTsuboMin(e.target.value)} placeholder="下限" style={{width:80,padding:"6px 10px",border:"1px solid #d4cfc5",borderRadius:7,fontSize:12,outline:"none"}}/>
                <span style={{color:"#a89a8a",fontSize:12}}>坪 〜</span>
                <input type="number" value={filterTsuboMax} onChange={e=>setFTsuboMax(e.target.value)} placeholder="上限" style={{width:80,padding:"6px 10px",border:"1px solid #d4cfc5",borderRadius:7,fontSize:12,outline:"none"}}/>
                <span style={{color:"#a89a8a",fontSize:12}}>坪</span>
              </div>
            </div>
            <div style={{marginBottom:6}}>
              <div style={{fontSize:11,color:"#8a7a6a",marginBottom:7}}>予算目安</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{BUDGET_LIST.map(b=>{const active=filterBudget===b;return(<button key={b} className="chip" onClick={()=>setFBudget(active?"":b)} style={{padding:"5px 13px",borderRadius:20,border:`1px solid ${active?"#c9a96e":"#e0d8cc"}`,background:active?"#fff8ee":"white",color:active?"#7a5a2a":"#5a4a3a",fontSize:11,fontWeight:active?700:400}}>{b}</button>);})}</div>
            </div>
            <FeatureFilter selected={filterFeatures} onChange={toggleFF}/>
            {hasFilter&&<button onClick={clearFilters} style={{marginTop:14,padding:"5px 14px",border:"1px dashed #c9b89a",borderRadius:20,background:"transparent",color:"#8a7a6a",fontSize:11,cursor:"pointer"}}>✕ 絞り込みをリセット</button>}
          </div>
          <div style={{fontSize:13,color:"#8a7a6a",marginBottom:18}}><span style={{fontWeight:700,color:"#1a1612",fontSize:20}}>{filtered.length}</span> 件の事例</div>
          {filtered.length===0?<div style={{textAlign:"center",padding:"80px 0",color:"#8a7a6a"}}><div style={{fontSize:48,marginBottom:16,opacity:.3}}>🏠</div><div>条件に合う事例が見つかりません</div></div>
          :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:26}}>
            {filtered.map((c,idx)=>{
              const csi=STYLES_DEF[c.style]||STYLES_DEF["ナチュラル"]; const isFav=favorites.has(c._sbId);
              return(<div key={c._sbId} className="card" onClick={()=>{setSelected(c);setDetailTab("concept");setDetailImgIdx(0);setView("detail");}} style={{background:"white",borderRadius:14,overflow:"hidden",border:"1px solid #e8e2d8",boxShadow:"0 2px 10px rgba(0,0,0,.05)",animation:`fadeUp .35s ease ${idx*.05}s both`}}>
                <div style={{position:"relative"}}>
                  <CaseImage c={c} height={200}/>
                  <div style={{position:"absolute",top:12,left:12,display:"flex",gap:5}}>
                    <span style={{background:csi.accent,color:"white",padding:"3px 11px",borderRadius:20,fontSize:11,fontWeight:700}}>{c.style}</span>
                    {c.buildType&&<span style={{background:"rgba(0,0,0,.5)",color:"white",padding:"3px 10px",borderRadius:20,fontSize:10}}>{c.buildType}</span>}
                  </div>
                  <button onClick={e=>toggleFav(c._sbId,e)} style={{position:"absolute",top:8,right:10,background:"white",border:"none",borderRadius:"50%",width:32,height:32,fontSize:17,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,.12)",color:isFav?"#e05050":"#ccc"}}>{isFav?"♥":"♡"}</button>
                </div>
                <div style={{padding:"18px 20px 20px"}}>
                  <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>{[c.layout,c.floors,c.tsubo?`${c.tsubo}坪`:null,c.direction?c.direction+"向き":null].filter(Boolean).map(t=><span key={t} style={{padding:"3px 9px",background:"#f5f0e8",borderRadius:20,fontSize:10,color:"#6a5a4a"}}>{t}</span>)}</div>
                  <h3 style={{margin:"0 0 3px",fontSize:16,fontWeight:700,lineHeight:1.4}}>{c.title}</h3>
                  <p style={{margin:"0 0 14px",fontSize:12,color:"#7a6a5a",lineHeight:1.6}}>{c.subtitle}</p>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",borderTop:"1px solid #f0ebe0",paddingTop:12}}>
                    <div><div style={{fontSize:10,color:"#a89a8a",marginBottom:1}}>{c.tsubo?"坪数":"延床面積"}</div><div style={{fontWeight:700,fontSize:15}}>{c.tsubo||c.area?.total}<span style={{fontSize:11,color:"#8a7a6a",fontWeight:400}}>{c.tsubo?"坪":"㎡"}</span></div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#a89a8a",marginBottom:1}}>予算目安</div><div style={{fontWeight:700,fontSize:12,color:"#5a4a3a"}}>{c.budget}</div></div>
                    <div style={{background:csi.accent,color:"white",borderRadius:7,padding:"7px 14px",fontSize:12,fontWeight:700}}>詳しく →</div>
                  </div>
                </div>
              </div>);
            })}
          </div>}
        </div>
      )}

      {view==="detail"&&currentCase&&(()=>{
        const c=currentCase; const csi=STYLES_DEF[c.style]||STYLES_DEF["ナチュラル"]; const isFav=favorites.has(c._sbId);
        const f1=(c.rooms||[]).filter(r=>r.floor===1); const f2=(c.rooms||[]).filter(r=>r.floor===2);
        const allImages=[c.image,...(c.images||[])].filter(Boolean);
        let ytId=null;if(c.youtube){const m=c.youtube.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);if(m)ytId=m[1];}
        return(
          <div>
            <div style={{height:360,position:"relative",overflow:"hidden",background:csi.light}}>
              {c.image?<img src={c.image} alt={c.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:480,height:300}}><HouseIllust style={c.style}/></div></div>}
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 30%,rgba(0,0,0,.4))"}}/>
              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"24px 40px"}}>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <span style={{background:csi.accent,color:"white",padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700}}>{c.style}</span>
                  {c.buildType&&<span style={{background:"rgba(255,255,255,.2)",color:"white",padding:"4px 11px",borderRadius:20,fontSize:11}}>{c.buildType}</span>}
                </div>
                <h1 style={{color:"white",margin:"0 0 3px",fontSize:28,fontWeight:700,textShadow:"0 2px 8px rgba(0,0,0,.3)"}}>{c.title}</h1>
                <p style={{color:"rgba(255,255,255,.85)",margin:0,fontSize:14}}>{c.subtitle}</p>
              </div>
              <button onClick={()=>{setView("gallery");setSelected(null);}} style={{position:"absolute",top:18,left:20,background:"rgba(255,255,255,.9)",border:"none",borderRadius:7,padding:"7px 15px",fontSize:12,cursor:"pointer"}}>← 一覧に戻る</button>
              <button onClick={e=>toggleFav(c._sbId,e)} style={{position:"absolute",top:14,right:18,background:"white",border:"none",borderRadius:"50%",width:42,height:42,fontSize:20,cursor:"pointer",boxShadow:"0 2px 10px rgba(0,0,0,.15)",color:isFav?"#e05050":"#ccc"}}>{isFav?"♥":"♡"}</button>
            </div>
            <div style={{background:"#1a1612",padding:"0 40px",display:"flex",overflowX:"auto"}}>
              {[{label:"間取り",value:c.layout},{label:"階数",value:c.floors},{label:"坪数",value:c.tsubo?`${c.tsubo}坪`:"—"},{label:"延床面積",value:`${c.area?.total||"—"}㎡`},{label:"構造",value:c.structure},{label:"予算目安",value:c.budget,gold:true}].map((s,i)=>(
                <div key={s.label} style={{padding:"16px 20px",borderRight:i<5?"1px solid #3a3228":"none",whiteSpace:"nowrap"}}><div style={{fontSize:10,color:"#6a5a4a",letterSpacing:".1em",marginBottom:3}}>{s.label}</div><div style={{fontSize:15,fontWeight:700,color:s.gold?"#c9a96e":"white"}}>{s.value}</div></div>
              ))}
            </div>
            <div style={{background:"white",borderBottom:"1px solid #e8e2d8",padding:"0 40px",display:"flex",position:"sticky",top:60,zIndex:90}}>
              {[["concept","コンセプト"],["rooms","間取り・部屋"],["specs","仕様・設備"],["gallery","写真・動画"]].map(([key,label])=>(
                <button key={key} onClick={()=>setDetailTab(key)} style={{padding:"15px 18px",border:"none",borderBottom:detailTab===key?`3px solid ${csi.accent}`:"3px solid transparent",background:"transparent",color:detailTab===key?csi.accent:"#8a7a6a",fontSize:14,fontWeight:detailTab===key?700:400,cursor:"pointer"}}>{label}</button>
              ))}
            </div>
            <div style={{maxWidth:900,margin:"0 auto",padding:"36px 40px"}}>
              {detailTab==="concept"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:32}}>
                  <div>
                    <div style={{fontSize:10,color:"#a89a8a",letterSpacing:".18em",marginBottom:10}}>CONCEPT</div>
                    <p style={{fontSize:15,lineHeight:2.0,color:"#2a201a",margin:0}}>{c.concept}</p>
                    <div style={{marginTop:22,padding:"18px 22px",background:csi.light,borderRadius:10,borderLeft:`4px solid ${csi.accent}`}}>
                      <div style={{fontSize:10,color:"#a89a8a",marginBottom:8}}>施工地 / 竣工年</div>
                      <div style={{fontWeight:700,fontSize:15}}>{c.location}</div>
                      <div style={{color:"#8a7a6a",fontSize:12,marginTop:3}}>{c.year}年竣工</div>
                    </div>
                    {(c.features||[]).length>0&&<div style={{marginTop:16}}><div style={{fontSize:10,color:"#a89a8a",letterSpacing:".18em",marginBottom:8}}>こだわりポイント</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{(c.features||[]).map(f=><span key={f} style={{padding:"5px 12px",borderRadius:20,fontSize:11,background:csi.light,color:csi.accent,border:`1px solid ${csi.accent}30`,fontWeight:600}}>{f}</span>)}</div></div>}
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#a89a8a",letterSpacing:".18em",marginBottom:10}}>HIGHLIGHTS</div>
                    {(c.highlights||[]).filter(Boolean).map((h,i)=>(
                      <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:14}}>
                        <div style={{width:26,height:26,borderRadius:"50%",background:csi.accent,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
                        <div style={{fontSize:14,lineHeight:1.7,paddingTop:3}}>{h}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detailTab==="rooms"&&(
                <div>
                  <div style={{display:"grid",gridTemplateColumns:f2.length>0?"1fr 1fr":"1fr",gap:24,marginBottom:24}}>
                    {[{label:c.floors==="平屋"?"平屋":c.floors==="半平屋"?"1階（半平屋）":"1階",rooms:f1},...(f2.length>0?[{label:"2階",rooms:f2}]:[])].map(({label,rooms:rl})=>(
                      <div key={label}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><div style={{width:3,height:18,background:csi.accent,borderRadius:2}}/><div style={{fontSize:12,fontWeight:700,color:"#5a4a3a"}}>{label}</div></div>
                        <div style={{borderRadius:10,overflow:"hidden",border:"1px solid #e8e2d8"}}>{rl.map((r,i)=>(<div key={i} style={{padding:"12px 18px",borderBottom:i<rl.length-1?"1px solid #f0ebe0":"none",display:"flex",justifyContent:"space-between",background:i%2===0?"white":"#faf8f5"}}><span style={{fontSize:14,fontWeight:600}}>{r.name}</span><span style={{fontSize:15,fontWeight:700,color:csi.accent}}>{r.area}<span style={{fontSize:11,color:"#8a7a6a",fontWeight:400}}>㎡</span></span></div>))}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{background:"#1a1612",borderRadius:10,padding:"20px 28px",display:"flex",gap:28}}>
                    {[{label:"坪数",value:c.tsubo?`${c.tsubo}坪`:"—"},{label:"延床面積",value:`${c.area?.total||"—"}㎡`},{label:"建築面積",value:`${c.area?.building||"—"}㎡`},{label:"敷地面積",value:`${c.area?.land||"—"}㎡`}].map(s=>(<div key={s.label}><div style={{fontSize:10,color:"#6a5a4a",marginBottom:3}}>{s.label}</div><div style={{fontSize:20,fontWeight:700,color:"#c9a96e"}}>{s.value}</div></div>))}
                  </div>
                </div>
              )}
              {detailTab==="specs"&&(
                <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  {[
                    {title:"キッチン・水回り",items:[["kitchen","キッチン"],["bath","浴室"],["washroom","洗面化粧台"],["toilet","トイレ"]]},
                    {title:"断熱仕様",items:[["floorInsulation","床断熱"],["wallInsulation","壁断熱"],["ceilingInsulation","天井断熱材"]]},
                    {title:"内外装仕様",items:[["outerWall","外壁"],["roof","屋根"],["sash","サッシ"],["floorMaterial","床"]]},
                    {title:"その他仕様",items:[["ventilation","換気システム"],["longLife","長期優良"],["insulationGrade","断熱等級"],["quakeGrade","耐震等級"]]},
                  ].map(section=>(
                    <div key={section.title} style={{borderRadius:10,overflow:"hidden",border:"1px solid #e8e2d8"}}>
                      <div style={{background:csi.light,padding:"12px 18px",fontSize:11,fontWeight:700,color:csi.accent,letterSpacing:".1em"}}>{section.title}</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",background:"white"}}>
                        {section.items.map(([k,l],i)=>(<div key={k} style={{padding:"12px 18px",borderBottom:i<section.items.length-2?"1px solid #f0ebe0":"none",borderRight:i%2===0?"1px solid #f0ebe0":"none"}}><div style={{fontSize:11,color:"#a89a8a",marginBottom:2}}>{l}</div><div style={{fontSize:14,fontWeight:600}}>{c.specs?.[k]||"—"}</div></div>))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {detailTab==="gallery"&&(
                <div>
                  {allImages.length>0?(
                    <>
                      <div style={{borderRadius:12,overflow:"hidden",marginBottom:16,background:csi.light,maxHeight:480}}>
                        <img src={allImages[detailImgIdx]} style={{width:"100%",maxHeight:480,objectFit:"contain",display:"block"}}/>
                      </div>
                      {allImages.length>1&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:24}}>{allImages.map((img,i)=>(<div key={i} onClick={()=>setDetailImgIdx(i)} style={{width:80,height:56,borderRadius:7,overflow:"hidden",cursor:"pointer",border:`2px solid ${detailImgIdx===i?csi.accent:"transparent"}`,opacity:detailImgIdx===i?1:0.7}}><img src={img} style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>))}</div>}
                    </>
                  ):<div style={{textAlign:"center",padding:"40px",color:"#a89a8a",fontSize:13}}>画像が登録されていません</div>}
                  {ytId&&<div style={{marginTop:16}}><div style={{fontSize:10,color:"#a89a8a",letterSpacing:".18em",marginBottom:12}}>YOUTUBE</div><div style={{position:"relative",paddingBottom:"56.25%",height:0,borderRadius:12,overflow:"hidden"}}><iframe src={`https://www.youtube.com/embed/${ytId}`} title="YouTube" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{position:"absolute",top:0,left:0,width:"100%",height:"100%"}}/></div></div>}
                  {!ytId&&c.youtube&&<div style={{padding:"12px 16px",background:"#f5f0e8",borderRadius:8,fontSize:12,color:"#8a7a6a",marginTop:12}}>動画: <a href={c.youtube} target="_blank" rel="noreferrer" style={{color:csi.accent}}>{c.youtube}</a></div>}
                </div>
              )}
            </div>
            <div style={{background:"#f5f0e8",padding:"32px 40px"}}>
              <div style={{maxWidth:900,margin:"0 auto"}}>
                <div style={{fontSize:10,color:"#a89a8a",letterSpacing:".18em",marginBottom:18}}>他の施工事例</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
                  {cases.filter(x=>x._sbId!==c._sbId).slice(0,3).map(rc=>{const rsi=STYLES_DEF[rc.style]||STYLES_DEF["ナチュラル"];return(<div key={rc._sbId} className="card" onClick={()=>{setSelected(rc);setDetailTab("concept");setDetailImgIdx(0);setView("detail");window.scrollTo(0,0);}} style={{background:"white",borderRadius:10,overflow:"hidden",border:"1px solid #e8e2d8"}}><div style={{position:"relative"}}><CaseImage c={rc} height={110}/><div style={{position:"absolute",top:7,left:7,background:rsi.accent,color:"white",padding:"2px 9px",borderRadius:20,fontSize:9,fontWeight:700}}>{rc.style}</div></div><div style={{padding:"12px 14px"}}><div style={{fontWeight:700,fontSize:12,marginBottom:2}}>{rc.title}</div><div style={{fontSize:10,color:"#8a7a6a"}}>{rc.layout} / {rc.tsubo?`${rc.tsubo}坪`:rc.area?.total+"㎡"}</div></div></div>);})}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
