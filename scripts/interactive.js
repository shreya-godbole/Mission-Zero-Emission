const outputDiv = document.getElementById('output');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

window.electronAPI.onJavaOutput((data) => {
    const outputDiv = document.getElementById('output');  // Ensure this element exists
    outputDiv.innerText += `${data}\n`;
});

sendButton.addEventListener('click', () => {
    const input = userInput.value;
    window.electronAPI.sendUserInput('send-user-input', input);
    userInput.value = ''; // Clear the input field
});
