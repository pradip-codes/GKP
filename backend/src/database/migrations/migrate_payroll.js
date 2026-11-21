const { query } = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Payroll & Payslip schema
 * - employee_salary_structures : per-employee salary breakup (falls back to employees.offered_salary)
 * - payroll_records            : computed monthly payroll per employee
 * - payslip_requests           : employee payslip download requests (HR approve/reject)
 * - employee_official_documents         : HR-uploaded official documents (PF, tax, certificates)
 */
async function migratePayroll() {
  try {
    // ── 1. Employee Salary Structures ──────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS employee_salary_structures (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        basic DECIMAL(12,2) NOT NULL DEFAULT 0,
        da DECIMAL(12,2) NOT NULL DEFAULT 0,
        hra DECIMAL(12,2) NOT NULL DEFAULT 0,
        special_allowance DECIMAL(12,2) NOT NULL DEFAULT 0,
        effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
        effective_to DATE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_emp_salary_struct_active ON employee_salary_structures(employee_id) WHERE is_active = true`);
    await query(`CREATE INDEX IF NOT EXISTS idx_emp_salary_struct_emp ON employee_salary_structures(employee_id)`);

    // ── 2. Payroll Records ─────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS payroll_records (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
        year INTEGER NOT NULL,
        working_days INTEGER NOT NULL DEFAULT 0,
        present_days NUMERIC(5,1) NOT NULL DEFAULT 0,
        leave_days NUMERIC(5,1) NOT NULL DEFAULT 0,
        lop_days NUMERIC(5,1) NOT NULL DEFAULT 0,
        late_count INTEGER NOT NULL DEFAULT 0,
        incentive_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        earnings JSONB NOT NULL DEFAULT '[]'::jsonb,
        deductions JSONB NOT NULL DEFAULT '[]'::jsonb,
        employer_contributions JSONB NOT NULL DEFAULT '[]'::jsonb,
        gross_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
        net_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (
          status IN ('DRAFT','PENDING_APPROVAL','APPROVED','PAID','REJECTED')
        ),
        rejection_reason TEXT,
        generated_by UUID REFERENCES users(id),
        approved_by UUID REFERENCES users(id),
        approved_at TIMESTAMPTZ,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_payroll_emp_month UNIQUE(employee_id, year, month)
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_payroll_emp ON payroll_records(employee_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_records(year, month)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll_records(status)`);

    // ── 3. Payslip Requests ────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS payslip_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        payroll_record_id UUID NOT NULL REFERENCES payroll_records(id) ON DELETE CASCADE,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
          status IN ('PENDING','APPROVED','REJECTED')
        ),
        rejection_reason TEXT,
        reviewed_by UUID REFERENCES users(id),
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_payslip_req_record UNIQUE(payroll_record_id)
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_payslip_req_emp ON payslip_requests(employee_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payslip_req_status ON payslip_requests(status)`);

    // ── 4. Employee Documents ──────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS employee_official_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        doc_type VARCHAR(30) NOT NULL CHECK (doc_type IN ('PAYSLIP','PF_STATEMENT','FORM16','SALARY_CERT','EMPLOYMENT_CERT','BANK_PROOF','OTHER')),
        name VARCHAR(200) NOT NULL,
        period VARCHAR(60),
        issued_on DATE,
        file_url TEXT,
        file_key VARCHAR(255),
        file_size BIGINT,
        mime_type VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','PENDING','ARCHIVED')),
        uploaded_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_emp_docs_emp ON employee_official_documents(employee_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_emp_docs_type ON employee_official_documents(doc_type)`);

    // ── 5. system_config table (may not exist yet) + payroll defaults ──────────
    await query(`
      CREATE TABLE IF NOT EXISTS system_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        config_key VARCHAR(100) UNIQUE NOT NULL,
        config_value TEXT NOT NULL,
        description TEXT,
        updated_by UUID REFERENCES users(id),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    const defaults = [
      ['payroll_min_salary_for_statutory', '16000', 'Minimum gross salary for PF & ESI deductions'],
      ['payroll_pf_rate', '0.12', 'Employee PF rate on (Basic + DA)'],
      ['payroll_pf_wage_ceiling', '15000', 'PF wage ceiling (max PFable wage)'],
      ['payroll_esi_employee_rate', '0.0075', 'Employee ESI rate on gross wages'],
      ['payroll_esi_employer_rate', '0.0325', 'Employer ESI rate on gross wages'],
      ['payroll_esi_wage_ceiling', '21000', 'ESI wage ceiling (no ESI above this gross)'],
      ['payroll_professional_tax', '200', 'Monthly professional tax amount'],
      ['payroll_late_fine_per_day', '50', 'Deduction per late attendance mark'],
      ['payroll_working_days_type', 'MON_SAT', 'Working-day calendar: MON_SAT']
    ];
    for (const [key, value, description] of defaults) {
      await query(
        `INSERT INTO system_config (config_key, config_value, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (config_key) DO NOTHING`,
        [key, value, description]
      );
    }

    logger.info('[MIGRATION COMPLETE] Payroll schema (salary structures, payroll records, payslip requests, employee documents) created.');
  } catch (err) {
    logger.error('Payroll Migration Error:', err);
    throw err;
  }
}

if (require.main === module) {
  migratePayroll()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migratePayroll };
