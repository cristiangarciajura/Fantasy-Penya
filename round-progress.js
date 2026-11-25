// Expected teams must come from the actual weekend schedule, not the entire roster.
export function roundProgress(expectedTeams,results,closed){
 if(!Array.isArray(expectedTeams)||expectedTeams.some(t=>typeof t!=='string'||!t.trim())||new Set(expectedTeams).size!==expectedTeams.length)throw Error('Calendario inválido');
 const published=Object.keys(results||{});
 const completed=expectedTeams.filter(t=>Object.hasOwn(results||{},t));
 const pending=expectedTeams.filter(t=>!Object.hasOwn(results||{},t));
 const unexpected=published.filter(t=>!expectedTeams.includes(t));
 return {expected:expectedTeams.length,completed,pending,unexpected,state:!closed?'open':expectedTeams.length>0&&!pending.length&&!unexpected.length?'finished':'inProgress'};
}
