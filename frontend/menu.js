document.addEventListener('DOMContentLoaded', () => {

    // --- Menampilkan Info Pengguna ---
    const userName = sessionStorage.getItem('userName') || 'Pengguna';
    const userEmail = sessionStorage.getItem('userEmail');

    const sapaanElement = document.getElementById('nama-pengguna-sapaan');
    if (sapaanElement && userName) {
        sapaanElement.textContent = userName.toUpperCase() + '!';
    }

    const userEmailDisplay = document.getElementById('user-email-display');
    if (userEmailDisplay && userEmail) {
        userEmailDisplay.textContent = userEmail;
    }
    
    // --- Logika Tombol Logout ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear(); // Hapus semua data sesi
            window.location.href = 'auth.html'; // Kembali ke halaman login/register
        });
    }

    // ==========================================================
    // INI DIA LOGIKA BARU UNTUK HIGHLIGHT MENU YANG AKTIF
    // ==========================================================
    const semuaMenu = document.querySelectorAll('.menu-list a');
    // Dapatkan path halaman saat ini, contoh: "/dashboard.html"
    const halamanSekarang = window.location.pathname;

    semuaMenu.forEach(link => {
        // Dapatkan href dari setiap link, contoh: "dashboard.html"
        const linkHref = link.getAttribute('href');

        // Jika path halaman saat ini mengandung href dari link tersebut
        if (halamanSekarang.includes(linkHref)) {
            // Hapus dulu 'active' dari semua menu untuk membersihkan
            semuaMenu.forEach(l => l.classList.remove('active'));
            // Lalu tambahkan 'active' hanya ke link yang cocok
            link.classList.add('active');
        }
    });
});