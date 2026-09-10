import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  auth,
} from "./firebase-config.js";

import {
  logoutVoter,
} from "./auth.js";


const tutorialContent =
  document.getElementById(
    "tutorialContent"
  );

const tutorialStepNumber =
  document.getElementById(
    "tutorialStepNumber"
  );

const tutorialProgressBar =
  document.getElementById(
    "tutorialProgressBar"
  );

const previousButton =
  document.getElementById(
    "previousButton"
  );

const nextTutorialButton =
  document.getElementById(
    "nextTutorialButton"
  );

const logoutButton =
  document.getElementById(
    "logoutButton"
  );

const tutorialMessage =
  document.getElementById(
    "tutorialMessage"
  );


const tutorialSteps = [

  {
    number: "01",
    title: "Baca Profil Kandidat",
    description:
      "Pelajari profil, visi, misi, dan program kerja setiap kandidat sebelum menentukan pilihan.",
    icon: "PROFIL",
  },

  {
    number: "02",
    title: "Pilih Kandidat",
    description:
      "Pada halaman pemilihan, pilih satu kandidat yang sesuai dengan pilihan Anda.",
    icon: "PILIH",
  },

  {
    number: "03",
    title: "Konfirmasi Pilihan",
    description:
      "Periksa kembali kandidat yang dipilih. Suara belum disimpan sebelum Anda menekan tombol konfirmasi.",
    icon: "CEK",
  },

  {
    number: "04",
    title: "Voting Diverifikasi",
    description:
      "Setelah dikonfirmasi, sistem akan menyimpan suara dan menandai kode voting sebagai sudah digunakan.",
    icon: "VERIFIKASI",
  },

  {
    number: "05",
    title: "Selesai",
    description:
      "Setelah voting berhasil, Anda akan diarahkan kembali ke halaman login. Kode yang sama tidak dapat digunakan kembali.",
    icon: "SELESAI",
  },

];


let currentStep = 0;


// =========================================
// AUTH GUARD
// =========================================

onAuthStateChanged(
  auth,
  (user) => {

    if (!user) {
      window.location.replace("/");
      return;
    }

    renderTutorialStep();
  }
);


// =========================================
// RENDER STEP
// =========================================

function renderTutorialStep() {

  const step =
    tutorialSteps[currentStep];

  tutorialStepNumber.textContent =
    `LANGKAH ${currentStep + 1} DARI ${tutorialSteps.length}`;

  const progress =
    ((currentStep + 1) /
      tutorialSteps.length) *
    100;

  tutorialProgressBar.style.width =
    `${progress}%`;


  tutorialContent.innerHTML = `
    <div class="tutorial-step-number">
      ${step.number}
    </div>

    <div class="tutorial-step-icon">
      ${escapeHtml(step.icon)}
    </div>

    <div class="tutorial-step-text">

      <h3>
        ${escapeHtml(step.title)}
      </h3>

      <p>
        ${escapeHtml(step.description)}
      </p>

    </div>
  `;


  previousButton.disabled =
    currentStep === 0;


  if (
    currentStep ===
    tutorialSteps.length - 1
  ) {

    nextTutorialButton.textContent =
      "SELESAI";

  } else {

    nextTutorialButton.textContent =
      "SELANJUTNYA";
  }
}


// =========================================
// PREVIOUS
// =========================================

previousButton.addEventListener(
  "click",
  () => {

    if (currentStep <= 0) {
      return;
    }

    currentStep -= 1;

    renderTutorialStep();
  }
);


// =========================================
// NEXT
// =========================================

nextTutorialButton.addEventListener(
  "click",
  () => {

    if (
      currentStep <
      tutorialSteps.length - 1
    ) {

      currentStep += 1;

      renderTutorialStep();

      return;
    }

    window.location.href =
      "/candidates.html";
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

      tutorialMessage.textContent =
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