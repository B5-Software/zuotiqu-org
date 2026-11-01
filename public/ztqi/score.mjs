export function scoreResponse(schema,answers){
 const scores={},missing=[],attention=[];
 for(const [dim] of Object.entries(schema.weights)){
  const items=schema.items.filter(x=>x.scored&&x.dimension===dim);
  const vals=[];
  for(const q of items){
   const v=answers[q.number];
   if(!Number.isInteger(v)||v<1||v>5){missing.push(q.number);continue}
   vals.push(q.reverse?6-v:v);
  }
  scores[dim]=vals.length===items.length?25*(vals.reduce((a,b)=>a+b,0)/items.length-1):null;
 }
 for(const q of schema.items.filter(x=>x.control_type==="attention")){
  const v=answers[q.number];attention.push({number:q.number,valid:!Number.isInteger(v)?null:v===q.expected})
 }
 const complete=missing.length===0;
 const total=complete?Object.entries(schema.weights).reduce((s,[d,w])=>s+w*scores[d],0):null;
 return {scores,total,complete,missing,attention};
}
