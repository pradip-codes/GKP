import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * TickButton
 * ─────────────────────────────────────────────────────────────
 * 48px round interactive button for End-of-Day task completion.
 * Features:
 *   - Unticked: outlined grey circle with faint check icon.
 *   - Ticked: green fill, scale-bounce (1 -> 1.25 -> 1, 300ms).
 *   - SVG stroke-dashoffset checkmark drawing animation (350ms).
 *   - Ripple / confetti burst of 8 particles radiating outwards.
 *   - Accessible (aria-label, 48px touch target, focus visible).
 *   - Respects prefers-reduced-motion.
 */
export default function TickButton({
  isCompleted = false,
  onToggle,
  disabled = false,
  ariaLabel = 'Mark complete'
}) {
  const [burstActive, setBurstActive] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(media.matches);
      const listener = (e) => setPrefersReducedMotion(e.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, []);

  const handleClick = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isCompleted && !prefersReducedMotion) {
      setBurstActive(true);
      setTimeout(() => setBurstActive(false), 600);
    }
    onToggle && onToggle(!isCompleted);
  };

  // 8 confetti particles distributed in a circle
  const particles = [0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
    const rad = (angle * Math.PI) / 180;
    const distance = 26; // px outward
    const x = Math.cos(rad) * distance;
    const y = Math.sin(rad) * distance;
    return { id: i, x, y };
  });

  return (
    <div style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Particle burst */}
      <AnimatePresence>
        {burstActive && !prefersReducedMotion && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 10
            }}
          >
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, scale: 0.8, opacity: 1 }}
                animate={{ x: p.x, y: p.y, scale: 0, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: p.id % 2 === 0 ? '#10B981' : '#8DC22F'
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={isCompleted ? 'Mark task as incomplete' : ariaLabel}
        aria-pressed={isCompleted}
        animate={
          prefersReducedMotion
            ? { scale: 1 }
            : isCompleted
            ? { scale: [1, 1.25, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: isCompleted ? '2px solid #10B981' : '2px solid #CBD5E1',
          background: isCompleted ? '#10B981' : 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          outline: 'none',
          boxShadow: isCompleted ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
          transition: 'border-color 0.2s, background-color 0.2s, box-shadow 0.2s'
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isCompleted ? '#FFFFFF' : '#94A3B8'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isCompleted ? (
            <motion.path
              d="M5 13l4 4L19 7"
              initial={prefersReducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          ) : (
            <path d="M5 13l4 4L19 7" strokeOpacity="0.4" />
          )}
        </svg>
      </motion.button>
    </div>
  );
}
