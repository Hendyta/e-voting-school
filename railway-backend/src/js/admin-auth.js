import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "./firebase-config.js";

export async function loginAdmin(email, password) {
  const credential =
    await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

  // Paksa refresh token agar custom claim terbaru terbaca.
  const tokenResult =
    await credential.user.getIdTokenResult(true);

  if (tokenResult.claims.admin !== true) {
    await signOut(auth);

    throw new Error(
      "Akun ini tidak memiliki akses administrator."
    );
  }

  return credential.user;
}

export async function testAdminAggregateAccess() {
  const ref = doc(
    db,
    "aggregates",
    "election-2026",
    "global",
    "summary"
  );

  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    throw new Error(
      "Aggregate global tidak ditemukan."
    );
  }

  return snapshot.data();
}

export async function logoutAdmin() {
  await signOut(auth);
}