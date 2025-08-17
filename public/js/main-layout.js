// File: frontend/main-layout.js
// Responsible for all shared UI and logic across pages

// ========== GLOBAL UTILS DEFINITION ==========
window.utils = {};

/**
 * Show a custom toast notification.
 * @param {string} message - The main message to display.
 * @param {string} type - 'success' or 'error'
 */
window.utils.tampilkanNotifikasi = function(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = 'notifikasi-popup';
    if (type === 'error') notif.classList.add('error');

    const icon = (type === 'success') ? 'fa-check-circle' : 'fa-exclamation-circle';
    notif.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    document.body.appendChild(notif);
    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => {
        notif.classList.remove('show');
        notif.addEventListener('transitionend', () => notif.remove());
    }, 3000);
}

window.utils.tampilkanInfoModal = function(options = {}) {
    const {
        judul = 'Notification',
        pesan = '',
        kode = null,
        tombolTutup = 'I Understand',
        wajibSalin = false
    } = options;

    // Ambil semua elemen modal
    const infoModal = document.getElementById('infoModal');
    if (!infoModal) return;
    const infoTitle = document.getElementById('infoTitle');
    const infoMessage = document.getElementById('infoMessage');
    const codeWrapper = document.getElementById('infoCodeWrapper');
    const codeEl = document.getElementById('infoCode');
    const copyBtn = document.getElementById('copy-code-btn');
    const okBtn = document.getElementById('info-ok-btn');
    const errorMsg = document.getElementById('copy-error-message');

    // --- Reset keadaan modal setiap kali dibuka ---
    infoTitle.innerHTML = `${judul}`;
    infoMessage.textContent = pesan;
    okBtn.textContent = tombolTutup;
    errorMsg.classList.remove('show'); // Sembunyikan pesan error di awal
    errorMsg.textContent = '';
    let sudahMenyalin = false;

    // --- Hapus listener lama untuk mencegah duplikasi ---
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    const newCopyBtn = copyBtn.cloneNode(true);
    copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
    
    const closeModal = () => infoModal.classList.remove('show');

    // --- Logika Tombol OK/Tutup ---
    newOkBtn.addEventListener('click', () => {
        // Jika wajib salin TAPI pengguna belum menyalin
        if (wajibSalin && !sudahMenyalin) {
            errorMsg.textContent = "Please copy your Destruction Code before you can close this window.";
            errorMsg.classList.add('show'); // Tampilkan pesan error dengan animasi
            return; // Hentikan fungsi, jangan tutup modal
        }
        // Jika tidak ada masalah, tutup modal
        closeModal();
    });

    // --- Logika untuk area kode ---
    if (kode && codeWrapper && codeEl) {
        codeEl.textContent = kode;
        codeWrapper.style.display = 'flex';
        
        newOkBtn.classList.add('disabled');
        newOkBtn.classList.remove('btn-primary'); // Pastikan tidak ada warna biru

        // Pasang listener untuk tombol Salin
        newCopyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(kode).then(() => {
                window.utils.tampilkanNotifikasi("Code copied to clipboard!");
                sudahMenyalin = true;
                newOkBtn.classList.remove('disabled'); // Hapus gaya nonaktif
                newOkBtn.classList.add('btn-primary'); // TAMBAHKAN GAYA AKTIF (BIRU)
                errorMsg.classList.remove('show');
            });
        });
        
        // Pasang listener untuk tombol OK/Tutup
        newOkBtn.addEventListener('click', () => {
            if (!sudahMenyalin) {
                errorMsg.textContent = "Please copy your Destruction Code before you can close this window.";
                errorMsg.classList.add('show');
            } else {
                closeModal();
            }
        });

    } else {
        // Logika jika tidak ada kode atau tidak wajib salin
        newOkBtn.classList.remove('disabled');
        newOkBtn.classList.add('btn-primary');
        newOkBtn.addEventListener('click', closeModal);
    }
    
    // Tampilkan modal
    infoModal.classList.add('show');
}
/**
 * Show a confirmation modal.
 * @param {string} message - The question/message to show
 * @param {object} options - Optional settings: title, yes button text/class
 * @returns {Promise<boolean>} true if user confirmed
 */
window.utils.tampilkanConfirmModal = function(pesan, options = {}) {
    const {
        judul = 'Confirm Action',
        tombolYa = 'Yes',
        kelasTombolYa = 'btn-primary'
    } = options;

    return new Promise((resolve) => {
        const confirmModal = document.getElementById('confirmModal');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmTitle = document.getElementById('confirmTitle');
        const yesBtn = document.getElementById('confirm-yes-btn');
        const noBtn = document.getElementById('confirm-no-btn');

        if (!confirmModal) {
            console.error("Elemen #confirmModal tidak ditemukan!");
            resolve(window.confirm(pesan)); // Fallback jika modal tidak ada
            return;
        }

        confirmTitle.innerHTML = `${judul}`;
        confirmMessage.textContent = pesan;
        yesBtn.textContent = tombolYa;

        yesBtn.classList.remove('btn-danger', 'btn-primary');
        yesBtn.classList.add(kelasTombolYa);
        
        confirmModal.classList.add('show');

        const handleResolve = (value) => {
            confirmModal.classList.remove('show');
            yesBtn.removeEventListener('click', onYes);
            noBtn.removeEventListener('click', onNo);
            resolve(value);
        };

        const onYes = () => handleResolve(true);
        const onNo = () => handleResolve(false);

        yesBtn.addEventListener('click', onYes, { once: true });
        noBtn.addEventListener('click', onNo, { once: true });
    });
}

// Track mouse for interactive effects
document.body.addEventListener('mousemove', e => {
    const x = e.clientX;
    const y = e.clientY;
    document.body.style.setProperty('--mouse-x', `${x}px`);
    document.body.style.setProperty('--mouse-y', `${y}px`);
});

// ========== INITIALIZATION WHEN PAGE LOADS ==========
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    async function initializeLayout() {
        const userEmail = sessionStorage.getItem('userEmail');
        if (!userEmail) {
            window.location.href = 'auth.html';
            return;
        }

        try {
            const response = await fetch(`${window.config.API_URL}/profile/${userEmail}`);
            if (!response.ok) throw new Error("Session invalid.");

            const profileData = await response.json();

            sessionStorage.setItem('userName', profileData.username);
            sessionStorage.setItem('userSalt', JSON.stringify(profileData.salt));
            sessionStorage.setItem('profilePhotoUrl', profileData.profilePhotoUrl || '');
            sessionStorage.setItem('userJoinDate', profileData.createdAt || '');

            updateSidebarUI(profileData);
            highlightActiveMenu();
            setupLogoutButton();

        } catch (error) {
            console.error("Failed to load layout:", error);
            sessionStorage.clear();
            window.location.href = 'auth.html';
        }
    }

    function updateSidebarUI(data) {
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };
        const setAvatar = (id, url) => {
            const el = document.getElementById(id);
            if (el && url && url !== 'null') {
                el.style.backgroundImage = `url(${url})`;
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
            }
        };

        setText('nama-pengguna-sapaan', (data.username || 'User').toUpperCase());
        setText('user-name-display', data.username || 'User');
        setText('user-email-display', sessionStorage.getItem('userEmail'));
        setAvatar('sidebar-avatar', data.profilePhotoUrl);
    }

    function setupLogoutButton() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (event) => {
                event.preventDefault();

                const confirmed = await window.utils.tampilkanConfirmModal(
                    "Are you sure you want to logout?",
                    {
                        judul: "Logout Confirmation",
                        tombolYa: "Logout",
                        kelasTombolYa: "btn-danger"
                    }
                );

                if (confirmed) {
                    sessionStorage.clear();
                    window.location.href = 'index.html';
                }
            });
        }
    }

    function highlightActiveMenu() {
        const menuLinks = document.querySelectorAll('.menu-list a, .profile-link');
        const currentPage = window.location.pathname.split('/').pop();

        menuLinks.forEach(link => {
            link.classList.remove('active');
            const linkHref = link.getAttribute('href');
            if (linkHref === currentPage) {
                link.classList.add('active');
            }
        });
    }

    initializeLayout();
});
