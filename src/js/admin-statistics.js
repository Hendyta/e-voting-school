import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import {
  auth,
  db,
} from "./firebase-config.js";

const electionId = "election-2026";

const roleTable =
  document.getElementById("roleTable");

const genderTable =
  document.getElementById("genderTable");

const classTable =
  document.getElementById("classTable");

const statisticsMessage =
  document.getElementById("statisticsMessage");

const logoutButton =
  document.getElementById("logoutButton");

function normalizeAggregate(data) {
  const total =
    Number.isInteger(data.totalVoters)
      ? data.totalVoters
      : data.total ?? 0;

  const voted =
    Number.isInteger(data.totalVoted)
      ? data.totalVoted
      : data.voted ?? 0;

  const notVoted =
    Number.isInteger(data.totalNotVoted)
      ? data.totalNotVoted
      : data.notVoted ?? 0;

  const participation =
    typeof data.participationRate === "number"
      ? data.participationRate
      : total > 0
        ? Number(
            ((voted / total) * 100).toFixed(2)
          )
        : 0;

  return {
    total,
    voted,
    notVoted,
    participation,
  };
}

function addRow(
  table,
  label,
  aggregate
) {
  const row =
    document.createElement("tr");

  const values = [
    label,
    aggregate.total,
    aggregate.voted,
    aggregate.notVoted,
    `${aggregate.participation}%`,
  ];

  values.forEach((value) => {
    const cell =
      document.createElement("td");

    cell.textContent =
      String(value ?? "-");

    row.appendChild(cell);
  });

  table.appendChild(row);
}

async function verifyAdmin(user) {
  const token =
    await user.getIdTokenResult(true);

  return token.claims.admin === true;
}

async function loadCollection(
  subcollection,
  table,
  labelFunction
) {
  const snapshot =
    await getDocs(
      collection(
        db,
        "aggregates",
        electionId,
        subcollection
      )
    );

  table.innerHTML = "";

  if (snapshot.empty) {
    table.innerHTML = `
      <tr>
        <td colspan="5" class="empty">
          Data belum tersedia.
        </td>
      </tr>
    `;

    return;
  }

  const documents = [];

  snapshot.forEach((documentSnapshot) => {
    documents.push({
      id: documentSnapshot.id,
      data: documentSnapshot.data(),
    });
  });

  documents.sort((a, b) =>
    a.id.localeCompare(
      b.id,
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      }
    )
  );

  documents.forEach((item) => {
    addRow(
      table,
      labelFunction(item.id),
      normalizeAggregate(item.data)
    );
  });
}

async function loadStatistics() {
  await Promise.all([
    loadCollection(
      "roles",
      roleTable,
      (id) => {
        if (id === "student") return "Siswa";
        if (id === "teacher") return "Guru";

        return id;
      }
    ),

    loadCollection(
      "gender",
      genderTable,
      (id) => {
        if (id === "L") return "Laki-laki";
        if (id === "P") return "Perempuan";

        return id;
      }
    ),

    loadCollection(
      "classes",
      classTable,
      (id) => id
    ),
  ]);
}

function showError(text) {
  statisticsMessage.textContent = text;
  statisticsMessage.style.display = "block";
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

      await loadStatistics();

    } catch (error) {
      console.error(
        "Statistik gagal dimuat:",
        error
      );

      showError(
        "Data statistik gagal dimuat."
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