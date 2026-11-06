'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarCheck,
  Plus,
  Check,
  Copy,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  Users,
  Edit2,
  History,
  X,
} from 'lucide-react';
import type {
  Role,
  Student,
  AttendanceEntry,
  BillingConfigEntry,
} from '../../lib/types';
import { STUDENTS } from '../../lib/types';

interface AttendanceViewProps {
  role: Role;
  currentStudent: Student;
  attendanceList: AttendanceEntry[];
  billingConfig: BillingConfigEntry;
  onSaveAttendance: (entry: AttendanceEntry) => Promise<void>;
  onSaveAttendanceBatch?: (entries: AttendanceEntry[], label?: string) => Promise<void>;
  onDeleteAttendance: (id: string) => Promise<void>;
  onSaveBillingConfig: (config: BillingConfigEntry) => Promise<void>;
  busy?: boolean;
}

export function AttendanceView({
  role,
  currentStudent,
  attendanceList,
  billingConfig,
  onSaveAttendance,
  onSaveAttendanceBatch,
  onDeleteAttendance,
  busy = false,
}: AttendanceViewProps) {
  // Current default flat rate per lesson: 900 CZK (300 CZK each student)
  const rate = billingConfig.defaultRate || 900;
  const currency = billingConfig.currency || 'CZK';

  // Inline "New Lesson" date, manual rate entry, and student presence
  const [newDate, setNewDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [lessonPrice, setLessonPrice] = useState<string>(() => String(rate));
  const [editingPriceSessionId, setEditingPriceSessionId] = useState<string | null>(null);
  const [editingPriceInput, setEditingPriceInput] = useState<string>('');

  useEffect(() => {
    setLessonPrice(String(rate));
  }, [rate]);

  const [presentMap, setPresentMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const s of STUDENTS) {
      init[s.id] = true; // default all present
    }
    return init;
  });

  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Sort sessions newest first
  const sortedSessions = useMemo(() => {
    return [...attendanceList].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [attendanceList]);

  // Determine if a session is marked paid
  const isSessionPaid = (session: AttendanceEntry): boolean => {
    if (typeof session.paid === 'boolean') return session.paid;
    // Fallback for older records: consider paid if attended records are paid
    const attendedRecs = session.records.filter((r) => r.status === 'present' || r.status === 'late');
    if (attendedRecs.length === 0) return session.records.some((r) => r.paid);
    return attendedRecs.every((r) => r.paid);
  };

  // Group / Overall totals:
  // Calculated dynamically by summing each lesson's recorded ratePerLesson (preserving historical rates)
  const overallTotals = useMemo(() => {
    const totalLessons = sortedSessions.length;
    const paidLessons = sortedSessions.filter(isSessionPaid).length;
    const unpaidLessons = Math.max(0, totalLessons - paidLessons);
    const totalCharged = sortedSessions.reduce(
      (sum, s) => sum + (s.ratePerLesson ?? rate),
      0
    );
    const totalPaid = sortedSessions
      .filter(isSessionPaid)
      .reduce((sum, s) => sum + (s.ratePerLesson ?? rate), 0);
    const balanceDue = sortedSessions
      .filter((s) => !isSessionPaid(s))
      .reduce((sum, s) => sum + (s.ratePerLesson ?? rate), 0);

    return {
      totalLessons,
      paidLessons,
      unpaidLessons,
      totalCharged,
      totalPaid,
      balanceDue,
    };
  }, [sortedSessions, rate]);

  // Price history breakdown across recorded lessons
  const priceHistory = useMemo(() => {
    const tiers = new Map<number, { count: number; minDate: string; maxDate: string }>();
    for (const session of sortedSessions) {
      const p = session.ratePerLesson ?? rate;
      const prev = tiers.get(p);
      if (!prev) {
        tiers.set(p, { count: 1, minDate: session.date, maxDate: session.date });
      } else {
        prev.count += 1;
        if (session.date < prev.minDate) prev.minDate = session.date;
        if (session.date > prev.maxDate) prev.maxDate = session.date;
      }
    }

    return Array.from(tiers.entries())
      .map(([price, details]) => ({
        price,
        count: details.count,
        minDate: details.minDate,
        maxDate: details.maxDate,
        isCurrent: price === rate,
      }))
      .sort((a, b) => b.price - a.price);
  }, [sortedSessions, rate]);

  // Per-student attendance stats
  const studentStats = useMemo(() => {
    const map: Record<string, { attended: number; totalSessions: number }> = {};
    for (const s of STUDENTS) {
      let attended = 0;
      for (const session of sortedSessions) {
        const rec = session.records.find((r) => r.studentId === s.id);
        if (rec && (rec.status === 'present' || rec.status === 'late')) {
          attended += 1;
        }
      }
      map[s.id] = { attended, totalSessions: sortedSessions.length };
    }
    return map;
  }, [sortedSessions]);

  // Add a new lesson session (supports manual price entry)
  async function handleAddLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate) return;

    // Check if session for this date already exists
    const existing = sortedSessions.find((s) => s.date === newDate);
    const enteredRate = Number(lessonPrice) > 0 ? Number(lessonPrice) : rate;

    const records = STUDENTS.map((s) => {
      const isPresent = !!presentMap[s.id];
      return {
        studentId: s.id,
        studentName: s.name,
        status: (isPresent ? 'present' : 'absent') as 'present' | 'absent',
        chargeable: isPresent,
        paid: existing ? isSessionPaid(existing) : false,
      };
    });

    const entry: AttendanceEntry = {
      id: existing ? existing.id : `att-${newDate}`,
      kind: 'attendance',
      date: newDate,
      topic: existing?.topic || `Lesson on ${newDate}`,
      ratePerLesson: enteredRate,
      paid: existing ? isSessionPaid(existing) : false,
      records,
    };

    await onSaveAttendance(entry);

    // Reset checkboxes to all present
    const reset: Record<string, boolean> = {};
    for (const s of STUDENTS) reset[s.id] = true;
    setPresentMap(reset);
  }

  // Toggle present / absent on an existing date row
  async function toggleStudentPresence(session: AttendanceEntry, studentId: string) {
    if (role !== 'Teacher') return;
    const rec = session.records.find((r) => r.studentId === studentId);
    if (!rec) return;

    const isPresent = rec.status === 'present';
    const nextStatus: 'present' | 'absent' = isPresent ? 'absent' : 'present';

    const updatedRecords = session.records.map((r) => {
      if (r.studentId === studentId) {
        return {
          ...r,
          status: nextStatus,
          chargeable: nextStatus === 'present',
        };
      }
      return r;
    });

    await onSaveAttendance({
      ...session,
      records: updatedRecords,
    });
  }

  // Toggle paid / unpaid on an existing lesson
  async function toggleSessionPaid(session: AttendanceEntry) {
    if (role !== 'Teacher') return;
    const currentPaid = isSessionPaid(session);
    const nextPaid = !currentPaid;

    const updatedRecords = session.records.map((r) => ({
      ...r,
      paid: nextPaid,
    }));

    await onSaveAttendance({
      ...session,
      paid: nextPaid,
      records: updatedRecords,
    });
  }

  // Inline edit price of an existing session
  function handleStartEditPrice(session: AttendanceEntry) {
    if (role !== 'Teacher') return;
    setEditingPriceSessionId(session.id);
    setEditingPriceInput(String(session.ratePerLesson ?? rate));
  }

  async function handleSaveSessionPrice(session: AttendanceEntry) {
    if (role !== 'Teacher') return;
    const val = Number(editingPriceInput);
    if (isNaN(val) || val <= 0) return;

    await onSaveAttendance({
      ...session,
      ratePerLesson: val,
    });
    setEditingPriceSessionId(null);
  }

  function handleCancelEditPrice() {
    setEditingPriceSessionId(null);
    setEditingPriceInput('');
  }

  // Mark all attended sessions as paid
  async function handleMarkAllLessonsPaid() {
    if (role !== 'Teacher') return;

    const toUpdate: AttendanceEntry[] = [];
    for (const session of sortedSessions) {
      if (!isSessionPaid(session)) {
        const updatedRecords = session.records.map((r) => ({ ...r, paid: true }));
        toUpdate.push({
          ...session,
          paid: true,
          records: updatedRecords,
        });
      }
    }

    if (toUpdate.length === 0) return;

    if (onSaveAttendanceBatch) {
      await onSaveAttendanceBatch(toUpdate, 'all');
    } else {
      for (const item of toUpdate) {
        await onSaveAttendance(item);
      }
    }
  }

  // Copy quick invoice statement for parents
  function handleCopyInvoice() {
    const studentCount = STUDENTS.length || 3;
    const perStudentCurrent = Math.round(rate / studentCount);

    const historyLines = priceHistory.map((h) => {
      const perStudent = Math.round(h.price / studentCount);
      const dateSpan =
        h.minDate === h.maxDate ? h.minDate : `${h.minDate} to ${h.maxDate}`;
      return `  • ${h.price} ${currency} / lesson (${perStudent} ${currency}/student) · ${h.count} ${h.count === 1 ? 'lesson' : 'lessons'}${h.isCurrent ? ' [CURRENT RATE]' : ` [PAST RATE · ${dateSpan}]`}`;
    });

    const lines: string[] = [
      `📋 Little Steps · Lesson Attendance & Payments`,
      `Current Rate: ${rate} ${currency} / lesson (${perStudentCurrent} ${currency} each student · flat group fee)`,
      ...(priceHistory.length > 1 ? [`Price History:`, ...historyLines] : []),
      `Total Lessons: ${overallTotals.totalLessons} (${overallTotals.totalCharged.toLocaleString()} ${currency})`,
      `Paid Lessons:  ${overallTotals.paidLessons} (${overallTotals.totalPaid.toLocaleString()} ${currency})`,
      `Outstanding Balance: ${overallTotals.balanceDue.toLocaleString()} ${currency} (${overallTotals.unpaidLessons} unpaid ${overallTotals.unpaidLessons === 1 ? 'lesson' : 'lessons'})`,
      ``,
      `Student Attendance:`,
      ...STUDENTS.map((s) => {
        const stats = studentStats[s.id];
        return `  • ${s.name}: ${stats?.attended || 0}/${stats?.totalSessions || 0} lessons attended`;
      }),
      ``,
      `Lesson Dates:`,
      ...sortedSessions.map((session) => {
        const paid = isSessionPaid(session);
        const sessionRate = session.ratePerLesson ?? rate;
        const presentNames = session.records
          .filter((r) => r.status === 'present' || r.status === 'late')
          .map((r) => r.studentName);
        const absentNames = session.records
          .filter((r) => r.status === 'absent')
          .map((r) => r.studentName);

        const attendanceSummary =
          presentNames.length === STUDENTS.length
            ? 'All present'
            : presentNames.length > 0
            ? `Present: ${presentNames.join(', ')}${absentNames.length > 0 ? ` (Absent: ${absentNames.join(', ')})` : ''}`
            : 'No students present';

        return `  • ${session.date}: ${attendanceSummary} · ${sessionRate} ${currency} [${paid ? 'PAID ✓' : 'UNPAID'}]`;
      }),
    ];

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 3000);
    });
  }

  return (
    <div className="attendance-page" style={{ paddingBottom: '60px' }}>
      {/* Title */}
      <div className="page-heading" style={{ marginBottom: '20px' }}>
        <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CalendarCheck size={14} style={{ color: '#286654' }} />
          LESSON ATTENDANCE & PAYMENTS
        </div>
        <h1 style={{ fontSize: '28px', margin: '4px 0', fontWeight: 800 }}>
          {role === 'Teacher' ? 'Attendance & Payments' : `${currentStudent.name}’s Lesson History`}
        </h1>
        <p style={{ color: '#6d7f6c', fontSize: '13px' }}>
          {role === 'Teacher'
            ? 'Tick who is present for each lesson date, then mark paid when payment is received. (900 CZK flat per lesson — 300 CZK each student · does not matter how many kids attend)'
            : 'Review the lessons you attended and payment status.'}
        </p>
      </div>

      {/* Top Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        {/* Card 1: Balance & Payment Status */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e1e7dc',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#7a8e7a', fontWeight: 700 }}>
                Group Balance
              </div>
              <strong style={{ fontSize: '20px', color: '#273f3b', marginTop: '2px', display: 'block' }}>
                {overallTotals.balanceDue > 0
                  ? `${overallTotals.balanceDue.toLocaleString()} ${currency} Due`
                  : 'All Lessons Paid'}
              </strong>
            </div>

            <span
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 700,
                background: overallTotals.balanceDue > 0 ? '#fff3d9' : '#eaf4e8',
                color: overallTotals.balanceDue > 0 ? '#8a6523' : '#356330',
                border: `1px solid ${overallTotals.balanceDue > 0 ? '#f0ddb0' : '#cbe4c5'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {overallTotals.balanceDue > 0 ? (
                <>
                  <Clock size={12} />
                  {overallTotals.unpaidLessons} unpaid {overallTotals.unpaidLessons === 1 ? 'lesson' : 'lessons'}
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} />
                  Up to date
                </>
              )}
            </span>
          </div>

          <div style={{ fontSize: '12px', color: '#6d7f6c' }}>
            <strong>{overallTotals.paidLessons}</strong> of <strong>{overallTotals.totalLessons}</strong> lessons paid
            {' '}· Total: {overallTotals.totalCharged.toLocaleString()} {currency}
          </div>

          {role === 'Teacher' && overallTotals.unpaidLessons > 0 && (
            <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
              <button
                className="text-button"
                onClick={handleMarkAllLessonsPaid}
                disabled={busy}
                style={{
                  background: '#eef6ec',
                  border: '1px solid #cce4c8',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#286654',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Check size={12} />
                Mark all lessons as paid
              </button>
            </div>
          )}
        </div>

        {/* Card 2: Student Attendance Overview */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e1e7dc',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} style={{ color: '#286654' }} />
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#7a8e7a', fontWeight: 700 }}>
              Student Attendance
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
            {STUDENTS.map((st) => {
              const stats = studentStats[st.id] || { attended: 0, totalSessions: 0 };
              const percent = stats.totalSessions > 0 ? Math.round((stats.attended / stats.totalSessions) * 100) : 100;

              return (
                <div
                  key={st.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: '1px dashed #f0f4ee',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="avatar tiny" style={{ fontSize: '11px', width: '22px', height: '22px' }}>
                      {st.avatar}
                    </div>
                    <strong style={{ fontSize: '13px', color: '#334739' }}>{st.name}</strong>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: percent === 100 ? '#286654' : '#6d7f6c',
                      background: percent === 100 ? '#eaf4e8' : '#f5f7f3',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {stats.attended}/{stats.totalSessions} attended ({percent}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Pricing & Share Statement */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e1e7dc',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#7a8e7a', fontWeight: 700 }}>
                Lesson Rate & Price History
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#286654',
                  background: '#eaf4e8',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                {Math.round(rate / (STUDENTS.length || 3))} {currency} / student
              </span>
            </div>

            <strong style={{ fontSize: '20px', color: '#273f3b', marginTop: '4px', display: 'block' }}>
              {rate} {currency} <span style={{ fontSize: '12px', fontWeight: 500, color: '#7a8e7a' }}>/ lesson (flat group fee)</span>
            </strong>
            <p style={{ fontSize: '12px', color: '#6d7f6c', margin: '4px 0 0' }}>
              {rate} {currency} per lesson ({Math.round(rate / (STUDENTS.length || 3))} {currency} each student) · does not matter how many kids attend.
            </p>
          </div>

          {/* Price History breakdown */}
          <div
            style={{
              background: '#f9fbf8',
              border: '1px solid #e5ece0',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: '#4a604f' }}>
              <History size={12} style={{ color: '#286654' }} />
              <span>Price History:</span>
            </div>

            {priceHistory.map((h) => {
              const perStudent = Math.round(h.price / (STUDENTS.length || 3));
              const dateSpan =
                h.minDate === h.maxDate ? h.minDate : `${h.minDate} – ${h.maxDate}`;
              return (
                <div
                  key={h.price}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: '#495d4d',
                    padding: '2px 0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <strong>{h.price} {currency}</strong>
                    <span style={{ color: '#7c907e' }}>({perStudent} {currency}/student)</span>
                    {h.isCurrent ? (
                      <span
                        style={{
                          background: '#e4f3e0',
                          color: '#286654',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '10px',
                        }}
                      >
                        Current
                      </span>
                    ) : (
                      <span
                        style={{
                          background: '#fcf3e1',
                          color: '#7b5719',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '10px',
                        }}
                        title={dateSpan}
                      >
                        Past ({dateSpan})
                      </span>
                    )}
                  </div>
                  <span style={{ color: '#7a8e7a', fontWeight: 500 }}>
                    {h.count} {h.count === 1 ? 'lesson' : 'lessons'}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
            <button
              className="text-button"
              onClick={handleCopyInvoice}
              style={{
                border: '1px solid #dce4d5',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                background: copiedSummary ? '#e9f4e6' : '#fff',
                color: copiedSummary ? '#286654' : '#55695b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
            >
              {copiedSummary ? <Check size={12} /> : <Copy size={12} />}
              {copiedSummary ? 'Statement Copied!' : 'Copy Summary for Parents'}
            </button>
          </div>
        </div>
      </div>

      {/* Teacher: Quick 1-Step Add Lesson Form */}
      {role === 'Teacher' && (
        <form
          onSubmit={handleAddLesson}
          style={{
            background: '#f2f7ef',
            border: '1px solid #dbe6d5',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} style={{ color: '#286654' }} />
            <strong style={{ fontSize: '13px', color: '#273f3b' }}>Lesson Date:</strong>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #cedbc9',
                background: '#fff',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Manual Lesson Price Entry */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <strong style={{ fontSize: '13px', color: '#273f3b' }}>Price:</strong>
            <div style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', border: '1px solid #cedbc9', borderRadius: '6px', padding: '0 8px' }}>
              <input
                type="number"
                min="0"
                step="50"
                required
                value={lessonPrice}
                onChange={(e) => setLessonPrice(e.target.value)}
                style={{
                  width: '65px',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  padding: '7px 0',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#273f3b',
                  textAlign: 'right',
                }}
              />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6d7f6c', marginLeft: '4px' }}>
                {currency}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#657a68' }}>
              ({STUDENTS.length > 0 ? Math.round(Number(lessonPrice || 0) / STUDENTS.length) : 0} {currency}/student)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#4d6353' }}>Who attended?</span>
            {STUDENTS.map((s) => (
              <label
                key={s.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  background: presentMap[s.id] ? '#e5f2e2' : '#fff',
                  border: `1px solid ${presentMap[s.id] ? '#a9d4a2' : '#d2ddd0'}`,
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontWeight: presentMap[s.id] ? 700 : 500,
                  color: presentMap[s.id] ? '#286654' : '#687766',
                }}
              >
                <input
                  type="checkbox"
                  checked={!!presentMap[s.id]}
                  onChange={(e) =>
                    setPresentMap((prev) => ({
                      ...prev,
                      [s.id]: e.target.checked,
                    }))
                  }
                  style={{ width: 'auto', margin: 0 }}
                />
                {s.name}
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="primary"
            disabled={busy}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={14} />
            + Record Lesson ({Number(lessonPrice) > 0 ? Number(lessonPrice) : rate} {currency})
          </button>
        </form>
      )}

      {/* Date Sheet (Table of Lessons) */}
      <div style={{ background: '#fff', border: '1px solid #e1e7dc', borderRadius: '12px', overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #edf1ea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <strong style={{ fontSize: '14px', color: '#273f3b' }}>Attendance & Payment History</strong>
          <span style={{ fontSize: '11px', color: '#7a8c79' }}>
            {sortedSessions.length} {sortedSessions.length === 1 ? 'lesson date' : 'lesson dates'} logged · Current rate: {rate} {currency} flat / lesson ({Math.round(rate / (STUDENTS.length || 3))} {currency} each)
          </span>
        </div>

        {sortedSessions.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#7a8d7a' }}>
            No lessons recorded yet. Pick a date above and click &quot;Record Lesson&quot;.
          </div>
        ) : (
          <div>
            {sortedSessions.map((session) => {
              const dateObj = new Date(session.date);
              const formattedDate = dateObj.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              const paid = isSessionPaid(session);
              const sessionRate = session.ratePerLesson ?? rate;
              const sessionPerStudent = Math.round(sessionRate / (STUDENTS.length || 3));
              const isEditingPrice = editingPriceSessionId === session.id;

              return (
                <div
                  key={session.id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid #f1f4ee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Date Label */}
                  <div style={{ minWidth: '150px' }}>
                    <strong style={{ fontSize: '13px', color: '#273f3b', display: 'block' }}>
                      {formattedDate}
                    </strong>
                    <span style={{ fontSize: '11px', color: '#889886' }}>
                      {session.topic || 'Lesson'}
                    </span>
                  </div>

                  {/* Student Attendance Ticks (Who is present) */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#7a8c79', fontWeight: 600, marginRight: '4px' }}>
                      Attendance:
                    </span>
                    {session.records
                      .filter((rec) => (role === 'Student' ? rec.studentId === currentStudent.id : true))
                      .map((rec) => {
                        const isPresent = rec.status === 'present' || rec.status === 'late';

                        return (
                          <button
                            key={rec.studentId}
                            type="button"
                            onClick={() => toggleStudentPresence(session, rec.studentId)}
                            disabled={role !== 'Teacher' || busy}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: isPresent ? '#e8f3e5' : '#f5f5f3',
                              color: isPresent ? '#286654' : '#8c958a',
                              border: `1px solid ${isPresent ? '#b6deb0' : '#d8dad4'}`,
                              cursor: role === 'Teacher' ? 'pointer' : 'default',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title={role === 'Teacher' ? `Click to toggle ${rec.studentName} present / absent` : undefined}
                          >
                            <span>{rec.studentName}:</span>
                            <span>{isPresent ? '✓ Present' : '✕ Absent'}</span>
                          </button>
                        );
                      })}
                  </div>

                  {/* Lesson Price & Payment Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Manual Price Display & Inline Editor */}
                    {isEditingPrice ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#fff',
                          padding: '3px 6px',
                          border: '1px solid #7cb372',
                          borderRadius: '6px',
                        }}
                      >
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={editingPriceInput}
                          onChange={(e) => setEditingPriceInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveSessionPrice(session);
                            }
                            if (e.key === 'Escape') {
                              handleCancelEditPrice();
                            }
                          }}
                          autoFocus
                          style={{
                            width: '58px',
                            padding: '2px 4px',
                            fontSize: '12px',
                            fontWeight: 700,
                            border: '1px solid #cedbc9',
                            borderRadius: '4px',
                            textAlign: 'right',
                          }}
                        />
                        <span style={{ fontSize: '11px', color: '#6d7f6c' }}>{currency}</span>
                        <button
                          type="button"
                          onClick={() => handleSaveSessionPrice(session)}
                          disabled={busy}
                          style={{
                            background: '#286654',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                          title="Save price for this lesson"
                        >
                          <Check size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditPrice}
                          style={{
                            background: '#f0f3ee',
                            color: '#657766',
                            border: '1px solid #d2ded0',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                          title="Cancel"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#344738',
                            background: sessionRate === rate ? '#f2f7ef' : '#faf5e9',
                            border: `1px solid ${sessionRate === rate ? '#d5e4d2' : '#eedec0'}`,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title={`Lesson Fee: ${sessionRate} ${currency} (${sessionPerStudent} ${currency}/student)`}
                        >
                          {sessionRate} {currency}
                          <span style={{ fontSize: '10px', color: '#7a8e7a', fontWeight: 500 }}>
                            ({sessionPerStudent}/st)
                          </span>
                          {sessionRate !== rate && (
                            <span
                              style={{
                                fontSize: '9px',
                                background: '#edd39d',
                                color: '#745417',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                fontWeight: 700,
                              }}
                            >
                              Past
                            </span>
                          )}
                        </span>

                        {role === 'Teacher' && (
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => handleStartEditPrice(session)}
                            disabled={busy}
                            style={{
                              padding: '3px 5px',
                              color: '#526e57',
                              fontSize: '11px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              cursor: 'pointer',
                            }}
                            title="Edit price for this lesson"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Single Lesson Fee & Payment Button */}
                    <button
                      type="button"
                      onClick={() => toggleSessionPaid(session)}
                      disabled={role !== 'Teacher' || busy}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: paid ? '#286654' : '#fff4db',
                        color: paid ? '#fff' : '#8e6c27',
                        border: `1px solid ${paid ? '#286654' : '#ebd196'}`,
                        cursor: role === 'Teacher' ? 'pointer' : 'default',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                      title={role === 'Teacher' ? 'Click to toggle Paid / Unpaid for this lesson' : undefined}
                    >
                      {paid ? (
                        <>
                          <Check size={12} />
                          ✓ Paid · {sessionRate} {currency}
                        </>
                      ) : (
                        <>
                          <Clock size={12} />
                          Unpaid ({sessionRate} {currency})
                        </>
                      )}
                    </button>

                    {/* Delete Date Button (Teacher only) */}
                    {role === 'Teacher' && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete the lesson date for ${formattedDate}?`)) {
                            onDeleteAttendance(session.id);
                          }
                        }}
                        disabled={busy}
                        style={{
                          padding: '4px 8px',
                          color: '#b05252',
                          fontSize: '11px',
                          borderRadius: '6px',
                        }}
                        title="Delete this date"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
