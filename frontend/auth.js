// File: frontend/auth.js
// Handles all interactions on the authentication page (auth.html).

/**
 * Helper function to convert an ArrayBuffer to a Base64 string.
 */
function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * Generates a unique, memorable Destruction Code.
 * @returns {string} - e.g., "gamma-42-zulu-destroy"
 */
function generateDestructionCode() {
    // 1. Buat sebuah array berisi 16 byte acak yang aman
    const randomBytes = window.crypto.getRandomValues(new Uint8Array(16));

    // 2. Ubah setiap byte menjadi representasi heksadesimal (string)
    const hexString = Array.from(randomBytes)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');

    return hexString;
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("Authentication page loaded, auth.js is running.");

    // ========================================================
    // BAGIAN 1: LOGIKA ANIMASI TUKAR FORM
    // ========================================================
    const container = document.getElementById('container');
    const switchToLoginBtn = document.getElementById('switchToLogin');
    const switchToSignupBtn = document.getElementById('switchToSignup');

    if (container && switchToLoginBtn && switchToSignupBtn) {
        switchToLoginBtn.addEventListener('click', () => {
            container.classList.remove('mode-signup');
            container.classList.add('mode-login');
        });
        switchToSignupBtn.addEventListener('click', () => {
            container.classList.remove('mode-login');
            container.classList.add('mode-signup');
        });
    }

    // ========================================================
    // BAGIAN 2: LOGIKA FORM SIGNUP
    // ========================================================
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        
        // Deklarasikan elemen pesan di sini agar bisa diakses oleh fungsi di bawahnya
        const signupPesan = document.getElementById('signup-pesan');

        /**
         * Fungsi ini berisi logika registrasi yang sebenarnya.
         */
        async function prosesRegistrasi() {
            signupPesan.textContent = 'Processing registration...';
            signupPesan.style.color = '#8B949E';

            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const username = document.getElementById('signup-username').value;
            
            try {
                const salt = buatSalt();
                const destructionCode = generateDestructionCode();
                const { kunciVerifikasi } = await turunkanKunci(password, salt);
                const verificationKeyBase64 = bufferToBase64(kunciVerifikasi);

                const response = await fetch('http://localhost:5000/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email, username,
                        salt: Array.from(salt),
                        verificationKey: verificationKeyBase64,
                        destructionCode: destructionCode
                    })
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                window.utils.tampilkanInfoModal({
                    judul: "REGISTRATION SUCCESSFUL!",
                    pesan: "IMPORTANT: Save your Destruction Code below. It is used to wipe your data in an emergency. You will only see this once:",
                    kode: destructionCode,
                    tombolTutup: "I Have Saved My Code. Close", // Teks baru untuk tombol OK
                    wajibSalin: true // INI KUNCINYA: Memberitahu modal untuk mengaktifkan fitur "Salin untuk Konfirmasi"
                });

                signupPesan.style.color = 'green';
                signupPesan.textContent = 'Registration successful! Please switch to the Login tab.';
                signupForm.reset();

            } catch (error) {
                window.utils.tampilkanNotifikasi(`Registration failed: ${error.message}`, 'error');
                signupPesan.textContent = `Error: ${error.message}`;
                signupPesan.style.color = 'red';
            }
        }

        // Event listener utama untuk tombol "Sign Up"
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-password-confirm').value;

            if (password !== confirmPassword) {
                window.utils.tampilkanNotifikasi("Password confirmation does not match!", 'error');
                return;
            }
            if (password.length < 8) {
                window.utils.tampilkanNotifikasi("Master Password must be at least 8 characters long.", 'error');
                return;
            }

            const warningModal = document.getElementById('masterPasswordWarningModal');
            const checkbox = document.getElementById('confirm-risk-checkbox');
            const continueBtn = document.getElementById('continue-signup-btn');
            const cancelBtn = document.getElementById('cancel-signup-btn');
            const closeBtn = document.getElementById('cancel1');

            if (!warningModal) {
                if (confirm("IMPORTANT: The Master Password cannot be recovered. Continue?")) {
                    prosesRegistrasi();
                }
                return;
            }
            
            checkbox.checked = false;
            continueBtn.disabled = true;
            warningModal.classList.add('show');

            const handleCheckboxChange = () => { continueBtn.disabled = !checkbox.checked; };
            
            const closeModal = () => {
                warningModal.classList.remove('show');
                checkbox.removeEventListener('change', handleCheckboxChange);
                continueBtn.removeEventListener('click', handleContinue);
                cancelBtn.removeEventListener('click', closeModal);
                closeBtn.removeEventListener('click', closeModal);
            };

            const handleContinue = () => {
                closeModal();
                prosesRegistrasi();
            };

            checkbox.addEventListener('change', handleCheckboxChange);
            continueBtn.addEventListener('click', handleContinue);
            cancelBtn.addEventListener('click', closeModal);
            closeBtn.addEventListener('click', closeModal);
        });
    }

    // ========================================================
    // SECTION 3: LOGIN FORM LOGIC (Translated to English)
    // ========================================================
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const loginMessage = document.getElementById('login-pesan');
            loginMessage.textContent = 'Processing...';
            loginMessage.style.color = '#8B949E';

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                // Step 1: Get salt from server
                const saltResponse = await fetch(`http://localhost:5000/getsalt/${email}`);
                if (!saltResponse.ok) throw new Error('Incorrect email or Master Password.');
                const { salt } = await saltResponse.json();
                const saltBuffer = new Uint8Array(salt);

                // Step 2: Derive keys
                const { kunciEnkripsi, kunciVerifikasi } = await turunkanKunci(password, saltBuffer);
                const verificationKeyBase64 = bufferToBase64(kunciVerifikasi);

                // Step 3: Verify login
                const loginResponse = await fetch('http://localhost:5000/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, verificationKey: verificationKeyBase64 })
                });
                const loginResult = await loginResponse.json();
                if (!loginResponse.ok) throw new Error(loginResult.message);
                
                loginMessage.style.color = 'green';
                loginMessage.textContent = 'Login successful! Redirecting...';

                // Store all necessary data in sessionStorage
                sessionStorage.setItem('kunciEnkripsi', JSON.stringify(Array.from(new Uint8Array(kunciEnkripsi))));
                sessionStorage.setItem('encryptedVault', loginResult.encryptedVault);
                sessionStorage.setItem('userEmail', email);
                sessionStorage.setItem('userName', loginResult.username);

                // Redirect to dashboard
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);

            } catch (error) {
                loginMessage.style.color = 'red';
                loginMessage.textContent = `Error: ${error.message}`;
            }
        });
    }
});