const map = L.map('map', {
  zoomSnap: 0.25,
  worldCopyJump: false
}).setView([22, 48], 3.5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const form = document.getElementById('vesselForm');
const vesselList = document.getElementById('vesselList');
const resetBtn = document.getElementById('resetBtn');
const mapWrap = document.getElementById('mapWrap');
const labelLayer = document.getElementById('labelLayer');
const reportFileInput = document.getElementById('reportFileInput');
const positionUpdateBtn = document.getElementById('positionUpdateBtn');
const positionExcelInput = document.getElementById('positionExcelInput');

const issueReportBtn = document.getElementById('issueReportBtn');
const cocReportBtn = document.getElementById('cocReportBtn');
const sireReportBtn = document.getElementById('sireReportBtn');
const conditionReportBtn = document.getElementById('conditionReportBtn');

const toggleAllLabelsBtn = document.getElementById('toggleAllLabelsBtn');
const filterAllBtn = document.getElementById('filterAllBtn');
const filterLoadingBtn = document.getElementById('filterLoadingBtn');
const filterBallastBtn = document.getElementById('filterBallastBtn');
const filterContainerBtn = document.getElementById('filterContainerBtn');
const filterSireProgressBtn = document.getElementById('filterSireProgressBtn');
const filterSonBtn = document.getElementById('filterSonBtn');
const filterKimBtn = document.getElementById('filterKimBtn');
const filterLeeBtn = document.getElementById('filterLeeBtn');
const filterDryDockDueBtn = document.getElementById('filterDryDockDueBtn');
const filterCocBtn = document.getElementById('filterCocBtn');
const filterCriticalBtn = document.getElementById('filterCriticalBtn');

const shipSearchInput = document.getElementById('shipSearchInput');
const shipSearchDropdown = document.getElementById('shipSearchDropdown');

const countAll = document.getElementById('countAll');
const countLoading = document.getElementById('countLoading');
const countBallast = document.getElementById('countBallast');
const countContainer = document.getElementById('countContainer');
const countSireProgress = document.getElementById('countSireProgress');
const countSon = document.getElementById('countSon');
const countKim = document.getElementById('countKim');
const countLee = document.getElementById('countLee');
const countDryDockDue = document.getElementById('countDryDockDue');
const countCoc = document.getElementById('countCoc');
const countCritical = document.getElementById('countCritical');

const vesselType = document.getElementById('vesselType');
const cargoStatusWrap = document.getElementById('cargoStatusWrap');
const cocSection = document.getElementById('cocSection');
const sireSection = document.getElementById('sireSection');

const COC_COUNT = 10;
const SIRE_COUNT = 3;

let vessels = [];
let markers = [];
let nameMarkers = [];
let editIndex = null;
let labelObjects = [];

let labelMode = 'none';
let activeLabelIndex = null;
let currentFilter = 'all';
let uploadTargetIndex = null;
let uploadTargetReportKey = null;
let isLoading = false;

const REPORT_KEYS = ['report1_file', 'report2_file', 'report3_file', 'report4_file', 'report5_file', 'report6_file', 'report6_file'];

const shipSvg = (color) => `
  <div class="ship-icon">
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M32 6 L40 18 L40 30 L50 34 L55 46 L32 58 L9 46 L14 34 L24 30 L24 18 Z"
            fill="${color}"
            stroke="#0f172a"
            stroke-width="3"
            stroke-linejoin="round"/>
      <path d="M28 14 H36 V28 H28 Z" fill="#ffffff" opacity="0.95"/>
      <path d="M19 43 Q32 50 45 43" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
    </svg>
  </div>
`;

function shipNameHtml(name) {
  return `<div class="ship-name-text">${escapeHtml(name)}</div>`;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hasText(value) {
  return String(value ?? '').trim() !== '';
}

function normalizeCargoStatus(value) {
  const v = String(value || '').trim();
  if (v === 'Loading' || v === 'Ballast') return v;
  return 'Ballast';
}

function normalizeVesselType(value) {
  const v = String(value || '').trim();
  if (v === 'Container') return 'Container';
  return 'Tanker';
}

function normalizeSireStatus(value) {
  const v = String(value || '').trim();
  if (v === '예정' || v === '결함조치 중' || v === '수검완료') return v;
  return '';
}

function setupDateInputs() {
  document.querySelectorAll('[data-date-input]').forEach((input) => {
    const syncEmptyState = () => {
      if (!input.value) {
        input.type = 'text';
        input.placeholder = '날짜';
      } else {
        input.type = 'date';
      }
    };

    syncEmptyState();

    input.addEventListener('focus', () => {
      input.type = 'date';
      input.showPicker?.();
    });

    input.addEventListener('click', () => {
      if (input.type !== 'date') {
        input.type = 'date';
      }
      input.showPicker?.();
    });

    input.addEventListener('change', () => {
      if (input.value) {
        input.type = 'date';
      }
    });

    input.addEventListener('blur', () => {
      syncEmptyState();
    });
  });
}

function setDateInputValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  el.value = value || '';
  if (el.value) {
    el.type = 'date';
  } else {
    el.type = 'text';
    el.placeholder = '날짜';
  }
}

function updateVesselTypeUI() {
  const type = normalizeVesselType(vesselType?.value || 'Tanker');

  cocSection?.classList.remove('hidden-block');

  if (type === 'Container') {
    cargoStatusWrap?.classList.add('hidden-block');
    sireSection?.classList.add('hidden-block');
  } else {
    cargoStatusWrap?.classList.remove('hidden-block');
    sireSection?.classList.remove('hidden-block');
  }
}


function makeOptionalLine(label, value) {
  if (!value) return '';
  return `
    <div class="line">
      <div class="line-label">${label}</div>
      <div class="line-value">${escapeHtml(value)}</div>
    </div>
  `;
}

function hasCriticalIssue(vessel) {
  for (let i = 1; i <= 15; i++) {
    const issueText = String(vessel[`issue_${i}`] || '').trim();
    const critical = Number(vessel[`issue_${i}_critical`] || 0) === 1;
    if (issueText && critical) return true;
  }
  return false;
}



function isCocDueWithin1Month(value) {
  const text = String(value || '').trim();
  if (!text) return false;

  const due = new Date(text);
  if (Number.isNaN(due.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const oneMonthLater = new Date(today);
  oneMonthLater.setDate(oneMonthLater.getDate() + 30);

  due.setHours(0, 0, 0, 0);

  return due >= today && due <= oneMonthLater;
}

function hasAnyCoc(vessel) {
  for (let i = 1; i <= COC_COUNT; i++) {
    if (isCocDueWithin1Month(vessel[`coc_due_date_${i}`])) {
      return true;
    }
  }
  return false;
}








function hasSireInProgress(vessel) {
  for (let i = 1; i <= SIRE_COUNT; i++) {
    if (String(vessel[`sire_status_${i}`] || '').trim() === '결함조치 중') {
      return true;
    }
  }
  return false;
}

function isDryDockDueWithin6Months(value) {
  const text = String(value || '').trim();
  if (!text) return false;

  const due = new Date(text);
  if (Number.isNaN(due.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sixMonthsLater = new Date(today);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  due.setHours(0, 0, 0, 0);

  return due >= today && due <= sixMonthsLater;
}

function makeIssueLines(vessel) {
  const lines = [];
  for (let i = 1; i <= 15; i++) {
    const value = String(vessel[`issue_${i}`] || '').trim();
    const isCritical = Number(vessel[`issue_${i}_critical`] || 0) === 1;

    if (value) {
      lines.push(
        `<div class="line issue-line">
          <div class="line-label">${i}</div>
          <div class="line-value ${isCritical ? 'map-value-red' : ''}">
            ${escapeHtml(value)}
          </div>
        </div>`
      );
    }
  }
  return lines.join('');
}

function getSireStatusHtml(status) {
  const v = String(status || '').trim();
  if (!v) return '';

  if (v === '예정') {
    return `<span class="sire-status-scheduled">${escapeHtml(v)}</span>`;
  }
  if (v === '결함조치 중') {
    return `<span class="sire-status-progress">${escapeHtml(v)}</span>`;
  }
  if (v === '수검완료') {
    return `<span class="sire-status-done">${escapeHtml(v)}</span>`;
  }
  return `<span>${escapeHtml(v)}</span>`;
}

function makeCocLines(vessel) {
  const lines = [];

  for (let i = 1; i <= COC_COUNT; i++) {
    const type = String(vessel[`coc_type_${i}`] || '').trim();
    const summary = String(vessel[`coc_summary_${i}`] || '').trim();
    const dueDate = String(vessel[`coc_due_date_${i}`] || '').trim();

    if (type || summary || dueDate) {
      lines.push(`
        <div class="line issue-line">
          <div class="line-label">${i}</div>
          <div class="line-value">
            ${type ? escapeHtml(type) : ''}
            ${summary ? ` / ${escapeHtml(summary)}` : ''}
            ${dueDate ? ` / <span class="map-value-blue">${escapeHtml(dueDate)}</span>` : ''}
          </div>
        </div>
      `);
    }
  }

  return lines.join('');
}

function makeSireLines(vessel) {
  const lines = [];

  for (let i = 1; i <= SIRE_COUNT; i++) {
    const type = String(vessel[`sire_type_${i}`] || '').trim();
    const date = String(vessel[`sire_date_${i}`] || '').trim();
    const status = String(vessel[`sire_status_${i}`] || '').trim();
    const findings = String(vessel[`sire_findings_${i}`] || '').trim();
    const openFindings = String(vessel[`sire_open_findings_${i}`] || '').trim();

    if (type || date || status || findings || openFindings) {
      let detail = '';
      if (findings) detail += ` / 지적 ${escapeHtml(findings)}건`;
      if (openFindings) detail += ` / 잔여 ${escapeHtml(openFindings)}건`;

      lines.push(`
        <div class="line issue-line">
          <div class="line-label">${i}</div>
          <div class="line-value">
            ${type ? escapeHtml(type) : ''}
            ${date ? ` / ${escapeHtml(date)}` : ''}
            ${status ? ` / ${getSireStatusHtml(status)}` : ''}
            ${detail}
          </div>
        </div>
      `);
    }
  }

  return lines.join('');
}

function makeConditionReportLines(vessel) {
  const type = String(vessel.condition_report_type || '').trim();
  const date = String(vessel.condition_report_date || '').trim();
  const status = String(vessel.condition_report_status || '').trim();
  const findings = String(vessel.condition_report_findings || '').trim();
  const openFindings = String(vessel.condition_report_open_findings || '').trim();

  if (!type && !date && !status && !findings && !openFindings) {
    return '';
  }

  let detail = '';
  if (findings) detail += ` / 지적 ${escapeHtml(findings)}건`;
  if (openFindings) detail += ` / 잔여 ${escapeHtml(openFindings)}건`;

  return `
    <div class="line issue-line">
      <div class="line-label">1</div>
      <div class="line-value">
        ${type ? escapeHtml(type) : ''}
        ${date ? ` / ${escapeHtml(date)}` : ''}
        ${status ? ` / ${getSireStatusHtml(status)}` : ''}
        ${detail}
      </div>
    </div>
  `;
}


function getVesselColor(vessel) {
  const type = normalizeVesselType(vessel.vessel_type);

  // 1순위: Container
  if (type === 'Container') {
    return 'green';
  }

  // 2순위: Tanker 상태
  const cargo = normalizeCargoStatus(vessel.cargo_status);

  if (cargo === 'Loading') return 'orange';
  if (cargo === 'Ballast') return 'yellow';

  return 'gray';
}

function getShipIcon(vessel) {
  const colorType = getVesselColor(vessel);

  const fill = colorType === 'green'
    ? '#22c55e'   // Container
    : colorType === 'orange'
      ? '#f97316' // Tanker Loading
      : colorType === 'yellow'
        ? '#facc15' // Tanker Ballast
        : '#94a3b8';

  return L.divIcon({
    className: 'ship-icon-wrap',
    html: shipSvg(fill),
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

function getNameIcon(name) {
  return L.divIcon({
    className: 'ship-name-icon',
    html: shipNameHtml(name),
    iconSize: [120, 16],
    iconAnchor: [60, -2]
  });
}

function highlightCargoStatus(value) {
  const cargo = normalizeCargoStatus(value);

  if (cargo === 'Loading') {
    return `<span class="map-value-green">${escapeHtml(cargo)}</span>`;
  }
  if (cargo === 'Ballast') {
    return `<span class="map-value-orange">${escapeHtml(cargo)}</span>`;
  }
  return `<span class="map-value-normal">${escapeHtml(cargo)}</span>`;
}

function highlightListCargoStatus(value) {
  const cargo = normalizeCargoStatus(value);

  if (cargo === 'Loading') {
    return `<span class="list-value-green">${escapeHtml(cargo)}</span>`;
  }
  if (cargo === 'Ballast') {
    return `<span class="list-value-orange">${escapeHtml(cargo)}</span>`;
  }
  return `<span class="list-value-normal">${escapeHtml(cargo)}</span>`;
}

function getFilteredVessels() {
  if (currentFilter === 'loading') {
    return vessels.filter(v => normalizeVesselType(v.vessel_type) === 'Tanker' && normalizeCargoStatus(v.cargo_status) === 'Loading');
  }

  if (currentFilter === 'ballast') {
    return vessels.filter(v => normalizeVesselType(v.vessel_type) === 'Tanker' && normalizeCargoStatus(v.cargo_status) === 'Ballast');
  }

  if (currentFilter === 'container') {
    return vessels.filter(v => normalizeVesselType(v.vessel_type) === 'Container');
  }

  if (currentFilter === 'sireprogress') {
    return vessels.filter(v => hasSireInProgress(v));
  }

  if (currentFilter === 'son') {
    return vessels.filter(v => String(v.owner_supervisor || '').trim() === '손유석 감독');
  }

  if (currentFilter === 'kim') {
    return vessels.filter(v => String(v.owner_supervisor || '').trim() === '김흥민 감독');
  }

  if (currentFilter === 'lee') {
    return vessels.filter(v => String(v.owner_supervisor || '').trim() === '이창주 감독');
  }

  if (currentFilter === 'drydockdue') {
    return vessels.filter(v => isDryDockDueWithin6Months(v.next_dry_dock));
  }

  if (currentFilter === 'coc') {
    return vessels.filter(v => hasAnyCoc(v));
  }

  if (currentFilter === 'critical') {
    return vessels.filter(v => hasCriticalIssue(v));
  }

  return vessels;
}

function getReportViewUrl(vessel, reportKey) {
  const filename = vessel[reportKey];
  return filename ? `/uploads/reports/${encodeURIComponent(vessel[reportKey])}?_=${Date.now()}` : '';
}

function makeSingleReportRow(index, vessel, reportKey, reportLabel) {
  const hasFile = !!vessel[reportKey];

  return `
    <div class="report-row-compact">
      <div class="report-left">${reportLabel.replace('Report ', 'R')}</div>
      <div class="report-right">
        <button
          type="button"
          class="report-half-btn view"
          onclick="viewReportFile(${index}, '${reportKey}')"
          ${hasFile ? '' : 'disabled'}
        >
          보기
        </button>
        <button
          type="button"
          class="report-half-btn upload"
          onclick="openReportUpload(${index}, '${reportKey}')"
        >
          업로드
        </button>
      </div>
    </div>
  `;
}

function makeReportsBlock(index, vessel) {
  return `
    <div class="reports-block">
      ${makeSingleReportRow(index, vessel, 'report1_file', '국적증서')}
      ${makeSingleReportRow(index, vessel, 'report2_file', 'Survey Status')}
      ${makeSingleReportRow(index, vessel, 'report3_file', 'Condition Report')}
      ${makeSingleReportRow(index, vessel, 'report4_file', 'TSI Report')}
      ${makeSingleReportRow(index, vessel, 'report5_file', 'Q88')}
      ${makeSingleReportRow(index, vessel, 'report6_file', 'Sire Report')}
      ${makeSingleReportRow(index, vessel, 'report7_file', 'SMA')}
    </div>
  `;
}





function makeLabelHtml(vessel, index) {
  const cls = getVesselColor(vessel);
  const type = normalizeVesselType(vessel.vessel_type);

  return `
    <div class="map-label ${cls}" data-index="${index}">
      <div class="title">${escapeHtml(vessel.name)}</div>

      <div class="label-section">
        ${makeOptionalLine('관리사', vessel.management_company)}
        ${makeOptionalLine('관리사감독', vessel.management_supervisor)}
        ${makeOptionalLine('운항담당자', vessel.operation_manager)}
        ${makeOptionalLine('선주감독', vessel.owner_supervisor)}
        ${makeOptionalLine('Type', type)}
        ${makeOptionalLine('Size', vessel.size)}
        ${makeOptionalLine('Builder', vessel.builder)}
        ${makeOptionalLine('Delivery Date', vessel.delivery_date)}
        ${makeOptionalLine('Next Dry dock', vessel.next_dry_dock)}
        ${type === 'Tanker'
          ? `<div class="line"><div class="line-label">Cargo</div><div class="line-value">${highlightCargoStatus(vessel.cargo_status)}</div></div>`
          : ''}
        ${makeOptionalLine('항차계획', vessel.voyage_plan)}
      </div>

      <div class="section-divider"></div>

      <div class="label-section">
        <div class="section-title">현안업무</div>
        ${makeIssueLines(vessel) || `<div class="issue-empty">입력 없음</div>`}
      </div>

      <div class="section-divider"></div>

      <div class="label-section">
        <div class="section-title">COC 현황</div>
        ${makeCocLines(vessel) || `<div class="issue-empty">입력 없음</div>`}
      </div>

      <div class="section-divider"></div>

      ${type === 'Tanker' ? `
      <div class="label-section">
        <div class="section-title">Sire 현황</div>
        ${makeSireLines(vessel) || `<div class="issue-empty">입력 없음</div>`}
      </div>

      <div class="section-divider"></div>
      ` : ''}

      <div class="label-section">
        <div class="section-title">Condition Report</div>
        ${makeConditionReportLines(vessel) || `<div class="issue-empty">입력 없음</div>`}
      </div>

      <div class="section-divider"></div>

      <div class="label-section">
        <div class="section-title">Reports</div>
        ${makeReportsBlock(index, vessel)}
      </div>

      <div class="map-label-actions">
        <button type="button" class="map-mini-btn close" onclick="closeLabel()">닫기</button>
      </div>
    </div>
  `;
}








function closeLabel() {
  labelMode = 'none';
  activeLabelIndex = null;
  clearLabels();
}

function updateToolbarButtons() {
  const buttonMap = {
    all: filterAllBtn,
    loading: filterLoadingBtn,
    ballast: filterBallastBtn,
    container: filterContainerBtn,
    sireprogress: filterSireProgressBtn,
    son: filterSonBtn,
    kim: filterKimBtn,
    lee: filterLeeBtn,
    drydockdue: filterDryDockDueBtn,
    coc: filterCocBtn,
    critical: filterCriticalBtn
  };

  Object.values(buttonMap).forEach(btn => {
    if (btn) btn.classList.remove('active');
  });

  if (buttonMap[currentFilter]) {
    buttonMap[currentFilter].classList.add('active');
  }

  updateToggleAllLabelsButton();
}

function updateToggleAllLabelsButton() {
  if (!toggleAllLabelsBtn) return;

  if (labelMode === 'all') {
    toggleAllLabelsBtn.classList.add('active');
  } else {
    toggleAllLabelsBtn.classList.remove('active');
  }
}

function updateStatusBoard() {
  if (countAll) {
    countAll.textContent = `${vessels.length}척`;
  }

  if (countLoading) {
    countLoading.textContent = `${vessels.filter(v => normalizeVesselType(v.vessel_type) === 'Tanker' && normalizeCargoStatus(v.cargo_status) === 'Loading').length}척`;
  }

  if (countBallast) {
    countBallast.textContent = `${vessels.filter(v => normalizeVesselType(v.vessel_type) === 'Tanker' && normalizeCargoStatus(v.cargo_status) === 'Ballast').length}척`;
  }

  if (countContainer) {
    countContainer.textContent = `${vessels.filter(v => normalizeVesselType(v.vessel_type) === 'Container').length}척`;
  }

  if (countSireProgress) {
    countSireProgress.textContent = `${vessels.filter(v => hasSireInProgress(v)).length}척`;
  }

  if (countSon) {
    countSon.textContent = `${vessels.filter(v => String(v.owner_supervisor || '').trim() === '손유석 감독').length}척`;
  }

  if (countKim) {
    countKim.textContent = `${vessels.filter(v => String(v.owner_supervisor || '').trim() === '김흥민 감독').length}척`;
  }

  if (countLee) {
    countLee.textContent = `${vessels.filter(v => String(v.owner_supervisor || '').trim() === '이창주 감독').length}척`;
  }

  if (countDryDockDue) {
    countDryDockDue.textContent = `${vessels.filter(v => isDryDockDueWithin6Months(v.next_dry_dock)).length}척`;
  }

  if (countCoc) {
    countCoc.textContent = `${vessels.filter(v => hasAnyCoc(v)).length}척`;
  }

  if (countCritical) {
    countCritical.textContent = `${vessels.filter(v => hasCriticalIssue(v)).length}척`;
  }

  updateToolbarButtons();
}


async function loadData(options = {}) {
  const {
    preserveSelection = true,
    silent = false,
    fitBounds = false
  } = options;

  if (isLoading) return;
  isLoading = true;

  const previousEditName = preserveSelection && editIndex !== null && vessels[editIndex]
    ? String(vessels[editIndex].name || '').trim().toLowerCase()
    : '';

  const previousActiveName = preserveSelection && activeLabelIndex !== null && vessels[activeLabelIndex]
    ? String(vessels[activeLabelIndex].name || '').trim().toLowerCase()
    : '';

  try {
    const response = await fetch(`/api/vessels?_=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`데이터 불러오기 실패: ${response.status}`);
    }

    vessels = await response.json();

    if (!Array.isArray(vessels)) {
      vessels = [];
    }

    vessels = vessels.map(v => {
      const normalized = {
        ...v,
        vessel_type: normalizeVesselType(v.vessel_type || 'Tanker'),
        voyage_plan: v.voyage_plan || '',
        cargo_status: v.vessel_type === 'Container' ? '' : normalizeCargoStatus(v.cargo_status)
      };

      for (let i = 1; i <= 5; i++) {
        normalized[`report${i}_file`] = normalized[`report${i}_file`] || '';
      }

      for (let i = 1; i <= COC_COUNT; i++) {
        normalized[`coc_type_${i}`] = normalized[`coc_type_${i}`] || '';
        normalized[`coc_summary_${i}`] = normalized[`coc_summary_${i}`] || '';
        normalized[`coc_due_date_${i}`] = normalized[`coc_due_date_${i}`] || '';
      }

      for (let i = 1; i <= SIRE_COUNT; i++) {
        normalized[`sire_type_${i}`] = normalized[`sire_type_${i}`] || '';
        normalized[`sire_date_${i}`] = normalized[`sire_date_${i}`] || '';
        normalized[`sire_status_${i}`] = normalizeSireStatus(normalized[`sire_status_${i}`] || '');
        normalized[`sire_findings_${i}`] = normalized[`sire_findings_${i}`] || '';
        normalized[`sire_open_findings_${i}`] = normalized[`sire_open_findings_${i}`] || '';
      }

      normalized.condition_report_type = normalized.condition_report_type || '';
      normalized.condition_report_date = normalized.condition_report_date || '';
      normalized.condition_report_status = normalizeSireStatus(normalized.condition_report_status || '');
      normalized.condition_report_findings = normalized.condition_report_findings || '';
      normalized.condition_report_open_findings = normalized.condition_report_open_findings || '';

      return normalized;
    });

    if (previousEditName) {
      const newEditIndex = vessels.findIndex(v => String(v.name || '').trim().toLowerCase() === previousEditName);
      editIndex = newEditIndex >= 0 ? newEditIndex : null;
    }

    if (previousActiveName) {
      const newActiveIndex = vessels.findIndex(v => String(v.name || '').trim().toLowerCase() === previousActiveName);
      activeLabelIndex = newActiveIndex >= 0 ? newActiveIndex : null;
      if (newActiveIndex < 0 && labelMode === 'one') {
        labelMode = 'none';
      }
    }

    updateStatusBoard();
    renderList();
    renderMap(fitBounds);
    renderSearchSuggestions('');

    if (!silent) {
      console.log('최신 데이터 동기화 완료');
    }
  } catch (error) {
    console.error('데이터 불러오기 실패:', error);
    vessels = [];
    editIndex = null;
    activeLabelIndex = null;
    labelMode = 'none';
    updateStatusBoard();
    renderList();
    renderMap(fitBounds);
    renderSearchSuggestions('');
  } finally {
    isLoading = false;
  }
}

async function saveSingleVessel(vesselData) {
  try {
    const response = await fetch(`/api/vessel?_=${Date.now()}`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify(vesselData)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      alert(result.message || '저장 중 오류가 발생했습니다.');
      return false;
    }

    return true;
  } catch (error) {
    console.error('데이터 저장 실패:', error);
    alert('서버 저장에 실패했습니다.');
    return false;
  }
}

async function deleteSingleVessel(name, password) {
  try {
    const response = await fetch(`/api/vessel/delete?_=${Date.now()}`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify({ name, password })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      alert(result.message || '삭제 중 오류가 발생했습니다.');
      return false;
    }

    return true;
  } catch (error) {
    console.error('삭제 실패:', error);
    alert('서버 삭제에 실패했습니다.');
    return false;
  }
}

async function uploadReportFile(index, reportKey, file) {
  const vessel = vessels[index];
  if (!vessel) return;

  const formData = new FormData();
  formData.append('vesselName', vessel.name);
  formData.append('reportKey', reportKey);
  formData.append('file', file);

  try {
    const response = await fetch(`/api/upload-report?_=${Date.now()}`, {
      method: 'POST',
      cache: 'no-store',
      body: formData,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      alert(result.message || 'Report 업로드에 실패했습니다.');
      return;
    }

    await loadData({ preserveSelection: true, fitBounds: false });
    renderSearchSuggestions(shipSearchInput.value.trim());
    alert(`${reportKey} 업로드 완료`);
  } catch (error) {
    console.error(error);
    alert('Report 업로드 중 오류가 발생했습니다.');
  }
}

async function uploadPositionExcel(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`/api/upload-positions?_=${Date.now()}`, {
      method: 'POST',
      cache: 'no-store',
      body: formData,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      alert(result.message || '위치 업데이트에 실패했습니다.');
      return;
    }

    await loadData({ preserveSelection: true, fitBounds: false });
    renderSearchSuggestions(shipSearchInput.value.trim());

    alert(
      `위치 업데이트 완료\n` +
      `- 전체 행: ${result.totalRows}건\n` +
      `- 업데이트: ${result.updatedCount}척\n` +
      `- 미일치: ${result.notFoundCount}척\n` +
      `- 좌표오류: ${result.invalidCount}건`
    );
  } catch (error) {
    console.error('위치 업데이트 실패:', error);
    alert('위치 업데이트 중 오류가 발생했습니다.');
  }
}

function clearMarkers() {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

function clearNameMarkers() {
  nameMarkers.forEach(marker => map.removeLayer(marker));
  nameMarkers = [];
}

function clearLabels() {
  labelLayer.innerHTML = '';
  labelObjects = [];
}

function fitToVisibleMarkers(visibleMarkers) {
  if (!visibleMarkers.length) return;
  const group = L.featureGroup(visibleMarkers);
  map.fitBounds(group.getBounds().pad(0.55), { maxZoom: 5.5 });
}

function handleShipClick(globalIndex) {
  if (labelMode === 'one' && activeLabelIndex === globalIndex) {
    labelMode = 'none';
    activeLabelIndex = null;
  } else {
    labelMode = 'one';
    activeLabelIndex = globalIndex;
  }

  renderExternalLabels();
}

function renderMap(fitBounds = false) {
  clearMarkers();
  clearNameMarkers();

  const filtered = getFilteredVessels();
  const visibleMarkers = [];

  filtered.forEach((vessel) => {
    if (!Number.isFinite(Number(vessel.latitude)) || !Number.isFinite(Number(vessel.longitude))) return;

    const globalIndex = vessels.findIndex(v => v === vessel);

    const marker = L.marker([vessel.latitude, vessel.longitude], {
      icon: getShipIcon(vessel)
    }).addTo(map);

    marker.on('click', () => {
      fillFormByVessel(globalIndex);
      handleShipClick(globalIndex);
    });

    markers.push(marker);
    visibleMarkers.push(marker);

    const nameMarker = L.marker([vessel.latitude, vessel.longitude], {
      icon: getNameIcon(vessel.name),
      interactive: false,
      keyboard: false
    }).addTo(map);

    nameMarkers.push(nameMarker);
  });

  if (fitBounds && visibleMarkers.length) {
    fitToVisibleMarkers(visibleMarkers);
  }

  setTimeout(renderExternalLabels, 120);
}

function distributeVerticalSlots(count, totalHeight, boxH, gap, topPad = 16, bottomPad = 90) {
  if (count === 0) return [];

  const usableHeight = totalHeight - topPad - bottomPad;
  const totalNeed = count * boxH + (count - 1) * gap;

  let startY = topPad;
  if (totalNeed < usableHeight) {
    startY = topPad + (usableHeight - totalNeed) / 2;
  }

  const slots = [];
  for (let i = 0; i < count; i++) {
    slots.push(startY + i * (boxH + gap));
  }
  return slots;
}

function distributeHorizontalSlots(count, totalWidth, boxW, gap, leftPad = 16, rightPad = 16) {
  if (count === 0) return [];

  const usableWidth = totalWidth - leftPad - rightPad;
  const totalNeed = count * boxW + (count - 1) * gap;

  let startX = leftPad;
  if (totalNeed < usableWidth) {
    startX = leftPad + (usableWidth - totalNeed) / 2;
  }

  const slots = [];
  for (let i = 0; i < count; i++) {
    slots.push(startX + i * (boxW + gap));
  }
  return slots;
}

function drawLeader(line, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  line.style.width = `${length}px`;
  line.style.left = `${x1}px`;
  line.style.top = `${y1}px`;
  line.style.transform = `rotate(${angle}deg)`;
}

function createEdgeLabel(item, left, top, width, height, side) {
  const box = document.createElement('div');
  box.innerHTML = makeLabelHtml(item.vessel, item.index);

  const label = box.firstElementChild;
  label.style.left = `${left}px`;
  label.style.top = `${top}px`;
  label.style.width = `${width}px`;
  labelLayer.appendChild(label);

  const line = document.createElement('div');
  line.className = 'leader-line';
  labelLayer.appendChild(line);

  const fromX = item.point.x;
  const fromY = item.point.y;

  let toX = left + width / 2;
  let toY = top + height / 2;

  if (side === 'left') {
    toX = left + width;
    toY = top + height / 2;
  } else if (side === 'right') {
    toX = left;
    toY = top + height / 2;
  } else if (side === 'top') {
    toX = left + width / 2;
    toY = top + height;
  } else if (side === 'bottom') {
    toX = left + width / 2;
    toY = top;
  }

  drawLeader(line, fromX, fromY, toX, toY);

  labelObjects.push({
    label,
    line,
    item,
    side
  });
}

function getCurrentlyVisibleTargetVessels() {
  const bounds = map.getBounds();
  return getFilteredVessels().filter(vessel => bounds.contains([vessel.latitude, vessel.longitude]));
}

function renderExternalLabels() {
  clearLabels();

  if (labelMode === 'none') return;

  const wrapWidth = mapWrap.clientWidth;
  const wrapHeight = mapWrap.clientHeight;

  let renderTargets = [];

  if (labelMode === 'one' && activeLabelIndex !== null) {
    const vessel = vessels[activeLabelIndex];
    if (vessel && getFilteredVessels().includes(vessel)) {
      renderTargets = [{ vessel, index: activeLabelIndex }];
    }
  } else {
    const currentlyVisible = getCurrentlyVisibleTargetVessels();
    renderTargets = currentlyVisible.map(vessel => ({
      vessel,
      index: vessels.findIndex(v => v === vessel)
    }));
  }

  if (!renderTargets.length) return;

  const topItems = [];
  const bottomItems = [];
  const leftItems = [];
  const rightItems = [];

  const centerX = wrapWidth / 2;
  const centerY = wrapHeight / 2;

  renderTargets.forEach(({ vessel, index }) => {
    const point = map.latLngToContainerPoint([vessel.latitude, vessel.longitude]);
    const item = { vessel, index, point };

    const dx = point.x - centerX;
    const dy = point.y - centerY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) leftItems.push(item);
      else rightItems.push(item);
    } else {
      if (dy < 0) topItems.push(item);
      else bottomItems.push(item);
    }
  });

  topItems.sort((a, b) => a.point.x - b.point.x);
  bottomItems.sort((a, b) => a.point.x - b.point.x);
  leftItems.sort((a, b) => a.point.y - b.point.y);
  rightItems.sort((a, b) => a.point.y - b.point.y);

  const boxW = 310;
  const boxH = 560;
  const gap = 10;

  const topY = 70;
  const bottomY = wrapHeight - boxH;
  const leftX = 16;
  const rightX = wrapWidth - boxW - 16;

  const topSlots = distributeHorizontalSlots(topItems.length, wrapWidth, boxW, gap, 16, 16);
  const bottomSlots = distributeHorizontalSlots(bottomItems.length, wrapWidth, boxW, gap, 16, 16);
  const leftSlots = distributeVerticalSlots(leftItems.length, wrapHeight, boxH, gap, 16, 90);
  const rightSlots = distributeVerticalSlots(rightItems.length, wrapHeight, boxH, gap, 16, 90);

  topItems.forEach((item, i) => createEdgeLabel(item, topSlots[i], topY, boxW, boxH, 'top'));
  bottomItems.forEach((item, i) => createEdgeLabel(item, bottomSlots[i], bottomY, boxW, boxH, 'bottom'));
  leftItems.forEach((item, i) => createEdgeLabel(item, leftX, leftSlots[i], boxW, boxH, 'left'));
  rightItems.forEach((item, i) => createEdgeLabel(item, rightX, rightSlots[i], boxW, boxH, 'right'));
}

function updateLeaderLines() {
  labelObjects.forEach(obj => {
    const point = map.latLngToContainerPoint([obj.item.vessel.latitude, obj.item.vessel.longitude]);
    const rect = obj.label.getBoundingClientRect();
    const wrapRect = mapWrap.getBoundingClientRect();

    const left = rect.left - wrapRect.left;
    const top = rect.top - wrapRect.top;
    const width = rect.width;
    const height = rect.height;

    let toX = left + width / 2;
    let toY = top + height / 2;

    if (obj.side === 'left') {
      toX = left + width;
      toY = top + height / 2;
    } else if (obj.side === 'right') {
      toX = left;
      toY = top + height / 2;
    } else if (obj.side === 'top') {
      toX = left + width / 2;
      toY = top + height;
    } else if (obj.side === 'bottom') {
      toX = left + width / 2;
      toY = top;
    }

    drawLeader(obj.line, point.x, point.y, toX, toY);
  });
}

function renderList() {
  vesselList.innerHTML = '';

  const filtered = getFilteredVessels();

  if (filtered.length === 0) {
    vesselList.innerHTML = '<div class="vessel-item"><small>표시할 선박이 없습니다.</small></div>';
    return;
  }

  filtered.forEach((vessel) => {
    const index = vessels.findIndex(v => v === vessel);
    const type = normalizeVesselType(vessel.vessel_type);

    const item = document.createElement('div');
    item.className = 'vessel-item';
    item.innerHTML = `
      <strong>${escapeHtml(vessel.name)}</strong>
      <small>Type: ${escapeHtml(type)}</small>
   
      <div class="actions">
        <button onclick="editVessel(${index})">수정</button>
        <button class="btn-delete" onclick="deleteVessel(${index})">삭제</button>
      </div>
    `;
    vesselList.appendChild(item);
  });
}

function resetForm() {
  form.reset();
  document.getElementById('vesselType').value = 'Tanker';
  document.getElementById('cargoStatus').value = 'Loading';
  document.getElementById('size').value = '';
  document.getElementById('operationManager').value = '';
  document.getElementById('latitude').value = '';
  document.getElementById('longitude').value = '';

  setDateInputValue('deliveryDate', '');
  setDateInputValue('nextDryDock', '');

  for (let i = 1; i <= 15; i++) {
    const issueEl = document.getElementById(`issue${i}`);
    const issueCriticalEl = document.getElementById(`issue${i}Critical`);

    if (issueEl) issueEl.value = '';
    if (issueCriticalEl) issueCriticalEl.checked = false;
  }

  for (let i = 1; i <= COC_COUNT; i++) {
    const cocTypeEl = document.getElementById(`cocType${i}`);
    const cocSummaryEl = document.getElementById(`cocSummary${i}`);

    if (cocTypeEl) cocTypeEl.value = '';
    if (cocSummaryEl) cocSummaryEl.value = '';
    setDateInputValue(`cocDueDate${i}`, '');
  }

  for (let i = 1; i <= SIRE_COUNT; i++) {
    const sireTypeEl = document.getElementById(`sireType${i}`);
    const sireStatusEl = document.getElementById(`sireStatus${i}`);
    const sireFindingsEl = document.getElementById(`sireFindings${i}`);
    const sireOpenFindingsEl = document.getElementById(`sireOpenFindings${i}`);

    if (sireTypeEl) sireTypeEl.value = '';
    if (sireStatusEl) sireStatusEl.value = '';
    if (sireFindingsEl) sireFindingsEl.value = '';
    if (sireOpenFindingsEl) sireOpenFindingsEl.value = '';
    setDateInputValue(`sireDate${i}`, '');
  }

  document.getElementById('conditionReportType').value = '';
  setDateInputValue('conditionReportDate', '');
  document.getElementById('conditionReportStatus').value = '';
  document.getElementById('conditionReportFindings').value = '';
  document.getElementById('conditionReportOpenFindings').value = '';

  editIndex = null;
  updateVesselTypeUI();
}


function setFilter(filterName) {
  currentFilter = filterName;
  labelMode = 'none';
  activeLabelIndex = null;
  updateToolbarButtons();
  renderList();
  renderMap(true);
}

function focusVesselFromSearch(index) {
  const vessel = vessels[index];
  if (!vessel) return;

  currentFilter = 'all';
  updateToolbarButtons();
  renderList();
  renderMap(false);

  fillFormByVessel(index);   // 추가
  map.setView([vessel.latitude, vessel.longitude], 5.5);
  labelMode = 'one';
  activeLabelIndex = index;

  setTimeout(() => {
    renderExternalLabels();
    updateLeaderLines();
  }, 150);
}

function renderSearchSuggestions(keyword) {
  const q = String(keyword || '').trim().toLowerCase();
  shipSearchDropdown.innerHTML = '';

  if (!q) {
    shipSearchDropdown.classList.remove('show');
    return;
  }

  const matched = vessels.filter(v => String(v.name || '').toLowerCase().includes(q)).slice(0, 20);

  if (!matched.length) {
    const empty = document.createElement('div');
    empty.className = 'search-item';
    empty.textContent = '검색 결과 없음';
    shipSearchDropdown.appendChild(empty);
    shipSearchDropdown.classList.add('show');
    return;
  }

  matched.forEach(vessel => {
    const index = vessels.findIndex(v => v === vessel);
    const item = document.createElement('div');
    item.className = 'search-item';
    item.textContent = vessel.name;
    item.addEventListener('click', () => {
      shipSearchInput.value = vessel.name;
      shipSearchDropdown.classList.remove('show');
      focusVesselFromSearch(index);
    });
    shipSearchDropdown.appendChild(item);
  });

  shipSearchDropdown.classList.add('show');
}

if (toggleAllLabelsBtn) {
  toggleAllLabelsBtn.addEventListener('click', () => {
    if (labelMode === 'all') {
      labelMode = 'none';
    } else {
      labelMode = 'all';
      activeLabelIndex = null;
    }

    updateToggleAllLabelsButton();
    renderExternalLabels();
  });
}

if (filterAllBtn) filterAllBtn.addEventListener('click', () => setFilter('all'));
if (filterLoadingBtn) filterLoadingBtn.addEventListener('click', () => setFilter('loading'));
if (filterBallastBtn) filterBallastBtn.addEventListener('click', () => setFilter('ballast'));
if (filterContainerBtn) filterContainerBtn.addEventListener('click', () => setFilter('container'));
if (filterSireProgressBtn) filterSireProgressBtn.addEventListener('click', () => setFilter('sireprogress'));
if (filterSonBtn) filterSonBtn.addEventListener('click', () => setFilter('son'));
if (filterKimBtn) filterKimBtn.addEventListener('click', () => setFilter('kim'));
if (filterLeeBtn) filterLeeBtn.addEventListener('click', () => setFilter('lee'));
if (filterDryDockDueBtn) filterDryDockDueBtn.addEventListener('click', () => setFilter('drydockdue'));
if (filterCocBtn) filterCocBtn.addEventListener('click', () => setFilter('coc'));
if (filterCriticalBtn) filterCriticalBtn.addEventListener('click', () => setFilter('critical'));

if (vesselType) {
  vesselType.addEventListener('change', updateVesselTypeUI);
}

if (shipSearchInput) {
  shipSearchInput.addEventListener('input', (e) => {
    renderSearchSuggestions(e.target.value);
  });

  shipSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      const keyword = shipSearchInput.value.trim().toLowerCase();
      if (!keyword) return;

      const foundIndex = vessels.findIndex(v => String(v.name || '').toLowerCase().includes(keyword));
      if (foundIndex >= 0) {
        shipSearchDropdown.classList.remove('show');
        focusVesselFromSearch(foundIndex);
      }
    }
  });
}

document.addEventListener('click', (e) => {
  if (shipSearchInput && shipSearchDropdown) {
    if (!shipSearchInput.contains(e.target) && !shipSearchDropdown.contains(e.target)) {
      shipSearchDropdown.classList.remove('show');
    }
  }
});

if (reportFileInput) {
  reportFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || uploadTargetIndex === null || !uploadTargetReportKey) return;

    await uploadReportFile(uploadTargetIndex, uploadTargetReportKey, file);

    reportFileInput.value = '';
    uploadTargetIndex = null;
    uploadTargetReportKey = null;
  });
}

if (positionUpdateBtn && positionExcelInput) {
  positionUpdateBtn.addEventListener('click', () => {
    positionExcelInput.click();
  });

  positionExcelInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    await uploadPositionExcel(file);
    positionExcelInput.value = '';
  });
}

if (issueReportBtn) {
  issueReportBtn.addEventListener('click', () => {
    window.open(`/report?_=${Date.now()}`, '_blank');
  });
}

if (cocReportBtn) {
  cocReportBtn.addEventListener('click', () => {
    window.open(`/coc-report?_=${Date.now()}`, '_blank');
  });
}

if (sireReportBtn) {
  sireReportBtn.addEventListener('click', () => {
    window.open(`/sire-report?_=${Date.now()}`, '_blank');
  });
}

if (conditionReportBtn) {
  conditionReportBtn.addEventListener('click', () => {
    window.open(`/condition-report?_=${Date.now()}`, '_blank');
  });
}



if (form) {
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const originalName = editIndex !== null ? (vessels[editIndex]?.name || '') : '';

    const latitudeValue = document.getElementById('latitude').value.trim();
    const longitudeValue = document.getElementById('longitude').value.trim();
    const currentVesselType = normalizeVesselType(document.getElementById('vesselType').value);

    const vessel = {
      name: document.getElementById('vesselName').value.trim(),
      vesselType: currentVesselType,
      managementCompany: document.getElementById('managementCompany').value.trim(),
      managementSupervisor: document.getElementById('managementSupervisor').value.trim(),
      operationManager: document.getElementById('operationManager').value.trim(),
      ownerSupervisor: document.getElementById('ownerSupervisor').value,
      builder: document.getElementById('builder').value.trim(),
      size: document.getElementById('size').value.trim(),
      deliveryDate: document.getElementById('deliveryDate').value,
      nextDryDock: document.getElementById('nextDryDock').value,
      voyagePlan: document.getElementById('voyagePlan').value.trim(),
      cargoStatus: document.getElementById('cargoStatus').value,

      issue1: document.getElementById('issue1').value.trim(),
      issue1Critical: document.getElementById('issue1Critical').checked,
      issue2: document.getElementById('issue2').value.trim(),
      issue2Critical: document.getElementById('issue2Critical').checked,
      issue3: document.getElementById('issue3').value.trim(),
      issue3Critical: document.getElementById('issue3Critical').checked,
      issue4: document.getElementById('issue4').value.trim(),
      issue4Critical: document.getElementById('issue4Critical').checked,
      issue5: document.getElementById('issue5').value.trim(),
      issue5Critical: document.getElementById('issue5Critical').checked,
      issue6: document.getElementById('issue6').value.trim(),
      issue6Critical: document.getElementById('issue6Critical').checked,
      issue7: document.getElementById('issue7').value.trim(),
      issue7Critical: document.getElementById('issue7Critical').checked,
      issue8: document.getElementById('issue8').value.trim(),
      issue8Critical: document.getElementById('issue8Critical').checked,
      issue9: document.getElementById('issue9').value.trim(),
      issue9Critical: document.getElementById('issue9Critical').checked,
      issue10: document.getElementById('issue10').value.trim(),
      issue10Critical: document.getElementById('issue10Critical').checked,
      issue11: document.getElementById('issue11').value.trim(),
      issue11Critical: document.getElementById('issue11Critical').checked,
      issue12: document.getElementById('issue12').value.trim(),
      issue12Critical: document.getElementById('issue12Critical').checked,
      issue13: document.getElementById('issue13').value.trim(),
      issue13Critical: document.getElementById('issue13Critical').checked,
      issue14: document.getElementById('issue14').value.trim(),
      issue14Critical: document.getElementById('issue14Critical').checked,
      issue15: document.getElementById('issue15').value.trim(),
      issue15Critical: document.getElementById('issue15Critical').checked,

      latitude: latitudeValue === '' ? NaN : parseFloat(latitudeValue),
      longitude: longitudeValue === '' ? NaN : parseFloat(longitudeValue),
      _originalName: originalName
    };

    for (let i = 1; i <= COC_COUNT; i++) {
      vessel[`cocType${i}`] = document.getElementById(`cocType${i}`)?.value.trim() || '';
      vessel[`cocSummary${i}`] = document.getElementById(`cocSummary${i}`)?.value.trim() || '';
      vessel[`cocDueDate${i}`] = document.getElementById(`cocDueDate${i}`)?.value || '';
    }

    for (let i = 1; i <= SIRE_COUNT; i++) {
      vessel[`sireType${i}`] = document.getElementById(`sireType${i}`)?.value.trim() || '';
      vessel[`sireDate${i}`] = document.getElementById(`sireDate${i}`)?.value || '';
      vessel[`sireStatus${i}`] = document.getElementById(`sireStatus${i}`)?.value || '';
      vessel[`sireFindings${i}`] = document.getElementById(`sireFindings${i}`)?.value || '';
      vessel[`sireOpenFindings${i}`] = document.getElementById(`sireOpenFindings${i}`)?.value || '';
    }

    vessel.conditionReportType = document.getElementById('conditionReportType')?.value.trim() || '';
    vessel.conditionReportDate = document.getElementById('conditionReportDate')?.value || '';
    vessel.conditionReportStatus = document.getElementById('conditionReportStatus')?.value || '';
    vessel.conditionReportFindings = document.getElementById('conditionReportFindings')?.value || '';
    vessel.conditionReportOpenFindings = document.getElementById('conditionReportOpenFindings')?.value || '';

if (currentVesselType === 'Container') {
  vessel.cargoStatus = '';

  for (let i = 1; i <= SIRE_COUNT; i++) {
    vessel[`sireType${i}`] = '';
    vessel[`sireDate${i}`] = '';
    vessel[`sireStatus${i}`] = '';
    vessel[`sireFindings${i}`] = '';
    vessel[`sireOpenFindings${i}`] = '';
  }
}

    if (!vessel.name) {
      alert('선박명은 반드시 입력해야 합니다.');
      return;
    }

    if (Number.isNaN(vessel.latitude) || Number.isNaN(vessel.longitude)) {
      const found = vessels.find(v => String(v.name || '').trim().toLowerCase() === vessel.name.toLowerCase());

      if (found && found.latitude !== '' && found.longitude !== '') {
        vessel.latitude = Number(found.latitude);
        vessel.longitude = Number(found.longitude);
      } else {
        alert('위도와 경도를 입력해주세요.');
        return;
      }
    }

    const ok = await saveSingleVessel(vessel);
    if (!ok) return;

    await loadData({ preserveSelection: true, fitBounds: false });

    const newIndex = vessels.findIndex(v => (v.name || '').trim().toLowerCase() === vessel.name.toLowerCase());
    if (newIndex >= 0) {
      editIndex = newIndex;
      activeLabelIndex = newIndex;
      labelMode = 'one';
      fillFormByVessel(newIndex);
    } else {
      editIndex = null;
    }

    renderSearchSuggestions(shipSearchInput.value.trim());
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', resetForm);
}

function fillFormByVessel(index) {
  const vessel = vessels[index];
  if (!vessel) return;

  document.getElementById('vesselName').value = vessel.name || '';
  document.getElementById('vesselType').value = normalizeVesselType(vessel.vessel_type);
  document.getElementById('managementCompany').value = vessel.management_company || '';
  document.getElementById('managementSupervisor').value = vessel.management_supervisor || '';
  document.getElementById('operationManager').value = vessel.operation_manager || '';
  document.getElementById('ownerSupervisor').value = vessel.owner_supervisor || '';
  document.getElementById('builder').value = vessel.builder || '';
  document.getElementById('size').value = vessel.size || '';
  setDateInputValue('deliveryDate', vessel.delivery_date || '');
  setDateInputValue('nextDryDock', vessel.next_dry_dock || '');
  document.getElementById('voyagePlan').value = vessel.voyage_plan || '';
  document.getElementById('cargoStatus').value = normalizeCargoStatus(vessel.cargo_status);

  for (let i = 1; i <= 15; i++) {
    document.getElementById(`issue${i}`).value = vessel[`issue_${i}`] || '';
    document.getElementById(`issue${i}Critical`).checked = Number(vessel[`issue_${i}_critical`] || 0) === 1;
  }

  for (let i = 1; i <= COC_COUNT; i++) {
    const cocTypeEl = document.getElementById(`cocType${i}`);
    const cocSummaryEl = document.getElementById(`cocSummary${i}`);

    if (cocTypeEl) cocTypeEl.value = vessel[`coc_type_${i}`] || '';
    if (cocSummaryEl) cocSummaryEl.value = vessel[`coc_summary_${i}`] || '';
    setDateInputValue(`cocDueDate${i}`, vessel[`coc_due_date_${i}`] || '');
  }

  for (let i = 1; i <= SIRE_COUNT; i++) {
    const sireTypeEl = document.getElementById(`sireType${i}`);
    const sireStatusEl = document.getElementById(`sireStatus${i}`);
    const sireFindingsEl = document.getElementById(`sireFindings${i}`);
    const sireOpenFindingsEl = document.getElementById(`sireOpenFindings${i}`);

    if (sireTypeEl) sireTypeEl.value = vessel[`sire_type_${i}`] || '';
    if (sireStatusEl) sireStatusEl.value = vessel[`sire_status_${i}`] || '';
    if (sireFindingsEl) sireFindingsEl.value = vessel[`sire_findings_${i}`] || '';
    if (sireOpenFindingsEl) sireOpenFindingsEl.value = vessel[`sire_open_findings_${i}`] || '';
    setDateInputValue(`sireDate${i}`, vessel[`sire_date_${i}`] || '');
  }

  document.getElementById('conditionReportType').value = vessel.condition_report_type || '';
  setDateInputValue('conditionReportDate', vessel.condition_report_date || '');
  document.getElementById('conditionReportStatus').value = vessel.condition_report_status || '';
  document.getElementById('conditionReportFindings').value = vessel.condition_report_findings || '';
  document.getElementById('conditionReportOpenFindings').value = vessel.condition_report_open_findings || '';

  document.getElementById('latitude').value = vessel.latitude ?? '';
  document.getElementById('longitude').value = vessel.longitude ?? '';

  editIndex = index;
  updateVesselTypeUI();
}

window.editVessel = function (index) {
  fillFormByVessel(index);
  labelMode = 'one';
  activeLabelIndex = index;
  renderExternalLabels();
};

window.deleteVessel = async function (index) {
  const vessel = vessels[index];
  if (!vessel) return;

  const password = prompt(`삭제 비밀번호를 입력하세요\n선박명: ${vessel.name}`);
  if (password === null) return;

  const ok = await deleteSingleVessel(vessel.name, password);
  if (!ok) return;

  if (editIndex === index) {
    resetForm();
  }

  if (activeLabelIndex === index) {
    activeLabelIndex = null;
    labelMode = 'none';
  }

  await loadData({ preserveSelection: false, fitBounds: false });
};

window.openReportUpload = function (index, reportKey) {
  uploadTargetIndex = index;
  uploadTargetReportKey = reportKey;
  reportFileInput.click();
};

window.viewReportFile = function (index, reportKey) {
  const vessel = vessels[index];
  const url = getReportViewUrl(vessel, reportKey);

  if (!url) {
    alert('업로드된 파일이 없습니다.');
    return;
  }

  window.open(url, '_blank');
};

map.on('zoomend moveend resize', () => {
  renderExternalLabels();
  setTimeout(updateLeaderLines, 30);
});

window.addEventListener('resize', () => {
  renderExternalLabels();
  setTimeout(updateLeaderLines, 30);
});

window.addEventListener('focus', () => {
  loadData({ preserveSelection: true, silent: true, fitBounds: false });
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    loadData({ preserveSelection: true, silent: true, fitBounds: false });
  }
});

setInterval(() => {
  if (document.visibilityState === 'visible') {
    loadData({ preserveSelection: true, silent: true, fitBounds: false });
  }
}, 600000);

setupDateInputs();
updateVesselTypeUI();
loadData({ preserveSelection: true, fitBounds: true });