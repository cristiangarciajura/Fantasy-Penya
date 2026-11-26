// Pure merge for a validated batch. Existing team results are replaced, not added.
export function mergeBatch(previous,batch){
 if(!batch?.canPublish||!Array.isArray(batch.ready)||!batch.ready.length||batch.issues?.length)throw Error('Lote no validado');
 const scores={...previous?.scores},results={...previous?.results};
 const teams=new Set(),ids=new Set();
 for(const item of batch.ready){
  if(!item.team||!item.matchId||teams.has(item.team)||ids.has(item.matchId))throw Error('Partido duplicado o inválido');
  teams.add(item.team);ids.add(item.matchId);
  if(!item.record||!item.scores||Object.values(item.scores).some(v=>!Number.isInteger(v)||Math.abs(v)>1000))throw Error('Puntuación inválida');
  if(Object.entries(results).some(([team,record])=>team!==item.team&&record?.matchId===item.matchId))throw Error('El partido ya está asociado a otra categoría');
  const old=results[item.team];
  if(old?.matchId&&old.matchId!==item.matchId)throw Error('La categoría ya tiene otro partido en esta jornada');
  for(const id of old?.scoreIds||[])delete scores[id];
  for(const [id,value] of Object.entries(item.scores))scores[id]=value;
  results[item.team]={...item.record,matchId:item.matchId,scoreIds:Object.keys(item.scores)};
 }
 return {scores,results};
}

function canonical(v){
 if(Array.isArray(v))return v.map(canonical);
 if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));
 return v;
}
export function reviewBatch(previous,batch){
 const next=mergeBatch(previous,batch);
 const items=batch.ready.map(item=>{
  const old=previous?.results?.[item.team],fresh=next.results[item.team];
  const same=old&&JSON.stringify(canonical(old))===JSON.stringify(canonical(fresh))&&Object.entries(item.scores).every(([id,n])=>previous?.scores?.[id]===n);
  return {team:item.team,matchId:item.matchId,status:!old?'new':same?'unchanged':'corrected'};
 });
 return {items,newCount:items.filter(x=>x.status==='new').length,unchangedCount:items.filter(x=>x.status==='unchanged').length,correctedCount:items.filter(x=>x.status==='corrected').length,next};
}
