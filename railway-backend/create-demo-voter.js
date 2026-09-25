require("dotenv").config({
  path: require("path").join(__dirname, "../functions/.env.local"),
});

const crypto = require("crypto");
const { db } = require("./firebase-admin");

function generateDemoCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let randomPart = "";

  for (let i = 0; i < 6; i++) {
    randomPart += chars[
      crypto.randomInt(0, chars.length)
    ];
  }

  return `S-${randomPart}`;
}

function hashVoterCode(code) {
  const secret = process.env.VOTER_CODE_HMAC_SECRET;

  if (!secret) {
    throw new Error(
      "VOTER_CODE_HMAC_SECRET belum tersedia."
    );
  }

  return crypto
    .createHmac("sha256", secret)
    .update(code.trim().toUpperCase())
    .digest("hex");
}

async function main() {
  const code = generateDemoCode();
  const codeHash = hashVoterCode(code);

  const voterId = `demo-${crypto.randomUUID()}`;

  await db
    .collection("voters")
    .doc(voterId)
    .set({
      codeHash: codeHash,
      role: "student",
      class: "X.1",
      gender: "L",
      hasVoted: false,
      isActive: true,
      electionId: "election-2026",
    });

  console.log("");
  console.log("================================");
  console.log("VOTER DEMO BERHASIL DIBUAT");
  console.log("================================");
  console.log("Kode demo:", code);
  console.log("Voter ID:", voterId);
  console.log("================================");
  console.log("");
  console.log(
    "Simpan kode ini untuk pengujian besok."
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("Gagal membuat voter demo:", error.message);
  process.exit(1);
});