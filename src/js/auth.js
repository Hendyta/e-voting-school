import {
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "./firebase-config.js";

const FUNCTIONS_BASE_URL =
  import.meta.env.DEV
    ? "http://127.0.0.1:5001/e-voting-school-2026/us-central1"
    : "https://us-central1-e-voting-school-2026.cloudfunctions.net";


const LOGIN_FUNCTION_URL =
  `${FUNCTIONS_BASE_URL}/loginWithCode`;


const SUBMIT_VOTE_FUNCTION_URL =
  `${FUNCTIONS_BASE_URL}/submitVote`;

export async function loginWithVoterCode(code) {
  const normalizedCode = String(code || "")
    .trim()
    .toUpperCase();

  if (!normalizedCode) {
    throw new Error("Kode voter wajib diisi.");
  }

  const response = await fetch(LOGIN_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: normalizedCode,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Login gagal.");
  }

  await signInWithCustomToken(auth, result.token);

  return result.voter;
}

export async function logoutVoter() {
  await signOut(auth);
}

export function observeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getVoterIdToken() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User belum login.");
  }

  return await user.getIdToken();
}

export async function submitVote(
  candidateId
) {

  const user =
    auth.currentUser;

  if (!user) {
    throw new Error(
      "Sesi login tidak ditemukan."
    );
  }


  if (!candidateId) {
    throw new Error(
      "Kandidat belum dipilih."
    );
  }


  const idToken =
    await user.getIdToken();


  const response =
    await fetch(
      SUBMIT_VOTE_FUNCTION_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${idToken}`,
        },

        body: JSON.stringify({
          candidateId,
        }),
      }
    );


  const result =
    await response.json();


  if (
    !response.ok ||
    !result.success
  ) {

    throw new Error(
      result.message ||
      "Suara gagal disimpan."
    );
  }


  return result;
}