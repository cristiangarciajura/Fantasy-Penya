import {prepareMatch} from './match-import.js';
import {scoreTeam,DEFAULT_POLICY} from './scoring-policy.js';

// Dry run only. No database writes.
export function prepareBatch(matches,players,coaches,policy=DEFAULT_POLICY){
 if(!Array.isArray(matches)||!matches.length)throw Error('No hay partidos');
 const ids=new Map(),teams=new Map(),ready=[],issues=[];
 for(const m of matches){
  if(!m||typeof m!=='object')continue;
  ids.set(m.id,(ids.get(m.id)||0)+1);
  teams.set(m.team,(teams.get(m.team)||0)+1);
 }
 for(const m of matches){
  try{
   if(!m||typeof m!=='object')throw Error('Partido inválido');
   if(ids.get(m.id)>1)throw Error('Identificador duplicado');
   if(teams.get(m.team)>1)throw Error('Más de un partido de la categoría en la jornada: revisar aplazamientos');
   const item=prepareMatch(m,players,coaches);
   ready.push({...item,scores:scoreTeam(players,coaches,item.team,item.record,policy)});
  }catch(e){issues.push({matchId:m?.id??null,team:m?.team??null,error:e.message});}
 }
 return {ready,issues,total:matches.length,canPublish:issues.length===0&&ready.length===matches.length};
}
