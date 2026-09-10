import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  auth,
  db,
} from "./firebase-config.js";

const testCandidatesButton =
  document.getElementById("testCandidates");

const testVotersButton =
  document.getElementById("testVoters");

const testVotesButton =
  document.getElementById("testVotes");

const testAggregatesButton =
  document.getElementById("testAggregates");

const testElectionsButton =
  document.getElementById("testElections");

const testWriteVoteButton =
  document.getElementById("testWriteVote");

const testWriteVoterButton =
  document.getElementById("testWriteVoter");

const result =
  document.getElementById("result");

onAuthStateChanged(auth, (user) => {
  if (user) {
    result.textContent =
      `User sudah login.\nUID: ${user.uid}`;
  } else {
    result.textContent =
      "User belum login. Silakan login terlebih dahulu.";
  }
});

// TEST 1 - BACA CANDIDATES
testCandidatesButton.addEventListener(
  "click",
  async () => {
    try {
      if (!auth.currentUser) {
        throw new Error(
          "User belum login."
        );
      }

      const snapshot =
        await getDocs(
          collection(db, "candidates")
        );

      result.textContent =
        `BERHASIL membaca candidates.\nJumlah kandidat: ${snapshot.size}`;

      snapshot.forEach((doc) => {
        console.log(
          doc.id,
          doc.data()
        );
      });
    } catch (error) {
      console.error(error);

      result.textContent =
        `GAGAL membaca candidates.\n${error.message}`;
    }
  }
);

// TEST 2 - BACA VOTERS
testVotersButton.addEventListener(
  "click",
  async () => {
    try {
      if (!auth.currentUser) {
        throw new Error(
          "User belum login."
        );
      }

      const snapshot =
        await getDocs(
          collection(db, "voters")
        );

      result.textContent =
        `TIDAK AMAN: berhasil membaca voters.\nJumlah voter: ${snapshot.size}`;
    } catch (error) {
      console.error(error);

      result.textContent =
        `AMAN: akses voters ditolak.\n${error.message}`;
    }
  }
);

// TEST 3 - BACA VOTES
testVotesButton.addEventListener(
  "click",
  async () => {
    try {
      if (!auth.currentUser) {
        throw new Error(
          "User belum login."
        );
      }

      const snapshot =
        await getDocs(
          collection(db, "votes")
        );

      result.textContent =
        `TIDAK AMAN: berhasil membaca votes.\nJumlah vote: ${snapshot.size}`;
    } catch (error) {
      console.error(error);

      result.textContent =
        `AMAN: akses votes ditolak.\n${error.message}`;
    }
  }
);

// TEST 4 - BACA AGGREGATES
testAggregatesButton.addEventListener(
  "click",
  async () => {
    try {
      if (!auth.currentUser) {
        throw new Error(
          "User belum login."
        );
      }

      const snapshot =
        await getDocs(
          collection(db, "aggregates")
        );

      result.textContent =
        `TIDAK AMAN: berhasil membaca aggregates.\nJumlah dokumen: ${snapshot.size}`;
    } catch (error) {
      console.error(error);

      result.textContent =
        `AMAN: akses aggregates ditolak.\n${error.message}`;
    }
  }
);

// TEST 5 - BACA ELECTIONS
testElectionsButton.addEventListener(
  "click",
  async () => {
    try {
      if (!auth.currentUser) {
        throw new Error(
          "User belum login."
        );
      }

      const snapshot =
        await getDocs(
          collection(db, "elections")
        );

      result.textContent =
        `BERHASIL membaca elections.\nJumlah election: ${snapshot.size}`;

      snapshot.forEach((doc) => {
        console.log(
          doc.id,
          doc.data()
        );
      });
    } catch (error) {
      console.error(error);

      result.textContent =
        `GAGAL membaca elections.\n${error.message}`;
    }
  }
);

// TEST 6 - MENULIS VOTE LANGSUNG DARI CLIENT
testWriteVoteButton.addEventListener(
  "click",
  async () => {
    try {
      if (!auth.currentUser) {
        throw new Error(
          "User belum login."
        );
      }

      await addDoc(
        collection(db, "votes"),
        {
          electionId: "election-2026",
          candidateId: "candidate-001",
          testDirectWrite: true,
        }
      );

      result.textContent =
        "TIDAK AMAN: client berhasil menulis langsung ke votes.";
    } catch (error) {
      console.error(error);

      result.textContent =
        `AMAN: penulisan langsung ke votes ditolak.\n${error.message}`;
    }
  }
);

// TEST 7 - MENGUBAH VOTER LANGSUNG DARI CLIENT
testWriteVoterButton.addEventListener(
  "click",
  async () => {
    try {
      if (!auth.currentUser) {
        throw new Error(
          "User belum login."
        );
      }

      const voterRef =
        doc(db, "voters", auth.currentUser.uid);

      await updateDoc(
        voterRef,
        {
          hasVoted: false,
        }
      );

      result.textContent =
        "TIDAK AMAN: client berhasil mengubah data voter.";
    } catch (error) {
      console.error(error);

      result.textContent =
        `AMAN: perubahan data voter ditolak.\n${error.message}`;
    }
  }
);