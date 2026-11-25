import {session} from './firebase-client.js';
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
session.observe(render);
