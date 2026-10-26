const loginForm = document.getElementById("loginForm");
const voterCodeInput = document.getElementById("voterCode");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");

let isLoggingIn = false;

function setMessage(text, type = "") {
  message.textContent = text;
  message.classList.remove("success", "error", "loading");
  if (type) {
    message.classList.add(type);
  }
}

function setLoginLoading(isLoading) {
  isLoggingIn = isLoading;
  loginButton.disabled = isLoading;
  voterCodeInput.disabled = isLoading;
  loginButton.textContent = isLoading ? "MEMPROSES..." : "MASUK";
}

// Auto uppercase saat ketik
voterCodeInput.addEventListener("input", () => {
  voterCodeInput.value = voterCodeInput.value.toUpperCase().replace(/\s+/g, "");
  setMessage("");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isLoggingIn) return;

  const code = voterCodeInput.value.trim().toUpperCase();

  if (!code) {
    setMessage("Kode voting wajib diisi.", "error");
    voterCodeInput.focus();
    return;
  }

  try {
    setLoginLoading(true);
    setMessage("Memeriksa kode voting...", "loading");

    // Panggil Endpoint API Backend
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterCode: code })
    });

    const data = await response.json();

    if (data.success) {
      sessionStorage.setItem("voterData", JSON.stringify(data.voter));
      setMessage("Login berhasil. Mengarahkan...", "success");

      setTimeout(() => {
        window.location.href = "./candidates.html";
      }, 800);
    } else {
      setMessage(data.message || "Kode voting tidak valid.", "error");
      setLoginLoading(false);
      voterCodeInput.focus();
    }
  } catch (error) {
    console.error("Login voter gagal:", error);
    setMessage("Terjadi kesalahan koneksi server.", "error");
    setLoginLoading(false);
    voterCodeInput.focus();
  }
});