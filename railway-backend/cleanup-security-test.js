const {
  admin,
  db,
} = require("./firebase-admin");

const ELECTION_ID = "election-2026";
const TEST_CANDIDATE_ID = "candidate-001";

function assertNumber(
  actual,
  expected,
  label
) {
  if (Number(actual) !== expected) {
    throw new Error(
      `${label}: diharapkan ${expected}, ditemukan ${actual}.`
    );
  }
}

async function main() {
  console.log("==============================");
  console.log("CLEANUP SECURITY TEST");
  console.log("==============================");

  // ---------------------------------------
  // 1. AUDIT BASELINE WAJIB
  // ---------------------------------------

  const votersSnapshot =
    await db.collection("voters").get();

  const votesSnapshot = await db
    .collection("votes")
    .where("electionId", "==", ELECTION_ID)
    .get();

  if (votersSnapshot.size !== 32) {
    throw new Error(
      `DIBATALKAN: total voter harus 32, ditemukan ${votersSnapshot.size}.`
    );
  }

  if (votesSnapshot.size !== 32) {
    throw new Error(
      `DIBATALKAN: total vote harus 32, ditemukan ${votesSnapshot.size}.`
    );
  }

  // ---------------------------------------
  // 2. SECURITY TEST VOTER HARUS TEPAT 1
  // ---------------------------------------

  const securitySnapshot = await db
    .collection("voters")
    .where("isSecurityTest", "==", true)
    .get();

  if (securitySnapshot.size !== 1) {
    throw new Error(
      `DIBATALKAN: security-test voter harus tepat 1, ditemukan ${securitySnapshot.size}.`
    );
  }

  const securityDoc =
    securitySnapshot.docs[0];

  const securityData =
    securityDoc.data();

  if (
    securityData.electionId !== ELECTION_ID ||
    securityData.role !== "student" ||
    securityData.class !== "X.2" ||
    securityData.gender !== "L" ||
    securityData.isActive !== true ||
    securityData.hasVoted !== true ||
    securityData.isSecurityTest !== true
  ) {
    throw new Error(
      "DIBATALKAN: struktur security-test voter tidak sesuai."
    );
  }

  if (
    !securityData.createdAt ||
    !securityData.updatedAt
  ) {
    throw new Error(
      "DIBATALKAN: timestamp security-test voter tidak lengkap."
    );
  }

  // ---------------------------------------
  // 3. AUDIT JUMLAH VOTE PER KANDIDAT
  // ---------------------------------------

  const voteCounts = {
    "candidate-001": 0,
    "candidate-002": 0,
    "candidate-003": 0,
  };

  votesSnapshot.forEach((doc) => {
    const data = doc.data();

    if (
      Object.prototype.hasOwnProperty.call(
        voteCounts,
        data.candidateId
      )
    ) {
      voteCounts[data.candidateId]++;
    } else {
      throw new Error(
        `DIBATALKAN: ditemukan candidateId vote tidak dikenal: ${data.candidateId}`
      );
    }
  });

  assertNumber(
    voteCounts["candidate-001"],
    15,
    "candidate-001"
  );

  assertNumber(
    voteCounts["candidate-002"],
    9,
    "candidate-002"
  );

  assertNumber(
    voteCounts["candidate-003"],
    8,
    "candidate-003"
  );

  // ---------------------------------------
  // 4. CARI VOTE TEST SECARA TERKONTROL
  // ---------------------------------------

  const candidateVotes = votesSnapshot.docs
    .filter(
      (doc) =>
        doc.data().candidateId ===
        TEST_CANDIDATE_ID
    )
    .filter(
      (doc) =>
        doc.data().createdAt &&
        typeof doc.data().createdAt.toMillis ===
          "function"
    )
    .sort(
      (a, b) =>
        b.data().createdAt.toMillis() -
        a.data().createdAt.toMillis()
    );

  if (candidateVotes.length !== 15) {
    throw new Error(
      "DIBATALKAN: jumlah vote candidate-001 tidak sesuai."
    );
  }

  const testVoteDoc =
    candidateVotes[0];

  const testVoteData =
    testVoteDoc.data();

  const voterUpdatedMillis =
    securityData.updatedAt.toMillis();

  const voteCreatedMillis =
    testVoteData.createdAt.toMillis();

  if (
    voterUpdatedMillis !== voteCreatedMillis
  ) {
    throw new Error(
      "DIBATALKAN: timestamp vote terbaru tidak cocok dengan security-test voter."
    );
  }

  // Pastikan hanya satu vote yang mempunyai timestamp ini.
  const sameTimestampVotes =
    votesSnapshot.docs.filter((doc) => {
      const createdAt =
        doc.data().createdAt;

      return (
        createdAt &&
        typeof createdAt.toMillis ===
          "function" &&
        createdAt.toMillis() ===
          voteCreatedMillis
      );
    });

  if (sameTimestampVotes.length !== 1) {
    throw new Error(
      `DIBATALKAN: timestamp test tidak unik. Ditemukan ${sameTimestampVotes.length} vote.`
    );
  }

  // ---------------------------------------
  // 5. REFERENCES AGGREGATE
  // ---------------------------------------

  const globalRef = db.doc(
    `aggregates/${ELECTION_ID}/global/summary`
  );

  const studentRef = db.doc(
    `aggregates/${ELECTION_ID}/roles/student`
  );

  const maleRef = db.doc(
    `aggregates/${ELECTION_ID}/gender/L`
  );

  const classRef = db.doc(
    `aggregates/${ELECTION_ID}/classes/X.2`
  );

  const candidateRef = db.doc(
    `aggregates/${ELECTION_ID}/candidates/${TEST_CANDIDATE_ID}`
  );

  // ---------------------------------------
  // 6. CLEANUP DALAM SATU TRANSACTION
  // ---------------------------------------

  await db.runTransaction(
    async (transaction) => {
      const [
        freshSecurityDoc,
        freshTestVoteDoc,
        globalDoc,
        studentDoc,
        maleDoc,
        classDoc,
        candidateDoc,
      ] = await Promise.all([
        transaction.get(securityDoc.ref),
        transaction.get(testVoteDoc.ref),
        transaction.get(globalRef),
        transaction.get(studentRef),
        transaction.get(maleRef),
        transaction.get(classRef),
        transaction.get(candidateRef),
      ]);

      if (
        !freshSecurityDoc.exists ||
        !freshTestVoteDoc.exists ||
        !globalDoc.exists ||
        !studentDoc.exists ||
        !maleDoc.exists ||
        !classDoc.exists ||
        !candidateDoc.exists
      ) {
        throw new Error(
          "DIBATALKAN: dokumen cleanup tidak lengkap."
        );
      }

      const freshSecurity =
        freshSecurityDoc.data();

      const freshVote =
        freshTestVoteDoc.data();

      if (
        freshSecurity.isSecurityTest !== true ||
        freshSecurity.hasVoted !== true
      ) {
        throw new Error(
          "DIBATALKAN: security voter berubah."
        );
      }

      if (
        freshVote.electionId !== ELECTION_ID ||
        freshVote.candidateId !==
          TEST_CANDIDATE_ID ||
        !freshVote.createdAt ||
        freshVote.createdAt.toMillis() !==
          freshSecurity.updatedAt.toMillis()
      ) {
        throw new Error(
          "DIBATALKAN: vote test berubah atau tidak cocok."
        );
      }

      const globalData =
        globalDoc.data();

      const studentData =
        studentDoc.data();

      const maleData =
        maleDoc.data();

      const classData =
        classDoc.data();

      const candidateData =
        candidateDoc.data();

      // Kondisi WAJIB sebelum cleanup.
      assertNumber(
        globalData.totalVoters,
        32,
        "global.totalVoters"
      );
      assertNumber(
        globalData.totalVoted,
        32,
        "global.totalVoted"
      );

      assertNumber(
        studentData.totalVoters,
        26,
        "student.totalVoters"
      );
      assertNumber(
        studentData.totalVoted,
        26,
        "student.totalVoted"
      );

      assertNumber(
        maleData.totalVoters,
        16,
        "gender/L.totalVoters"
      );
      assertNumber(
        maleData.totalVoted,
        16,
        "gender/L.totalVoted"
      );

      assertNumber(
        classData.totalVoters,
        5,
        "X.2.totalVoters"
      );
      assertNumber(
        classData.totalVoted,
        5,
        "X.2.totalVoted"
      );

      assertNumber(
        candidateData.totalVotes,
        15,
        "candidate-001.totalVotes"
      );

      const timestamp =
        admin.firestore.FieldValue
          .serverTimestamp();

      function updateAggregate(
        ref,
        data
      ) {
        const totalVoters =
          Number(data.totalVoters) - 1;

        const totalVoted =
          Number(data.totalVoted) - 1;

        const totalNotVoted =
          totalVoters - totalVoted;

        const participationRate =
          totalVoters > 0
            ? Number(
                (
                  (totalVoted /
                    totalVoters) *
                  100
                ).toFixed(2)
              )
            : 0;

        transaction.update(ref, {
          totalVoters,
          totalVoted,
          totalNotVoted,
          participationRate,
          updatedAt: timestamp,
        });
      }

      updateAggregate(
        globalRef,
        globalData
      );

      updateAggregate(
        studentRef,
        studentData
      );

      updateAggregate(
        maleRef,
        maleData
      );

      updateAggregate(
        classRef,
        classData
      );

      transaction.update(
        candidateRef,
        {
          totalVotes:
            Number(
              candidateData.totalVotes
            ) - 1,
          updatedAt: timestamp,
        }
      );

      transaction.delete(
        testVoteDoc.ref
      );

      transaction.delete(
        securityDoc.ref
      );
    }
  );

  console.log("");
  console.log("CLEANUP_BERHASIL");
  console.log(
    "Security-test voter dihapus."
  );
  console.log(
    "Satu anonymous test vote dihapus."
  );
  console.log(
    "Aggregate dikembalikan ke baseline."
  );
  console.log("");
  console.log(
    "Lakukan audit ulang sebelum melanjutkan."
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("");
  console.error("CLEANUP_GAGAL");
  console.error("ERROR:", error.message);
  process.exit(1);
});