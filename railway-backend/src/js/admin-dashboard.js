import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";

import {
  auth,
  db,
} from "./firebase-config.js";

const electionId = "election-2026";

const totalVoters =
  document.getElementById("totalVoters");

const totalVoted =
  document.getElementById("totalVoted");

const totalNotVoted =
  document.getElementById("totalNotVoted");

const participationRate =
  document.getElementById("participationRate");

const electionStatus =
  document.getElementById("electionStatus");

const candidateResults =
  document.getElementById("candidateResults");

const dashboardMessage =
  document.getElementById("dashboardMessage");

const logoutButton =
  document.getElementById("logoutButton");

function showError(text) {
  dashboardMessage.textContent = text;
  dashboardMessage.style.display = "block";
}

async function verifyAdmin(user) {
  const tokenResult =
    await user.getIdTokenResult(true);

  return tokenResult.claims.admin === true;
}

async function loadElection() {
  const snapshot = await getDoc(
    doc(db, "elections", electionId)
  );

  if (!snapshot.exists()) {
    throw new Error(
      "Data election tidak ditemukan."
    );
  }

  const data = snapshot.data();

  const statusMap = {
    scheduled: "Terjadwal",
    active: "Sedang Berlangsung",
    closed: "Selesai",
  };

  electionStatus.textContent =
    statusMap[data.status] || data.status || "-";
}

async function loadGlobalAggregate() {
  const snapshot = await getDoc(
    doc(
      db,
      "aggregates",
      electionId,
      "global",
      "summary"
    )
  );

  if (!snapshot.exists()) {
    throw new Error(
      "Aggregate global tidak ditemukan."
    );
  }

  const data = snapshot.data();

  totalVoters.textContent =
    data.totalVoters ?? 0;

  totalVoted.textContent =
    data.totalVoted ?? 0;

  totalNotVoted.textContent =
    data.totalNotVoted ?? 0;

  participationRate.textContent =
    `${data.participationRate ?? 0}%`;
}

async function loadCandidateResults() {
  const candidateSnapshot =
    await getDocs(
      collection(db, "candidates")
    );

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

  resultSnapshot.forEach((documentSnapshot) => {
    voteMap[documentSnapshot.id] =
      documentSnapshot.data().totalVotes ?? 0;
  });

  const candidates = [];

  candidateSnapshot.forEach((documentSnapshot) => {
    candidates.push({
      id: documentSnapshot.id,
      ...documentSnapshot.data(),
    });
  });

  candidates.sort((a, b) => {
    return (
      (a.number ?? a.nomorUrut ?? 0) -
      (b.number ?? b.nomorUrut ?? 0)
    );
  });

  candidateResults.innerHTML = "";

  candidates.forEach((candidate, index) => {
    const number =
      candidate.number ??
      candidate.nomorUrut ??
      index + 1;

    const name =
      candidate.name ??
      candidate.nama ??
      `Kandidat ${number}`;

    const votes =
      voteMap[candidate.id] ?? 0;

    const row =
      document.createElement("div");

    row.className = "candidate-row";

    const candidateInfo =
      document.createElement("div");

    const numberSpan =
      document.createElement("span");

    numberSpan.className = "candidate-number";
    numberSpan.textContent = String(number);

    const nameSpan =
      document.createElement("span");

    nameSpan.textContent = String(name);

    candidateInfo.appendChild(numberSpan);
    candidateInfo.appendChild(nameSpan);

    const voteElement =
      document.createElement("div");

    voteElement.className = "candidate-votes";
    voteElement.textContent =
      `${votes} suara`;

    row.appendChild(candidateInfo);
    row.appendChild(voteElement);

candidateResults.appendChild(row);

    candidateResults.appendChild(row);
  });
}

async function loadDashboard() {
  try {
    await Promise.all([
      loadElection(),
      loadGlobalAggregate(),
      loadCandidateResults(),
    ]);
  } catch (error) {
    console.error(
      "Dashboard gagal dimuat:",
      error
    );

    showError(
      "Data dashboard gagal dimuat."
    );
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace(
      "/admin-login.html"
    );
    return;
  }

  try {
    const admin = await verifyAdmin(user);

    if (!admin) {
      await signOut(auth);

      window.location.replace(
        "/admin-login.html"
      );

      return;
    }

    await loadDashboard();

  } catch (error) {
    console.error(
      "Verifikasi admin gagal:",
      error
    );

    await signOut(auth);

    window.location.replace(
      "/admin-login.html"
    );
  }
});

logoutButton.addEventListener(
  "click",
  async () => {
    await signOut(auth);

    window.location.replace(
      "/admin-login.html"
    );
  }
);