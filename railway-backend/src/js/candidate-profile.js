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
} from "./auth.js";


const profileMessage =
  document.getElementById("profileMessage");

const profileContent =
  document.getElementById("profileContent");

const profileActions =
  document.getElementById("profileActions");

const profilePhoto =
  document.getElementById("profilePhoto");

const profileNumber =
  document.getElementById("profileNumber");

const profileName =
  document.getElementById("profileName");

const profileClass =
  document.getElementById("profileClass");

const profileTabContent =
  document.getElementById("profileTabContent");

const tabButtons =
  document.querySelectorAll(".profile-tab");

const otherProfilesButton =
  document.getElementById("otherProfilesButton");

const logoutButton =
  document.getElementById("logoutButton");


let currentCandidate = null;
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

    await loadCandidateProfile();
  }
);


// =========================================
// LOAD CANDIDATE
// =========================================

async function loadCandidateProfile() {

  try {

    const candidateId =
      sessionStorage.getItem(
        "selectedProfileCandidateId"
      );

    if (!candidateId) {
      throw new Error(
        "Kandidat belum dipilih."
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

    currentCandidate = {
      id: candidateSnapshot.id,
      ...candidateData,
    };

    renderCandidateProfile();

    profileMessage.textContent = "";

    profileContent.hidden = false;
    profileActions.hidden = false;

  } catch (error) {

    console.error(
      "Gagal memuat profil kandidat:",
      error
    );

    profileContent.hidden = true;
    profileActions.hidden = false;

    profileMessage.textContent =
      error.message ||
      "Profil kandidat gagal dimuat.";
  }
}


// =========================================
// RENDER PROFILE
// =========================================

function renderCandidateProfile() {

  profileNumber.textContent =
    String(
      currentCandidate.number ?? "-"
    ).padStart(2, "0");

  profileName.textContent =
    currentCandidate.name ||
    "Nama kandidat";

  profileClass.textContent =
    currentCandidate.class ||
    "-";


  if (
    currentCandidate.photoUrl &&
    currentCandidate.photoUrl !== "placeholder"
  ) {

    profilePhoto.innerHTML = `
      <img
        src="${escapeHtml(
          currentCandidate.photoUrl
        )}"
        alt="Foto ${escapeHtml(
          currentCandidate.name
        )}"
        class="profile-photo"
      >
    `;

  } else {

    profilePhoto.innerHTML = `
      <div class="profile-photo-placeholder">
        FOTO KANDIDAT
      </div>
    `;
  }


  setActiveTab("vision");
}


// =========================================
// TAB
// =========================================

tabButtons.forEach((button) => {

  button.addEventListener(
    "click",
    () => {

      const tabName =
        button.dataset.tab;

      setActiveTab(tabName);
    }
  );

});


function setActiveTab(tabName) {

  if (!currentCandidate) {
    return;
  }

  tabButtons.forEach((button) => {

    button.classList.toggle(
      "active",
      button.dataset.tab === tabName
    );

  });


  if (tabName === "vision") {

    renderVision();

    return;
  }


  if (tabName === "mission") {

    renderMission();

    return;
  }


  if (tabName === "workPrograms") {

    renderWorkPrograms();
  }
}


// =========================================
// VISI
// =========================================

function renderVision() {

  const vision =
    currentCandidate.vision ||
    "Visi belum tersedia.";

  profileTabContent.innerHTML = `
    <div class="profile-text-panel">

      <p class="profile-content-label">
        VISI
      </p>

      <p class="profile-vision">
        ${escapeHtml(vision)}
      </p>

    </div>
  `;
}


// =========================================
// MISI
// =========================================

function renderMission() {

  const mission =
    Array.isArray(
      currentCandidate.mission
    )
      ? currentCandidate.mission
      : [];

  if (mission.length === 0) {

    profileTabContent.innerHTML = `
      <p class="profile-empty">
        Misi belum tersedia.
      </p>
    `;

    return;
  }


  const items =
    mission
      .map(
        (item, index) => `
          <li>
            <span class="profile-list-number">
              ${String(index + 1).padStart(2, "0")}
            </span>

            <span>
              ${escapeHtml(item)}
            </span>
          </li>
        `
      )
      .join("");


  profileTabContent.innerHTML = `
    <div class="profile-text-panel">

      <p class="profile-content-label">
        MISI
      </p>

      <ol class="profile-mission-list">
        ${items}
      </ol>

    </div>
  `;
}


// =========================================
// PROGRAM KERJA
// =========================================

function renderWorkPrograms() {

  const workPrograms =
    Array.isArray(
      currentCandidate.workPrograms
    )
      ? currentCandidate.workPrograms
      : [];

  if (workPrograms.length === 0) {

    profileTabContent.innerHTML = `
      <p class="profile-empty">
        Program kerja belum tersedia.
      </p>
    `;

    return;
  }


  const programs =
    workPrograms
      .map(
        (program, index) => {

          const title =
            typeof program === "object"
              ? program.title
              : `Program ${index + 1}`;

          const description =
            typeof program === "object"
              ? program.description
              : program;

          return `
            <article class="work-program-card">

              <span class="work-program-number">
                ${String(index + 1).padStart(2, "0")}
              </span>

              <div>

                <h3>
                  ${escapeHtml(
                    title ||
                    `Program ${index + 1}`
                  )}
                </h3>

                <p>
                  ${escapeHtml(
                    description || "-"
                  )}
                </p>

              </div>

            </article>
          `;
        }
      )
      .join("");


  profileTabContent.innerHTML = `
    <div class="profile-work-programs">
      ${programs}
    </div>
  `;
}


// =========================================
// OTHER PROFILES
// =========================================

otherProfilesButton.addEventListener(
  "click",
  () => {

    sessionStorage.removeItem(
      "selectedProfileCandidateId"
    );

    window.location.replace(
      "/candidates.html"
    );
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

      profileMessage.textContent =
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