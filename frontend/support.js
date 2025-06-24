// File: frontend/support.js

document.addEventListener('DOMContentLoaded', () => {
    const faqToggles = document.querySelectorAll('.faq-toggle');

    faqToggles.forEach(button => {
        button.addEventListener('click', () => {
            const content = button.nextElementSibling;
            const icon = button.querySelector('i');

            button.classList.toggle('active');
            content.classList.toggle('show');
        });
    });
    const copyEmailBtn = document.getElementById('copy-email-btn');
    if (copyEmailBtn) {
        copyEmailBtn.addEventListener('click', () => {
            const email = "lockinftuh@gmail.com";
            navigator.clipboard.writeText(email)
                .then(() => {
                    // Gunakan notifikasi kustom kita
                    if (window.utils && window.utils.tampilkanNotifikasi) {
                        window.utils.tampilkanNotifikasi("Email address copied to clipboard!");
                    } else {
                        alert("Email address copied to clipboard!");
                    }
                })
                .catch(err => {
                    console.error("Gagal menyalin email: ", err);
                    alert("Failed to copy email.");
                });
        });
    }
});
