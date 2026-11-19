import React from 'react';
import { motion } from 'framer-motion';
import { X, Clock, Calendar, Sparkles } from 'lucide-react';
import TickButton from './TickButton';

/**
 * TaskRow Component
 * ─────────────────────────────────────────────────────────────
 * Renders an accessible task row with:
 *   - mode = 'DRAFT' (index number, title, delete button)
 *   - mode = 'CARRY_OVER' (read-only, amber badges, carry count)
 *   - mode = 'REVIEW' (tick button, left-to-right strikethrough, soft green highlight)
 */
export default function TaskRow({
  task,
  index,
  mode = 'DRAFT', // 'DRAFT' | 'CARRY_OVER' | 'REVIEW'
  isCompleted = false,
  onToggleComplete,
  onDelete,
  disabled = false
}) {
  const isCarried = !!task.carried_from_date || (task.carry_count && task.carry_count > 0);

  const formatCarriedDate = (dateStr) => {
    if (!dateStr) return 'earlier';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.08)' : '#FFFFFF'
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderRadius: '14px',
        border: isCompleted
          ? '1px solid rgba(16, 185, 129, 0.35)'
          : isCarried
          ? '1px solid #FDE68A'
          : task.task_type === 'EXTRA'
          ? '1px solid #E9D5FF'
          : '1px solid #E2E8F0',
        marginBottom: '10px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        transition: 'background-color 0.25s, border-color 0.25s'
      }}
    >
      {/* Left side: Index/Icon + Title + Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, paddingRight: '12px' }}>
        {mode === 'DRAFT' && typeof index === 'number' && (
          <span
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#F1F5F9',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {index + 1}
          </span>
        )}

        {isCarried && (
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Clock size={14} />
          </div>
        )}

        {!isCarried && task.task_type === 'EXTRA' && (
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#F3E8FF',
              color: '#6D3DF5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Sparkles size={13} />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: isCompleted ? '#64748B' : '#1E293B',
                wordBreak: 'break-word',
                transition: 'color 0.25s'
              }}
            >
              {task.title}
            </span>

            {/* Left to right strikethrough animation on completion */}
            {mode === 'REVIEW' && (
              <motion.div
                initial={false}
                animate={{ width: isCompleted ? '100%' : '0%' }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  height: '2px',
                  backgroundColor: '#10B981',
                  pointerEvents: 'none'
                }}
              />
            )}
          </div>

          {/* Badges for carried-over tasks */}
          {isCarried && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#B45309',
                  background: '#FEF3C7',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Calendar size={11} />
                Carried from {formatCarriedDate(task.carried_from_date || task.task_date)}
              </span>

              {task.carry_count > 1 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#92400E',
                    background: '#FDE68A',
                    padding: '2px 6px',
                    borderRadius: '8px'
                  }}
                >
                  x{task.carry_count}
                </span>
              )}
            </div>
          )}

          {/* Badges for Extra tasks */}
          {task.task_type === 'EXTRA' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#6D3DF5',
                  background: '#F3E8FF',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Sparkles size={11} />
                Extra Task
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Delete button or Tick button */}
      <div>
        {mode === 'DRAFT' && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            disabled={disabled}
            aria-label={`Remove task ${task.title}`}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              border: 'none',
              background: 'transparent',
              color: '#94A3B8',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s, color 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FEE2E2';
              e.currentTarget.style.color = '#EF4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#94A3B8';
            }}
          >
            <X size={18} />
          </button>
        )}

        {mode === 'REVIEW' && (
          <TickButton
            isCompleted={isCompleted}
            onToggle={onToggleComplete}
            disabled={disabled}
            ariaLabel={`Mark ${task.title} complete`}
          />
        )}
      </div>
    </motion.div>
  );
}
