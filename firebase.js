// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCSELQN5fS0qB0udVBqccrDYcMsefgwCGY",
  authDomain: "earthlink-kb.firebaseapp.com",
  projectId: "earthlink-kb",
  storageBucket: "earthlink-kb.appspot.com", // ✅ الصحيح
  messagingSenderId: "519458012850",
  appId: "1:519458012850:web:6c3f87b5108524e17c13ab"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
