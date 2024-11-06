const buttonCreated = document.getElementById('upload');
const outputDiv = document.getElementById('result'); 

buttonCreated.addEventListener('click', function(event){
    // Sends to main process
    window.ipc.send('open-file-dialog');
});

window.ipc.on('send-selected-file', function(event, path){
    outputDiv.textContent = `Selected File: ${path}\n\nRunning command...\n`;
});

window.ipc.on('java-command-result', function (event, data) {
    if (data.success) {
        document.getElementById('result').innerText = `Energy Consumption: ${data.output}`;
    } else {
        document.getElementById('result').innerText = `Error: ${data.output}`;
    }
});

// window.ipc.on('csv-data', function (event, { methodNames, energyValues }) {
//     const ctx = document.getElementById('energyChart').getContext('2d');
//     new Chart(ctx, {
//         type: 'bar',
//         data: {
//             labels: methodNames,
//             datasets: [{
//                 label: 'Energy Consumption (Joules)',
//                 data: energyValues,
//                 backgroundColor: 'rgba(75, 192, 192, 0.6)',
//                 borderColor: 'rgba(75, 192, 192, 1)',
//                 borderWidth: 1
//             }]
//         },
//         options: {
//             scales: {
//                 y: {
//                     beginAtZero: true
//                 }
//             },
//             responsive: true,
//             plugins: {
//                 legend: {
//                     display: true
//                 }
//             }
//         }
//     });
// });
    
