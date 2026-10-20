const { db } = require("./firebase-admin");

async function restoreBaselineAggregates() {
  try {
    console.log("Mengembalikan aggregate ke baseline 31 voter...");

    const globalRef = db.collection("aggregates").doc("global");

    await globalRef.set({
      totalVoters: 31,
      totalVoted: 31,
      totalNotVoted: 0,
      participationRate: 100,
      updatedAt: new Date()
    }, { merge: true });

    console.log("Berhasil mengembalikan aggregates/global ke baseline.");
    process.exit(0);
  } catch (error) {
    console.error("Gagal mengembalikan aggregate baseline:", error);
    process.exit(1);
  }
}

restoreBaselineAggregates();