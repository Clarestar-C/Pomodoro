// ==========================================
// 1. DOM CORE COMPONENTS & INTERFACE NODES
// ==========================================

const timeLeftDisplay =
    document.getElementById('time-left');

const timerLabel =
    document.getElementById('timer-label');

const startStopButton =
    document.getElementById('start-stop');

const resetButton =
    document.getElementById('reset');

const modeButtons =
    document.querySelectorAll('.mode-btn');

const timerCard =
    document.querySelector('.timer-card');


const progressCircle =
    document.getElementById('progress-ring-fill');

const radius = 115;

const circumference =
    2 * Math.PI * radius;


const sessionsCompletedDisplay =
    document.getElementById('sessions-completed');

const focusMinutesDisplay =
    document.getElementById('focus-minutes');


const settingsBtn =
    document.getElementById('settings-btn');

const settingsModal =
    document.getElementById('settings-modal');

const closeModalBtn =
    document.getElementById('close-modal');

const saveSettingsBtn =
    document.getElementById('save-settings');


const alarmSound =
    new Audio('alarm.mp3');

let ambientAudio = null;


// ==========================================
// 2. STATE STORES & PERSISTENT DATA ENGINES
// ==========================================

let durations = {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15
};

let tempDurations = {
    ...durations
};

let tempTheme = 'coral';

let tempSound = 'none';


let currentMode = 'pomodoro';

let selectedTheme = 'coral';

let selectedSound = 'none';


let totalSeconds;

let sessionDuration;

let timerInterval = null;

let isRunning = false;


let completedSessions =
    parseInt(
        localStorage.getItem('completedSessions') || '0',
        10
    );


let totalFocusMinutes =
    parseInt(
        localStorage.getItem('totalFocusMinutes') || '0',
        10
    );


let ambientAudioA = null;

let ambientAudioB = null;


// ==========================================
// 3. THEMES & AUDIO
// ==========================================

const themes = {

    coral: {
        primary: '#E98B9A',
        hover: '#D77A89',
        bg:
            'linear-gradient(135deg, #F8F3FF 0%, #EAF7FF 45%, #FFF5F8 100%)',
        pill: 'rgba(255, 240, 242, 0.65)'
    },

    blue: {
        primary: '#8EAFE6',
        hover: '#7A9CD3',
        bg:
            'linear-gradient(135deg, #F0F4FC 0%, #E3ECFB 100%)',
        pill: '#EEF3FD'
    },

    green: {
        primary: '#A5D6A7',
        hover: '#90C392',
        bg:
            'linear-gradient(135deg, #F3FAF4 0%, #E8F5E9 100%)',
        pill: '#EDF7EE'
    },

    sand: {
        primary: '#E0A98C',
        hover: '#CE9678',
        bg:
            'linear-gradient(135deg, #FAF4F0 0%, #F5EAE1 100%)',
        pill: '#F6EFEA'
    },

    purple: {
        primary: '#C3A6DC',
        hover: '#AF91C9',
        bg:
            'linear-gradient(135deg, #F7F3FB 0%, #EFE7F7 100%)',
        pill: '#F4EEFA'
    },

    teal: {
        primary: '#86CDD1',
        hover: '#71B9BD',
        bg:
            'linear-gradient(135deg, #EFF8F9 0%, #E0F2F3 100%)',
        pill: '#EEF7F8'
    }

};


const soundTracks = {

    rain: './rain.m4a',

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


// ==========================================
// 4. INITIAL PROGRESS RING
// ==========================================

if (progressCircle) {

    progressCircle.style.strokeDasharray =
        `${circumference}`;

    progressCircle.style.strokeDashoffset =
        '0';

}


// ==========================================
// 5. FOCUS TIME FORMATTER
// ==========================================

/*
   Converts total focus minutes into a nicer format.

   Examples:

   0   → 0m
   25  → 25m
   60  → 1h
   68  → 1h 8m
   120 → 2h
   125 → 2h 5m
*/

function formatFocusTime(totalMinutes) {

    const minutes =
        parseInt(totalMinutes, 10) || 0;


    if (minutes < 60) {

        return `${minutes}m`;

    }


    const hours =
        Math.floor(minutes / 60);

    const remainingMinutes =
        minutes % 60;


    if (remainingMinutes === 0) {

        return `${hours}h`;

    }


    return `${hours}h ${remainingMinutes}m`;

}


// ==========================================
// 6. CORE RUNTIME CALCULATIONS
// ==========================================

function updateProgressRing() {

    if (!progressCircle || !sessionDuration) {
        return;
    }


    const progress =
        totalSeconds / sessionDuration;


    const offset =
        circumference -
        (progress * circumference);


    progressCircle.style.strokeDashoffset =
        isNaN(offset) ? 0 : offset;

}


function updateDisplay() {

    const minutes =
        Math.floor(totalSeconds / 60);


    const seconds =
        totalSeconds % 60;


    const formatted =
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;


    timeLeftDisplay.innerText =
        formatted;


    document.title =
        isRunning
            ? `${formatted} — ${MODE_LABELS[currentMode]}`
            : 'Premium Aesthetic Pomodoro';


    updateProgressRing();

}


function applyThemeStyles(themeKey) {

    const theme =
        themes[themeKey] || themes.coral;


    document.documentElement.style.setProperty(
        '--primary-color',
        theme.primary
    );


    document.documentElement.style.setProperty(
        '--primary-hover',
        theme.hover
    );


    document.documentElement.style.setProperty(
        '--bg-gradient',
        theme.bg
    );


    document.documentElement.style.setProperty(
        '--pill-bg-inactive',
        theme.pill
    );

}


// ==========================================
// 7. TIMER CONTROL
// ==========================================

function stopTimer() {

    clearInterval(timerInterval);

    timerInterval = null;

    isRunning = false;

    startStopButton.innerText =
        'Start';

    timerCard.classList.remove(
        'running'
    );

    stopAmbientSound();

}


function switchMode(newMode) {

    stopTimer();

    currentMode = newMode;

    timerLabel.innerText =
        MODE_LABELS[currentMode];


    durations[currentMode] =
        parseInt(
            durations[currentMode],
            10
        );


    totalSeconds =
        durations[currentMode] * 60;


    sessionDuration =
        totalSeconds;


    updateDisplay();


    modeButtons.forEach(btn => {

        btn.classList.toggle(
            'active',
            btn.getAttribute('data-mode') === currentMode
        );

    });

}


// ==========================================
// 8. LOAD SAVED PREFERENCES
// ==========================================

function loadSavedPreferences() {

    const today =
        new Date().toDateString();


    const savedDate =
        localStorage.getItem(
            'lastActiveDate'
        );


    // Reset daily statistics
    // when a new day starts

    if (savedDate !== today) {

        completedSessions = 0;

        totalFocusMinutes = 0;


        localStorage.setItem(
            'completedSessions',
            '0'
        );


        localStorage.setItem(
            'totalFocusMinutes',
            '0'
        );


        localStorage.setItem(
            'lastActiveDate',
            today
        );

    }

    else {

        completedSessions =
            parseInt(
                localStorage.getItem(
                    'completedSessions'
                ) || '0',
                10
            );


        totalFocusMinutes =
            parseInt(
                localStorage.getItem(
                    'totalFocusMinutes'
                ) || '0',
                10
            );


        if (
            isNaN(completedSessions) ||
            completedSessions < 0
        ) {

            completedSessions = 0;

            localStorage.setItem(
                'completedSessions',
                '0'
            );

        }


        if (
            isNaN(totalFocusMinutes) ||
            totalFocusMinutes < 0
        ) {

            totalFocusMinutes = 0;

            localStorage.setItem(
                'totalFocusMinutes',
                '0'
            );

        }

    }


    // Load saved settings

    const savedSettings =
        localStorage.getItem(
            'pomodoroSettings'
        );


    if (savedSettings) {

        try {

            const settings =
                JSON.parse(savedSettings);


            if (
                settings.durations &&
                typeof settings.durations.pomodoro === 'number' &&
                typeof settings.durations.shortBreak === 'number' &&
                typeof settings.durations.longBreak === 'number' &&
                themes[settings.theme]
            ) {

                durations =
                    settings.durations;


                selectedTheme =
                    settings.theme;


                selectedSound =
                    settings.sound || 'none';


                applyThemeStyles(
                    selectedTheme
                );

            }

        }

        catch (error) {

            console.log(
                'Invalid saved settings. Using defaults.'
            );


            localStorage.removeItem(
                'pomodoroSettings'
            );

        }

    }


    sessionsCompletedDisplay.innerText =
        completedSessions;


    focusMinutesDisplay.innerText =
        formatFocusTime(
            totalFocusMinutes
        );

}


// ==========================================
// 9. AUDIO & AMBIENT SCAPE ENGINE
// ==========================================

function playAlarm() {

    alarmSound.currentTime = 0;


    alarmSound.play().catch(() => {

        try {

            const ctx =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();


            const osc =
                ctx.createOscillator();


            const gain =
                ctx.createGain();


            osc.connect(gain);

            gain.connect(ctx.destination);


            osc.frequency.value =
                880;


            gain.gain.setValueAtTime(
                0.25,
                ctx.currentTime
            );


            gain.gain.exponentialRampToValueAtTime(
                0.01,
                ctx.currentTime + 0.9
            );


            osc.start(
                ctx.currentTime
            );


            osc.stop(
                ctx.currentTime + 0.9
            );

        }

        catch (err) {

            console.log(
                'Alarm playback unavailable.'
            );

        }

    });

}


function playAmbientSound() {

    stopAmbientSound();


    if (
        selectedSound === 'none' ||
        !soundTracks[selectedSound]
    ) {

        return;

    }


    ambientAudio =
        new Audio(
            soundTracks[selectedSound]
        );


    ambientAudio.loop =
        true;


    const soundVolumes = {

        rain: 0.4,

        cafe: 0.4,

        ocean: 0.95

    };


    ambientAudio.volume =
        soundVolumes[selectedSound] || 0.5;


    ambientAudio.play().catch(() => {

        console.log(
            'Ambient audio blocked until user interaction.'
        );

    });

}


function stopAmbientSound() {

    if (ambientAudio) {

        ambientAudio.pause();

        ambientAudio.currentTime = 0;

        ambientAudio = null;

    }

}


// ==========================================
// 10. TIMER SESSION FLOW
// ==========================================

function handleSessionComplete() {

    stopTimer();

    playAlarm();


    if (currentMode === 'pomodoro') {

        completedSessions++;


        totalFocusMinutes +=
            parseInt(
                durations.pomodoro,
                10
            );


        localStorage.setItem(
            'completedSessions',
            completedSessions
        );


        localStorage.setItem(
            'totalFocusMinutes',
            totalFocusMinutes
        );


        sessionsCompletedDisplay.innerText =
            completedSessions;


        focusMinutesDisplay.innerText =
            formatFocusTime(
                totalFocusMinutes
            );


        switchMode(
            completedSessions % 4 === 0
                ? 'longBreak'
                : 'shortBreak'
        );

    }

    else {

        switchMode(
            'pomodoro'
        );

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

    startStopButton.innerText =
        'Pause';


    timerCard.classList.add(
        'running'
    );


    playAmbientSound();


    timerInterval =
        setInterval(
            onTimerTick,
            1000
        );

}


// ==========================================
// 11. MODE BUTTONS
// ==========================================

modeButtons.forEach(button => {

    button.addEventListener(
        'click',
        () => {

            switchMode(
                button.getAttribute(
                    'data-mode'
                )
            );

        }
    );

});


startStopButton.addEventListener(
    'click',
    () => {

        if (!isRunning) {

            startTimer();

        }

        else {

            stopTimer();

        }

    }
);


resetButton.addEventListener(
    'click',
    () => {

        switchMode(
            currentMode
        );

    }
);


// ==========================================
// 12. SETTINGS PANEL
// ==========================================

function updatePresetSelection() {

    document
        .querySelectorAll('.preset-option')
        .forEach(option => {

            const target =
                option.getAttribute(
                    'data-target'
                );


            const value =
                parseInt(
                    option.getAttribute(
                        'data-preset'
                    ),
                    10
                );


            const isSelected =
                tempDurations[target] === value;


            option.classList.toggle(
                'selected',
                isSelected
            );

        });

}


function closePresetDropdowns() {

    document
        .querySelectorAll('.preset-options')
        .forEach(dropdown => {

            dropdown.classList.remove(
                'open'
            );

        });


    document
        .querySelectorAll('.preset-toggle')
        .forEach(toggle => {

            toggle.setAttribute(
                'aria-expanded',
                'false'
            );

        });

}


function updateSettingsPanelUI() {

    document.getElementById(
        'display-pref-pomodoro'
    ).innerText =
        tempDurations.pomodoro;


    document.getElementById(
        'display-pref-short'
    ).innerText =
        tempDurations.shortBreak;


    document.getElementById(
        'display-pref-long'
    ).innerText =
        tempDurations.longBreak;


    // Theme selection

    document
        .querySelectorAll('.color-circle')
        .forEach(circle => {

            const isActive =
                circle.getAttribute(
                    'data-theme'
                ) === tempTheme;


            circle.classList.toggle(
                'active',
                isActive
            );


            circle.innerText =
                isActive ? '✓' : '';

        });


    // Sound selection

    document
        .querySelectorAll('.sound-btn')
        .forEach(button => {

            button.classList.toggle(
                'active',
                button.getAttribute(
                    'data-sound'
                ) === tempSound
            );

        });


    // Highlight selected preset

    updatePresetSelection();

}


function isModalOpen() {

    return (
        settingsModal.style.display === 'flex'
    );

}


function openSettingsModal() {

    tempDurations =
        {
            ...durations
        };


    tempTheme =
        selectedTheme;


    tempSound =
        selectedSound;


    closePresetDropdowns();


    updateSettingsPanelUI();


    settingsModal.style.display =
        'flex';

}


function hideModal() {

    closePresetDropdowns();


    settingsModal.style.display =
        'none';

}


settingsBtn.addEventListener(
    'click',
    openSettingsModal
);


closeModalBtn.addEventListener(
    'click',
    hideModal
);


window.addEventListener(
    'click',
    (e) => {

        if (
            e.target === settingsModal
        ) {

            hideModal();

        }

    }
);


// ==========================================
// 13. PLUS / MINUS STEPPERS
// ==========================================

document
    .querySelectorAll('.step-btn')
    .forEach(button => {

        button.addEventListener(
            'click',
            function (event) {

                event.stopPropagation();


                const action =
                    this.getAttribute(
                        'data-action'
                    );


                const target =
                    this.getAttribute(
                        'data-target'
                    );


                if (action === 'plus') {

                    /*
                       Allow the normal + button
                       to go up to 180 minutes.

                       This keeps the 90-minute preset
                       compatible with +.
                    */

                    tempDurations[target] =
                        Math.min(
                            tempDurations[target] + 1,
                            180
                        );

                }

                else {

                    tempDurations[target] =
                        Math.max(
                            tempDurations[target] - 1,
                            1
                        );

                }


                document.getElementById(
                    DURATION_DISPLAY_IDS[target]
                ).innerText =
                    tempDurations[target];


                updatePresetSelection();

            }
        );

    });


// ==========================================
// 14. PRESET DROPDOWNS
// ==========================================

document
    .querySelectorAll('.preset-toggle')
    .forEach(toggle => {

        toggle.addEventListener(
            'click',
            function (event) {

                event.stopPropagation();


                const target =
                    this.getAttribute(
                        'data-target'
                    );


                const dropdown =
                    document.querySelector(
                        `.preset-options[data-preset-target="${target}"]`
                    );


                if (!dropdown) {

                    return;

                }


                const isOpen =
                    dropdown.classList.contains(
                        'open'
                    );


                closePresetDropdowns();


                if (!isOpen) {

                    dropdown.classList.add(
                        'open'
                    );


                    this.setAttribute(
                        'aria-expanded',
                        'true'
                    );


                    updatePresetSelection();

                }

            }
        );

    });


// ==========================================
// 15. PRESET SELECTION
// ==========================================

document
    .querySelectorAll('.preset-option')
    .forEach(option => {

        option.addEventListener(
            'click',
            function (event) {

                event.stopPropagation();


                const target =
                    this.getAttribute(
                        'data-target'
                    );


                const value =
                    parseInt(
                        this.getAttribute(
                            'data-preset'
                        ),
                        10
                    );


                if (
                    !isNaN(value) &&
                    target
                ) {

                    tempDurations[target] =
                        value;


                    document.getElementById(
                        DURATION_DISPLAY_IDS[target]
                    ).innerText =
                        value;

                }


                updatePresetSelection();


                closePresetDropdowns();

            }
        );

    });


// ==========================================
// 16. CLOSE DROPDOWN WHEN CLICKING OUTSIDE
// ==========================================

document.addEventListener(
    'click',
    (event) => {

        if (
            !event.target.closest(
                '.stepper-controls'
            )
        ) {

            closePresetDropdowns();

        }

    }
);


// ==========================================
// 17. THEME SELECTION
// ==========================================

document
    .querySelectorAll('.color-circle')
    .forEach(circle => {

        circle.addEventListener(
            'click',
            function () {

                tempTheme =
                    this.getAttribute(
                        'data-theme'
                    );


                updateSettingsPanelUI();

            }
        );

    });


// ==========================================
// 18. SOUND SELECTION
// ==========================================

document
    .querySelectorAll('.sound-btn')
    .forEach(button => {

        button.addEventListener(
            'click',
            function () {

                tempSound =
                    this.getAttribute(
                        'data-sound'
                    );


                updateSettingsPanelUI();

            }
        );

    });


// ==========================================
// 19. SAVE SETTINGS
// ==========================================

saveSettingsBtn.addEventListener(
    'click',
    () => {

        const wasRunning =
            isRunning;


        const remainingSeconds =
            totalSeconds;


        durations =
            {
                ...tempDurations
            };


        selectedTheme =
            tempTheme;


        selectedSound =
            tempSound;


        localStorage.setItem(
            'pomodoroSettings',
            JSON.stringify({

                durations,

                theme:
                    selectedTheme,

                sound:
                    selectedSound

            })
        );


        applyThemeStyles(
            selectedTheme
        );


        hideModal();


        stopTimer();


        durations[currentMode] =
            parseInt(
                durations[currentMode],
                10
            );


        sessionDuration =
            durations[currentMode] * 60;


        if (
            wasRunning &&
            remainingSeconds > 0 &&
            remainingSeconds <= sessionDuration
        ) {

            totalSeconds =
                remainingSeconds;

        }

        else {

            totalSeconds =
                sessionDuration;

        }


        updateDisplay();


        if (wasRunning) {

            startTimer();

        }

    }
);


// ==========================================
// 20. KEYBOARD SHORTCUTS
// ==========================================

document.addEventListener(
    'keydown',
    e => {

        if (isModalOpen()) {

            if (e.key === 'Escape') {

                /*
                   First close the dropdown if
                   one is open. Otherwise close
                   the settings modal.
                */

                const openDropdown =
                    document.querySelector(
                        '.preset-options.open'
                    );


                if (openDropdown) {

                    closePresetDropdowns();

                    return;

                }


                hideModal();

            }


            return;

        }


        if (e.code === 'Space') {

            e.preventDefault();

            startStopButton.click();

        }


        if (
            e.key.toLowerCase() === 'r'
        ) {

            resetButton.click();

        }


        if (
            e.key.toLowerCase() === 's'
        ) {

            settingsBtn.click();

        }

    }
);


// ==========================================
// 21. RUN BOOT TASKS
// ==========================================

loadSavedPreferences();

switchMode('pomodoro');
