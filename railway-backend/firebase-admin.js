const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const PROJECT_ID = "e-voting-school-2026";

function getFirebaseCredential() {
  // ==========================================
  // MODE 1 — PRODUCTION / HOSTING
  // ==========================================
  // Service account disimpan sebagai environment
  // variable, bukan sebagai file di repository.
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    let serviceAccount;

    try {
      serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      );
    } catch (error) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON bukan JSON yang valid."
      );
    }

    return admin.credential.cert(serviceAccount);
  }

  // ==========================================
  // MODE 2 — LOCAL DEVELOPMENT
  // ==========================================
  const localServiceAccountPath = path.join(
    __dirname,
    "service-account.local.json"
  );

  if (fs.existsSync(localServiceAccountPath)) {
    const serviceAccount = require(
      localServiceAccountPath
    );

    return admin.credential.cert(serviceAccount);
  }

  throw new Error(
    "Firebase Admin credential tidak tersedia."
  );
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: getFirebaseCredential(),
    projectId: PROJECT_ID,
  });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = {
  admin,
  db,
  auth,
};