import {prepareBatch} from './batch-import.js';
import {mergeBatch} from './batch-merge.js';
import {DEFAULT_POLICY,scoreLineup} from './scoring-policy.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,collection,getDocs,writeBatch,runTransaction} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
const app=initializeApp({apiKey:"AIzaSyD-RZxxWJqPt5W9IRRS6CjcpYrwgVRXdd0",authDomain:"fantasy-penya.firebaseapp.com",projectId:"fantasy-penya",storageBucket:"fantasy-penya.firebasestorage.app",messagingSenderId:"907901895323",appId:"1:907901895323:web:f3a022b098a8f4b5213c3e"});
const auth=getAuth(app),db=getFirestore(app);
auth.languageCode='es';
export const session={
 observe:fn=>onAuthStateChanged(auth,fn),
 google:()=>signInWithPopup(auth,new GoogleAuthProvider()),
 login:(email,password)=>signInWithEmailAndPassword(auth,email,password),
 async register(email,password){const result=await createUserWithEmailAndPassword(auth,email,password);await sendEmailVerification(result.user);return result;},
 reset:email=>sendPasswordResetEmail(auth,email),
 verify:()=>sendEmailVerification(auth.currentUser),
 async refresh(){if(auth.currentUser){await auth.currentUser.reload();await auth.currentUser.getIdToken(true);}return auth.currentUser;},
 logout:()=>signOut(auth)
};
function verified(){const u=auth.currentUser;if(!u?.emailVerified)throw new Error('Verifica tu correo antes de continuar');return u.uid;}
export async function readTeam(){const snap=await getDoc(doc(db,'users',verified()));return snap.exists()?snap.data():null;}
export async function writeTeam({alias,formation,slots,coachId,captainId}){await setDoc(doc(db,'users',verified()),{alias,formation,slots,coachId,captainId});}
export async function isAdmin(){return (await getDoc(doc(db,'admins',verified()))).exists();}

let phase='pilot';
export async function loadPhase(){phase=(await readCompetitionPolicy())?'official':'pilot';return phase;}
const scoped=name=>phase+'_'+name;
export async function readRounds(){verified();const s=await getDocs(collection(db,scoped('rounds')));return s.docs.map(d=>({id:d.id,...d.data()}));}
export async function readLineups(){const s=await getDocs(collection(db,'users',verified(),scoped('lineups')));return Object.fromEntries(s.docs.map(d=>[d.id,d.data()]));}
export async function submitLineup(round,team){const uid=verified();const {formation,slots,coachId,captainId,alias}=team;if(!/^([1-9]|[12][0-9]|3[0-8])$/.test(String(round))||slots.length!==11||slots.some(x=>typeof x!=='string'||!x)||new Set(slots).size!==11||!coachId||!slots.includes(captainId))throw new Error('Alineación incompleta');const batch=writeBatch(db);batch.set(doc(db,'users',uid),{alias,formation,slots,coachId,captainId});batch.set(doc(db,'users',uid,scoped('lineups'),String(round)),{formation,slots,coachId,captainId});await batch.commit();}
export async function readOfficial(){verified();const s=await getDocs(collection(db,scoped('official')));return Object.fromEntries(s.docs.map(d=>[d.id,d.data()]));}

export async function saveRound(round,opensAt,closesAt,policy=DEFAULT_POLICY){
 if(!await isAdmin())throw Error('Sin permisos');
 if(!/^([1-9]|[12][0-9]|3[0-8])$/.test(String(round))||!(opensAt instanceof Date)||!(closesAt instanceof Date)||!Number.isFinite(+opensAt)||!Number.isFinite(+closesAt)||+opensAt>=+closesAt)throw Error('Fechas inválidas');
 const ref=doc(db,scoped('rounds'),String(round));if((await getDoc(ref)).exists())throw Error('Jornada ya creada');
 const locked=await readCompetitionPolicy();if((locked?'official':'pilot')!==phase)throw Error('Recarga la aplicación');await setDoc(ref,{opensAt,closesAt,policy:locked||policy});
}
export async function saveOfficialScores(round,scores){
 if(!await isAdmin())throw Error('Sin permisos');
 if(!/^([1-9]|[12][0-9]|3[0-8])$/.test(String(round))||!scores||Object.values(scores).some(v=>!Number.isInteger(v)||v< -1000||v>1000))throw Error('Puntuaciones inválidas');
 await setDoc(doc(db,scoped('official'),String(round)),{scores});
}

export async function saveTeamResult(round,team,record,scores){
 if(!await isAdmin())throw Error('Sin permisos');
 if(!/^([1-9]|[12][0-9]|3[0-8])$/.test(String(round))||!team||Object.values(scores).some(v=>!Number.isInteger(v)||v< -1000||v>1000))throw Error('Datos inválidos');
 const ref=doc(db,scoped('official'),String(round));
 return runTransaction(db,async tx=>{const snap=await tx.get(ref),old=snap.exists()?snap.data():{};const next={scores:{...old.scores,...scores},results:{...old.results,[team]:record}};tx.set(ref,next);return next;});
}

export async function readRanking(){verified();const s=await getDocs(collection(db,scoped('ranking')));return s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.total-a.total||a.alias.localeCompare(b.alias,'es'));}
export async function rebuildRanking(){
 if(!await isAdmin())throw Error('Sin permisos');
 const [users,rounds,official]=await Promise.all([getDocs(collection(db,'users')),readRounds(),readOfficial()]);
 const closed=new Set(rounds.filter(r=>r.closesAt.toMillis()<=Date.now()&&official[r.id]).map(r=>r.id));
 const rows=await Promise.all(users.docs.map(async u=>{
 const history=await getDocs(collection(db,'users',u.id,scoped('lineups')));let total=0,played=0;
 for(const d of history.docs){if(!closed.has(d.id))continue;const l=d.data(),scores=official[d.id].scores||{};total += scoreLineup(l,scores,rounds.find(r=>r.id===d.id)?.policy||DEFAULT_POLICY);played++;}
 return {id:u.id,alias:u.data().alias||'Equipo Fantasy',total,played};
 }));
 if(rows.length>450)throw Error('Ranking demasiado grande para una publicación');
 const batch=writeBatch(db);for(const {id,...row} of rows)batch.set(doc(db,scoped('ranking'),id),row);await batch.commit();return rows;
}

export async function readCompetitionPolicy(){verified();const s=await getDoc(doc(db,'config','competition'));return s.exists()?s.data().policy:null;}
export async function lockCompetitionPolicy(policy){if(!await isAdmin())throw Error('Sin permisos');await runTransaction(db,async tx=>{const ref=doc(db,'config','competition');if((await tx.get(ref)).exists())throw Error('Reglamento ya fijado');tx.set(ref,{policy});});}

export async function readParticipation(round){if(!await isAdmin())throw Error('Sin permisos');if(!/^([1-9]|[12][0-9]|3[0-8])$/.test(String(round)))throw Error('Jornada inválida');const [registered,profiles]=await Promise.all([getDocs(collection(db,'participants')),getDocs(collection(db,'users'))]);const users=[...new Map([...registered.docs,...profiles.docs].map(u=>[u.id,u])).values()];return Promise.all(users.map(async u=>{const [profile,lineup]=await Promise.all([getDoc(doc(db,'users',u.id)),getDoc(doc(db,'users',u.id,scoped('lineups'),String(round)))]);return {alias:profile.exists()?profile.data().alias:'Sin nombre de equipo',submitted:lineup.exists()};}));}

export async function registerParticipant(){const uid=verified();const ref=doc(db,'participants',uid);await runTransaction(db,async tx=>{if(!(await tx.get(ref)).exists())tx.set(ref,{registered:true});});}
export async function initializeRoster(){if(!await isAdmin())throw Error('Sin permisos');const response=await fetch('./firebase-roster.json');if(!response.ok)throw Error('Catálogo no disponible');const roster=await response.json();await setDoc(doc(db,'config','roster'),roster);}


export async function publishMatchBatch(round,matches){
 if(!await isAdmin())throw Error('Sin permisos');
 const key=String(round);
 if(!/^([1-9]|[12][0-9]|3[0-8])$/.test(key))throw Error('Jornada inválida');
 const currentPhase=phase;
 const [players,coaches]=await Promise.all(['jugadores.json','entrenadores.json'].map(async path=>{const r=await fetch('./'+path);if(!r.ok)throw Error('Catálogo no disponible');return r.json()}));
 const roundRef=doc(db,currentPhase+'_rounds',key),ref=doc(db,currentPhase+'_official',key);
 return runTransaction(db,async tx=>{
  const calendar=await tx.get(roundRef),old=await tx.get(ref);
  if(!calendar.exists()||calendar.data().closesAt.toMillis()>Date.now())throw Error('Jornada no cerrada');
  const batch=prepareBatch(matches,players,coaches,calendar.data().policy||DEFAULT_POLICY);
  if(!batch.canPublish)throw Error('Lote con incidencias: '+batch.issues.map(x=>x.error).join('; '));
  const next=mergeBatch(old.exists()?old.data():{},batch);
  tx.set(ref,next);return next;
 });
}

 // Publication and ranking are separate operations; report partial success explicitly.
export async function publishBatchAndRefreshRanking(round,matches){
 const published=await publishMatchBatch(round,matches);
 try{
  const ranking=await rebuildRanking();
  return {published,ranking,rankingUpdated:true};
 }catch(error){
  return {published,rankingUpdated:false,rankingError:error.message};
 }
}
