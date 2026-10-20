const { db } = require("./firebase-admin");

async function activateElectionTemp() {
  try {
    console.log("Mengubah status dan rentang waktu election-2026 untuk testing...");

    const now = new Date();
    const past = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
    const future = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

    await db.collection("elections").doc("election-2026").set({
      status: "active",
      startAt: past,
      endAt: future,
      updatedAt: new Date()
    }, { merge: true });

    console.log("Berhasil! Status ACTIVE dan rentang waktu di-bypass untuk testing.");
    process.exit(0);
  } catch (error) {
    console.error("Gagal mengaktifkan election:", error);
    process.exit(1);
  }
}

activateElectionTemp();