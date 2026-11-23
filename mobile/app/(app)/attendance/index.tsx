import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  RefreshControl,
  TextInput,
} from 'react-native';
import apiClient from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import { Button, Card, LoadingState, ErrorState } from '../../../components';
import { Icon } from '../../../components/Icon';
import MobileAttendanceVerificationModal from '../../../components/MobileAttendanceVerificationModal';
import {
  getTodayAttendance,
  getMyAttendanceHistory,
  getMyAttendanceSummary,
  createVerificationSession,
  executeCheckIn,
  executeCheckOut,
  getEnrollmentStatus,
} from '../../../services/attendance.service';
import notificationService from '../../../services/notification.service';
import { isAttendanceEnabledForEmployee } from '../../../config/attendanceRollout';

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  check_in_time: string;
  check_out_time: string;
  status: string;
  verification_status: string;
  verification_reference: string;
  source: string;
  working_hours?: any;
  reminder?: { should_remind?: boolean; [key: string]: any };
  tasks?: AttendanceTask[];
}

interface AttendanceTask {
  id: string;
  task: string;
  status: 'PENDING' | 'COMPLETED';
  created_at: string;
  completed_at?: string;
}

interface MonthlySummary {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalHalfDay: number;
  totalLeave: number;
  totalMarkedDays: number;
  totalWorkingHoursFormatted: string;
}

export default function AttendanceScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeView, setActiveView] = useState<'DASHBOARD' | 'HISTORY' | 'SUMMARY'>('DASHBOARD');
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [actionType, setActionType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isFaceEnrolled, setIsFaceEnrolled] = useState<boolean | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  
  // Task Management State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showReportingModal, setShowReportingModal] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [tasks, setTasks] = useState<AttendanceTask[]>([]);
  const [reportingTasks, setReportingTasks] = useState<AttendanceTask[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);

  const checkAttendanceAccess = () => {
    return user ? isAttendanceEnabledForEmployee(user) : false;
  };

  const fetchTodayAttendance = async () => {
    try {
      const data = await getTodayAttendance();
      setTodayAttendance(data);
    } catch (err: any) {
      if (err.message && err.message.includes('KYC_PHOTO_NOT_FOUND')) {
        setError('KYC photograph is compulsory for attendance. Please upload your photo in the employee panel.');
      } else {
        setError(err.message || 'Failed to load today\'s attendance');
      }
    }
  };

  const fetchMonthlySummary = async () => {
    try {
      const data = await getMyAttendanceSummary({ month: selectedMonth, year: selectedYear });
      setMonthlySummary(data);
    } catch (err: any) {
      console.error('Error fetching monthly summary:', err);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const data = await getMyAttendanceHistory({ month: selectedMonth, year: selectedYear, limit: 31 });
      setAttendanceHistory(data?.records || []);
    } catch (err: any) {
      console.error('Error fetching attendance history:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([
      fetchTodayAttendance(),
      fetchMonthlySummary(),
      fetchAttendanceHistory(),
    ]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (checkAttendanceAccess()) {
      loadAllData();
      checkEnrollmentStatus();
    } else {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  const checkEnrollmentStatus = async () => {
    try {
      const status = await getEnrollmentStatus();
      setIsFaceEnrolled(status.is_enrolled);
    } catch (err) {
      console.error('Failed to check enrollment status:', err);
      setIsFaceEnrolled(true); // Default to true if check fails
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  const handleCheckIn = async () => {
    if (isFaceEnrolled === false) {
      router.push('/(app)/employee-onboarding' as any);
      return;
    }
    setActionType('CHECK_IN');
    setShowVerificationModal(true);
  };

  const handleCheckOut = async () => {
    setActionType('CHECK_OUT');
    setShowVerificationModal(true);
  };

  const handleVerificationSuccess = async (verifiedSessionId: string) => {
    setShowVerificationModal(false);
    setLoading(true);
    try {
      if (actionType === 'CHECK_IN') {
        const res = await executeCheckIn(verifiedSessionId);
        Alert.alert('Work Started', res.message || 'Check-in recorded successfully!');
        // Schedule 6:55 PM warning notification
        await notificationService.scheduleEndAttendanceWarning(user?.id || '');
        // Show task modal after check-in
        setShowTaskModal(true);
      } else {
        const res = await executeCheckOut(verifiedSessionId);
        Alert.alert('Work Ended', res.message || 'Check-out recorded successfully!');
        // Cancel the scheduled warning notification
        await notificationService.cancelEndAttendanceWarning();
        // Show reporting modal after check-out
        setShowReportingModal(true);
      }
      await loadAllData();
    } catch (err: any) {
      Alert.alert('Action Failed', err.message || 'Could not record attendance');
    } finally {
      setLoading(false);
    }
  };

  // Task Management Functions
  const handleAddTask = () => {
    if (!taskInput.trim()) {
      Alert.alert('Error', 'Please enter a task');
      return;
    }
    const newTask: AttendanceTask = {
      id: Date.now().toString(),
      task: taskInput.trim(),
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
    setTasks([...tasks, newTask]);
    setTaskInput('');
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const handleSaveTasks = async () => {
    if (tasks.length === 0) {
      Alert.alert('Error', 'Please add at least one task');
      return;
    }
    setTaskLoading(true);
    try {
      await apiClient.post('/attendance/tasks', { tasks });
      setShowTaskModal(false);
      setTasks([]);
      Alert.alert('Success', 'Tasks saved successfully');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save tasks');
    } finally {
      setTaskLoading(false);
    }
  };

  const handleFetchReportingTasks = async () => {
    setTaskLoading(true);
    try {
      const response = await apiClient.get('/attendance/tasks/today');
      setReportingTasks(response.data?.data?.tasks || []);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to fetch tasks');
    } finally {
      setTaskLoading(false);
    }
  };

  const handleMarkTaskComplete = async (taskId: string) => {
    try {
      await apiClient.patch(`/attendance/tasks/${taskId}`, { status: 'COMPLETED' });
      setReportingTasks(reportingTasks.map(t => 
        t.id === taskId ? { ...t, status: 'COMPLETED', completed_at: new Date().toISOString() } : t
      ));
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to mark task complete');
    }
  };

  const handleAddReportingTask = async () => {
    if (!taskInput.trim()) {
      Alert.alert('Error', 'Please enter a task');
      return;
    }
    setTaskLoading(true);
    try {
      await apiClient.post('/employee/tasks/extra', {
        title: taskInput.trim(),
        isCompleted: false,
      });
      setTaskInput('');
      await handleFetchReportingTasks();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add task');
    } finally {
      setTaskLoading(false);
    }
  };

  useEffect(() => {
    if (showReportingModal) {
      handleFetchReportingTasks();
    }
  }, [showReportingModal]);

  // Live clock — mirrors the website AttendanceDashboardCard ticking clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--';
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { weekday: 'short' });
  };

  const calculateWorkingHours = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return '--';
    const inTime = new Date(checkIn).getTime();
    const outTime = new Date(checkOut).getTime();
    const diffMs = outTime - inTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getAttendanceRate = () => {
    if (!monthlySummary || monthlySummary.totalMarkedDays === 0) return '0%';
    const rate = ((monthlySummary.totalPresent / monthlySummary.totalMarkedDays) * 100).toFixed(0);
    return `${rate}%`;
  };

  if (!checkAttendanceAccess()) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSubtitle}>Track your daily attendance</Text>
        </View>
        <View style={styles.centerContainer}>
          <Icon name="lock" size={48} color={colors.textLight} />
          <Text style={styles.lockTitle}>Attendance Not Available</Text>
          <Text style={styles.lockSubtitle}>Your employee account is not yet enabled for attendance tracking.</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSubtitle}>Track your daily attendance</Text>
        </View>
        <LoadingState message="Loading attendance data..." />
      </View>
    );
  }

  const isCheckedIn = !!todayAttendance?.check_in_time;
  const isCheckedOut = !!todayAttendance?.check_out_time;

  // Website AttendanceDashboardCard status logic
  const wh: any = todayAttendance?.working_hours;
  const shouldRemind = Boolean(todayAttendance?.reminder?.should_remind);
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const statusText = !isCheckedIn
    ? 'Ready to start'
    : !isCheckedOut
      ? (shouldRemind ? 'Shift hours ended' : 'Work in progress')
      : 'Work completed';
  const statusStyle = !isCheckedIn
    ? { bg: '#EFF6FF', border: '#DBEAFE', text: '#0B74F6' }
    : !isCheckedOut
      ? (shouldRemind
          ? { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' }
          : { bg: '#FEF3C7', border: '#FDE68A', text: '#D97706' })
      : { bg: '#DCFCE7', border: '#BBF7D0', text: '#16A34A' };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance</Text>
        <Text style={styles.headerSubtitle}>Track your daily attendance</Text>
      </View>

      {activeView === 'DASHBOARD' && (
        <>
          {/* Main card — mirrors website AttendanceDashboardCard */}
          {loading && isFaceEnrolled === null ? (
            <Card style={styles.mainCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.mainCardLoading}>Loading attendance details...</Text>
            </Card>
          ) : isFaceEnrolled === false ? (
            <Card style={styles.mainCard}>
              <Text style={styles.clockDateSmall}>{now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Text>
              <Text style={styles.clockTime}>{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
              <View style={styles.warnBox}>
                <View style={styles.warnIconCircle}>
                  <Icon name="alert-circle" size={22} color="#D97706" />
                </View>
                <Text style={styles.warnTitle}>Face Verification Required</Text>
                <Text style={styles.warnText}>
                  KYC face verification is not completed for your account. Please complete face verification before marking attendance.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push('/(app)/employee-onboarding' as any)}
                activeOpacity={0.85}
              >
                <Icon name="shield-check" size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>Verify</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push('/(app)/employee-dashboard' as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <Card style={styles.mainCard}>
              <Text style={styles.clockDate}>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
              <Text style={styles.clockTime}>{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
              {wh?.start_time && wh?.end_time ? (
                <View style={styles.shiftRow}>
                  <Icon name="time" size={13} color={colors.textMid} />
                  <Text style={styles.shiftText}>Shift: {wh.start_time} - {wh.end_time}</Text>
                </View>
              ) : null}

              <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                <View style={[styles.statusDot, { backgroundColor: statusStyle.text }]} />
                <Text style={[styles.statusPillText, { color: statusStyle.text }]}>Status: {statusText}</Text>
              </View>

              {shouldRemind && (
                <View style={styles.remindBox}>
                  <View style={styles.warnIconCircle}>
                    <Icon name="alert-circle" size={18} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.warnTitle}>Working Hours Ended</Text>
                    <Text style={styles.warnText}>Your assigned working hours have ended. Please complete your attendance checkout.</Text>
                  </View>
                </View>
              )}

              {!isCheckedIn ? (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleCheckIn}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Icon name="flash" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>Start Work</Text>
                </TouchableOpacity>
              ) : !isCheckedOut ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, shouldRemind && { backgroundColor: '#D97706' }]}
                  onPress={handleCheckOut}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Icon name="log-out" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>{shouldRemind ? 'End Attendance' : 'End Work'}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.completedBtn}>
                  <Icon name="check-circle" size={18} color="#16A34A" />
                  <Text style={styles.completedBtnText}>Work Completed</Text>
                </View>
              )}

              <View style={styles.linkCol}>
                <TouchableOpacity style={styles.linkRow} onPress={() => setActiveView('HISTORY')} activeOpacity={0.7}>
                  <View style={styles.linkRowLeft}>
                    <Icon name="time" size={15} color={colors.textMid} />
                    <Text style={styles.linkText}>View Attendance History</Text>
                  </View>
                  <Text style={styles.linkArrow}>→</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkRow} onPress={() => setActiveView('SUMMARY')} activeOpacity={0.7}>
                  <View style={styles.linkRowLeft}>
                    <Icon name="bar-chart" size={15} color={colors.textMid} />
                    <Text style={styles.linkText}>Attendance Summary</Text>
                  </View>
                  <Text style={styles.linkArrow}>→</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {/* Today's Session — mirrors website "Today's Activity" card */}
          {(isCheckedIn || isCheckedOut) && activeView === 'DASHBOARD' && isFaceEnrolled !== false && (
            <Card style={styles.sessionCard}>
              <View style={styles.sessionTitleRow}>
                <Icon name="time" size={15} color="#0B74F6" />
                <Text style={styles.sessionTitle}>Today's Session</Text>
              </View>
              <View style={styles.sessionGrid}>
                <View style={styles.sessionBox}>
                  <Text style={styles.sessionLabel}>START TIME</Text>
                  <Text style={styles.sessionValue}>{formatTime(todayAttendance?.check_in_time || '')}</Text>
                </View>
                <View style={styles.sessionBox}>
                  <Text style={styles.sessionLabel}>END TIME</Text>
                  <Text style={[styles.sessionValue, !isCheckedOut && { color: '#9CA3AF' }]}>{formatTime(todayAttendance?.check_out_time || '')}</Text>
                </View>
              </View>
              <View style={styles.sessionFooter}>
                <Text style={styles.sessionFooterLabel}>Verification:</Text>
                <View style={styles.sessionFooterRight}>
                  <Icon name="shield-check" size={13} color="#16A34A" />
                  <Text style={styles.sessionFooterValue}>Biometric Verified</Text>
                </View>
              </View>
            </Card>
          )}
        </>
      )}

      {/* Attendance History view */}
      {activeView === 'HISTORY' && (
        <>
          <View style={styles.viewHeaderRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setActiveView('DASHBOARD')}>
              <Icon name="arrow-left" size={16} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.viewTitle}>Attendance History</Text>
              <Text style={styles.viewSubtitle}>Your daily check-in records</Text>
            </View>
          </View>

          <MonthYearPicker
            month={selectedMonth}
            year={selectedYear}
            onMonth={setSelectedMonth}
            onYear={setSelectedYear}
            colors={colors}
            isDark={false}
          />

          <View style={styles.histStatsRow}>
            <View style={styles.histStat}>
              <Text style={styles.histStatValue}>{monthlySummary?.totalMarkedDays || 0}</Text>
              <Text style={styles.histStatLabel}>Total Days</Text>
            </View>
            <View style={styles.histStat}>
              <Text style={[styles.histStatValue, { color: '#16A34A' }]}>{monthlySummary?.totalPresent || 0}</Text>
              <Text style={styles.histStatLabel}>Present</Text>
            </View>
            <View style={styles.histStat}>
              <Text style={[styles.histStatValue, { color: '#9333EA' }]}>{monthlySummary?.totalWorkingHoursFormatted || '0h 0m'}</Text>
              <Text style={styles.histStatLabel}>Work Hours</Text>
            </View>
            <View style={styles.histStat}>
              <Text style={[styles.histStatValue, { color: '#D97706' }]}>{getAttendanceRate()}</Text>
              <Text style={styles.histStatLabel}>Attendance</Text>
            </View>
          </View>

          {attendanceHistory.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Icon name="calendar" size={40} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No attendance records yet</Text>
              <Text style={styles.emptyText}>Your attendance history will appear here after you complete your first check-in.</Text>
              <Button title="Mark Check-In" onPress={handleCheckIn} style={styles.emptyButton} />
            </Card>
          ) : (
            attendanceHistory.map((record) => (
              <TouchableOpacity
                key={record.id}
                style={[styles.recordCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  setSelectedRecord(record);
                  setShowDetailModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.recordTopRow}>
                  <View>
                    <Text style={[styles.recordDate, { color: colors.text }]}>{formatDate(record.attendance_date)}</Text>
                    <Text style={[styles.recordDay, { color: colors.textMid }]}>{getDayName(record.attendance_date)}</Text>
                  </View>
                  <View style={styles.recordStatusWrap}>
                    <Text style={styles.recordStatus}>{record.check_in_time && record.check_out_time ? 'Work Completed' : record.check_in_time ? 'Working' : record.status || 'Not Started'}</Text>
                    {record.verification_status === 'VERIFIED' ? (
                      <Icon name="check-circle" size={15} color={colors.success} />
                    ) : (
                      <Icon name="x-circle" size={15} color={colors.error} />
                    )}
                  </View>
                </View>
                <View style={styles.recordTimesRow}>
                  <View style={styles.recordTimeBox}>
                    <Text style={[styles.recordTimeLabel, { color: colors.textLight }]}>Start</Text>
                    <Text style={[styles.recordTimeValue, { color: colors.text }]}>{formatTime(record.check_in_time)}</Text>
                  </View>
                  <View style={styles.recordTimeBox}>
                    <Text style={[styles.recordTimeLabel, { color: colors.textLight }]}>End</Text>
                    <Text style={[styles.recordTimeValue, { color: colors.text }]}>{formatTime(record.check_out_time)}</Text>
                  </View>
                  <View style={styles.recordTimeBox}>
                    <Text style={[styles.recordTimeLabel, { color: colors.textLight }]}>Duration</Text>
                    <Text style={[styles.recordTimeValue, { color: colors.text }]}>{calculateWorkingHours(record.check_in_time, record.check_out_time)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </>
      )}

      {/* Attendance Summary view */}
      {activeView === 'SUMMARY' && (
        <>
          <View style={styles.viewHeaderRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setActiveView('DASHBOARD')}>
              <Icon name="arrow-left" size={16} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.viewTitle}>Attendance Summary</Text>
              <Text style={styles.viewSubtitle}>Monthly breakdown & totals</Text>
            </View>
          </View>

          <MonthYearPicker
            month={selectedMonth}
            year={selectedYear}
            onMonth={setSelectedMonth}
            onYear={setSelectedYear}
            colors={colors}
            isDark={false}
          />

          <View style={styles.histStatsRow}>
            <View style={styles.histStat}>
              <Text style={styles.histStatValue}>{monthlySummary?.totalMarkedDays || 0}</Text>
              <Text style={styles.histStatLabel}>Total Days</Text>
            </View>
            <View style={styles.histStat}>
              <Text style={[styles.histStatValue, { color: '#16A34A' }]}>{monthlySummary?.totalPresent || 0}</Text>
              <Text style={styles.histStatLabel}>Present Days</Text>
            </View>
            <View style={styles.histStat}>
              <Text style={[styles.histStatValue, { color: '#9333EA' }]}>{monthlySummary?.totalWorkingHoursFormatted || '0h 0m'}</Text>
              <Text style={styles.histStatLabel}>Work Hours</Text>
            </View>
          </View>

          <Card style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Day Breakdown</Text>
            <View style={styles.breakdownGrid}>
              {[
                { label: 'Present', value: monthlySummary?.totalPresent || 0, color: '#16A34A' },
                { label: 'Late', value: monthlySummary?.totalLate || 0, color: '#CA8A04' },
                { label: 'Half Day', value: monthlySummary?.totalHalfDay || 0, color: '#A16207' },
                { label: 'Leave', value: monthlySummary?.totalLeave || 0, color: '#4F46E5' },
                { label: 'Absent', value: monthlySummary?.totalAbsent || 0, color: '#DC2626' },
              ].map((item) => (
                <View key={item.label} style={[styles.breakdownBox, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                  <Text style={[styles.breakdownLabel, { color: item.color }]}>{item.label}</Text>
                  <Text style={[styles.breakdownValue, { color: item.color }]}>{item.value}</Text>
                </View>
              ))}
            </View>
          </Card>
        </>
      )}

      {/* Verification Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attendance Verification</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Icon name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.verificationDetails}>
              <View style={styles.verificationItem}>
                <Icon name="check-circle" size={20} color={colors.success} />
                <Text style={styles.verificationText}>Face Verified</Text>
              </View>
              <View style={styles.verificationItem}>
                <Icon name="check-circle" size={20} color={colors.success} />
                <Text style={styles.verificationText}>Liveness Verified</Text>
              </View>
              <View style={styles.verificationItem}>
                <Icon name="check-circle" size={20} color={colors.success} />
                <Text style={styles.verificationText}>Office Environment Verified</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Verification Reference</Text>
              <Text style={styles.detailValue}>{selectedRecord?.verification_reference || 'N/A'}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(selectedRecord?.attendance_date || '')}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Check-In</Text>
              <Text style={styles.detailValue}>{formatTime(selectedRecord?.check_in_time || '')}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Check-Out</Text>
              <Text style={styles.detailValue}>{formatTime(selectedRecord?.check_out_time || '')}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Source</Text>
              <Text style={styles.detailValue}>{selectedRecord?.source || 'WEB'}</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Biometric & Geofence Attendance Verification Modal */}
      <MobileAttendanceVerificationModal
        visible={showVerificationModal}
        actionType={actionType}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={handleVerificationSuccess}
      />

      {/* Task Entry Modal */}
      <Modal visible={showTaskModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Today's Tasks</Text>
              <TouchableOpacity onPress={() => setShowTaskModal(false)}>
                <Icon name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.taskInputContainer}>
              <TextInput
                style={styles.taskInput}
                placeholder="Enter task..."
                value={taskInput}
                onChangeText={setTaskInput}
                onSubmitEditing={handleAddTask}
              />
              <TouchableOpacity style={styles.addTaskButton} onPress={handleAddTask}>
                <Icon name="plus" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.taskList}>
              {tasks.length === 0 ? (
                <Text style={styles.emptyTaskText}>No tasks added yet</Text>
              ) : (
                tasks.map((task, index) => (
                  <View key={task.id} style={styles.taskItem}>
                    <Text style={styles.taskIndex}>{index + 1}.</Text>
                    <Text style={styles.taskText}>{task.task}</Text>
                    <TouchableOpacity onPress={() => handleRemoveTask(task.id)}>
                      <Icon name="x" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <Button
              title={taskLoading ? 'Saving...' : 'Save Tasks'}
              onPress={handleSaveTasks}
              disabled={taskLoading || tasks.length === 0}
              style={styles.saveButton}
            />
          </View>
        </View>
      </Modal>

      {/* Task Reporting Modal */}
      <Modal visible={showReportingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Task Reporting</Text>
              <TouchableOpacity onPress={() => setShowReportingModal(false)}>
                <Icon name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.taskInputContainer}>
              <TextInput
                style={styles.taskInput}
                placeholder="Add new task..."
                value={taskInput}
                onChangeText={setTaskInput}
                onSubmitEditing={handleAddReportingTask}
              />
              <TouchableOpacity style={styles.addTaskButton} onPress={handleAddReportingTask}>
                <Icon name="plus" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.taskList}>
              {taskLoading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : reportingTasks.length === 0 ? (
                <Text style={styles.emptyTaskText}>No tasks to report</Text>
              ) : (
                reportingTasks.map((task) => (
                  <View key={task.id} style={styles.reportingTaskItem}>
                    <TouchableOpacity
                      style={styles.taskCheckbox}
                      onPress={() => handleMarkTaskComplete(task.id)}
                    >
                      <View style={[
                        styles.checkbox,
                        task.status === 'COMPLETED' && styles.checkboxChecked
                      ]}>
                        {task.status === 'COMPLETED' && (
                          <Icon name="check" size={14} color="#fff" />
                        )}
                      </View>
                    </TouchableOpacity>
                    <Text style={[
                      styles.taskText,
                      task.status === 'COMPLETED' && styles.taskCompleted
                    ]}>
                      {task.task}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <Button
              title="Close"
              onPress={() => setShowReportingModal(false)}
              style={styles.saveButton}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Horizontal month + year chip selector — mobile equivalent of the website's dropdowns */
function MonthYearPicker({ month, year, onMonth, onYear, colors }: {
  month: number;
  year: number;
  onMonth: (m: number) => void;
  onYear: (y: number) => void;
  colors: any;
  isDark: boolean;
}) {
  const years = [year - 2, year - 1, year, year + 1, year + 2];
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
        {MONTH_NAMES.map((m, i) => {
          const active = month === i + 1;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => onMonth(i + 1)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 14,
                backgroundColor: active ? colors.primary : colors.bgSecondary,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : colors.textMid }}>{m}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2, marginTop: 6 }}>
        {years.map((y) => {
          const active = year === y;
          return (
            <TouchableOpacity
              key={y}
              onPress={() => onYear(y)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 14,
                backgroundColor: active ? colors.primary : colors.bgSecondary,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : colors.textMid }}>{y}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    padding: spacing.md,
    paddingTop: spacing.xl,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginTop: 4,
  },
  banner: {
    width: '100%',
    height: 120,
    marginVertical: spacing.md,
  },
  todayCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  notMarkedContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  notMarkedTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  notMarkedStatus: {
    fontSize: typography.sizes.md,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  todayDate: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    marginBottom: spacing.lg,
  },
  markButton: {
    marginTop: spacing.md,
  },
  completedContainer: {
    paddingVertical: spacing.md,
  },
  completedTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  completedStatus: {
    fontSize: typography.sizes.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
  checkedInContainer: {
    paddingVertical: spacing.md,
  },
  checkedInTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  checkedInStatus: {
    fontSize: typography.sizes.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
  },
  rowValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.success}15`,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.success,
    marginLeft: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    textAlign: 'center',
  },
  historyCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  historyHeader: {
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bgSecondary,
    borderRadius: 6,
  },
  filterText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  exportButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  exportText: {
    fontSize: typography.sizes.xs,
    color: '#fff',
    fontWeight: typography.weights.semibold,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.bgSecondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  tableCellText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.text,
    textAlign: 'center',
  },
  statusText: {
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  verificationCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    minWidth: 150,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  lockTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  lockSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  verificationDetails: {
    marginBottom: spacing.lg,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  verificationText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  detailSection: {
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  verificationInstruction: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  cameraButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  cameraText: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
  capturedContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  capturedImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  retakeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
  },
  retakeText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  verifyButton: {
    marginTop: spacing.md,
  },
  taskInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  taskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginRight: spacing.sm,
  },
  addTaskButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskList: {
    maxHeight: 200,
    marginBottom: spacing.md,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  taskIndex: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  taskText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textLight,
  },
  emptyTaskText: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  reportingTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  taskCheckbox: {
    marginRight: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  saveButton: {
    marginTop: spacing.md,
  },
  // Website-parity attendance styles
  mainCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  mainCardLoading: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.textMid,
    fontWeight: '600',
  },
  clockDate: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMid,
    marginBottom: 6,
  },
  clockDateSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMid,
    marginBottom: 4,
  },
  clockTime: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 14,
    fontVariant: ['tabular-nums'],
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  shiftText: { fontSize: 12.5, color: colors.textMid, fontWeight: '500' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 24,
    marginBottom: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 13, fontWeight: '600' },
  warnBox: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  warnIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  warnTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 4, textAlign: 'center' },
  warnText: { fontSize: 12.5, color: '#78350F', lineHeight: 18, textAlign: 'center' },
  remindBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  primaryBtn: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: '#0B74F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  completedBtn: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  completedBtnText: { color: '#16A34A', fontSize: 15, fontWeight: '700' },
  linkCol: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 14,
    gap: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  linkRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkText: { fontSize: 14, fontWeight: '600', color: colors.text },
  linkArrow: { fontSize: 15, color: colors.textLight },
  sessionCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  sessionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sessionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  sessionGrid: { flexDirection: 'row', gap: 10 },
  sessionBox: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  sessionLabel: { fontSize: 11, fontWeight: '600', color: colors.textLight, textTransform: 'uppercase' },
  sessionValue: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 3 },
  sessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sessionFooterLabel: { fontSize: 12.5, color: colors.textMid },
  sessionFooterRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionFooterValue: { fontSize: 12.5, fontWeight: '600', color: '#16A34A' },
  viewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  viewSubtitle: { fontSize: 12.5, color: colors.textMid, marginTop: 2 },
  histStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  histStat: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  histStatValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  histStatLabel: { fontSize: 10.5, color: colors.textLight, marginTop: 3, textAlign: 'center' },
  emptyCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  recordCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: spacing.sm,
  },
  recordTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  recordDate: { fontSize: 13.5, fontWeight: '700' },
  recordDay: { fontSize: 11.5, marginTop: 1 },
  recordStatusWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  recordStatus: { fontSize: 11.5, fontWeight: '700', color: colors.success },
  recordTimesRow: { flexDirection: 'row', gap: 8 },
  recordTimeBox: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  recordTimeLabel: { fontSize: 9.5, fontWeight: '600', textTransform: 'uppercase' },
  recordTimeValue: { fontSize: 12.5, fontWeight: '700', marginTop: 2 },
  summaryCard: { marginBottom: spacing.lg },
  summaryCardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  breakdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  breakdownBox: {
    width: '31.5%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  breakdownLabel: { fontSize: 11, fontWeight: '600' },
  breakdownValue: { fontSize: 20, fontWeight: '800', marginTop: 3 },
});
