const assert = require('assert');
const mockLocationDetection = require('../services/attendance/mockLocationDetection.service');

const now = Date.now();

const normalLocation = mockLocationDetection.detectWebMockLocation({
  accuracy: 10,
  timestamp: now,
  speed: 0,
  userAgent: 'Mozilla/5.0',
});
assert.strictEqual(normalLocation.isMock, false);

const lowAccuracyLocation = mockLocationDetection.detectWebMockLocation({
  accuracy: 40,
  timestamp: now,
  speed: 0,
  userAgent: 'Mozilla/5.0',
});
assert.strictEqual(lowAccuracyLocation.isMock, false);

const anomalousLocation = mockLocationDetection.detectWebMockLocation({
  accuracy: 10,
  timestamp: now,
  speed: 60,
  userAgent: 'HeadlessChrome',
});
assert.strictEqual(anomalousLocation.isMock, true);
assert.strictEqual(anomalousLocation.securityLevel, 'LOW');

console.log('Mock-location detection tests passed.');
