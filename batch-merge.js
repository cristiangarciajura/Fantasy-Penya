// Pure merge for a validated batch. Existing team results are replaced, not added.
export function mergeBatch(previous,batch){
 if(!batch?.canPublish||!Array.isArray(batch.ready)||!batch.ready.length||batch.issues?.length)throw Error('Lote no validado');
 const scores={...previous?.scores},results={...previous?.results};
 const teams=new Set(),ids=new Set();
 for(const item of batch.ready){
  if(!item.team||!item.matchId||teams.has(item.team)||ids.has(item.matchId))throw Error('Partido duplicado o inválido');
  teams.add(item.team);ids.add(item.matchId);
  if(!item.record||!item.scores||Object.values(item.scores).some(v=>!Number.isInteger(v)||Math.abs(v)>1000))throw Error('Puntuación inválida');
  const old=results[item.team];
  if(old?.matchId&&old.matchId!==item.matchId)throw Error('La categoría ya tiene otro partido en esta jornada');
  for(const id of old?.scoreIds||[])delete scores[id];
  for(const [id,value] of Object.entries(item.scores))scores[id]=value;
  results[item.team]={...item.record,matchId:item.matchId,scoreIds:Object.keys(item.scores)};
 }
 return {scores,results};
}
