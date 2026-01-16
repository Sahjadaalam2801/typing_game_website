// Game Globals
let time = 30;
let score = 0;
let isPlaying = false;
let currentLevel = 1;
let wpm = 0;
let correctKeystrokes = 0;
let startTime;
let timerInterval;

// DOM Elements
const wordInput = document.querySelector('#word-input');
const cWordDisplay = document.querySelector('#current-word');
const scoreDisplay = document.querySelector('#score');
const timeDisplay = document.querySelector('#time-left');
const message = document.querySelector('#message');
const wpmDisplay = document.querySelector('#wpm');
const levelDisplay = document.querySelector('#level-display');
const nextLevelBtn = document.querySelector('#next-level-btn');

// Modal Elements
const modalOverlay = document.querySelector('#modal-overlay');
const modalTitle = document.querySelector('#modal-title');
const modalDesc = document.querySelector('#modal-desc');
const startBtn = document.querySelector('#start-btn');
const finalWpm = document.querySelector('#final-wpm');
const finalLevel = document.querySelector('#final-level');
const soundToggleBtn = document.querySelector('#sound-toggle-btn');
let isSoundOn = false;

// Audio Engine
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const NOTES = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00]; // C Major Pentatonic extended

function playTone(index) {
    if (!isSoundOn) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    // Choose note based on index (cyclic)
    const noteFreq = NOTES[index % NOTES.length];

    osc.type = 'triangle'; // Soft, guitar-like base
    osc.frequency.setValueAtTime(noteFreq, audioCtx.currentTime);

    // Envelope for "pluck" sound
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5); // Decay

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

function toggleSound() {
    isSoundOn = !isSoundOn;
    if (isSoundOn) {
        soundToggleBtn.innerHTML = 'Sound On 🔊';
        soundToggleBtn.style.color = '#4ade80';
        soundToggleBtn.style.borderColor = '#4ade80';
        // Resume context on user gesture
        if (audioCtx.state === 'suspended') audioCtx.resume();
    } else {
        soundToggleBtn.innerHTML = 'No Sound 🔇';
        soundToggleBtn.style.color = '#94a3b8';
        soundToggleBtn.style.borderColor = 'rgba(255,255,255,0.1)';
    }
}

// Game Settings
// Level Configuration: Time per word (seconds)
const LEVEL_CONFIG = {
    1: { time: 25, wordType: 'easy' },
    2: { time: 15, wordType: 'easy' },
    3: { time: 10, wordType: 'medium' },
    4: { time: 5, wordType: 'medium' },
    5: { time: 2, wordType: 'hard' },
    6: { time: 2, wordType: 'hard' },
    7: { time: 1, wordType: 'hard' }
};

// Initialize
function init() {
    startBtn.addEventListener('click', startGame);
    wordInput.addEventListener('input', startMatch);
    nextLevelBtn.addEventListener('click', nextLevel);
    soundToggleBtn.addEventListener('click', toggleSound);

    // Disable input initially
    wordInput.disabled = true;
    updateLevelUI();
}

// Start Game
function startGame() {
    // Reset State
    score = 0;
    wpm = 0;
    correctKeystrokes = 0;
    isPlaying = true;
    currentLevel = 1;

    // UI Reset
    modalOverlay.classList.add('hidden');
    wordInput.disabled = false;
    wordInput.value = '';
    wordInput.focus();
    scoreDisplay.innerHTML = score;
    wpmDisplay.innerHTML = 0;
    message.innerHTML = '';

    updateLevelUI();
    nextWord();

    // Start session timer for WPM calculation
    startTime = Date.now();

    // Start the game loop (The timer is now per-word, handled in nextWord)
}

function nextWord() {
    if (!isPlaying) return;

    // Get config for current level
    const config = LEVEL_CONFIG[currentLevel];

    // Determine number of words based on score
    let wordCount = 1;
    if (score >= 250) {
        wordCount = 5; // Critical
    } else if (score >= 180) {
        wordCount = 4;
    } else if (score >= 120) {
        wordCount = 3;
    } else if (score >= 50) {
        wordCount = 2;
    }

    // Reset Timer (scale by word count)
    time = config.time * wordCount;
    timeDisplay.innerHTML = time + 's';

    // Get words based on difficulty
    const wordList = words[config.wordType];
    let selectedWords = [];

    for (let i = 0; i < wordCount; i++) {
        const randIndex = Math.floor(Math.random() * wordList.length);
        selectedWords.push(wordList[randIndex]);
    }

    cWordDisplay.innerHTML = selectedWords.join(' ');

    // Clear and start interval
    clearInterval(timerInterval);
    timerInterval = setInterval(countdown, 1000);
}

// Match input
function startMatch() {
    if (!isPlaying) return;

    const currentWordText = cWordDisplay.innerText;
    const typedValue = wordInput.value;

    // Play sound for every valid keystroke (if something was added)
    if (typedValue.length > 0) {
        // Map the last char logic to a tone
        // Use the length or the char code of the last letter to pick a note
        const lastChar = typedValue[typedValue.length - 1];
        playTone(lastChar.charCodeAt(0));
    }

    if (currentWordText === typedValue) {
        message.innerHTML = 'Correct!';
        message.style.color = 'var(--success)';

        score++;
        scoreDisplay.innerHTML = score;

        // Count characters for WPM
        correctKeystrokes += currentWordText.length;

        // Calculate WPM
        const timeElapsed = (Date.now() - startTime) / 1000 / 60; // in minutes
        if (timeElapsed > 0) {
            const currentWpm = Math.round((correctKeystrokes / 5) / timeElapsed);
            wpmDisplay.innerHTML = currentWpm;
        }

        wordInput.value = '';
        nextWord();
    }
}

// Timer
function countdown() {
    if (time > 0) {
        time--;
    } else if (time === 0) {
        isPlaying = false;
        clearInterval(timerInterval);
        gameOver();
    }
    timeDisplay.innerHTML = time + 's';

    // Visual urgency
    if (time <= 3) {
        timeDisplay.style.color = 'var(--error)';
    } else {
        timeDisplay.style.color = 'var(--primary-color)';
    }
}

// Manual Level Progression
function nextLevel() {
    if (currentLevel < 7) {
        currentLevel++;
        updateLevelUI();
        // If playing, immediately switch logic for next word? 
        // Or wait for next word? Let's just update UI and let nextWord handle config.
        // User might click this mid-word. Let's restart the word/timer to be fair.
        if (isPlaying) {
            wordInput.value = '';
            wordInput.focus();
            nextWord();
        }
    }
}

function updateLevelUI() {
    levelDisplay.innerHTML = `Level ${currentLevel}`;

    // Optional: Hide Next Level button if at max level
    if (currentLevel >= 7) {
        nextLevelBtn.style.display = 'none';
        levelDisplay.innerHTML = `Level ${currentLevel} (MAX)`;
    } else {
        nextLevelBtn.style.display = 'block';
    }
}

// Game Over
function gameOver() {
    modalOverlay.classList.remove('hidden');
    modalTitle.innerHTML = 'Game Over';
    modalDesc.innerHTML = 'Time ran out!';

    finalStats.style.display = 'block';
    finalScore.innerHTML = score;
    finalWpm.innerHTML = wpmDisplay.innerHTML;
    finalLevel.innerHTML = currentLevel;

    startBtn.innerHTML = 'Try Again';
    wordInput.disabled = true;
}

// Run init
init();
