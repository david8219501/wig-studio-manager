import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDsrTF5A49g1w6JR8pJjtlu0a49Gn2xMJY",
  authDomain: "esti-wigs-system.firebaseapp.com",
  projectId: "esti-wigs-system",
  storageBucket: "esti-wigs-system.firebasestorage.app",
  messagingSenderId: "395404001906",
  appId: "1:395404001906:web:33ccbc1d4e0bb66428b8eb"
};

// נותנים שם ייחודי לאפליקציה כדי למנוע התנגשויות
const app = !getApps().length 
  ? initializeApp(firebaseConfig, "estiWigsApp") 
  : getApp("estiWigsApp");

export const auth = getAuth(app);
export const db = getFirestore(app);
// us-central1 - חייב להתאים לאזור שבו נפרסות ה-Cloud Functions (ראו
// functions/src/config.ts, REGION).
export const functions = getFunctions(app, "us-central1");