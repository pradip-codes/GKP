import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, CheckCircle2, Clock, AlertCircle, Calendar, 
  HelpCircle, Sparkles, Send, Loader2
} from 'lucide-react';
import TaskRow from './TaskRow';
import employeeCommitmentsService from '../../../../services/employeeCommitments.service';

/**
 * Screen 2: Today's Commitments Screen
 * ─────────────────────────────────────────────────────────────
 * Shows:
 *   A. Pending from earlier days (if any)
 *   B. Add task field with round "+" button and duplicate detection
 *   C. Today's numbered draft tasks with delete (x) button
 *   D. Sticky "Submit Commitments" button with counter chip & confirm modal
 */
export default function CommitmentsScreen({
  checkInTime,
  initialCarryOver = [],
  initialToday = [],
  onSubmitSuccess
}) {
  const [carryOverTasks, setCarryOverTasks] = useState(initialCarryOver);
  const [todayTasks, setTodayTasks] = useState(initialToday);
  const [taskInput, setTaskInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const inputRef = useRef(null);

  // Sync initial tasks when passed
  useEffect(() => {
    if (initialCarryOver && (initialCarryOver.length || carryOverTasks.length)) setCarryOverTasks(initialCarryOver);
    if (initialToday && (initialToday.length || todayTasks.length)) setTodayTasks(initialToday);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCarryOver, initialToday]);

  // Format check-in chip
  const formatCheckInTime = (iso) => {
    if (!iso) return 'Checked in today';
    try {
      const d = new Date(iso);
      return `Checked in ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } catch {
      return 'Checked in today';
    }
  };

  const todayDateFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Calculate heading for carried tasks
  const getCarriedHeading = () => {
    if (!carryOverTasks.length) return '';
    const firstDate = carryOverTasks[0].carried_from_date;
    if (!firstDate) return 'Pending from yesterday';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (firstDate === yesterdayStr) return 'Pending from yesterday';
    const d = new Date(firstDate);
    return `Pending from ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  };

  // Add Task Handler
  const handleAddTask = async (e) => {
    e && e.preventDefault();
    const clean = taskInput.trim();
    if (!clean) return;

    // Check duplicate (case-insensitive) across today & carry-over
    const isDuplicateToday = todayTasks.some((t) => t.title.toLowerCase().trim() === clean.toLowerCase());
    const isDuplicateCarry = carryOverTasks.some((t) => t.title.toLowerCase().trim() === clean.toLowerCase());

    if (isDuplicateToday || isDuplicateCarry) {
      setInputError('This task is already in your commitments list');
      return;
    }

    setInputError('');
    setLoadingAdd(true);

    try {
      const res = await employeeCommitmentsService.addDraftTask(clean);
      if (res.data) {
        setTodayTasks((prev) => [...prev, res.data]);
        setTaskInput('');
        inputRef.current && inputRef.current.focus();
      }
    } catch (err) {
      console.error('[ADD TASK ERROR]:', err);
      setInputError(err.response?.data?.message || err.message || 'Failed to add task');
    } finally {
      setLoadingAdd(false);
    }
  };

  // Delete Draft Task
  const handleDeleteTask = async (taskId) => {
    try {
      await employeeCommitmentsService.deleteDraftTask(taskId);
      setTodayTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('[DELETE TASK ERROR]:', err);
      alert(err.response?.data?.message || 'Failed to remove task');
    }
  };

  // Submit Commitments Handler
  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await employeeCommitmentsService.submitCommitments();
      setSubmitSuccess(true);
      setShowConfirmModal(false);
      setTimeout(() => {
        onSubmitSuccess && onSubmitSuccess(res);
      }, 700);
    } catch (err) {
      console.error('[SUBMIT COMMITMENTS ERROR]:', err);
      alert(err.response?.data?.message || 'Failed to submit commitments');
      setSubmitting(false);
    }
  };

  const totalTasksCount = todayTasks.length + carryOverTasks.length;
  const canSubmit = totalTasksCount >= 1;

  // Task counter chip label
  const counterChipLabel = carryOverTasks.length > 0
    ? `${todayTasks.length} task${todayTasks.length === 1 ? '' : 's'} today + ${carryOverTasks.length} pending`
    : `${todayTasks.length} task${todayTasks.length === 1 ? '' : 's'} planned`;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: '#F8FAFC',
        padding: '24px 16px 120px 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <div style={{ width: '100%', maxWidth: '640px' }}>
        {/* Header Block */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#101828', margin: 0 }}>
              Today's Commitments
            </h1>

            {/* Check-In Chip */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '16px',
                background: '#E8F7EF',
                color: '#008A60',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              <Clock size={13} />
              <span>{formatCheckInTime(checkInTime)}</span>
            </div>
          </div>

          <p style={{ fontSize: '13.5px', color: '#64748B', marginTop: '6px', marginBottom: 0 }}>
            {todayDateFormatted} • Plan and commit your goals for the day.
          </p>
        </motion.div>

        {/* Section A: Pending from Earlier Days (Carry-Over) */}
        {carryOverTasks.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px'
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Clock size={14} />
                {getCarriedHeading()}
              </span>
              <span
                style={{
                  background: '#FEF3C7',
                  color: '#92400E',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}
              >
                {carryOverTasks.length}
              </span>
            </div>

            {carryOverTasks.map((t, idx) => (
              <TaskRow
                key={t.id || idx}
                task={t}
                index={idx}
                mode="CARRY_OVER"
              />
            ))}
          </div>
        )}

        {/* Section B: Add Task Input */}
        <div style={{ marginBottom: '28px' }}>
          <form
            onSubmit={handleAddTask}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              width: '100%'
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={taskInput}
              onChange={(e) => {
                setTaskInput(e.target.value);
                if (inputError) setInputError('');
              }}
              placeholder="Add a task you will complete today"
              maxLength={255}
              disabled={loadingAdd}
              style={{
                width: '100%',
                height: '52px',
                paddingLeft: '18px',
                paddingRight: '56px',
                borderRadius: '16px',
                border: inputError ? '2px solid #EF4444' : '1px solid #CBD5E1',
                background: '#FFFFFF',
                fontSize: '14.5px',
                color: '#1E293B',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
            />

            {/* Round "+" Button on the RIGHT inside input row (44px touch target) */}
            <button
              type="submit"
              disabled={!taskInput.trim() || loadingAdd}
              aria-label="Add task"
              style={{
                position: 'absolute',
                right: '4px',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: 'none',
                background: taskInput.trim() ? '#008A60' : '#E2E8F0',
                color: taskInput.trim() ? '#FFFFFF' : '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: taskInput.trim() && !loadingAdd ? 'pointer' : 'default',
                transition: 'background-color 0.2s, transform 0.15s',
                outline: 'none'
              }}
            >
              {loadingAdd ? (
                <Loader2 size={18} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Plus size={22} />
              )}
            </button>
          </form>

          {/* Inline Duplicate / Empty Error */}
          {inputError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#EF4444',
                marginTop: '6px',
                marginBottom: 0,
                paddingLeft: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <AlertCircle size={13} />
              {inputError}
            </motion.p>
          )}
        </div>

        {/* Section C: Today's List */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#475569'
              }}
            >
              Today's Tasks
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
              {todayTasks.length} planned
            </span>
          </div>

          <AnimatePresence>
            {todayTasks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  padding: '36px 20px',
                  borderRadius: '16px',
                  border: '2px dashed #E2E8F0',
                  textAlign: 'center',
                  background: '#FFFFFF'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#F1F5F9',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto'
                  }}
                >
                  <Sparkles size={22} />
                </div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#334155', margin: '0 0 4px 0' }}>
                  No tasks added yet
                </p>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                  Add your first task in the field above to plan your day.
                </p>
              </motion.div>
            ) : (
              todayTasks.map((t, idx) => (
                <TaskRow
                  key={t.id || idx}
                  task={t}
                  index={idx}
                  mode="DRAFT"
                  onDelete={handleDeleteTask}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Section D: Sticky Submit Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid #E2E8F0',
          padding: '16px 20px',
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 50
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '640px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          {/* Task Counter Chip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 700,
              color: canSubmit ? '#008A60' : '#64748B'
            }}
          >
            <CheckCircle2 size={16} />
            <span>{counterChipLabel}</span>
          </div>

          {/* Submit Button */}
          <motion.button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={!canSubmit || submitting || submitSuccess}
            whileHover={canSubmit && !submitting ? { scale: 1.02 } : {}}
            whileTap={canSubmit && !submitting ? { scale: 0.98 } : {}}
            style={{
              padding: '14px 28px',
              borderRadius: '14px',
              border: 'none',
              background: submitSuccess
                ? '#10B981'
                : canSubmit
                ? '#008A60'
                : '#CBD5E1',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 800,
              cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
              boxShadow: canSubmit ? '0 4px 12px rgba(0, 138, 96, 0.25)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s',
              outline: 'none'
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Submitting...</span>
              </>
            ) : submitSuccess ? (
              <>
                <CheckCircle2 size={18} />
                <span>Unlocked!</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Submit Commitments</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Confirmation Dialog Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              zIndex: 100
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: '440px',
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '28px 24px',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: '#E8F7EF',
                  color: '#008A60',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto'
                }}
              >
                <HelpCircle size={28} />
              </div>

              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#101828', margin: '0 0 8px 0' }}>
                Submit Today's Commitments?
              </h2>

              <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, margin: '0 0 24px 0' }}>
                Once submitted you can't edit this list. You are committing to complete <strong>{totalTasksCount} task{totalTasksCount === 1 ? '' : 's'}</strong> today.
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    height: '46px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Go Back
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    height: '46px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#008A60',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {submitting ? (
                    <Loader2 size={18} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <span>Submit & Unlock</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
