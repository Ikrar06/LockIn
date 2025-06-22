document.addEventListener('DOMContentLoaded', async () => {
    const kunciEnkripsiString = sessionStorage.getItem('kunciEnkripsi');
    const userEmail = sessionStorage.getItem('userEmail');
    const userName = sessionStorage.getItem('userName') || 'Pengguna';
    const encryptedVaultString = sessionStorage.getItem('encryptedVault');

    if (!kunciEnkripsiString || !userEmail) {
        alert("Sesi tidak valid! Silakan login kembali.");
        window.location.href = 'auth.html';
        return;
    }

    const kunciEnkripsi = new Uint8Array(JSON.parse(kunciEnkripsiString)).buffer;

    function prosesDashboard(brankas) {
    function updateText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    if (!brankas || brankas.length === 0) {
        updateText('skor-nilai', 'N/A');
        updateText('skor-pesan', 'Brankas Anda masih kosong.');
        return;
    }

    let kuat = 0, sedang = 0, lemah = 0;
    const passwordCounts = {};
    let duplikat = 0;
    let terlemah = { name: '-', score: 5 };

    brankas.forEach(item => {
        if (!item.password) return;
        const analisis = zxcvbn(item.password);
        const score = analisis.score;

        if (score >= 3) kuat++;
        else if (score >= 1) sedang++;
        else lemah++;

        if (score < terlemah.score) {
            terlemah = { name: item.name, score };
        }

        passwordCounts[item.password] = (passwordCounts[item.password] || 0) + 1;
    });

    Object.values(passwordCounts).forEach(jumlah => {
        if (jumlah > 1) duplikat++;
    });

    const total = brankas.length;
    const skor = total > 0 ? Math.round(((kuat * 100) + (sedang * 50) + (lemah * 10)) / total) : 0;

    // Update gauge
    gambarGauge(skor);

    // Update text skor
    updateText('skor-nilai', `${skor}%`);

    // Pesan keamanan
    const skorPesan = document.getElementById('skor-pesan');
    if (skorPesan) {
        if (skor > 80) {
            skorPesan.textContent = "Aman ✔ Tidak ditemukan masalah signifikan.";
            skorPesan.parentElement.classList.remove('warning-widget', 'danger-widget');
            skorPesan.parentElement.classList.add('safe-widget');
        } else if (skor > 50) {
            skorPesan.textContent = "Waspada ⚠ Perlu perbaikan pada sebagian sandi.";
            skorPesan.parentElement.classList.remove('safe-widget', 'danger-widget');
            skorPesan.parentElement.classList.add('warning-widget');
        } else {
            skorPesan.textContent = "Bahaya ❌ Banyak sandi lemah atau berulang!";
            skorPesan.parentElement.classList.remove('safe-widget', 'warning-widget');
            skorPesan.parentElement.classList.add('danger-widget');
        }
    }

    // Statistik
    updateText('stat-kuat', kuat);
    updateText('stat-lemah', lemah);
    updateText('stat-berulang', duplikat);
    updateText('stats-total', total);
    updateText('stats-terlemah', terlemah.name);

    gambarGrafik(kuat, sedang, lemah);
}

    function gambarGrafik(kuat, sedang, lemah) {
        const ctxElement = document.getElementById('grafik-komposisi');
        if (!ctxElement) return;
        const ctx = ctxElement.getContext('2d');

        if (window.myChart instanceof Chart) {
            window.myChart.destroy();
        }

        window.myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Kuat', 'Sedang', 'Lemah'],
                datasets: [{
                    data: [kuat, sedang, lemah],
                    backgroundColor: [
                        'rgba(46, 204, 113, 0.7)',
                        'rgba(241, 196, 15, 0.7)',
                        'rgba(231, 76, 60, 0.7)'
                    ],
                    borderColor: '#161B22',
                    borderWidth: 4,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#fff',
                            padding: 20,
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        padding: 10,
                        boxPadding: 5
                    }
                }
            }
        });
    }
    

    function gambarGauge(score) {
        const ctx = document.getElementById('gaugeChart');
        if (!ctx) return;

        if (window.gaugeInstance instanceof Chart) {
            window.gaugeInstance.destroy();
        }

        const nilai = Math.min(score, 100);
        const sisa = 100 - nilai;

        window.gaugeInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [nilai, sisa],
                    backgroundColor: [
                        nilai < 50
                            ? 'rgba(231, 76, 60, 0.8)'
                            : nilai < 80
                            ? 'rgba(241, 196, 15, 0.8)'
                            : 'rgba(46, 204, 113, 0.8)',
                        'rgba(255,255,255,0.08)'
                    ],
                    borderWidth: 0,
                    cutout: '75%',
                    circumference: 180,
                    rotation: 270
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });

        const skorText = document.getElementById('skor-nilai');
        if (skorText) skorText.textContent = `${score}%`;
    }
    

    async function inisialisasiDashboard() {
        const encryptedVaultString = sessionStorage.getItem('encryptedVault');
        if (encryptedVaultString && encryptedVaultString !== '""') {
            try {
                const paketTerenkripsi = JSON.parse(encryptedVaultString);
                const decryptedJson = await dekripsi(kunciEnkripsi, paketTerenkripsi);
                if (decryptedJson === null) throw new Error("Dekripsi gagal, kunci salah.");

                const brankas = JSON.parse(decryptedJson);
                prosesDashboard(brankas);
            } catch (e) {
                console.error("Gagal memuat data brankas di dashboard:", e);
                const konten = document.querySelector('.content');
                if (konten) konten.innerHTML = '<h1>Error</h1><p>Gagal memuat data. Silakan logout dan login kembali.</p>';
            }
        } else {
            prosesDashboard([]);
        }
    }

    inisialisasiDashboard();
});


