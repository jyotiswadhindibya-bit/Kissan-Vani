// ========== WELCOME MESSAGE ON LOAD ==========
window.addEventListener('DOMContentLoaded', function() {
    const userName = localStorage.getItem('userName');
    
    if (userName) {
        setTimeout(() => {
            const welcomeMsg = `Welcome ${userName}! I am Kisan Vani, your Digital Saathi. How can I help you today?`;
            addMessage(welcomeMsg, 'bot-msg');
        }, 500);
    }
});

// ========== LOGOUT FUNCTION ==========
function logout() {
    localStorage.removeItem('userName');
    localStorage.removeItem('userPhone');
    return true; // Allow navigation to dashboard
}

// ========== VOICE & CAMERA FUNCTIONALITY ==========

const micBtn = document.getElementById('mic-btn');
const statusText = document.getElementById('status-text');
const chatBox = document.getElementById('chat-box');
const langSelect = document.getElementById('language');
let selectedImageBase64 = null;
const imageInput = document.getElementById('imageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

// Mic button click listener
micBtn.addEventListener('click', () => {
    let selectedLang = langSelect.value; 

    if (selectedLang === "Odia") selectedLang = "or-IN";
    if (selectedLang === "Hindi") selectedLang = "hi-IN";
    if (selectedLang === "English") selectedLang = "en-IN";

    recognition.lang = selectedLang;

    recognition.start();
    
    micBtn.classList.add('listening');
    statusText.innerText = "Listening...";
});

// Image upload listener
imageInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            selectedImageBase64 = e.target.result.split(',')[1]; 
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
            statusText.innerText = "📷 Image attached. Tap Mic to ask!";
        };
        reader.readAsDataURL(file);
    }
});

// Clear image function
window.clearImage = function() {
    selectedImageBase64 = null;
    imageInput.value = "";
    imagePreviewContainer.classList.add('hidden');
    statusText.innerText = "Tap the mic to ask a question";
};

// Speech recognition result handler
recognition.onresult = async (event) => {
    micBtn.classList.remove('listening');
    const userText = event.results[0][0].transcript;

    addMessage(userText, 'user-msg');
    
    if (selectedImageBase64) {
        statusText.innerText = "Analyzing Crop Image...";
    } else {
        statusText.innerText = "Consulting AI Expert...";
    }

    try {
        const response = await fetch('http://localhost:5000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: userText, 
                language: langSelect.options[langSelect.selectedIndex].text,
                image: selectedImageBase64 
            })
        });

        const data = await response.json();
        const botReply = data.reply;

        addMessage(botReply, 'bot-msg');
        statusText.innerText = "Tap mic to ask again";
        speak(botReply, langSelect.value);
        
        if (selectedImageBase64) clearImage();

    } catch (error) {
        console.error(error);
        statusText.innerText = "Error connecting to server.";
    }
};

// Speech recognition error handler
recognition.onerror = () => {
    micBtn.classList.remove('listening');
    statusText.innerText = "Didn't catch that. Try again.";
};

// Add message to chat box
function addMessage(text, className) {
    const div = document.createElement('div');
    div.classList.add('msg', className);
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Text-to-speech function
function speak(text, lang) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
}
<<<<<<< Updated upstream:script.js


//testing
=======
>>>>>>> Stashed changes:js/script.js
