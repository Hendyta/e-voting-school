const { Timestamp } = require("firebase-admin/firestore");

function createSubmitVoteRoute({ admin, db }) {
  async function verifyAuthenticatedUser(request) {
    const authorizationHeader =
      request.headers.authorization;

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      const error = new Error(
        "Token autentikasi tidak ditemukan."
      );
      error.statusCode = 401;
      throw error;
    }

    const idToken =
      authorizationHeader.slice(7).trim();

    if (!idToken) {
      const error = new Error(
        "Token autentikasi tidak ditemukan."
      );
      error.statusCode = 401;
      throw error;
    }

    try {
      return await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      const authError = new Error(
        "Token autentikasi tidak valid."
      );
      authError.statusCode = 401;
      throw authError;
    }
  }

  async function getAuthenticatedVoter(request) {
    const decodedToken =
      await verifyAuthenticatedUser(request);

    const voterRef = db
      .collection("voters")
      .doc(decodedToken.uid);

    const voterDoc = await voterRef.get();

    if (!voterDoc.exists) {
      const error = new Error(
        "Data voter tidak ditemukan."
      );
      error.statusCode = 403;
      throw error;
    }

    const voterData = voterDoc.data();

    if (voterData.isActive !== true) {
      const error = new Error("Voter tidak aktif.");
      error.statusCode = 403;
      throw error;
    }

    if (
      typeof decodedToken.electionId !== "string" ||
      !decodedToken.electionId
    ) {
      const error = new Error(
        "Token voter tidak memiliki election yang valid."
      );
      error.statusCode = 403;
      throw error;
    }

    if (
      voterData.electionId !== decodedToken.electionId
    ) {
      const error = new Error(
        "Election voter tidak sesuai."
      );
      error.statusCode = 403;
      throw error;
    }

        if (
      typeof decodedToken.role !== "string" ||
      voterData.role !== decodedToken.role
    ) {
      const error = new Error(
        "Role voter tidak sesuai."
      );
      error.statusCode = 403;
      throw error;
    }

    return {
      decodedToken,
      voterDoc,
      voterData,
    };
  }

  async function getEligibleVoter(request) {
    const authenticatedVoter =
      await getAuthenticatedVoter(request);

    if (
      authenticatedVoter.voterData.hasVoted === true
    ) {
      const error = new Error(
        "Voter sudah melakukan voting."
      );
      error.statusCode = 403;
      throw error;
    }

    return authenticatedVoter;
  }

  return async function submitVote(request, response) {
    try {const {
        decodedToken,
        voterDoc,
        voterData,
      } = await getEligibleVoter(request);

      const candidateId = String(
        request.body?.candidateId || ""
      ).trim();

      if (!candidateId) {
        response.status(400).json({
          success: false,
          message: "Kandidat wajib dipilih.",
        });
        return;
      }

      const candidateIdPattern =
        /^candidate-\d{3}$/;

      if (!candidateIdPattern.test(candidateId)) {
        response.status(400).json({
          success: false,
          message: "ID kandidat tidak valid.",
        });
        return;
      }

      const voterRef = voterDoc.ref;

      const candidateRef = db
        .collection("candidates")
        .doc(candidateId);

      const voteRef = db
        .collection("votes")
        .doc();

      await db.runTransaction(async (transaction) => {
        const freshVoterDoc =
          await transaction.get(voterRef);

        if (!freshVoterDoc.exists) {
          const error =
            new Error("Data voter tidak ditemukan.");
          error.statusCode = 403;
          throw error;
        }

        const freshVoterData =
          freshVoterDoc.data();

        if (freshVoterData.isActive !== true) {
          const error =
            new Error("Voter tidak aktif.");
          error.statusCode = 403;
          throw error;
        }

        if (
          typeof freshVoterData.electionId !== "string" ||
          !/^election-\d{4}$/.test(freshVoterData.electionId)
        ) {
          const error =
            new Error("Election ID voter tidak valid.");
          error.statusCode = 500;
          throw error;
        }

        if (
          freshVoterData.role !== decodedToken.role
        ) {
          const error =
            new Error("Role voter tidak sesuai.");
          error.statusCode = 403;
          throw error;
        }

        const electionRef = db
          .collection("elections")
          .doc(freshVoterData.electionId);

        const candidateAggregateRef = db
          .collection("aggregates")
          .doc(freshVoterData.electionId)
          .collection("candidates")
          .doc(candidateId);

        const globalAggregateRef = db
          .collection("aggregates")
          .doc(freshVoterData.electionId)
          .collection("global")
          .doc("summary");

        const allowedRoles = ["student", "teacher"];
        const allowedGenders = ["L", "P"];
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
        ]


        if (!allowedRoles.includes(freshVoterData.role)) {
          const error = new Error("Role voter tidak valid.");
          error.statusCode = 500;
          throw error;
        }

        if (!allowedGenders.includes(freshVoterData.gender)) {
          const error = new Error("Gender voter tidak valid.");
          error.statusCode = 500;
          throw error;
          }

        if (
          freshVoterData.role === "student" &&
          !allowedStudentClasses.includes(freshVoterData.class)
        ) {
          const error =
            new Error("Kelas siswa tidak valid.");
          error.statusCode = 500;
          throw error;
        }

        if (
          freshVoterData.role === "teacher" &&
          freshVoterData.class !== "Guru"
        ) {
          const error =
            new Error("Data kelas guru tidak valid.");
          error.statusCode = 500;
          throw error;
        }

        const roleAggregateRef = db
          .collection("aggregates")
          .doc(freshVoterData.electionId)
          .collection("roles")
          .doc(freshVoterData.role);

        const genderAggregateRef = db
          .collection("aggregates")
          .doc(freshVoterData.electionId)
          .collection("gender")
          .doc(freshVoterData.gender);

        const classAggregateRef = db
          .collection("aggregates")
          .doc(freshVoterData.electionId)
          .collection("classes")
          .doc(freshVoterData.class);

        if (freshVoterData.hasVoted === true) {
          const error =
            new Error("Voter sudah melakukan voting.");
          error.statusCode = 403;
          throw error;
        }

        const candidateDoc =
          await transaction.get(candidateRef);

        if (!candidateDoc.exists) {
          const error =
            new Error("Kandidat tidak ditemukan.");
          error.statusCode = 400;
          throw error;
        }

        const candidateData =
          candidateDoc.data();

        if (candidateData.isActive !== true) {
          const error =
            new Error("Kandidat tidak aktif.");
          error.statusCode = 400;
          throw error;
        }

        if (
          candidateData.electionId !==
          freshVoterData.electionId
        ) {
          const error =
            new Error("Kandidat tidak sesuai election.");
          error.statusCode = 400;
          throw error;
        }

        const electionDoc =
          await transaction.get(electionRef);

        const candidateAggregateDoc =
          await transaction.get(candidateAggregateRef);

        const globalAggregateDoc =
          await transaction.get(globalAggregateRef);

        const roleAggregateDoc =
          await transaction.get(roleAggregateRef);

        const genderAggregateDoc =
          await transaction.get(genderAggregateRef);

        const classAggregateDoc =
          await transaction.get(classAggregateRef);

        if (!electionDoc.exists) {
          const error =
            new Error("Election tidak ditemukan.");
          error.statusCode = 400;
          throw error;
        }

        if (!candidateAggregateDoc.exists) {
          const error =
            new Error("Aggregate kandidat tidak ditemukan.");
          error.statusCode = 500;
          throw error;
        }

        if (!globalAggregateDoc.exists) {
          const error =
            new Error("Aggregate global tidak ditemukan.");
          error.statusCode = 500;
          throw error;
        }

        if (!roleAggregateDoc.exists) {
          const error =
            new Error("Aggregate role tidak ditemukan.");
          error.statusCode = 500;
          throw error;
        }

        if (!genderAggregateDoc.exists) {
          const error =
            new Error("Aggregate gender tidak ditemukan.");
          error.statusCode = 500;
          throw error;
        }

        if (!classAggregateDoc.exists) {
          const error =
            new Error("Aggregate kelas tidak ditemukan.");
          error.statusCode = 500;
          throw error;
        }

        const roleAggregateData =
          roleAggregateDoc.data();

        const genderAggregateData =
          genderAggregateDoc.data();

        const classAggregateData =
          classAggregateDoc.data();

        const classTotalVoters =
          Number(classAggregateData.totalVoters);

        const currentClassVoted =
          Number(classAggregateData.totalVoted);

        const currentClassNotVoted =
          Number(classAggregateData.totalNotVoted);

        if (
          !Number.isInteger(classTotalVoters) ||
          classTotalVoters < 0 ||
          !Number.isInteger(currentClassVoted) ||
          currentClassVoted < 0 ||
          !Number.isInteger(currentClassNotVoted) ||
          currentClassNotVoted < 0
        ) {
          const error =
            new Error("Data aggregate kelas tidak valid.");
          error.statusCode = 500;
          throw error;
        }

        if (
          currentClassVoted +
            currentClassNotVoted !==
          classTotalVoters
        ) {
          const error =
            new Error("Aggregate kelas tidak konsisten.");
          error.statusCode = 500;
          throw error;
        }

        const newClassVoted =
          currentClassVoted + 1;

        const newClassNotVoted =
          currentClassNotVoted - 1;

        if (newClassNotVoted < 0) {
          const error =
            new Error("Aggregate kelas tidak valid.");
          error.statusCode = 500;
          throw error;
        }

        const newClassParticipationRate =
          classTotalVoters > 0
            ? Number(
                (
                  (newClassVoted / classTotalVoters) *
                  100
                ).toFixed(2)
              )
            : 0;

        const genderTotalVoters =
          Number(genderAggregateData.totalVoters);

        const currentGenderVoted =
          Number(genderAggregateData.totalVoted);

        const currentGenderNotVoted =
          Number(genderAggregateData.totalNotVoted);

        if (
          !Number.isInteger(genderTotalVoters) ||
          genderTotalVoters < 0 ||
          !Number.isInteger(currentGenderVoted) ||
          currentGenderVoted < 0 ||
          !Number.isInteger(currentGenderNotVoted) ||
          currentGenderNotVoted < 0
        ) {
          const error =
            new Error("Data aggregate gender tidak valid.");
          error.statusCode = 500;
          throw error;
        }

        if (
          currentGenderVoted +
            currentGenderNotVoted !==
          genderTotalVoters
        ) {
          const error =
            new Error("Aggregate gender tidak konsisten.");
          error.statusCode = 500;
          throw error;
        }

        const newGenderVoted =
          currentGenderVoted + 1;

        const newGenderNotVoted =
          currentGenderNotVoted - 1;

        if (newGenderNotVoted < 0) {
          const error =
            new Error("Aggregate gender tidak valid.");
          error.statusCode = 500;
          throw error;
        }

        const newGenderParticipationRate =
          genderTotalVoters > 0
            ? Number(
                (
                  (newGenderVoted / genderTotalVoters) *
                  100
                ).toFixed(2)
              )
            : 0;

        const roleTotalVoters =
          Number(roleAggregateData.totalVoters);

        const currentRoleVoted =
          Number(roleAggregateData.totalVoted);

        const currentRoleNotVoted =
          Number(roleAggregateData.totalNotVoted);

        if (
          !Number.isInteger(roleTotalVoters) ||
          roleTotalVoters < 0 ||
          !Number.isInteger(currentRoleVoted) ||
          currentRoleVoted < 0 ||
          !Number.isInteger(currentRoleNotVoted) ||
          currentRoleNotVoted < 0
        ) {
          const error =
            new Error("Data aggregate role tidak valid.");
          error.statusCode = 500;
          throw error;
        }

        if (
          currentRoleVoted +
            currentRoleNotVoted !==
          roleTotalVoters
        ) {
          const error =
            new Error("Aggregate role tidak konsisten.");
          error.statusCode = 500;
          throw error;
        }

        const newRoleVoted =
          currentRoleVoted + 1;

        const newRoleNotVoted =
          currentRoleNotVoted - 1;

        if (newRoleNotVoted < 0) {
          const error =
            new Error("Aggregate role tidak valid.");
          error.statusCode = 500;
          throw error;
        }

        const newRoleParticipationRate =
          roleTotalVoters > 0
            ? Number(
                (
                  (newRoleVoted / roleTotalVoters) *
                  100
                ).toFixed(2)
              )
            : 0;

        const electionData =
        electionDoc.data();

      if (typeof electionData.status !== "string") {
        const error =
          new Error("Status election tidak valid.");
        error.statusCode = 500;
        throw error;
      }

      if (
        !electionData.startAt ||
        typeof electionData.startAt.toMillis !== "function"
      ) {
        const error =
          new Error("Waktu mulai election tidak valid.");
        error.statusCode = 500;
        throw error;
      }

      if (
        !electionData.endAt ||
        typeof electionData.endAt.toMillis !== "function"
      ) {
        const error =
          new Error("Waktu selesai election tidak valid.");
        error.statusCode = 500;
        throw error;
      }

      if (
        electionData.startAt.toMillis() >=
        electionData.endAt.toMillis()
      ) {
        const error =
          new Error("Rentang waktu election tidak valid.");
        error.statusCode = 500;
        throw error;
      }

      if (electionData.status !== "active") {
        const error =
          new Error("Voting belum atau tidak sedang berlangsung.");
        error.statusCode = 403;
        throw error;
      }

      if (
        !electionData.startAt ||
        !electionData.endAt
      ) {
        const error =
          new Error("Jadwal voting belum dikonfigurasi.");
        error.statusCode = 403;
        throw error;
      }

      const currentTime =
        Timestamp.now();

      if (
        currentTime.toMillis() <
        electionData.startAt.toMillis()
      ) {
        const error =
          new Error("Voting belum dimulai.");
        error.statusCode = 403;
        throw error;
      }

      if (
        currentTime.toMillis() >
        electionData.endAt.toMillis()
      ) {
        const error =
          new Error("Voting sudah berakhir.");
        error.statusCode = 403;
        throw error;
      }

      const candidateAggregateData =
        candidateAggregateDoc.data();

      const currentCandidateVotes =
        Number(
          candidateAggregateData.totalVotes || 0
        );

      if (
        !Number.isInteger(currentCandidateVotes) ||
        currentCandidateVotes < 0
      ) {
        const error =
          new Error(
            "Data aggregate kandidat tidak valid."
          );
        error.statusCode = 500;
        throw error;
      }

      const globalAggregateData =
        globalAggregateDoc.data();

      const totalVoters =
        Number(globalAggregateData.totalVoters);

      const currentTotalVoted =
        Number(globalAggregateData.totalVoted);

      const currentTotalNotVoted =
        Number(globalAggregateData.totalNotVoted);

      if (
        !Number.isInteger(totalVoters) ||
        totalVoters < 0 ||
        !Number.isInteger(currentTotalVoted) ||
        currentTotalVoted < 0 ||
        !Number.isInteger(currentTotalNotVoted) ||
        currentTotalNotVoted < 0
      ) {
        const error =
          new Error("Data aggregate global tidak valid.");
        error.statusCode = 500;
        throw error;
      }

      if (
        currentTotalVoted +
          currentTotalNotVoted !==
        totalVoters
      ) {
        const error =
          new Error("Aggregate global tidak konsisten.");
        error.statusCode = 500;
        throw error;
      }

      const newTotalVoted =
        currentTotalVoted + 1;

      const newTotalNotVoted =
        currentTotalNotVoted - 1;

      if (newTotalNotVoted < 0) {
        const error =
          new Error("Aggregate global tidak valid.");
        error.statusCode = 500;
        throw error;
      }

      const newParticipationRate =
        totalVoters > 0
          ? Number(
              (
                (newTotalVoted / totalVoters) *
                100
              ).toFixed(2)
            )
          : 0;

        const voteTimestamp =
          currentTime;

        transaction.set(voteRef, {
          electionId: freshVoterData.electionId,
          candidateId,
          createdAt: voteTimestamp,
        });

        transaction.update(voterRef, {
          hasVoted: true,
          updatedAt: voteTimestamp,
        });

        transaction.update(
          candidateAggregateRef,
          {
            totalVotes:
              currentCandidateVotes + 1,
            updatedAt: voteTimestamp,
          }
        );

        transaction.update(
          globalAggregateRef,
          {
            totalVoted: newTotalVoted,
            totalNotVoted: newTotalNotVoted,
            participationRate:
              newParticipationRate,
            updatedAt: voteTimestamp,
          }
        );

        transaction.update(
          roleAggregateRef,
          {
            totalVoted: newRoleVoted,
            totalNotVoted: newRoleNotVoted,
            participationRate:
              newRoleParticipationRate,
            updatedAt: voteTimestamp,
          }
        );

        transaction.update(
          genderAggregateRef,
          {
            totalVoted: newGenderVoted,
            totalNotVoted: newGenderNotVoted,
            participationRate:
              newGenderParticipationRate,
            updatedAt: voteTimestamp,
          }
        );

        transaction.update(
          classAggregateRef,
          {
            totalVoted: newClassVoted,
            totalNotVoted: newClassNotVoted,
            participationRate:
              newClassParticipationRate,
            updatedAt: voteTimestamp,
          }
        );

      });

      response.status(200).json({
        success: true,
        message: "Voting berhasil disimpan.",
      });
    } catch (error) {
      console.error(
        "Submit vote error:",
        error.message
      );

      response
        .status(error.statusCode || 500)
        .json({
          success: false,
          message:
            error.statusCode
              ? error.message
              : "Terjadi kesalahan pada server.",
        });
    }
  };
}

module.exports = createSubmitVoteRoute;
