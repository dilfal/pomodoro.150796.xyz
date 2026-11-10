let workTime = 25 * 60;
let breakTime = 5 * 60;
let longBreakTime = 15 * 60;
let cycleCount = 4;
let currentCycle = 1;
let isWorking = true;
let timerInterval;

const notificationSound = document.getElementById('notificationSound');
const notificationLongSound = document.getElementById('notificationLongSound');
const studyMessageElement = document.getElementById('studyMessage');

// Salvataggio delle impostazioni
document.getElementById('saveSettings').addEventListener('click', () => {
    workTime = document.getElementById('workTime').value * 60;
    breakTime = document.getElementById('breakTime').value * 60;
    longBreakTime = document.getElementById('longBreakTime').value * 60;
    cycleCount = document.getElementById('cycleCount').value;

    // Aggiorna immediatamente il timer con il nuovo tempo di studio
    document.getElementById('time').textContent = formatTime(workTime);
    
    // Chiudi il menu delle impostazioni e rimuovi l'oscuramento
    document.getElementById('settingsContent').classList.remove('show');
    document.getElementById('overlay').style.display = 'none';
});

// Impostazioni predefinite
document.getElementById('defaultSettings').addEventListener('click', () => {
    // Imposta i valori predefiniti
    document.getElementById('workTime').value = 25;
    document.getElementById('breakTime').value = 5;
    document.getElementById('longBreakTime').value = 15;
    document.getElementById('cycleCount').value = 4;

    // Aggiorna le variabili con i valori predefiniti
    workTime = 25 * 60;
    breakTime = 5 * 60;
    longBreakTime = 15 * 60;
    cycleCount = 4;

    // Aggiorna immediatamente il timer con il tempo di studio predefinito
    document.getElementById('time').textContent = formatTime(workTime);

    // Chiudi il menu delle impostazioni e rimuovi l'oscuramento
    document.getElementById('settingsContent').classList.remove('show');
    document.getElementById('overlay').style.display = 'none';
});

// Annulla le modifiche e chiudi il menu
document.getElementById('cancelSettings').addEventListener('click', () => {
    // Ripristina i valori attuali (quelli già salvati)
    document.getElementById('workTime').value = workTime / 60;
    document.getElementById('breakTime').value = breakTime / 60;
    document.getElementById('longBreakTime').value = longBreakTime / 60;
    document.getElementById('cycleCount').value = cycleCount;

    // Chiudi il menu delle impostazioni e rimuovi l'oscuramento
    document.getElementById('settingsContent').classList.remove('show');
    document.getElementById('overlay').style.display = 'none'; // Assicura la rimozione dell'overlay
});

// Apertura del menu delle impostazioni
document.getElementById('settingsButton').addEventListener('click', function () {
    const settingsContent = document.getElementById('settingsContent');
    const overlay = document.getElementById('overlay');
    
    if (settingsContent.classList.contains('show')) {
        settingsContent.classList.remove('show');
        overlay.style.display = 'none';
    } else {
        settingsContent.classList.add('show');
        overlay.style.display = 'block';
    }
});

// Evita la chiusura del menu quando si clicca al suo interno
document.getElementById('settingsContent').addEventListener('click', function(event) {
    event.stopPropagation();
});

// Chiude il menu cliccando fuori di esso e rimuove l'overlay
window.addEventListener('click', function (event) {
    const settingsContent = document.getElementById('settingsContent');
    const overlay = document.getElementById('overlay');
    
    if (!settingsContent.contains(event.target) && !event.target.matches('#settingsButton')) {
        settingsContent.classList.remove('show');
        overlay.style.display = 'none';
    }
});

document.getElementById('toggleButton').addEventListener('click', () => {
    if (!timerInterval) {
        startTimer(workTime, document.getElementById('time'));
        updateCycleInfo();
        document.getElementById('toggleIcon').classList.replace('fa-play', 'fa-pause');
    } else {
        clearInterval(timerInterval);
        timerInterval = null;
        document.getElementById('toggleIcon').classList.replace('fa-pause', 'fa-play');
        stopRain();
        stopSounds();
    }
});

document.getElementById('stopButton').addEventListener('click', () => {
    clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById('time').textContent = formatTime(workTime);
    document.getElementById('toggleIcon').classList.replace('fa-pause', 'fa-play');
    currentCycle = 1;
    isWorking = true;
    updateCycleInfo();
    resetStudyMessage();
    stopRain();
    stopSounds();
});

function startTimer(duration, display) {
    let timer = duration, minutes, seconds;
    timerInterval = setInterval(() => {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(timerInterval);
            playNotification();
            timerFinished();
        }
    }, 1000);
}

function timerFinished() {
    if (isWorking) {
        if (currentCycle >= cycleCount) {
            handleLongBreak();
        } else {
            handleShortBreak();
        }
    } else {
        handleWorkPeriod();
    }
    isWorking = !isWorking;
}

function handleLongBreak() {
    playLongBreakNotification();
    startRain();
    updateCycleInfo(true);
    updateStudyMessage(true);
    startTimer(longBreakTime, document.getElementById('time'));
    currentCycle = 1;
}

function handleShortBreak() {
    playNotification();
    updateCycleInfo(false, true);
    updateStudyMessage();
    startTimer(breakTime, document.getElementById('time'));
    currentCycle++;
}

function handleWorkPeriod() {
    stopRain(); // Assicuriamoci che la pioggia si fermi quando inizia un nuovo ciclo di lavoro
    resetStudyMessage();
    startTimer(workTime, document.getElementById('time'));
    updateCycleInfo();
}

function startRain() {
    const rainContainer = document.createElement('div');
    rainContainer.id = 'rainContainer';
    document.body.appendChild(rainContainer);

    const breakSymbols = ['➿', '🐾'];
    for (let i = 0; i < 20; i++) { // Numero di simboli da generare
        const symbol = document.createElement('div');
        symbol.classList.add('rain-symbol');
        symbol.textContent = breakSymbols[Math.floor(Math.random() * breakSymbols.length)];
        rainContainer.appendChild(symbol);

        // Posizionamento casuale e durata dell'animazione
        symbol.style.left = Math.random() * 100 + 'vw';
        symbol.style.top = Math.random() * 100 + 'vh'; // Aggiungi top per la posizione verticale
        symbol.style.animationDuration = Math.random() * 5 + 3 + 's'; // Durata variabile tra 3 e 8 secondi
    }
}

function stopRain() {
    const rainContainer = document.getElementById('rainContainer');
    if (rainContainer) {
        rainContainer.remove(); // Rimuove il contenitore della pioggia e i simboli
    }
}


function playNotification() {
    notificationSound.play(); // Riproduci suono breve alla fine di ogni ciclo
}

function playLongBreakNotification() {
    notificationLongSound.play(); // Riproduci suono lungo alla fine dell'ultimo ciclo di lavoro
}

function stopSounds() {
    notificationSound.pause();
    notificationSound.currentTime = 0;
    notificationLongSound.pause();
    notificationLongSound.currentTime = 0;
}

function updateCycleInfo(isLongBreak = false, isShortBreak = false) {
    const cycleInfoElement = document.getElementById('cycleInfo');
    if (isLongBreak) {
        cycleInfoElement.textContent = "Pausa lunga 😎";
    } else if (isShortBreak) {
        cycleInfoElement.textContent = `Pausa breve (Ciclo ${currentCycle}/${cycleCount}) ⏳️`;
    } else {
        cycleInfoElement.textContent = `Ciclo ${currentCycle}/${cycleCount}`;
    }
}

function updateStudyMessage(isLongBreak = false) {
    if (isLongBreak) {
        studyMessageElement.textContent = "Complimenti! Hai completato tutti i cicli! Ora vai a sgranocchiare qualcosa ﺕ";
    } else {
        studyMessageElement.textContent = "Bravissima! Ora pausa ﺕ";
    }
}

function resetStudyMessage() {
    studyMessageElement.textContent = "Buono studio ❤️";
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

