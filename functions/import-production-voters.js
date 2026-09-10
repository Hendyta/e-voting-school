const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");


// =========================================
// SAFETY: EMULATOR ONLY
// =========================================

const EMULATOR_HOST =
  "127.0.0.1:8080";

process.env.FIRESTORE_EMULATOR_HOST =
  EMULATOR_HOST;


// =========================================
// FIREBASE
// =========================================

admin.initializeApp({
  projectId: "e-voting-school-2026",
});

const db = admin.firestore();


// =========================================
// CONFIG
// =========================================

const ELECTION_ID =
  "election-2026";

const ALLOWED_ROLES = [
  "student",
  "teacher",
];

const ALLOWED_GENDERS = [
  "L",
  "P",
];

const ALLOWED_STUDENT_CLASSES = [
  "X.1",
  "X.2",
  "X.3",
  "X.4",
  "X.5",
  "X.6",
  "X.7",
  "X.8",
  "X.9",
  "X.10",

  "XI.1",
  "XI.2",
  "XI.3",
  "XI.4",
  "XI.5",
  "XI.6",
  "XI.7",
  "XI.8",
  "XI.9",
  "XI.10",

  "XII.1",
  "XII.2",
  "XII.3",
  "XII.4",
  "XII.5",
  "XII.6",
  "XII.7",
  "XII.8",
  "XII.9",
  "XII.10",
  "XII.11",
];

const INPUT_FILE =
  path.join(
    __dirname,
    "voters-production-firestore.json"
  );


// =========================================
// HELPERS
// =========================================

function assertEmulator() {

  if (
    process.env.FIRESTORE_EMULATOR_HOST !==
    EMULATOR_HOST
  ) {
    throw new Error(
      "IMPORT DIBATALKAN: script ini hanya boleh berjalan di Firestore Emulator."
    );
  }
}


function loadVoters() {

  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(
      "voters-production-firestore.json tidak ditemukan."
    );
  }

  const raw =
    fs.readFileSync(
      INPUT_FILE,
      "utf8"
    );

  const voters =
    JSON.parse(raw);

  if (
    !Array.isArray(voters) ||
    voters.length === 0
  ) {
    throw new Error(
      "Data voter kosong atau format JSON tidak valid."
    );
  }

  return voters;
}


// =========================================
// VALIDATION
// =========================================

function validateVoters(voters) {

  const ids =
    new Set();

  const hashes =
    new Set();

  for (const voter of voters) {

    if (
      !voter ||
      typeof voter !== "object" ||
      !voter.id ||
      !voter.data
    ) {
      throw new Error(
        "Struktur voter tidak valid."
      );
    }


    if (ids.has(voter.id)) {
      throw new Error(
        `Voter ID duplikat: ${voter.id}`
      );
    }

    ids.add(voter.id);


    if (!voter.data.codeHash) {
      throw new Error(
        `codeHash kosong: ${voter.id}`
      );
    }


    if (
      hashes.has(
        voter.data.codeHash
      )
    ) {
      throw new Error(
        `codeHash duplikat: ${voter.id}`
      );
    }

    hashes.add(
      voter.data.codeHash
    );


    if (
      voter.data.electionId !==
      ELECTION_ID
    ) {
      throw new Error(
        `electionId tidak valid: ${voter.id}`
      );
    }


    if (
      voter.data.hasVoted !==
      false
    ) {
      throw new Error(
        `hasVoted harus false: ${voter.id}`
      );
    }

    if (
      !ALLOWED_ROLES.includes(
        voter.data.role
      )
    ) {
      throw new Error(
        `Role tidak valid: ${voter.id}`
      );
    }


    if (
      !ALLOWED_GENDERS.includes(
        voter.data.gender
      )
    ) {
      throw new Error(
        `Gender tidak valid: ${voter.id}`
      );
    }


    if (
      voter.data.role === "student" &&
      !ALLOWED_STUDENT_CLASSES.includes(
        voter.data.class
      )
    ) {
      throw new Error(
        `Kelas siswa tidak valid: ${voter.id}`
      );
    }


    if (
      voter.data.role === "teacher" &&
      voter.data.class !== "Guru"
    ) {
      throw new Error(
        `Kelas guru harus Guru: ${voter.id}`
      );
    }


    if (
      typeof voter.data.isActive !==
      "boolean"
    ) {
      throw new Error(
        `isActive harus boolean: ${voter.id}`
      );
    }


    if (
      typeof voter.data.codeHash !==
        "string" ||
      !/^[a-f0-9]{64}$/.test(
        voter.data.codeHash
      )
    ) {
      throw new Error(
        `Format codeHash tidak valid: ${voter.id}`
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        voter.data,
        "name"
      )
    ) {
      throw new Error(
        `Field name tidak boleh masuk Firestore production: ${voter.id}`
      );
    }
  }
}

async function ensureVotersDoNotExist(
  voters
) {

  for (const voter of voters) {

    const existingDoc =
      await db
        .collection("voters")
        .doc(voter.id)
        .get();


    if (existingDoc.exists) {

      throw new Error(
        `Import dibatalkan. Voter sudah ada: ${voter.id}`
      );
    }
  }
}


// =========================================
// BUILD AGGREGATES
// =========================================

function buildAggregateMap(voters) {

  const aggregate = {
    global: {
      totalVoters: 0,
      totalVoted: 0,
      totalNotVoted: 0,
    },

    roles: {},
    gender: {},
    classes: {},
  };


  for (const voter of voters) {

    if (
      voter.data.isActive !== true
    ) {
      continue;
    }


    aggregate.global.totalVoters += 1;
    aggregate.global.totalNotVoted += 1;


    const role =
      voter.data.role;

    const gender =
      voter.data.gender;

    const voterClass =
      voter.data.class;


    if (!aggregate.roles[role]) {
      aggregate.roles[role] = {
        totalVoters: 0,
        totalVoted: 0,
        totalNotVoted: 0,
      };
    }

    aggregate.roles[role]
      .totalVoters += 1;

    aggregate.roles[role]
      .totalNotVoted += 1;


    if (!aggregate.gender[gender]) {
      aggregate.gender[gender] = {
        totalVoters: 0,
        totalVoted: 0,
        totalNotVoted: 0,
      };
    }

    aggregate.gender[gender]
      .totalVoters += 1;

    aggregate.gender[gender]
      .totalNotVoted += 1;


    if (!aggregate.classes[voterClass]) {
      aggregate.classes[voterClass] = {
        totalVoters: 0,
        totalVoted: 0,
        totalNotVoted: 0,
      };
    }

    aggregate.classes[voterClass]
      .totalVoters += 1;

    aggregate.classes[voterClass]
      .totalNotVoted += 1;
  }


  return aggregate;
}


function withRate(data) {

  return {
    ...data,
    participationRate: 0.0,
  };
}


// =========================================
// IMPORT
// =========================================

async function importData() {

  assertEmulator();

  const voters =
    loadVoters();

  validateVoters(voters);

  await ensureVotersDoNotExist(
    voters
  );

  const aggregate =
    buildAggregateMap(voters);

  const activeVoterCount =
    voters.filter(
        (voter) =>
        voter.data.isActive === true
    ).length;


  if (
    aggregate.global.totalVoters !==
    activeVoterCount
  ) {
    throw new Error(
        "Perhitungan total voter aktif tidak konsisten."
    );
  }


  if (
    aggregate.global.totalVoted !==
    0
  ) {
    throw new Error(
        "Baseline totalVoted harus 0."
    );
  }


  if (
    aggregate.global.totalNotVoted !==
    activeVoterCount
  ) {
    throw new Error(
        "Baseline totalNotVoted tidak konsisten."
    );
  }

  console.log(
    `Data tervalidasi: ${voters.length} voter.`
  );

  console.log(
    "Target: FIRESTORE EMULATOR ONLY."
  );


  const now =
    admin.firestore.Timestamp.now();


  // -------------------------
  // VOTERS
  // -------------------------

  for (const voter of voters) {

    await db
      .collection("voters")
      .doc(voter.id)
      .set({
        ...voter.data,
        createdAt: now,
        updatedAt: now,
      });
  }


  // -------------------------
  // AGGREGATE PARENT
  // -------------------------

  const aggregateRef =
    db
      .collection("aggregates")
      .doc(ELECTION_ID);


  await aggregateRef.set({
    updatedAt: now,
  });


  // -------------------------
  // GLOBAL
  // -------------------------

  await aggregateRef
    .collection("global")
    .doc("summary")
    .set({
      ...withRate(
        aggregate.global
      ),
      updatedAt: now,
    });


  // -------------------------
  // ROLES
  // -------------------------

  for (
    const [role, data]
    of Object.entries(
      aggregate.roles
    )
  ) {

    await aggregateRef
      .collection("roles")
      .doc(role)
      .set({
        ...withRate(data),
        updatedAt: now,
      });
  }


  // -------------------------
  // GENDER
  // -------------------------

  for (
    const [gender, data]
    of Object.entries(
      aggregate.gender
    )
  ) {

    await aggregateRef
      .collection("gender")
      .doc(gender)
      .set({
        ...withRate(data),
        updatedAt: now,
      });
  }


  // -------------------------
  // CLASSES
  // -------------------------

  for (
    const [className, data]
    of Object.entries(
      aggregate.classes
    )
  ) {

    await aggregateRef
      .collection("classes")
      .doc(className)
      .set({
        ...withRate(data),
        updatedAt: now,
      });
  }


  console.log(
    "Import voter + baseline aggregate emulator berhasil."
  );

  console.log(
    `Active voters: ${aggregate.global.totalVoters}`
  );
}


importData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {

    console.error(
      "Import gagal:"
    );

    console.error(
      error.message
    );

    process.exit(1);
  });