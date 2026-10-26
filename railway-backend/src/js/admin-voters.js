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

const voterTable =
  document.getElementById("voterTable");

const searchInput =
  document.getElementById("searchInput");

const totalVoters =
  document.getElementById("totalVoters");

const totalVoted =
  document.getElementById("totalVoted");

const totalNotVoted =
  document.getElementById("totalNotVoted");

const totalActive =
  document.getElementById("totalActive");

const voterMessage =
  document.getElementById("voterMessage");

const logoutButton =
  document.getElementById("logoutButton");

let voters = [];

function showError(text) {
  voterMessage.textContent = text;
  voterMessage.style.display = "block";
}

async function verifyAdmin(user) {
  const token =
    await user.getIdTokenResult(true);

  return token.claims.admin === true;
}

function roleLabel(role) {
  if (role === "student") return "Siswa";
  if (role === "teacher") return "Guru";

  return role ?? "-";
}

function genderLabel(gender) {
  if (gender === "L") return "Laki-laki";
  if (gender === "P") return "Perempuan";

  return "-";
}

function renderTable(data) {
  voterTable.innerHTML = "";

  if (data.length === 0) {
    voterTable.innerHTML = `
      <tr>
        <td colspan="6">
          Data tidak ditemukan.
        </td>
      </tr>
    `;

    return;
  }

  data.forEach((voter, index) => {
    const row =
      document.createElement("tr");

    const values = [
      String(index + 1),
      roleLabel(voter.role),
      String(voter.className ?? "-"),
      genderLabel(voter.gender),
    ];

    values.forEach((value) => {
      const cell =
        document.createElement("td");

      cell.textContent =
        String(value ?? "-");

      row.appendChild(cell);
    });

    const votingCell =
      document.createElement("td");

    const votingBadge =
      document.createElement("span");

    votingBadge.className =
      voter.hasVoted
        ? "badge success"
        : "badge waiting";

    votingBadge.textContent =
      voter.hasVoted
        ? "Sudah Memilih"
        : "Belum Memilih";

    votingCell.appendChild(votingBadge);

    const accountCell =
      document.createElement("td");

    const accountBadge =
      document.createElement("span");

    accountBadge.className =
      voter.isActive
        ? "badge active"
        : "badge inactive";

    accountBadge.textContent =
      voter.isActive
        ? "Aktif"
        : "Nonaktif";

    accountCell.appendChild(accountBadge);

    row.appendChild(votingCell);
    row.appendChild(accountCell);

    voterTable.appendChild(row);
  });
}

function updateSummary() {
  totalVoters.textContent =
    voters.length;

  totalVoted.textContent =
    voters.filter(
      (voter) => voter.hasVoted
    ).length;

  totalNotVoted.textContent =
    voters.filter(
      (voter) => !voter.hasVoted
    ).length;

  totalActive.textContent =
    voters.filter(
      (voter) => voter.isActive
    ).length;
}

async function loadVoters() {
  const voterQuery =
    query(
      collection(db, "voters"),
      where(
        "electionId",
        "==",
        electionId
      )
    );

  const snapshot =
    await getDocs(voterQuery);

  voters = [];

  snapshot.forEach((documentSnapshot) => {
    const data =
      documentSnapshot.data();

    /*
     * Sengaja hanya mengambil field
     * yang diperlukan UI.
     *
     * codeHash dan document ID
     * tidak dimasukkan.
     */
    voters.push({
      role: data.role,
      className:
        data.class ??
        data.kelas ??
        "-",
      gender: data.gender,
      hasVoted:
        data.hasVoted === true,
      isActive:
        data.isActive === true,
    });
  });

  voters.sort((a, b) => {
    return a.className.localeCompare(
      b.className,
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      }
    );
  });

  updateSummary();
  renderTable(voters);
}

searchInput.addEventListener(
  "input",
  () => {
    const keyword =
      searchInput.value
        .trim()
        .toLowerCase();

    if (!keyword) {
      renderTable(voters);
      return;
    }

    const filtered =
      voters.filter((voter) => {
        const text = [
          roleLabel(voter.role),
          voter.className,
          genderLabel(voter.gender),
          voter.hasVoted
            ? "sudah memilih"
            : "belum memilih",
          voter.isActive
            ? "aktif"
            : "nonaktif",
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(keyword);
      });

    renderTable(filtered);
  }
);

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

      await loadVoters();

    } catch (error) {
      console.error(
        "Pemilih gagal dimuat:",
        error
      );

      showError(
        "Data pemilih gagal dimuat."
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