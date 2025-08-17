// dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    const encryptionKeyString = sessionStorage.getItem('kunciEnkripsi');
    const userEmail = sessionStorage.getItem('userEmail');
    const userName = sessionStorage.getItem('userName') || 'User';
    const encryptedVaultString = sessionStorage.getItem('encryptedVault');

    if (!encryptionKeyString || !userEmail) {
        alert("Invalid session! Please log in again.");
        window.location.href = 'auth.html';
        return;
    }

    const encryptionKey = new Uint8Array(JSON.parse(encryptionKeyString)).buffer;

    function categorizePassword(score) {
        if (score <= 20) return "veryWeak";
        if (score <= 40) return "weak";
        if (score <= 60) return "medium";
        if (score <= 80) return "strong";
        return "veryStrong";
    }

    function renderChart(veryWeak, weak, medium, strong, veryStrong) {
        const ctx = document.getElementById('grafik-komposisi');
        if (!ctx) return;

        if (window.myChart instanceof Chart) window.myChart.destroy();

        window.myChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [veryWeak, weak, medium, strong, veryStrong],
                    backgroundColor: [
                        '#e74c3c',  // Bright Red (Very Weak)
                        '#e67e22',  // Orange (Weak)
                        '#f1c40f',  // Yellow (Medium)
                        '#2ecc71',  // Light Green (Strong)
                        '#145A32'   // Dark Green (Very Strong)
                    ],
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                    hoverOffset: 12
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
                            color: '#ccc',
                            font: {
                                family: 'Poppins',
                                size: 13
                            },
                            padding: 16,
                            boxWidth: 14
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30,30,46,0.9)',
                        titleColor: '#fff',
                        bodyColor: '#ddd',
                        borderColor: 'rgba(255,255,255,0.05)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12
                    }
                }
            }
        });

        const updateLabel = (selector, value, label) => {
            const el = document.querySelector(`.baris.${selector} .label-text`);
            if (el) el.textContent = `${value} ${label}`;
        };
        updateLabel('sangat-lemah', veryWeak, 'Very Weak');
        updateLabel('lemah', weak, 'Weak');
        updateLabel('sedang', medium, 'Medium');
        updateLabel('kuat', strong, 'Strong');
        updateLabel('sangat-kuat', veryStrong, 'Very Strong');
    }

    function renderGauge(score) {
        const canvas = document.getElementById('gaugeChart');
        const valueEl = document.getElementById('skor-nilai');
        const messageEl = document.getElementById('skor-pesan');

        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const radius = canvas.width / 2.5;
        const lineWidth = 20;
        const centerX = canvas.width / 2;
        const centerY = canvas.height;

        const startAngle = Math.PI;
        const endAngle = Math.PI + Math.PI * (score / 100);

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#e74c3c');
        gradient.addColorStop(0.5, '#f1c40f');
        gradient.addColorStop(1, '#2ecc71');

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        if (valueEl) valueEl.textContent = `${score}%`;

        if (messageEl) {
            if (score >= 90) messageEl.textContent = "Very Secure ✓ No issues found.";
            else if (score >= 70) messageEl.textContent = "Secure ✓ Minor issues detected.";
            else if (score >= 40) messageEl.textContent = "Caution ⚠ Some passwords need improvement.";
            else messageEl.textContent = "Danger! 🔥 Many weak passwords.";
        }
    }

    function showConfirmModal(message, title = "Confirm Action") {
        return new Promise((resolve) => {
            const confirmModal = document.getElementById('confirmModal');
            const confirmMessage = document.getElementById('confirmMessage');
            const confirmTitle = document.getElementById('confirmTitle');
            const yesBtn = document.getElementById('confirm-yes-btn');
            const noBtn = document.getElementById('confirm-no-btn');

            if (!confirmModal || !confirmMessage || !confirmTitle || !yesBtn || !noBtn) {
                console.error("Confirmation modal element not found in HTML!");
                resolve(confirm(message)); 
                return;
            }

            confirmTitle.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${title}`;
            confirmMessage.textContent = message;
            
            confirmModal.classList.add('show');

            const handleYes = () => {
                confirmModal.classList.remove('show');
                cleanup();
                resolve(true);
            };

            const handleNo = () => {
                confirmModal.classList.remove('show');
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                yesBtn.removeEventListener('click', handleYes);
                noBtn.removeEventListener('click', handleNo);
            };

            yesBtn.addEventListener('click', handleYes);
            noBtn.addEventListener('click', handleNo);
        });
    }

    function processDashboard(vault) {
        function updateText(id, text) {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        }

        if (!vault || vault.length === 0) {
            updateText('skor-nilai', 'N/A');
            updateText('skor-pesan', 'Your vault is still empty.');
            return;
        }

        const passwordCounts = {};
        let duplicates = 0;
        let weakest = { name: '-', score: 100 };

        const composition = {
            veryWeak: 0,
            weak: 0,
            medium: 0,
            strong: 0,
            veryStrong: 0
        };

        vault.forEach(item => {
            if (!item.password) return;
            const analysis = zxcvbn(item.password);
            const score = analysis.score * 25;

            const category = categorizePassword(score);
            composition[category]++;

            if (score < weakest.score) {
                weakest = { name: item.name, score: score };
            }

            passwordCounts[item.password] = (passwordCounts[item.password] || 0) + 1;
        });

        Object.values(passwordCounts).forEach(count => {
            if (count > 1) duplicates++;
        });

        const total = vault.length;
        const totalScore =
            (composition.veryWeak * 10) +
            (composition.weak * 30) +
            (composition.medium * 50) +
            (composition.strong * 75) +
            (composition.veryStrong * 100);
        const averageScore = Math.round(totalScore / total);

        renderGauge(averageScore);
        updateText('skor-nilai', `${averageScore}%`);

        const scoreMessage = document.getElementById('skor-pesan');
        if (scoreMessage) {
            if (averageScore >= 90) {
                scoreMessage.textContent = "Very Secure ✓ No issues found.";
            } else if (averageScore >= 70) {
                scoreMessage.textContent = "Secure ✓ Minor issues detected.";
            } else if (averageScore >= 40) {
                scoreMessage.textContent = "Caution ⚠ Some passwords need improvement.";
            } else {
                scoreMessage.textContent = "Danger! 🔥 Many weak passwords.";
            }
        }

        updateText('stat-kuat', composition.strong + composition.veryStrong);
        updateText('stat-lemah', composition.weak + composition.veryWeak);
        updateText('stat-berulang', duplicates);
        updateText('stats-total', total);
        updateText('stats-terlemah', weakest.name);

        renderChart(
            composition.veryWeak,
            composition.weak,
            composition.medium,
            composition.strong,
            composition.veryStrong
        );
    }

    async function initializeDashboard() {
        if (encryptedVaultString && encryptedVaultString !== '""') {
            try {
                const encryptedPackage = JSON.parse(encryptedVaultString);
                const decryptedJson = await dekripsi(encryptionKey, encryptedPackage);
                if (decryptedJson === null) throw new Error("Decryption failed, incorrect key.");
                const vault = JSON.parse(decryptedJson);
                processDashboard(vault);
            } catch (e) {
                console.error("Failed to load vault data on dashboard:", e);
                const content = document.querySelector('.content');
                if (content) content.innerHTML = '<h1>Error</h1><p>Failed to load data. Please logout and log in again.</p>';
            }
        } else {
            processDashboard([]);
        }
    }

    initializeDashboard();
});
