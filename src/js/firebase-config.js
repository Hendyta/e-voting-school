import { initializeApp } from "firebase/app";

import {
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";

import {
  getAuth,
  connectAuthEmulator,
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

if (import.meta.env.DEV) {
  connectFirestoreEmulator(
    db,
    "127.0.0.1",
    8080
  );

  connectAuthEmulator(
    auth,
    "http://127.0.0.1:9099",
    {
      disableWarnings: true,
    }
  );

  console.log(
    "Firebase Emulator aktif (development mode)."
  );
}

export { app, db, auth };