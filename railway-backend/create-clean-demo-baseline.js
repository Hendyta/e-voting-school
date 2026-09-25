require("dotenv").config({
  path: require("path").join(
    __dirname,
    "../functions/.env.local"
  ),
});

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const {
  admin,
  db,
} = require("./firebase-admin");

const ELECTION_ID = "election-2026";

const SECRET =
  process.env.VOTER_CODE_HMAC_SECRET;

if (!SECRET) {
  console.error(
    "VOTER_CODE_HMAC_SECRET tidak ditemukan."
  );
  process.exit(1);
}

function generateCode(prefix) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let random = "";

  for (let i = 0; i < 6; i++) {
    random += chars[
      crypto.randomInt(0, chars.length)
    ];
  }

  return `${prefix}-${random}`;
}

function hashCode(code) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(code.trim().toUpperCase())
    .digest("hex");
}

function participation(voted, total) {
  if (total === 0) return 0;

  return Number(
    ((voted / total) * 100).toFixed(2)
  );
}

async function main() {
  console.log("==============================");
  console.log("MEMBUAT BASELINE DEMO BERSIH");
  console.log("==============================");

  // Perlindungan agar tidak menimpa data yang sudah ada.
  const existingVoters = await db
    .collection("voters")
    .where("electionId", "==", ELECTION_ID)
    .get();

  const existingVotes = await db
    .collection("votes")
    .where("electionId", "==", ELECTION_ID)
    .get();

  if (
    !existingVoters.empty ||
    !existingVotes.empty
  ) {
    throw new Error(
      "Baseline dibatalkan karena voters/votes sudah berisi data."
    );
  }

  const demoVoters = [
    {
      role: "student",
      className: "X.1",
      gender: "L",
      prefix: "S",
    },
    {
      role: "student",
      className: "X.2",
      gender: "P",
      prefix: "S",
    },
    {
      role: "student",
      className: "XI.1",
      gender: "L",
      prefix: "S",
    },
    {
      role: "student",
      className: "XII.1",
      gender: "P",
      prefix: "S",
    },
    {
      role: "teacher",
      className: "Guru",
      gender: "P",
      prefix: "G",
    },
  ];

  const generated = demoVoters.map(
    (voter, index) => {
      const code =
        generateCode(voter.prefix);

      return {
        ...voter,
        label: `DEMO-${index + 1}`,
        code,
        codeHash: hashCode(code),
      };
    }
  );

  const batch = db.batch();

  // -------------------------
  // VOTERS
  // -------------------------

  generated.forEach((voter) => {
    const ref =
      db.collection("voters").doc();

    batch.set(ref, {
      codeHash: voter.codeHash,
      role: voter.role,
      class: voter.className,
      gender: voter.gender,
      hasVoted: false,
      isActive: true,
      electionId: ELECTION_ID,
    });
  });

  // -------------------------
  // GLOBAL
  // -------------------------

  const totalVoters = generated.length;

  batch.set(
    db.doc(
      `aggregates/${ELECTION_ID}/global/summary`
    ),
    {
      totalVoters,
      totalVoted: 0,
      totalNotVoted: totalVoters,
      participationRate: 0,
      updatedAt:
        admin.firestore.Timestamp.now(),
    }
  );

  // -------------------------
  // ROLE
  // -------------------------

  for (const role of ["student", "teacher"]) {
    const total =
      generated.filter(
        (voter) => voter.role === role
      ).length;

    batch.set(
      db.doc(
        `aggregates/${ELECTION_ID}/roles/${role}`
      ),
      {
        totalVoters: total,
        totalVoted: 0,
        totalNotVoted: total,
        participationRate:
          participation(0, total),
        updatedAt:
          admin.firestore.Timestamp.now(),
      }
    );
  }

  // -------------------------
  // GENDER
  // -------------------------

  for (const gender of ["L", "P"]) {
    const total =
      generated.filter(
        (voter) => voter.gender === gender
      ).length;

    batch.set(
      db.doc(
        `aggregates/${ELECTION_ID}/gender/${gender}`
      ),
      {
        totalVoters: total,
        totalVoted: 0,
        totalNotVoted: total,
        participationRate:
          participation(0, total),
        updatedAt:
          admin.firestore.Timestamp.now(),
      }
    );
  }

  // -------------------------
  // CLASS
  // -------------------------

  const classes = [
    ...new Set(
      generated.map(
        (voter) => voter.className
      )
    ),
  ];

  classes.forEach((className) => {
    const total =
      generated.filter(
        (voter) =>
          voter.className === className
      ).length;

    batch.set(
      db.doc(
        `aggregates/${ELECTION_ID}/classes/${className}`
      ),
      {
        totalVoters: total,
        totalVoted: 0,
        totalNotVoted: total,
        participationRate: 0,
        updatedAt:
          admin.firestore.Timestamp.now(),
      }
    );
  });

  // -------------------------
  // CANDIDATE AGGREGATES
  // -------------------------

  for (const candidateId of [
    "candidate-001",
    "candidate-002",
    "candidate-003",
  ]) {
    batch.set(
      db.doc(
        `aggregates/${ELECTION_ID}/candidates/${candidateId}`
      ),
      {
        totalVotes: 0,
        updatedAt:
          admin.firestore.Timestamp.now(),
      }
    );
  }

  await batch.commit();

  // Simpan kode HANYA ke file lokal.
  const codeFile = path.join(
    __dirname,
    "demo-voter-codes.local.json"
  );

  const safeOutput = generated.map(
    (voter) => ({
      label: voter.label,
      code: voter.code,
      role: voter.role,
      class: voter.className,
      gender: voter.gender,
    })
  );

  fs.writeFileSync(
    codeFile,
    JSON.stringify(
      safeOutput,
      null,
      2
    )
  );

  console.log("");
  console.log("BASELINE_DEMO_BERHASIL");
  console.log("Total voter : 5");
  console.log("Siswa       : 4");
  console.log("Guru        : 1");
  console.log("Sudah vote  : 0");
  console.log("Belum vote  : 5");

  console.log("");
  console.log(
    "Kode demo disimpan lokal di:"
  );

  console.log(
    "demo-voter-codes.local.json"
  );

  console.log("");
  console.log(
    "JANGAN commit/share file kode tersebut."
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("");
  console.error("BASELINE_DEMO_GAGAL");
  console.error("ERROR:", error.message);
  process.exit(1);
});