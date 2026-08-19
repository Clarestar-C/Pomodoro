// ==========================================
// 1. DOM CORE COMPONENTS & INTERFACE NODES
// ==========================================
const timeLeftDisplay = document.getElementById('time-left');
const timerLabel = document.getElementById('timer-label');
const startStopButton = document.getElementById('start-stop');
const resetButton = document.getElementById('reset');
const modeButtons = document.querySelectorAll('.mode-btn');
const timerCard = document.querySelector('.timer-card');

const progressCircle = document.getElementById('progress-ring-fill');
const radius = 115;
const circumference = 2 * Math.PI * radius;

const sessionsCompletedDisplay = document.getElementById('sessions-completed');
const focusMinutesDisplay = document.getElementById('focus-minutes');

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModalBtn = document.getElementById('close-modal');
const saveSettingsBtn = document.getElementById('save-settings');

const alarmSound = new Audio('alarm.mp3');
let ambientAudio = null;

// ==========================================
// 2. STATE STORES & PERSISTENT DATA ENGINES
// ==========================================
let durations = { pomodoro: 25, shortBreak: 5, longBreak: 15 };
let tempDurations = { ...durations };
let tempTheme = 'coral';
let tempSound = 'none';

let currentMode = 'pomodoro';
let selectedTheme = 'coral';
let selectedSound = 'none';

let totalSeconds;
let sessionDuration;
let timerInterval = null;
let isRunning = false;

let completedSessions = parseInt(localStorage.getItem('completedSessions') || '0', 10);
let totalFocusMinutes = parseInt(localStorage.getItem('totalFocusMinutes') || '0', 10);

const themes = {
    coral: { primary: '#E98B9A', hover: '#D77A89', bg: 'linear-gradient(135deg, #F8F3FF 0%, #EAF7FF 45%, #FFF5F8 100%)', pill: 'rgba(255, 240, 242, 0.65)' },
    blue:  { primary: '#8EAFE6', hover: '#7A9CD3', bg: 'linear-gradient(135deg, #F0F4FC 0%, #E3ECFB 100%)', pill: '#EEF3FD' },
    green: { primary: '#A5D6A7', hover: '#90C392', bg: 'linear-gradient(135deg, #F3FAF4 0%, #E8F5E9 100%)', pill: '#EDF7EE' },
    sand:  { primary: '#E0A98C', hover: '#CE9678', bg: 'linear-gradient(135deg, #FAF4F0 0%, #F5EAE1 100%)', pill: '#F6EFEA' },
    purple:{ primary: '#C3A6DC', hover: '#AF91C9', bg: 'linear-gradient(135deg, #F7F3FB 0%, #EFE7F7 100%)', pill: '#F4EEFA' },
    teal:  { primary: '#86CDD1', hover: '#71B9BD', bg: 'linear-gradient(135deg, #EFF8F9 0%, #E0F2F3 100%)', pill: '#EEF7F8' }
};

const soundTracks = {
    rain: './rain.aac',
    cafe: './cafe.mp3',
    ocean: './ocean.mpeg'
};

const MODE_LABELS = {
    pomodoro: 'Pomodoro',
    shortBreak: 'Short Break',
    longBreak: 'Long Break'
};

const DURATION_DISPLAY_IDS = {
    pomodoro: 'display-pref-pomodoro',
    shortBreak: 'display-pref-short',
    longBreak: 'display-pref-long'
};

if (progressCircle) {
    progressCircle.style.strokeDasharray = `${circumference}`;
    progressCircle.style.strokeDashoffset = '0';
}

// ==========================================
// 3. CORE RUNTIME CALCULATIONS
// ==========================================
function updateProgressRing() {
    if (!progressCircle || !sessionDuration) return;
    const progress = totalSeconds / sessionDuration;
    const offset = circumference - (progress * circumference);
    progressCircle.style.strokeDashoffset = isNaN(offset) ? 0 : offset;
}

function updateDisplay() {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    timeLeftDisplay.innerText = formatted;
    document.title = isRunning ? `${formatted} — ${MODE_LABELS[currentMode]}` : 'Premium Aesthetic Pomodoro';
    updateProgressRing();
}

function applyThemeStyles(themeKey) {
    const theme = themes[themeKey] || themes.coral;
    document.documentElement.style.setProperty('--primary-color', theme.primary);
    document.documentElement.style.setProperty('--primary-hover', theme.hover);
    document.documentElement.style.setProperty('--bg-gradient', theme.bg);
    document.documentElement.style.setProperty('--pill-bg-inactive', theme.pill);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    startStopButton.innerText = 'Start';
    timerCard.classList.remove('running');
    stopAmbientSound();
}

function switchMode(newMode) {
    stopTimer();
    currentMode = newMode;
    timerLabel.innerText = MODE_LABELS[currentMode];

    durations[currentMode] = parseInt(durations[currentMode], 10);
    totalSeconds = durations[currentMode] * 60;
    sessionDuration = totalSeconds;

    updateDisplay();

    modeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === currentMode);
    });
}

function loadSavedPreferences() {
    const today = new Date().toDateString(); // e.g., "Wed Aug 19 2026"
    const savedDate = localStorage.getItem('lastActiveDate');

    // Reset stats if it's a brand new day
    if (savedDate !== today) {
        completedSessions = 0;
        totalFocusMinutes = 0;
        localStorage.setItem('completedSessions', '0');
        localStorage.setItem('totalFocusMinutes', '0');
        localStorage.setItem('lastActiveDate', today);
    } else {
        completedSessions = parseInt(localStorage.getItem('completedSessions') || '0', 10);
        totalFocusMinutes = parseInt(localStorage.getItem('totalFocusMinutes') || '0', 10);
    }

    const savedSettings = localStorage.getItem('pomodoroSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        durations = settings.durations;
        selectedTheme = settings.theme;
        selectedSound = settings.sound || 'none';
        applyThemeStyles(selectedTheme);
    }

    sessionsCompletedDisplay.innerText = completedSessions;
    focusMinutesDisplay.innerText = `${totalFocusMinutes}m`;
}

// ==========================================
// 4. AUDIO & AMBIENT SCAPE ENGINE
// ==========================================
function playAlarm() {
    alarmSound.currentTime = 0;
    alarmSound.play().catch(() => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.9);
        } catch (err) {
            console.log('Alarm playback unavailable.');
        }
    });
}

function playAmbientSound() {
    stopAmbientSound();
    if (selectedSound === 'none' || !soundTracks[selectedSound]) return;

    ambientAudio = new Audio(soundTracks[selectedSound]);
    ambientAudio.loop = true;

    // Set custom volumes per track (0.0 to 1.0)
    const soundVolumes = {
        rain: 0.4,
        cafe: 0.4,
        ocean: 0.95  // Boosted ocean volume
    };
    ambientAudio.volume = soundVolumes[selectedSound] || 0.5;

    ambientAudio.play().catch(() => console.log('Ambient audio blocked until user interaction.'));
}

function stopAmbientSound() {
    if (ambientAudio) {
        ambientAudio.pause();
        ambientAudio = null;
    }
}

// ==========================================
// 5. TIMER SESSION FLOW
// ==========================================
function handleSessionComplete() {
    stopTimer();
    playAlarm();

    if (currentMode === 'pomodoro') {
        completedSessions++;
        totalFocusMinutes += parseInt(durations.pomodoro, 10);
        localStorage.setItem('completedSessions', completedSessions);
        localStorage.setItem('totalFocusMinutes', totalFocusMinutes);
        sessionsCompletedDisplay.innerText = completedSessions;
        focusMinutesDisplay.innerText = `${totalFocusMinutes}m`;
        switchMode(completedSessions % 4 === 0 ? 'longBreak' : 'shortBreak');
    } else {
        switchMode('pomodoro');
    }
}

function onTimerTick() {
    totalSeconds--;
    updateDisplay();
    if (totalSeconds <= 0) {
        handleSessionComplete();
    }
}

function startTimer() {
    isRunning = true;
    startStopButton.innerText = 'Pause';
    timerCard.classList.add('running');
    playAmbientSound();
    timerInterval = setInterval(onTimerTick, 1000);
}

// ==========================================
// 6. EVENT LISTENERS & INTERFACE ROUTINES
// ==========================================
modeButtons.forEach(button => {
    button.addEventListener('click', () => switchMode(button.getAttribute('data-mode')));
});

startStopButton.addEventListener('click', () => {
    if (!isRunning) {
        startTimer();
    } else {
        stopTimer();
    }
});

resetButton.addEventListener('click', () => switchMode(currentMode));

// ==========================================
// 7. MODAL ACTIONS & FORM SUBMISSIONS
// ==========================================
function updateSettingsPanelUI() {
    document.getElementById('display-pref-pomodoro').innerText = tempDurations.pomodoro;
    document.getElementById('display-pref-short').innerText = tempDurations.shortBreak;
    document.getElementById('display-pref-long').innerText = tempDurations.longBreak;

    document.querySelectorAll('.color-circle').forEach(c => {
        const isActive = c.getAttribute('data-theme') === tempTheme;
        c.classList.toggle('active', isActive);
        c.innerText = isActive ? '✓' : '';
    });

    document.querySelectorAll('.sound-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-sound') === tempSound);
    });
}

function isModalOpen() {
    return settingsModal.style.display === 'flex';
}

function openSettingsModal() {
    tempDurations = { ...durations };
    tempTheme = selectedTheme;
    tempSound = selectedSound;
    updateSettingsPanelUI();
    settingsModal.style.display = 'flex';
}

function hideModal() {
    settingsModal.style.display = 'none';
}

settingsBtn.addEventListener('click', openSettingsModal);
closeModalBtn.addEventListener('click', hideModal);
window.addEventListener('click', (e) => { if (e.target === settingsModal) hideModal(); });

document.querySelectorAll('.step-btn').forEach(button => {
    button.addEventListener('click', function() {
        const action = this.getAttribute('data-action');
        const target = this.getAttribute('data-target');

        if (action === 'plus') {
            tempDurations[target] = Math.min(tempDurations[target] + 1, 60);
        } else {
            tempDurations[target] = Math.max(tempDurations[target] - 1, 1);
        }

        document.getElementById(DURATION_DISPLAY_IDS[target]).innerText = tempDurations[target];
    });
});

document.querySelectorAll('.color-circle').forEach(circle => {
    circle.addEventListener('click', function() {
        tempTheme = this.getAttribute('data-theme');
        updateSettingsPanelUI();
    });
});

document.querySelectorAll('.sound-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        tempSound = this.getAttribute('data-sound');
        updateSettingsPanelUI();
    });
});

saveSettingsBtn.addEventListener('click', () => {
    const wasRunning = isRunning;
    const remainingSeconds = totalSeconds;

    durations = { ...tempDurations };
    selectedTheme = tempTheme;
    selectedSound = tempSound;

    localStorage.setItem('pomodoroSettings', JSON.stringify({
        durations,
        theme: selectedTheme,
        sound: selectedSound
    }));

    applyThemeStyles(selectedTheme);
    hideModal();

    stopTimer();

    durations[currentMode] = parseInt(durations[currentMode], 10);
    sessionDuration = durations[currentMode] * 60;

    if (wasRunning && remainingSeconds > 0 && remainingSeconds <= sessionDuration) {
        totalSeconds = remainingSeconds;
    } else {
        totalSeconds = sessionDuration;
    }

    updateDisplay();

    if (wasRunning) {
        startTimer();
    }
});

// ==========================================
// 8. KEYBOARD SHORTCUT COMMAND MATRICES
// ==========================================
document.addEventListener('keydown', e => {
    if (isModalOpen()) {
        if (e.key === 'Escape') hideModal();
        return;
    }

    if (e.code === 'Space') {
        e.preventDefault();
        startStopButton.click();
    }
    if (e.key.toLowerCase() === 'r') {
        resetButton.click();
    }
    if (e.key.toLowerCase() === 's') {
        settingsBtn.click();
    }
});

// Run Boot Tasks
loadSavedPreferences();
switchMode('pomodoro');
