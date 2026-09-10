const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

require("dotenv").config({
  path: path.join(__dirname, ".env.local"),
});

const SOURCE_FILE = path.join(
  __dirname,
  "voters-production-source.csv"
);

const OUTPUT_FIRESTORE_FILE = path.join(
  __dirname,
  "voters-production-firestore.json"
);

const OUTPUT_CODES_FILE = path.join(
  __dirname,
  "voters-production-codes.csv"
);

function ensureOutputFilesDoNotExist() {

  const existingFiles = [];

  if (
    fs.existsSync(
      OUTPUT_FIRESTORE_FILE
    )
  ) {
    existingFiles.push(
      "voters-production-firestore.json"
    );
  }

  if (
    fs.existsSync(
      OUTPUT_CODES_FILE
    )
  ) {
    existingFiles.push(
      "voters-production-codes.csv"
    );
  }

  if (existingFiles.length > 0) {

    throw new Error(
      "File output production sudah ada: " +
      existingFiles.join(", ") +
      ". Hapus atau arsipkan file tersebut secara sengaja sebelum membuat kode baru."
    );
  }
}

const ELECTION_ID = "election-2026";

const allowedRoles = [
  "student",
  "teacher",
];

const allowedGenders = [
  "L",
  "P",
];

const allowedStudentClasses = [
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


function normalize(value) {
  return String(value ?? "").trim();
}


function normalizeCode(code) {
  return String(code ?? "")
    .trim()
    .toUpperCase();
}


function hashVoterCode(code) {

  const secret =
    process.env.VOTER_CODE_HMAC_SECRET;

  if (!secret) {
    throw new Error(
      "VOTER_CODE_HMAC_SECRET tidak tersedia."
    );
  }

  return crypto
    .createHmac(
      "sha256",
      secret
    )
    .update(
      normalizeCode(code)
    )
    .digest("hex");
}


function generateRandomPart(length = 6) {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < length; i += 1) {

    const randomIndex =
      crypto.randomInt(
        0,
        chars.length
      );

    result +=
      chars[randomIndex];
  }

  return result;
}


function generateVoterCode(role) {

  const prefix =
    role === "teacher"
      ? "G"
      : "S";

  return `${prefix}-${generateRandomPart(6)}`;
}


function parseCsvLine(line) {

  const values = [];

  let current = "";
  let insideQuotes = false;

  for (
    let i = 0;
    i < line.length;
    i += 1
  ) {

    const char = line[i];

    if (char === '"') {

      if (
        insideQuotes &&
        line[i + 1] === '"'
      ) {

        current += '"';
        i += 1;

      } else {

        insideQuotes =
          !insideQuotes;
      }

      continue;
    }

    if (
      char === "," &&
      !insideQuotes
    ) {

      values.push(current);

      current = "";

      continue;
    }

    current += char;
  }

  values.push(current);

  return values;
}


function csvEscape(value) {

  const text =
    String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {

    return `"${text.replaceAll(
      '"',
      '""'
    )}"`;
  }

  return text;
}


function main() {

  if (
    !fs.existsSync(SOURCE_FILE)
  ) {

    throw new Error(
      "File voters-production-source.csv tidak ditemukan."
    );
  }

  ensureOutputFilesDoNotExist();


  const raw =
    fs.readFileSync(
      SOURCE_FILE,
      "utf8"
    )
      .replace(/^\uFEFF/, "")
      .trim();


  if (!raw) {

    throw new Error(
      "File CSV kosong."
    );
  }


  const lines =
    raw
      .split(/\r?\n/)
      .filter(
        (line) =>
          line.trim() !== ""
      );


  const headers =
    parseCsvLine(lines[0])
      .map(
        (item) =>
          normalize(item)
      );


  const expectedHeaders = [
    "name",
    "role",
    "class",
    "gender",
    "isActive",
  ];


  if (
    headers.join(",") !==
    expectedHeaders.join(",")
  ) {

    throw new Error(
      `Header CSV harus persis: ${expectedHeaders.join(",")}`
    );
  }


  const rows = [];

  for (
    let i = 1;
    i < lines.length;
    i += 1
  ) {

    const values =
      parseCsvLine(lines[i]);

    if (
      values.length !==
      expectedHeaders.length
    ) {

      throw new Error(
        `Baris ${i + 1}: jumlah kolom tidak sesuai.`
      );
    }


    const row = {};

    expectedHeaders.forEach(
      (header, index) => {

        row[header] =
          normalize(values[index]);
      }
    );


    rows.push({
      rowNumber: i + 1,
      ...row,
    });
  }


  if (rows.length === 0) {

    throw new Error(
      "Belum ada data voter di CSV."
    );
  }


  const usedCodes =
    new Set();

  const firestoreOutput = [];

  const codesOutput = [];


  rows.forEach(
    (row, index) => {

      const {
        rowNumber,
        name,
        role,
        class: voterClass,
        gender,
        isActive,
      } = row;


      if (!name) {

        throw new Error(
          `Baris ${rowNumber}: nama wajib diisi.`
        );
      }


      if (
        !allowedRoles.includes(role)
      ) {

        throw new Error(
          `Baris ${rowNumber}: role harus student atau teacher.`
        );
      }


      if (
        !allowedGenders.includes(
          gender
        )
      ) {

        throw new Error(
          `Baris ${rowNumber}: gender harus L atau P.`
        );
      }


      if (
        role === "student" &&
        !allowedStudentClasses.includes(
          voterClass
        )
      ) {

        throw new Error(
          `Baris ${rowNumber}: kelas siswa tidak valid.`
        );
      }


      if (
        role === "teacher" &&
        voterClass !== "Guru"
      ) {

        throw new Error(
          `Baris ${rowNumber}: kelas guru harus Guru.`
        );
      }


      if (
        !["true", "false"].includes(
          isActive.toLowerCase()
        )
      ) {

        throw new Error(
          `Baris ${rowNumber}: isActive harus true atau false.`
        );
      }


      let voterCode;

      do {

        voterCode =
          generateVoterCode(role);

      } while (
        usedCodes.has(voterCode)
      );


      usedCodes.add(
        voterCode
      );


      const voterId =
        `voter-${String(
          index + 1
        ).padStart(4, "0")}`;


      const codeHash =
        hashVoterCode(voterCode);


      firestoreOutput.push({
        id: voterId,
        data: {
            role,
            class: voterClass,
            gender,
            electionId:
            ELECTION_ID,
            codeHash,
            hasVoted: false,
            isActive:
            isActive.toLowerCase() ===
            "true",
        },
      });


      codesOutput.push({
        voterId,
        name,
        role,
        class: voterClass,
        code: voterCode,
      });
    }
  );


  fs.writeFileSync(
    OUTPUT_FIRESTORE_FILE,
    JSON.stringify(
      firestoreOutput,
      null,
      2
    ),
    "utf8"
  );


  const codeHeaders = [
    "voterId",
    "name",
    "role",
    "class",
    "code",
  ];


  const codeCsvLines = [
    codeHeaders.join(","),
    ...codesOutput.map(
      (item) =>
        [
          item.voterId,
          item.name,
          item.role,
          item.class,
          item.code,
        ]
          .map(csvEscape)
          .join(",")
    ),
  ];


  fs.writeFileSync(
    OUTPUT_CODES_FILE,
    codeCsvLines.join("\n"),
    "utf8"
  );


  console.log(
    "Persiapan voter production berhasil."
  );

  console.log(
    `Total voter: ${firestoreOutput.length}`
  );

  console.log(
    "Output Firestore:",
    OUTPUT_FIRESTORE_FILE
  );

  console.log(
    "Output kode:",
    OUTPUT_CODES_FILE
  );
}


try {

  main();

} catch (error) {

  console.error(
    "Gagal menyiapkan voter production:"
  );

  console.error(
    error.message
  );

  process.exit(1);
}