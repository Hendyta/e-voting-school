import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import {
  auth,
  db,
} from "./firebase-config.js";

const electionId = "election-2026";

const candidateList =
  document.getElementById("candidateList");

const candidateMessage =
  document.getElementById("candidateMessage");

const logoutButton =
  document.getElementById("logoutButton");

function showError(text) {
  candidateMessage.textContent = text;
  candidateMessage.style.display = "block";
}

async function verifyAdmin(user) {
  const token =
    await user.getIdTokenResult(true);

  return token.claims.admin === true;
}

function createMissionList(mission) {
  if (
    !Array.isArray(mission) ||
    mission.length === 0
  ) {
    const empty =
      document.createElement("p");

    empty.textContent = "-";

    return empty;
  }

  const list =
    document.createElement("ul");

  mission.forEach((item) => {
    const listItem =
      document.createElement("li");

    listItem.textContent =
      String(item ?? "-");

    list.appendChild(listItem);
  });

  return list;
}

function createPrograms(programs) {
  const container =
    document.createElement("div");

  if (
    !Array.isArray(programs) ||
    programs.length === 0
  ) {
    const empty =
      document.createElement("p");

    empty.textContent = "-";
    container.appendChild(empty);

    return container;
  }

  programs.forEach((program) => {
    const programElement =
      document.createElement("div");

    programElement.className = "program";

    const title =
      document.createElement("strong");

    title.textContent =
      String(program?.title ?? "-");

    const description =
      document.createElement("p");

    description.textContent =
      String(program?.description ?? "-");

    programElement.appendChild(title);
    programElement.appendChild(description);

    container.appendChild(programElement);
  });

  return container;
}

function createCandidateCard(candidate) {
  const article =
    document.createElement("article");

  article.className = "candidate-card";

  const header =
    document.createElement("div");

  header.className = "candidate-header";

  const identity =
    document.createElement("div");

  const number =
    document.createElement("div");

  number.className = "candidate-number";
  number.textContent =
    `KANDIDAT ${candidate.number ?? "-"}`;

  const name =
    document.createElement("h2");

  name.className = "candidate-name";
  name.textContent =
    String(candidate.name ?? "-");

  const candidateClass =
    document.createElement("div");

  candidateClass.className = "candidate-class";
  candidateClass.textContent =
    `Kelas ${candidate.class ?? "-"}`;

  identity.appendChild(number);
  identity.appendChild(name);
  identity.appendChild(candidateClass);

  const status =
    document.createElement("span");

  status.className =
    candidate.isActive
      ? "status active"
      : "status inactive";

  status.textContent =
    candidate.isActive
      ? "AKTIF"
      : "NONAKTIF";

  header.appendChild(identity);
  header.appendChild(status);

  const content =
    document.createElement("div");

  content.className = "candidate-content";

  const visionSection =
    document.createElement("section");

  visionSection.className = "info-box";

  const visionTitle =
    document.createElement("h3");

  visionTitle.textContent = "Visi";

  const vision =
    document.createElement("p");

  vision.textContent =
    String(candidate.vision ?? "-");

  visionSection.appendChild(visionTitle);
  visionSection.appendChild(vision);

  const missionSection =
    document.createElement("section");

  missionSection.className = "info-box";

  const missionTitle =
    document.createElement("h3");

  missionTitle.textContent = "Misi";

  missionSection.appendChild(missionTitle);
  missionSection.appendChild(
    createMissionList(candidate.mission)
  );

  const programSection =
    document.createElement("section");

  programSection.className = "info-box";

  const programTitle =
    document.createElement("h3");

  programTitle.textContent = "Program Kerja";

  programSection.appendChild(programTitle);
  programSection.appendChild(
    createPrograms(candidate.workPrograms)
  );

  content.appendChild(visionSection);
  content.appendChild(missionSection);
  content.appendChild(programSection);

  article.appendChild(header);
  article.appendChild(content);

  return article;
}

async function loadCandidates() {
  const candidateQuery =
    query(
      collection(db, "candidates"),
      where(
        "electionId",
        "==",
        electionId
      )
    );

  const snapshot =
    await getDocs(candidateQuery);

  const candidates = [];

  snapshot.forEach((documentSnapshot) => {
    candidates.push({
      id: documentSnapshot.id,
      ...documentSnapshot.data(),
    });
  });

  candidates.sort(
    (a, b) =>
      (a.number ?? 0) -
      (b.number ?? 0)
  );

  candidateList.innerHTML = "";

  if (candidates.length === 0) {
    candidateList.textContent =
      "Belum ada kandidat.";

    return;
  }

  candidates.forEach((candidate) => {
    candidateList.appendChild(
      createCandidateCard(candidate)
    );
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

      await loadCandidates();

    } catch (error) {
      console.error(
        "Kandidat gagal dimuat:",
        error
      );

      showError(
        "Data kandidat gagal dimuat."
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