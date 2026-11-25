import {DEFAULT_POLICY,scoreTeam,scoreLineup} from './scoring-policy.js';
import {session,readTeam,readRounds,readLineups,readOfficial,submitLineup,isAdmin,saveRound,saveTeamResult,readRanking,rebuildRanking} from './firebase-client.js';
const $=id=>document.getElementById(id);
const status=$('authStatus');
const email=()=>$('authEmail').value.trim();
const password=()=>$('authPassword').value;
let busy=false;
const errorMessage=e=>({'auth/invalid-credential':'Correo o contraseña incorrectos.','auth/weak-password':'Utiliza al menos seis caracteres.','auth/email-already-in-use':'Ya existe una cuenta con ese correo.','auth/unauthorized-domain':'Este dominio no está autorizado en Firebase.','auth/popup-blocked':'Permite las ventanas emergentes del navegador.','auth/network-request-failed':'Comprueba tu conexión.'}[e.code]||'No se ha completado la operación. Inténtalo de nuevo.');
async function run(fn){if(busy)return;busy=true;try{await fn()}catch(e){status.textContent=errorMessage(e);console.warn(e.code)}finally{busy=false}}
$('authForm').onsubmit=e=>{e.preventDefault();run(()=>session.login(email(),password()))};
$('authRegister').onclick=()=>run(async()=>{if(!$('authForm').reportValidity())return;await session.register(email(),password());status.textContent='Revisa tu correo para verificar la cuenta.'});
$('authGoogle').onclick=()=>run(()=>session.google());
$('authReset').onclick=()=>run(async()=>{if(!$('authEmail').reportValidity())return;await session.reset(email());status.textContent='Si existe una cuenta, revisa tu correo.'});
$('authVerify').onclick=()=>run(async()=>{await session.verify();status.textContent='Correo de verificación enviado.'});
function render(u){const signed=!!u;for(const id of ['authForm','authRegister','authGoogle','authReset'])$(id).hidden=signed; $('authForm').style.display=signed?'none':'grid';for(const id of ['authVerify','authRefresh'])$(id).hidden=!signed||u.emailVerified;$('authExit').hidden=!signed;status.textContent=!signed?'Inicia sesión o crea una cuenta.':u.emailVerified?'Cuenta verificada. La sincronización del equipo todavía está en desarrollo.':'Verifica tu correo para continuar.'; }
$('authRefresh').onclick=()=>run(async()=>render(await session.refresh()));
$('authExit').onclick=()=>run(()=>session.logout());
let generation=0,activeUid=null;
async function sync(u){const g=++generation;activeUid=null;window.cloudTeam.admin=false;$('nav-admin').hidden=true;document.getElementById('cloudAdmin').hidden=true;window.cloudTeam.ready=false;$('authGate').style.display='grid';$('cloudLogout').hidden=true;render(u);if(!u?.emailVerified)return;status.textContent='Cargando equipo…';try{await window.rosterPromise;const [data,rounds,history,official]=await Promise.all([readTeam(),readRounds(),readLineups(),readOfficial()]);if(g!==generation)return;window.cloudTeam.apply(data,rounds,history,official);activeUid=u.uid;const admin=await isAdmin();if(g!==generation)return;window.cloudTeam.admin=admin;$('nav-admin').hidden=!admin;document.getElementById('cloudAdmin').hidden=!admin;await refreshRanking();if(g!==generation)return;window.cloudTeam.ready=true;$('authGate').style.display='none';$('cloudLogout').hidden=false;}catch(e){if(g===generation)status.textContent='No se puede cargar el equipo. Comprueba las reglas de Firebase y vuelve a iniciar sesión.';}}
$('authRefresh').onclick=()=>run(async()=>sync(await session.refresh()));
$('cloudLogout').onclick=()=>run(async()=>{window.cloudTeam.ready=false;$('authGate').style.display='grid';await session.logout();});
window.cloudSave=async()=>{if(!window.cloudTeam.ready||!activeUid||busy)return;busy=true;const g=generation;try{const w=window.cloudTeam.round(),d=window.cloudTeam.data();if(!window.cloudTeam.isOpen()||!d.captainId){window.toast('Selecciona capitán y una jornada abierta');return;}await submitLineup(w,d);if(g===generation){window.cloudTeam.saved(w,d);window.toast('Alineación guardada en la nube');}}catch(e){if(g===generation)window.toast('Error al guardar. Vuelve a intentarlo.');}finally{busy=false}};


window.cloudScoreTeam=scoreTeam;window.cloudScoreLineup=scoreLineup;
const panel=document.createElement('section');panel.id='cloudAdmin';panel.hidden=true;panel.style.cssText='padding:16px;background:#172c55;margin:12px;border-radius:12px';
panel.innerHTML='<h2>Administración · desarrollo</h2><form id="roundForm"><label>Jornada <input id="adminRound" type="number" min="1" max="38" required></label><label>Apertura (hora local)<input id="adminOpen" type="datetime-local" required></label><label>Cierre (hora local)<input id="adminClose" type="datetime-local" required></label><button class="primary">Crear jornada</button></form><p id="adminStatus" role="status"></p>';
document.querySelector('main').prepend(panel);
const policyBox=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent='Reglamento de la nueva jornada';policyBox.append(legend);
const labels={win:'Victoria',draw:'Empate',loss:'Derrota',goal:'Gol',maxGoals:'Máximo goles',red:'Tarjeta roja',cleanSheet:'Portería imbatida',coachWin:'Victoria entrenador',coachDraw:'Empate entrenador',coachLoss:'Derrota entrenador',captainMultiplier:'Multiplicador capitán'};
for(const [key,label] of Object.entries(labels)){const l=document.createElement('label');l.textContent=label+' ';const i=document.createElement('input');i.type='number';i.required=true;i.step='1';i.min=key==='maxGoals'?0:key==='captainMultiplier'?1:-20;i.max=key==='maxGoals'?10:key==='captainMultiplier'?5:20;i.value=DEFAULT_POLICY[key];i.id='policy-'+key;l.append(i);policyBox.append(l);}
$('roundForm').prepend(policyBox);
function selectedPolicy(){return {version:1,...Object.fromEntries(Object.keys(labels).map(k=>[k,Number($('policy-'+k).value)]))};}

$('roundForm').onsubmit=async e=>{e.preventDefault();if(busy||!activeUid)return;busy=true;try{await saveRound($('adminRound').value,new Date($('adminOpen').value),new Date($('adminClose').value),selectedPolicy());$('adminStatus').textContent='Jornada creada. Recarga para actualizar el calendario.';}catch(e){$('adminStatus').textContent='No se ha creado la jornada: comprueba permisos, fechas y si ya existe.';}finally{busy=false}};

window.cloudPublish=async(...args)=>{if(!window.cloudTeam.admin||busy)return null;busy=true;const g=generation;try{const result=await saveTeamResult(...args);return g===generation?result:null;}finally{busy=false}};
const rankingPanel=document.createElement('section');rankingPanel.style.cssText='padding:16px;margin:12px;border-radius:12px';rankingPanel.innerHTML='<h2>Clasificación de participantes</h2><button id="rankingRefresh">Actualizar clasificación</button><button id="rankingPublish" hidden>Publicar clasificación</button><p id="rankingStatus" role="status"></p><div id="rankingRows"></div>';document.querySelector('main').append(rankingPanel);
async function refreshRanking(){const g=generation;const rows=await readRanking();if(g!==generation)return;$('rankingRows').replaceChildren();$('rankingPublish').hidden=!window.cloudTeam.admin;rows.forEach((r,i)=>{const row=document.createElement('div');row.className='row';row.textContent=(i+1)+'. '+r.alias+' · '+r.total+' pts · '+r.played+' jornadas';$('rankingRows').append(row)});$('rankingStatus').textContent=rows.length?'Clasificación publicada':'Todavía no hay clasificación publicada';}
$('rankingRefresh').onclick=()=>run(async()=>{try{await refreshRanking()}catch(e){$('rankingStatus').textContent='No se pudo actualizar';}});
$('rankingPublish').onclick=()=>run(async()=>{try{await rebuildRanking();await refreshRanking()}catch(e){$('rankingStatus').textContent='No se pudo publicar la clasificación';}});
session.observe(sync);
