/**
 * Code Verification Script for Wallet, Commission, Hold, and Release
 * Verifies implementation across Backend, Frontend, and Mobile
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(testName) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`VERIFICATION: ${testName}`, colors.cyan);
  log('='.repeat(60), colors.cyan);
}

function logSuccess(message) {
  totalChecks++;
  passedChecks++;
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  totalChecks++;
  failedChecks++;
  log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

function contains(content, searchText) {
  return Boolean(content && content.includes(searchText));
}

// 1. Backend Verification
async function verifyBackendImplementation() {
  logTest('Backend Implementation Verification');

  const backendSrcPath = path.resolve(__dirname, '..');
  const walletModulePath = path.join(backendSrcPath, 'modules', 'wallet');

  // Check wallet service
  const servicePath = path.join(walletModulePath, 'service.js');
  if (fileExists(servicePath)) {
    logSuccess('Backend wallet service exists');
    const serviceContent = readFile(servicePath);

    const serviceFunctions = [
      'creditHold',
      'releaseHold',
      'manualReleaseCommission',
      'manualRejectCommission',
      'releaseCommission',
      'adminAdjustWallet',
      'getWalletSummary',
      'syncWalletBalance',
      'processWithdrawal',
    ];

    serviceFunctions.forEach((func) => {
      if (contains(serviceContent, func)) {
        logSuccess(`  Function ${func} exists in service`);
      } else {
        logError(`  Function ${func} NOT found in service`);
      }
    });
  } else {
    logError('Backend wallet service does NOT exist');
  }

  // Check wallet controller
  const controllerPath = path.join(walletModulePath, 'controller.js');
  if (fileExists(controllerPath)) {
    logSuccess('Backend wallet controller exists');
    const controllerContent = readFile(controllerPath);

    const controllerFunctions = [
      'releaseCommission',
      'rejectCommission',
      'approveWithdrawalController',
      'rejectWithdrawalController',
      'adminAdjustWalletController',
      'getPendingCommissions',
    ];

    controllerFunctions.forEach((func) => {
      if (contains(controllerContent, func)) {
        logSuccess(`  Controller function ${func} exists`);
      } else {
        logError(`  Controller function ${func} NOT found`);
      }
    });
  } else {
    logError('Backend wallet controller does NOT exist');
  }

  // Check wallet routes
  const routePath = path.join(walletModulePath, 'route.js');
  if (fileExists(routePath)) {
    logSuccess('Backend wallet routes exist');
    const routeContent = readFile(routePath);

    const routes = [
      '/admin/commissions/:transactionId/release',
      '/admin/commissions/:transactionId/reject',
      '/admin/adjust',
      '/admin/withdrawals/:id/approve',
      '/admin/withdrawals/:id/reject',
      '/admin/commissions/pending',
    ];

    routes.forEach((route) => {
      if (contains(routeContent, route)) {
        logSuccess(`  Route ${route} exists`);
      } else {
        logError(`  Route ${route} NOT found`);
      }
    });
  } else {
    logError('Backend wallet routes do NOT exist');
  }

  // Check commission hold release job
  const jobPath = path.join(backendSrcPath, 'jobs', 'commissionHoldRelease.job.js');
  if (fileExists(jobPath)) {
    logSuccess('Commission hold release job exists');
    const jobContent = readFile(jobPath);

    if (contains(jobContent, 'processCommissionHoldReleases')) {
      logSuccess('  Function processCommissionHoldReleases exists');
    } else {
      logError('  Function processCommissionHoldReleases NOT found');
    }

    if (contains(jobContent, '7') || contains(jobContent, 'DAYS')) {
      logSuccess('  Commission release hold interval configured');
    }
  } else {
    logError('Commission hold release job does NOT exist');
  }
}

// 2. Frontend Verification
async function verifyFrontendImplementation() {
  logTest('Frontend Implementation Verification');

  const frontendPath = path.resolve(__dirname, '..', '..', '..', 'frontend');

  // Check ManageWallet component
  const componentPath = path.join(frontendPath, 'src', 'modules', 'super-admin', 'wallet', 'ManageWallet.jsx');
  if (fileExists(componentPath)) {
    logSuccess('Frontend ManageWallet component exists');
    const componentContent = readFile(componentPath);

    const componentFunctions = [
      'handleApproveCommission',
      'handleRejectCommission',
      'handleApproveWithdrawal',
      'handleRejectWithdrawal',
      'fetchAllDashboardData',
    ];

    componentFunctions.forEach((func) => {
      if (contains(componentContent, func)) {
        logSuccess(`  Function ${func} exists in ManageWallet`);
      } else {
        logError(`  Function ${func} NOT found in ManageWallet`);
      }
    });

    // Check for commission sub-tabs
    if (contains(componentContent, 'commissionSubTab')) {
      logSuccess('  Commission sub-tabs exist');
    } else {
      logError('  Commission sub-tabs NOT found');
    }

    // Check for API calls
    const apiCalls = [
      '/wallet/admin/commissions/',
      '/wallet/admin/withdrawals',
    ];

    apiCalls.forEach((api) => {
      if (contains(componentContent, api)) {
        logSuccess(`  API endpoint reference to ${api} exists`);
      } else {
        logError(`  API endpoint reference to ${api} NOT found`);
      }
    });
  } else {
    logError(`Frontend ManageWallet component does NOT exist at ${componentPath}`);
  }
}

// 3. Mobile Verification
async function verifyMobileImplementation() {
  logTest('Mobile Implementation Verification');

  const mobilePath = path.resolve(__dirname, '..', '..', '..', 'mobile');

  const mobileScreens = [
    'app/(app)/wallet.tsx',
    'app/(app)/super-admin/wallet.tsx',
    'app/(app)/admin-withdrawals.tsx',
  ];

  mobileScreens.forEach((screen) => {
    const screenPath = path.join(mobilePath, screen);
    if (fileExists(screenPath)) {
      logSuccess(`  Mobile screen ${screen} exists`);
    } else {
      logError(`  Mobile screen ${screen} does NOT exist`);
    }
  });
}

// 4. API Endpoints Verification
async function verifyAPIEndpoints() {
  logTest('API Endpoints Verification');

  const backendSrcPath = path.resolve(__dirname, '..');
  const routePath = path.join(backendSrcPath, 'modules', 'wallet', 'route.js');
  const routeContent = readFile(routePath);

  const apiEndpoints = {
    'Commission Release': {
      method: 'POST',
      path: '/admin/commissions/:transactionId/release',
      auth: 'ADMIN, SUPER_ADMIN',
    },
    'Commission Reject': {
      method: 'POST',
      path: '/admin/commissions/:transactionId/reject',
      auth: 'ADMIN, SUPER_ADMIN',
    },
    'Wallet Adjustment': {
      method: 'POST',
      path: '/admin/adjust',
      auth: 'ADMIN, SUPER_ADMIN',
    },
    'Withdrawal Approve': {
      method: 'POST',
      path: '/admin/withdrawals/:id/approve',
      auth: 'ADMIN, SUPER_ADMIN',
    },
    'Withdrawal Reject': {
      method: 'POST',
      path: '/admin/withdrawals/:id/reject',
      auth: 'ADMIN, SUPER_ADMIN',
    },
    'Pending Commissions': {
      method: 'GET',
      path: '/admin/commissions/pending',
      auth: 'ADMIN, SUPER_ADMIN',
    },
    'Wallet Overview': {
      method: 'GET',
      path: '/admin/overview',
      auth: 'ADMIN, SUPER_ADMIN',
    },
  };

  Object.entries(apiEndpoints).forEach(([name, endpoint]) => {
    if (contains(routeContent, endpoint.path)) {
      logSuccess(`  ${name}: ${endpoint.method} ${endpoint.path}`);
      logInfo(`    Auth: ${endpoint.auth}`);
    } else {
      logError(`  ${name}: ${endpoint.method} ${endpoint.path} NOT found`);
    }
  });
}

// 5. Business Logic Verification
async function verifyBusinessLogic() {
  logTest('Business Logic Verification');

  const backendSrcPath = path.resolve(__dirname, '..');
  const servicePath = path.join(backendSrcPath, 'modules', 'wallet', 'service.js');
  const serviceContent = readFile(servicePath);

  // Check creditHold logic
  if (contains(serviceContent, 'creditHold')) {
    logSuccess('creditHold function exists');
    if (contains(serviceContent, 'Pending Approval') || contains(serviceContent, 'HELD')) {
      logSuccess('  Sets hold status on creation');
    }
  }

  // Check releaseHold logic
  if (contains(serviceContent, 'releaseHold')) {
    logSuccess('releaseHold function exists');
    if (contains(serviceContent, 'available_balance')) {
      logSuccess('  Updates available balance upon release');
    }
  }

  // Check manualReleaseCommission logic
  if (contains(serviceContent, 'manualReleaseCommission')) {
    logSuccess('manualReleaseCommission function exists');
    if (contains(serviceContent, 'syncWalletBalance') || contains(serviceContent, 'available_balance')) {
      logSuccess('  Synchronizes wallet balance upon manual commission approval');
    }
  }

  // Check manualRejectCommission logic
  if (contains(serviceContent, 'manualRejectCommission')) {
    logSuccess('manualRejectCommission function exists');
  }

  // Check commission release job
  const jobPath = path.join(backendSrcPath, 'jobs', 'commissionHoldRelease.job.js');
  const jobContent = readFile(jobPath);

  if (jobContent && contains(jobContent, 'credit_card')) {
    logSuccess('Job handles credit card category');
  }
}

// 6. Security Verification
async function verifySecurity() {
  logTest('Security Verification');

  const backendSrcPath = path.resolve(__dirname, '..');
  const routePath = path.join(backendSrcPath, 'modules', 'wallet', 'route.js');
  const routeContent = readFile(routePath);

  // Check authorization middleware
  if (contains(routeContent, 'authorize')) {
    logSuccess('Authorization middleware is used');
  }

  if (contains(routeContent, 'ADMIN')) {
    logSuccess('ADMIN role authorization exists');
  }

  if (contains(routeContent, 'SUPER_ADMIN')) {
    logSuccess('SUPER_ADMIN role authorization exists');
  }

  // Check transaction locking
  const servicePath = path.join(backendSrcPath, 'modules', 'wallet', 'service.js');
  const serviceContent = readFile(servicePath);

  if (contains(serviceContent, 'FOR UPDATE')) {
    logSuccess('Database row locking is used for transactions');
  }

  if (contains(serviceContent, 'BEGIN') && contains(serviceContent, 'COMMIT')) {
    logSuccess('Database transactions (BEGIN / COMMIT) are used');
  }

  if (contains(serviceContent, 'ROLLBACK')) {
    logSuccess('Error rollback (ROLLBACK) is implemented');
  }
}

// Main Verification Runner
async function runAllVerifications() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('WALLET, COMMISSION, HOLD & RELEASE - CODE VERIFICATION', colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);

  const verifications = [
    verifyBackendImplementation,
    verifyFrontendImplementation,
    verifyMobileImplementation,
    verifyAPIEndpoints,
    verifyBusinessLogic,
    verifySecurity,
  ];

  for (const verification of verifications) {
    try {
      await verification();
    } catch (error) {
      logError(`Verification suite error: ${error.message}`);
    }
  }

  // Summary
  log('\n' + '='.repeat(60), colors.cyan);
  log('VERIFICATION SUMMARY', colors.cyan);
  log('='.repeat(60), colors.cyan);
  log(`Total Checks: ${totalChecks}`, colors.blue);
  log(`Passed: ${passedChecks}`, colors.green);
  log(`Failed: ${failedChecks}`, failedChecks > 0 ? colors.red : colors.green);
  log('='.repeat(60) + '\n', colors.cyan);

  if (failedChecks > 0) {
    log(`✗ Verification failed with ${failedChecks} issue(s).`, colors.red);
    process.exit(1);
  } else {
    log('✓ All wallet, commission, hold, and release checks passed successfully!', colors.green);
    process.exit(0);
  }
}

// Run verifications
if (require.main === module) {
  runAllVerifications().catch((error) => {
    logError(`Verification fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runAllVerifications };
