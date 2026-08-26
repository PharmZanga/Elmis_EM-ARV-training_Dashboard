import { dashboardData } from "./dashboardData.js";

const { participants = [], reportingRows = [] } = dashboardData;

const css = `
.training-detail-overlay{position:fixed;inset:0;z-index:9999;background:#f4f7f5;overflow:auto;color:#063f33;font-family:inherit}
.training-detail-shell{max-width:1500px;margin:0 auto;padding:22px 26px 36px}
.training-detail-top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:18px}
.training-detail-back,.training-detail-export{border:1px solid #cbd9d3;background:#fff;border-radius:8px;padding:10px 14px;font-weight:800;cursor:pointer;color:#063f33}
.training-detail-export{background:#078348;color:#fff;border-color:#078348}
.training-detail-actions{display:flex;gap:10px;flex-wrap:wrap}
.training-detail-title{margin:12px 0 4px;font-size:28px;line-height:1.15}.training-detail-sub{margin:0;color:#64736d}
.training-detail-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:18px 0}
.training-detail-kpi{background:#fff;border:1px solid #dce6e1;border-radius:10px;padding:17px 18px;box-shadow:0 8px 20px rgba(18,55,43,.05);border-top:3px solid #0b8750}
.training-detail-kpi span{display:block;font-size:12px;font-weight:900;color:#5d6d67;text-transform:uppercase;letter-spacing:.03em}.training-detail-kpi strong{display:block;font-size:30px;margin-top:8px;color:#063f33}.training-detail-kpi small{display:block;margin-top:4px;color:#6a7973}
.training-detail-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:14px;margin:14px 0}.training-detail-card{background:#fff;border:1px solid #dce6e1;border-radius:10px;padding:16px;box-shadow:0 8px 20px rgba(18,55,43,.04)}
.training-detail-card h3{margin:0 0 13px;font-size:16px}.training-detail-table-wrap{overflow:auto;max-height:430px}.training-detail-table{width:100%;border-collapse:collapse;font-size:13px}.training-detail-table th{position:sticky;top:0;background:#f3f7f5;text-align:left;padding:10px;border-bottom:1px solid #dce6e1;white-space:nowrap}.training-detail-table td{padding:9px 10px;border-bottom:1px solid #edf1ef;vertical-align:top}.training-detail-table tfoot td{font-weight:900;background:#f7faf8}
.training-detail-donut-row{display:flex;align-items:center;justify-content:center;gap:26px;min-height:240px}.training-detail-donut{width:160px;height:160px;border-radius:50%;position:relative}.training-detail-donut:after{content:'';position:absolute;inset:32px;border-radius:50%;background:#fff}.training-detail-legend{display:grid;gap:10px}.training-detail-legend span{display:flex;align-items:center;gap:8px;color:#4c5c56}.training-detail-dot{width:10px;height:10px;border-radius:50%;display:inline-block}
.training-detail-bars{display:flex;align-items:flex-end;gap:12px;height:220px;padding:18px 8px 28px;border-bottom:1px solid #dde6e2}.training-detail-bar{flex:1;min-width:28px;text-align:center;position:relative;height:100%;display:flex;align-items:flex-end}.training-detail-bar i{display:block;width:100%;background:#39a86d;border-radius:5px 5px 0 0;min-height:3px}.training-detail-bar span{position:absolute;bottom:-24px;left:50%;transform:translateX(-50%);font-size:11px;color:#65746e;white-space:nowrap}.training-detail-bar b{position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:11px;color:#164b3c}
.training-detail-empty{padding:40px;text-align:center;color:#6b7974}
body.training-detail-open{overflow:hidden}.kpi-grid .kpi,.province-card{cursor:pointer}.kpi-grid .kpi:hover,.province-card:hover{box-shadow:0 10px 26px rgba(7,106,66,.12);transform:translateY(-2px);transition:.15s ease}
@media(max-width:900px){.training-detail-kpis{grid-template-columns:repeat(2,1fr)}.training-detail-grid{grid-template-columns:1fr}.training-detail-shell{padding:16px}}
@media print{body>*:not(.training-detail-overlay){display:none!important}.training-detail-overlay{position:static}.training-detail-back,.training-detail-export{display:none!important}.training-detail-table-wrap{max-height:none;overflow:visible}}
`;

function ensureStyles(){
  if(document.getElementById("training-interaction-styles")) return;
  const style=document.createElement("style");
  style.id="training-interaction-styles";
  style.textContent=css;
  document.head.appendChild(style);
}

function activePageIsTrainings(){
  const active=[...document.querySelectorAll(".side-menu button.active")][0];
  return active && active.textContent.replace(/\s+/g," ").trim().endsWith("Trainings");
}

function currentFilter(label){
  const cards=[...document.querySelectorAll(".filter-card")];
  const card=cards.find(el=>el.querySelector("label")?.textContent.trim()===label);
  return card?.querySelector("select")?.value || "All";
}

function csvEscape(value){
  const s=String(value ?? "");
  return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
}
function downloadCsv(title,rows){
  if(!rows.length) return;
  const headers=Object.keys(rows[0]);
  const csv=[headers.map(csvEscape).join(","),...rows.map(r=>headers.map(h=>csvEscape(r[h])).join(","))].join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=`${title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}.csv`;a.click();URL.revokeObjectURL(a.href);
}

function roleRows(role){ return participants.filter(p=>!role || p.role===role); }
function districtRows(rows){
  const map=new Map();
  rows.forEach(p=>{
    const key=`${p.province||"Unknown"}|${p.district||"Unknown"}`;
    if(!map.has(key)) map.set(key,{Province:p.province||"",District:p.district||"",Trained:0,Experts:0,Superusers:0,Users:0});
    const r=map.get(key);r.Trained++;if(p.role==="Expert")r.Experts++;if(p.role==="Superuser")r.Superusers++;if(p.role==="User")r.Users++;
  });
  return [...map.values()].sort((a,b)=>a.Province.localeCompare(b.Province)||a.District.localeCompare(b.District));
}
function provinceSummary(rows){
  const map=new Map();
  rows.forEach(p=>{
    const province=p.province||"Unknown";
    if(!map.has(province))map.set(province,{Province:province,Experts:0,Superusers:0,Users:0,"Total Trained":0,"Districts Covered":new Set()});
    const r=map.get(province);r["Total Trained"]++;if(p.role==="Expert")r.Experts++;if(p.role==="Superuser")r.Superusers++;if(p.role==="User")r.Users++;if(p.district)r["Districts Covered"].add(p.district);
  });
  return [...map.values()].map(r=>({...r,"Districts Covered":r["Districts Covered"].size})).sort((a,b)=>b["Total Trained"]-a["Total Trained"]);
}
function personExport(rows){return rows.map(p=>({Province:p.province||"",District:p.district||"",Facility:p.facility||"","First Name":p.firstName||"","Last Name":p.lastName||"",Profession:p.profession||"",Role:p.role||"",Phone:p.phone||""}));}

function tableHtml(rows,totalLabel){
  if(!rows.length)return '<div class="training-detail-empty">No records available for this selection.</div>';
  const headers=Object.keys(rows[0]);
  const head=headers.map(h=>`<th>${h}</th>`).join("");
  const body=rows.map(r=>`<tr>${headers.map(h=>`<td>${r[h]??""}</td>`).join("")}</tr>`).join("");
  return `<div class="training-detail-table-wrap"><table class="training-detail-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${totalLabel?`<tfoot><tr><td colspan="${headers.length}">${totalLabel}</td></tr></tfoot>`:""}</table></div>`;
}
function barHtml(rows){
  const max=Math.max(...rows.map(r=>r["Total Trained"]||r.Trained||0),1);
  return `<div class="training-detail-bars">${rows.slice(0,10).map(r=>{const v=r["Total Trained"]||r.Trained||0;const lab=r.Province||r.District;return `<div class="training-detail-bar"><i style="height:${Math.max(3,(v/max)*100)}%"></i><b>${v}</b><span>${lab}</span></div>`}).join("")}</div>`;
}
function donutHtml(experts,superusers,users){
  const total=Math.max(experts+superusers+users,1);const a=experts/total*100,b=superusers/total*100;
  const bg=`conic-gradient(#23669a 0 ${a}%,#52ae7b ${a}% ${a+b}%,#70c493 ${a+b}% 100%)`;
  return `<div class="training-detail-donut-row"><div class="training-detail-donut" style="background:${bg}"></div><div class="training-detail-legend"><span><i class="training-detail-dot" style="background:#23669a"></i>Experts <b>${experts}</b></span><span><i class="training-detail-dot" style="background:#52ae7b"></i>Superusers <b>${superusers}</b></span><span><i class="training-detail-dot" style="background:#70c493"></i>Users <b>${users}</b></span></div></div>`;
}

function openTrainingDetail(kind,province){
  ensureStyles();
  let rows=participants;
  let title="Total Trained — Details";
  if(kind==="Experts Trained"){rows=roleRows("Expert");title="Experts Trained — Details";}
  else if(kind==="Superusers Trained"){rows=roleRows("Superuser");title="Superusers Trained — Details";}
  else if(kind==="Users Trained"){rows=roleRows("User");title="Users Trained — Details";}
  else if(kind==="Training Districts"){title="Training Districts — Details";}
  if(province){rows=participants.filter(p=>p.province===province);title=`${province} Province — Details`;}

  const experts=rows.filter(p=>p.role==="Expert").length;
  const superusers=rows.filter(p=>p.role==="Superuser").length;
  const users=rows.filter(p=>p.role==="User").length;
  const districts=new Set(rows.map(p=>p.district).filter(Boolean)).size;
  const provinceRows=provinceSummary(rows);
  const districtsData=districtRows(rows);
  const exportRows=kind==="Training Districts"&&!province?districtsData:personExport(rows);

  let reportingRate=null,reportsReceived=null,reportsExpected=null;
  if(province){
    const card=[...document.querySelectorAll(".province-card")].find(c=>c.querySelector("b")?.textContent.trim()===province);
    if(card){
      reportingRate=card.querySelector("strong")?.textContent.trim()||null;
      const text=card.querySelector("small")?.textContent||"";const m=text.match(/([\d,]+)\s+of\s+([\d,]+)/i);if(m){reportsReceived=m[1];reportsExpected=m[2];}
    }
  }

  const kpis=province?[
    ["Trained",rows.length,"People trained"],["Reporting Rate",reportingRate||"—","Overall performance"],["Reports Received",reportsReceived||"—",reportsExpected?`Of ${reportsExpected} expected`:"Selected period"],["Districts Covered",districts,"Districts"]
  ]:[
    ["Total Trained",rows.length,"All categories"],["Experts Trained",experts,"eLMIS experts"],["Superusers Trained",superusers,"District superusers"],["Users Trained",users,"Facility users"]
  ];

  const overlay=document.createElement("section");overlay.className="training-detail-overlay";
  overlay.innerHTML=`<div class="training-detail-shell"><div class="training-detail-top"><div><button class="training-detail-back">← Back to Trainings</button><h1 class="training-detail-title">${title}</h1><p class="training-detail-sub">${province?"Training and reporting performance overview":"Detailed breakdown of training categories"}</p></div><div class="training-detail-actions"><button class="training-detail-export csv">⇩ Export CSV</button><button class="training-detail-export pdf">Export PDF</button></div></div><div class="training-detail-kpis">${kpis.map(k=>`<div class="training-detail-kpi"><span>${k[0]}</span><strong>${k[1]}</strong><small>${k[2]}</small></div>`).join("")}</div><div class="training-detail-grid"><div class="training-detail-card"><h3>${province?"Training by District":"Training by Province"}</h3>${barHtml(province?districtsData:provinceRows)}</div><div class="training-detail-card"><h3>Training by Category</h3>${donutHtml(experts,superusers,users)}</div></div><div class="training-detail-card"><h3>${province?"District Training Summary":"Training Summary by Province"}</h3>${tableHtml(province?districtsData:provinceRows)}</div><div class="training-detail-card" style="margin-top:14px"><h3>Training Personnel</h3>${tableHtml(personExport(rows))}</div></div>`;
  document.body.appendChild(overlay);document.body.classList.add("training-detail-open");
  overlay.querySelector(".training-detail-back").onclick=()=>{overlay.remove();document.body.classList.remove("training-detail-open");};
  overlay.querySelector(".csv").onclick=()=>downloadCsv(title,exportRows);
  overlay.querySelector(".pdf").onclick=()=>window.print();
}

document.addEventListener("click",event=>{
  if(!activePageIsTrainings())return;
  const kpi=event.target.closest(".kpi-grid .kpi");
  if(kpi){const label=kpi.querySelector(".kpi-label-row span")?.textContent.trim();if(["Total Trained","Experts Trained","Superusers Trained","Users Trained","Training Districts"].includes(label)){event.preventDefault();event.stopPropagation();openTrainingDetail(label);return;}}
  const card=event.target.closest(".province-card");
  if(card){const province=card.querySelector("b")?.textContent.trim();if(province){event.preventDefault();event.stopPropagation();openTrainingDetail("Province",province);}}
},true);

ensureStyles();
