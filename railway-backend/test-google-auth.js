const { GoogleAuth } = require("google-auth-library");
const path = require("path");

async function main() {
  const keyFile = path.join(
    __dirname,
    "service-account.local.json"
  );

  const auth = new GoogleAuth({
    keyFile,
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
    ],
  });

  console.log("==============================");
  console.log("TEST GOOGLE AUTH");
  console.log("==============================");

  const client = await auth.getClient();

  console.log("Credential berhasil dibaca.");

  const tokenResult =
    await client.getAccessToken();

  if (!tokenResult.token) {
    throw new Error(
      "Google tidak memberikan access token."
    );
  }

  console.log(
    "OAUTH_ACCESS_TOKEN_BERHASIL"
  );

  console.log(
    "Token diterima tanpa menampilkan isi token."
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("");
  console.error("OAUTH_ACCESS_TOKEN_GAGAL");
  console.error(
    "Nama error:",
    error.name
  );
  console.error(
    "Pesan:",
    error.message
  );

  if (error.response?.data) {
    console.error(
      "Respons Google:",
      JSON.stringify(
        error.response.data,
        null,
        2
      )
    );
  }

  process.exit(1);
});