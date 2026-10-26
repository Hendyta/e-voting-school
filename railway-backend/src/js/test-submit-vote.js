import {
  observeAuthState,
  getVoterIdToken,
} from "./auth.js";

const SUBMIT_VOTE_URL =
  "http://127.0.0.1:5001/e-voting-school-2026/us-central1/submitVote";

const message = document.getElementById("message");

const candidateButtons =
  document.querySelectorAll("[data-candidate-id]");

observeAuthState((user) => {
  if (!user) {
    window.location.replace("/");
  }
});

candidateButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      const candidateId =
        button.dataset.candidateId;

      message.textContent =
        "Mengirim voting...";

      const idToken =
        await getVoterIdToken();

      const response = await fetch(
        SUBMIT_VOTE_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            candidateId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
          "Voting gagal."
        );
      }

      message.textContent =
        result.message;

      console.log(
        "Submit vote response:",
        result
      );
    } catch (error) {
      console.error(
        "Submit vote error:",
        error
      );

      message.textContent =
        error.message;
    }
  });
});