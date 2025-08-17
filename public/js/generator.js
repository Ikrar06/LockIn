document.addEventListener('DOMContentLoaded', () => {
    const lengthSlider = document.getElementById('length-slider');
    const lengthValueSpan = document.getElementById('length-value');
    const passwordDisplay = document.getElementById('password-display');
    
    const uppercaseCheck = document.getElementById('uppercase');
    const lowercaseCheck = document.getElementById('lowercase');
    const numbersCheck = document.getElementById('numbers');
    const symbolsCheck = document.getElementById('symbols');
    
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');

    const slider = document.getElementById('length-slider');
    const valueLabel = document.getElementById('length-value');

    const charSets = {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+=-`~[]{}|;\':",./<>?'
    };

    function generatePassword() {
        const length = lengthSlider.value;
        const uppercaseCheck = document.getElementById('uppercase');
        const lowercaseCheck = document.getElementById('lowercase');
        const numbersCheck = document.getElementById('numbers');
        const symbolsCheck = document.getElementById('symbols');
        const passwordDisplay = document.getElementById('password-display');

        let characterPool = '';
        let password = '';
        
        if (uppercaseCheck.checked) characterPool += charSets.uppercase;
        if (lowercaseCheck.checked) characterPool += charSets.lowercase;
        if (numbersCheck.checked) characterPool += charSets.numbers;
        if (symbolsCheck.checked) characterPool += charSets.symbols;

        if (characterPool === '') {
            window.utils.tampilkanNotifikasi("Please select at least one character option!", 'error');
            passwordDisplay.value = ''; 
            return;
        }

        let guaranteedChars = '';
        if (uppercaseCheck.checked) guaranteedChars += charSets.uppercase[Math.floor(Math.random() * charSets.uppercase.length)];
        if (lowercaseCheck.checked) guaranteedChars += charSets.lowercase[Math.floor(Math.random() * charSets.lowercase.length)];
        if (numbersCheck.checked) guaranteedChars += charSets.numbers[Math.floor(Math.random() * charSets.numbers.length)];
        if (symbolsCheck.checked) guaranteedChars += charSets.symbols[Math.floor(Math.random() * charSets.symbols.length)];

        for (let i = guaranteedChars.length; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characterPool.length);
            password += characterPool.charAt(randomIndex);
        }

        password = guaranteedChars + password;
        passwordDisplay.value = password.split('').sort(() => 0.5 - Math.random()).join('');
    }

    function copyPassword() {
        const password = passwordDisplay.value;
        if (password && !password.includes('Click')) {
            navigator.clipboard.writeText(password)
                .then(() => {
                    window.utils.tampilkanNotifikasi("Password copied to clipboard!");
                })
                .catch(err => {
                    console.error('Failed to copy password:', err);
                    window.utils.tampilkanNotifikasi("Failed to copy password.", 'error');
                });
        }
    }

    function updateLengthDisplay() {
        lengthValueSpan.textContent = lengthSlider.value;
    }

    function updateSliderBackground() {
        const min = parseInt(slider.min) || 0;
        const max = parseInt(slider.max) || 100;
        const val = parseInt(slider.value);
        const percentage = ((val - min) / (max - min)) * 100;

        if (valueLabel) valueLabel.textContent = val;
        slider.style.background = `linear-gradient(to right, #256EDB ${percentage}%, #444 ${percentage}%)`;
    }

    updateSliderBackground();
    slider.addEventListener('input', updateSliderBackground);

    lengthSlider.addEventListener('input', updateLengthDisplay);
    generateBtn.addEventListener('click', generatePassword);
    copyBtn.addEventListener('click', copyPassword);
    
    updateLengthDisplay();
    generatePassword();
});
