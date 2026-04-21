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
const drydockReportBtn = document.getElementById('drydockReportBtn');

const toggleAllLabelsBtn = document.getElementById('toggleAllLabelsBtn');
const filterAllBtn = document.getElementById('filterAllBtn');

const filterVlccBtn = document.getElementById('filterVlccBtn');
const filterSireProgressBtn = document.getElementById('filterSireProgressBtn');
const filterTrmt1Btn = document.getElementById('filterTrmt1Btn');
const filterTrmt2Btn = document.getElementById('filterTrmt2Btn');
const filterCmt2Btn = document.getElementById('filterCmt2Btn');
const filterSonBtn = document.getElementById('filterSonBtn');
const filterKimBtn = document.getElementById('filterKimBtn');
const filterLeeBtn = document.getElementById('filterLeeBtn');
const filterCocBtn = document.getElementById('filterCocBtn');
const filterCriticalBtn = document.getElementById('filterCriticalBtn');

const shipSearchInput = document.getElementById('shipSearchInput');
const shipSearchDropdown = document.getElementById('shipSearchDropdown');

const countAll = document.getElementById('countAll');
const countVlcc = document.getElementById('countVlcc');
const countSireProgress = document.getElementById('countSireProgress');
const countTrmt1 = document.getElementById('countTrmt1');
const countTrmt2 = document.getElementById('countTrmt2');
const countCmt2 = document.getElementById('countCmt2');
const countSon = document.getElementById('countSon');
const countKim = document.getElementById('countKim');
const countLee = document.getElementById('countLee');
const countCoc = document.getElementById('countCoc');
const countCritical = document.getElementById('countCritical');

const vesselType = document.getElementById('vesselType');
const cargoStatusWrap = document.getElementById('cargoStatusWrap');
const cocSection = document.getElementById('cocSection');

const managementCostReportBtn = document.getElementById('managementCostReportBtn');

const costReportModal = document.getElementById('costReportModal');
const costReportYear = document.getElementById('costReportYear');
const costReportRange = document.getElementById('costReportRange');
const costReportView = document.getElementById('costReportView');
const costReportConfirmBtn = document.getElementById('costReportConfirmBtn');
const costReportCancelBtn = document.getElementById('costReportCancelBtn');

const managementCostUploadBtn = document.getElementById('managementCostUploadBtn');
const managementCostExcelInput = document.getElementById('managementCostExcelInput');

const cocDynamicSection = document.getElementById('cocDynamicSection');
const addCocBtn = document.getElementById('addCocBtn');
const cocFilterProgressBtn = document.getElementById('cocFilterProgressBtn');
const cocFilterDoneBtn = document.getElementById('cocFilterDoneBtn');

const sireDynamicSection = document.getElementById('sireDynamicSection');
const addSireBtn = document.getElementById('addSireBtn');
const sireFilterProgressBtn = document.getElementById('sireFilterProgressBtn');
const sireFilterDoneBtn = document.getElementById('sireFilterDoneBtn');

const conditionDynamicSection = document.getElementById('conditionDynamicSection');
const addConditionBtn = document.getElementById('addConditionBtn');
const conditionFilterProgressBtn = document.getElementById('conditionFilterProgressBtn');
const conditionFilterDoneBtn = document.getElementById('conditionFilterDoneBtn');

const COC_COUNT = 10;
const SIRE_COUNT = 3;

let vessels = [];
let markers = [];
let nameMarkers = [];
let editIndex = null;
let labelObjects = [];

let labelMode = 'none';
let activeLabelIndex = null;
let currentFilter = 'cmt2';
let uploadTargetIndex = null;
let uploadTargetReportKey = null;
let isLoading = false;
let managementCostRequestSeq = 0;

let currentIssueFilter = '진행 중';
let currentCocFilter = '진행 중';
let currentSireFilter = '진행 중';
let currentConditionFilter = '진행 중';

const REPORT_KEYS = [
  'report1_file',
  'report2_file',
  'report3_file',
  'report4_file',
  'report5_file',
  'report6_file',
  'report7_file',
  'report8_file'
];

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

const customAlert = document.getElementById('customAlert');
const customAlertMessage = document.getElementById('customAlertMessage');
const customAlertOkBtn = document.getElementById('customAlertOkBtn');

function showCustomAlert(message) {
  if (!customAlert || !customAlertMessage) {
    alert(message);
    return;
  }
  customAlertMessage.textContent = message;
  customAlert.classList.remove('hidden');
}

function hideCustomAlert() {
  if (!customAlert) return;
  customAlert.classList.add('hidden');
}

if (customAlertOkBtn) {
  customAlertOkBtn.addEventListener('click', hideCustomAlert);
}

if (customAlert) {
  customAlert.addEventListener('click', (e) => {
    if (e.target === customAlert) {
      hideCustomAlert();
    }
  });
}

function showCostReportModal() {
  if (!costReportModal) return;

  const currentYear = String(new Date().getFullYear());
  if (costReportYear) {
    const hasOption = Array.from(costReportYear.options).some(opt => opt.value === currentYear);
    if (hasOption) {
      costReportYear.value = currentYear;
    }
  }

  if (costReportRange) costReportRange.value = '전체';
  if (costReportView) costReportView.value = '전체';

  costReportModal.classList.remove('hidden');
}

function hideCostReportModal() {
  if (!costReportModal) return;
  costReportModal.classList.add('hidden');
}

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

function bindMoneyInputs() {
  const ids = [
    'opexContractCrewAmount',
    'opexContractTechAmount',
    'opexActualCrewAmount',
    'opexActualTechAmount',
    'aorActualCrewAmount',
    'aorActualTechAmount',
    'aorUnclaimedCrewAmount',
    'aorUnclaimedTechAmount'
  ];

  ids.forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener('input', () => {
      const caretAtEnd = input.selectionStart === input.value.length;
      input.value = formatMoneyInputValue(input.value);
      if (caretAtEnd) {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });

    input.addEventListener('blur', () => {
      input.value = formatMoneyInputValue(input.value);
    });
  });
}

function formatMoneyInputValue(value) {
  const raw = String(value ?? '').replace(/[^0-9.]/g, '').trim();
  if (!raw) return '';

  const parts = raw.split('.');
  const intPart = parts[0] || '0';
  const decimalPart = parts.length > 1 ? `.${parts[1]}` : '';

  const withComma = Number(intPart).toLocaleString('en-US');
  return `$ ${withComma}${decimalPart}`;
}

function formatUsd(value) {
  const num = Number(value || 0);
  return '$ ' + num.toLocaleString();
}

function getTechAorDisplayData(vessel) {
  const claimedCount = Number(vessel.mc_aor_actual_tech_count || 0);
  const claimedAmount = Number(vessel.mc_aor_actual_tech_amount || 0);

  const unclaimedCount = Number(vessel.mc_aor_unclaimed_tech_count || 0);
  const unclaimedAmount = Number(vessel.mc_aor_unclaimed_tech_amount || 0);

  return {
    claimedCount,
    claimedAmount,
    unclaimedCount,
    unclaimedAmount
  };
}

function normalizeMoneyForSave(value) {
  return String(value ?? '').replace(/\$/g, '').replace(/,/g, '').trim();
}

function normalizeBinaryStatus(value) {
  return String(value || '').trim() === '완료' ? '완료' : '진행 중';
}

function getSireLikeBucket(status) {
  return String(status || '').trim() === '수검완료' ? '완료' : '진행 중';
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

function getIssueItemsForSave() {
  const issueCards = Array.from(document.querySelectorAll('.issue-card.issue-only-card'));

  return issueCards.map((card, idx) => {
    const textEl = card.querySelector('.issue-text');
    const criticalEl = card.querySelector('.issue-critical');
    const progressBtn = card.querySelector('.issue-status-btn[data-status="진행 중"]');
    const doneBtn = card.querySelector('.issue-status-btn[data-status="완료"]');

    const text = textEl ? textEl.value.trim() : '';
    const isCritical = criticalEl ? criticalEl.checked : false;

    let issueStatus = '진행 중';
    if (doneBtn && doneBtn.classList.contains('active-done')) {
      issueStatus = '완료';
    } else if (progressBtn && progressBtn.classList.contains('active-progress')) {
      issueStatus = '진행 중';
    }

    return {
      issueText: text,
      isCritical: isCritical,
      issueStatus: issueStatus,
      sortOrder: idx + 1
    };
  }).filter(item => item.issueText);
}

function getCocItemsForSave() {
  const cards = Array.from(document.querySelectorAll('.coc-card'));

  return cards.map((card, idx) => {
    const cocType = card.querySelector('.coc-type')?.value.trim() || '';
    const cocSummary = card.querySelector('.coc-summary')?.value.trim() || '';
    const cocDueDate = card.querySelector('.coc-due-date')?.value || '';

    const progressBtn = card.querySelector('.coc-status-btn[data-status="진행 중"]');
    const doneBtn = card.querySelector('.coc-status-btn[data-status="완료"]');

    let itemStatus = '진행 중';
    if (doneBtn?.classList.contains('active-done')) itemStatus = '완료';
    if (progressBtn?.classList.contains('active-progress')) itemStatus = '진행 중';

    return {
      cocType,
      cocSummary,
      cocDueDate,
      itemStatus,
      sortOrder: idx + 1
    };
  }).filter(item => item.cocType || item.cocSummary || item.cocDueDate);
}

function getSireItemsForSave() {
  const cards = Array.from(document.querySelectorAll('.sire-card'));

  return cards.map((card, idx) => {
    const sireType = card.querySelector('.sire-type')?.value.trim() || '';
    const sireDate = card.querySelector('.sire-date')?.value || '';
    const sireStatus = card.querySelector('.sire-status-select')?.value || '예정';
    const sireFindings = card.querySelector('.sire-findings')?.value.trim() || '';
    const sireOpenFindings = card.querySelector('.sire-open-findings')?.value.trim() || '';
    const sireRemark = card.querySelector('.sire-remark')?.value.trim() || '';

    return {
      sireType,
      sireDate,
      sireStatus,
      sireFindings,
      sireOpenFindings,
      sireRemark,
      sortOrder: idx + 1
    };
  }).filter(item =>
    item.sireType || item.sireDate || item.sireStatus || item.sireFindings || item.sireOpenFindings || item.sireRemark
  );
}

function getConditionItemsForSave() {
  const cards = Array.from(document.querySelectorAll('.condition-card'));

  return cards.map((card, idx) => {
    const conditionType = card.querySelector('.condition-type')?.value.trim() || '';
    const conditionDate = card.querySelector('.condition-date')?.value || '';
    const conditionStatus = card.querySelector('.condition-status-select')?.value || '예정';
    const conditionFindings = card.querySelector('.condition-findings')?.value.trim() || '';
    const conditionOpenFindings = card.querySelector('.condition-open-findings')?.value.trim() || '';
    const conditionRemark = card.querySelector('.condition-remark')?.value.trim() || '';

    return {
      conditionType,
      conditionDate,
      conditionStatus,
      conditionFindings,
      conditionOpenFindings,
      conditionRemark,
      sortOrder: idx + 1
    };
  }).filter(item =>
    item.conditionType || item.conditionDate || item.conditionStatus ||
    item.conditionFindings || item.conditionOpenFindings || item.conditionRemark
  );
}

function setupDateInputs() {
  document.querySelectorAll('[data-date-input]').forEach((input) => {
    if (input.dataset.dateBound === '1') {
      return;
    }

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

    input.dataset.dateBound = '1';
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

  const sireSectionWrap = document.getElementById('sireSectionWrap');

  if (type === 'Container') {
    cargoStatusWrap?.classList.add('hidden-block');
    sireSectionWrap?.classList.add('hidden-block');
  } else {
    cargoStatusWrap?.classList.remove('hidden-block');
    sireSectionWrap?.classList.remove('hidden-block');
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
  if (Array.isArray(vessel.issue_items) && vessel.issue_items.length) {
    return vessel.issue_items.some(item => {
      const text = String(item.issue_text || item.issueText || '').trim();
      const critical = Number(item.is_critical ?? item.isCritical ?? 0) === 1 || item.is_critical === true;
      return text && critical;
    });
  }

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

function getLegacyCocItemsFromVessel(vessel) {
  const items = [];
  for (let i = 1; i <= COC_COUNT; i++) {
    const cocType = String(vessel[`coc_type_${i}`] || '').trim();
    const cocSummary = String(vessel[`coc_summary_${i}`] || '').trim();
    const cocDueDate = String(vessel[`coc_due_date_${i}`] || '').trim();

    if (cocType || cocSummary || cocDueDate) {
      items.push({
        coc_type: cocType,
        coc_summary: cocSummary,
        coc_due_date: cocDueDate,
        item_status: '진행 중',
        sort_order: i
      });
    }
  }
  return items;
}

function getLegacySireItemsFromVessel(vessel) {
  const items = [];
  for (let i = 1; i <= 5; i++) {
    const sireType = String(vessel[`sire_type_${i}`] || '').trim();
    const sireDate = String(vessel[`sire_date_${i}`] || '').trim();
    const sireStatus = String(vessel[`sire_status_${i}`] || '').trim();
    const sireFindings = String(vessel[`sire_findings_${i}`] || '').trim();
    const sireOpenFindings = String(vessel[`sire_open_findings_${i}`] || '').trim();
    const sireRemark = String(vessel[`sire_remark_${i}`] || '').trim();

    if (sireType || sireDate || sireStatus || sireFindings || sireOpenFindings || sireRemark) {
      items.push({
        sire_type: sireType,
        sire_date: sireDate,
        sire_status: sireStatus || '예정',
        sire_findings: sireFindings,
        sire_open_findings: sireOpenFindings,
        sire_remark: sireRemark,
        sort_order: i
      });
    }
  }
  return items;
}

function getLegacyConditionItemsFromVessel(vessel) {
  const type = String(vessel.condition_report_type || '').trim();
  const date = String(vessel.condition_report_date || '').trim();
  const status = String(vessel.condition_report_status || '').trim();
  const findings = String(vessel.condition_report_findings || '').trim();
  const openFindings = String(vessel.condition_report_open_findings || '').trim();
  const remark = String(vessel.condition_report_remark || '').trim();

  if (!type && !date && !status && !findings && !openFindings && !remark) {
    return [];
  }

  return [{
    condition_type: type,
    condition_date: date,
    condition_status: status || '예정',
    condition_findings: findings,
    condition_open_findings: openFindings,
    condition_remark: remark,
    sort_order: 1
  }];
}

function hasAnyCoc(vessel) {
  if (Array.isArray(vessel.coc_items) && vessel.coc_items.length) {
    return vessel.coc_items.some(item => {
      const status = normalizeBinaryStatus(item.item_status);
      if (status !== '진행 중') return false;
      return isCocDueWithin1Month(item.coc_due_date);
    });
  }

  for (let i = 1; i <= COC_COUNT; i++) {
    if (isCocDueWithin1Month(vessel[`coc_due_date_${i}`])) {
      return true;
    }
  }
  return false;
}

function hasSireInProgress(vessel) {
  if (Array.isArray(vessel.sire_items) && vessel.sire_items.length) {
    return vessel.sire_items.some(item => String(item.sire_status || '').trim() === '결함조치 중');
  }

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
  if (!Array.isArray(vessel.issue_items)) return '';

  const sortedItems = [...vessel.issue_items].sort((a, b) => {
    const aOrder = Number(a.sort_order ?? a.sortOrder ?? 9999);
    const bOrder = Number(b.sort_order ?? b.sortOrder ?? 9999);
    return aOrder - bOrder;
  });

  return sortedItems
    .filter(item => String(item.issue_status || item.issueStatus || '').trim() === '진행 중')
    .map((item, idx) => {
      const value = String(item.issue_text || item.issueText || '').trim();
      const isCritical = Number(item.is_critical ?? item.isCritical ?? 0) === 1 || item.is_critical === true;

      if (!value) return '';

      return `
        <div class="line issue-line">
          <div class="line-label">${idx + 1}</div>
          <div class="line-value ${isCritical ? 'map-value-red' : ''}">
            ${escapeHtml(value)}
          </div>
        </div>
      `;
    })
    .join('');
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



function surveyDisplayValue(value) {
  const text = String(value ?? '').trim();
  return text ? escapeHtml(text) : '-';
}



function makeSurveyInlineTable(items, options) {
  const {
    kindKey,
    statusKey,
    dateKey,
    findingsKey,
    openFindingsKey,
    remarkKey
  } = options;

  if (!items.length) return '';

  return items.map((item) => {
    const statusText = String(item[statusKey] || '').trim();
    const statusHtml = statusText ? getSireStatusHtml(statusText) : '-';

    const findingsText = String(item[findingsKey] || '').trim()
      ? `지적 ${escapeHtml(item[findingsKey])}건`
      : '-';

    const openFindingsText = String(item[openFindingsKey] || '').trim()
      ? `잔여 ${escapeHtml(item[openFindingsKey])}건`
      : '-';

    const remarkText = String(item[remarkKey] || '').trim();

    return `
      <div class="survey-inline-block">
        <div class="survey-inline-main-row">
          <div class="survey-inline-main-cell">${surveyDisplayValue(item[kindKey])}</div>
          <div class="survey-inline-main-cell">${statusHtml}</div>
          <div class="survey-inline-main-cell">${surveyDisplayValue(item[dateKey])}</div>
          <div class="survey-inline-main-cell">${findingsText}</div>
          <div class="survey-inline-main-cell">${openFindingsText}</div>
        </div>

        ${remarkText ? `
          <div class="survey-inline-remark-row">
            <div class="survey-inline-remark-label">특이사항</div>
            <div class="survey-inline-remark-value">${escapeHtml(remarkText)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}


function makeCocLines(vessel) {
  let items = [];

  if (Array.isArray(vessel.coc_items) && vessel.coc_items.length) {
    items = [...vessel.coc_items]
      .sort((a, b) => {
        const aOrder = Number(a.sort_order ?? a.sortOrder ?? 9999);
        const bOrder = Number(b.sort_order ?? b.sortOrder ?? 9999);
        return aOrder - bOrder;
      })
      .filter(item => normalizeBinaryStatus(item.item_status) === '진행 중');
  } else {
    items = getLegacyCocItemsFromVessel(vessel);
  }

  return items.map((item, idx) => {
    const summaryText = String(item.coc_summary || '').trim();

    return `
      <div class="coc-inline-block">
        <div class="coc-inline-top-row">
          <div class="coc-inline-no">${idx + 1}</div>
          <div class="coc-inline-type">${item.coc_type ? escapeHtml(item.coc_type) : '-'}</div>
          <div class="coc-inline-date">${item.coc_due_date ? escapeHtml(item.coc_due_date) : '-'}</div>
        </div>

        ${summaryText ? `
          <div class="coc-inline-summary-row">
            <div class="coc-inline-summary-no"></div>
            <div class="coc-inline-summary-text">${escapeHtml(summaryText)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}
function makeSireLines(vessel) {
  let items = [];

  if (Array.isArray(vessel.sire_items) && vessel.sire_items.length) {
    items = [...vessel.sire_items]
      .sort((a, b) => {
        const aOrder = Number(a.sort_order ?? a.sortOrder ?? 9999);
        const bOrder = Number(b.sort_order ?? b.sortOrder ?? 9999);
        return aOrder - bOrder;
      })
      .filter(item => getSireLikeBucket(item.sire_status) === '진행 중');
  } else {
    items = getLegacySireItemsFromVessel(vessel)
      .filter(item => getSireLikeBucket(item.sire_status) === '진행 중');
  }

  return items.map((item) => {
    const statusText = String(item.sire_status || '').trim();
    const statusHtml = statusText ? getSireStatusHtml(statusText) : '-';

    const findingsRaw = String(item.sire_findings || '').trim();
    const openFindingsRaw = String(item.sire_open_findings || '').trim();
    const remarkText = String(item.sire_remark || '').trim();

    const findingsText = findingsRaw ? `지적 ${escapeHtml(findingsRaw)}건` : '';
    const openFindingsText = openFindingsRaw ? `잔여 ${escapeHtml(openFindingsRaw)}건` : '';

    return `
      <div class="survey-inline-block">
        <div class="survey-inline-main-row">
          <div class="survey-inline-main-cell">${surveyDisplayValue(item.sire_type)}</div>
          <div class="survey-inline-main-cell">${statusHtml}</div>
          <div class="survey-inline-main-cell">${surveyDisplayValue(item.sire_date)}</div>
          <div class="survey-inline-main-cell">${findingsText}</div>
          <div class="survey-inline-main-cell">${openFindingsText}</div>
        </div>

        ${remarkText ? `
          <div class="survey-inline-remark-row-sire">
            <div class="survey-inline-remark-spacer"></div>
            <div class="survey-inline-remark-value survey-inline-remark-value-sire">
              ${escapeHtml(remarkText)}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}


function makeConditionReportLines(vessel) {
  let items = [];

  if (Array.isArray(vessel.condition_items) && vessel.condition_items.length) {
    items = [...vessel.condition_items]
      .sort((a, b) => {
        const aOrder = Number(a.sort_order ?? a.sortOrder ?? 9999);
        const bOrder = Number(b.sort_order ?? b.sortOrder ?? 9999);
        return aOrder - bOrder;
      })
      .filter(item => getSireLikeBucket(item.condition_status) === '진행 중');
  } else {
    items = getLegacyConditionItemsFromVessel(vessel)
      .filter(item => getSireLikeBucket(item.condition_status) === '진행 중');
  }

  return items.map((item) => {
    const statusText = String(item.condition_status || '').trim();
    const statusHtml = statusText ? getSireStatusHtml(statusText) : '-';

    const findingsRaw = String(item.condition_findings || '').trim();
    const openFindingsRaw = String(item.condition_open_findings || '').trim();
    const remarkText = String(item.condition_remark || '').trim();

    const findingsText = findingsRaw ? `지적 ${escapeHtml(findingsRaw)}건` : '';
    const openFindingsText = openFindingsRaw ? `잔여 ${escapeHtml(openFindingsRaw)}건` : '';

    return `
      <div class="survey-inline-block">
        <div class="survey-inline-main-row">
          <div class="survey-inline-main-cell">${surveyDisplayValue(item.condition_type)}</div>
          <div class="survey-inline-main-cell">${statusHtml}</div>
          <div class="survey-inline-main-cell">${surveyDisplayValue(item.condition_date)}</div>
          <div class="survey-inline-main-cell">${findingsText}</div>
          <div class="survey-inline-main-cell">${openFindingsText}</div>
        </div>

        ${remarkText ? `
          <div class="survey-inline-remark-row-condition">
            <div class="survey-inline-remark-spacer"></div>
            <div class="survey-inline-remark-value survey-inline-remark-value-condition">
              ${escapeHtml(remarkText)}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function getVesselColor(vessel) {
  const type = normalizeVesselType(vessel.vessel_type);

  if (type === 'Container') {
    return 'green';
  }

  const cargo = normalizeCargoStatus(vessel.cargo_status);

  if (cargo === 'Loading') return 'orange';
  if (cargo === 'Ballast') return 'yellow';

  return 'gray';
}

function getShipIcon(vessel) {
  const colorType = getVesselColor(vessel);

  const fill = colorType === 'green'
    ? '#22c55e'
    : colorType === 'orange'
      ? '#f97316'
      : colorType === 'yellow'
        ? '#facc15'
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
  if (currentFilter === 'vlcc') {
    return vessels.filter(v => String(v.size || '').trim().toUpperCase() === 'VLCC');
  }

  if (currentFilter === 'sireprogress') {
    return vessels.filter(v => hasSireInProgress(v));
  }

  if (currentFilter === 'trmt1') {
    return vessels.filter(v => String(v.team_name || v.teamName || '').trim() === 'TRMT1');
  }

  if (currentFilter === 'trmt2') {
    return vessels.filter(v => String(v.team_name || v.teamName || '').trim() === 'TRMT2');
  }

  if (currentFilter === 'cmt2') {
    return vessels.filter(v => String(v.team_name || v.teamName || '').trim() === 'TRMT3 & CMT2');
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
      ${makeSingleReportRow(index, vessel, 'report5_file', 'Q88 / Particular')}
      ${makeSingleReportRow(index, vessel, 'report6_file', 'Sire / PSC Report')}
      ${makeSingleReportRow(index, vessel, 'report7_file', 'SMA')}
      ${makeSingleReportRow(index, vessel, 'report8_file', '조직도')}
    </div>
  `;
}



function makeLabelHtml(vessel, index) {
  const cls = getVesselColor(vessel);
  const type = normalizeVesselType(vessel.vessel_type);
  const techAor = getTechAorDisplayData(vessel);

  return `
    <div class="map-label ${cls}" data-index="${index}">
      <div class="title">${escapeHtml(vessel.name)}</div>

      <div class="map-card-section">
        <div class="map-card-section-title">기본정보</div>
        <div class="map-card-section-body">
          ${makeOptionalLine('관리사', vessel.management_company)}
          ${makeOptionalLine('관리사감독', vessel.management_supervisor)}
          ${makeOptionalLine('운항담당자', vessel.operation_manager)}
          ${makeOptionalLine('선주감독', vessel.owner_supervisor)}
          ${makeOptionalLine('담당팀', vessel.team_name || vessel.teamName)}
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
      </div>

      <div class="map-card-section">
        <div class="map-card-section-title">현안업무</div>
        <div class="map-card-section-body">
          ${makeIssueLines(vessel) || `<div class="issue-empty">입력 없음</div>`}
        </div>
      </div>

      <div class="map-card-section">
        <div class="map-card-section-title">COC 현황</div>
        <div class="map-card-section-body">
          ${makeCocLines(vessel) || `<div class="issue-empty">입력 없음</div>`}
        </div>
      </div>

      ${type === 'Tanker' ? `
      <div class="map-card-section">
        <div class="map-card-section-title">Sire 현황</div>
        <div class="map-card-section-body">
          ${makeSireLines(vessel) || `<div class="issue-empty">입력 없음</div>`}
        </div>
      </div>
      ` : ''}

      <div class="map-card-section">
        <div class="map-card-section-title">Condition Report</div>
        <div class="map-card-section-body">
          ${makeConditionReportLines(vessel) || `<div class="issue-empty">입력 없음</div>`}
        </div>
      </div>

      <div class="map-card-section">
        <div class="map-card-section-title">Tech AOR 현황</div>
        <div class="map-card-section-body">
          <div class="aor-summary-row">
            <div class="aor-summary-label">AOR 비용 청구</div>
            <div class="aor-summary-count">${techAor.claimedCount}건</div>
            <div class="aor-summary-amount">${formatUsd(techAor.claimedAmount)}</div>
          </div>

          <div class="aor-summary-row">
            <div class="aor-summary-label">AOR 비용 미청구</div>
            <div class="aor-summary-count">${techAor.unclaimedCount}건</div>
            <div class="aor-summary-amount">${formatUsd(techAor.unclaimedAmount)}</div>
          </div>
        </div>
      </div>

      <div class="map-card-section">
        <div class="map-card-section-title">Reports</div>
        <div class="map-card-section-body">
          ${makeReportsBlock(index, vessel)}
        </div>
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
  resetForm();
}

function updateToolbarButtons() {
  const buttonMap = {
    all: filterAllBtn,
    vlcc: filterVlccBtn,
    sireprogress: filterSireProgressBtn,
    trmt1: filterTrmt1Btn,
    trmt2: filterTrmt2Btn,
    cmt2: filterCmt2Btn,
    son: filterSonBtn,
    kim: filterKimBtn,
    lee: filterLeeBtn,
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

  if (countVlcc) {
    countVlcc.textContent = `${vessels.filter(v =>
      String(v.size || '').trim().toUpperCase() === 'VLCC'
    ).length}척`;
  }

  if (countSireProgress) {
    countSireProgress.textContent = `${vessels.filter(v => hasSireInProgress(v)).length}척`;
  }

  if (countTrmt1) {
    countTrmt1.textContent = `${vessels.filter(v =>
      String(v.team_name || v.teamName || '').trim() === 'TRMT1'
    ).length}척`;
  }

  if (countTrmt2) {
    countTrmt2.textContent = `${vessels.filter(v =>
      String(v.team_name || v.teamName || '').trim() === 'TRMT2'
    ).length}척`;
  }

  if (countCmt2) {
    countCmt2.textContent = `${vessels.filter(v =>
      String(v.team_name || v.teamName || '').trim() === 'TRMT3 & CMT2'
    ).length}척`;
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
        vessel_type: normalizeVesselType(v.vessel_type || v.vesselType || 'Tanker'),
        voyage_plan: v.voyage_plan || v.voyagePlan || '',
        cargo_status: (v.vessel_type || v.vesselType) === 'Container' ? '' : normalizeCargoStatus(v.cargo_status),
        team_name: v.team_name || v.teamName || '',
        issue_items: Array.isArray(v.issue_items) ? v.issue_items : [],
        coc_items: Array.isArray(v.coc_items) ? v.coc_items : [],
        sire_items: Array.isArray(v.sire_items) ? v.sire_items : [],
        condition_items: Array.isArray(v.condition_items) ? v.condition_items : []
      };

      for (let i = 1; i <= 8; i++) {
        normalized[`report${i}_file`] = normalized[`report${i}_file`] || '';
      }

      for (let i = 1; i <= COC_COUNT; i++) {
        normalized[`coc_type_${i}`] = normalized[`coc_type_${i}`] || '';
        normalized[`coc_summary_${i}`] = normalized[`coc_summary_${i}`] || '';
        normalized[`coc_due_date_${i}`] = normalized[`coc_due_date_${i}`] || '';
      }

      for (let i = 1; i <= 5; i++) {
        normalized[`sire_type_${i}`] = normalized[`sire_type_${i}`] || '';
        normalized[`sire_date_${i}`] = normalized[`sire_date_${i}`] || '';
        normalized[`sire_status_${i}`] = normalizeSireStatus(normalized[`sire_status_${i}`] || '');
        normalized[`sire_findings_${i}`] = normalized[`sire_findings_${i}`] || '';
        normalized[`sire_open_findings_${i}`] = normalized[`sire_open_findings_${i}`] || '';
        normalized[`sire_remark_${i}`] = normalized[`sire_remark_${i}`] || '';
      }

      normalized.condition_report_type = normalized.condition_report_type || '';
      normalized.condition_report_date = normalized.condition_report_date || '';
      normalized.condition_report_status = normalizeSireStatus(normalized.condition_report_status || '');
      normalized.condition_report_findings = normalized.condition_report_findings || '';
      normalized.condition_report_open_findings = normalized.condition_report_open_findings || '';
      normalized.condition_report_remark = normalized.condition_report_remark || '';

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

function initAccordion() {
  const sections = document.querySelectorAll('.accordion-section');

  sections.forEach((section) => {
    const toggle = section.querySelector('.accordion-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const willOpen = !section.classList.contains('open');
      section.classList.toggle('open');

      if (willOpen) {
        ensureAutoBlankCardOnOpen(section);
      }
    });
  });
}


function isCardActuallyVisible(card) {
  if (!card) return false;
  if (card.classList.contains('hidden-by-filter')) return false;
  return getComputedStyle(card).display !== 'none';
}

function ensureAutoBlankCardOnOpen(section) {
  if (!section) return;

  if (section.querySelector('#issueSection')) {
    const visibleCards = Array.from(section.querySelectorAll('.issue-card.issue-only-card'))
      .filter(isCardActuallyVisible);

    if (visibleCards.length === 0) {
      addIssueCard(currentIssueFilter);
    }
    return;
  }

  if (section.querySelector('#cocDynamicSection')) {
    const visibleCards = Array.from(section.querySelectorAll('.coc-card'))
      .filter(isCardActuallyVisible);

    if (visibleCards.length === 0) {
      addCocCard(currentCocFilter);
    }
    return;
  }

  if (section.querySelector('#sireDynamicSection')) {
    const visibleCards = Array.from(section.querySelectorAll('.sire-card'))
      .filter(isCardActuallyVisible);

    if (visibleCards.length === 0) {
      addSireCard(currentSireFilter);
    }
    return;
  }

  if (section.querySelector('#conditionDynamicSection')) {
    const visibleCards = Array.from(section.querySelectorAll('.condition-card'))
      .filter(isCardActuallyVisible);

    if (visibleCards.length === 0) {
      addConditionCard(currentConditionFilter);
    }
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
      showCustomAlert(result.message || '위치 업데이트에 실패했습니다.');
      return;
    }

    await loadData({ preserveSelection: true, fitBounds: false });

    const successCount = result.updatedCount || 0;
    const failedList = result.notUpdatedVessels || [];
    const failedCount = failedList.length;

    let message = '';
    message += `업데이트 완료 : ${successCount}척\n`;
    message += `업데이트 실패 : ${failedCount}척\n`;

    if (failedCount > 0) {
      message += `\n업데이트 실패 선박 List\n`;
      message += failedList.join('\n');
    }

    showCustomAlert(message);
  } catch (error) {
    console.error('위치 업데이트 실패:', error);
    showCustomAlert('위치 업데이트 중 오류가 발생했습니다.');
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
  labelLayer.classList.remove('mobile-fullscreen-active');
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
    clearLabels();
    resetForm();
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


function isMobileFullscreenLabel() {
  return window.innerWidth <= 1100;
}

function createEdgeLabel(item, left, top, width, height, side) {
  const box = document.createElement('div');
  box.innerHTML = makeLabelHtml(item.vessel, item.index);

  const label = box.firstElementChild;

  if (side === 'mobile') {
    label.classList.add('mobile-fullscreen');
    label.style.left = '0px';
    label.style.top = '0px';
    label.style.width = `${mapWrap.clientWidth}px`;
    label.style.height = `${mapWrap.clientHeight}px`;
    labelLayer.classList.add('mobile-fullscreen-active');
    labelLayer.appendChild(label);

    labelObjects.push({
      label,
      line: null,
      item,
      side
    });
    return;
  }

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
  } else if (side === 'center') {
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const dx = fromX - centerX;
    const dy = fromY - centerY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        toX = left;
        toY = centerY;
      } else {
        toX = left + width;
        toY = centerY;
      }
    } else {
      if (dy < 0) {
        toX = centerX;
        toY = top;
      } else {
        toX = centerX;
        toY = top + height;
      }
    }
  }

  drawLeader(line, fromX, fromY, toX, toY);

  labelObjects.push({
    label,
    line,
    item,
    side
  });
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
      const point = map.latLngToContainerPoint([vessel.latitude, vessel.longitude]);
      renderTargets = [{ vessel, index: activeLabelIndex, point }];
    }
  } else {
    const currentlyVisible = getCurrentlyVisibleTargetVessels();
    renderTargets = currentlyVisible.map(vessel => ({
      vessel,
      index: vessels.findIndex(v => v === vessel),
      point: map.latLngToContainerPoint([vessel.latitude, vessel.longitude])
    }));
  }

  if (!renderTargets.length) return;

  const boxW = 450;
  const boxH = 600;
  const gap = 10;

  /* 단일 선택일 때는 알림판을 화면 중앙 쪽에 두고 리드선 유지 */
if (labelMode === 'one' && renderTargets.length === 1) {
  const item = renderTargets[0];

  if (isMobileFullscreenLabel()) {
    createEdgeLabel(item, 0, 0, wrapWidth, wrapHeight, 'mobile');
    return;
  }

  const left = Math.max(16, Math.round((wrapWidth - boxW) / 2));

  const topMin = 60;          // 최소 상단 여백
  const bottomMargin = 30;    // 하단 여백, 이 값을 늘리면 더 위로 올라감

  const desiredTop = Math.round((wrapHeight - boxH) * 0.20);
  const maxTop = Math.max(topMin, wrapHeight - boxH - bottomMargin);
  const top = Math.min(Math.max(topMin, desiredTop), maxTop);

  createEdgeLabel(item, left, top, boxW, boxH, 'center');
  return;
}
  const topItems = [];
  const bottomItems = [];
  const leftItems = [];
  const rightItems = [];

  const centerX = wrapWidth / 2;
  const centerY = wrapHeight / 2;

  renderTargets.forEach((item) => {
    const dx = item.point.x - centerX;
    const dy = item.point.y - centerY;

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
    } else if (obj.side === 'center') {
      const centerX = left + width / 2;
      const centerY = top + height / 2;
      const dx = point.x - centerX;
      const dy = point.y - centerY;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) {
          toX = left;
          toY = centerY;
        } else {
          toX = left + width;
          toY = centerY;
        }
      } else {
        if (dy < 0) {
          toX = centerX;
          toY = top;
        } else {
          toX = centerX;
          toY = top + height;
        }
      }
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
      <small>Team: ${escapeHtml(vessel.team_name || vessel.teamName || '')}</small>
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

  document.getElementById('vesselName').value = '';
  document.getElementById('vesselType').value = 'Tanker';
  document.getElementById('managementCompany').value = '';
  document.getElementById('managementSupervisor').value = '';
  document.getElementById('operationManager').value = '';
  document.getElementById('ownerSupervisor').value = '';
  document.getElementById('teamName').value = '';
  document.getElementById('builder').value = '';
  document.getElementById('size').value = '';
  document.getElementById('voyagePlan').value = '';
  document.getElementById('cargoStatus').value = 'Loading';
  document.getElementById('latitude').value = '';
  document.getElementById('longitude').value = '';

  setDateInputValue('deliveryDate', '');
  setDateInputValue('nextDryDock', '');

  const issueSection = document.getElementById('issueSection');
  if (issueSection) issueSection.innerHTML = '';

  if (cocDynamicSection) cocDynamicSection.innerHTML = '';
  if (sireDynamicSection) sireDynamicSection.innerHTML = '';
  if (conditionDynamicSection) conditionDynamicSection.innerHTML = '';

  managementCostRequestSeq += 1;
  resetManagementCostFields(false);

  editIndex = null;
  activeLabelIndex = null;
  labelMode = 'none';

  uploadTargetIndex = null;
  uploadTargetReportKey = null;

  if (shipSearchInput) {
    shipSearchInput.value = '';
  }

  if (shipSearchDropdown) {
    shipSearchDropdown.innerHTML = '';
    shipSearchDropdown.classList.remove('show');
  }

  currentIssueFilter = '진행 중';
  currentCocFilter = '진행 중';
  currentSireFilter = '진행 중';
  currentConditionFilter = '진행 중';

  applyIssueFilter(currentIssueFilter);
  applyCocFilter(currentCocFilter);
  applySireFilter(currentSireFilter);
  applyConditionFilter(currentConditionFilter);

  clearLabels();
  updateToggleAllLabelsButton();
  updateVesselTypeUI();
  renderExternalLabels();
}

function resetManagementCostFields(keepYear = true) {
  const currentYear = document.getElementById('opexContractYear')?.value || '';

  document.getElementById('opexContractCrewAmount').value = '';
  document.getElementById('opexContractTechAmount').value = '';

  document.getElementById('opexActualCrewCount').value = '';
  document.getElementById('opexActualCrewAmount').value = '';
  document.getElementById('opexActualTechCount').value = '';
  document.getElementById('opexActualTechAmount').value = '';

  document.getElementById('aorActualCrewCount').value = '';
  document.getElementById('aorActualCrewAmount').value = '';
  document.getElementById('aorActualTechCount').value = '';
  document.getElementById('aorActualTechAmount').value = '';

  document.getElementById('aorUnclaimedCrewCount').value = '';
  document.getElementById('aorUnclaimedCrewAmount').value = '';
  document.getElementById('aorUnclaimedTechCount').value = '';
  document.getElementById('aorUnclaimedTechAmount').value = '';

  document.getElementById('costRemark').value = '';

  if (keepYear) {
    document.getElementById('opexContractYear').value = currentYear;
  }
}

function fillManagementCostFields(cost = {}) {
  document.getElementById('opexContractCrewAmount').value = formatMoneyInputValue(cost.opex_contract_crew_amount || '');
  document.getElementById('opexContractTechAmount').value = formatMoneyInputValue(cost.opex_contract_tech_amount || '');

  document.getElementById('opexActualCrewCount').value = cost.opex_actual_crew_count || '';
  document.getElementById('opexActualCrewAmount').value = formatMoneyInputValue(cost.opex_actual_crew_amount || '');
  document.getElementById('opexActualTechCount').value = cost.opex_actual_tech_count || '';
  document.getElementById('opexActualTechAmount').value = formatMoneyInputValue(cost.opex_actual_tech_amount || '');

  document.getElementById('aorActualCrewCount').value = cost.aor_actual_crew_count || '';
  document.getElementById('aorActualCrewAmount').value = formatMoneyInputValue(cost.aor_actual_crew_amount || '');
  document.getElementById('aorActualTechCount').value = cost.aor_actual_tech_count || '';
  document.getElementById('aorActualTechAmount').value = formatMoneyInputValue(cost.aor_actual_tech_amount || '');

  document.getElementById('aorUnclaimedCrewCount').value = cost.aor_unclaimed_crew_count || '';
  document.getElementById('aorUnclaimedCrewAmount').value = formatMoneyInputValue(cost.aor_unclaimed_crew_amount || '');
  document.getElementById('aorUnclaimedTechCount').value = cost.aor_unclaimed_tech_count || '';
  document.getElementById('aorUnclaimedTechAmount').value = formatMoneyInputValue(cost.aor_unclaimed_tech_amount || '');

  document.getElementById('costRemark').value = cost.cost_remark || '';
}

async function loadManagementCostByYear() {
  const yearEl = document.getElementById('opexContractYear');
  const vesselNameEl = document.getElementById('vesselName');

  if (!yearEl || !vesselNameEl) return;

  const year = yearEl.value.trim();
  const vesselName = vesselNameEl.value.trim();

  const requestSeq = ++managementCostRequestSeq;

  resetManagementCostFields(true);

  if (!year || !vesselName) return;

  try {
    const response = await fetch(
      `/api/vessel/cost?name=${encodeURIComponent(vesselName)}&year=${encodeURIComponent(year)}&_=${Date.now()}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }
    );

    const result = await response.json();

    if (requestSeq !== managementCostRequestSeq) {
      return;
    }

    const currentYear = document.getElementById('opexContractYear')?.value.trim() || '';
    const currentVesselName = document.getElementById('vesselName')?.value.trim() || '';

    if (currentYear !== year || currentVesselName !== vesselName) {
      return;
    }

    if (!response.ok || !result.success) {
      return;
    }

    fillManagementCostFields(result.data || {});
  } catch (error) {
    if (requestSeq !== managementCostRequestSeq) {
      return;
    }
    console.error('관리사 비용 조회 실패:', error);
  }
}

const opexContractYear = document.getElementById('opexContractYear');

if (opexContractYear) {
  opexContractYear.addEventListener('change', () => {
    loadManagementCostByYear();
  });
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

  fillFormByVessel(index);
  map.setView([vessel.latitude, vessel.longitude], 5.5);
  labelMode = 'one';
  activeLabelIndex = index;

  setTimeout(() => {
    renderExternalLabels();
    updateLeaderLines();
  }, 150);
}

function renderSearchSuggestions(keyword) {
  if (!shipSearchDropdown) return;

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

async function uploadManagementCostExcel(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`/api/upload-management-costs?_=${Date.now()}`, {
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
      alert(result.message || '관리사 비용 업로드에 실패했습니다.');
      return;
    }

    const updated = result.updated_count || 0;
    const failed = result.failed_count || 0;
    const failedList = result.failed_vessels || [];

    let msg = `관리사 비용 업로드 완료\n\n업데이트 성공 : ${updated}척\n업데이트 실패 : ${failed}척`;

    if (failedList.length) {
      msg += `\n\n실패 선박 List\n[${failedList.join(', ')}]`;
    }

    alert(msg);
    await loadData({ preserveSelection: true, fitBounds: false });
  } catch (error) {
    console.error(error);
    alert('관리사 비용 업로드 중 오류가 발생했습니다.');
  }
}

function getIssueCardStatus(card) {
  const doneBtn = card.querySelector('.issue-status-btn[data-status="완료"]');
  if (doneBtn?.classList.contains('active-done')) {
    return '완료';
  }
  return '진행 중';
}

function applyIssueFilter(filterStatus = currentIssueFilter) {
  currentIssueFilter = filterStatus;

  const issueFilterProgressBtn = document.getElementById('issueFilterProgressBtn');
  const issueFilterDoneBtn = document.getElementById('issueFilterDoneBtn');

  if (issueFilterProgressBtn) {
    issueFilterProgressBtn.classList.remove('active-progress', 'active-done');
    if (currentIssueFilter === '진행 중') {
      issueFilterProgressBtn.classList.add('active-progress');
    }
  }

  if (issueFilterDoneBtn) {
    issueFilterDoneBtn.classList.remove('active-progress', 'active-done');
    if (currentIssueFilter === '완료') {
      issueFilterDoneBtn.classList.add('active-done');
    }
  }

  const cards = document.querySelectorAll('.issue-card.issue-only-card');
  cards.forEach((card) => {
    const cardStatus = getIssueCardStatus(card);
    card.style.display = cardStatus === currentIssueFilter ? '' : 'none';
  });
}

function applyCocFilter(filterStatus = currentCocFilter) {
  currentCocFilter = normalizeBinaryStatus(filterStatus);

  cocFilterProgressBtn?.classList.remove('active-progress');
  cocFilterDoneBtn?.classList.remove('active-done');

  if (currentCocFilter === '진행 중') {
    cocFilterProgressBtn?.classList.add('active-progress');
  } else {
    cocFilterDoneBtn?.classList.add('active-done');
  }

  document.querySelectorAll('.coc-card').forEach((card) => {
    const doneBtn = card.querySelector('.coc-status-btn[data-status="완료"]');
    const status = doneBtn?.classList.contains('active-done') ? '완료' : '진행 중';
    card.classList.toggle('hidden-by-filter', status !== currentCocFilter);
  });
}

function applySireFilter(filterStatus = currentSireFilter) {
  currentSireFilter = normalizeBinaryStatus(filterStatus);

  sireFilterProgressBtn?.classList.remove('active-progress');
  sireFilterDoneBtn?.classList.remove('active-done');

  if (currentSireFilter === '진행 중') {
    sireFilterProgressBtn?.classList.add('active-progress');
  } else {
    sireFilterDoneBtn?.classList.add('active-done');
  }

  document.querySelectorAll('.sire-card').forEach((card) => {
    const status = card.querySelector('.sire-status-select')?.value || '예정';
    const bucket = getSireLikeBucket(status);
    card.classList.toggle('hidden-by-filter', bucket !== currentSireFilter);
  });
}

function applyConditionFilter(filterStatus = currentConditionFilter) {
  currentConditionFilter = normalizeBinaryStatus(filterStatus);

  conditionFilterProgressBtn?.classList.remove('active-progress');
  conditionFilterDoneBtn?.classList.remove('active-done');

  if (currentConditionFilter === '진행 중') {
    conditionFilterProgressBtn?.classList.add('active-progress');
  } else {
    conditionFilterDoneBtn?.classList.add('active-done');
  }

  document.querySelectorAll('.condition-card').forEach((card) => {
    const status = card.querySelector('.condition-status-select')?.value || '예정';
    const bucket = getSireLikeBucket(status);
    card.classList.toggle('hidden-by-filter', bucket !== currentConditionFilter);
  });
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
if (filterVlccBtn) filterVlccBtn.addEventListener('click', () => setFilter('vlcc'));
if (filterSireProgressBtn) filterSireProgressBtn.addEventListener('click', () => setFilter('sireprogress'));
if (filterTrmt1Btn) filterTrmt1Btn.addEventListener('click', () => setFilter('trmt1'));
if (filterTrmt2Btn) filterTrmt2Btn.addEventListener('click', () => setFilter('trmt2'));
if (filterCmt2Btn) filterCmt2Btn.addEventListener('click', () => setFilter('cmt2'));
if (filterSonBtn) filterSonBtn.addEventListener('click', () => setFilter('son'));
if (filterKimBtn) filterKimBtn.addEventListener('click', () => setFilter('kim'));
if (filterLeeBtn) filterLeeBtn.addEventListener('click', () => setFilter('lee'));
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
        shipSearchDropdown?.classList.remove('show');
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
    window.open(`/report?filter=${encodeURIComponent(currentFilter)}&_=${Date.now()}`, '_blank');
  });
}

if (cocReportBtn) {
  cocReportBtn.addEventListener('click', () => {
    window.open(`/coc-report?filter=${encodeURIComponent(currentFilter)}&_=${Date.now()}`, '_blank');
  });
}

if (sireReportBtn) {
  sireReportBtn.addEventListener('click', () => {
    window.open(`/sire-history-report?filter=${encodeURIComponent(currentFilter)}&_=${Date.now()}`, '_blank');
  });
}

if (conditionReportBtn) {
  conditionReportBtn.addEventListener('click', () => {
    window.open(`/condition-quarter-report?filter=${encodeURIComponent(currentFilter)}&_=${Date.now()}`, '_blank');
  });
}

if (drydockReportBtn) {
  drydockReportBtn.addEventListener('click', () => {
    window.open(`/drydock-report?filter=${encodeURIComponent(currentFilter)}&_=${Date.now()}`, '_blank');
  });
}

if (managementCostReportBtn) {
  managementCostReportBtn.addEventListener('click', () => {
    showCostReportModal();
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
      teamName: document.getElementById('teamName').value,
      builder: document.getElementById('builder').value.trim(),
      size: document.getElementById('size').value.trim(),
      deliveryDate: document.getElementById('deliveryDate').value,
      nextDryDock: document.getElementById('nextDryDock').value,
      voyagePlan: document.getElementById('voyagePlan').value.trim(),
      cargoStatus: document.getElementById('cargoStatus').value,
      issueItems: getIssueItemsForSave(),
      cocItems: getCocItemsForSave(),
      sireItems: getSireItemsForSave(),
      conditionItems: getConditionItemsForSave(),
      latitude: latitudeValue === '' ? NaN : parseFloat(latitudeValue),
      longitude: longitudeValue === '' ? NaN : parseFloat(longitudeValue),
      _originalName: originalName
    };

    vessel.opexContractCrewAmount = normalizeMoneyForSave(document.getElementById('opexContractCrewAmount')?.value || '');
    vessel.opexContractTechAmount = normalizeMoneyForSave(document.getElementById('opexContractTechAmount')?.value || '');
    vessel.opexContractYear = document.getElementById('opexContractYear')?.value || '';
    vessel.costRemark = document.getElementById('costRemark')?.value.trim() || '';

    vessel.opexActualCrewCount = document.getElementById('opexActualCrewCount')?.value || '';
    vessel.opexActualCrewAmount = normalizeMoneyForSave(document.getElementById('opexActualCrewAmount')?.value || '');
    vessel.opexActualTechCount = document.getElementById('opexActualTechCount')?.value || '';
    vessel.opexActualTechAmount = normalizeMoneyForSave(document.getElementById('opexActualTechAmount')?.value || '');

    vessel.aorActualCrewCount = document.getElementById('aorActualCrewCount')?.value || '';
    vessel.aorActualCrewAmount = normalizeMoneyForSave(document.getElementById('aorActualCrewAmount')?.value || '');
    vessel.aorActualTechCount = document.getElementById('aorActualTechCount')?.value || '';
    vessel.aorActualTechAmount = normalizeMoneyForSave(document.getElementById('aorActualTechAmount')?.value || '');

    vessel.aorUnclaimedCrewCount = document.getElementById('aorUnclaimedCrewCount')?.value || '';
    vessel.aorUnclaimedCrewAmount = normalizeMoneyForSave(document.getElementById('aorUnclaimedCrewAmount')?.value || '');
    vessel.aorUnclaimedTechCount = document.getElementById('aorUnclaimedTechCount')?.value || '';
    vessel.aorUnclaimedTechAmount = normalizeMoneyForSave(document.getElementById('aorUnclaimedTechAmount')?.value || '');

    if (currentVesselType === 'Container') {
      vessel.cargoStatus = '';
      vessel.sireItems = [];
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

    renderSearchSuggestions(shipSearchInput?.value.trim() || '');
  });
}

if (costReportCancelBtn) {
  costReportCancelBtn.addEventListener('click', () => {
    hideCostReportModal();
  });
}

if (costReportConfirmBtn) {
  costReportConfirmBtn.addEventListener('click', () => {
    const selectedYear = costReportYear?.value || '';
    const selectedRange = costReportRange?.value || '전체';
    const selectedView = costReportView?.value || '전체';

    if (!selectedYear) {
      alert('년도를 선택해주세요.');
      return;
    }

    hideCostReportModal();

    window.open(
      `/management-cost-report?filter=${encodeURIComponent(currentFilter)}&year=${encodeURIComponent(selectedYear)}&range=${encodeURIComponent(selectedRange)}&view=${encodeURIComponent(selectedView)}&_=${Date.now()}`,
      '_blank'
    );
  });
}

if (costReportModal) {
  costReportModal.addEventListener('click', (e) => {
    if (e.target === costReportModal) {
      hideCostReportModal();
    }
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    resetForm();
  });
}

if (managementCostUploadBtn && managementCostExcelInput) {
  managementCostUploadBtn.addEventListener('click', () => {
    managementCostExcelInput.click();
  });

  managementCostExcelInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadManagementCostExcel(file);
    } finally {
      managementCostExcelInput.value = '';
    }
  });
}

function renderIssueCardsFromVessel(vessel) {
  const issueSection = document.getElementById('issueSection');
  if (!issueSection) return;

  const issueItems = Array.isArray(vessel.issue_items) ? [...vessel.issue_items] : [];

  issueItems.sort((a, b) => {
    const aOrder = Number(a.sort_order ?? a.sortOrder ?? 9999);
    const bOrder = Number(b.sort_order ?? b.sortOrder ?? 9999);
    return aOrder - bOrder;
  });

  issueSection.innerHTML = issueItems.map((item) => {
    const text = item.issue_text || item.issueText || '';
    const isCritical = Number(item.is_critical ?? item.isCritical ?? 0) === 1 || item.is_critical === true;
    const status = String(item.issue_status || item.issueStatus || '진행 중').trim();

    return `
      <div class="issue-card issue-only-card">
        <div class="issue-card-title">현안업무</div>

        <div class="issue-card-body">
          <textarea class="issue-textarea issue-text" rows="3">${escapeHtml(text)}</textarea>
        </div>

        <div class="issue-meta-row">
          <div class="issue-meta-cell">CRITICAL</div>
          <div class="issue-meta-cell">
            <label class="issue-critical-label">
              <input type="checkbox" class="issue-critical" ${isCritical ? 'checked' : ''}>
              <span>체크</span>
            </label>
          </div>
        </div>

        <div class="issue-status-row">
          <button type="button" class="issue-status-btn ${status === '진행 중' ? 'active-progress' : ''}" data-status="진행 중">진행 중</button>
          <button type="button" class="issue-status-btn ${status === '완료' ? 'active-done' : ''}" data-status="완료">완료</button>
        </div>
      </div>
    `;
  }).join('');

  applyIssueFilter(currentIssueFilter);
}

function renderCocCardsFromVessel(vessel) {
  if (!cocDynamicSection) return;

  let items = Array.isArray(vessel.coc_items) ? [...vessel.coc_items] : [];
  if (!items.length) {
    items = getLegacyCocItemsFromVessel(vessel);
  }

  items.sort((a, b) => Number(a.sort_order ?? 9999) - Number(b.sort_order ?? 9999));

  cocDynamicSection.innerHTML = items.map((item) => {
    const status = normalizeBinaryStatus(item.item_status);
    return `
      <div class="issue-card coc-card">
        <div class="issue-card-title">COC 현황</div>

        <div class="issue-card-body">
          <div class="dynamic-card-grid-2">
            <div class="dynamic-card-field">
              <label>증서종류</label>
              <input type="text" class="coc-type" value="${escapeHtml(item.coc_type || '')}">
            </div>
            <div class="dynamic-card-field">
              <label>Due Date</label>
              <input type="text" class="date-field coc-due-date" placeholder="날짜" data-date-input value="${escapeHtml(item.coc_due_date || '')}">
            </div>
          </div>

          <div class="dynamic-card-field">
            <label>요약</label>
            <textarea class="coc-summary" rows="3">${escapeHtml(item.coc_summary || '')}</textarea>
          </div>
        </div>

        <div class="issue-status-row">
          <button type="button" class="issue-status-btn coc-status-btn ${status === '진행 중' ? 'active-progress' : ''}" data-status="진행 중">진행 중</button>
          <button type="button" class="issue-status-btn coc-status-btn ${status === '완료' ? 'active-done' : ''}" data-status="완료">완료</button>
        </div>
      </div>
    `;
  }).join('');

  setupDateInputs();
  applyCocFilter(currentCocFilter);
}


function renderSireCardsFromVessel(vessel) {
  if (!sireDynamicSection) return;

  let items = Array.isArray(vessel.sire_items) ? [...vessel.sire_items] : [];
  if (!items.length) {
    items = getLegacySireItemsFromVessel(vessel);
  }

  items.sort((a, b) => Number(a.sort_order ?? 9999) - Number(b.sort_order ?? 9999));

  sireDynamicSection.innerHTML = items.map((item) => `
    <div class="issue-card sire-card">
      <div class="issue-card-title">Sire 현황</div>

      <div class="issue-card-body">
        <div class="dynamic-card-grid-2">
          <div class="dynamic-card-field">
            <label>Sire 종류</label>
            <input type="text" class="sire-type" value="${escapeHtml(item.sire_type || '')}">
          </div>
          <div class="dynamic-card-field">
            <label>상태</label>
            <select class="sire-status-select sire-like-status-select">
              <option value="예정" ${String(item.sire_status || '') === '예정' ? 'selected' : ''}>예정</option>
              <option value="결함조치 중" ${String(item.sire_status || '') === '결함조치 중' ? 'selected' : ''}>결함조치 중</option>
              <option value="수검완료" ${String(item.sire_status || '') === '수검완료' ? 'selected' : ''}>수검완료</option>
            </select>
          </div>
        </div>

        <div class="dynamic-card-field">
          <label>날짜</label>
          <input type="text" class="date-field sire-date" placeholder="날짜" data-date-input value="${escapeHtml(item.sire_date || '')}">
        </div>

        <div class="dynamic-card-grid-2">
          <div class="dynamic-card-field">
            <label>지적사항 몇건</label>
            <input type="number" min="0" class="sire-findings" value="${escapeHtml(item.sire_findings || '')}">
          </div>
          <div class="dynamic-card-field">
            <label>잔여지적사항 몇건</label>
            <input type="number" min="0" class="sire-open-findings" value="${escapeHtml(item.sire_open_findings || '')}">
          </div>
        </div>

        <div class="dynamic-card-field">
          <label>특이사항</label>
          <textarea class="sire-remark" rows="3">${escapeHtml(item.sire_remark || '')}</textarea>
        </div>
      </div>
    </div>
  `).join('');

  setupDateInputs();
  applySireFilter(currentSireFilter);
}



function renderConditionCardsFromVessel(vessel) {
  if (!conditionDynamicSection) return;

  let items = Array.isArray(vessel.condition_items) ? [...vessel.condition_items] : [];
  if (!items.length) {
    items = getLegacyConditionItemsFromVessel(vessel);
  }

  items.sort((a, b) => Number(a.sort_order ?? 9999) - Number(b.sort_order ?? 9999));

  conditionDynamicSection.innerHTML = items.map((item) => `
    <div class="issue-card condition-card">
      <div class="issue-card-title">Condition Report</div>

      <div class="issue-card-body">
        <div class="dynamic-card-grid-2">
          <div class="dynamic-card-field">
            <label>종류</label>
            <input type="text" class="condition-type" value="${escapeHtml(item.condition_type || '')}">
          </div>
          <div class="dynamic-card-field">
            <label>상태</label>
            <select class="condition-status-select sire-like-status-select">
              <option value="예정" ${String(item.condition_status || '') === '예정' ? 'selected' : ''}>예정</option>
              <option value="결함조치 중" ${String(item.condition_status || '') === '결함조치 중' ? 'selected' : ''}>결함조치 중</option>
              <option value="수검완료" ${String(item.condition_status || '') === '수검완료' ? 'selected' : ''}>수검완료</option>
            </select>
          </div>
        </div>

        <div class="dynamic-card-field">
          <label>날짜</label>
          <input type="text" class="date-field condition-date" placeholder="날짜" data-date-input value="${escapeHtml(item.condition_date || '')}">
        </div>

        <div class="dynamic-card-grid-2">
          <div class="dynamic-card-field">
            <label>지적사항 몇건</label>
            <input type="number" min="0" class="condition-findings" value="${escapeHtml(item.condition_findings || '')}">
          </div>
          <div class="dynamic-card-field">
            <label>잔여지적사항 몇건</label>
            <input type="number" min="0" class="condition-open-findings" value="${escapeHtml(item.condition_open_findings || '')}">
          </div>
        </div>

        <div class="dynamic-card-field">
          <label>특이사항</label>
          <textarea class="condition-remark" rows="3">${escapeHtml(item.condition_remark || '')}</textarea>
        </div>
      </div>
    </div>
  `).join('');

  setupDateInputs();
  applyConditionFilter(currentConditionFilter);
}


function addIssueCard(initialStatus = '진행 중') {
  const issueSection = document.getElementById('issueSection');
  if (!issueSection) return;

  const isDone = initialStatus === '완료';

  const card = document.createElement('div');
  card.className = 'issue-card issue-only-card';
  card.innerHTML = `
    <div class="issue-card-title">현안업무</div>

    <div class="issue-card-body">
      <textarea class="issue-textarea issue-text" rows="3"></textarea>
    </div>

    <div class="issue-meta-row">
      <div class="issue-meta-cell">CRITICAL</div>
      <div class="issue-meta-cell">
        <label class="issue-critical-label">
          <input type="checkbox" class="issue-critical">
          <span>체크</span>
        </label>
      </div>
    </div>

    <div class="issue-status-row">
      <button type="button" class="issue-status-btn ${!isDone ? 'active-progress' : ''}" data-status="진행 중">진행 중</button>
      <button type="button" class="issue-status-btn ${isDone ? 'active-done' : ''}" data-status="완료">완료</button>
    </div>
  `;

  issueSection.appendChild(card);
  applyIssueFilter(currentIssueFilter);
}


function addCocCard(initialStatus = '진행 중') {
  if (!cocDynamicSection) return;

  const isDone = initialStatus === '완료';

  const card = document.createElement('div');
  card.className = 'issue-card coc-card';
  card.innerHTML = `
    <div class="issue-card-title">COC 현황</div>

    <div class="issue-card-body">
      <div class="dynamic-card-grid-2">
        <div class="dynamic-card-field">
          <label>증서종류</label>
          <input type="text" class="coc-type">
        </div>
        <div class="dynamic-card-field">
          <label>Due Date</label>
          <input type="text" class="date-field coc-due-date" placeholder="날짜" data-date-input>
        </div>
      </div>

      <div class="dynamic-card-field">
        <label>요약</label>
        <textarea class="coc-summary" rows="3"></textarea>
      </div>
    </div>

    <div class="issue-status-row">
      <button type="button" class="issue-status-btn coc-status-btn ${!isDone ? 'active-progress' : ''}" data-status="진행 중">진행 중</button>
      <button type="button" class="issue-status-btn coc-status-btn ${isDone ? 'active-done' : ''}" data-status="완료">완료</button>
    </div>
  `;

  cocDynamicSection.appendChild(card);
  setupDateInputs();
  applyCocFilter(currentCocFilter);
}




function addSireCard(initialBucket = '진행 중') {
  if (!sireDynamicSection) return;

  const defaultStatus = initialBucket === '완료' ? '수검완료' : '예정';

  const card = document.createElement('div');
  card.className = 'issue-card sire-card';
  card.innerHTML = `
    <div class="issue-card-title">Sire 현황</div>

    <div class="issue-card-body">
      <div class="dynamic-card-grid-2">
        <div class="dynamic-card-field">
          <label>Sire 종류</label>
          <input type="text" class="sire-type">
        </div>
        <div class="dynamic-card-field">
          <label>상태</label>
          <select class="sire-status-select sire-like-status-select">
            <option value="예정" ${defaultStatus === '예정' ? 'selected' : ''}>예정</option>
            <option value="결함조치 중" ${defaultStatus === '결함조치 중' ? 'selected' : ''}>결함조치 중</option>
            <option value="수검완료" ${defaultStatus === '수검완료' ? 'selected' : ''}>수검완료</option>
          </select>
        </div>
      </div>

      <div class="dynamic-card-field">
        <label>날짜</label>
        <input type="text" class="date-field sire-date" placeholder="날짜" data-date-input>
      </div>

      <div class="dynamic-card-grid-2">
        <div class="dynamic-card-field">
          <label>지적사항 몇건</label>
          <input type="number" min="0" class="sire-findings">
        </div>
        <div class="dynamic-card-field">
          <label>잔여지적사항 몇건</label>
          <input type="number" min="0" class="sire-open-findings">
        </div>
      </div>

      <div class="dynamic-card-field">
        <label>특이사항</label>
        <textarea class="sire-remark" rows="3"></textarea>
      </div>
    </div>
  `;

  sireDynamicSection.appendChild(card);
  setupDateInputs();
  applySireFilter(currentSireFilter);
}

function addConditionCard(initialBucket = '진행 중') {
  if (!conditionDynamicSection) return;

  const defaultStatus = initialBucket === '완료' ? '수검완료' : '예정';

  const card = document.createElement('div');
  card.className = 'issue-card condition-card';
  card.innerHTML = `
    <div class="issue-card-title">Condition Report</div>

    <div class="issue-card-body">
      <div class="dynamic-card-grid-2">
        <div class="dynamic-card-field">
          <label>종류</label>
          <input type="text" class="condition-type">
        </div>
        <div class="dynamic-card-field">
          <label>상태</label>
          <select class="condition-status-select sire-like-status-select">
            <option value="예정" ${defaultStatus === '예정' ? 'selected' : ''}>예정</option>
            <option value="결함조치 중" ${defaultStatus === '결함조치 중' ? 'selected' : ''}>결함조치 중</option>
            <option value="수검완료" ${defaultStatus === '수검완료' ? 'selected' : ''}>수검완료</option>
          </select>
        </div>
      </div>

      <div class="dynamic-card-field">
        <label>날짜</label>
        <input type="text" class="date-field condition-date" placeholder="날짜" data-date-input>
      </div>

      <div class="dynamic-card-grid-2">
        <div class="dynamic-card-field">
          <label>지적사항 몇건</label>
          <input type="number" min="0" class="condition-findings">
        </div>
        <div class="dynamic-card-field">
          <label>잔여지적사항 몇건</label>
          <input type="number" min="0" class="condition-open-findings">
        </div>
      </div>

      <div class="dynamic-card-field">
        <label>특이사항</label>
        <textarea class="condition-remark" rows="3"></textarea>
      </div>
    </div>
  `;

  conditionDynamicSection.appendChild(card);
  setupDateInputs();
  applyConditionFilter(currentConditionFilter);
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
  document.getElementById('teamName').value = vessel.team_name || vessel.teamName || '';
  document.getElementById('builder').value = vessel.builder || '';
  document.getElementById('size').value = vessel.size || '';
  setDateInputValue('deliveryDate', vessel.delivery_date || '');
  setDateInputValue('nextDryDock', vessel.next_dry_dock || '');
  document.getElementById('voyagePlan').value = vessel.voyage_plan || '';
  document.getElementById('cargoStatus').value = normalizeCargoStatus(vessel.cargo_status);

  renderIssueCardsFromVessel(vessel);
  renderCocCardsFromVessel(vessel);
  renderSireCardsFromVessel(vessel);
  renderConditionCardsFromVessel(vessel);

  const yearEl = document.getElementById('opexContractYear');
  if (yearEl && !yearEl.value) {
    yearEl.value = String(new Date().getFullYear());
  }

  resetManagementCostFields(true);

  document.getElementById('latitude').value = vessel.latitude ?? '';
  document.getElementById('longitude').value = vessel.longitude ?? '';

  editIndex = index;
  updateVesselTypeUI();

  const selectedYear = document.getElementById('opexContractYear')?.value || '';
  if (selectedYear) {
    loadManagementCostByYear();
  } else {
    resetManagementCostFields(true);
  }
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

window.closeLabel = closeLabel;

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

document.addEventListener('click', (e) => {
  const statusBtn = e.target.closest('.issue-status-btn');
  if (!statusBtn) return;

  const issueCard = statusBtn.closest('.issue-card');
  if (!issueCard) return;

  if (issueCard.classList.contains('coc-card') || issueCard.classList.contains('sire-card') || issueCard.classList.contains('condition-card')) {
    return;
  }

  const progressBtn = issueCard.querySelector('.issue-status-btn[data-status="진행 중"]');
  const doneBtn = issueCard.querySelector('.issue-status-btn[data-status="완료"]');

  progressBtn?.classList.remove('active-progress');
  doneBtn?.classList.remove('active-done');

  if (statusBtn.dataset.status === '진행 중') {
    progressBtn?.classList.add('active-progress');
  }

  if (statusBtn.dataset.status === '완료') {
    doneBtn?.classList.add('active-done');
  }

  applyIssueFilter(currentIssueFilter);
});

document.addEventListener('click', (e) => {
  const cocStatusBtn = e.target.closest('.coc-status-btn');
  if (!cocStatusBtn) return;

  const card = cocStatusBtn.closest('.coc-card');
  if (!card) return;

  const progressBtn = card.querySelector('.coc-status-btn[data-status="진행 중"]');
  const doneBtn = card.querySelector('.coc-status-btn[data-status="완료"]');

  progressBtn?.classList.remove('active-progress');
  doneBtn?.classList.remove('active-done');

  if (cocStatusBtn.dataset.status === '진행 중') progressBtn?.classList.add('active-progress');
  if (cocStatusBtn.dataset.status === '완료') doneBtn?.classList.add('active-done');

  applyCocFilter(currentCocFilter);
});

document.addEventListener('change', (e) => {
  if (e.target.matches('.sire-status-select')) {
    applySireFilter(currentSireFilter);
  }

  if (e.target.matches('.condition-status-select')) {
    applyConditionFilter(currentConditionFilter);
  }
});

const addIssueBtn = document.getElementById('addIssueBtn');
if (addIssueBtn) {
  addIssueBtn.addEventListener('click', addIssueCard);
}

const issueFilterProgressBtn = document.getElementById('issueFilterProgressBtn');
const issueFilterDoneBtn = document.getElementById('issueFilterDoneBtn');

if (issueFilterProgressBtn && issueFilterDoneBtn) {
  issueFilterProgressBtn.addEventListener('click', () => {
    applyIssueFilter('진행 중');
  });

  issueFilterDoneBtn.addEventListener('click', () => {
    applyIssueFilter('완료');
  });
}

if (addCocBtn) addCocBtn.addEventListener('click', addCocCard);
if (addSireBtn) addSireBtn.addEventListener('click', addSireCard);
if (addConditionBtn) addConditionBtn.addEventListener('click', addConditionCard);

if (cocFilterProgressBtn) cocFilterProgressBtn.addEventListener('click', () => applyCocFilter('진행 중'));
if (cocFilterDoneBtn) cocFilterDoneBtn.addEventListener('click', () => applyCocFilter('완료'));

if (sireFilterProgressBtn) sireFilterProgressBtn.addEventListener('click', () => applySireFilter('진행 중'));
if (sireFilterDoneBtn) sireFilterDoneBtn.addEventListener('click', () => applySireFilter('완료'));

if (conditionFilterProgressBtn) conditionFilterProgressBtn.addEventListener('click', () => applyConditionFilter('진행 중'));
if (conditionFilterDoneBtn) conditionFilterDoneBtn.addEventListener('click', () => applyConditionFilter('완료'));

setupDateInputs();
bindMoneyInputs();
updateVesselTypeUI();
initAccordion();

currentIssueFilter = issueFilterDoneBtn?.classList.contains('active-done') ? '완료' : '진행 중';
currentCocFilter = cocFilterDoneBtn?.classList.contains('active-done') ? '완료' : '진행 중';
currentSireFilter = sireFilterDoneBtn?.classList.contains('active-done') ? '완료' : '진행 중';
currentConditionFilter = conditionFilterDoneBtn?.classList.contains('active-done') ? '완료' : '진행 중';

applyIssueFilter(currentIssueFilter);
applyCocFilter(currentCocFilter);
applySireFilter(currentSireFilter);
applyConditionFilter(currentConditionFilter);

loadData({ preserveSelection: true, fitBounds: true });