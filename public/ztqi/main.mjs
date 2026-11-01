import {scoreResponse} from "./score.mjs";
import {FIDUCIALS,homography,recognize} from "./geometry.mjs";
const schema=await fetch("./questions.json").then(r=>{if(!r.ok)throw Error("无法加载题库");return r.json()});
const $=s=>document.querySelector(s), root=$("#app");
const choices=Object.entries(schema.likert).map(([v,label])=>({v:Number(v),label}));
const s={view:"home",page:0,answers:{},result:false,records:[],image:null,markers:[],scan:[]};
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function btn(label,id,variant="primary"){return '<button type="button" class="btn '+variant+'" id="'+id+'">'+label+'</button>'}
function notice(){return '<div class="notice">ZTQI-72 是未经验证的研究试验量表。结果不是心理诊断、不代表人的价值，也不能用于同伴排名、奖惩或贴标签。答题记录和扫描图片仅在当前页面内存处理，不上传服务器；关闭或刷新页面后会清除。</div>'}
function go(view){s.view=view;document.querySelectorAll("nav [data-screen]").forEach(b=>b.classList.toggle("on",b.dataset.screen===view));paint();window.scrollTo(0,0)}
document.querySelectorAll("nav [data-screen]").forEach(b=>b.onclick=()=>go(b.dataset.screen));
function mount(html){root.innerHTML=html}
function home(){
 mount('<section class="hero"><div class="eyebrow">MEASUREMENT RESEARCH · PILOT 0.2.1</div><h1><strong>！？区区？！</strong><br>做题区！！</h1><p class="lead">ZTQI-72 测量个体将学业表现泛化为个人价值、等级判断、人际回报资格和非应试领域价值的倾向。60 道计分题、12 道辅助题，不把刷题多或成绩好直接视为问题。</p><div class="actions">'+btn("开始在线答题","start")+btn("识别纸质答题卡","openOMR","secondary")+'</div>'+notice()+'</section><section class="grid"><div class="tile"><strong class="big">72</strong><h3>研究题项</h3><p>五维各12个正式条目，另有12道不计分题</p></div><div class="tile"><strong class="big">0–100</strong><h3>线性计分</h3><p>五维指数；目前没有验证过的人群常模</p></div><div class="tile"><strong class="big">Local</strong><h3>本地隐私</h3><p>在线评分、OMR照片识别与CSV导出都在本机</p></div></section>');
 $("#start").onclick=()=>{s.page=0;s.result=false;go("survey")};$("#openOMR").onclick=()=>go("omr");
}
function progress(){return schema.items.filter(q=>Number.isInteger(s.answers[q.number])).length}
function survey(){
 if(s.result){showResult();return}
 const start=s.page*8,part=schema.items.slice(start,start+8),count=progress();
 const lines=part.map(q=>'<section class="question"><div class="num">第 '+String(q.number).padStart(2,"0")+' 题</div><p>'+escapeHtml(q.text)+'</p><div class="choices" role="group" aria-label="第 '+q.number+' 题">'+choices.map(c=>'<button type="button" data-q="'+q.number+'" data-v="'+c.v+'" aria-pressed="'+(s.answers[q.number]===c.v)+'"><b>'+c.v+'</b><span>'+escapeHtml(c.label)+'</span></button>').join("")+'</div></section>').join("");
 mount('<section class="panel"><div class="eyebrow">ONLINE QUESTIONNAIRE / 72 ITEMS</div><h2>在线自评 · 第 '+(s.page+1)+' / 9 页</h2><p class="muted small"><span id="count">'+count+'</span> / 72 已答 · 不收集姓名 · 可返回修改</p><div class="progress"><b id="progress" style="width:'+(count/72*100)+'%"></b></div>'+lines+'<div class="toolbar">'+btn("← 上一页","prev","secondary")+btn(s.page===8?"计算研究性结果 →":"下一页 →","next")+'</div><p id="missing" class="small" style="color:#b05a54"></p></section>');
 $("#prev").disabled=s.page===0;$("#prev").onclick=()=>{s.page--;paint();window.scrollTo(0,0)};
 $("#next").onclick=()=>{if(s.page<8){s.page++;paint();window.scrollTo(0,0);return}
  const missing=schema.items.filter(q=>!Number.isInteger(s.answers[q.number]));
  if(missing.length){$("#missing").textContent="还有 "+missing.length+" 道题未作答（如："+missing.slice(0,12).map(q=>q.number).join("、")+"），请返回补答。";return}
  s.result=true;paint();window.scrollTo(0,0)};
 document.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>{
  const q=Number(b.dataset.q),v=Number(b.dataset.v);s.answers[q]=v;
  b.parentNode.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
  $("#count").textContent=progress();$("#progress").style.width=(progress()/72*100)+"%";
 });
}
function fmt(v){return v===null||v===undefined?"—":v.toFixed(1)}
function bars(sc){return Object.entries(schema.dimensions).map(([dim,name])=>'<div class="barline"><span>'+dim+' · '+escapeHtml(name)+'</span><div class="track"><b style="width:'+(sc[dim]??0)+'%"></b></div><strong>'+fmt(sc[dim])+'</strong></div>').join("")}
function report(r){const t=scoreResponse(schema,r);return '<div class="kpi">'+fmt(t.total)+' <small>/100</small></div>'+bars(t.scores)+'<p class="muted small">加权分数是尚未验证的先验假设：A 20%、B 30%、C 25%、D 15%、E 10%。注意力检查：'+t.attention.map(a=>a.valid===null?"未填写":a.valid?"通过":"请复核").join(" / ")+'。</p>'+notice()}
function saveBlob(file,body,mime="application/json"){const url=URL.createObjectURL(new Blob([body],{type:mime}));const a=document.createElement("a");a.href=url;a.download=file;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function showResult(){
 mount('<section class="panel"><div class="eyebrow">EXPLORATORY · NON-DIAGNOSTIC</div><h2>ZTQI 五维画像</h2><p class="muted">这不是“人格好坏”或“做题区资格”的确定性判断，不可推断他人的真实意图。</p>'+report(s.answers)+'<div class="actions">'+btn("导出个人 JSON","download")+btn("重新填写","again","secondary")+'</div></section>');
 $("#download").onclick=()=>saveBlob("ztqi-self.json",JSON.stringify({schema:schema.version,answers:s.answers,result:scoreResponse(schema,s.answers)},null,2));$("#again").onclick=()=>{s.answers={};s.page=0;s.result=false;paint()};
}
function omr(){
 mount('<section class="panel"><div class="eyebrow">OMR / ON-DEVICE IMAGE ANALYSIS</div><h2>2B 铅笔答题卡识别</h2><p class="muted">打印时必须选择 A4、原始比例 100%。上传照片后依次点击四个黑色定位块的中心：左上、右上、右下、左下。识别结果仅供人工复核。</p><div class="scanlayout"><div><input id="photo" type="file" accept="image/*" aria-label="选择答题卡扫描图片"><canvas id="scanCanvas" width="650" height="840"></canvas></div><aside><p id="calibrate">尚未选择图片</p><div class="actions">'+btn("重新标定","retry","secondary")+btn("识别 72 题","recognize")+'</div><label class="small">填涂阈值 <output id="tval">0.24</output><input type="range" id="threshold" min="0.12" max="0.60" step="0.01" value="0.24"></label><div id="review"></div></aside></div>'+notice()+'</section>');
 $("#recognize").disabled=true;$("#threshold").oninput=e=>$("#tval").textContent=e.target.value;
 $("#photo").onchange=async e=>{
  const f=e.target.files?.[0];if(!f)return;const url=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{
   URL.revokeObjectURL(url);const can=$("#scanCanvas"),ctx=can.getContext("2d",{willReadFrequently:true}),scale=Math.min(1,1850/Math.max(im.width,im.height));
   can.width=Math.max(1,Math.floor(im.width*scale));can.height=Math.max(1,Math.floor(im.height*scale));ctx.drawImage(im,0,0,can.width,can.height);
   s.image=ctx.getImageData(0,0,can.width,can.height);s.markers=[];s.scan=[];$("#recognize").disabled=true;$("#review").innerHTML="";drawMarkers();$("#calibrate").textContent="请点击第1/4个定位块：左上";
  };im.onerror=()=>alert("图片无法读取");im.src=url;
 };
 $("#retry").onclick=()=>{s.markers=[];s.scan=[];drawMarkers();$("#recognize").disabled=true;$("#review").innerHTML="";$("#calibrate").textContent="请从左上重新标定"};
 $("#scanCanvas").onclick=e=>{
  if(!s.image||s.markers.length===4)return;const r=e.currentTarget.getBoundingClientRect();
  s.markers.push([(e.clientX-r.left)/r.width*e.currentTarget.width,(e.clientY-r.top)/r.height*e.currentTarget.height]);
  drawMarkers();$("#calibrate").textContent=s.markers.length===4?"已完成四角标定；请点识别并人工检查每一项":"请点第"+(s.markers.length+1)+"/4个定位块："+["左上","右上","右下","左下"][s.markers.length];$("#recognize").disabled=s.markers.length!==4;
 };
 $("#recognize").onclick=()=>{
  try{s.scan=recognize(s.image,homography(FIDUCIALS,s.markers),Number($("#threshold").value));showReview()}catch(err){alert("识别失败："+err.message)}
 };
}
function drawMarkers(){if(!s.image)return;const c=$("#scanCanvas"),ctx=c.getContext("2d");ctx.putImageData(s.image,0,0);s.markers.forEach(([x,y],i)=>{ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.strokeStyle="#d33b91";ctx.lineWidth=3;ctx.stroke();ctx.fillStyle="#d33b91";ctx.font="bold 18px sans-serif";ctx.fillText(String(i+1),x+12,y+2)})}
function showReview(){
 const warnings=s.scan.filter(q=>q.reason).length;
 $("#review").innerHTML='<h3 style="margin-top:20px">识别结果 · '+warnings+' 项需复核</h3><div class="notice">自动识别可能因阴影、错位、涂改或印刷缩放而失败。请逐项确认，不确定答案可留空，不得随意猜选。</div><div class="review">'+s.scan.map(q=>'<label class="review-row '+(q.reason?'warning':'')+'"><b>'+String(q.number).padStart(2,"0")+'</b><select data-check="'+q.number+'"><option value="">未识别/空选</option>'+choices.map(c=>'<option value="'+c.v+'" '+(q.value===c.v?'selected':'')+'>'+c.v+'</option>').join("")+'</select><span>'+escapeHtml(q.reason||"请人工检查")+'</span></label>').join("")+'</div><label class="small" style="display:block;margin-top:13px"><input type="checkbox" id="reviewed"> 我已检查全部题号与不确定项</label><div class="actions">'+btn("加入本地分析","saveScan")+btn("打开批量分析","openAnalysis","secondary")+'</div><p id="scanStatus" class="muted small"></p>';
 $("#saveScan").onclick=()=>{if(!$("#reviewed").checked){$("#scanStatus").textContent="请先逐项复核，并勾选确认。";return}const answer={};document.querySelectorAll("[data-check]").forEach(t=>{if(t.value)answer[t.dataset.check]=Number(t.value)});s.records.push({answers:answer,source:"omr_reviewed"});$("#scanStatus").textContent="已加入当前内存，共 "+s.records.length+" 份。刷新网页后将清空。"};
 $("#openAnalysis").onclick=()=>go("analysis");
}
function analysis(){
 const summaries=s.records.map((r,i)=>({i:i+1,res:scoreResponse(schema,r.answers)})),valid=summaries.filter(r=>r.res.complete);
 mount('<section class="panel"><div class="eyebrow">LOCAL ANALYTICS / NO SERVER STORAGE</div><h2>批量分析</h2><p class="muted">本地共有 '+s.records.length+' 份记录，其中 '+valid.length+' 份可完整计分。导出记录可能包含敏感观点，请勿公开与个人关联的答题数据。</p><div class="actions">'+btn("导出 CSV","exportCSV")+btn("导出 JSON","exportJSON","secondary")+btn("清空记录","clear","secondary")+'</div><p><label class="small">导入本站导出的 JSON：<input type="file" id="importJSON" accept=".json,application/json"></label></p><div class="tableWrap"><table><thead><tr><th>本地序号</th><th>完整</th><th>总分</th>'+Object.keys(schema.weights).map(d=>'<th>'+d+'</th>').join("")+'<th>缺失</th></tr></thead><tbody>'+summaries.map(r=>'<tr><td>'+r.i+'</td><td>'+(r.res.complete?"是":"否")+'</td><td>'+fmt(r.res.total)+'</td>'+Object.keys(schema.weights).map(d=>'<td>'+fmt(r.res.scores[d])+'</td>').join("")+'<td>'+r.res.missing.length+'</td></tr>').join("")+'</tbody></table></div>'+notice()+'</section>');
 $("#exportJSON").onclick=()=>saveBlob("ztqi-batch.json",JSON.stringify({schema:schema.version,records:s.records},null,2));
 $("#exportCSV").onclick=()=>{
  const head=["local_id","version","total","complete","A","B","C","D","E",...schema.items.map(q=>"Q"+q.number)],rows=s.records.map((r,i)=>{
   const t=scoreResponse(schema,r.answers);return [i+1,schema.version,fmt(t.total),t.complete,...Object.keys(schema.weights).map(k=>fmt(t.scores[k])),...schema.items.map(q=>r.answers[q.number]??"")]
  });const csv="\ufeff"+[head,...rows].map(line=>line.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\r\n");saveBlob("ztqi-batch.csv",csv,"text/csv;charset=utf-8");
 };
 $("#clear").onclick=()=>{if(confirm("清空当前页面所有本地扫描与分析记录？")){s.records=[];paint()}};
 $("#importJSON").onchange=async e=>{try{
  const raw=JSON.parse(await e.target.files[0].text());if(raw.schema&&raw.schema!==schema.version)throw Error("版本不同，请使用相同题库");
  const arr=Array.isArray(raw)?raw:(Array.isArray(raw.records)?raw.records:[raw]);let n=0;
  for(const record of arr){if(!record||typeof record.answers!=="object")continue;const a={};for(const q of schema.items){const v=record.answers[q.number];if(Number.isInteger(v)&&v>=1&&v<=5)a[q.number]=v}s.records.push({answers:a,source:"json_import"});n++}
  alert("成功导入 "+n+" 份");paint();
 }catch(err){alert("导入失败："+err.message)}};
}
function files(){
 const assets=[["研究方案 · PDF","ztqi_research.pdf"],["纸质问卷 · PDF","ztqi_questionnaire.pdf"],["A4 2B 答题卡 · PDF","ztqi_answer_card.pdf"],["研究方案 · XeLaTeX","ztqi_research.tex"],["问卷 · XeLaTeX","ztqi_questionnaire.tex"],["答题卡 · XeLaTeX","ztqi_answer_card.tex"],["题库 JSON","questions.json"]];
 mount('<section class="panel"><div class="eyebrow">DOCUMENTS / PRINT-READY</div><h2>问卷、答题卡与方法文档</h2><p>纸质答题卡请用 A4 100% 原尺寸打印，关闭“适应纸张”缩放。填写时用 2B 铅笔涂满选项中心。</p><div class="downloads">'+assets.map(([label,path])=>'<a href="./'+path+'" download>↓ '+escapeHtml(label)+'<small>'+escapeHtml(path)+'</small></a>').join("")+'</div>'+notice()+'</section>');
}
function paint(){if(s.view==="home")home();else if(s.view==="survey")survey();else if(s.view==="omr")omr();else if(s.view==="analysis")analysis();else files()}
paint();
