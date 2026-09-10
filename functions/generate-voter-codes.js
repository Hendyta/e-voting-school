const crypto = require("crypto");
const fs = require("fs");

const secret = process.env.VOTER_CODE_HMAC_SECRET;

if (!secret) {
  console.error("VOTER_CODE_HMAC_SECRET tidak ditemukan.");
  process.exit(1);
}

const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRandomPart(length = 6) {
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, characters.length);
    result += characters[randomIndex];
  }

  return result;
}

function generateCode(prefix) {
  return `${prefix}-${generateRandomPart(6)}`;
}

function hashCode(code) {
  return crypto
    .createHmac("sha256", secret)
    .update(code.trim().toUpperCase())
    .digest("hex");
}

const voters = [];

for (let i = 1; i <= 8; i++) {
  const isTeacher = i >= 7;
  const prefix = isTeacher ? "G" : "S";

  const code = generateCode(prefix);

  voters.push({
    voterId: `voter-${String(i).padStart(3, "0")}`,
    code,
    codeHash: hashCode(code),
  });
}

fs.writeFileSync(
  "voter-codes.local.json",
  JSON.stringify(voters, null, 2)
);

console.log("8 kode voter dummy berhasil dibuat.");
console.log("Hasil disimpan di voter-codes.local.json");