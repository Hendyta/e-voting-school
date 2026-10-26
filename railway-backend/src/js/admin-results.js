import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import {
  auth,
  db,
} from "./firebase-config.js";

const electionId = "election-2026";

const totalVoters =
  document.getElementById("totalVoters");

const totalVotes =
  document.getElementById("totalVotes");

const participationRate =
  document.getElementById("participationRate");

const candidateResults =
  document.getElementById("candidateResults");

const resultMessage =
  document.getElementById("resultMessage");

const logoutButton =
  document.getElementById("logoutButton");

function showError(text) {
  resultMessage.textContent = text;
  resultMessage.style.display = "block";
}

async function verifyAdmin(user) {
  const token =
    await user.getIdTokenResult(true);

  return token.claims.admin === true;
}

async function loadResults() {

  const globalSnapshot =
    await getDoc(
      doc(
        db,
        "aggregates",
        electionId,
        "global",
        "summary"
      )
    );

  if (!globalSnapshot.exists()) {
    throw new Error(
      "Aggregate global tidak ditemukan."
    );
  }

  const global =
    globalSnapshot.data();

  const voterCount =
    global.totalVoters ?? 0;

  const votedCount =
    global.totalVoted ?? 0;

  totalVoters.textContent =
    voterCount;

  totalVotes.textContent =
    votedCount;

  participationRate.textContent =
    `${global.participationRate ?? 0}%`;

  const candidateQuery =
    query(
      collection(db, "candidates"),
      where(
        "electionId",
        "==",
        electionId
      )
    );

  const candidateSnapshot =
    await getDocs(candidateQuery);

  const resultSnapshot =
    await getDocs(
      collection(
        db,
        "aggregates",
        electionId,
        "candidates"
      )
    );

  const voteMap = {};

  resultSnapshot.forEach((snapshot) => {
    voteMap[snapshot.id] =
      snapshot.data().totalVotes ?? 0;
  });

  const candidates = [];

  candidateSnapshot.forEach((snapshot) => {
    candidates.push({
      id: snapshot.id,
      ...snapshot.data(),
    });
  });

  candidates.sort(
    (a, b) =>
      (a.number ?? 0) -
      (b.number ?? 0)
  );

  candidateResults.innerHTML = "";

  candidates.forEach((candidate) => {

    const votes =
      voteMap[candidate.id] ?? 0;

    const percentage =
      votedCount > 0
        ? Number(
            (
              (votes / votedCount) *
              100
            ).toFixed(2)
          )
        : 0;

    const row =
      document.createElement("div");

    row.className = "candidate-result";

    const resultHeader =
      document.createElement("div");

    resultHeader.className = "result-header";

    const candidateInfo =
      document.createElement("div");

    const candidateNumber =
      document.createElement("div");

    candidateNumber.className = "candidate-number";
    candidateNumber.textContent =
      `KANDIDAT ${candidate.number ?? "-"}`;

    const candidateName =
      document.createElement("div");

    candidateName.className = "candidate-name";
    candidateName.textContent =
      String(candidate.name ?? "-");

    candidateInfo.appendChild(candidateNumber);
    candidateInfo.appendChild(candidateName);

    const voteNumber =
      document.createElement("div");

    voteNumber.className = "vote-number";

    const voteTotal =
      document.createElement("strong");

    voteTotal.textContent =
      `${votes} suara`;

    const votePercentage =
      document.createElement("span");

    votePercentage.textContent =
      `${percentage}%`;

    voteNumber.appendChild(voteTotal);
    voteNumber.appendChild(votePercentage);

    resultHeader.appendChild(candidateInfo);
    resultHeader.appendChild(voteNumber);

    const progressTrack =
      document.createElement("div");

    progressTrack.className = "progress-track";

    const progressBar =
      document.createElement("div");

    progressBar.className = "progress-bar";

    const safePercentage =
      Math.max(
        0,
        Math.min(100, Number(percentage) || 0)
      );

    progressBar.style.width =
      `${safePercentage}%`;

    progressTrack.appendChild(progressBar);

    row.appendChild(resultHeader);
    row.appendChild(progressTrack);

    candidateResults.appendChild(row);
  });
}

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {
      window.location.replace(
        "/admin-login.html"
      );

      return;
    }

    try {
      const isAdmin =
        await verifyAdmin(user);

      if (!isAdmin) {
        await signOut(auth);

        window.location.replace(
          "/admin-login.html"
        );

        return;
      }

      await loadResults();

    } catch (error) {
      console.error(
        "Hasil gagal dimuat:",
        error
      );

      showError(
        "Data hasil pemilihan gagal dimuat."
      );
    }
  }
);

logoutButton.addEventListener(
  "click",
  async () => {

    await signOut(auth);

    window.location.replace(
      "/admin-login.html"
    );
  }
);