// Pure scoring policy; defaults preserve the existing competition.
export const DEFAULT_POLICY=Object.freeze({version:1,win:3,draw:1,loss:0,goal:3,maxGoals:3,red:-5,cleanSheet:3,coachWin:5,coachDraw:2,coachLoss:0,captainMultiplier:2});
export function scoreTeam(players,coaches,team,record,policy=DEFAULT_POLICY){
 if(!['win','draw','loss'].includes(record.result))throw Error('Resultado inválido');
 const scores={};const base=policy[record.result],coachBase=policy['coach'+record.result[0].toUpperCase()+record.result.slice(1)];
 for(const p of players.filter(p=>p.team===team))scores[p.id]=base+policy.goal*Math.min(policy.maxGoals,record.goals?.[p.id]||0)+policy.red*(record.reds?.[p.id]||0)+(record.cleanSheet&&['POR','DEF'].includes(p.pos)?policy.cleanSheet:0);
 for(const c of coaches.filter(c=>c.team===team))scores[c.id]=coachBase;
 return scores;
}
export function scoreLineup(lineup,scores,policy=DEFAULT_POLICY){return [...lineup.slots,lineup.coachId].filter(Boolean).reduce((sum,id)=>sum+(scores[id]||0)*(id===lineup.captainId?policy.captainMultiplier:1),0);}
