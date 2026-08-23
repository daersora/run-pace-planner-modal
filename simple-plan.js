// SELECTORS

const segmentList = document.getElementById('segment-list');
const addSegmentButton = document.getElementById('add-segment-button');
const resetButton = document.getElementById('reset-plan-button');
const distanceSelection = document.getElementById('distance-goal-input');
const distanceSelectionButtons = document.getElementById('distance-selectors');
const segmentTemplate = document.getElementById('tpl-segment-card');

// Grand Totals Labels
const grandTotalTimeLabel = document.querySelector('[data-role="total-time"]');
const grandTotalDistLabel = document.querySelector(
  '[data-role="total-distance"]',
);
const grandTotalPaceLabel = document.querySelector('[data-role="total-pace"]');

// HELPERS

const distanceGoalValues = {
  '5km-goal': 5,
  '10km-goal': 10,
  'half-goal': 21.1,
  'full-goal': 42.2,
};

function padTimeValues(input) {
  return String(input).padStart(2, '0');
}

function formatTimes(totalSeconds) {
  const hours = padTimeValues(Math.floor(totalSeconds / 3600));
  const minutes = padTimeValues(Math.floor((totalSeconds % 3600) / 60));
  const seconds = padTimeValues(Math.floor(totalSeconds % 60));
  return totalSeconds < 3600
    ? `${minutes}:${seconds}`
    : `${hours}:${minutes}:${seconds}`;
}

function distance(paceSecs, timeSecs) {
  return timeSecs / paceSecs;
}

function pace(distKm, timeSecs) {
  return distKm > 0 ? timeSecs / distKm : 0;
}

function time(distKm, paceSecs) {
  return distKm * paceSecs;
}

function getSegments() {
  return document.querySelectorAll('[data-role="segment"]');
}

// UI FUNCTIONS

function updateSliderLabel(slider) {
  const controlBox = slider.closest('.control-group');
  const outputLabel = controlBox.querySelector('[data-role="output"]');
  const val = Number(slider.value);
  const controlType = controlBox.dataset.controlType;
  if (controlType === 'pace') {
    outputLabel.textContent = `${formatTimes(val)} min/km`;
  } else if (controlType === 'time') {
    outputLabel.textContent = `${formatTimes(val)} min`;
  } else if (controlType === 'repeat') {
    outputLabel.textContent = `${val} Repeats`;
  }
}

function updateSegmentCalculations(segmentCard) {
  // 1. Run Calculations
  const runPace = Number(
    segmentCard.querySelector(
      '[data-interval="run"] [data-control-type="pace"] input',
    ).value,
  );
  const runTime = Number(
    segmentCard.querySelector(
      '[data-interval="run"] [data-control-type="time"] input',
    ).value,
  );
  const runDist = distance(runPace, runTime);
  segmentCard.querySelector(
    '[data-interval="run"] [data-role="distance"]',
  ).textContent = `Distance ${runDist.toFixed(2)} km`;
  // 2. Walk Calculations
  const walkPace = Number(
    segmentCard.querySelector(
      '[data-interval="walk"] [data-control-type="pace"] input',
    ).value,
  );
  const walkTime = Number(
    segmentCard.querySelector(
      '[data-interval="walk"] [data-control-type="time"] input',
    ).value,
  );
  const walkDist = distance(walkPace, walkTime);
  segmentCard.querySelector(
    '[data-interval="walk"] [data-role="distance"]',
  ).textContent = `Distance ${walkDist.toFixed(2)} km`;
  // 3. Segment Totals (with Repeats)
  const repeats = Number(
    segmentCard.querySelector('[data-control-type="repeat"] input').value,
  );
  const repeatTimeSecs = runTime + walkTime;
  const segmentTimeSecs = repeatTimeSecs * repeats;
  const repeatDist = runDist + walkDist;
  const segmentDist = repeatDist * repeats;
  const segmentPaceSecs = pace(segmentDist, segmentTimeSecs);
  // 4. Update Repeat Label
  const repeatLabelEl = segmentCard.querySelector(
    '.segment-card__repeat-summary',
  );
  if (repeatLabelEl) {
    repeatLabelEl.textContent = `Repeats: ${formatTimes(repeatTimeSecs)} | ${formatTimes(segmentPaceSecs)} min/km | ${repeatDist.toFixed(2)} km`;
  }
  // 5. Update Header Summary Label
  const headerSummaryEl = segmentCard.querySelector(
    '[data-role="header-summary"]',
  );
  if (headerSummaryEl) {
    headerSummaryEl.textContent = `${formatTimes(segmentTimeSecs)} | ${formatTimes(segmentPaceSecs)} min/km | ${segmentDist.toFixed(2)} km`;
  }

  return { segmentTimeSecs, segmentDist };
}

function createSegmentCard() {
  if (!segmentTemplate) return;
  clonedCard = segmentTemplate.content.cloneNode(true);
  segmentList.appendChild(clonedCard);
  const sliders = segmentList.querySelectorAll('[data-role="slider"]');
  sliders.forEach((slider) => updateSliderLabel(slider));
  const currentSegments = getSegments();
  renumberSegments(currentSegments);
  updateGrandTotals(currentSegments);
}

function setGoalDistance(input) {
  const outputValue = distanceGoalValues[input];
  distanceSelection.value = outputValue;
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
  if (grandTotalDistLabel)
    grandTotalDistLabel.textContent = `Distance: ${totalDist.toFixed(2)} km`;
  if (grandTotalPaceLabel)
    grandTotalPaceLabel.textContent = `Pace: ${totalPace} min/km`;
  if (grandTotalTimeLabel)
    grandTotalTimeLabel.textContent = `Time: ${formatTimes(totalTime)}`;
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
  card.classList.toggle('segment-card--collapsed');
}

function resetPlan() {
  const currentSegments = getSegments();
  currentSegments.forEach((segment, index) => {
    if (index > 0) segment.remove();
  });
  const firstSegment = document.querySelector('[data-role="segment"]');
  const sliders = firstSegment.querySelectorAll('[data-role="slider"]');
  sliders.forEach((slider) => {
    const controlType = slider.closest('.control-group').dataset.controlType;
    if (controlType === 'repeat') slider.value = 5;
    if (controlType === 'time') slider.value = 150;
    if (controlType === 'pace') {
      const isWalk = slider.closest('[data-interval="walk"]');
      slider.value = isWalk ? 750 : 450;
    }
    updateSliderLabel(slider);
  });
  firstSegment.classList.remove('segment-card--collapsed');
  const remainingSegments = getSegments();
  updateGrandTotals(remainingSegments);
  renumberSegments(remainingSegments);
}

function init() {
  createSegmentCard();
}

// EVENT LISTENERS

distanceSelectionButtons.addEventListener('click', (e) => {
  const target = e.target;
  if (!e.target.matches('button')) {
    return;
  }
  const buttonID = target.id;
  setGoalDistance(buttonID);
});

if (resetButton) {
  resetButton.addEventListener('click', resetPlan);
}

// Input Delegator for Sliders
segmentList.addEventListener('input', (e) => {
  if (e.target.dataset.role !== 'slider') return;
  updateSliderLabel(e.target);
  updateGrandTotals(getSegments());
});

// Click Delegator for Buttons
segmentList.addEventListener('click', (e) => {
  const deleteBtn = e.target.closest('[data-role="delete-row"]');
  const closeBtn = e.target.closest('[data-role="close-card"]');
  if (deleteBtn) {
    removeSegment(deleteBtn.closest('[data-role="segment"]'));
  } else if (closeBtn) {
    toggleCardVisibility(closeBtn);
  }
});

// Add New Segment
addSegmentButton.addEventListener('click', () => {
  createSegmentCard();
});

// INITIALIZATION

init();

// DEBUG TOOLS

const secondsInput = document.querySelector('[data-role="debug-input"]');
const secondsOutput = document.querySelector('[data-role="debug-output"]');
if (secondsInput && secondsOutput) {
  secondsInput.addEventListener('input', () => {
    let inputSeconds = secondsInput.value;
    secondsOutput.textContent = formatTimes(inputSeconds);
  });
}
