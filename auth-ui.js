import {session,readTeam,readRounds,readLineups,readOfficial,submitLineup} from './firebase-client.js';
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
async function sync(u){const g=++generation;activeUid=null;window.cloudTeam.ready=false;$('authGate').style.display='grid';$('cloudLogout').hidden=true;render(u);if(!u?.emailVerified)return;status.textContent='Cargando equipo…';try{await window.rosterPromise;const [data,rounds,history,official]=await Promise.all([readTeam(),readRounds(),readLineups(),readOfficial()]);if(g!==generation)return;window.cloudTeam.apply(data,rounds,history,official);activeUid=u.uid;window.cloudTeam.ready=true;$('authGate').style.display='none';$('cloudLogout').hidden=false;}catch(e){if(g===generation)status.textContent='No se puede cargar el equipo. Comprueba las reglas de Firebase y vuelve a iniciar sesión.';}}
$('authRefresh').onclick=()=>run(async()=>sync(await session.refresh()));
$('cloudLogout').onclick=()=>run(async()=>{window.cloudTeam.ready=false;$('authGate').style.display='grid';await session.logout();});
window.cloudSave=async()=>{if(!window.cloudTeam.ready||!activeUid||busy)return;busy=true;const g=generation;try{const w=window.cloudTeam.round(),d=window.cloudTeam.data();if(!window.cloudTeam.isOpen()||!d.captainId){window.toast('Selecciona capitán y una jornada abierta');return;}await submitLineup(w,d);if(g===generation){window.cloudTeam.saved(w,d);window.toast('Alineación guardada en la nube');}}catch(e){if(g===generation)window.toast('Error al guardar. Vuelve a intentarlo.');}finally{busy=false}};
session.observe(sync);
