// File: frontend/emergency.js

document.addEventListener('DOMContentLoaded', () => {
    const wipeForm = document.getElementById('wipe-form');
    
    if (wipeForm) {
        wipeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Panggil modal konfirmasi kustom kita terlebih dahulu
            // Pastikan main-layout.js sudah dimuat di HTML
            if (window.utils && typeof window.utils.tampilkanConfirmModal === 'function') {
                const konfirmasi = await window.utils.tampilkanConfirmModal(
                    "This is your final warning. Are you absolutely sure? All your password data will be lost forever.",
                    {
                        judul: "Final Confirmation",
                        tombolYa: "Yes, Wipe My Data",
                        kelasTombolYa: "btn-danger"
                    }
                );

                // Lanjutkan hanya jika pengguna menekan tombol konfirmasi
                if (konfirmasi) {
                    await prosesPenghancuran();
                } else {
                    document.getElementById('pesan').textContent = "Data wipe was cancelled.";
                }
            } else {
                // Fallback jika fungsi modal tidak ditemukan
                console.error("Fungsi modal kustom tidak ditemukan!");
                if (confirm("FINAL WARNING: ARE YOU SURE?")) {
                    await prosesPenghancuran();
                }
            }
        });
    }

    /**
     * Fungsi yang berisi logika untuk mengirim permintaan penghancuran ke server.
     */
    async function prosesPenghancuran() {
        const email = document.getElementById('email').value;
        const destructionCode = document.getElementById('destruction-code').value;
        const messageDiv = document.getElementById('pesan');

        messageDiv.textContent = 'Processing destruction request...';
        messageDiv.style.color = '#8B949E';

        try {
            const response = await fetch(`${window.config.API_URL}/vault/remote-wipe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, destructionCode })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            messageDiv.style.color = 'green';
            messageDiv.textContent = `Success: ${result.message}`;
            wipeForm.reset();
        } catch (error) {
            messageDiv.style.color = 'red';
            messageDiv.textContent = `Failed: ${error.message}`;
        }
    }
});