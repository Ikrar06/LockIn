document.addEventListener('DOMContentLoaded', () => {
    // Selektor untuk semua elemen interaktif
    const lengthSlider = document.getElementById('length-slider');
    const lengthValueSpan = document.getElementById('length-value');
    const passwordDisplay = document.getElementById('password-display');
    
    const uppercaseCheck = document.getElementById('uppercase');
    const lowercaseCheck = document.getElementById('lowercase');
    const numbersCheck = document.getElementById('numbers');
    const symbolsCheck = document.getElementById('symbols');
    
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');

    // Daftar karakter untuk setiap opsi
    const charSets = {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+=-`~[]{}|;\':",./<>?'
    };

    /**
     * Fungsi utama untuk membuat password baru
     */
    function generatePassword() {
        const length = lengthSlider.value;
        let characterPool = '';
        let password = '';
        
        // Bangun "kolam" karakter berdasarkan opsi yang dicentang
        if (uppercaseCheck.checked) characterPool += charSets.uppercase;
        if (lowercaseCheck.checked) characterPool += charSets.lowercase;
        if (numbersCheck.checked) characterPool += charSets.numbers;
        if (symbolsCheck.checked) characterPool += charSets.symbols;

        if (characterPool === '') {
            passwordDisplay.value = 'Pilih minimal satu opsi!';
            return;
        }

        // Ambil satu karakter dari setiap set yang aktif untuk menjamin password mengandung semuanya
        let guaranteedChars = '';
        if (uppercaseCheck.checked) guaranteedChars += charSets.uppercase[Math.floor(Math.random() * charSets.uppercase.length)];
        if (lowercaseCheck.checked) guaranteedChars += charSets.lowercase[Math.floor(Math.random() * charSets.lowercase.length)];
        if (numbersCheck.checked) guaranteedChars += charSets.numbers[Math.floor(Math.random() * charSets.numbers.length)];
        if (symbolsCheck.checked) guaranteedChars += charSets.symbols[Math.floor(Math.random() * charSets.symbols.length)];

        // Isi sisa password dengan karakter acak dari "kolam"
        for (let i = guaranteedChars.length; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characterPool.length);
            password += characterPool.charAt(randomIndex);
        }

        // Gabungkan dan acak hasilnya agar karakter jaminan tidak selalu di depan
        password = guaranteedChars + password;
        passwordDisplay.value = password.split('').sort(() => 0.5 - Math.random()).join('');
    }

    /**
     * Fungsi untuk menyalin password ke clipboard
     */
    function copyPassword() {
    const password = passwordDisplay.value;
    if (password && !password.includes('Pilih')) {
        navigator.clipboard.writeText(password).then(() => {
            const toast = document.createElement('div');
            toast.textContent = 'Password disalin!';
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.padding = '10px 20px';
            toast.style.backgroundColor = '#256EDB';
            toast.style.color = '#fff';
            toast.style.borderRadius = '8px';
            toast.style.zIndex = '1000';
            toast.style.fontFamily = 'Poppins, sans-serif';
            document.body.appendChild(toast);
            setTimeout(() => document.body.removeChild(toast), 2000);
        }).catch(() => {
            alert('Gagal menyalin password.');
        });
        }
        }


    /**
     * Memperbarui tampilan angka panjang password saat slider digerakkan
     */
    function updateLengthDisplay() {
        lengthValueSpan.textContent = lengthSlider.value;
    }

    // --- Tambahkan Event Listeners ---
    lengthSlider.addEventListener('input', updateLengthDisplay);
    generateBtn.addEventListener('click', generatePassword);
    copyBtn.addEventListener('click', copyPassword);
    
    // --- Inisialisasi Halaman ---
    updateLengthDisplay(); // Set nilai awal
    generatePassword(); // Langsung buat password saat halaman dimuat
});