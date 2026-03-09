/* ===============================
   CONFIG
================================ */

const VOCAB_API_URL = "https://script.google.com/macros/s/AKfycbwm1z4g4NtdIxdNWGtjwayX8O_iQPGKl1M4BzK18aq-tZCpWOeS-OiX1hrqUhLANCZtmA/exec";
const TOTAL_QUESTIONS = 10;
const QUESTION_TIME = 15;
const MASTERY_REQUIRED = 8;

/* ===============================
   STATE
================================ */

let vocabularyData = [];
let currentIndex = 0;
let timerInterval = null;
let timeLeft = QUESTION_TIME;
let currentMode = "category";

let score = 0;
let streak = 0;
let correctAnswers = 0;

let allVocabularyCache = null;   // caching to avoid delay

/* ===============================
   DOM REFERENCES
================================ */

const landingPage = document.getElementById("landingPage");
const startBtn = document.getElementById("startBtn");
const categoryButtons = document.querySelectorAll(".categoryBtn");
const dailyBtn = document.getElementById("dailyBtn");
const mixedModeBtn = document.getElementById("mixedModeBtn");

const levelSelect = document.getElementById("levelSelect");
const shuffleToggle = document.getElementById("shuffleToggle");
const timerToggle = document.getElementById("timerToggle");

const controlPanel = document.getElementById("controlPanel");
const practiceSection = document.getElementById("practiceSection");

const modeTitle = document.getElementById("modeTitle");
const sentenceBox = document.getElementById("sentence");
const hintsBox = document.getElementById("hints");
const answerInput = document.getElementById("answerInput");
const submitBtn = document.getElementById("submitBtn");
const feedbackBox = document.getElementById("feedback");

const scoreBox = document.getElementById("score");
const streakBox = document.getElementById("streak");
const timerBox = document.getElementById("timer");
const progressBar = document.getElementById("progressBar");
const backBtn = document.getElementById("backBtn");

/* ===============================
   FETCH WITH CACHE
================================ */

/* ===============================
   LANDING PAGE
================================ */

startBtn.addEventListener("click", () => {
  landingPage.style.display = "none";
  controlPanel.style.display = "block";
});

/* ===============================
   FETCH WITH CACHE
================================ */

function fetchVocabulary(callback) {

  if (allVocabularyCache) {
    callback(allVocabularyCache);
    return;
  }

  fetch(VOCAB_API_URL)
    .then(res => res.json())
    .then(data => {
      allVocabularyCache = data;
      callback(data);
    })
    .catch(() => {
      sentenceBox.innerText = "Failed to load vocabulary. Please check your connection and try again.";
      submitBtn.style.display = "none";
    });
}

/* ===============================
   CATEGORY MODE
================================ */

categoryButtons.forEach(btn => {
  btn.addEventListener("click", () => {

    currentMode = "category";
    resetGamification();

    controlPanel.style.display = "none";
    practiceSection.style.display = "block";
    modeTitle.innerText = btn.dataset.category.toUpperCase();

    fetchVocabulary(data => {
      const filtered = data.filter(
        item => item.category === btn.dataset.category
      );
      prepareData(filtered);
    });

  });
});

/* ===============================
   MIXED MODE
================================ */

mixedModeBtn.addEventListener("click", () => {

  currentMode = "mixed";
  resetGamification();

  controlPanel.style.display = "none";
  practiceSection.style.display = "block";
  modeTitle.innerText = "MIXED MODE";

  fetchVocabulary(prepareData);
});

/* ===============================
   DAILY MODE
================================ */

dailyBtn.addEventListener("click", () => {

  currentMode = "daily";
  resetGamification();

  controlPanel.style.display = "none";
  practiceSection.style.display = "block";
  modeTitle.innerText = "DAILY CHALLENGE";

  fetchVocabulary(prepareDailyData);
});

function prepareDailyData(data) {

  const todayKey = "daily_" + getTodayDate();
  const saved = localStorage.getItem(todayKey);

  if (saved) {
    vocabularyData = JSON.parse(saved);
  } else {

    let filtered = filterByLevel(data);

    if (shuffleToggle.checked) {
      filtered = shuffleArray(filtered);
    }

    vocabularyData = filtered.slice(0, TOTAL_QUESTIONS);
    localStorage.setItem(todayKey, JSON.stringify(vocabularyData));
  }

  currentIndex = 0;
  loadQuestion();
}

/* ===============================
   DATA PREPARATION
================================ */

function prepareData(data) {

  let filtered = filterByLevel(data);

  if (filtered.length === 0) {
    sentenceBox.innerText =
      "No questions available for this level.";
    submitBtn.style.display = "none";
    return;
  }

  if (shuffleToggle.checked) {
    filtered = shuffleArray(filtered);
  }

  vocabularyData = filtered.slice(0, TOTAL_QUESTIONS);
  currentIndex = 0;
  loadQuestion();
}

function filterByLevel(data) {

  if (levelSelect.value === "mixed") return data;

  return data.filter(
    item => item.difficulty === levelSelect.value
  );
}

/* ===============================
   LOAD QUESTION
================================ */

function loadQuestion() {

  if (currentIndex >= vocabularyData.length) {
    endSession();
    return;
  }

  const word = vocabularyData[currentIndex];

  sentenceBox.innerText = word.sentence;
  answerInput.value = "";
  answerInput.focus();
  feedbackBox.innerHTML = "";

  progressBar.style.width =
    (currentIndex / TOTAL_QUESTIONS) * 100 + "%";

  renderHints(word);

  submitBtn.style.display = "inline-block";
  submitBtn.disabled = false;

  if (timerToggle.checked) {
    startTimer();
  } else {
    timerBox.innerText = "Timer Off";
  }
}

/* ===============================
   SHUFFLED OPTIONS
================================ */

function renderHints(word) {

  hintsBox.innerHTML = "";

  let options = [];

  if (word.hint_words) {
    options = word.hint_words.split(",").map(o => o.trim());
  }

  if (!options.includes(word.correct_word)) {
    options.push(word.correct_word);
  }

  options = shuffleArray(options);

  options.forEach(option => {

    const span = document.createElement("span");
    span.innerText = option;
    span.style.cursor = "pointer";

    span.addEventListener("click", () => {
      answerInput.value = option;
    });

    hintsBox.appendChild(span);
  });
}

/* ===============================
   ANSWER CHECK
================================ */

submitBtn.addEventListener("click", () => checkAnswer(false));

document.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    if (practiceSection.style.display === "block" && !submitBtn.disabled) {
      e.preventDefault();
      submitBtn.click();
    }
  }
});

function checkAnswer(isTimeout) {

  clearInterval(timerInterval);

  const word = vocabularyData[currentIndex];
  const correct = word.correct_word.toLowerCase();
  const userAnswer = answerInput.value.trim().toLowerCase();

  if (!isTimeout && userAnswer === correct) {

    correctAnswers++;
    score += 10;
    streak++;

    if (streak >= 3) score += 5;

    feedbackBox.innerHTML =
      "<strong>Correct! 🎉</strong><br><br>" +
      word.meaning_en + "<br>" +
      word.meaning_hi + "<br>" +
      word.example_sentence;

  } else {

    streak = 0;

    feedbackBox.innerHTML =
      "<strong>Correct Word:</strong> " +
      word.correct_word + "<br><br>" +
      word.meaning_en + "<br>" +
      word.meaning_hi + "<br>" +
      word.example_sentence;
  }

  updateStats();

  currentIndex++;
  createNextButton();
}

/* ===============================
   END SESSION
================================ */

function endSession() {

  clearInterval(timerInterval);
  progressBar.style.width = "100%";

  let masteryMessage =
    correctAnswers >= MASTERY_REQUIRED
      ? "🎯 Mastery Achieved!"
      : "Keep Practicing!";

  sentenceBox.innerHTML =
    "<h3>Session Completed</h3>" +
    "<p>" + masteryMessage + "</p>" +
    "<p>Score: " + score + "</p>" +
    "<p>Correct: " +
    correctAnswers + "/" + vocabularyData.length + "</p>";

  feedbackBox.innerHTML = "";
  submitBtn.style.display = "none";
}

/* ===============================
   NEXT BUTTON
================================ */

function createNextButton() {

  submitBtn.disabled = true;

  const nextBtn = document.createElement("button");
  nextBtn.innerText = "Next Question";
  nextBtn.style.marginTop = "10px";

  feedbackBox.appendChild(nextBtn);

  nextBtn.addEventListener("click", () => {
    nextBtn.remove();
    submitBtn.disabled = false;
    loadQuestion();
  });
}

/* ===============================
   BACK BUTTON
================================ */

backBtn.addEventListener("click", () => {

  clearInterval(timerInterval);

  practiceSection.style.display = "none";
  controlPanel.style.display = "block";

  sentenceBox.innerHTML = "";
  feedbackBox.innerHTML = "";
  answerInput.value = "";
  progressBar.style.width = "0%";

  submitBtn.style.display = "inline-block";
  submitBtn.disabled = false;

  resetGamification();
});

/* ===============================
   UTILITIES
================================ */

function resetGamification() {
  score = 0;
  streak = 0;
  correctAnswers = 0;
  updateStats();
}

function updateStats() {
  scoreBox.innerText = "Score: " + score;
  streakBox.innerText = "Streak: " + streak;
}

function startTimer() {

  clearInterval(timerInterval);
  timeLeft = QUESTION_TIME;
  timerBox.innerText = "Time: " + timeLeft;

  timerInterval = setInterval(() => {

    timeLeft--;
    timerBox.innerText = "Time: " + timeLeft;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      checkAnswer(true);
    }

  }, 1000);
}

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

function getTodayDate() {
  const d = new Date();
  return d.getFullYear() + "_" + (d.getMonth() + 1) + "_" + d.getDate();
}