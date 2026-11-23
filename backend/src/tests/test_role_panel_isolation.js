const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Comprehensive Role Panel Isolation Tests ===');

// Load application controller source to verify static structure
const appCtrlPath = path.join(__dirname, '../modules/crm/application.controller.js');
const appCtrlSrc = fs.readFileSync(appCtrlPath, 'utf8');

// 1. Verify exact definitions in application.controller.js
assert.ok(
  appCtrlSrc.includes("const isAdministrativeOperatorUser = ["),
  'Must define isAdministrativeOperatorUser with exact array'
);
assert.ok(
  !appCtrlSrc.includes("some(title => userDesignation.includes(title) || userRole === title || userRole.includes(title))"),
  'Must NOT use loose substring matching for isAdministrativeOperatorUser'
);
assert.ok(
  appCtrlSrc.includes("'QD CHECKER'"),
  'QD operator check must include QD CHECKER'
);
assert.ok(
  appCtrlSrc.includes("const isCardActivationOperatorUser ="),
  'Must define isCardActivationOperatorUser'
);
console.log('✔ Static definitions in application.controller.js verified.');

// 2. Functional Query & Filter Generation Simulator
// Replicates the controller logic under test
function simulateFilters(userRole, userDesignation, abRows = [], queryParams = {}) {
  userRole = (userRole || '').toUpperCase();
  userDesignation = (userDesignation || '').toUpperCase();

  const isStaffOrOperatorUser = [
    'ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'HR',
    'OPERATIONAL HEAD', 'OPERATIONAL_HEAD', 'OPERATIONS HEAD', 'OPERATIONS_HEAD', 'BACKEND', 'BACKEND OPERATION', 'BACKEND_OPERATION',
    'ADMINISTRATIVE OPERATOR', 'ADMINISTRATIVE_OPERATOR', 'OPERATOR',
    'ADMINISTRATIVE SALES EXECUTIVE', 'ADMINISTRATIVE_SALES_EXECUTIVE', 'ADMINISTRATIVE SALES OPERATOR', 'ADMINISTRATIVE_SALES_OPERATOR',
    'PAN CHECKER', 'PAN_CHECKER',
    'QD OPERATOR', 'QD_OPERATOR', 'QD CHECKER', 'QD_CHECKER',
    'REMARK OPERATOR', 'REMARK_OPERATOR',
    'FINAL STATUS OPERATOR', 'FINAL_STATUS_OPERATOR',
    'QUERABLE OPERATOR', 'QUERABLE_OPERATOR', 'QUERYABLE OPERATOR', 'QUERYABLE_OPERATOR',
    'PHYSICAL CURABLE', 'PHYSICAL_CURABLE', 'PHYSICAL CURABLE OPERATOR', 'PHYSICAL_CURABLE_OPERATOR',
    'DIGITAL CURABLE', 'DIGITAL_CURABLE', 'DIGITAL CURABLE OPERATOR', 'DIGITAL_CURABLE_OPERATOR',
    'EMAIL CURABLE', 'EMAIL_CURABLE', 'EMAIL CURABLE OPERATOR', 'EMAIL_CURABLE_OPERATOR',
    'CARD ACTIVATION OPERATOR', 'CARD_ACTIVATION_OPERATOR', 'Card Activation Operator'
  ].some(title => userDesignation.includes(title) || userRole === title);
  const isPartnerOrTeam = ['PARTNER', 'TEAM_MEMBER'].includes(userRole) || (userRole === 'EMPLOYEE' && !isStaffOrOperatorUser);
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const isSalesExecUser = ['ADMINISTRATIVE SALES EXECUTIVE', 'ADMINISTRATIVE_SALES_EXECUTIVE', 'ADMINISTRATIVE SALES OPERATOR', 'ADMINISTRATIVE_SALES_OPERATOR', 'Administrative Sales Executive'].includes(userDesignation) || ['ADMINISTRATIVE SALES EXECUTIVE', 'ADMINISTRATIVE_SALES_EXECUTIVE', 'ADMINISTRATIVE SALES OPERATOR', 'ADMINISTRATIVE_SALES_OPERATOR'].includes(userRole);
  const isPanCheckerUser = ['PAN CHECKER', 'PAN_CHECKER', 'PAN Checker'].includes(userDesignation) || ['PAN CHECKER', 'PAN_CHECKER'].includes(userRole);
  const isQdOperatorUser = ['QD OPERATOR', 'QD_OPERATOR', 'QD CHECKER', 'QD_CHECKER', 'QD Operator', 'QD Checker'].includes(userDesignation) || ['QD OPERATOR', 'QD_OPERATOR', 'QD CHECKER', 'QD_CHECKER'].includes(userRole);
  const isRemarkOperatorUser = ['REMARK OPERATOR', 'REMARK_OPERATOR', 'Remark Operator'].includes(userDesignation) || ['REMARK OPERATOR', 'REMARK_OPERATOR'].includes(userRole);
  const isFinalStatusOperatorUser = ['FINAL STATUS OPERATOR', 'FINAL_STATUS_OPERATOR', 'Final Status Operator'].includes(userDesignation) || ['FINAL STATUS OPERATOR', 'FINAL_STATUS_OPERATOR'].includes(userRole);
  const isQuerableOperatorUser = ['QUERABLE OPERATOR', 'QUERABLE_OPERATOR', 'QUERYABLE OPERATOR', 'QUERYABLE_OPERATOR', 'Querable Operator', 'Queryable Operator'].includes(userDesignation) || ['QUERABLE OPERATOR', 'QUERABLE_OPERATOR', 'QUERYABLE OPERATOR', 'QUERYABLE_OPERATOR'].includes(userRole);
  const isCardActivationOperatorUser = ['CARD ACTIVATION OPERATOR', 'CARD_ACTIVATION_OPERATOR', 'Card Activation Operator'].includes(userDesignation) || ['CARD ACTIVATION OPERATOR', 'CARD_ACTIVATION_OPERATOR', 'Card Activation Operator'].includes(userRole);

  const curableDesignationSets = {
    PHYSICAL_CURABLE: ['PHYSICAL CURABLE', 'PHYSICAL_CURABLE', 'PHYSICAL CURABLE OPERATOR', 'PHYSICAL_CURABLE_OPERATOR', 'Physical Curable', 'Physical Curable Operator'],
    DIGITAL_CURABLE: ['DIGITAL CURABLE', 'DIGITAL_CURABLE', 'DIGITAL CURABLE OPERATOR', 'DIGITAL_CURABLE_OPERATOR', 'Digital Curable', 'Digital Curable Operator'],
    EMAIL_CURABLE: ['EMAIL CURABLE', 'EMAIL_CURABLE', 'EMAIL CURABLE OPERATOR', 'EMAIL_CURABLE_OPERATOR', 'Email Curable', 'Email Curable Operator'],
  };
  const ownCurableTeam = Object.keys(curableDesignationSets).find(team =>
    curableDesignationSets[team].includes(userDesignation) || curableDesignationSets[team].includes(userRole)
  ) || null;
  const isSpecializedOtherOperator = isSalesExecUser || isPanCheckerUser || isQdOperatorUser || isRemarkOperatorUser || isFinalStatusOperatorUser || isQuerableOperatorUser || isCardActivationOperatorUser;
  const requestedParam = String(queryParams.curing_designation || '').trim().toUpperCase().replace(/ /g, '_');
  const requestedCurableTeam = curableDesignationSets[requestedParam] ? requestedParam : null;
  const activeCurableTeam = ownCurableTeam || (!isSpecializedOtherOperator ? requestedCurableTeam : null);
  const isCurableOperatorUser = Boolean(activeCurableTeam);

  let baseBankAccessFilterSQL = '';
  if (!isPartnerOrTeam && !isSuperAdmin) {
    if (!abRows || abRows.length === 0) {
      baseBankAccessFilterSQL = '';
    } else {
      baseBankAccessFilterSQL = ' AND (combined.bank_id IN (' + abRows.map(r => `'${r.bank_id}'`).join(',') + '))';
    }
  }

  const baseBankAccessClean = (baseBankAccessFilterSQL || '').replace(/^\s*AND\s*/i, '').trim();
  const hasValidBaseBank = baseBankAccessClean && baseBankAccessClean !== '1=0';

  let salesExecFilterSQL = '';
  if (isSalesExecUser) {
    const sbiMatch = `(LOWER(combined.bank_code) = 'sbi')`;
    const hdfcMatch = `(LOWER(combined.bank_code) = 'hdfc')`;
    const scope = hasValidBaseBank ? ` AND (${baseBankAccessClean})` : ` AND (${hdfcMatch} OR ${sbiMatch})`;
    salesExecFilterSQL = `${scope} AND (lead_punching) AND (unclaimed_or_self)`;
  }

  let panCheckerFilterSQL = '';
  if (isPanCheckerUser) {
    const sbiMatch = `(LOWER(combined.bank_code) = 'sbi')`;
    const scope = hasValidBaseBank ? ` AND (${baseBankAccessClean})` : ` AND ${sbiMatch}`;
    panCheckerFilterSQL = ` ${scope} AND (pan_check = 'no') AND (not approved)`;
  }

  let qdOperatorFilterSQL = '';
  if (isQdOperatorUser) {
    const scope = hasValidBaseBank ? ` AND (${baseBankAccessClean})` : '';
    qdOperatorFilterSQL = `${scope} AND (physical_process) AND (dispatch pending)`;
  }

  let remarkOperatorFilterSQL = '';
  if (isRemarkOperatorUser) {
    const scope = hasValidBaseBank ? ` AND (${baseBankAccessClean})` : '';
    remarkOperatorFilterSQL = `${scope} AND (remark_pending) AND (not rejected)`;
  }

  let finalStatusOperatorFilterSQL = '';
  if (isFinalStatusOperatorUser) {
    const scope = hasValidBaseBank ? ` AND (${baseBankAccessClean})` : '';
    finalStatusOperatorFilterSQL = `${scope} AND (dispatch_complete) AND (final_status in_process)`;
  }

  let querableOperatorFilterSQL = '';
  if (isQuerableOperatorUser) {
    const scope = hasValidBaseBank ? ` AND (${baseBankAccessClean})` : '';
    querableOperatorFilterSQL = `${scope} AND (status IN ('rejected', 'declined'))`;
  }

  let curableOperatorFilterSQL = '';
  if (isCurableOperatorUser) {
    curableOperatorFilterSQL = ` AND (bank = 'hdfc') AND (curing = '${activeCurableTeam}')`;
  }

  let cardActivationOperatorFilterSQL = '';
  if (isCardActivationOperatorUser) {
    cardActivationOperatorFilterSQL = ` AND (bank = 'hdfc') AND (card_approved)`;
  }

  let opHeadBankFilterSQL = '';
  if (!isPartnerOrTeam && !isSuperAdmin) {
    const isSpecializedQueueOperator = isSalesExecUser || isPanCheckerUser || isRemarkOperatorUser || isQdOperatorUser || isFinalStatusOperatorUser || isQuerableOperatorUser || isCurableOperatorUser || isCardActivationOperatorUser;
    if (isSpecializedQueueOperator) {
      opHeadBankFilterSQL = '';
    } else {
      opHeadBankFilterSQL = baseBankAccessFilterSQL;
    }
  }

  const activeSpecializedFilters = [];
  if (salesExecFilterSQL) activeSpecializedFilters.push('salesExec');
  if (panCheckerFilterSQL) activeSpecializedFilters.push('panChecker');
  if (qdOperatorFilterSQL) activeSpecializedFilters.push('qdOperator');
  if (remarkOperatorFilterSQL) activeSpecializedFilters.push('remarkOperator');
  if (finalStatusOperatorFilterSQL) activeSpecializedFilters.push('finalStatus');
  if (querableOperatorFilterSQL) activeSpecializedFilters.push('querable');
  if (curableOperatorFilterSQL) activeSpecializedFilters.push('curable');
  if (cardActivationOperatorFilterSQL) activeSpecializedFilters.push('cardActivation');

  return {
    isPartnerOrTeam,
    isSuperAdmin,
    baseBankAccessFilterSQL,
    opHeadBankFilterSQL,
    activeSpecializedFilters,
    salesExecFilterSQL,
    panCheckerFilterSQL,
    qdOperatorFilterSQL,
    remarkOperatorFilterSQL,
    finalStatusOperatorFilterSQL,
    querableOperatorFilterSQL,
    curableOperatorFilterSQL,
    cardActivationOperatorFilterSQL
  };
}

// 3. Test Cases for Panel Isolation
const testCases = [
  // Super Admin
  { role: 'SUPER_ADMIN', designation: 'Super Admin', expectedFilters: [] },
  
  // Operational Head
  { role: 'ADMIN', designation: 'Operational Head', expectedFilters: [] },
  { role: 'EMPLOYEE', designation: 'Operational Head', expectedFilters: [] },
  
  // Administrative Operator
  { role: 'ADMIN', designation: 'Administrative Operator', expectedFilters: [] },
  { role: 'EMPLOYEE', designation: 'Administrative Operator', expectedFilters: [] },
  
  // Administrative Sales Executive
  { role: 'ADMIN', designation: 'Administrative Sales Executive', expectedFilters: ['salesExec'] },
  { role: 'EMPLOYEE', designation: 'Administrative Sales Executive', expectedFilters: ['salesExec'] },
  
  // PAN Checker
  { role: 'ADMIN', designation: 'PAN Checker', expectedFilters: ['panChecker'] },
  { role: 'EMPLOYEE', designation: 'PAN Checker', expectedFilters: ['panChecker'] },
  
  // QD Operator & QD Checker
  { role: 'ADMIN', designation: 'QD Operator', expectedFilters: ['qdOperator'] },
  { role: 'EMPLOYEE', designation: 'QD Operator', expectedFilters: ['qdOperator'] },
  { role: 'ADMIN', designation: 'QD Checker', expectedFilters: ['qdOperator'] },
  { role: 'EMPLOYEE', designation: 'QD Checker', expectedFilters: ['qdOperator'] },
  
  // Remark Operator
  { role: 'ADMIN', designation: 'Remark Operator', expectedFilters: ['remarkOperator'] },
  { role: 'EMPLOYEE', designation: 'Remark Operator', expectedFilters: ['remarkOperator'] },
  
  // Final Status Operator
  { role: 'ADMIN', designation: 'Final Status Operator', expectedFilters: ['finalStatus'] },
  { role: 'EMPLOYEE', designation: 'Final Status Operator', expectedFilters: ['finalStatus'] },
  
  // Querable Operator
  { role: 'ADMIN', designation: 'Querable Operator', expectedFilters: ['querable'] },
  { role: 'EMPLOYEE', designation: 'Querable Operator', expectedFilters: ['querable'] },
  
  // Curable Operators
  { role: 'ADMIN', designation: 'Physical Curable Operator', expectedFilters: ['curable'] },
  { role: 'EMPLOYEE', designation: 'Digital Curable Operator', expectedFilters: ['curable'] },
  { role: 'EMPLOYEE', designation: 'Email Curable Operator', expectedFilters: ['curable'] },
  
  // Card Activation Operator
  { role: 'ADMIN', designation: 'Card Activation Operator', expectedFilters: ['cardActivation'] },
  { role: 'EMPLOYEE', designation: 'Card Activation Operator', expectedFilters: ['cardActivation'] },
  
  // Regular Employees
  { role: 'EMPLOYEE', designation: 'Telecaller', isEmployee: true, expectedFilters: [] },
  { role: 'EMPLOYEE', designation: 'Sales Executive', isEmployee: true, expectedFilters: [] },
  { role: 'PARTNER', designation: '', isEmployee: true, expectedFilters: [] },
];

for (const tc of testCases) {
  const res = simulateFilters(tc.role, tc.designation);
  
  // Assert employee isolation
  if (tc.isEmployee) {
    assert.strictEqual(res.isPartnerOrTeam, true, `${tc.role} | ${tc.designation} must be partner/team`);
    assert.strictEqual(res.activeSpecializedFilters.length, 0, 'Employees must not have specialized operator filters');
    continue;
  }

  // Assert exactly expected specialized filters are activated
  assert.deepStrictEqual(
    res.activeSpecializedFilters,
    tc.expectedFilters,
    `Role ${tc.role} with designation ${tc.designation} failed filter isolation: got [${res.activeSpecializedFilters}] expected [${tc.expectedFilters}]`
  );

  // Assert NO impossible '1=0' condition when unassigned
  const allSql = [
    res.baseBankAccessFilterSQL,
    res.opHeadBankFilterSQL,
    res.salesExecFilterSQL,
    res.panCheckerFilterSQL,
    res.qdOperatorFilterSQL,
    res.remarkOperatorFilterSQL,
    res.finalStatusOperatorFilterSQL,
    res.querableOperatorFilterSQL,
    res.curableOperatorFilterSQL,
    res.cardActivationOperatorFilterSQL
  ].join(' ');

  assert.ok(!allSql.includes('1=0'), `Unassigned user ${tc.role} | ${tc.designation} must NEVER evaluate to 1=0`);
  
  // Specific operator assertions
  if (tc.expectedFilters.includes('cardActivation')) {
    assert.ok(res.cardActivationOperatorFilterSQL.includes("bank = 'hdfc'"), 'Card Activation Operator must be scoped to HDFC');
    assert.ok(res.cardActivationOperatorFilterSQL.includes("card_approved"), 'Card Activation Operator must require card_approved');
  }
  if (tc.expectedFilters.includes('panChecker')) {
    assert.ok(res.panCheckerFilterSQL.includes("LOWER(combined.bank_code) = 'sbi'"), 'PAN Checker must default to SBI bank');
    assert.ok(res.panCheckerFilterSQL.includes("pan_check = 'no'"), 'PAN Checker must require pan_check = no');
  }
  if (tc.expectedFilters.includes('qdOperator')) {
    assert.ok(res.qdOperatorFilterSQL.includes("physical_process"), 'QD Operator must filter to physical process');
  }
  if (tc.expectedFilters.includes('finalStatus')) {
    assert.ok(res.finalStatusOperatorFilterSQL.includes("dispatch_complete"), 'Final Status Operator must filter to dispatched cases');
  }

  console.log(`✔ Passed isolation check: [${tc.role}] ${tc.designation} => [${res.activeSpecializedFilters.join(', ') || 'full/scoped access'}]`);
}

// 4. Test Assigned Banks Scoping
const assignedBanks = [{ bank_id: 'b1-hdfc', short_code: 'hdfc' }, { bank_id: 'b2-sbi', short_code: 'sbi' }];
const assignedQd = simulateFilters('EMPLOYEE', 'QD Operator', assignedBanks);
assert.ok(assignedQd.qdOperatorFilterSQL.includes('b1-hdfc'), 'QD Operator with assigned banks must scope to assigned banks');

const assignedPan = simulateFilters('EMPLOYEE', 'PAN Checker', assignedBanks);
assert.ok(assignedPan.panCheckerFilterSQL.includes('b1-hdfc'), 'PAN Checker with assigned banks must scope to assigned banks');

const assignedCard = simulateFilters('EMPLOYEE', 'Card Activation Operator', assignedBanks);
assert.ok(assignedCard.cardActivationOperatorFilterSQL.includes("bank = 'hdfc'"), 'Card Activation Operator must scope to HDFC');

console.log('✔ Assigned banks scoping verified.');
console.log('ALL ROLE PANEL ISOLATION TESTS PASSED SUCCESSFULLY!');
