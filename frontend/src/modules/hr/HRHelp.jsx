import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import FaqAccordion from '../../components/FaqAccordion';

// Dedicated HR Help & FAQ page — mirrors the panel's role-scoped knowledge base.
export default function HRHelp() {
  const { C, isDark } = useTheme();

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px 48px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>HR Help & FAQ</h1>
        <p style={{ fontSize: 13, color: C.textMid, marginTop: 6 }}>
          Candidate pipeline, payroll, onboarding and daily HR operations — answers for the HR panel.
        </p>
      </div>

      <FaqAccordion categories={['general', 'hr', 'employee']} title="HR Help & FAQ" />
    </div>
  );
}
