/**
 * Regression test for:
 * 1. Redis Cluster / AWS ElastiCache Serverless CROSSSLOT error in delPattern('app_list:*')
 * 2. Missing applications.vkyc_executive_code migration wiring on server boot & deploy.yml
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.SKIP_REMOTE_CACHE = 'true';

const cache = require('../services/cache.service');

(async () => {
  // 1. deleteRedisKeysClusterSafe must NEVER call multi-key DEL (would raise CROSSSLOT in cluster mode)
  const deleted = [];
  const strictClusterClient = {
    async del(arg) {
      if (Array.isArray(arg) || arguments.length !== 1 || typeof arg !== 'string') {
        throw new Error("CROSSSLOT Keys in request don't hash to the same slot");
      }
      deleted.push(arg);
      return 1;
    }
  };

  const sampleKeys = [
    'app_list:ADMIN:u1:hash1',
    'app_list:SUPER_ADMIN:u2:hash2',
    'app_list:ADMIN:u1:hash1', // duplicate should be deduped
    'app_list:KYC_OPERATOR:u3:hash3',
    '',
    null
  ];
  const count = await cache.deleteRedisKeysClusterSafe(strictClusterClient, sampleKeys, 2);
  assert.strictEqual(count, 3);
  assert.deepStrictEqual(deleted, [
    'app_list:ADMIN:u1:hash1',
    'app_list:SUPER_ADMIN:u2:hash2',
    'app_list:KYC_OPERATOR:u3:hash3'
  ]);
  console.log('✓ deleteRedisKeysClusterSafe sends single-key DEL commands (no CROSSSLOT)');

  // 2. cache.service.js source must not pass array/multi-key batches to redisClient.del
  const cacheSrc = fs.readFileSync(path.join(__dirname, '../services/cache.service.js'), 'utf8');
  assert(!/redisClient\.del\s*\(\s*(validBatch|flatKeys)\s*\)/.test(cacheSrc), 'must not pass multi-key arrays to redisClient.del');
  assert(cacheSrc.includes('deleteRedisKeysClusterSafe'), 'delPattern must use deleteRedisKeysClusterSafe');
  console.log('✓ cache.service.js delPattern uses cluster-safe single-key deletion');

  // 3. server.js and deploy.yml must run migrate_vkyc_executive_code
  const serverSrc = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  assert(serverSrc.includes('migrate_vkyc_executive_code'), 'server.js must run migrateVkycExecutiveCode on boot');
  assert(serverSrc.includes('await migrateVkycExecutiveCode()'), 'server.js must await migrateVkycExecutiveCode()');

  const deploySrc = fs.readFileSync(path.join(__dirname, '../../../.github/workflows/deploy.yml'), 'utf8');
  assert(deploySrc.includes('migrate_vkyc_executive_code.js'), 'deploy.yml must execute migrate_vkyc_executive_code.js');
  console.log('✓ server.js boot and deploy.yml run migrate_vkyc_executive_code');

  console.log('\n✓ All vkyc_executive_code & Redis CROSSSLOT regression tests passed!');
})().catch((err) => {
  console.error('✗ TEST FAILED:', err);
  process.exit(1);
});
