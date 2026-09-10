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


const voteCandidateList =
  document.getElementById(
    "voteCandidateList"
  );

const voteMessage =
  document.getElementById(
    "voteMessage"
  );

const selectedCandidateText =
  document.getElementById(
    "selectedCandidateText"
  );

const continueVoteButton =
  document.getElementById(
    "continueVoteButton"
  );

const logoutButton =
  document.getElementById(
    "logoutButton"
  );


let candidates = [];
let selectedCandidateId = null;
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

    voteCandidateList.innerHTML = `
      <p class="candidate-loading">
        Memuat kandidat...
      </p>
    `;

    const snapshot =
      await getDocs(
        collection(db, "candidates")
      );

    candidates = [];

    snapshot.forEach(
      (documentSnapshot) => {

        const data =
          documentSnapshot.data();

        if (
          data.electionId ===
            "election-2026" &&
          data.isActive === true
        ) {

          candidates.push({
            id: documentSnapshot.id,
            ...data,
          });
        }
      }
    );


    candidates.sort(
      (a, b) =>
        Number(a.number) -
        Number(b.number)
    );


    if (candidates.length === 0) {

      voteCandidateList.innerHTML = "";

      voteMessage.textContent =
        "Tidak ada kandidat aktif.";

      return;
    }


    renderCandidates();

  } catch (error) {

    console.error(
      "Gagal memuat kandidat:",
      error
    );

    voteCandidateList.innerHTML = "";

    voteMessage.textContent =
      "Kandidat gagal dimuat. Silakan coba kembali.";
  }
}


// =========================================
// RENDER
// =========================================

function renderCandidates() {

  voteCandidateList.innerHTML = "";

  candidates.forEach((candidate) => {

    const card =
      document.createElement("button");

    card.type = "button";

    card.className =
      "vote-candidate-card";

    card.dataset.candidateId =
      candidate.id;


    const photo =
      candidate.photoUrl &&
      candidate.photoUrl !== "placeholder"
        ? `
          <img
            src="${escapeHtml(candidate.photoUrl)}"
            alt="Foto ${escapeHtml(candidate.name)}"
            class="vote-candidate-photo"
          >
        `
        : `
          <div class="vote-photo-placeholder">
            FOTO
          </div>
        `;


    card.innerHTML = `
      <div class="vote-card-photo">
        ${photo}

        <span class="vote-card-number">
          ${String(candidate.number).padStart(2, "0")}
        </span>

        <span class="vote-check">
          ✓
        </span>
      </div>

      <div class="vote-card-content">

        <p>
          KANDIDAT ${escapeHtml(candidate.number)}
        </p>

        <h3>
          ${escapeHtml(candidate.name)}
        </h3>

        <span>
          ${escapeHtml(candidate.class || "-")}
        </span>

      </div>
    `;


    card.addEventListener(
      "click",
      () => {

        selectCandidate(
          candidate.id
        );
      }
    );


    voteCandidateList.appendChild(card);
  });
}


// =========================================
// SELECT CANDIDATE
// =========================================

function selectCandidate(candidateId) {

  const candidate =
    candidates.find(
      (item) =>
        item.id === candidateId
    );


  if (!candidate) {
    return;
  }


  selectedCandidateId =
    candidate.id;


  document
    .querySelectorAll(
      ".vote-candidate-card"
    )
    .forEach((card) => {

      card.classList.toggle(
        "selected",
        card.dataset.candidateId ===
          selectedCandidateId
      );
    });


  selectedCandidateText.textContent =
    `Kandidat ${candidate.number} — ${candidate.name}`;


  continueVoteButton.disabled =
    false;


  voteMessage.textContent =
    "Pilihan belum disimpan. Silakan lanjut ke konfirmasi.";
}


// =========================================
// CONTINUE
// =========================================

continueVoteButton.addEventListener(
  "click",
  () => {

    if (!selectedCandidateId) {

      voteMessage.textContent =
        "Silakan pilih satu kandidat.";

      return;
    }


    sessionStorage.setItem(
      "selectedVoteCandidateId",
      selectedCandidateId
    );


    window.location.href =
      "/confirm.html";
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

      voteMessage.textContent =
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