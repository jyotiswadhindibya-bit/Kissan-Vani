const micBtn = document.getElementById('mic-btn');
const statusText = document.getElementById('status-text');
const chatBox = document.getElementById('chat-box');
const langSelect = document.getElementById('language');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

micBtn.addEventListener('click', () => {
    recognition.lang = langSelect.value;
    recognition.start();
    micBtn.classList.add('listening');
    statusText.innerText = "Listening... (Bolिये)";
});
recognition.onresult = async (event) => {
    micBtn.classList.remove('listening');
    const userText = event.results[0][0].transcript;

    addMessage(userText, 'user-msg');
    statusText.innerText = "Consulting AI Expert...";
    try {
        const response = await fetch('http://localhost:5000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: userText, 
                language: langSelect.options[langSelect.selectedIndex].text 
            })
        });
        const data = await response.json();
        const botReply = data.reply;

        addMessage(botReply, 'bot-msg');
        statusText.innerText = "Tap mic to ask again";

        speak(botReply, langSelect.value);
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