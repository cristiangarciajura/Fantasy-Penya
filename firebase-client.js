import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
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
