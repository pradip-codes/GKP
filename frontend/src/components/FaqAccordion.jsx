import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { FAQ_CATEGORIES } from '../data/faqContent';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

/**
 * Shared categorized FAQ accordion — tap a question to reveal its answer.
 * Drop into any panel page (partner, employee, admin, HR, super-admin) or public page.
 *
 * Props:
 *  - categories: array of category ids to show (default: all)
 *  - title: heading text
 *  - accent: optional override colour (defaults to theme teal/primary)
 */
export default function FaqAccordion({ categories, title = 'Frequently Asked Questions', accent }) {
  const { C } = useTheme();
  const isMobile = useIsMobile();
  const [activeCategory, setActiveCategory] = useState(categories?.[0] || FAQ_CATEGORIES[0].id);
  const [openIndex, setOpenIndex] = useState(null);

  const visible = categories?.length
    ? FAQ_CATEGORIES.filter((c) => categories.includes(c.id))
    : FAQ_CATEGORIES;
  const current = visible.find((c) => c.id === activeCategory) || visible[0];
  if (!current) return null;

  const accentColor = accent || C.teal || C.primary || '#0F766E';

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: '16px',
      padding: isMobile ? '16px' : '22px',
    }}>
      <h3 style={{ margin: '0 0 14px 0', fontSize: isMobile ? '15px' : '17px', fontWeight: 900, color: C.text }}>
        {title}
      </h3>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '4px' }}>
        {visible.map((cat) => {
          const active = cat.id === current.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); }}
              style={{
                flexShrink: 0,
                padding: '7px 14px',
                borderRadius: '20px',
                border: `1px solid ${active ? accentColor : C.border}`,
                background: active ? accentColor : C.bgSecondary,
                color: active ? '#fff' : C.textMid,
                fontSize: '12px',
                fontWeight: active ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Q&A list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {current.items.map((item, idx) => {
          const open = openIndex === idx;
          return (
            <div key={idx} style={{
              background: C.bgSecondary,
              border: `1px solid ${C.border}`,
              borderRadius: '12px',
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setOpenIndex(open ? null : idx)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '13px 16px',
                  textAlign: 'left',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: C.text,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ flex: 1 }}>{item.q}</span>
                <span style={{ fontSize: '14px', color: C.textLight, flexShrink: 0 }}>{open ? '−' : '+'}</span>
              </button>
              {open && (
                <div style={{ padding: '0 16px 14px 16px', fontSize: '13px', color: C.textLight, lineHeight: 1.6 }}>
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
