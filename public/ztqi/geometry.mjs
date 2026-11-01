// Coordinates in millimetres on a 210 × 297 mm A4 answer card.
export const FIDUCIALS=[[12,12],[198,12],[198,285],[12,285]];
function solve(matrix,vector){
 const n=vector.length,a=matrix.map((row,i)=>[...row,vector[i]]);
 for(let i=0;i<n;i++){
  let p=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[p][i]))p=j;
  if(Math.abs(a[p][i])<1e-12)throw Error("定位点无法形成有效透视映射");
  [a[i],a[p]]=[a[p],a[i]];const d=a[i][i];
  for(let k=i;k<=n;k++)a[i][k]/=d;
  for(let j=0;j<n;j++)if(j!==i){const c=a[j][i];for(let k=i;k<=n;k++)a[j][k]-=c*a[i][k]}
 }
 return a.map(x=>x[n]);
}
export function homography(src,dst){
 if(src.length!==4||dst.length!==4)throw Error("需要恰好四个定位点");
 const m=[],v=[];
 for(let i=0;i<4;i++){
  const [x,y]=src[i],[u,w]=dst[i];
  m.push([x,y,1,0,0,0,-u*x,-u*y]);v.push(u);
  m.push([0,0,0,x,y,1,-w*x,-w*y]);v.push(w);
 }
 return [...solve(m,v),1];
}
export function project(h,x,y){
 const w=h[6]*x+h[7]*y+1;return [(h[0]*x+h[1]*y+h[2])/w,(h[3]*x+h[4]*y+h[5])/w];
}
function shade(im,x,y){
 const xx=Math.round(x),yy=Math.round(y);if(xx<0||yy<0||xx>=im.width||yy>=im.height)return null;
 const i=(yy*im.width+xx)*4,px=im.data;
 return 1-(.299*px[i]+.587*px[i+1]+.114*px[i+2])/255;
}
function sampleCircle(image,h,x,y){
 let sum=0,n=0;
 for(const [dx,dy] of [[0,0],[.55,0],[-.55,0],[0,.55],[0,-.55],[.5,.5],[-.5,.5],[.5,-.5],[-.5,-.5]]){
  const p=project(h,x+dx,y+dy),s=shade(image,p[0],p[1]);if(s!==null){sum+=s;n++}
 }
 return n?sum/n:0;
}
export function recognize(image,h,threshold=.24){
 const out=[];
 for(let j=0;j<72;j++){
  const y=50+6.3*(j%36),x=(j<36?41:134);
  const levels=[1,2,3,4,5].map(v=>sampleCircle(image,h,x+8*(v-1),y));
  const ranked=levels.map((value,index)=>({index,value})).sort((a,b)=>b.value-a.value);
  const high=ranked[0],second=ranked[1];
  let value=null,reason="空选或填涂太浅";
  if(high.value>=threshold){
   value=high.index+1;reason="";
   if(second.value>=threshold*.88){value=null;reason="疑似多选，需人工核对"}
   else if(high.value-second.value<.12){value=null;reason="低置信度，需人工核对"}
  }
  out.push({number:j+1,value,reason,levels});
 }
 return out;
}
