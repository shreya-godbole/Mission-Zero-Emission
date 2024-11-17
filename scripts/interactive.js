const outputDiv = document.getElementById('output');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

window.ipc.on('java-output', (event, data) => {
    outputDiv.innerHTML += `<div>${data}</div>`;
});

sendButton.addEventListener('click', () => {
    const input = userInput.value;
    window.ipc.send('send-user-input', input);
    userInput.value = ''; // Clear the input field
});
