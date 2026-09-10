import {
  collection,
  getDocs,
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
} from "./auth.js";

const candidateList =
  document.getElementById("candidateList");

const candidateMessage =
  document.getElementById("candidateMessage");

const logoutButton =
  document.getElementById("logoutButton");

const tutorialButton =
  document.getElementById("tutorialButton");

const nextButton =
  document.getElementById("nextButton");

let pageInitialized = false;


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

    await loadCandidates();
  }
);


// =========================================
// LOAD CANDIDATES
// =========================================

async function loadCandidates() {

  try {

    candidateList.innerHTML = `
      <p class="candidate-loading">
        Memuat kandidat...
      </p>
    `;

    candidateMessage.textContent = "";

    const snapshot =
      await getDocs(
        collection(db, "candidates")
      );

    const candidates = [];

    snapshot.forEach((documentSnapshot) => {

      const data =
        documentSnapshot.data();

      if (
        data.electionId === "election-2026" &&
        data.isActive === true
      ) {

        candidates.push({
          id: documentSnapshot.id,
          ...data,
        });

      }

    });

    candidates.sort(
      (a, b) =>
        Number(a.number) -
        Number(b.number)
    );

    if (candidates.length === 0) {

      candidateList.innerHTML = "";

      candidateMessage.textContent =
        "Belum ada kandidat aktif.";

      return;
    }

    renderCandidates(candidates);

  } catch (error) {

    console.error(
      "Gagal mengambil kandidat:",
      error
    );

    candidateList.innerHTML = "";

    candidateMessage.textContent =
      "Data kandidat gagal dimuat. Silakan coba kembali.";

  }

}


// =========================================
// RENDER CANDIDATES
// =========================================

function renderCandidates(candidates) {

  candidateList.innerHTML = "";

  candidates.forEach((candidate) => {

    const card =
      document.createElement("article");

    card.className =
      "candidate-card";

    const photoContent =
      candidate.photoUrl &&
      candidate.photoUrl !== "placeholder"
        ? `
          <img
            src="${candidate.photoUrl}"
            alt="Foto ${escapeHtml(candidate.name)}"
            class="candidate-photo"
          >
        `
        : `
          <div class="candidate-photo-placeholder">
            FOTO
          </div>
        `;

    card.innerHTML = `
      <div class="candidate-number">
        ${String(candidate.number).padStart(2, "0")}
      </div>

      <div class="candidate-photo-wrapper">
        ${photoContent}
      </div>

      <div class="candidate-card-content">

        <p class="candidate-card-label">
          KANDIDAT ${candidate.number}
        </p>

        <h3>
          ${escapeHtml(candidate.name)}
        </h3>

        <p class="candidate-class">
          ${escapeHtml(candidate.class || "-")}
        </p>

        <button
          type="button"
          class="candidate-detail-button"
          data-candidate-id="${candidate.id}"
        >
          LIHAT
        </button>

      </div>
    `;

    candidateList.appendChild(card);

  });

  const detailButtons =
    document.querySelectorAll(
      ".candidate-detail-button"
    );

  detailButtons.forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        const candidateId =
          button.dataset.candidateId;

        sessionStorage.setItem(
            "selectedProfileCandidateId",
            candidateId
            );

            window.location.href =
            "/candidate-profile.html";

      }
    );

  });

}


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

      candidateMessage.textContent =
        "Logout gagal. Silakan coba kembali.";

    }

  }
);


// =========================================
// TUTORIAL
// =========================================

tutorialButton.addEventListener(
  "click",
  () => {

    window.location.href =
      "/tutorial.html";

  }
);


// =========================================
// NEXT
// =========================================

nextButton.addEventListener(
  "click",
  () => {

    sessionStorage.removeItem(
      "selectedVoteCandidateId"
    );

    window.location.href =
      "/vote.html";
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