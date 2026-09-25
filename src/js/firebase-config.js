import { initializeApp } from "firebase/app";

import {
  getFirestore,
} from "firebase/firestore";

import {
  getAuth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAH9X037CK6JsOQKMw-d7LeBL8sF87ecjQ",
  authDomain: "e-voting-school-2026.firebaseapp.com",
  projectId: "e-voting-school-2026",
  storageBucket: "e-voting-school-2026.firebasestorage.app",
  messagingSenderId: "541610214169",
  appId: "1:541610214169:web:75ef6ac79101365eb8fb88"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

console.log(
  "Firebase Production aktif."
);

export { app, db, auth };
