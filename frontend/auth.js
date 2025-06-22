function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Halaman selesai dimuat, auth.js berjalan.");

    // ========================================================
    // BAGIAN ANIMASI TUKAR FORM
    // ========================================================
    const container = document.getElementById('container');
    const switchToLogin = document.getElementById('switchToLogin');
    const switchToSignup = document.getElementById('switchToSignup');

    if (container && switchToLogin && switchToSignup) {
        console.log("Elemen animasi ditemukan.");
        switchToLogin.addEventListener('click', () => {
            container.classList.remove('mode-signup');
            container.classList.add('mode-login');
        });
        switchToSignup.addEventListener('click', () => {
            container.classList.remove('mode-login');
            container.classList.add('mode-signup');
        });
    } else {
        console.error("Salah satu elemen animasi (container, switchToLogin, atau switchToSignup) tidak ditemukan!");
    }
    // ========================================================
    // BAGIAN LOGIKA FORM SIGNUP
    // ========================================================
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        console.log("✅ Form signup ditemukan. Siap menerima input.");
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Mencegah halaman refresh
            console.log("Tombol 'Daftar' ditekan. Proses registrasi dimulai.");

            const signupPesan = document.getElementById('signup-pesan');
            signupPesan.textContent = 'Memproses...';
            signupPesan.style.color = '#8B949E';

            // 1. Ambil semua data dari form
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const username = document.getElementById('signup-username').value;
            const passwordConfirm = document.getElementById('signup-password-confirm').value;

            // 2. Validasi awal di frontend
            if (password !== passwordConfirm) {
                signupPesan.textContent = 'Error: Konfirmasi password tidak cocok!';
                signupPesan.style.color = 'red';
                console.error("Validasi gagal: Password tidak cocok.");
                return; // Hentikan proses
            }
            if (!email || !password || !username) {
                signupPesan.textContent = 'Error: Semua kolom wajib diisi!';
                signupPesan.style.color = 'red';
                console.error("Validasi gagal: Kolom kosong.");
                return; // Hentikan proses
            }

            try {
                // 3. Proses kriptografi
                console.log("Membuat salt...");
                const salt = buatSalt();
                console.log("✅ Salt dibuat. Menurunkan kunci verifikasi...");
                const { kunciVerifikasi } = await turunkanKunci(password, salt);
                const verificationKeyBase64 = bufferToBase64(kunciVerifikasi);
                console.log("✅ Kunci verifikasi diturunkan dan di-encode ke Base64.");

                // 4. Siapkan paket data untuk dikirim
                const dataUntukServer = {
                    email: email,
                    username: username,
                    salt: Array.from(salt), // Konversi Uint8Array menjadi array biasa
                    verificationKey: verificationKeyBase64
                };
                console.log("Mempersiapkan pengiriman data ke server:", dataUntukServer);

                // 5. Kirim data ke server
                const response = await fetch('http://localhost:5000/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataUntukServer)
                });
                
                console.log(`Server merespons dengan status: ${response.status}`);
                const hasil = await response.json();

                if (!response.ok) {
                    throw new Error(hasil.message);
                }
                
                // JIKA SEMUA BERHASIL
                console.log("✅ Registrasi di server BERHASIL!");
                signupPesan.style.color = 'green';
                signupPesan.textContent = 'Registrasi berhasil! Silakan pindah ke tab Login.';
                signupForm.reset();

            } catch (error) {
                console.error("Terjadi error selama proses registrasi:", error);
                signupPesan.style.color = 'red';
                signupPesan.textContent = `Error: ${error.message}`;
            }
        });
    } else {
        console.error("❌ KRITIS: Form signup dengan id 'signup-form' TIDAK DITEMUKAN di HTML!");
    }

    // ========================================================
    // BAGIAN LOGIKA FORM LOGIN
    // ========================================================
    const loginForm = document.getElementById('login-form');
    console.log("Mencari form dengan id 'login-form'...");

    if (loginForm) {
        console.log("✅ Form login DITEMUKAN! Memasang event listener...");
        
        loginForm.addEventListener('submit', async (e) => {
            // Jika Anda melihat pesan ini di konsol, berarti preventDefault berhasil!
            console.log("Tombol login diklik, refresh halaman dicegah.");
            e.preventDefault();

            const loginPesan = document.getElementById('login-pesan');
            loginPesan.textContent = 'Memproses...';
            loginPesan.style.color = '#8B949E';

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            console.log(`Mencoba login dengan email: ${email}`);

            try {
                // Langkah A: Ambil salt dari server
                console.log("Langkah A: Mengambil salt dari server...");
                const saltResponse = await fetch(`http://localhost:5000/getsalt/${email}`);
                if (!saltResponse.ok) {
                    throw new Error('Email atau Master Password salah.');
                }
                const { salt } = await saltResponse.json();
                const saltBuffer = new Uint8Array(salt);
                console.log("✅ Salt berhasil diterima.");

                // Langkah B: Turunkan kunci lagi
                console.log("Langkah B: Menurunkan kunci dari Master Password...");
                const { kunciEnkripsi, kunciVerifikasi } = await turunkanKunci(password, saltBuffer);
                const verificationKeyBase64 = bufferToBase64(kunciVerifikasi);
                console.log("✅ Kunci berhasil diturunkan.");

                // Langkah C: Kirim untuk diverifikasi
                console.log("Langkah C: Mengirim data login ke server...");
                const loginResponse = await fetch('http://localhost:5000/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        verificationKey: verificationKeyBase64
                    })
                });

                const hasilLogin = await loginResponse.json();
                if (!loginResponse.ok) {
                    throw new Error(hasilLogin.message);
                }
                
                // JIKA LOGIN BERHASIL
                console.log("✅ Login di server BERHASIL!");
                loginPesan.style.color = 'green';
                loginPesan.textContent = 'Login berhasil! Mengarahkan ke dashboard...';

                // Simpan semua data penting ke sessionStorage
                sessionStorage.setItem('kunciEnkripsi', JSON.stringify(Array.from(new Uint8Array(kunciEnkripsi))));
                sessionStorage.setItem('encryptedVault', hasilLogin.encryptedVault);
                sessionStorage.setItem('userEmail', email);
                sessionStorage.setItem('userName', hasilLogin.username);
                console.log("Data sesi disimpan. Mengarahkan...");

                // Arahkan ke halaman dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);

            } catch (error) {
                console.error("Terjadi error di dalam proses login:", error);
                loginPesan.style.color = 'red';
                loginPesan.textContent = `Error: ${error.message}`;
            }
        });

    } else {
        console.error("❌ KRITIS: Form login dengan id 'login-form' TIDAK DITEMUKAN di HTML!");
    }
});