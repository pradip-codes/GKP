/**
 * Test Suite for Optimized Employee Search Algorithm
 * GharKaPaisa - Super Admin Employee Management
 */
const { query, pool } = require('../config/database');

async function runTests() {
  console.log('========================================================================');
  console.log('TESTING OPTIMIZED EMPLOYEE SEARCH ALGORITHM');
  console.log('========================================================================\n');

  try {
    // 1. Verify Trigram Indexes exist on RDS PostgreSQL
    console.log('--- TEST 1: Verify PostgreSQL GIN Trigram Indexes ---');
    const { rows: indexes } = await query(`
      SELECT indexname, indexdef FROM pg_indexes 
      WHERE tablename = 'employees' AND indexname LIKE 'idx_employees_trgm%';
    `);
    console.log(`Found ${indexes.length} trigram indexes on employees:`, indexes.map(i => i.indexname));
    if (indexes.length < 5) {
      throw new Error(`Expected at least 5 trigram indexes, found ${indexes.length}`);
    }
    console.log('✔ Test 1 Passed: Trigram indexes verified.\n');

    // 2. Fetch a reference employee to test against
    console.log('--- TEST 2: Fetch Reference Employee ---');
    const { rows: sampleEmps } = await query(`
      SELECT id, employee_id, full_name, mobile_number, email_id, designation, department 
      FROM employees 
      WHERE full_name IS NOT NULL AND employee_id IS NOT NULL AND mobile_number IS NOT NULL
      LIMIT 1;
    `);
    if (!sampleEmps.length) {
      throw new Error('No employee found to test search');
    }
    const target = sampleEmps[0];
    console.log('Test Target Employee:', {
      id: target.id,
      employee_id: target.employee_id,
      full_name: target.full_name,
      mobile_number: target.mobile_number,
      designation: target.designation
    });
    console.log('');

    // Helper to simulate the exact search query logic
    async function executeSearch(searchTerm) {
      const trimmedSearch = typeof searchTerm === 'string' ? searchTerm.trim() : '';
      let whereStr = `
        FROM employees e
        LEFT JOIN users u ON u.id = e.user_id
        LEFT JOIN employee_onboarding_checklist c ON c.employee_id = e.id
        LEFT JOIN employee_hierarchy h ON h.employee_id = e.id AND h.is_active = true
        LEFT JOIN employees tl ON tl.id = h.team_leader_id
        LEFT JOIN employees mgr ON mgr.id = h.manager_id
        LEFT JOIN employees sm ON sm.id = h.senior_manager_id
        LEFT JOIN employees bh ON bh.id = h.branch_head_id
        WHERE (u.role IS NULL OR u.role = 'EMPLOYEE')
          AND (e.designation NOT ILIKE '%HR%' AND e.designation NOT ILIKE '%Human Resource%')
      `;
      const params = [];
      let relevanceOrderClause = 'ORDER BY e.created_at DESC';
      let normalizedDigits = '';

      if (trimmedSearch) {
        const allDigits = trimmedSearch.replace(/[^0-9]/g, '');
        normalizedDigits = allDigits;
        if (allDigits.length === 12 && allDigits.startsWith('91')) {
          normalizedDigits = allDigits.slice(2);
        } else if (allDigits.length === 11 && allDigits.startsWith('0')) {
          normalizedDigits = allDigits.slice(1);
        }

        const rawTokens = trimmedSearch.split(/\s+/).filter(t => t.length > 0);
        const searchTokens = rawTokens.filter(t => {
          if (rawTokens.length > 1) {
            if (t === '+91' || t === '+91-' || t === '91' || t === '+') return false;
          }
          return true;
        });

        const tokenConditions = [];

        for (const token of searchTokens) {
          params.push(`%${token}%`);
          const tokenParam = `$${params.length}`;
          let tokenDigits = token.replace(/[^0-9]/g, '');
          if (tokenDigits.length === 12 && tokenDigits.startsWith('91')) {
            tokenDigits = tokenDigits.slice(2);
          } else if (tokenDigits.length === 11 && tokenDigits.startsWith('0')) {
            tokenDigits = tokenDigits.slice(1);
          }

          let mobileCond = `e.mobile_number ILIKE ${tokenParam}`;
          if (tokenDigits.length >= 3) {
            params.push(`%${tokenDigits}%`);
            mobileCond += ` OR regexp_replace(e.mobile_number, '[^0-9]', '', 'g') LIKE $${params.length}`;
          }

          tokenConditions.push(`(
            e.full_name ILIKE ${tokenParam}
            OR e.employee_id ILIKE ${tokenParam}
            OR ${mobileCond}
            OR e.email_id ILIKE ${tokenParam}
            OR e.designation ILIKE ${tokenParam}
            OR e.department ILIKE ${tokenParam}
            OR e.work_location ILIKE ${tokenParam}
          )`);
        }

        let phoneMatchClause = '';
        if (normalizedDigits.length >= 5) {
          params.push(`%${normalizedDigits}%`);
          phoneMatchClause = `regexp_replace(e.mobile_number, '[^0-9]', '', 'g') LIKE $${params.length}`;
        }

        if (tokenConditions.length > 0 && phoneMatchClause) {
          whereStr += ` AND ((${tokenConditions.join(' AND ')}) OR (${phoneMatchClause}))`;
        } else if (tokenConditions.length > 0) {
          whereStr += ` AND (${tokenConditions.join(' AND ')})`;
        } else if (phoneMatchClause) {
          whereStr += ` AND (${phoneMatchClause})`;
        }
      }

      const countRes = await query(`SELECT COUNT(DISTINCT e.id) as total ${whereStr}`, params);
      const totalRecords = parseInt(countRes.rows[0]?.total || 0);

      const queryParams = [...params];

      if (trimmedSearch) {
        queryParams.push(trimmedSearch);
        const exactParam = `$${queryParams.length}`;
        queryParams.push(`${trimmedSearch}%`);
        const prefixParam = `$${queryParams.length}`;
        let phoneParamRef = null;
        if (normalizedDigits.length >= 5) {
          queryParams.push(`%${normalizedDigits}%`);
          phoneParamRef = `$${queryParams.length}`;
        }

        relevanceOrderClause = `
          ORDER BY 
            CASE 
              WHEN LOWER(e.employee_id) = LOWER(${exactParam}) THEN 1
              WHEN LOWER(e.full_name) = LOWER(${exactParam}) THEN 2
              ${phoneParamRef ? `WHEN regexp_replace(e.mobile_number, '[^0-9]', '', 'g') LIKE ${phoneParamRef} THEN 3` : ''}
              WHEN LOWER(e.employee_id) LIKE LOWER(${prefixParam}) THEN 4
              WHEN LOWER(e.full_name) LIKE LOWER(${prefixParam}) THEN 5
              WHEN e.mobile_number LIKE ${prefixParam} THEN 6
              WHEN LOWER(e.email_id) LIKE LOWER(${prefixParam}) THEN 7
              ELSE 8
            END,
            e.created_at DESC
        `;
      }

      queryParams.push(20, 0);
      const selectFields = `SELECT e.id, e.employee_id, e.full_name, e.mobile_number, e.email_id, e.designation, e.department`;
      const fullQueryStr = `${selectFields} ${whereStr} ${relevanceOrderClause} LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

      const start = Date.now();
      const { rows } = await query(fullQueryStr, queryParams);
      const latencyMs = Date.now() - start;

      return { totalRecords, rows, latencyMs };
    }

    // 3. TEST 2: Exact Employee ID Search & Ranking
    console.log(`--- TEST 2: Exact Employee ID Search ("${target.employee_id}") ---`);
    const resId = await executeSearch(target.employee_id);
    console.log(`Matched: ${resId.totalRecords}, Latency: ${resId.latencyMs}ms`);
    if (resId.rows.length === 0 || resId.rows[0].employee_id !== target.employee_id) {
      throw new Error(`Expected first result to be ${target.employee_id}, got ${resId.rows[0]?.employee_id}`);
    }
    console.log(`✔ Top result is exact match: ${resId.rows[0].employee_id} (${resId.rows[0].full_name})`);
    console.log('✔ Test 2 Passed.\n');

    // 4. TEST 3: Multi-Word Name Search (Tokenized)
    const nameWords = target.full_name.trim().split(/\s+/);
    if (nameWords.length >= 2) {
      const reversedName = `${nameWords[1]} ${nameWords[0]}`;
      console.log(`--- TEST 3: Multi-Word Reversed Token Order Search ("${reversedName}") ---`);
      const resMulti = await executeSearch(reversedName);
      console.log(`Matched: ${resMulti.totalRecords}, Latency: ${resMulti.latencyMs}ms`);
      const foundTarget = resMulti.rows.some(r => r.id === target.id);
      if (!foundTarget) {
        throw new Error(`Target ${target.full_name} not found when searching reversed tokens "${reversedName}"`);
      }
      console.log(`✔ Found ${target.full_name} using reversed order tokens.`);
      console.log('✔ Test 3 Passed.\n');
    } else {
      console.log(`--- TEST 3: Single Word Name Search ("${nameWords[0]}") ---`);
      const resSingle = await executeSearch(nameWords[0]);
      console.log(`Matched: ${resSingle.totalRecords}, Latency: ${resSingle.latencyMs}ms`);
      if (!resSingle.rows.some(r => r.id === target.id)) {
        throw new Error(`Target ${target.full_name} not found when searching "${nameWords[0]}"`);
      }
      console.log('✔ Test 3 Passed.\n');
    }

    // 5. TEST 4: Formatted Phone Number Search
    const cleanPhone = target.mobile_number.replace(/[^0-9]/g, '');
    const formattedPhone = `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
    console.log(`--- TEST 4: Formatted Phone Search ("${formattedPhone}") ---`);
    const resPhone = await executeSearch(formattedPhone);
    console.log(`Matched: ${resPhone.totalRecords}, Latency: ${resPhone.latencyMs}ms`);
    if (!resPhone.rows.some(r => r.id === target.id)) {
      throw new Error(`Target ${target.full_name} not found when searching formatted phone "${formattedPhone}"`);
    }
    console.log(`✔ Matched mobile number ${target.mobile_number} through formatted search string.`);
    console.log('✔ Test 4 Passed.\n');

    // 6. TEST 5: Designation Search
    console.log(`--- TEST 5: Designation Search ("${target.designation}") ---`);
    const resDesg = await executeSearch(target.designation);
    console.log(`Matched: ${resDesg.totalRecords}, Latency: ${resDesg.latencyMs}ms`);
    if (!resDesg.rows.some(r => r.designation === target.designation)) {
      throw new Error(`No employees found with designation "${target.designation}"`);
    }
    console.log(`✔ Found employees with designation: ${target.designation}.`);
    console.log('✔ Test 5 Passed.\n');

    // 7. TEST 6: Connection Pool Health
    console.log('--- TEST 6: Connection Pool Health Check ---');
    console.log(`Pool Total: ${pool.totalCount}/${pool.options.max}`);
    console.log(`Pool Idle: ${pool.idleCount}`);
    console.log(`Pool Waiting: ${pool.waitingCount}`);
    if (pool.waitingCount > 0) {
      throw new Error('Pool waiting count is greater than zero');
    }
    console.log('✔ Pool health verified: Waiting requests = 0.\n');

    console.log('========================================================================');
    console.log('🎉 ALL OPTIMIZED SEARCH ALGORITHM TESTS PASSED SUCCESSFULLY');
    console.log('========================================================================');
    process.exit(0);
  } catch (err) {
    console.error('Search Algorithm Test Error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
