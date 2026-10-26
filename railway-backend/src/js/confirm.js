import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  auth,
  db,
} from "./firebase-config.js";

import {
  logoutVoter,
  submitVote,
} from "./auth.js";


const confirmMessage =
  document.getElementById(
    "confirmMessage"
  );

const confirmCard =
  document.getElementById(
    "confirmCard"
  );

const confirmActions =
  document.getElementById(
    "confirmActions"
  );

const confirmPhoto =
  document.getElementById(
    "confirmPhoto"
  );

const confirmNumber =
  document.getElementById(
    "confirmNumber"
  );

const confirmName =
  document.getElementById(
    "confirmName"
  );

const confirmClass =
  document.getElementById(
    "confirmClass"
  );

const cancelButton =
  document.getElementById(
    "cancelButton"
  );

const submitVoteButton =
  document.getElementById(
    "submitVoteButton"
  );

const logoutButton =
  document.getElementById(
    "logoutButton"
  );


let selectedCandidate = null;
let pageInitialized = false;
let isSubmitting = false;


// =========================================
// AUTH GUARD
// =========================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.replace("/");

      return;
    }


    if (pageInitialized) {
      return;
    }


    pageInitialized = true;

    await loadSelectedCandidate();
  }
);


// =========================================
// LOAD SELECTED CANDIDATE
// =========================================

async function loadSelectedCandidate() {

  try {

    const candidateId =
      sessionStorage.getItem(
        "selectedVoteCandidateId"
      );


    if (!candidateId) {

      throw new Error(
        "Pilihan kandidat tidak ditemukan."
      );
    }


    if (
      !/^candidate-\d{3}$/.test(candidateId)
    ) {

      throw new Error(
        "ID kandidat tidak valid."
      );
    }


    const candidateRef =
      doc(
        db,
        "candidates",
        candidateId
      );


    const candidateSnapshot =
      await getDoc(candidateRef);


    if (!candidateSnapshot.exists()) {

      throw new Error(
        "Data kandidat tidak ditemukan."
      );
    }


    const candidateData =
      candidateSnapshot.data();


    if (
      candidateData.electionId !==
      "election-2026"
    ) {

      throw new Error(
        "Kandidat tidak termasuk dalam pemilihan ini."
      );
    }


    if (
      candidateData.isActive !== true
    ) {

      throw new Error(
        "Kandidat sedang tidak aktif."
      );
    }


    selectedCandidate = {
      id: candidateSnapshot.id,
      ...candidateData,
    };


    renderConfirmation();


    confirmMessage.textContent = "";

    confirmCard.hidden = false;
    confirmActions.hidden = false;

  } catch (error) {

    console.error(
      "Gagal memuat pilihan:",
      error
    );


    confirmCard.hidden = true;
    confirmActions.hidden = true;


    confirmMessage.textContent =
      error.message ||
      "Pilihan gagal dimuat.";
  }
}


// =========================================
// RENDER CONFIRMATION
// =========================================

function renderConfirmation() {

  confirmNumber.textContent =
    String(
      selectedCandidate.number ?? "-"
    ).padStart(2, "0");


  confirmName.textContent =
    selectedCandidate.name ||
    "Nama kandidat";


  confirmClass.textContent =
    selectedCandidate.class ||
    "-";


  if (
    selectedCandidate.photoUrl &&
    selectedCandidate.photoUrl !==
      "placeholder"
  ) {

    confirmPhoto.innerHTML = `
      <img
        src="${escapeHtml(
          selectedCandidate.photoUrl
        )}"
        alt="Foto ${escapeHtml(
          selectedCandidate.name
        )}"
        class="confirm-photo"
      >
    `;

  } else {

    confirmPhoto.innerHTML = `
      <div class="confirm-photo-placeholder">
        FOTO KANDIDAT
      </div>
    `;
  }
}


// =========================================
// CANCEL
// =========================================

cancelButton.addEventListener(
  "click",
  () => {

    window.location.href =
      "/vote.html";
  }
);


// =========================================
// SUBMIT BUTTON
// =========================================

submitVoteButton.addEventListener(
  "click",
  async () => {

    if (isSubmitting) {
      return;
    }


    if (!selectedCandidate) {

      confirmMessage.textContent =
        "Pilihan kandidat tidak ditemukan.";

      return;
    }


    try {

      isSubmitting = true;


      submitVoteButton.disabled =
        true;

      cancelButton.disabled =
        true;


      submitVoteButton.textContent =
        "MENYIMPAN SUARA...";


      confirmMessage.textContent =
        "Mohon tunggu. Suara sedang disimpan.";


      await submitVote(
        selectedCandidate.id
      );


      /*
        Voting berhasil.

        Hapus pilihan sementara,
        tetapi jangan logout di sini dulu.

        D.7 akan menangani halaman sukses
        dan proses kembali ke login.
      */

      sessionStorage.removeItem(
        "selectedVoteCandidateId"
      );

      sessionStorage.removeItem(
        "selectedProfileCandidateId"
      );

      sessionStorage.setItem(
        "voteSubmissionSucceeded",
        "true"
        );


      window.location.replace(
        "/success.html"
      );

    } catch (error) {

      console.error(
        "Submit vote gagal:",
        error
      );


      confirmMessage.textContent =
        error.message ||
        "Suara gagal disimpan. Silakan coba kembali.";


      isSubmitting = false;


      submitVoteButton.disabled =
        false;

      cancelButton.disabled =
        false;


      submitVoteButton.textContent =
        "YA, SAYA YAKIN";
    }
  }
);


// =========================================
// LOGOUT
// =========================================

logoutButton.addEventListener(
  "click",
  async () => {

    try {

      await logoutVoter();

      sessionStorage.clear();

      window.location.replace("/");

    } catch (error) {

      console.error(
        "Logout gagal:",
        error
      );

      confirmMessage.textContent =
        "Logout gagal. Silakan coba kembali.";
    }
  }
);


// =========================================
// ESCAPE HTML
// =========================================

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}