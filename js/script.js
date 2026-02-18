// ==========================================
// 1. WELCOME MESSAGE & LOGOUT (From Folder Script)
// ==========================================

window.addEventListener('DOMContentLoaded', function() {
    const userName = localStorage.getItem('userName');
    
    if (userName) {
        // Wait 0.5s for the page to settle, then greet
        setTimeout(() => {
            const welcomeMsg = `Welcome ${userName}! I am Kisan Vani, your Digital Saathi. How can I help you today?`;
            addMessage(welcomeMsg, 'bot-msg');
            
            // Optional: Speak the welcome message automatically
            // speak(welcomeMsg, 'en-IN'); 
        }, 500);
    }
});

// Used by the "Logout" button in index.html
function logout() {
    localStorage.removeItem('userName');
    localStorage.removeItem('userPhone');
    return true; // Allows the link to redirect to dashboard.html
}

// ==========================================
// 2. VOICE, CAMERA & CHAT LOGIC
// ==========================================

const micBtn = document.getElementById('mic-btn');
const statusText = document.getElementById('status-text');
const chatBox = document.getElementById('chat-box');
const langSelect = document.getElementById('language');
let selectedImageBase64 = null;
const imageInput = document.getElementById('imageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');

// Initialize Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

// --- MIC BUTTON CLICK ---
micBtn.addEventListener('click', () => {
    // Logic to set language based on your HTML values (hi-IN, en-IN, or-IN)
    // We use the value directly since your HTML <option> values are already correct codes.
    recognition.lang = langSelect.value; 

    recognition.start(); // 🟢 IMPORTANT: This was missing in your root script!
    
    micBtn.classList.add('listening');
    statusText.innerText = "Listening... (Sun raha hoon)...";
});

// --- IMAGE UPLOAD LISTENER ---
imageInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Get base64 string without the "data:image/..." prefix
            selectedImageBase64 = e.target.result.split(',')[1]; 
            
            // Show Preview
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
            statusText.innerText = "📷 Image attached. Tap Mic to ask!";
        };
        reader.readAsDataURL(file);
    }
});

// --- CLEAR IMAGE FUNCTION ---
window.clearImage = function() {
    selectedImageBase64 = null;
    imageInput.value = "";
    imagePreviewContainer.classList.add('hidden');
    statusText.innerText = "Tap the mic to ask a question";
};

// --- SPEECH RESULT (USER FINISHED TALKING) ---
recognition.onresult = async (event) => {
    micBtn.classList.remove('listening');
    const userText = event.results[0][0].transcript;

    // 1. Show User Message
    addMessage(userText, 'user-msg');
    
    // 2. Update Status
    if (selectedImageBase64) {
        statusText.innerText = "Analyzing Crop Image...";
    } else {
        statusText.innerText = "Consulting AI Expert...";
    }

    try {
        // 3. Send to Backend (Gemini)
        const response = await fetch('/api/chat', {  // Use relative path for Vercel compatibility
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: userText, 
                language: langSelect.options[langSelect.selectedIndex].text, // Send "Hindi", "Odia" name for prompting
                image: selectedImageBase64 
            })
        });

        const data = await response.json();
        const botReply = data.reply;

        // 4. Show Bot Reply
        addMessage(botReply, 'bot-msg');
        statusText.innerText = "Tap mic to ask again";
        
        // 5. Speak Reply
        speak(botReply, langSelect.value);
        
        // 6. Cleanup
        if (selectedImageBase64) clearImage();

    } catch (error) {
        console.error(error);
        statusText.innerText = "Error connecting to server.";
        addMessage("⚠️ Server Error. Please check if your backend is running.", 'bot-msg');
    }
};

// --- SPEECH ERROR ---
recognition.onerror = () => {
    micBtn.classList.remove('listening');
    statusText.innerText = "Didn't catch that. Tap and try again.";
};

// --- HELPER: ADD MESSAGE TO UI ---
function addMessage(text, className) {
    const div = document.createElement('div');
    div.classList.add('msg', className);
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto scroll to bottom
}

// --- HELPER: TEXT TO SPEECH ---
function speak(text, lang) {
    // Cancel any previous speech to avoid overlapping
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    
    // Slight adjustments for better Hindi/Odia speed
    utterance.rate = 0.9; 
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
}