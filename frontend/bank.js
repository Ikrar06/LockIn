document.addEventListener('DOMContentLoaded', async () => {
    if (!document.getElementById('passwordList')) return;

    const encryptionKeyString = sessionStorage.getItem('kunciEnkripsi');
    const userEmail = sessionStorage.getItem('userEmail');

    if (!encryptionKeyString || !userEmail) {
        alert("Invalid session! Please log in again.");
        window.location.href = 'auth.html';
        return;
    }

    const encryptionKey = new Uint8Array(JSON.parse(encryptionKeyString)).buffer;

    const passwordList = document.getElementById("passwordList");
    const addModal = document.getElementById("addModal");
    const detailModal = document.getElementById("detailModal");
    const openAddModalBtn = document.getElementById("openAddModal");
    const savePasswordBtn = document.getElementById("savePassword");
    const cancelAddBtn = document.getElementById("cancelAdd");
    const cancelAdd2Btn = document.getElementById("cancelAdd2");
    const closeDetailBtn = document.getElementById("closeDetail");
    const togglePassBtn = document.getElementById("togglePass");
    const copyPassBtn = document.getElementById("copyPass");
    const addEntryForm = document.getElementById("addEntryForm");
    const addPasswordInput = document.getElementById("addPassword");
    const strengthBar = document.getElementById("strength-bar");
    const strengthText = document.getElementById("strength-text");

    let vaultData = [];
    let currentDetailData = {};
    let isEditing = false;
    let editingId = null;

    async function loadAndDecryptVault() {
        passwordList.innerHTML = `<div class="list-row-info">Loading vault...</div>`;
        const encryptedVaultString = sessionStorage.getItem('encryptedVault');

        if (encryptedVaultString && encryptedVaultString.length > 2 && encryptedVaultString !== '""') {
            try {
                const encryptedPackage = JSON.parse(encryptedVaultString);
                if (!encryptedPackage.ct || !encryptedPackage.iv) throw new Error("Invalid session vault data format.");
                
                const decryptedJson = await dekripsi(encryptionKey, encryptedPackage);
                if (decryptedJson === null) throw new Error("Decryption failed. Possibly corrupt key or data.");

                vaultData = JSON.parse(decryptedJson) || [];
            } catch (e) {
                console.error("Failed to load or decrypt vault:", e);
                vaultData = [];
                passwordList.innerHTML = `<div class='list-row-info error'>Failed to load data. Try logging in again.</div>`;
            }
        } else {
            vaultData = [];
        }

        renderVault();
    }

    async function encryptAndSaveVault() {
        try {
            const jsonString = JSON.stringify(vaultData);
            const encryptedPackage = await enkripsi(encryptionKey, jsonString);
            const encryptedVaultString = JSON.stringify(encryptedPackage);

            const response = await fetch(`${window.config.API_URL}/vault/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, encryptedVault: encryptedVaultString })
            });

            if (!response.ok) throw new Error('Failed to sync with server.');

            sessionStorage.setItem('encryptedVault', encryptedVaultString);
            console.log("Vault successfully synced and local session updated.");
        } catch (error) {
            console.error("Failed to save vault:", error);
            window.utils.tampilkanNotifikasi("Failed to save changes to server.", 'error');
        }
    }

    function renderVault() {
        passwordList.innerHTML = "";
        if (vaultData.length === 0) {
            passwordList.innerHTML = "<div class='list-row-info'>Vault is empty. Click 'Add New Entry' to get started.</div>";
            return;
        }

        vaultData.forEach(data => {
            const row = document.createElement("div");
            row.className = "list-row";
            const securityClass = `text-${data.security.toLowerCase().replace(/\s+/g, '-')}`;
            
            row.innerHTML = `
                <div class="font-semibold">${data.name || '-'}</div>
                <div>${data.lastUsed || '-'}</div>
                <div>${data.username || '-'}</div>
                <div class="font-bold ${securityClass}">${data.security ? data.security.charAt(0).toUpperCase() + data.security.slice(1) : '-'}</div>
                <div class="action-buttons">
                    <button onclick='window.app.showDetail("${data.id}")' title="View Detail"><img src="eye.png" class="custom-icon-eye" alt="Eye Icon" /></button>
                    <button onclick='window.app.editPassword("${data.id}")' title="Edit"><img src="edit.png" class="custom-icon-eye" alt="Edit Icon" /></button>
                    <button onclick='window.app.deletePassword("${data.id}")' class="delete-btn" title="Delete"><img src="delete.png" class="custom-icon-eye" alt="Delete Icon" /></button>
                </div>
            `;
            passwordList.appendChild(row);
        });
    }

    function evaluatePasswordStrength(password) {
        if (!password) return 'Very Weak';
        const result = zxcvbn(password);
        const score = result.score;
        switch (score) {
            case 0: return 'Very Weak';
            case 1: return 'Weak';
            case 2: return 'Medium';
            case 3: return 'Strong';
            case 4: return 'Very Strong';
            default: return 'Weak';
        }
    }

    window.app = {
        showDetail: (id) => {
            const data = vaultData.find(item => item.id === id);
            if (!data || !detailModal) return;

            document.getElementById("detailName").textContent = data.name;
            document.getElementById("detailUsername").textContent = data.username;
            document.getElementById("detailPassword").textContent = "********";
            document.getElementById("detailNote").textContent = data.note || "-";
            document.getElementById("detailSecurity").textContent = data.security;
            document.getElementById("detailLastUsed").textContent = data.lastUsed;

            currentDetailData = data;
            detailModal.classList.add("show");
        },

        editPassword: (id) => {
            const data = vaultData.find(item => item.id === id);
            if (!data || !addModal) return;

            addEntryForm.reset();
            addModal.classList.add("show");
            document.getElementById("modalTitle").textContent = "Edit Entry";
            document.getElementById("addName").value = data.name;
            document.getElementById("addUsername").value = data.username;
            document.getElementById("addPassword").value = data.password;
            document.getElementById("addNote").value = data.note;

            isEditing = true;
            editingId = id;

            addPasswordInput.dispatchEvent(new Event('input'));
        },

        deletePassword: async (id) => {
            if (window.utils && typeof window.utils.tampilkanConfirmModal === 'function') {
                const confirmed = await window.utils.tampilkanConfirmModal(
                    "Are you sure you want to delete this entry? This action cannot be undone.",
                    {
                        judul: "Delete Data",
                        tombolYa: "Delete",
                        kelasTombolYa: "btn-danger"
                    }
                );
                if (confirmed) {
                    vaultData = vaultData.filter(item => item.id !== id);
                    renderVault();
                    await encryptAndSaveVault();
                    window.utils.tampilkanNotifikasi("Entry deleted successfully!");
                } else {
                    console.log("Delete action was cancelled by the user.");
                }
            }
        }
    };

    function setupEventListener(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    setupEventListener(openAddModalBtn, 'click', () => {
        addEntryForm.reset();
        document.getElementById("modalTitle").textContent = "Add New Entry";
        isEditing = false;
        editingId = null;
        if (strengthBar) strengthBar.className = 'strength-bar';
        if (strengthText) strengthText.textContent = '';
        if (addModal) addModal.classList.add("show");
    });

    setupEventListener(savePasswordBtn, 'click', async () => {
        const passwordValue = document.getElementById("addPassword").value;
        const newData = {
            id: isEditing ? editingId : Date.now().toString(),
            name: document.getElementById("addName").value,
            username: document.getElementById("addUsername").value,
            password: passwordValue,
            note: document.getElementById("addNote").value,
            lastUsed: new Date().toLocaleString("en-US"),
            security: evaluatePasswordStrength(passwordValue)
        };

        if (!newData.name || !newData.username || !newData.password) {
            window.utils.tampilkanNotifikasi("Site Name, Username, and Password are required!", 'error');
            return;
        }

        if (isEditing) {
            vaultData = vaultData.map(item => item.id === editingId ? newData : item);
        } else {
            vaultData.push(newData);
        }

        if (addModal) addModal.classList.remove("show");
        renderVault();
        await encryptAndSaveVault();
        const successMsg = isEditing ? "Entry updated successfully!" : "New entry saved!";
        window.utils.tampilkanNotifikasi(successMsg);
    });

    setupEventListener(cancelAddBtn, 'click', () => addModal.classList.remove("show"));
    setupEventListener(cancelAdd2Btn, 'click', () => addModal.classList.remove("show"));
    setupEventListener(closeDetailBtn, 'click', () => detailModal.classList.remove("show"));

    setupEventListener(togglePassBtn, 'click', () => {
        const passwordSpan = document.getElementById("detailPassword");
        const iconImg = togglePassBtn.querySelector('img');
        if (!passwordSpan || !iconImg || !currentDetailData.password) return;

        if (passwordSpan.textContent === "********") {
            passwordSpan.textContent = currentDetailData.password;
            iconImg.src = "eye-closed.png";
            togglePassBtn.setAttribute('title', 'Hide');
        } else {
            passwordSpan.textContent = "********";
            iconImg.src = "eye.png";
            togglePassBtn.setAttribute('title', 'Show');
        }
    });

    setupEventListener(copyPassBtn, 'click', () => {
        if (currentDetailData.password) {
            navigator.clipboard.writeText(currentDetailData.password)
                .then(() => {
                    window.utils.tampilkanNotifikasi("Password copied to clipboard!");
                })
                .catch(err => {
                    console.error("Copy failed:", err);
                    window.utils.tampilkanNotifikasi("Failed to copy password.", 'error');
                });
        }
    });

    setupEventListener(addPasswordInput, 'input', () => {
        const password = addPasswordInput.value;
        if (password === "") {
            strengthBar.className = 'strength-bar';
            strengthText.textContent = '';
            return;
        }
        const strength = evaluatePasswordStrength(password);
        const strengthClass = strength.toLowerCase().replace(' ', '-');
        strengthBar.className = 'strength-bar ' + strengthClass;
        strengthText.className = 'strength-text ' + strengthClass;
        strengthText.textContent = strength;
    });

    loadAndDecryptVault();
});
