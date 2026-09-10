import {
  observeAuthState,
  getVoterIdToken,
} from "./auth.js";

const TEST_AUTH_URL =
  "http://127.0.0.1:5001/e-voting-school-2026/us-central1/testAuthenticatedUser";

observeAuthState(async (user) => {
  if (!user) {
    console.log("User belum login.");
    window.location.replace("/");
    return;
  }

  try {
    const idToken = await getVoterIdToken();

    const response = await fetch(TEST_AUTH_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    const result = await response.json();

    console.log("Response backend:", result);
  } catch (error) {
    console.error("Test backend auth gagal:", error);
  }
});