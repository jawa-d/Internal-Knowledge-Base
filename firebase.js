// firebase.js

// -------------------------------
// Firebase App
// -------------------------------
import { initializeApp } 
  from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";

// -------------------------------
// Firebase Auth
// -------------------------------
import { getAuth } 
  from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

// -------------------------------
// Firestore
// -------------------------------
import { getFirestore } 
  from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";


// -------------------------------
// إعدادات Firebase الخاصة بك
// -------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCSELQN5fS0qB0udVBqccrDYcMsefgwCGY",
  authDomain: "earthlink-kb.firebaseapp.com",
  projectId: "earthlink-kb",
  storageBucket: "earthlink-kb.firebasestorage.app",
  messagingSenderId: "519458012850",
  appId: "1:519458012850:web:6c3f87b5108524e17c13ab"
};


// -------------------------------
// Initialize Firebase
// -------------------------------
const app = initializeApp(firebaseConfig);

// -------------------------------
// Auth + Firestore EXPORT
// -------------------------------
export const auth = getAuth(app);
export const db = getFirestore(app);
