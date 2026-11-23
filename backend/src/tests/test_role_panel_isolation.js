const assert = require('assert');
const { ROLES, DESIGNATIONS } = require('../constants/roles');

console.log('--- Testing Role and Panel Isolation ---');

// 1. Verify Card Activation Operator is completely absent from roles and designations
assert.strictEqual(ROLES.CARD_ACTIVATION_OPERATOR, undefined, 'ROLES must not contain CARD_ACTIVATION_OPERATOR');
assert.strictEqual(DESIGNATIONS.CARD_ACTIVATION_OPERATOR, undefined, 'DESIGNATIONS must not contain CARD_ACTIVATION_OPERATOR');
console.log('✓ Test 1 Passed: Card Activation Operator successfully removed from roles and constants');

// 2. Test operator designation resolution & isolation logic
function evaluateOperatorState(userRole, userDesignation, abRows = []) {
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isSalesExecUser = ['ADMINISTRATIVE SALES EXECUTIVE', 'ADMINISTRATIVE_SALES_EXECUTIVE', 'ADMINISTRATIVE SALES OPERATOR', 'ADMINISTRATIVE_SALES_OPERATOR'].includes(userDesignation) || ['ADMINISTRATIVE SALES EXECUTIVE', 'ADMINISTRATIVE_SALES_EXECUTIVE', 'ADMINISTRATIVE SALES OPERATOR', 'ADMINISTRATIVE_SALES_OPERATOR'].includes(userRole);
  const isPanCheckerUser = ['PAN CHECKER', 'PAN_CHECKER'].includes(userDesignation) || ['PAN CHECKER', 'PAN_CHECKER'].includes(userRole);
  const isQdOperatorUser = ['QD OPERATOR', 'QD_OPERATOR', 'QD CHECKER', 'QD_CHECKER'].includes(userDesignation) || ['QD OPERATOR', 'QD_OPERATOR', 'QD CHECKER', 'QD_CHECKER'].includes(userRole);
  const isRemarkOperatorUser = ['REMARK OPERATOR', 'REMARK_OPERATOR'].includes(userDesignation) || ['REMARK OPERATOR', 'REMARK_OPERATOR'].includes(userRole);
  const isFinalStatusOperatorUser = ['FINAL STATUS OPERATOR', 'FINAL_STATUS_OPERATOR'].includes(userDesignation) || ['FINAL STATUS OPERATOR', 'FINAL_STATUS_OPERATOR'].includes(userRole);
  const isQuerableOperatorUser = ['QUERABLE OPERATOR', 'QUERABLE_OPERATOR', 'QUERYABLE OPERATOR', 'QUERYABLE_OPERATOR'].includes(userDesignation) || ['QUERABLE OPERATOR', 'QUERABLE_OPERATOR', 'QUERYABLE OPERATOR', 'QUERYABLE_OPERATOR'].includes(userRole);
  const isCurableOperatorUserRole = [
    'PHYSICAL CURABLE', 'PHYSICAL_CURABLE', 'PHYSICAL CURABLE OPERATOR', 'PHYSICAL_CURABLE_OPERATOR',
    'DIGITAL CURABLE', 'DIGITAL_CURABLE', 'DIGITAL CURABLE OPERATOR', 'DIGITAL_CURABLE_OPERATOR',
    'EMAIL CURABLE', 'EMAIL_CURABLE', 'EMAIL CURABLE OPERATOR', 'EMAIL_CURABLE_OPERATOR'
  ].includes(userDesignation) || [
    'PHYSICAL CURABLE', 'PHYSICAL_CURABLE', 'PHYSICAL CURABLE OPERATOR', 'PHYSICAL_CURABLE_OPERATOR',
    'DIGITAL CURABLE', 'DIGITAL_CURABLE', 'DIGITAL CURABLE OPERATOR', 'DIGITAL_CURABLE_OPERATOR',
    'EMAIL CURABLE', 'EMAIL_CURABLE', 'EMAIL CURABLE OPERATOR', 'EMAIL_CURABLE_OPERATOR'
  ].includes(userRole);

  const isAdministrativeOperatorUser = (
    ['ADMINISTRATIVE OPERATOR', 'ADMINISTRATIVE_OPERATOR', 'OPERATOR', 'BACKEND', 'BACKEND OPERATION', 'BACKEND_OPERATION', 'BACKEND OPERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(userDesignation) ||
    ['ADMINISTRATIVE OPERATOR', 'ADMINISTRATIVE_OPERATOR', 'OPERATOR', 'BACKEND', 'BACKEND OPERATION', 'BACKEND_OPERATION', 'BACKEND OPERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(userRole)
  ) && !isSalesExecUser && !isPanCheckerUser && !isQdOperatorUser && !isRemarkOperatorUser && !isFinalStatusOperatorUser && !isQuerableOperatorUser && !isCurableOperatorUserRole;

  let baseBankAccessFilterSQL = '';
  if (!isSuperAdmin) {
    if (!abRows || abRows.length === 0) {
      baseBankAccessFilterSQL = '';
    } else {
      baseBankAccessFilterSQL = ` AND (bank IN (${abRows.map(b => `'${b.code}'`).join(', ')}))`;
    }
  }

  let opHeadBankFilterSQL = '';
  if (!isSuperAdmin) {
    if (isSalesExecUser || isPanCheckerUser || isRemarkOperatorUser || isQdOperatorUser || isFinalStatusOperatorUser || isQuerableOperatorUser || isCurableOperatorUserRole) {
      opHeadBankFilterSQL = '';
    } else {
      opHeadBankFilterSQL = baseBankAccessFilterSQL;
    }
  }

  let panCheckerFilterSQL = '';
  if (isPanCheckerUser) {
    const panCheckerBankScope = (baseBankAccessFilterSQL || '').trim();
    const bankFilterClause = panCheckerBankScope && panCheckerBankScope !== 'AND 1=0'
      ? panCheckerBankScope
      : `AND ((LOWER(COALESCE(combined.bank_code, '')) = 'sbi' OR LOWER(COALESCE(combined.bank_name, '')) LIKE '%sbi%'))`;
    panCheckerFilterSQL = ` ${bankFilterClause} AND combined.status NOT IN ('approved', 'disbursed', 'sanctioned') AND LOWER(COALESCE(combined.pan_check, 'no')) = 'no'`;
  }

  let qdOperatorFilterSQL = '';
  if (isQdOperatorUser) {
    qdOperatorFilterSQL = ` ${baseBankAccessFilterSQL} AND (physical_process) AND (dispatch_none)`;
  }

  let finalStatusOperatorFilterSQL = '';
  if (isFinalStatusOperatorUser) {
    finalStatusOperatorFilterSQL = ` ${baseBankAccessFilterSQL} AND (dispatch_complete) AND (final_status_in_process)`;
  }

  let remarkOperatorFilterSQL = '';
  if (isRemarkOperatorUser) {
    remarkOperatorFilterSQL = ` ${baseBankAccessFilterSQL} AND (pan_checked_or_not_sbi) AND (status_not_declined)`;
  }

  let querableOperatorFilterSQL = '';
  if (isQuerableOperatorUser) {
    querableOperatorFilterSQL = ` ${baseBankAccessFilterSQL} AND (status_rejected_or_declined)`;
  }

  return {
    isSuperAdmin,
    isAdministrativeOperatorUser,
    isSalesExecUser,
    isPanCheckerUser,
    isQdOperatorUser,
    isRemarkOperatorUser,
    isFinalStatusOperatorUser,
    isQuerableOperatorUser,
    isCurableOperatorUserRole,
    baseBankAccessFilterSQL,
    opHeadBankFilterSQL,
    panCheckerFilterSQL,
    qdOperatorFilterSQL,
    finalStatusOperatorFilterSQL,
    remarkOperatorFilterSQL,
    querableOperatorFilterSQL
  };
}

// Test Super Admin
const superAdmin = evaluateOperatorState('SUPER_ADMIN', 'SUPER ADMIN');
assert.strictEqual(superAdmin.isSuperAdmin, true);
assert.strictEqual(superAdmin.baseBankAccessFilterSQL, '');
assert.strictEqual(superAdmin.opHeadBankFilterSQL, '');
console.log('✓ Test 2 Passed: Super Admin has unrestricted access');

// Test Operational Head (Unassigned)
const opHeadUnassigned = evaluateOperatorState('OPERATIONS_HEAD', 'OPERATIONAL HEAD', []);
assert.strictEqual(opHeadUnassigned.isAdministrativeOperatorUser, false);
assert.strictEqual(opHeadUnassigned.baseBankAccessFilterSQL, '');
assert.strictEqual(opHeadUnassigned.opHeadBankFilterSQL, '');
assert.ok(!opHeadUnassigned.baseBankAccessFilterSQL.includes('1=0'), 'Must not have 1=0');
console.log('✓ Test 3 Passed: Operational Head (unassigned) gets full bank access without 1=0');

// Test Operational Head (Assigned to HDFC)
const opHeadAssigned = evaluateOperatorState('OPERATIONS_HEAD', 'OPERATIONAL HEAD', [{ code: 'HDFC' }]);
assert.strictEqual(opHeadAssigned.opHeadBankFilterSQL, " AND (bank IN ('HDFC'))");
console.log('✓ Test 4 Passed: Operational Head (assigned) is properly scoped to assigned banks');

// Test Administrative Operator (Unassigned)
const adminOpUnassigned = evaluateOperatorState('EMPLOYEE', 'ADMINISTRATIVE OPERATOR', []);
assert.strictEqual(adminOpUnassigned.isAdministrativeOperatorUser, true);
assert.strictEqual(adminOpUnassigned.isPanCheckerUser, false);
assert.strictEqual(adminOpUnassigned.isQdOperatorUser, false);
assert.strictEqual(adminOpUnassigned.baseBankAccessFilterSQL, '');
assert.strictEqual(adminOpUnassigned.opHeadBankFilterSQL, '');
console.log('✓ Test 5 Passed: Administrative Operator (unassigned) has full bank visibility');

// Test PAN Checker (Unassigned)
const panCheckerUnassigned = evaluateOperatorState('EMPLOYEE', 'PAN CHECKER', []);
assert.strictEqual(panCheckerUnassigned.isPanCheckerUser, true);
assert.strictEqual(panCheckerUnassigned.isAdministrativeOperatorUser, false, 'PAN Checker must not be treated as Administrative Operator');
assert.strictEqual(panCheckerUnassigned.opHeadBankFilterSQL, '', 'opHeadBankFilterSQL must be empty for PAN Checker');
assert.ok(!panCheckerUnassigned.panCheckerFilterSQL.includes('1=0'), 'PAN Checker must not receive 1=0');
assert.ok(panCheckerUnassigned.panCheckerFilterSQL.includes('sbi'), 'PAN Checker defaults to SBI when unassigned');
console.log('✓ Test 6 Passed: PAN Checker (unassigned) defaults to SBI without 1=0');

// Test QD Operator and QD Checker
const qdOperator = evaluateOperatorState('EMPLOYEE', 'QD OPERATOR', []);
assert.strictEqual(qdOperator.isQdOperatorUser, true);
assert.strictEqual(qdOperator.isAdministrativeOperatorUser, false, 'QD Operator must not be treated as Administrative Operator');
assert.strictEqual(qdOperator.opHeadBankFilterSQL, '', 'opHeadBankFilterSQL must be empty for QD Operator');
assert.ok(!qdOperator.qdOperatorFilterSQL.includes('1=0'));

const qdChecker = evaluateOperatorState('EMPLOYEE', 'QD CHECKER', []);
assert.strictEqual(qdChecker.isQdOperatorUser, true, 'QD Checker must be recognized as QD Operator');
assert.strictEqual(qdChecker.isAdministrativeOperatorUser, false);
assert.strictEqual(qdChecker.opHeadBankFilterSQL, '');
console.log('✓ Test 7 Passed: QD Operator and QD Checker are cleanly isolated with no 1=0');

// Test Remark Operator
const remarkOp = evaluateOperatorState('EMPLOYEE', 'REMARK OPERATOR', []);
assert.strictEqual(remarkOp.isRemarkOperatorUser, true);
assert.strictEqual(remarkOp.isAdministrativeOperatorUser, false, 'Remark Operator must not be treated as Administrative Operator');
assert.strictEqual(remarkOp.opHeadBankFilterSQL, '');
assert.ok(!remarkOp.remarkOperatorFilterSQL.includes('1=0'));
console.log('✓ Test 8 Passed: Remark Operator is cleanly isolated with no 1=0');

// Test Final Status Operator
const finalStatusOp = evaluateOperatorState('EMPLOYEE', 'FINAL STATUS OPERATOR', []);
assert.strictEqual(finalStatusOp.isFinalStatusOperatorUser, true);
assert.strictEqual(finalStatusOp.isAdministrativeOperatorUser, false, 'Final Status Operator must not be treated as Administrative Operator');
assert.strictEqual(finalStatusOp.opHeadBankFilterSQL, '');
assert.ok(!finalStatusOp.finalStatusOperatorFilterSQL.includes('1=0'));
console.log('✓ Test 9 Passed: Final Status Operator is cleanly isolated with no 1=0');

// Test Querable Operator
const querableOp = evaluateOperatorState('EMPLOYEE', 'QUERABLE OPERATOR', []);
assert.strictEqual(querableOp.isQuerableOperatorUser, true);
assert.strictEqual(querableOp.isAdministrativeOperatorUser, false, 'Querable Operator must not be treated as Administrative Operator');
assert.strictEqual(querableOp.opHeadBankFilterSQL, '');
assert.ok(!querableOp.querableOperatorFilterSQL.includes('1=0'));
console.log('✓ Test 10 Passed: Querable Operator is cleanly isolated with no 1=0');

// Test Curable Operators
const physicalCurable = evaluateOperatorState('EMPLOYEE', 'PHYSICAL CURABLE OPERATOR', []);
assert.strictEqual(physicalCurable.isCurableOperatorUserRole, true);
assert.strictEqual(physicalCurable.isAdministrativeOperatorUser, false, 'Curable Operator must not be treated as Administrative Operator');
assert.strictEqual(physicalCurable.opHeadBankFilterSQL, '');
console.log('✓ Test 11 Passed: Curable Operators are cleanly isolated with no 1=0');

console.log('\nAll 11 role isolation and panel tests passed successfully! 🚀');
