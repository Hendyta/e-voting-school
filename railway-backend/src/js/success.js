import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  auth,
} from "./firebase-config.js";

import {
  logoutVoter,
} from "./auth.js";


const successMessage =
  document.getElementById(
    "successMessage"
  );

const returnLoginButton =
  document.getElementById(
    "returnLoginButton"
  );


let pageInitialized = false;


// =========================================
// CHECK SUCCESS STATE
// =========================================

const voteSucceeded =
  sessionStorage.getItem(
    "voteSubmissionSucceeded"
  );


if (voteSucceeded !== "true") {

  window.location.replace("/");

} else {

  initializeSuccessPage();
}


// =========================================
// INITIALIZE
// =========================================

function initializeSuccessPage() {

  onAuthStateChanged(
    auth,
    async (user) => {

      if (pageInitialized) {
        return;
      }

      pageInitialized = true;


      try {

        if (user) {

          await logoutVoter();
        }


        sessionStorage.removeItem(
          "voteSubmissionSucceeded"
        );


        sessionStorage.removeItem(
          "selectedVoteCandidateId"
        );


        sessionStorage.removeItem(
          "selectedProfileCandidateId"
        );


        successMessage.textContent =
          "Sesi voting telah berakhir dengan aman.";


        returnLoginButton.disabled =
          false;

      } catch (error) {

        console.error(
          "Gagal mengakhiri sesi:",
          error
        );


        successMessage.textContent =
          "Suara telah tersimpan, tetapi sesi belum berhasil ditutup.";


        returnLoginButton.disabled =
          false;
      }
    }
  );
}


// =========================================
// RETURN TO LOGIN
// =========================================

returnLoginButton.addEventListener(
  "click",
  async () => {

    returnLoginButton.disabled =
      true;


    try {

      if (auth.currentUser) {

        await logoutVoter();
      }

    } catch (error) {

      console.error(
        "Logout tambahan gagal:",
        error
      );
    }


    sessionStorage.clear();


    window.location.replace("/");
  }
);