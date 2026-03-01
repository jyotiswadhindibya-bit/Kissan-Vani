document.addEventListener('DOMContentLoaded', () => {
    const langSelect = document.getElementById('dashboard-lang');
    const loginBtn = document.querySelector('.nav-login-btn');

    // 1. INITIALIZE PAGE LANGUAGE
    const savedLang = localStorage.getItem('userLanguage') || 'en-IN';
    langSelect.value = savedLang;
    applyLanguage(savedLang);

    // 2. LANGUAGE CHANGE EVENT
    langSelect.addEventListener('change', (e) => {
        const selectedLang = e.target.value;
        localStorage.setItem('userLanguage', selectedLang); // Save for later/other pages
        applyLanguage(selectedLang);
    });

    // 3. LOGIN REDIRECTION
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // The language is already in localStorage, so login.html can read it
        window.location.href = 'login.html';
    });

    /**
     * Finds all elements with [data-key] and updates their text content
     * based on the selected language from translations.js
     */
    function applyLanguage(lang) {
        // Ensure translations object exists from your external file
        if (typeof translations === 'undefined') {
            console.error("translations.js not loaded!");
            return;
        }

        const elements = document.querySelectorAll('[data-key]');
        elements.forEach(el => {
            const key = el.getAttribute('data-key');
            if (translations[lang] && translations[lang][key]) {
                el.innerText = translations[lang][key];
            }
        });

        // Update Voice Assistant Language specifically
        setupVoiceAssistant(lang);
    }

    function setupVoiceAssistant(lang) {
        // Logic to set the Speech Recognition language
        // Example: recognition.lang = lang;
        console.log(`Voice Assistant set to: ${lang}`);
    }
});