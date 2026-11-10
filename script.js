let workTime = 25 * 60;
let breakTime = 5 * 60;
let longBreakTime = 15 * 60;
let cycleCount = 4;
let currentCycle = 1;
let isWorking = true;
let tickId = null;        // intervallo di aggiornamento (null = fermo o in pausa)
let phaseActive = false;  // c'è una fase iniziata (in corso o in pausa)
let remainingMs = 0;      // tempo che manca alla fine della fase
let endAt = 0;            // orario (ms) in cui finisce la fase
let wakeLock = null;
let audioUnlocked = false;

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
    unlockAudio(); // su iPhone i suoni partono più tardi solo se sbloccati con un tocco
    if (tickId) {
        pauseTimer();
        document.getElementById('toggleIcon').classList.replace('fa-pause', 'fa-play');
        stopRain();
        stopSounds();
    } else if (phaseActive) {
        resumeTimer();
        document.getElementById('toggleIcon').classList.replace('fa-play', 'fa-pause');
    } else {
        startTimer(workTime, document.getElementById('time'));
        updateCycleInfo();
        document.getElementById('toggleIcon').classList.replace('fa-play', 'fa-pause');
    }
});

document.getElementById('stopButton').addEventListener('click', () => {
    clearInterval(tickId);
    tickId = null;
    phaseActive = false;
    releaseWakeLock();
    document.getElementById('time').textContent = formatTime(workTime);
    document.getElementById('toggleIcon').classList.replace('fa-pause', 'fa-play');
    currentCycle = 1;
    isWorking = true;
    updateCycleInfo();
    resetStudyMessage();
    stopRain();
    stopSounds();
});

// Il tempo si calcola dall'orario di fine e non contando i tick: se iOS rallenta
// la pagina (schermo bloccato, altra app) il timer resta giusto.
function startTimer(duration, display) {
    phaseActive = true;
    remainingMs = duration * 1000;
    resumeTimer();
}

function resumeTimer() {
    endAt = Date.now() + remainingMs;
    clearInterval(tickId);
    tickId = setInterval(tick, 250);
    tick();
    requestWakeLock();
}

function pauseTimer() {
    remainingMs = Math.max(0, endAt - Date.now());
    clearInterval(tickId);
    tickId = null;
    releaseWakeLock();
}

function tick() {
    const left = endAt - Date.now();
    if (left <= 0) {
        clearInterval(tickId);
        tickId = null;
        document.getElementById('time').textContent = formatTime(0);
        playNotification();
        timerFinished();
        return;
    }
    document.getElementById('time').textContent = formatTime(Math.ceil(left / 1000));
}

// Quando si torna sulla app: aggiorna subito il tempo e riprende a tenere lo schermo acceso.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && tickId) {
        tick();
        requestWakeLock();
    }
});

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator && !wakeLock) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => { wakeLock = null; });
        }
    } catch (e) { /* non disponibile: pazienza */ }
}

function releaseWakeLock() {
    try { if (wakeLock) wakeLock.release(); } catch (e) {}
    wakeLock = null;
}

// Safari permette di riprodurre un suono solo se quell'elemento è stato avviato da un tocco.
function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    [notificationSound, notificationLongSound].forEach((el) => {
        el.muted = true;
        const fine = () => { el.pause(); el.currentTime = 0; el.muted = false; };
        try {
            const p = el.play();
            if (p && p.then) p.then(fine).catch(() => { el.muted = false; audioUnlocked = false; });
            else fine();
        } catch (e) { el.muted = false; audioUnlocked = false; }
    });
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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}
