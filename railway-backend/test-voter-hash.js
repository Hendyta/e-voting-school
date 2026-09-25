require("dotenv").config({
  path: require("path").join(__dirname, "../functions/.env.local"),
});

const crypto = require("crypto");
const { db } = require("./firebase-admin");

function normalizeVoterCode(code) {
  return String(code || "").trim().toUpperCase();
}

function hashVoterCode(code) {
  return crypto
    .createHmac(
      "sha256",
      process.env.VOTER_CODE_HMAC_SECRET
    )
    .update(normalizeVoterCode(code))
    .digest("hex");
}

async function main() {
  const code = process.argv[2];

  if (!code) {
    console.log("Masukkan kode voter.");
    process.exit(1);
  }

  const hash = hashVoterCode(code);

  const snapshot = await db
    .collection("voters")
    .where("codeHash", "==", hash)
    .limit(1)
    .get();

  console.log(
    snapshot.empty
      ? "VOTER_TIDAK_DITEMUKAN"
      : "VOTER_DITEMUKAN"
  );

  process.exit(0);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});