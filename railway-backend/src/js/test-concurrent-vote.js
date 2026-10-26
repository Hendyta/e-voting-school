import {
  observeAuthState,
  getVoterIdToken,
} from "./auth.js";

const SUBMIT_VOTE_URL =
  "http://127.0.0.1:5001/e-voting-school-2026/us-central1/submitVote";

const runTestButton =
  document.getElementById("runTestButton");

const resultA =
  document.getElementById("resultA");

const resultB =
  document.getElementById("resultB");

const status =
  document.getElementById("status");

observeAuthState((user) => {
  if (!user) {
    window.location.replace("/");
  }
});

async function submitVote(candidateId, idToken) {
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

  return {
    httpStatus: response.status,
    ...result,
  };
}

runTestButton.addEventListener(
  "click",
  async () => {
    try {
      runTestButton.disabled = true;

      resultA.textContent = "Menunggu...";
      resultB.textContent = "Menunggu...";
      status.textContent =
        "Mengirim dua request hampir bersamaan...";

      const idToken =
        await getVoterIdToken();

      const [responseA, responseB] =
        await Promise.all([
          submitVote(
            "candidate-001",
            idToken
          ),
          submitVote(
            "candidate-002",
            idToken
          ),
        ]);

      console.log(
        "Response A:",
        responseA
      );

      console.log(
        "Response B:",
        responseB
      );

      resultA.textContent =
        JSON.stringify(
          responseA,
          null,
          2
        );

      resultB.textContent =
        JSON.stringify(
          responseB,
          null,
          2
        );

      status.textContent =
        "Tes selesai. Periksa hasil dan Firestore.";

    } catch (error) {
      console.error(
        "Concurrent test error:",
        error
      );

      status.textContent =
        error.message;
    } finally {
      runTestButton.disabled = false;
    }
  }
);