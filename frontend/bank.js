document.addEventListener('DOMContentLoaded', async () => {
    // ==========================================================
    // BAGIAN 1: INISIALISASI & PERSIAPAN
    // ==========================================================

    const kunciEnkripsiString = sessionStorage.getItem('kunciEnkripsi');
    const userEmail = sessionStorage.getItem('userEmail');

    if (!kunciEnkripsiString || !userEmail) {
        alert("Sesi tidak valid! Silakan login kembali.");
        window.location.href = 'auth.html';
        return;
    }
    const kunciEnkripsi = new Uint8Array(JSON.parse(kunciEnkripsiString)).buffer;

    // --- Selektor Elemen DOM ---
    const passwordList = document.getElementById("passwordList");
    const addModal = document.getElementById("addModal");
    const detailModal = document.getElementById("detailModal");
    const openAddModalBtn = document.getElementById("openAddModal");
    const savePasswordBtn = document.getElementById("savePassword");
    const cancelAddBtn = document.getElementById("cancelAdd");
    const closeDetailBtn = document.getElementById("closeDetail");
    const togglePassBtn = document.getElementById("togglePass");
    const copyPassBtn = document.getElementById("copyPass");
    const addEntryForm = document.getElementById("addEntryForm");

    let brankasData = [];
    let detailDataSaatIni = {};
    
    // ==========================================================
    // BAGIAN 2: FUNGSI INTI (LOAD, SAVE, RENDER)
    // ==========================================================
    async function muatDanDekripsiBrankas() {
        passwordList.innerHTML = `<div class="list-row-info">Memuat brankas...</div>`;
        
        // Ambil string mentah dari session storage
        const encryptedVaultString = sessionStorage.getItem('encryptedVault');

        if (encryptedVaultString && encryptedVaultString !== '""') {
            try {
                // Langkah 1: Ubah string menjadi objek JavaScript
                const paketTerenkripsi = JSON.parse(encryptedVaultString);
                
                // Pastikan paketnya valid sebelum didekripsi
                if (!paketTerenkripsi || !paketTerenkripsi.ct || !paketTerenkripsi.iv) {
                    throw new Error("Format data brankas di sesi tidak valid.");
                }

                // Langkah 2: Panggil fungsi dekripsi yang sudah kita perbarui
                const decryptedJson = await dekripsi(kunciEnkripsi, paketTerenkripsi);
                
                if (decryptedJson === null) {
                    throw new Error("Dekripsi gagal. Kunci atau data mungkin korup.");
                }

                // Langkah 3: Ubah hasil dekripsi (string JSON) menjadi array
                brankasData = JSON.parse(decryptedJson) || [];

            } catch (e) {
                console.error("Gagal memuat atau mendekripsi brankas:", e);
                brankasData = [];
                // Tampilkan pesan error yang lebih jelas ke pengguna
                passwordList.innerHTML = `<div class='list-row-info error'>Gagal memuat data brankas. Coba login kembali.</div>`;
            }
        } else {
            brankasData = []; // Brankas memang kosong
        }
        // Langkah 4: Tampilkan hasilnya ke layar
        renderBrankas();
    }


    async function enkripsiDanSimpanBrankas() {
        try {
            const jsonString = JSON.stringify(brankasData);
            // Panggil fungsi enkripsi baru kita
            const paketTerenkripsi = await enkripsi(kunciEnkripsi, jsonString);
            
            // Ubah seluruh paket menjadi string untuk dikirim dan disimpan
            const encryptedVaultString = JSON.stringify(paketTerenkripsi);
            
            // Kirim paket ini ke server
            const response = await fetch('http://localhost:5000/vault/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: userEmail, 
                    encryptedVault: encryptedVaultString 
                })
            });

            if (!response.ok) throw new Error('Gagal sinkronisasi dengan server.');

            sessionStorage.setItem('encryptedVault', encryptedVaultString);

            console.log("Brankas berhasil disinkronkan ke server DAN sesi lokal diperbarui.");
        } catch (error) {
            console.error("Gagal menyimpan brankas:", error);
            alert("Gagal menyimpan perubahan ke server.");
        }
    }

    function renderBrankas() {
        passwordList.innerHTML = "";
        if (brankasData.length === 0) {
            passwordList.innerHTML = "<div class='list-row-info'>Brankas kosong. Klik 'Tambah Baru' untuk memulai.</div>";
            return;
        }
        brankasData.forEach(data => {
            const row = document.createElement("div");
            row.className = "list-row";
            const securityClass = data.security === 'kuat' ? 'text-green-400' : data.security === 'sedang' ? 'text-yellow-400' : 'text-red-400';
            
            row.innerHTML = `
                <div>${data.name}</div>
                <div>${data.lastUsed}</div>
                <div>${data.username}</div>
                <div class="font-bold ${securityClass}">${data.security.charAt(0).toUpperCase() + data.security.slice(1)}</div>
                <div class="action-buttons">
                    <button onclick='window.app.showDetail("${data.id}")' title="Lihat"><i class="fas fa-eye"></i></button>
                    <button onclick='window.app.editPassword("${data.id}")' title="Edit"><i class="fas fa-edit"></i></button>
                    <button onclick='window.app.deletePassword("${data.id}")' class="delete-btn" title="Hapus"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            passwordList.appendChild(row);
        });
    }

    // ==========================================================
    // BAGIAN 3: FUNGSI INTERAKSI (Namespace untuk event `onclick`)
    // ==========================================================
    window.app = {
        showDetail: (id) => {
            const data = brankasData.find(item => item.id === id);
            if (!data) return;
            document.getElementById("detailName").textContent = data.name;
            document.getElementById("detailUsername").textContent = data.username;
            document.getElementById("detailPassword").textContent = "********";
            document.getElementById("detailNote").textContent = data.note || "-";
            document.getElementById("detailSecurity").textContent = data.security;
            document.getElementById("detailLastUsed").textContent = data.lastUsed;detailDataSaatIni = data;
            detailModal.classList.add("show");
        },

        editPassword: (id) => {
            const data = brankasData.find(item => item.id === id);
            if (!data) return;
            addEntryForm.reset();
            addModal.classList.add("show");
            document.getElementById("modalTitle").textContent = "Edit Kata Sandi";
            document.getElementById("addName").value = data.name;
            document.getElementById("addUsername").value = data.username;
            document.getElementById("addPassword").value = data.password;
            document.getElementById("addNote").value = data.note;
            detailDataSaatIni = { ...data, isEditing: true };
        },

        deletePassword: (id) => {
            if (!confirm("Anda yakin ingin menghapus data ini? Aksi ini tidak bisa dibatalkan.")) return;
            brankasData = brankasData.filter(item => item.id !== id);
            renderBrankas();
            enkripsiDanSimpanBrankas();
        }
    };

    function evaluatePasswordStrength(password) {
        if (!password) return 'lemah';
        const score = zxcvbn(password).score; // Gunakan zxcvbn untuk skor 0-4
        if (score >= 3) return "kuat";
        if (score >= 1) return "sedang";
        return "lemah";
    }

    // ==========================================================
    // BAGIAN 4: EVENT LISTENERS
    // ==========================================================
    openAddModalBtn.addEventListener('click', () => {
        addEntryForm.reset();
        document.getElementById("modalTitle").textContent = "Tambah Entri Baru";
        detailDataSaatIni = {};
        addModal.classList.add("show");
    });
    
    savePasswordBtn.addEventListener('click', () => {
        const passwordValue = document.getElementById("addPassword").value;
        const newData = {
            id: detailDataSaatIni.isEditing ? detailDataSaatIni.id : Date.now().toString(),
            name: document.getElementById("addName").value,
            username: document.getElementById("addUsername").value,
            password: passwordValue,
            note: document.getElementById("addNote").value,
            lastUsed: new Date().toLocaleString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            security: evaluatePasswordStrength(passwordValue)
        };

        if (!newData.name || !newData.username || !newData.password) {
            alert("Nama Situs, Username, dan Password tidak boleh kosong!");
            return;
        }

        if (detailDataSaatIni.isEditing) {
            brankasData = brankasData.map(item => item.id === newData.id ? newData : item);
        } else {
            brankasData.push(newData);
        }

        addModal.classList.remove("show");
        renderBrankas();
        enkripsiDanSimpanBrankas();
    });

    cancelAddBtn.addEventListener('click', () => addModal.classList.remove("show"));
    closeDetailBtn.addEventListener('click', () => detailModal.classList.remove("show"));

    togglePassBtn.addEventListener('click', () => {
        const span = document.getElementById("detailPassword");
        const icon = togglePassBtn.querySelector('i');
        if (span.textContent === "********") {
            span.textContent = detailDataSaatIni.password;
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            span.textContent = "********";
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });

    copyPassBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(detailDataSaatIni.password).then(() => {
            alert("Password berhasil disalin!");
        }).catch(() => alert("Gagal menyalin."));
    });
    
    // ==========================================================
    // BAGIAN 5: JALANKAN SAAT HALAMAN DIBUKA
    // ==========================================================
    muatDanDekripsiBrankas();
});