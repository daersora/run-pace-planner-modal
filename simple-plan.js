// SELECTORS & CONSTANTS

const segmentList = document.getElementById('segment-list');
const addSegmentButton = document.getElementById('add-segment-button');
const resetButton = document.getElementById('reset-plan-button');
const distanceSelection = document.getElementById('distance-goal-input');
const distanceSelectionButtons = document.getElementById('distance-presets');
const segmentTemplate = document.getElementById('tpl-segment-card');

// Grand Totals Summary Container
const totalsSummary = document.getElementById('totals-summary');

// Progress Elements
const distanceProgressFill = document.getElementById('distance-progress-fill');
const distanceProgressLabel = document.getElementById('distance-progress-label');

// Goal Button Shorthand
const distanceGoalValues = {
  '5km-goal': 5,
  '10km-goal': 10,
  'half-goal': 21.1,
  'full-goal': 42.2,
};

// Slider Presets
const timeLimits = {
  single: { min: 60, max: 600, step: 30, value: 300 },
  combined: { min: 60, max: 300, step: 15, value: 150 },
};

// HELPERS

function padTimeValues(input) {
  return String(input).padStart(2, '0');
}

function formatTimes(totalSeconds) {
  const hours = padTimeValues(Math.floor(totalSeconds / 3600));
  const minutes = padTimeValues(Math.floor((totalSeconds % 3600) / 60));
  const seconds = padTimeValues(Math.floor(totalSeconds % 60));
  return totalSeconds < 3600 ? `${minutes}:${seconds}` : `${hours}:${minutes}:${seconds}`;
}

// Distance Pace Time Triangle
function distance(paceSecs, timeSecs) {
  return paceSecs > 0 ? timeSecs / paceSecs : 0;
}
function pace(distKm, timeSecs) {
  return distKm > 0 ? Math.round(timeSecs / distKm) : 0;
}
function time(distKm, paceSecs) {
  return distKm * paceSecs;
}

function getSegments() {
  return document.querySelectorAll('[data-role="segment"]');
}

// DATA STORAGE AND STATE MANAGEMENT
// Get all the values out of a segment, i.e. type (run/walk), calculated value, and slider values
function getSegmentData() {
  return Array.from(getSegments()).map((card) => {
    const selector =
      card.querySelector('[data-role="segment-type-selector"]') || card.querySelector('select');
    return {
      segmentType: selector ? selector.value : 'run-walk',
      runTime: Number(
        card.querySelector('[data-interval="run"] [data-control-type="time"] input')?.value || 150,
      ),
      runPace: Number(
        card.querySelector('[data-interval="run"] [data-control-type="pace"] input')?.value || 450,
      ),
      runDistance: Number(
        card.querySelector('[data-interval="run"] [data-control-type="distance"] input')?.value ||
          0.5,
      ),
      runCalcDist:
        card.querySelector('[data-interval="run"] .toggle input[type="checkbox"]')?.checked ?? true,
      walkTime: Number(
        card.querySelector('[data-interval="walk"] [data-control-type="time"] input')?.value || 150,
      ),
      walkPace: Number(
        card.querySelector('[data-interval="walk"] [data-control-type="pace"] input')?.value || 750,
      ),
      walkDistance: Number(
        card.querySelector('[data-interval="walk"] [data-control-type="distance"] input')?.value ||
          0.5,
      ),
      walkCalcDist:
        card.querySelector('[data-interval="walk"] .toggle input[type="checkbox"]')?.checked ??
        true,
      repeats: Number(card.querySelector('[data-control-type="repeat"] input')?.value || 5),
    };
  });
}

function saveToStorage() {
  const data = {
    targetDistance: distanceSelection ? distanceSelection.value : '',
    segments: getSegmentData(),
  };
  localStorage.setItem('runPacePlannerData', JSON.stringify(data));
}

function loadFromStorage() {
  const storedPlan = localStorage.getItem('runPacePlannerData');
  if (!storedPlan) return false;

  try {
    const parsedData = JSON.parse(storedPlan);
    const segments = Array.isArray(parsedData) ? parsedData : parsedData.segments || [];
    if (parsedData.targetDistance && distanceSelection) {
      distanceSelection.value = parsedData.targetDistance;
    }
    segments.forEach((segmentData) => {
      createSegmentCard(segmentData);
    });
    return true;
  } catch (err) {
    console.error('Failed to parse plan from storage:', err);
    return false;
  }
}

// UI FUNCTIONS
// Progress Bar
function calculateProgressHue(percent) {
  if (percent <= 25) return (percent / 25) * 30;
  if (percent <= 75) return 30 + ((percent - 25) / 50) * 30;
  if (percent <= 100) return 60 + ((percent - 75) / 25) * 60;
  if (percent <= 125) return 120 - ((percent - 100) / 25) * 120;
  return 0;
}

function updateProgressBar(totalDist, targetDist) {
  if (!distanceProgressFill || targetDist <= 0) {
    if (distanceProgressFill) distanceProgressFill.style.width = '0%';
    if (distanceProgressLabel) distanceProgressLabel.textContent = 'Set a goal distance';
    return;
  }

  const targetPercent = (totalDist / targetDist) * 100;
  const clampedPercent = Math.min(100, targetPercent);
  const extraKm = (totalDist - targetDist).toFixed(2);
  const hue = calculateProgressHue(targetPercent);

  distanceProgressFill.style.width = `${clampedPercent}%`;
  distanceProgressFill.style.backgroundColor = `hsl(${hue}, 80%, 50%)`;

  if (distanceProgressLabel) {
    distanceProgressLabel.textContent =
      targetPercent > 100
        ? `${targetPercent.toFixed(1)}% (+${extraKm} km over target!)`
        : `${targetPercent.toFixed(1)}% of ${targetDist} km`;
  }
}

function updateSliderLabel(slider, overrideValue = null) {
  const controlBox = slider.closest('.control');
  if (!controlBox) return;
  const outputLabel = controlBox.querySelector('[data-role="output"]');
  if (!outputLabel) return;

  const val = overrideValue !== null ? overrideValue : Number(slider.value);
  const controlType = controlBox.dataset.controlType;

  if (controlType === 'pace') {
    outputLabel.textContent = `${formatTimes(val)} min/km`;
  } else if (controlType === 'time') {
    outputLabel.textContent = `${formatTimes(val)} min`;
  } else if (controlType === 'distance') {
    outputLabel.textContent = `${val.toFixed(2)} km`;
  } else if (controlType === 'repeat') {
    outputLabel.textContent = `${val} Repeats`;
  }
}

function updateTimeSliders(segmentParent, isSingleMode) {
  const limits = isSingleMode ? timeLimits.single : timeLimits.combined;

  const timeSliders = segmentParent.querySelectorAll(
    '[data-control-type="time"] [data-role="slider"]',
  );

  timeSliders.forEach((slider) => {
    slider.min = limits.min;
    slider.max = limits.max;
    slider.step = limits.step;
    const currentVal = Number(slider.value);
    slider.value = Math.min(Math.max(currentVal, limits.min), limits.max);
    updateSliderLabel(slider);
  });
}

function updateSegmentCalculations(segmentCard) {
  function getIntervalMetrics(type) {
    const interval = segmentCard.querySelector(`[data-interval="${type}"]`);
    if (!interval || interval.classList.contains('hidden')) {
      return { time: 0, dist: 0 };
    }

    const isCalcDistanceMode =
      interval.querySelector('.toggle input[type="checkbox"]')?.checked ?? true;

    const timeControl = interval.querySelector('[data-control-type="time"]');
    const paceControl = interval.querySelector('[data-control-type="pace"]');
    const distControl = interval.querySelector('[data-control-type="distance"]');

    const timeInput = timeControl?.querySelector('input');
    const paceInput = paceControl?.querySelector('input');
    const distInput = distControl?.querySelector('input');

    let timeVal = Number(timeInput?.value || 0);
    let paceVal = Number(paceInput?.value || 0);
    let distVal = Number(distInput?.value || 0);

    if (distInput) distInput.disabled = isCalcDistanceMode;
    if (timeInput) timeInput.disabled = !isCalcDistanceMode;

    if (isCalcDistanceMode) {
      distVal = distance(paceVal, timeVal);
      if (distInput) updateSliderLabel(distInput, distVal);
      if (timeInput) updateSliderLabel(timeInput);
    } else {
      timeVal = time(distVal, paceVal);
      if (timeInput) updateSliderLabel(timeInput, timeVal);
      if (distInput) updateSliderLabel(distInput);
    }
    return { time: timeVal, dist: distVal };
  }

  const run = getIntervalMetrics('run');
  const walk = getIntervalMetrics('walk');

  const repeatsInput = segmentCard.querySelector('[data-control-type="repeat"] input');
  const repeats = Number(repeatsInput?.value || 1);
  const repeatTimeSecs = run.time + walk.time;
  const segmentTimeSecs = repeatTimeSecs * repeats;
  const repeatDist = run.dist + walk.dist;
  const segmentDist = repeatDist * repeats;
  const segmentPaceSecs = segmentDist > 0 ? pace(segmentDist, segmentTimeSecs) : 0;

  const repeatLabelEl = segmentCard.querySelector('.repeats__summary');
  if (repeatLabelEl) {
    repeatLabelEl.textContent = `Repeats : ${formatTimes(repeatTimeSecs)} | ${formatTimes(segmentPaceSecs)} min/km | ${repeatDist.toFixed(2)} km`;
  }

  const headerSummaryEl = segmentCard.querySelector('[data-role="header-summary"]');
  if (headerSummaryEl) {
    headerSummaryEl.textContent = `${formatTimes(segmentTimeSecs)} | ${formatTimes(segmentPaceSecs)} min/km | ${segmentDist.toFixed(2)} km`;
  }

  return { segmentTimeSecs, segmentDist };
}

function createSegmentCard(data = null) {
  if (!segmentTemplate) return;
  const clonedCard = segmentTemplate.content.cloneNode(true);
  const cardElement = clonedCard.querySelector('[data-role="segment"]');

  const selectedType = data ? data.segmentType : 'run-walk';
  const typeSelector = cardElement.querySelector('#segment-type-selector');
  if (typeSelector) typeSelector.value = selectedType;

  changeSegmentType(selectedType, cardElement);

  if (data) {
    // Run
    const runTimeInput = cardElement.querySelector(
      '[data-interval="run"] [data-control-type="time"] input',
    );
    if (runTimeInput) runTimeInput.value = data.runTime;

    const runPaceInput = cardElement.querySelector(
      '[data-interval="run"] [data-control-type="pace"] input',
    );
    if (runPaceInput) runPaceInput.value = data.runPace;

    const runDistInput = cardElement.querySelector(
      '[data-interval="run"] [data-control-type="distance"] input',
    );
    if (runDistInput && data.runDistance !== undefined) runDistInput.value = data.runDistance;

    const runToggle = cardElement.querySelector(
      '[data-interval="run"] .toggle input[type="checkbox"]',
    );
    if (runToggle && data.runCalcDist !== undefined) runToggle.checked = data.runCalcDist;

    // Walk
    const walkTimeInput = cardElement.querySelector(
      '[data-interval="walk"] [data-control-type="time"] input',
    );
    if (walkTimeInput) walkTimeInput.value = data.walkTime;

    const walkPaceInput = cardElement.querySelector(
      '[data-interval="walk"] [data-control-type="pace"] input',
    );
    if (walkPaceInput) walkPaceInput.value = data.walkPace;

    const walkDistInput = cardElement.querySelector(
      '[data-interval="walk"] [data-control-type="distance"] input',
    );
    if (walkDistInput && data.walkDistance !== undefined) walkDistInput.value = data.walkDistance;

    const walkToggle = cardElement.querySelector(
      '[data-interval="walk"] .toggle input[type="checkbox"]',
    );
    if (walkToggle && data.walkCalcDist !== undefined) walkToggle.checked = data.walkCalcDist;

    // Repeats
    const repeatInput = cardElement.querySelector('[data-control-type="repeat"] input');
    if (repeatInput) repeatInput.value = data.repeats;
  }

  segmentList.appendChild(clonedCard);
  const newCard = segmentList.lastElementChild;
  const sliders = newCard.querySelectorAll('[data-role="slider"]');
  sliders.forEach((slider) => updateSliderLabel(slider));

  const currentSegments = getSegments();
  renumberSegments(currentSegments);
  updateGrandTotals(currentSegments);
}

function changeSegmentType(segmentType, segmentParent) {
  const runInterval = segmentParent.querySelector('[data-interval="run"]');
  const walkInterval = segmentParent.querySelector('[data-interval="walk"]');

  if (!runInterval || !walkInterval) return;

  runInterval.classList.toggle('hidden', segmentType === 'walk-only');
  walkInterval.classList.toggle('hidden', segmentType === 'run-only');
  const isSingleMode = segmentType !== 'run-walk';
  updateTimeSliders(segmentParent, isSingleMode);
}

function setGoalDistance(input) {
  const outputValue = distanceGoalValues[input];
  if (distanceSelection) {
    distanceSelection.value = outputValue;
  }
}

function updateGrandTotals(segments) {
  let totalTime = 0;
  let totalDist = 0;

  Array.from(segments).forEach((segment) => {
    const { segmentTimeSecs, segmentDist } = updateSegmentCalculations(segment);
    totalTime += segmentTimeSecs;
    totalDist += segmentDist;
  });
  const totalPace = formatTimes(pace(totalDist, totalTime));

  if (totalsSummary) {
    totalsSummary.textContent = `${formatTimes(totalTime)} | ${totalPace} min/km | ${totalDist.toFixed(2)} km`;
  }
  const targetDist = parseFloat(distanceSelection?.value) || 0;
  updateProgressBar(totalDist, targetDist);
}

function renumberSegments(segments) {
  Array.from(segments).forEach((segment, index) => {
    const segmentTitle = segment.querySelector('[data-role="segment-title"]');
    if (segmentTitle) segmentTitle.textContent = `Segment ${index + 1}`;
    segment.dataset.id = `segment-${index}`;
    const deleteRowButton = segment.querySelector('[data-role="delete-row"]');
    if (deleteRowButton) {
      deleteRowButton.disabled = segments.length === 1;
    }
  });
}

function removeSegment(segment) {
  segment.remove();
  const currentSegments = getSegments();
  updateGrandTotals(currentSegments);
  renumberSegments(currentSegments);
}

function toggleCardVisibility(closeBtn) {
  const card = closeBtn.closest('[data-role="segment"]');
  if (card) card.classList.toggle('--collapsed');
}

function resetPlan() {
  localStorage.removeItem('runPacePlannerData');
  const currentSegments = getSegments();
  currentSegments.forEach((segment, index) => {
    if (index > 0) segment.remove();
  });

  const firstSegment = document.querySelector('[data-role="segment"]');
  if (firstSegment) {
    const typeSelector = firstSegment.querySelector('#segment-type-selector');
    if (typeSelector) {
      typeSelector.value = 'run-walk';
    }
    changeSegmentType('run-walk', firstSegment);

    const checkboxes = firstSegment.querySelectorAll('.toggle input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      cb.checked = true;
    });

    const sliders = firstSegment.querySelectorAll('[data-role="slider"]');
    sliders.forEach((slider) => {
      const controlType = slider.closest('.control').dataset.controlType;
      if (controlType === 'repeat') slider.value = 5;
      if (controlType === 'time') slider.value = 150;
      if (controlType === 'distance') slider.value = 0.5;
      if (controlType === 'pace') {
        const isWalk = slider.closest('[data-interval="walk"]');
        slider.value = isWalk ? 750 : 450;
      }
      updateSliderLabel(slider);
    });
    firstSegment.classList.remove('--collapsed');
  }

  if (distanceSelection) distanceSelection.value = '';

  const remainingSegments = getSegments();
  updateGrandTotals(remainingSegments);
  renumberSegments(remainingSegments);
}

function init() {
  const hasLoadedData = loadFromStorage();
  if (!hasLoadedData) {
    createSegmentCard();
  }
}

// EVENT LISTENERS

if (distanceSelectionButtons) {
  distanceSelectionButtons.addEventListener('click', (e) => {
    if (!e.target.matches('button')) return;
    setGoalDistance(e.target.id);
    updateGrandTotals(getSegments());
    saveToStorage();
  });
}

if (distanceSelection) {
  distanceSelection.addEventListener('input', () => {
    updateGrandTotals(getSegments());
    saveToStorage();
  });
}

segmentList.addEventListener('change', (e) => {
  const typeSelect = e.target.closest('#segment-type-selector');
  if (typeSelect) {
    changeSegmentType(typeSelect.value, typeSelect.closest('[data-role="segment"]'));
  }

  updateGrandTotals(getSegments());
  saveToStorage();
});

if (resetButton) {
  resetButton.addEventListener('click', resetPlan);
}

segmentList.addEventListener('input', (e) => {
  if (e.target.dataset.role !== 'slider') return;
  updateSliderLabel(e.target);
  updateGrandTotals(getSegments());
  saveToStorage();
});

segmentList.addEventListener('click', (e) => {
  const deleteBtn = e.target.closest('[data-role="delete-row"]');
  const closeBtn = e.target.closest('[data-role="close-card"]');
  if (deleteBtn) {
    removeSegment(deleteBtn.closest('[data-role="segment"]'));
    saveToStorage();
  } else if (closeBtn) {
    toggleCardVisibility(closeBtn);
  }
});

if (addSegmentButton) {
  addSegmentButton.addEventListener('click', () => {
    createSegmentCard();
    saveToStorage();
  });
}

// INITIALIZATION
init();
