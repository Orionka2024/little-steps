'use client';

import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Plus,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Trash2,
  Edit3,
  Calendar,
  Users,
  CreditCard,
} from 'lucide-react';

import type {
  Role,
  Student,
  AttendanceEntry,
  BillingConfigEntry,
  AttendanceStatus,
  StudentAttendanceRecord,
} from '../../lib/types';
import { STUDENTS } from '../../lib/types';

interface AttendanceViewProps {
  role: Role;
  currentStudent: Student;
  attendanceList: AttendanceEntry[];
  billingConfig: BillingConfigEntry;
  onSaveAttendance: (entry: AttendanceEntry) => Promise<void>;
  onDeleteAttendance: (id: string) => Promise<void>;
  onSaveBillingConfig: (config: BillingConfigEntry) => Promise<void>;
  busy?: boolean;
}

export function formatMoney(amount: number, currency: string) {
  const formatted = amount.toLocaleString();
  if (['CZK', 'Kč', 'zł', 'kr'].includes(currency)) {
    return `${formatted} ${currency}`;
  }
  return `${currency}${formatted}`;
}

export function AttendanceView({
  role,
  currentStudent,
  attendanceList,
  billingConfig,
  onSaveAttendance,
  onDeleteAttendance,
  onSaveBillingConfig,
  busy = false,
}: AttendanceViewProps) {
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [editingSession, setEditingSession] = useState<AttendanceEntry | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  // Form states for Logging / Editing a session
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formTopic, setFormTopic] = useState<string>('');
  const [formDuration, setFormDuration] = useState<number>(60);
  const [formNotes, setFormNotes] = useState<string>('');
  const [formRecords, setFormRecords] = useState<Record<string, { status: AttendanceStatus; chargeable: boolean; note: string }>>(() => {
    const init: Record<string, { status: AttendanceStatus; chargeable: boolean; note: string }> = {};
    for (const s of STUDENTS) {
      init[s.id] = { status: 'present', chargeable: true, note: '' };
    }
    return init;
  });

  // Billing settings state
  const [defaultRate, setDefaultRate] = useState<number>(billingConfig.defaultRate || 250);
  const [currency, setCurrency] = useState<string>(billingConfig.currency || 'CZK');
  const [studentRates, setStudentRates] = useState<Record<string, number>>(() => {
    const rates: Record<string, number> = {};
    for (const s of STUDENTS) {
      rates[s.id] = billingConfig.profiles[s.id]?.ratePerLesson ?? billingConfig.defaultRate ?? 250;
    }
    return rates;
  });
  const [paidCounts, setPaidCounts] = useState<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const s of STUDENTS) {

      counts[s.id] = billingConfig.profiles[s.id]?.paidLessonsCount ?? 0;
    }
    return counts;
  });

  // Sort attendance sessions newest first
  const sortedSessions = useMemo(() => {
    return [...attendanceList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceList]);

  // Filtered sessions based on active student tab
  const displayedSessions = useMemo(() => {
    if (role === 'Student') {
      return sortedSessions.filter((s) => s.records.some((r) => r.studentId === currentStudent.id));
    }
    if (filterStudent === 'all') return sortedSessions;
    return sortedSessions.filter((s) => s.records.some((r) => r.studentId === filterStudent));
  }, [sortedSessions, filterStudent, role, currentStudent.id]);

  // Student summary metrics: lessons attended, chargeable, total cost, paid, balance
  const studentMetrics = useMemo(() => {
    const map: Record<
      string,
      {
        totalLessons: number;
        attended: number;
        absent: number;
        late: number;
        chargeable: number;
        rate: number;
        totalCharged: number;
        paidLessons: number;
        amountPaid: number;
        balanceDue: number;
        unpaidLessons: number;
        attendanceRate: number;
        sessions: { date: string; topic: string; status: AttendanceStatus; chargeable: boolean; note?: string }[];
      }
    > = {};

    for (const s of STUDENTS) {
      const profile = billingConfig.profiles[s.id];
      const rate = profile?.ratePerLesson ?? billingConfig.defaultRate ?? 40;
      const paidLessons = profile?.paidLessonsCount ?? 0;

      let attended = 0;
      let absent = 0;
      let late = 0;
      let chargeable = 0;
      const studentSessions: { date: string; topic: string; status: AttendanceStatus; chargeable: boolean; note?: string }[] = [];

      for (const session of sortedSessions) {
        const record = session.records.find((r) => r.studentId === s.id);
        if (record) {
          studentSessions.push({
            date: session.date,
            topic: session.topic,
            status: record.status,
            chargeable: record.chargeable,
            note: record.note,
          });

          if (record.status === 'present') attended += 1;
          else if (record.status === 'late') late += 1;
          else if (record.status === 'absent') absent += 1;

          if (record.chargeable) chargeable += 1;
        }
      }

      const totalConducted = attended + late + absent;
      const totalCharged = chargeable * rate;
      const amountPaid = paidLessons * rate;
      const balanceDue = Math.max(0, totalCharged - amountPaid);
      const unpaidLessons = Math.max(0, chargeable - paidLessons);
      const attendanceRate = totalConducted > 0 ? Math.round(((attended + late) / totalConducted) * 100) : 100;

      map[s.id] = {
        totalLessons: totalConducted,
        attended,
        absent,
        late,
        chargeable,
        rate,
        totalCharged,
        paidLessons,
        amountPaid,
        balanceDue,
        unpaidLessons,
        attendanceRate,
        sessions: studentSessions,
      };
    }

    return map;
  }, [sortedSessions, billingConfig]);

  // Overall classroom totals
  const classroomTotals = useMemo(() => {
    let totalChargeable = 0;
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    for (const s of STUDENTS) {
      const m = studentMetrics[s.id];
      if (m) {
        totalChargeable += m.chargeable;
        totalRevenue += m.totalCharged;
        totalPaid += m.amountPaid;
        totalBalance += m.balanceDue;
      }
    }

    return {
      totalChargeable,
      totalRevenue,
      totalPaid,
      totalBalance,
      sessionCount: sortedSessions.length,
    };
  }, [studentMetrics, sortedSessions]);

  // Open Log Modal (new session)
  function openNewSessionModal() {
    setEditingSession(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTopic('');
    setFormDuration(60);
    setFormNotes('');
    const init: Record<string, { status: AttendanceStatus; chargeable: boolean; note: string }> = {};
    for (const s of STUDENTS) {
      init[s.id] = { status: 'present', chargeable: true, note: '' };
    }
    setFormRecords(init);
    setShowLogModal(true);
  }

  // Open Edit Modal for an existing session
  function openEditSessionModal(session: AttendanceEntry) {
    setEditingSession(session);
    setFormDate(session.date);
    setFormTopic(session.topic);
    setFormDuration(session.durationMinutes || 60);
    setFormNotes(session.notes || '');
    const recs: Record<string, { status: AttendanceStatus; chargeable: boolean; note: string }> = {};
    for (const s of STUDENTS) {
      const match = session.records.find((r) => r.studentId === s.id);
      recs[s.id] = {
        status: match?.status || 'present',
        chargeable: match?.chargeable ?? true,
        note: match?.note || '',
      };
    }
    setFormRecords(recs);
    setShowLogModal(true);
  }

  // Save session (new or edited)
  async function handleSaveSession(e: React.FormEvent) {
    e.preventDefault();
    if (!formTopic.trim()) return;

    const records: StudentAttendanceRecord[] = STUDENTS.map((s) => ({
      studentId: s.id,
      studentName: s.name,
      status: formRecords[s.id]?.status || 'present',
      chargeable: formRecords[s.id]?.chargeable ?? true,
      note: formRecords[s.id]?.note?.trim() || undefined,
    }));

    const entry: AttendanceEntry = {
      id: editingSession?.id || `att-${Date.now()}`,
      kind: 'attendance',
      date: formDate,
      topic: formTopic.trim(),
      durationMinutes: formDuration,
      ratePerLesson: billingConfig.defaultRate,
      notes: formNotes.trim() || undefined,
      records,
    };

    await onSaveAttendance(entry);
    setShowLogModal(false);
  }

  // Quick inline toggle of attendance status on a session card
  async function handleQuickToggle(session: AttendanceEntry, studentId: string) {
    if (role !== 'Teacher') return;
    const current = session.records.find((r) => r.studentId === studentId);
    if (!current) return;

    // Cycle: present -> late -> absent -> present
    let nextStatus: AttendanceStatus = 'present';
    let nextChargeable = true;
    if (current.status === 'present') {
      nextStatus = 'late';
      nextChargeable = true;
    } else if (current.status === 'late') {
      nextStatus = 'absent';
      nextChargeable = false;
    } else {
      nextStatus = 'present';
      nextChargeable = true;
    }

    const updatedRecords = session.records.map((r) => {
      if (r.studentId === studentId) {
        return {
          ...r,
          status: nextStatus,
          chargeable: nextChargeable,
        };
      }
      return r;
    });

    await onSaveAttendance({
      ...session,
      records: updatedRecords,
    });
  }

  // Adjust paid lesson count for a student
  async function handleAdjustPaidLessons(studentId: string, delta: number) {
    const currentCount = billingConfig.profiles[studentId]?.paidLessonsCount ?? 0;
    const newCount = Math.max(0, currentCount + delta);

    const updatedProfiles = {
      ...billingConfig.profiles,
      [studentId]: {
        ...(billingConfig.profiles[studentId] || { studentId }),
        paidLessonsCount: newCount,
      },
    };

    await onSaveBillingConfig({
      ...billingConfig,
      profiles: updatedProfiles,
    });
  }

  // Mark all chargeable lessons paid for a student
  async function handleMarkAllPaid(studentId: string) {
    const metrics = studentMetrics[studentId];
    if (!metrics) return;

    const updatedProfiles = {
      ...billingConfig.profiles,
      [studentId]: {
        ...(billingConfig.profiles[studentId] || { studentId }),
        paidLessonsCount: metrics.chargeable,
      },
    };

    await onSaveBillingConfig({
      ...billingConfig,
      profiles: updatedProfiles,
    });
  }

  // Copy structured invoice statement to clipboard
  function handleCopyInvoice(student: Student) {
    const m = studentMetrics[student.id];
    if (!m) return;

    const sym = billingConfig.currency;
    const sessionLines = m.sessions
      .map((s) => {
        const statusLabel = s.status === 'present' ? 'Attended' : s.status === 'late' ? 'Attended (Late)' : 'Absent';
        const fee = s.chargeable ? formatMoney(m.rate, sym) : `${formatMoney(0, sym)} (Excused)`;
        return `  • ${s.date}: ${s.topic} [${statusLabel} · ${fee}]${s.note ? ` (${s.note})` : ''}`;
      })
      .join('\n');

    const invoiceText = ` Little Steps · Writing Club
Lesson Attendance & Billing Statement
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Student: ${student.name}
Total Lessons Conducted: ${m.totalLessons}
Lessons Attended: ${m.attended + m.late} (${m.attendanceRate}% attendance)
Chargeable Lessons: ${m.chargeable} @ ${formatMoney(m.rate, sym)}/lesson

Session Breakdown:
${sessionLines || '  • No recorded sessions yet.'}

──────────────────────────────────
Total Amount Incurred: ${formatMoney(m.totalCharged, sym)}
Total Lessons Paid:    ${m.paidLessons} (${formatMoney(m.amountPaid, sym)})
Outstanding Balance:   ${formatMoney(m.balanceDue, sym)} (${m.unpaidLessons} unpaid ${m.unpaidLessons === 1 ? 'lesson' : 'lessons'})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Thank you for learning with Little Steps! ✨`;


    navigator.clipboard.writeText(invoiceText).then(() => {
      setCopiedStudentId(student.id);
      setTimeout(() => setCopiedStudentId(null), 3000);
    });
  }

  // Save global billing configuration
  async function handleSaveSettingsSubmit(e: React.FormEvent) {
    e.preventDefault();
    const updatedProfiles: Record<string, { studentId: string; ratePerLesson?: number; paidLessonsCount: number; notes?: string }> = {};

    for (const s of STUDENTS) {
      updatedProfiles[s.id] = {
        studentId: s.id,
        ratePerLesson: studentRates[s.id] || defaultRate,
        paidLessonsCount: paidCounts[s.id] ?? 0,
        notes: billingConfig.profiles[s.id]?.notes,
      };
    }

    await onSaveBillingConfig({
      ...billingConfig,
      defaultRate,
      currency,
      profiles: updatedProfiles,
    });

    setShowSettingsModal(false);
  }

  return (
    <div className="attendance-page" style={{ paddingBottom: '60px' }}>
      {/* Top Header */}
      <div className="heading-row" style={{ marginBottom: '22px' }}>
        <div>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarCheck size={14} style={{ color: '#286654' }} />
            ATTENDANCE & LESSON CHARGES
          </div>
          <h1 style={{ fontSize: '30px', margin: '6px 0 4px', fontWeight: 800 }}>
            {role === 'Teacher' ? 'Lesson Attendance & Billing' : `${currentStudent.name}’s Attendance & Lessons`}
          </h1>
          <p style={{ color: '#6d7f6c', fontSize: '13px' }}>
            {role === 'Teacher'
              ? 'Mark who attended each lesson, track chargeable sessions, and generate clear family invoices.'
              : 'Review your lesson attendance record, completed club sessions, and account status.'}
          </p>
        </div>

        {role === 'Teacher' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="text-button"
              onClick={() => {
                setDefaultRate(billingConfig.defaultRate || 250);
                setCurrency(billingConfig.currency || 'CZK');
                const rates: Record<string, number> = {};
                const counts: Record<string, number> = {};
                for (const s of STUDENTS) {
                  rates[s.id] = billingConfig.profiles[s.id]?.ratePerLesson ?? billingConfig.defaultRate ?? 250;
                  counts[s.id] = billingConfig.profiles[s.id]?.paidLessonsCount ?? 0;
                }
                setStudentRates(rates);
                setPaidCounts(counts);
                setShowSettingsModal(true);
              }}
              style={{
                border: '1px solid #dce4d4',
                padding: '9px 14px',
                borderRadius: '8px',
                background: '#fff',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CreditCard size={15} />
              Rates & Currency ({formatMoney(billingConfig.defaultRate, billingConfig.currency)}/student)
            </button>

            <button
              className="primary"
              onClick={openNewSessionModal}
              style={{ padding: '10px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} />
              Log Lesson Attendance
            </button>
          </div>
        )}
      </div>

      {/* Classroom Summary Banner (Teacher View) */}
      {role === 'Teacher' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #f0f7ef 0%, #e8f2e6 100%)',
            border: '1px solid #dbe6d5',
            borderRadius: '16px',
            padding: '22px 26px',
            marginBottom: '28px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#6d7f6c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Sessions Conducted
            </div>
            <div style={{ fontSize: '30px', fontWeight: 800, color: '#273f3b', margin: '4px 0 2px', fontFamily: 'Manrope, sans-serif' }}>
              {classroomTotals.sessionCount}{' '}
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#7a8e7a' }}>lessons</span>
            </div>
            <div style={{ fontSize: '11px', color: '#7c8e7a' }}>Weekly group writing class</div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#6d7f6c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Chargeable Student Lessons
            </div>
            <div style={{ fontSize: '30px', fontWeight: 800, color: '#286654', margin: '4px 0 2px', fontFamily: 'Manrope, sans-serif' }}>
              {classroomTotals.totalChargeable}{' '}
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#7a8e7a' }}>attended</span>
            </div>
            <div style={{ fontSize: '11px', color: '#7c8e7a' }}>
              Across {STUDENTS.length} active writers
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#6d7f6c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Total Fees Accrued
            </div>
            <div style={{ fontSize: '30px', fontWeight: 800, color: '#273f3b', margin: '4px 0 2px', fontFamily: 'Manrope, sans-serif' }}>
              {formatMoney(classroomTotals.totalRevenue, billingConfig.currency)}
            </div>
            <div style={{ fontSize: '11px', color: '#628a68' }}>
              {formatMoney(classroomTotals.totalPaid, billingConfig.currency)} paid to date
            </div>
          </div>

          <div
            style={{
              background: classroomTotals.totalBalance > 0 ? '#fff8eb' : '#edf6ea',
              border: `1px solid ${classroomTotals.totalBalance > 0 ? '#f0dfbd' : '#cde3c7'}`,
              borderRadius: '12px',
              padding: '12px 18px',
            }}
          >
            <div style={{ fontSize: '11px', color: classroomTotals.totalBalance > 0 ? '#9e7939' : '#3d6c38', fontWeight: 700 }}>
              {classroomTotals.totalBalance > 0 ? '✦ OUTSTANDING BALANCE' : '✓ ALL PAYMENTS CURRENT'}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: classroomTotals.totalBalance > 0 ? '#926a27' : '#286654', margin: '3px 0' }}>
              {formatMoney(classroomTotals.totalBalance, billingConfig.currency)}
            </div>
            <div style={{ fontSize: '11px', color: '#7a8677' }}>
              {classroomTotals.totalBalance > 0
                ? 'Lessons marked attended and awaiting fee collection'
                : 'All attended sessions are reconciled'}
            </div>
          </div>
        </div>
      )}

      {/* Student Billing & Attendance Cards */}
      <div style={{ marginBottom: '32px' }}>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} style={{ color: '#286654' }} />
            {role === 'Teacher' ? 'Student Charge Tracker & Billing Overview' : 'Your Attendance & Account'}
          </h2>
          {role === 'Teacher' && (
            <span style={{ fontSize: '12px', color: '#7a8d7a' }}>
              Click <strong>&quot;+1 Paid&quot;</strong> as payments arrive or <strong>&quot;Copy Invoice&quot;</strong> to notify parents
            </span>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: role === 'Student' ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '18px',
          }}
        >
          {STUDENTS.filter((st) => (role === 'Student' ? st.id === currentStudent.id : true)).map((student) => {
            const m = studentMetrics[student.id];
            if (!m) return null;
            const sym = billingConfig.currency;
            const isCopied = copiedStudentId === student.id;

            return (
              <div
                key={student.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e1e8dd',
                  borderRadius: '14px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                }}
              >
                {/* Student Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="avatar" style={{ width: '42px', height: '42px', fontSize: '16px' }}>
                      {student.avatar}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{student.name}</h3>
                      <small style={{ color: '#7a8c79' }}>
                        Rate: {formatMoney(m.rate, sym)} / lesson
                      </small>
                    </div>
                  </div>

                  {/* Balance Badge */}
                  <div
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: m.balanceDue > 0 ? '#fff3d9' : '#eaf4e8',
                      color: m.balanceDue > 0 ? '#8a6523' : '#356330',
                      border: `1px solid ${m.balanceDue > 0 ? '#f0ddb0' : '#cbe4c5'}`,
                    }}
                  >
                    {m.balanceDue > 0 ? (
                      <>
                        <Clock size={12} />
                        To Charge: {formatMoney(m.balanceDue, sym)} ({m.unpaidLessons} {m.unpaidLessons === 1 ? 'lesson' : 'lessons'})
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} />
                        All Paid ({formatMoney(m.totalCharged, sym)})
                      </>
                    )}
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px',
                    background: '#f9faf7',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #eef2eb',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10px', color: '#7a8c79', fontWeight: 600, textTransform: 'uppercase' }}>Attended</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#286654', margin: '2px 0' }}>
                      {m.attended + m.late}{' '}
                      <span style={{ fontSize: '11px', fontWeight: 400, color: '#889886' }}>/ {m.totalLessons}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#7a8e7a' }}>{m.attendanceRate}% present</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: '#7a8c79', fontWeight: 600, textTransform: 'uppercase' }}>Chargeable</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#273f3b', margin: '2px 0' }}>
                      {m.chargeable}{' '}
                      <span style={{ fontSize: '11px', fontWeight: 400, color: '#889886' }}>lessons</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#7a8e7a' }}>{formatMoney(m.totalCharged, sym)} fee</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: '#7a8c79', fontWeight: 600, textTransform: 'uppercase' }}>Paid Count</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#4a6755', margin: '2px 0' }}>
                      {m.paidLessons}{' '}
                      <span style={{ fontSize: '11px', fontWeight: 400, color: '#889886' }}>lessons</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#688c66' }}>{formatMoney(m.amountPaid, sym)} credited</div>
                  </div>
                </div>

                {/* Actions for this student */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '6px' }}>
                  {role === 'Teacher' && (
                    <>
                      <button
                        className="text-button"
                        onClick={() => handleAdjustPaidLessons(student.id, 1)}
                        disabled={busy}
                        style={{
                          background: '#f2f8f1',
                          border: '1px solid #d5e5d3',
                          padding: '7px 11px',
                          borderRadius: '7px',
                          fontSize: '11px',
                          color: '#286654',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                        title="Add 1 paid lesson to student record"
                      >
                        <Plus size={13} />
                        +1 Lesson Paid
                      </button>

                      {m.unpaidLessons > 0 && (
                        <button
                          className="text-button"
                          onClick={() => handleMarkAllPaid(student.id)}
                          disabled={busy}
                          style={{
                            background: '#e9f4e6',
                            border: '1px solid #c9e2c4',
                            padding: '7px 11px',
                            borderRadius: '7px',
                            fontSize: '11px',
                            color: '#286654',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <CheckCircle2 size={13} />
                          Mark All Paid
                        </button>
                      )}

                      {m.paidLessons > 0 && (
                        <button
                          className="text-button"
                          onClick={() => handleAdjustPaidLessons(student.id, -1)}
                          disabled={busy}
                          style={{
                            padding: '7px 9px',
                            borderRadius: '7px',
                            fontSize: '11px',
                            color: '#899988',
                          }}
                          title="Subtract 1 paid lesson (undo)"
                        >
                          -1
                        </button>
                      )}
                    </>
                  )}

                  <button
                    className="text-button"
                    onClick={() => handleCopyInvoice(student)}
                    style={{
                      marginLeft: 'auto',
                      border: '1px solid #dce4d5',
                      padding: '7px 12px',
                      borderRadius: '7px',
                      fontSize: '11px',
                      background: isCopied ? '#e9f4e6' : '#fff',
                      color: isCopied ? '#286654' : '#496052',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    {isCopied ? <Check size={13} style={{ color: '#286654' }} /> : <Copy size={13} />}
                    {isCopied ? 'Copied Invoice!' : 'Copy Parent Invoice'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lesson Sessions Timeline / Table */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: '#286654' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Lesson Sessions Log</h2>
            <span style={{ fontSize: '11px', background: '#edf1e8', padding: '2px 8px', borderRadius: '10px', color: '#576f55' }}>
              {displayedSessions.length} recorded
            </span>
          </div>

          {/* Filter Tabs */}
          {role === 'Teacher' && (
            <div className="tabs" style={{ gap: '6px' }}>
              <button
                className={filterStudent === 'all' ? 'active' : ''}
                onClick={() => setFilterStudent('all')}
                style={{ padding: '6px 12px', fontSize: '11px' }}
              >
                All Students
              </button>
              {STUDENTS.map((st) => (
                <button
                  key={st.id}
                  className={filterStudent === st.id ? 'active' : ''}
                  onClick={() => setFilterStudent(st.id)}
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                >
                  {st.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {displayedSessions.length === 0 ? (
          <div className="empty" style={{ background: '#fff', borderRadius: '14px', padding: '45px 20px', textAlign: 'center' }}>
            <CalendarCheck size={40} style={{ color: '#88a384', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>No lesson sessions found</h3>
            <p style={{ fontSize: '12px', color: '#7a8e7a', maxWidth: '420px', margin: '0 auto 16px' }}>
              {role === 'Teacher'
                ? 'Click "Log Lesson Attendance" to record your first class session, take attendance, and calculate chargeable lessons.'
                : 'No attendance records are registered for this filter yet.'}
            </p>
            {role === 'Teacher' && (
              <button className="primary" onClick={openNewSessionModal} style={{ fontSize: '12px', padding: '9px 16px' }}>
                <Plus size={14} /> Log Lesson Attendance
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {displayedSessions.map((session) => {
              const dateObj = new Date(session.date);
              const formattedDate = dateObj.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={session.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #e1e7dc',
                    borderRadius: '13px',
                    padding: '20px 22px',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  {/* Session Header Row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            background: '#e9f2e8',
                            color: '#286654',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.3px',
                          }}
                        >
                          {formattedDate}
                        </span>
                        {session.durationMinutes && (
                          <span style={{ fontSize: '11px', color: '#7e8f7a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> {session.durationMinutes} min
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#273f3b', margin: '2px 0 4px' }}>
                        {session.topic}
                      </h3>
                      {session.notes && (
                        <p style={{ fontSize: '12px', color: '#6d7f6c', margin: 0, fontStyle: 'italic' }}>
                          &ldquo;{session.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    {role === 'Teacher' && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          className="text-button"
                          onClick={() => openEditSessionModal(session)}
                          style={{
                            border: '1px solid #dce4d5',
                            padding: '6px 10px',
                            borderRadius: '7px',
                            fontSize: '11px',
                            background: '#fff',
                            color: '#496052',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Edit session details or notes"
                        >
                          <Edit3 size={13} />
                          Edit
                        </button>

                        <button
                          className="text-button"
                          onClick={() => {
                            if (confirm(`Delete the attendance log for "${session.topic}" (${formattedDate})?`)) {
                              onDeleteAttendance(session.id);
                            }
                          }}
                          style={{
                            border: '1px solid #edd5d5',
                            padding: '6px 10px',
                            borderRadius: '7px',
                            fontSize: '11px',
                            background: '#fff5f5',
                            color: '#a84545',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Delete session"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Attendance Roster Pills */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      paddingTop: '12px',
                      borderTop: '1px solid #f0f3ed',
                    }}
                  >
                    {session.records.map((rec) => {
                      const student = STUDENTS.find((s) => s.id === rec.studentId);
                      const isPresent = rec.status === 'present';
                      const isLate = rec.status === 'late';

                      const sym = billingConfig.currency;
                      const rate = billingConfig.profiles[rec.studentId]?.ratePerLesson ?? billingConfig.defaultRate ?? 250;

                      return (
                        <div
                          key={rec.studentId}
                          onClick={() => role === 'Teacher' && handleQuickToggle(session, rec.studentId)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '7px 12px',
                            borderRadius: '8px',
                            background: isPresent ? '#edf7eb' : isLate ? '#fff7e6' : '#f5f5f2',
                            border: `1px solid ${isPresent ? '#cde7c7' : isLate ? '#fae3b3' : '#e0e2db'}`,
                            cursor: role === 'Teacher' ? 'pointer' : 'default',
                            transition: 'all 0.15s ease',
                          }}
                          title={role === 'Teacher' ? 'Click to toggle Present ➔ Late ➔ Absent' : undefined}
                        >
                          <div className="avatar tiny" style={{ fontSize: '11px' }}>
                            {student?.avatar || rec.studentName[0]}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '12px', color: '#273f3b' }}>{rec.studentName}</strong>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: isPresent ? '#286654' : isLate ? '#9e7323' : '#7f887d',
                                }}
                              >
                                {isPresent ? '✓ Present' : isLate ? '⏰ Late' : '✕ Absent'}
                              </span>
                            </div>

                            <div style={{ fontSize: '10px', color: '#687765' }}>
                              {rec.chargeable ? (
                                <span style={{ color: '#286654', fontWeight: 600 }}>Chargeable ({formatMoney(rate, sym)})</span>
                              ) : (
                                <span style={{ color: '#889886' }}>Uncharged ({formatMoney(0, sym)})</span>
                              )}
                              {rec.note ? ` · ${rec.note}` : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log / Edit Lesson Modal */}
      {showLogModal && (
        <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }}
          >
            <button className="close" onClick={() => setShowLogModal(false)}>
              ✕
            </button>

            <div className="eyebrow" style={{ color: '#286654' }}>
              {editingSession ? 'EDIT CLASS SESSION' : 'RECORD LESSON ATTENDANCE'}
            </div>
            <h2 style={{ fontSize: '22px', margin: '4px 0 16px' }}>
              {editingSession ? 'Edit Attendance & Session Log' : 'Log Lesson Session'}
            </h2>

            <form onSubmit={handleSaveSession}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#385042', display: 'block', marginBottom: '5px' }}>
                    Lesson Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #dce4d5',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#385042', display: 'block', marginBottom: '5px' }}>
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={180}
                    step={15}
                    value={formDuration}
                    onChange={(e) => setFormDuration(parseInt(e.target.value, 10) || 60)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #dce4d5',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#385042', display: 'block', marginBottom: '5px' }}>
                  Lesson Topic / Unit Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lesson 5: Dialogue Tags & Sensory Hooks"
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #dce4d5',
                    fontSize: '13px',
                  }}
                />
              </div>

              {/* Attendance Roster Checklist */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#385042', margin: 0 }}>
                    Student Attendance Roster
                  </label>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const updated: Record<string, { status: AttendanceStatus; chargeable: boolean; note: string }> = {};
                        for (const s of STUDENTS) {
                          updated[s.id] = { status: 'present', chargeable: true, note: formRecords[s.id]?.note || '' };
                        }
                        setFormRecords(updated);
                      }}
                      style={{ fontSize: '11px', color: '#286654', fontWeight: 600, padding: 0 }}
                    >
                      All Present
                    </button>
                    <span style={{ color: '#c7d3c5' }}>·</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated: Record<string, { status: AttendanceStatus; chargeable: boolean; note: string }> = {};
                        for (const s of STUDENTS) {
                          updated[s.id] = { status: 'absent', chargeable: false, note: formRecords[s.id]?.note || '' };
                        }
                        setFormRecords(updated);
                      }}
                      style={{ fontSize: '11px', color: '#889886', padding: 0 }}
                    >
                      All Absent
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  {STUDENTS.map((student) => {
                    const currentRec = formRecords[student.id] || { status: 'present', chargeable: true, note: '' };

                    return (
                      <div
                        key={student.id}
                        style={{
                          background: '#f8faf7',
                          border: '1px solid #e1e7dc',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="avatar tiny">{student.avatar}</div>
                            <strong style={{ fontSize: '13px', color: '#273f3b' }}>{student.name}</strong>
                          </div>

                          {/* Attendance Status Buttons */}
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setFormRecords((prev) => ({
                                  ...prev,
                                  [student.id]: {
                                    ...prev[student.id],
                                    status: 'present',
                                    chargeable: true,
                                  },
                                }));
                              }}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: currentRec.status === 'present' ? '#286654' : '#fff',
                                color: currentRec.status === 'present' ? '#fff' : '#4f6959',
                                border: `1px solid ${currentRec.status === 'present' ? '#286654' : '#d2ddd0'}`,
                              }}
                            >
                              Present
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setFormRecords((prev) => ({
                                  ...prev,
                                  [student.id]: {
                                    ...prev[student.id],
                                    status: 'late',
                                    chargeable: true,
                                  },
                                }));
                              }}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: currentRec.status === 'late' ? '#9e7323' : '#fff',
                                color: currentRec.status === 'late' ? '#fff' : '#6b582b',
                                border: `1px solid ${currentRec.status === 'late' ? '#9e7323' : '#d2ddd0'}`,
                              }}
                            >
                              Late
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setFormRecords((prev) => ({
                                  ...prev,
                                  [student.id]: {
                                    ...prev[student.id],
                                    status: 'absent',
                                    chargeable: false,
                                  },
                                }));
                              }}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: currentRec.status === 'absent' ? '#8a9488' : '#fff',
                                color: currentRec.status === 'absent' ? '#fff' : '#6f786d',
                                border: `1px solid ${currentRec.status === 'absent' ? '#8a9488' : '#d2ddd0'}`,
                              }}
                            >
                              Absent
                            </button>
                          </div>
                        </div>

                        {/* Chargeable Toggle & Student Note */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', paddingTop: '4px' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#496052', cursor: 'pointer', margin: 0 }}>
                            <input
                              type="checkbox"
                              checked={currentRec.chargeable}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormRecords((prev) => ({
                                  ...prev,
                                  [student.id]: {
                                    ...prev[student.id],
                                    chargeable: checked,
                                  },
                                }));
                              }}
                              style={{ width: 'auto', margin: 0 }}
                            />
                            Charge for lesson ({formatMoney(billingConfig.profiles[student.id]?.ratePerLesson ?? billingConfig.defaultRate ?? 250, billingConfig.currency)})
                          </label>

                          <input
                            type="text"
                            placeholder="Optional note (e.g. excused trip, arrived 15m late)"
                            value={currentRec.note || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormRecords((prev) => ({
                                ...prev,
                                [student.id]: {
                                  ...prev[student.id],
                                  note: val,
                                },
                              }));
                            }}
                            style={{
                              flex: 1,
                              minWidth: '180px',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              border: '1px solid #dce4d5',
                              fontSize: '11px',
                              background: '#fff',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Session Notes */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#385042', display: 'block', marginBottom: '5px' }}>
                  Teacher Session Notes / Curriculum Highlights
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. All writers read their essays aloud; covered vivid adjectives and cliffhanger endings."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #dce4d5',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setShowLogModal(false)}
                  style={{ padding: '9px 16px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={busy}
                  style={{ padding: '10px 20px', fontSize: '13px' }}
                >
                  {editingSession ? 'Save Changes' : 'Record Session ✦'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Billing & Rate Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '540px', width: '100%' }}
          >
            <button className="close" onClick={() => setShowSettingsModal(false)}>
              ✕
            </button>

            <div className="eyebrow" style={{ color: '#286654' }}>
              BILLING PREFERENCES
            </div>
            <h2 style={{ fontSize: '22px', margin: '4px 0 16px' }}>Lesson Rates & Currency</h2>

            <form onSubmit={handleSaveSettingsSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#385042', display: 'block', marginBottom: '5px' }}>
                    Currency Symbol
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #dce4d5',
                      fontSize: '13px',
                    }}
                  >
                    <option value="CZK">CZK (Czech koruna)</option>
                    <option value="Kč">Kč (Czech koruna)</option>
                    <option value="$">$ (USD / CAD / AUD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                    <option value="₩">₩ (KRW)</option>
                    <option value="¥">¥ (JPY / CNY)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#385042', display: 'block', marginBottom: '5px' }}>
                    Default Rate / Lesson
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={defaultRate}
                    onChange={(e) => setDefaultRate(parseFloat(e.target.value) || 250)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #dce4d5',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              {/* Per-Student Rates & Paid Lessons Adjuster */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#385042', display: 'block', marginBottom: '8px' }}>
                  Per-Student Rate & Current Paid Lessons
                </label>

                <div style={{ display: 'grid', gap: '8px' }}>
                  {STUDENTS.map((st) => (
                    <div
                      key={st.id}
                      style={{
                        background: '#f8faf7',
                        border: '1px solid #e1e7dc',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'grid',
                        gridTemplateColumns: '120px 1fr 1fr',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="avatar tiny">{st.avatar}</div>
                        <strong style={{ fontSize: '13px' }}>{st.name}</strong>
                      </div>

                      <div>
                        <div style={{ fontSize: '10px', color: '#7a8c79' }}>Rate ({currency})</div>
                        <input
                          type="number"
                          min={1}
                          value={studentRates[st.id] ?? defaultRate}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || defaultRate;
                            setStudentRates((prev) => ({ ...prev, [st.id]: val }));
                          }}
                          style={{
                            width: '100%',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid #dce4d5',
                            fontSize: '12px',
                            background: '#fff',
                          }}
                        />
                      </div>

                      <div>
                        <div style={{ fontSize: '10px', color: '#7a8c79' }}>Paid Lessons</div>
                        <input
                          type="number"
                          min={0}
                          value={paidCounts[st.id] ?? 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setPaidCounts((prev) => ({ ...prev, [st.id]: val }));
                          }}
                          style={{
                            width: '100%',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid #dce4d5',
                            fontSize: '12px',
                            background: '#fff',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setShowSettingsModal(false)}
                  style={{ padding: '9px 16px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={busy}
                  style={{ padding: '10px 20px', fontSize: '13px' }}
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
