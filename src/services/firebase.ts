import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCweYlyAOuQrTNUnIJK6IWWvj6CRT3oQUo",
  authDomain: "esti-wigs-portal.firebaseapp.com",
  projectId: "esti-wigs-portal",
  storageBucket: "esti-wigs-portal.firebasestorage.app",
  messagingSenderId: "72620775587",
  appId: "1:72620775587:web:d9ce348ff8b72e3c3f4716"
  // הורדנו את measurementId כי אנחנו לא משתמשים ב-Analytics כרגע
};

// אתחול האפליקציה
const app = initializeApp(firebaseConfig);

// ייצוא בסיס הנתונים (Firestore) לשימוש בכל הפרויקט
export const db = getFirestore(app);