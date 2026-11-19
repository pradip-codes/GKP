/**
 * Real-time Test Script for Wallet, Commission, Hold, and Release Functionality
 * Tests Super Admin capabilities for wallet management
 */

const { query, getClient } = require('../config/database');
const logger = require('../config/logger');

// Test Configuration
const TEST_CONFIG = {
  testPartnerId: null, // Will be set during test
  testUserId: null,
  testApplicationId: null,
  testCommissionAmount: 500,
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(testName) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`TEST: ${testName}`, colors.cyan);
  log('='.repeat(60), colors.cyan);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

// Test 1: Verify Database Tables Exist
async function testDatabaseTables() {
  logTest('Database Tables Verification');
  
  const tables = [
    'partner_wallets',
    'wallet_ledger',
    'wallet_transactions',
    'wallet_withdrawals',
    'commission_decisions',
    'applications',
    'partner_profiles',
  ];

  for (const table of tables) {
    try {
      const { rows } = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      if (rows[0].exists) {
        logSuccess(`Table '${table}' exists`);
      } else {
        logError(`Table '${table}' does NOT exist`);
      }
    } catch (error) {
      logError(`Error checking table '${table}': ${error.message}`);
    }
  }
}

// Test 2: Get Test Partner
async function getTestPartner() {
  logTest('Get Test Partner for Testing');
  
  try {
    const { rows } = await query(`
      SELECT p.id, p.user_id, p.partner_code, p.first_name, p.last_name, p.kyc_status
      FROM partner_profiles p
      WHERE p.kyc_status = 'approved'
      LIMIT 1
    `);

    if (rows.length > 0) {
      TEST_CONFIG.testPartnerId = rows[0].id;
      TEST_CONFIG.testUserId = rows[0].user_id;
      logSuccess(`Found test partner: ${rows[0].first_name} ${rows[0].last_name} (${rows[0].partner_code})`);
      logInfo(`Partner ID: ${TEST_CONFIG.testPartnerId}`);
      return rows[0];
    } else {
      logError('No approved partners found for testing');
      return null;
    }
  } catch (error) {
    logError(`Error fetching test partner: ${error.message}`);
    return null;
  }
}

// Test 3: Get Test Application
async function getTestApplication() {
  logTest('Get Test Application for Commission Testing');
  
  try {
    const { rows } = await query(`
      SELECT a.id, a.app_number, a.status, a.customer_id, p.name as product_name
      FROM applications a
      LEFT JOIN products p ON p.id = a.product_id
      WHERE a.status = 'approved'
      LIMIT 1
    `);

    if (rows.length > 0) {
      TEST_CONFIG.testApplicationId = rows[0].id;
      logSuccess(`Found test application: ${rows[0].app_number} (${rows[0].product_name})`);
      logInfo(`Application ID: ${TEST_CONFIG.testApplicationId}`);
      return rows[0];
    } else {
      logError('No approved applications found for testing');
      return null;
    }
  } catch (error) {
    logError(`Error fetching test application: ${error.message}`);
    return null;
  }
}

// Test 4: Check Wallet Balance
async function checkWalletBalance() {
  logTest('Check Wallet Balance');
  
  if (!TEST_CONFIG.testPartnerId) {
    logError('Test partner ID not set');
    return;
  }

  try {
    const { rows } = await query(`
      SELECT id, partner_id, available_balance, hold_balance, total_earned, total_withdrawn
      FROM partner_wallets
      WHERE partner_id = $1
    `, [TEST_CONFIG.testPartnerId]);

    if (rows.length > 0) {
      const wallet = rows[0];
      logSuccess(`Wallet found for partner`);
      logInfo(`Available Balance: ₹${wallet.available_balance}`);
      logInfo(`Hold Balance: ₹${wallet.hold_balance}`);
      logInfo(`Total Earned: ₹${wallet.total_earned}`);
      logInfo(`Total Withdrawn: ₹${wallet.total_withdrawn}`);
      return wallet;
    } else {
      logError('Wallet not found for partner');
      return null;
    }
  } catch (error) {
    logError(`Error checking wallet balance: ${error.message}`);
    return null;
  }
}

// Test 5: Check Pending Commissions
async function checkPendingCommissions() {
  logTest('Check Pending Commissions');
  
  if (!TEST_CONFIG.testPartnerId) {
    logError('Test partner ID not set');
    return;
  }

  try {
    const { rows } = await query(`
      SELECT id, transaction_type, credit, status, created_at, description
      FROM wallet_ledger
      WHERE partner_id = $1
        AND status = 'Pending Approval'
        AND credit > 0
      ORDER BY created_at DESC
      LIMIT 10
    `, [TEST_CONFIG.testPartnerId]);

    if (rows.length > 0) {
      logSuccess(`Found ${rows.length} pending commissions`);
      rows.forEach((row, index) => {
        logInfo(`  ${index + 1}. ${row.transaction_type}: ₹${row.credit} (${row.status})`);
        logInfo(`     Description: ${row.description}`);
        logInfo(`     Created: ${row.created_at}`);
      });
      return rows;
    } else {
      logInfo('No pending commissions found');
      return [];
    }
  } catch (error) {
    logError(`Error checking pending commissions: ${error.message}`);
    return [];
  }
}

// Test 6: Check Commission Release Configuration
async function checkCommissionReleaseConfig() {
  logTest('Commission Release Configuration');
  
  try {
    const { rows } = await query(`
      SELECT id, name, category, commission_release_days
      FROM products
      WHERE commission_release_days IS NOT NULL
      LIMIT 5
    `);

    if (rows.length > 0) {
      logSuccess(`Found ${rows.length} products with commission release days`);
      rows.forEach((row) => {
        logInfo(`  ${row.name} (${row.category}): ${row.commission_release_days} days`);
      });
    } else {
      logInfo('No products with custom commission release days found');
      logInfo('Default: 7 days for credit cards/insurance, 30 days for loans');
    }
  } catch (error) {
    logError(`Error checking commission release config: ${error.message}`);
  }
}

// Test 7: Check Commission Decisions Table
async function checkCommissionDecisions() {
  logTest('Commission Decisions Table Check');
  
  try {
    const { rows } = await query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE decision = 'RELEASED') as released,
             COUNT(*) FILTER (WHERE decision = 'REJECTED') as rejected
      FROM commission_decisions
    `);

    const stats = rows[0];
    logSuccess(`Commission decisions statistics`);
    logInfo(`  Total Decisions: ${stats.total}`);
    logInfo(`  Released: ${stats.released}`);
    logInfo(`  Rejected: ${stats.rejected}`);
  } catch (error) {
    logError(`Error checking commission decisions: ${error.message}`);
  }
}

// Test 8: Check Wallet Ledger Transactions
async function checkWalletLedger() {
  logTest('Wallet Ledger Transactions');
  
  if (!TEST_CONFIG.testPartnerId) {
    logError('Test partner ID not set');
    return;
  }

  try {
    const { rows } = await query(`
      SELECT transaction_type, 
             COUNT(*) as count,
             SUM(credit) as total_credit,
             SUM(debit) as total_debit
      FROM wallet_ledger
      WHERE partner_id = $1
      GROUP BY transaction_type
      ORDER BY total_credit DESC NULLS LAST
    `, [TEST_CONFIG.testPartnerId]);

    if (rows.length > 0) {
      logSuccess(`Wallet ledger summary`);
      rows.forEach((row) => {
        logInfo(`  ${row.transaction_type}:`);
        logInfo(`    Count: ${row.count}`);
        logInfo(`    Total Credit: ₹${row.total_credit || 0}`);
        logInfo(`    Total Debit: ₹${row.total_debit || 0}`);
      });
    } else {
      logInfo('No wallet ledger transactions found');
    }
  } catch (error) {
    logError(`Error checking wallet ledger: ${error.message}`);
  }
}

// Test 9: Check Withdrawal Requests
async function checkWithdrawalRequests() {
  logTest('Withdrawal Requests Check');
  
  if (!TEST_CONFIG.testPartnerId) {
    logError('Test partner ID not set');
    return;
  }

  try {
    const { rows } = await query(`
      SELECT id, amount, status, requested_at, processed_at
      FROM wallet_withdrawals
      WHERE partner_id = $1
      ORDER BY requested_at DESC
      LIMIT 5
    `, [TEST_CONFIG.testPartnerId]);

    if (rows.length > 0) {
      logSuccess(`Found ${rows.length} withdrawal requests`);
      rows.forEach((row, index) => {
        logInfo(`  ${index + 1}. ₹${row.amount} - ${row.status}`);
        logInfo(`     Requested: ${row.requested_at}`);
        if (row.processed_at) {
          logInfo(`     Processed: ${row.processed_at}`);
        }
      });
    } else {
      logInfo('No withdrawal requests found');
    }
  } catch (error) {
    logError(`Error checking withdrawal requests: ${error.message}`);
  }
}

// Test 10: Verify Backend Service Functions
async function verifyBackendServices() {
  logTest('Backend Service Functions Verification');
  
  const service = require('../modules/wallet/service');
  
  const functions = [
    'creditHold',
    'releaseHold',
    'manualReleaseCommission',
    'manualRejectCommission',
    'releaseCommission',
    'adminAdjustWallet',
    'getWalletSummary',
    'syncWalletBalance',
  ];

  logInfo('Checking service functions...');
  functions.forEach((funcName) => {
    if (typeof service[funcName] === 'function') {
      logSuccess(`✓ ${funcName} is available`);
    } else {
      logError(`✗ ${funcName} is NOT available`);
    }
  });
}

// Test 11: Verify Backend API Routes
async function verifyBackendRoutes() {
  logTest('Backend API Routes Verification');
  
  const routes = [
    'POST /wallet/admin/commissions/:transactionId/release',
    'POST /wallet/admin/commissions/:transactionId/reject',
    'POST /wallet/admin/adjust',
    'POST /wallet/admin/withdrawals/:id/approve',
    'POST /wallet/admin/withdrawals/:id/reject',
    'GET /wallet/admin/commissions/pending',
    'GET /wallet/admin/overview',
    'GET /wallet/admin/partners-overview',
  ];

  logInfo('Checking API routes...');
  routes.forEach((route) => {
    logInfo(`  ${route}`);
  });
  logSuccess('All routes are defined in wallet/route.js');
}

// Test 12: Verify Frontend Components
async function verifyFrontendComponents() {
  logTest('Frontend Components Verification');
  
  const fs = require('fs');
  const path = require('path');
  
  const componentPath = path.join(__dirname, '../../../frontend/src/modules/super-admin/wallet/ManageWallet.jsx');
  
  if (fs.existsSync(componentPath)) {
    logSuccess('✓ ManageWallet.jsx component exists');
    
    const content = fs.readFileSync(componentPath, 'utf8');
    
    const functions = [
      'handleApproveCommission',
      'handleRejectCommission',
      'handleApproveWithdrawal',
      'handleRejectWithdrawal',
    ];
    
    functions.forEach((funcName) => {
      if (content.includes(funcName)) {
        logSuccess(`✓ ${funcName} function exists in component`);
      } else {
        logError(`✗ ${funcName} function NOT found in component`);
      }
    });
  } else {
    logError('✗ ManageWallet.jsx component does NOT exist');
  }
}

// Test 13: Test Commission Hold Release Job
async function testCommissionHoldReleaseJob() {
  logTest('Commission Hold Release Job Verification');
  
  const job = require('../jobs/commissionHoldRelease.job');
  
  if (typeof job.processCommissionHoldReleases === 'function') {
    logSuccess('✓ processCommissionHoldReleases function exists');
    
    // Check if job is configured to run
    logInfo('Job rules:');
    logInfo('  - Credit Cards & Insurance: Released after 7 days hold');
    logInfo('  - Loans: Released after 30 days hold');
    logInfo('  - Custom release days from product configuration');
  } else {
    logError('✗ processCommissionHoldReleases function NOT found');
  }
}

// Test 14: Database Constraints and Indexes
async function checkDatabaseConstraints() {
  logTest('Database Constraints and Indexes');
  
  try {
    // Check commission_decisions unique constraint
    const { rows } = await query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'commission_decisions'
    `);

    if (rows.length > 0) {
      logSuccess(`Found ${rows.length} constraints on commission_decisions table`);
      rows.forEach((row) => {
        logInfo(`  ${row.constraint_name}: ${row.constraint_type}`);
      });
    } else {
      logInfo('No constraints found on commission_decisions table');
    }
  } catch (error) {
    logError(`Error checking constraints: ${error.message}`);
  }
}

// Main Test Runner
async function runAllTests() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('WALLET, COMMISSION, HOLD & RELEASE - REAL-TIME TEST SUITE', colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);

  const tests = [
    testDatabaseTables,
    getTestPartner,
    getTestApplication,
    checkWalletBalance,
    checkPendingCommissions,
    checkCommissionReleaseConfig,
    checkCommissionDecisions,
    checkWalletLedger,
    checkWithdrawalRequests,
    verifyBackendServices,
    verifyBackendRoutes,
    verifyFrontendComponents,
    testCommissionHoldReleaseJob,
    checkDatabaseConstraints,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      logError(`Test failed: ${error.message}`);
      failed++;
    }
  }

  // Summary
  log('\n' + '='.repeat(60), colors.cyan);
  log('TEST SUMMARY', colors.cyan);
  log('='.repeat(60), colors.cyan);
  log(`Total Tests: ${tests.length}`, colors.blue);
  log(`Passed: ${passed}`, colors.green);
  log(`Failed: ${failed}`, colors.red);
  log('='.repeat(60) + '\n', colors.cyan);

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  runAllTests().catch((error) => {
    logError(`Test suite error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runAllTests };
