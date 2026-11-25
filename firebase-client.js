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

export async function readRounds(){verified();const s=await getDocs(collection(db,'rounds'));return s.docs.map(d=>({id:d.id,...d.data()}));}
export async function readLineups(){const s=await getDocs(collection(db,'users',verified(),'lineups'));return Object.fromEntries(s.docs.map(d=>[d.id,d.data()]));}
export async function submitLineup(round,team){const uid=verified();const {formation,slots,coachId,captainId,alias}=team;if(!/^([1-9]|[12][0-9]|3[0-8])$/.test(String(round))||slots.length!==11||slots.some(x=>typeof x!=='string'||!x)||new Set(slots).size!==11||!coachId||!slots.includes(captainId))throw new Error('Alineación incompleta');const batch=writeBatch(db);batch.set(doc(db,'users',uid),{alias,formation,slots,coachId,captainId});batch.set(doc(db,'users',uid,'lineups',String(round)),{formation,slots,coachId,captainId});await batch.commit();}
export async function readOfficial(){verified();const s=await getDocs(collection(db,'official'));return Object.fromEntries(s.docs.map(d=>[d.id,d.data()]));}

export async function saveRound(round,opensAt,closesAt){
 if(!await isAdmin())throw Error('Sin permisos');
 if(!/^([1-9]|[12][0-9]|3[0-8])$/.test(String(round))||!(opensAt instanceof Date)||!(closesAt instanceof Date)||!Number.isFinite(+opensAt)||!Number.isFinite(+closesAt)||+opensAt>=+closesAt)throw Error('Fechas inválidas');
 const ref=doc(db,'rounds',String(round));if((await getDoc(ref)).exists())throw Error('Jornada ya creada');
 await setDoc(ref,{opensAt,closesAt});
}
export async function saveOfficialScores(round,scores){
 if(!await isAdmin())throw Error('Sin permisos');
 if(!/^([1-9]|[12][0-9]|3[0-8])$/.test(String(round))||!scores||Object.values(scores).some(v=>!Number.isInteger(v)||v< -5||v>15))throw Error('Puntuaciones inválidas');
 await setDoc(doc(db,'official',String(round)),{scores});
}

export async function saveTeamResult(round,team,record,scores){
 if(!await isAdmin())throw Error('Sin permisos');
 if(!/^([1-9]|[12][0-9]|3[0-8])$/.test(String(round))||!team||Object.values(scores).some(v=>!Number.isInteger(v)||v< -5||v>15))throw Error('Datos inválidos');
 const ref=doc(db,'official',String(round));
 return runTransaction(db,async tx=>{const snap=await tx.get(ref),old=snap.exists()?snap.data():{};const next={scores:{...old.scores,...scores},results:{...old.results,[team]:record}};tx.set(ref,next);return next;});
}

export async function readRanking(){verified();const s=await getDocs(collection(db,'ranking'));return s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.total-a.total||a.alias.localeCompare(b.alias,'es'));}
export async function rebuildRanking(){
 if(!await isAdmin())throw Error('Sin permisos');
 const [users,rounds,official]=await Promise.all([getDocs(collection(db,'users')),readRounds(),readOfficial()]);
 const closed=new Set(rounds.filter(r=>r.closesAt.toMillis()<=Date.now()&&official[r.id]).map(r=>r.id));
 const rows=await Promise.all(users.docs.map(async u=>{
 const history=await getDocs(collection(db,'users',u.id,'lineups'));let total=0,played=0;
 for(const d of history.docs){if(!closed.has(d.id))continue;const l=d.data(),scores=official[d.id].scores||{};total += [...l.slots,l.coachId].reduce((sum,id)=>sum+(Number(scores[id])||0)*(id===l.captainId?2:1),0);played++;}
 return {id:u.id,alias:u.data().alias||'Equipo Fantasy',total,played};
 }));
 if(rows.length>450)throw Error('Ranking demasiado grande para una publicación');
 const batch=writeBatch(db);for(const {id,...row} of rows)batch.set(doc(db,'ranking',id),row);await batch.commit();return rows;
}
