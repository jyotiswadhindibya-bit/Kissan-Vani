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

micBtn.addEventListener('click', () => {
    const langcode = langSelect.value ==='Odia' ? 'or-IN' : langSelect.value;
    recognition.lang = langcode;
    micBtn.classList.add('listening');
    statusText.innerText = "Listening...बोलिए...କୁହନ୍ତୁ...";
});
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
window.clearImage = function() {
    selectedImageBase64 = null;
    imageInput.value = "";
    imagePreviewContainer.classList.add('hidden');
    statusText.innerText = "Tap the mic to ask a question";
};
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
recognition.onerror = () => {
    micBtn.classList.remove('listening');
    statusText.innerText = "Didn't catch that. Try again.";
};

function addMessage(text, className) {
    const div = document.createElement('div');
    div.classList.add('msg', className);
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function speak(text, lang) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
}
