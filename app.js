'use strict';

const STORAGE_KEY = 'mathReviewScoresV3';

let review = 0;
let items = [];
let index = 0;
let selected = [];
let written = [];
let grades = [];
let saved = loadSaved();
let isGrading = false;

function loadSaved() {
  try {
    const value = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[null,null,null]'
    );

    return Array.isArray(value)
      ? [value[0] || null, value[1] || null, value[2] || null]
      : [null, null, null];

  } catch (_) {
    return [null, null, null];
  }
}

function saveSaved() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch (_) {
    alert('تعذر حفظ النتائج على هذا الجهاز.');
  }
}

function section(id) {
  ['home', 'quiz', 'results'].forEach(name => {
    document.getElementById(name)
      .classList.toggle('hidden', name !== id);
  });
}

function init() {
  const cards = document.getElementById('reviewCards');

  cards.innerHTML = reviews.map((item, i) => {
    const count = questions.filter(q => q.review === i).length;

    return `
      <article class="card">
        <div>
          <h3>${escapeHTML(item.name)}</h3>
          <p>الصفحات ${escapeHTML(item.pages)} · ${count} سؤالًا</p>
        </div>
        <button class="btn soft" onclick="start(${i})">
          ابدأ
        </button>
      </article>
    `;
  }).join('');

  showResults();
  section('home');
}

function start(reviewIndex) {
  if (!Number.isInteger(reviewIndex) ||
      reviewIndex < 0 || reviewIndex > 2) return;

  review = reviewIndex;
  items = questions.filter(q => q.review === review);

  if (!items.length) {
    alert('لم يتم العثور على أسئلة هذه المراجعة.');
    return;
  }

  index = 0;
  selected = Array(items.length).fill(null);
  written = Array(items.length).fill('');
  grades = Array(items.length).fill(null);

  isGrading = false;

  section('quiz');
  renderQuestion();
}

function renderQuestion() {
  const q = items[index];

  if (!q) return;

  document.getElementById('reviewName').textContent =
    reviews[review].name;

  document.getElementById('counter').textContent =
    `${index + 1} / ${items.length}`;

  document.getElementById('bar').style.width =
    `${((index + 1) / items.length) * 100}%`;

  document.getElementById('qid').textContent =
    `السؤال ${index + 1}`;

  document.getElementById('page').textContent =
    `صفحة ${q.page}`;

  document.getElementById('qimg').src = q.img;
  document.getElementById('zoomImg').src = q.img;

  document.getElementById('questionText').textContent =
    q.text || 'اقرأ السؤال من الصورة المرفقة.';

  const list = document.getElementById('answerList');
  const writtenWrap = document.getElementById('writtenWrap');
  const title = document.getElementById('answerTitle');
  const writtenInput = document.getElementById('writtenAnswer');
  const feedback = document.getElementById('feedback');

  const hasChoices =
    Array.isArray(q.options) &&
    q.options.length === 4 &&
    q.options.every(Boolean);

  feedback.className = 'feedback hidden';
  feedback.textContent = '';

  writtenInput.disabled = false;

  if (hasChoices) {
    writtenWrap.classList.add('hidden');
    list.classList.remove('hidden');

    title.textContent = 'اختر الإجابة';

    list.innerHTML = q.options.map((option, i) => `
      <button
        type="button"
        class="answer-option ${
          selected[index] === i ? 'selected' : ''
        }"
        onclick="choose(${i})"
        ${grades[index] ? 'disabled' : ''}
      >
        <span class="num">${i + 1}</span>
        <span>${escapeHTML(option)}</span>
      </button>
    `).join('');

  } else {
    list.classList.add('hidden');
    writtenWrap.classList.remove('hidden');

    title.textContent = 'اكتب إجابتك';

    writtenInput.value = written[index] || '';
    writtenInput.disabled = Boolean(grades[index]);

    writtenInput.oninput = () => {
      written[index] = writtenInput.value;
      updateNextButton();
    };
  }

  if (grades[index]) {
    showFeedback(grades[index]);
  }

  updateNextButton();
}

function updateNextButton() {
  const q = items[index];
  const button = document.getElementById('next');

  if (isGrading) {
    button.disabled = true;
    button.textContent = 'جارٍ التصحيح...';
    return;
  }

  if (grades[index]) {
    button.disabled = false;
    button.textContent =
      index === items.length - 1
        ? 'عرض النتيجة'
        : 'التالي';

    return;
  }

  const hasChoices =
    Array.isArray(q.options) &&
    q.options.length === 4 &&
    q.options.every(Boolean);

  const hasAnswer = hasChoices
    ? selected[index] !== null
    : Boolean((written[index] || '').trim());

  button.disabled = !hasAnswer;
  button.textContent = 'تصحيح الإجابة';
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function choose(optionIndex) {
  if (grades[index] || isGrading) return;

  const q = items[index];

  if (!q || !Array.isArray(q.options)) return;
  if (optionIndex < 0 || optionIndex > 3) return;

  selected[index] = optionIndex;

  document.querySelectorAll('.answer-option')
    .forEach((button, i) => {
      button.classList.toggle(
        'selected',
        i === optionIndex
      );
    });

  updateNextButton();
}

function zoomImage() {
  document.getElementById('zoom')
    .classList.add('open');
}

function closeZoom() {
  document.getElementById('zoom')
    .classList.remove('open');
}

async function nextQ() {
  if (isGrading) return;

  if (!grades[index]) {
    await gradeCurrentAnswer();
    return;
  }

  if (index < items.length - 1) {
    index++;
    renderQuestion();
  } else {
    finishReview();
  }
}

async function gradeCurrentAnswer() {
  const q = items[index];

  const hasChoices =
    Array.isArray(q.options) &&
    q.options.length === 4 &&
    q.options.every(Boolean);

  const answerText = hasChoices
    ? ''
    : (written[index] || '').trim();

  if (hasChoices && selected[index] === null) return;
  if (!hasChoices && !answerText) return;

  isGrading = true;
  updateNextButton();

  const feedback = document.getElementById('feedback');

  feedback.className = 'feedback';
  feedback.textContent = 'يتم التأكد من إجابتك...';

  try {
    const imageUrl = new URL(
      q.img,
      window.location.href
    ).href;

    const response = await fetch('/api/grade', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        questionId: q.id,
        questionText: q.text || '',

        options: hasChoices ? q.options : [],

        selectedIndex: hasChoices
          ? selected[index]
          : null,

        writtenAnswer: answerText,
        imageUrl
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.error || 'تعذر تصحيح الإجابة.'
      );
    }

    if (
      typeof result.correct !== 'boolean' ||
      typeof result.correctAnswer !== 'string'
    ) {
      throw new Error('وصل رد غير مكتمل من خدمة التصحيح.');
    }

    grades[index] = {
      correct: result.correct,
      correctAnswer: result.correctAnswer,
      explanation: result.explanation || ''
    };

    showFeedback(grades[index]);

    if (hasChoices) {
      document.querySelectorAll('.answer-option')
        .forEach(button => {
          button.disabled = true;
        });
    } else {
      document.getElementById('writtenAnswer').disabled = true;
    }

  } catch (error) {
    feedback.className = 'feedback error';
    feedback.textContent =
      error.message || 'حدث خطأ أثناء التصحيح.';

  } finally {
    isGrading = false;
    updateNextButton();
  }
}

function showFeedback(result) {
  const feedback = document.getElementById('feedback');

  feedback.className =
    `feedback ${result.correct ? 'correct' : 'incorrect'}`;

  const status = result.correct
    ? 'إجابتك صحيحة ✓'
    : 'إجابتك غير صحيحة';

  feedback.innerHTML = `
    <strong>${status}</strong>

    <div>
      الإجابة الصحيحة:
      ${escapeHTML(result.correctAnswer)}
    </div>

    ${
      result.explanation
        ? `<p>${escapeHTML(result.explanation)}</p>`
        : ''
    }
  `;
}

function finishReview() {
  const correct = grades.filter(
    item => item && item.correct
  ).length;

  const total = items.length;

  saved[review] = {
    correct,
    total,
    percent: Math.round((correct / total) * 100),
    date: new Date().toLocaleDateString('ar-AE')
  };

  saveSaved();
  showResults();
}

function showResults() {
  section('results');

  const rows = document.getElementById('rows');

  if (!rows) return;

  rows.innerHTML = reviews.map((item, i) => {
    const result = saved[i];

    const text = result
      ? `${result.correct} من ${result.total} إجابة صحيحة · ${result.percent}% · ${escapeHTML(result.date || '')}`
      : 'لم تُنجز بعد';

    return `
      <div class="result">
        <b>${escapeHTML(item.name)}</b>
        <span>${text}</span>
      </div>
    `;
  }).join('');

  const totalCorrect = saved.reduce(
    (sum, item) => sum + (item ? item.correct : 0),
    0
  );

  const totalDone = saved.reduce(
    (sum, item) => sum + (item ? item.total : 0),
    0
  );

  const summary = document.getElementById('overallScore');

  if (summary) {
    summary.textContent = totalDone
      ? `${totalCorrect} من ${totalDone} إجابة صحيحة`
      : 'ابدأ إحدى المراجعات لعرض نتيجتك هنا';
  }
}

function toHome() {
  isGrading = false;
  section('home');
}

init();