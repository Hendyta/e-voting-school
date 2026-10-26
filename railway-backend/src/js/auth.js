import {
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "./firebase-config.js";

const LOCAL_BACKEND_URL =
  "http://192.168.1.16:3000";

const PUBLIC_BACKEND_URL =
  "https://ashley-ate-saved-stevens.trycloudflare.com";

const isLocalAccess =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "192.168.1.16";

const BACKEND_BASE_URL =
  isLocalAccess
    ? LOCAL_BACKEND_URL
    : PUBLIC_BACKEND_URL;

const LOGIN_FUNCTION_URL =
  `${BACKEND_BASE_URL}/login`;

const SUBMIT_VOTE_FUNCTION_URL =
  `${BACKEND_BASE_URL}/submit-vote`;

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

  // Auto-cache data voter session jika ada
  if (result.voter) {
    cacheVoterSession(result.voter);
  }

  return result.voter;
}

export async function logoutVoter() {
  clearVoterCache();
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

// ==========================================
// CACHING HELPER FOR FRONTEND OPTIMIZATION
// ==========================================

export function cacheVoterSession(voterData) {
  if (voterData) {
    sessionStorage.setItem("voter_session", JSON.stringify(voterData));
  }
}

export function getCachedVoterSession() {
  const cached = sessionStorage.getItem("voter_session");
  return cached ? JSON.parse(cached) : null;
}

export function cacheCandidatesData(candidates) {
  if (candidates) {
    sessionStorage.setItem("candidates_cache", JSON.stringify(candidates));
  }
}

export function getCachedCandidates() {
  const cached = sessionStorage.getItem("candidates_cache");
  return cached ? JSON.parse(cached) : null;
}

export function clearVoterCache() {
  sessionStorage.removeItem("voter_session");
  sessionStorage.removeItem("candidates_cache");
}