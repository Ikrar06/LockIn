// File: frontend/landing.js (Versi Final dengan Animasi Dua Arah)

document.addEventListener('DOMContentLoaded', () => {

    // LOGIKA 1: Highlight Grid yang Mengikuti Mouse (Tidak berubah)
    document.body.addEventListener('mousemove', e => {
        // Ambil posisi mouse relatif terhadap seluruh dokumen
        const x = e.clientX;
        const y = e.pageY; // Ganti clientY dengan pageY

        // Set properti variabel CSS
        document.body.style.setProperty('--mouse-x', `${x}px`);
        document.body.style.setProperty('--mouse-y', `${y}px`);
    });

    // LOGIKA 2: Efek Navbar Sembunyi/Muncul Saat Scroll (Tidak berubah)
    const header = document.querySelector('.main-header');
    if (header) {
        let lastScrollY = window.scrollY;
        window.addEventListener('scroll', () => {
            if (lastScrollY < window.scrollY && window.scrollY > 100) {
                header.classList.add('hide');
            } else {
                header.classList.remove('hide');
            }
            lastScrollY = window.scrollY;
        });
    }

    // ==========================================================
    // LOGIKA 3: Animasi On-Scroll Reveal Dua Arah (YANG DIPERBARUI)
    // ==========================================================
    const revealElements = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // Jika elemen sedang terlihat di layar
            if (entry.isIntersecting) {
                // Tambahkan kelas 'visible' untuk memunculkannya
                entry.target.classList.add('visible');
            } else {
                // Jika elemen SUDAH TIDAK terlihat di layar,
                // HAPUS kelas 'visible' untuk menyembunyikannya kembali.
                entry.target.classList.remove('visible');
            }
        });
    }, {
        threshold: 0.1 // Atur seberapa banyak elemen harus terlihat sebelum animasi terpicu
    });

    revealElements.forEach(el => observer.observe(el));
    
    // LOGIKA 4: Navigasi Aktif Saat Scroll (Tidak berubah)
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    if (sections.length > 0 && navLinks.length > 0) {
        window.addEventListener('scroll', () => {
            let currentSectionId = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                if (pageYOffset >= sectionTop - 150) {
                    currentSectionId = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href').includes(currentSectionId)) {
                    link.classList.add('active');
                }
            });
        });
    }
    
    // LOGIKA 5: FAQ Toggle (Tidak berubah)
    const faqToggles = document.querySelectorAll('.faq-toggle');
    faqToggles.forEach(button => {
        button.addEventListener('click', () => {
            const content = button.nextElementSibling;
            button.classList.toggle('active');
            content.classList.toggle('show');
        });
    });
    // ==========================================================
    // LOGIKA 6: EFEK TEKS ACAK (SCRAMBLE) PADA HERO TITLE
    // ==========================================================
    const revealTextElement = document.querySelector('.reveal-text');

    if (revealTextElement) {
        // Simpan teks asli sekali saja saat halaman dimuat
        const originalText = revealTextElement.textContent;
        const chars = '!<>-_\\/[]{}—=+*^?#';
        let intervalId = null;

        // Fungsi untuk menghasilkan teks acak dengan panjang yang sama
        const scramble = () => {
            let scrambledText = '';
            for (let i = 0; i < originalText.length; i++) {
                scrambledText += chars[Math.floor(Math.random() * chars.length)];
            }
            revealTextElement.textContent = scrambledText;
        };

        // Fungsi untuk memunculkan teks asli dengan efek "ketikan"
        const reveal = () => {
            clearInterval(intervalId); // Hentikan animasi acak
            intervalId = null;
            
            let iteration = 0;
            const revealInterval = setInterval(() => {
                revealTextElement.textContent = originalText.split("")
                    .map((letter, index) => {
                        // Jika sudah sampai pada giliran huruf ini, tampilkan yang asli
                        if(index < iteration) {
                            return originalText[index];
                        }
                        // Jika belum, tampilkan huruf acak
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join("");
                
                // Jika semua huruf sudah muncul, hentikan interval ini
                if(iteration >= originalText.length){ 
                    clearInterval(revealInterval);
                    revealTextElement.textContent = originalText;
                }
                
                iteration += 1 / 2; // Kecepatan munculnya teks
            }, 120); // Kecepatan animasi (ms)
        };

        // Fungsi untuk memulai kembali animasi acak
        const startScrambling = () => {
            // Cek agar tidak ada interval duplikat
            if (!intervalId) {
                intervalId = setInterval(scramble, 120);
            }
        };

        // Pasang event listeners
        revealTextElement.addEventListener('mouseenter', reveal);
        revealTextElement.addEventListener('mouseleave', startScrambling);

        // Jalankan animasi acak untuk pertama kali saat halaman dimuat
        startScrambling();
    }

     const supportBtn = document.getElementById('support-link-btn');
    const loginWarningModal = document.getElementById('login-warning-modal');
    const closeWarningBtn = document.getElementById('login-warning-close-btn');
    const cancelWarningBtn = document.getElementById('login-warning-cancel-btn');

    if (supportBtn && loginWarningModal) {
        supportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const userIsLoggedIn = sessionStorage.getItem('userEmail');
            if (userIsLoggedIn) {
                window.location.href = 'support.html';
            } else {
                // Tampilkan modal kustom kita
                loginWarningModal.classList.add('show');
            }
        });

        // Fungsi untuk menutup modal
        const closeModal = () => {
            loginWarningModal.classList.remove('show');
        };

        // Pasang listener untuk tombol tutup
        if(closeWarningBtn) closeWarningBtn.addEventListener('click', closeModal);
        if(cancelWarningBtn) cancelWarningBtn.addEventListener('click', closeModal);
    }
    
});