import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Clock, CheckCircle2, AlertTriangle, ArrowRight, 
  Sparkles, LogOut, Award, Loader2, Plus
} from 'lucide-react';
import TaskRow from './TaskRow';
import employeeCommitmentsService from '../../../../services/employeeCommitments.service';
import { useAuthStore } from '../../../../app/store/authStore';

/**
 * Screen 3: End-of-Day Review Modal (on Check-Out)
 * ─────────────────────────────────────────────────────────────
 * Sections in order:
 *   1. Pending from earlier days (carried tasks)
 *   2. Today's commitments
 *   3. Extra tasks completed today (added during review)
 * Each task has a 48px round TickButton with ripple & checkmark animations.
 * Sticky top summary bar with animated progress bar ("2 of 5 completed").
 * Dynamic footer note for uncompleted tasks: "X tasks are not completed. They will appear on top of tomorrow's list."
 * Summary card after check-out submission.
 */
export default function EndOfDayReviewModal({
  isOpen,
  onClose,
  allTasks = [],
  verificationSessionId = null,
  onCheckOutSuccess
}) {
  const logout = useAuthStore((state) => state.logout);
  const [tasks, setTasks] = useState(allTasks);
  const [completedIds, setCompletedIds] = useState([]);
  const [newExtraTitle, setNewExtraTitle] = useState('');
  const [addingExtra, setAddingExtra] = useState(false);
  const [extraError, setExtraError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [timeStr, setTimeStr] = useState('');

  // Sync tasks on open
  useEffect(() => {
    if (isOpen) {
      setTasks(allTasks);
      // Pre-select any tasks that are already marked completed
      const initialDone = allTasks.filter((t) => t.status === 'completed').map((t) => t.id);
      setCompletedIds(initialDone);
      setNewExtraTitle('');
      setExtraError('');
      setSummaryData(null);
    }
  }, [isOpen, allTasks]);

  // Live time ticker
  useEffect(() => {
    if (!isOpen) return;
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const carriedTasks = tasks.filter((t) => (t.carried_from_date !== null || (t.carry_count && t.carry_count > 0)) && t.task_type !== 'EXTRA');
  const todayTasks = tasks.filter((t) => t.carried_from_date === null && (!t.carry_count || t.carry_count === 0) && t.task_type !== 'EXTRA');
  const extraTasks = tasks.filter((t) => t.task_type === 'EXTRA');

  const totalTasks = tasks.length;
  const completedCount = completedIds.length;
  const pendingCount = Math.max(0, totalTasks - completedCount);
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const handleToggleTask = (taskId, isNowCompleted) => {
    setCompletedIds((prev) => {
      if (isNowCompleted) {
        return prev.includes(taskId) ? prev : [...prev, taskId];
      } else {
        return prev.filter((id) => id !== taskId);
      }
    });
  };

  const handleAddExtraTask = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setExtraError('');
    const trimmed = (newExtraTitle || '').trim();
    if (!trimmed) {
      setExtraError('Please enter a task title');
      return;
    }
    if (trimmed.length > 255) {
      setExtraError('Task title cannot exceed 255 characters');
      return;
    }

    // Case-insensitive duplicate check
    const isDuplicate = tasks.some(
      (t) => (t.title || '').trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setExtraError('A task with this title already exists today');
      return;
    }

    setAddingExtra(true);
    try {
      const res = await employeeCommitmentsService.addExtraTask(trimmed, true);
      const createdTask = res?.data;
      if (createdTask) {
        setTasks((prev) => [...prev, createdTask]);
        setCompletedIds((prev) => (prev.includes(createdTask.id) ? prev : [...prev, createdTask.id]));
        setNewExtraTitle('');
        setExtraError('');
      }
    } catch (err) {
      console.error('[ADD EXTRA TASK ERROR]:', err);
      setExtraError(err.response?.data?.message || err.message || 'Failed to add extra task');
    } finally {
      setAddingExtra(false);
    }
  };

  const handleSubmitCheckOut = async () => {
    if (!verificationSessionId) {
      alert('Face and location verification is required before check-out. Please restart check-out.');
      onClose && onClose();
      return;
    }

    setSubmitting(true);
    try {
      const res = await employeeCommitmentsService.checkOut({
        completedTaskIds: completedIds,
        verificationSessionId
      });
      setSummaryData(res.summary || {
        completedCount,
        pendingCount,
        totalWorkingHours: 'Recorded'
      });
      onCheckOutSuccess && onCheckOutSuccess(res);
    } catch (err) {
      console.error('[CHECK-OUT ERROR]:', err);
      alert(err.response?.data?.message || err.message || 'Failed to complete check-out');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#F8FAFC',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Summary Card View After Check-Out */}
      {summaryData ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'linear-gradient(135deg, #F5F8F7 0%, #E8F7EF 100%)'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '36px 28px',
              textAlign: 'center',
              boxShadow: '0 20px 40px -15px rgba(0, 138, 96, 0.15)'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#E8F7EF',
                color: '#008A60',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}
            >
              <Award size={36} />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#101828', margin: '0 0 8px 0' }}>
              Day Completed!
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px 0' }}>
              Your check-out and task reviews have been recorded successfully.
            </p>

            {/* Stats Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                background: '#F8FAFC',
                padding: '16px',
                borderRadius: '16px',
                marginBottom: '28px',
                border: '1px solid #E2E8F0'
              }}
            >
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', margin: '0 0 4px 0' }}>Completed</p>
                <p style={{ fontSize: '20px', fontWeight: 900, color: '#10B981', margin: 0 }}>
                  {summaryData.completedCount}
                </p>
              </div>

              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', margin: '0 0 4px 0' }}>Pending</p>
                <p style={{ fontSize: '20px', fontWeight: 900, color: '#F59E0B', margin: 0 }}>
                  {summaryData.pendingCount}
                </p>
              </div>

              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', margin: '0 0 4px 0' }}>Total Hours</p>
                <p style={{ fontSize: '18px', fontWeight: 900, color: '#008A60', margin: 0 }}>
                  {summaryData.totalWorkingHours || 'Completed'}
                </p>
              </div>
            </div>

            {summaryData.pendingCount > 0 && (
              <p
                style={{
                  fontSize: '13px',
                  color: '#92400E',
                  background: '#FEF3C7',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textAlign: 'left'
                }}
              >
                <Clock size={16} />
                <span>{summaryData.pendingCount} pending task{summaryData.pendingCount === 1 ? '' : 's'} will appear at the top of tomorrow's commitments list.</span>
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                onClose && onClose();
                logout && logout();
              }}
              style={{
                width: '100%',
                height: '50px',
                borderRadius: '14px',
                border: 'none',
                background: '#008A60',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <LogOut size={18} />
              <span>Done & Logout</span>
            </button>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Top Header */}
          <div
            style={{
              padding: '16px 20px',
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#101828', margin: 0 }}>
                End of Day Review
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                Check-out Time: <strong style={{ color: '#008A60' }}>{timeStr}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close review"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                background: '#F1F5F9',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Sticky Summary Bar: "X of Y completed" with Animated Progress Bar */}
          <div
            style={{
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              padding: '14px 20px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
            }}
          >
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1E293B' }}>
                  {completedCount} of {totalTasks} completed
                </span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#008A60' }}>
                  {progressPercent}%
                </span>
              </div>

              {/* Progress Track */}
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: '#E2E8F0',
                  overflow: 'hidden'
                }}
              >
                <motion.div
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  style={{
                    height: '100%',
                    background: progressPercent === 100
                      ? '#10B981'
                      : 'linear-gradient(90deg, #008A60 0%, #10B981 100%)',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Scrollable Tasks Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 20px 140px 20px'
            }}
          >
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              {/* Section 1: Pending from earlier days (carried tasks) */}
              {carriedTasks.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <h3
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#D97706',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Clock size={14} />
                    <span>Pending from earlier days ({carriedTasks.length})</span>
                  </h3>

                  {carriedTasks.map((t, idx) => (
                    <TaskRow
                      key={t.id || idx}
                      task={t}
                      index={idx}
                      mode="REVIEW"
                      isCompleted={completedIds.includes(t.id)}
                      onToggleComplete={(done) => handleToggleTask(t.id, done)}
                      disabled={submitting}
                    />
                  ))}
                </div>
              )}

              {/* Section 2: Today's tasks */}
              <div>
                <h3
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#475569',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>Today's tasks ({todayTasks.length})</span>
                </h3>

                {todayTasks.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>
                    No specific new tasks were planned today.
                  </p>
                ) : (
                  todayTasks.map((t, idx) => (
                    <TaskRow
                      key={t.id || idx}
                      task={t}
                      index={idx}
                      mode="REVIEW"
                      isCompleted={completedIds.includes(t.id)}
                      onToggleComplete={(done) => handleToggleTask(t.id, done)}
                      disabled={submitting}
                    />
                  ))
                )}
              </div>

              {/* Section 3: Extra Tasks Completed Today */}
              <div style={{ marginTop: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#6D3DF5',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Extra tasks completed today ({extraTasks.length})</span>
                  </h3>
                </div>

                {/* Add Extra Task Input Bar with Plus Button */}
                <form
                  onSubmit={handleAddExtraTask}
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: extraError ? '6px' : '16px'
                  }}
                >
                  <input
                    type="text"
                    placeholder="Add extra task completed today (not in morning commitments)..."
                    value={newExtraTitle}
                    onChange={(e) => {
                      setNewExtraTitle(e.target.value);
                      if (extraError) setExtraError('');
                    }}
                    disabled={submitting || addingExtra}
                    style={{
                      flex: 1,
                      height: '46px',
                      padding: '0 16px',
                      borderRadius: '12px',
                      border: extraError ? '1.5px solid #EF4444' : '1.5px solid #E2E8F0',
                      fontSize: '14px',
                      background: '#FFFFFF',
                      color: '#1E293B',
                      outline: 'none',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#6D3DF5'; }}
                    onBlur={(e) => { if (!extraError) e.target.style.borderColor = '#E2E8F0'; }}
                  />

                  <button
                    type="submit"
                    disabled={submitting || addingExtra || !newExtraTitle.trim()}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      border: 'none',
                      background: (!newExtraTitle.trim() || submitting || addingExtra)
                        ? '#E2E8F0'
                        : 'linear-gradient(135deg, #6D3DF5 0%, #8B5CF6 100%)',
                      color: (!newExtraTitle.trim() || submitting || addingExtra) ? '#94A3B8' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: (!newExtraTitle.trim() || submitting || addingExtra) ? 'not-allowed' : 'pointer',
                      flexShrink: 0,
                      boxShadow: newExtraTitle.trim() ? '0 4px 12px rgba(109, 61, 245, 0.25)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    title="Add Extra Task"
                  >
                    {addingExtra ? (
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Plus size={20} strokeWidth={2.5} />
                    )}
                  </button>
                </form>

                {extraError && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#DC2626',
                      marginBottom: '14px',
                      paddingLeft: '4px',
                      fontWeight: 600
                    }}
                  >
                    {extraError}
                  </div>
                )}

                {/* Render Extra Tasks */}
                {extraTasks.length === 0 ? (
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: '#F8FAFC',
                      border: '1px dashed #CBD5E1',
                      textAlign: 'center',
                      fontSize: '13px',
                      color: '#94A3B8',
                      fontStyle: 'italic'
                    }}
                  >
                    No extra tasks added. If you completed additional work not in your morning list, add it above!
                  </div>
                ) : (
                  extraTasks.map((t, idx) => (
                    <TaskRow
                      key={t.id || idx}
                      task={t}
                      index={idx}
                      mode="REVIEW"
                      isCompleted={completedIds.includes(t.id)}
                      onToggleComplete={(done) => handleToggleTask(t.id, done)}
                      disabled={submitting}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#FFFFFF',
              borderTop: '1px solid #E2E8F0',
              padding: '16px 20px',
              boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.05)',
              zIndex: 10
            }}
          >
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              {/* Uncompleted note before submit */}
              {pendingCount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: '#FEF3C7',
                    color: '#92400E',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    marginBottom: '12px'
                  }}
                >
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>{pendingCount} task{pendingCount === 1 ? '' : 's'}</strong> not completed. They will appear on top of tomorrow's list.
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmitCheckOut}
                disabled={submitting}
                style={{
                  width: '100%',
                  height: '52px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #008A60 0%, #007F5B 100%)',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: 800,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 6px 16px rgba(0, 138, 96, 0.3)',
                  outline: 'none'
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Submitting Review...</span>
                  </>
                ) : (
                  <>
                    <span>Submit & Check Out</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
