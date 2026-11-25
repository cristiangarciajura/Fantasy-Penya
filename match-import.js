// Validate normalized match records before calculating fantasy scores.
export function normalizeName(value){
 return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
}
export function prepareMatch(match,players,coaches){
 if(match.status!=='finished')throw Error('Partido no finalizado');
 if(!match.id||!match.team)throw Error('Falta identificador o equipo');
 const roster=players.filter(p=>p.team===match.team);
 if(!roster.length)throw Error('Equipo desconocido');
 const {forGoals,againstGoals}=match;
 if(![forGoals,againstGoals].every(n=>Number.isInteger(n)&&n>=0&&n<=99))throw Error('Marcador inválido');
 if(!Array.isArray(match.events))throw Error('Faltan incidencias');
 const goals={},reds={};let counted=0;
 for(const e of match.events){
  if(e.type==='opponentOwnGoal'){counted++;continue;}
  if(!['goal','penalty','red','secondYellow'].includes(e.type))throw Error('Incidencia desconocida');
  const name=normalizeName(e.name);
  const candidates=roster.filter(p=>name&&normalizeName(p.name)===name);
  if(candidates.length!==1)throw Error('Jugador sin coincidencia única: '+e.name);
  const p=candidates[0];
  if(e.number!=null&&p.number!=null&&Number(e.number)!==Number(p.number))throw Error('Dorsal distinto: '+e.name);
  if(e.type==='goal'||e.type==='penalty'){goals[p.id]=(goals[p.id]||0)+1;counted++;}
  else reds[p.id]=1;
 }
 if(counted!==forGoals)throw Error('Los goles no cuadran con el marcador');
 return {matchId:match.id,team:match.team,record:{result:forGoals>againstGoals?'win':forGoals===againstGoals?'draw':'loss',cleanSheet:againstGoals===0,goals,reds}};
}
