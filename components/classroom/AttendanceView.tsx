'use client';

import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Plus,
  Check,
  Copy,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
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
  onSaveAttendanceBatch?: (entries: AttendanceEntry[], studentId?: string) => Promise<void>;
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
  const rate = billingConfig.defaultRate || 250;
  const currency = billingConfig.currency || 'CZK';

  // Inline "New Lesson" date and student presence
  const [newDate, setNewDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const s of STUDENTS) {
      init[s.id] = true; // default all present
    }
    return init;
  });

  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  // Sort sessions newest first
  const sortedSessions = useMemo(() => {
    return [...attendanceList].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [attendanceList]);

  // Per-student summary: attended count, paid count, unpaid count, balance due
  const studentTotals = useMemo(() => {
    const map: Record<
      string,
      {
        attended: number;
        paidCount: number;
        unpaidCount: number;
        totalCharged: number;
        balanceDue: number;
        dates: { date: string; status: 'present' | 'absent' | 'late'; paid: boolean }[];
      }
    > = {};

    for (const s of STUDENTS) {
      let attended = 0;
      let paidCount = 0;
      const dates: { date: string; status: 'present' | 'absent' | 'late'; paid: boolean }[] = [];

      for (const session of sortedSessions) {
        const rec = session.records.find((r) => r.studentId === s.id);
        if (rec) {
          const isPresent = rec.status === 'present' || rec.status === 'late';
          const isPaid = !!rec.paid;
          dates.push({ date: session.date, status: rec.status, paid: isPaid });
          if (isPresent) {
            attended += 1;
            if (isPaid) paidCount += 1;
          }
        }
      }

      const unpaidCount = Math.max(0, attended - paidCount);
      const totalCharged = attended * rate;
      const balanceDue = unpaidCount * rate;

      map[s.id] = {
        attended,
        paidCount,
        unpaidCount,
        totalCharged,
        balanceDue,
        dates,
      };
    }

    return map;
  }, [sortedSessions, rate]);

  // Add a new lesson session
  async function handleAddLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate) return;

    // Check if session for this date already exists
    const existing = sortedSessions.find((s) => s.date === newDate);

    const records = STUDENTS.map((s) => {
      const existingRec = existing?.records.find((r) => r.studentId === s.id);
      const isPresent = !!presentMap[s.id];
      return {
        studentId: s.id,
        studentName: s.name,
        status: (isPresent ? 'present' : 'absent') as 'present' | 'absent',
        chargeable: isPresent,
        paid: isPresent ? (existingRec?.paid ?? false) : false,
      };
    });

    const entry: AttendanceEntry = {
      id: existing ? existing.id : `att-${newDate}`,
      kind: 'attendance',
      date: newDate,
      topic: existing?.topic || `Lesson on ${newDate}`,
      ratePerLesson: rate,
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
          paid: nextStatus === 'present' ? r.paid : false,
        };
      }
      return r;
    });

    await onSaveAttendance({
      ...session,
      records: updatedRecords,
    });
  }

  // Toggle paid / unpaid on an existing date row
  async function toggleStudentPaid(session: AttendanceEntry, studentId: string) {
    if (role !== 'Teacher') return;
    const rec = session.records.find((r) => r.studentId === studentId);
    if (!rec || rec.status !== 'present') return;

    const nextPaid = !rec.paid;

    const updatedRecords = session.records.map((r) => {
      if (r.studentId === studentId) {
        return {
          ...r,
          paid: nextPaid,
        };
      }
      return r;
    });

    await onSaveAttendance({
      ...session,
      records: updatedRecords,
    });
  }

  // Mark all attended sessions as paid for a student
  async function handleMarkAllPaid(studentId: string) {
    if (role !== 'Teacher') return;

    const toUpdate: AttendanceEntry[] = [];
    for (const session of sortedSessions) {
      const rec = session.records.find((r) => r.studentId === studentId);
      if (rec && rec.status === 'present' && !rec.paid) {
        const updatedRecords = session.records.map((r) => {
          if (r.studentId === studentId) return { ...r, paid: true };
          return r;
        });
        toUpdate.push({
          ...session,
          records: updatedRecords,
        });
      }
    }

    if (toUpdate.length === 0) return;

    if (onSaveAttendanceBatch) {
      await onSaveAttendanceBatch(toUpdate, studentId);
    } else {
      for (const item of toUpdate) {
        await onSaveAttendance(item);
      }
    }
  }

  // Copy quick invoice statement
  function handleCopyInvoice(student: Student) {
    const t = studentTotals[student.id];
    if (!t) return;

    const dateList = t.dates
      .filter((d) => d.status === 'present')
      .map((d) => `  • ${d.date}: Present · 250 CZK [${d.paid ? 'PAID ✓' : 'UNPAID'}]`)
      .join('\n');

    const text = `📋 Little Steps · Lesson Attendance
Student: ${student.name}
Rate: 250 CZK / lesson
Lessons Attended: ${t.attended} (${t.totalCharged.toLocaleString()} CZK)
Lessons Paid:     ${t.paidCount}

Dates:
${dateList || '  • No recorded sessions'}

Outstanding Due: ${t.balanceDue.toLocaleString()} CZK (${t.unpaidCount} unpaid ${t.unpaidCount === 1 ? 'lesson' : 'lessons'})`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedStudentId(student.id);
      setTimeout(() => setCopiedStudentId(null), 3000);
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
            ? 'Tick who is present for each lesson date, then mark paid when payment is received. (250 CZK per student)'
            : 'Review the lessons you attended and payment status.'}
        </p>
      </div>

      {/* Top Student Balance Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: role === 'Student' ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        {STUDENTS.filter((st) => (role === 'Student' ? st.id === currentStudent.id : true)).map((st) => {
          const t = studentTotals[st.id] || { attended: 0, paidCount: 0, unpaidCount: 0, totalCharged: 0, balanceDue: 0 };
          const isCopied = copiedStudentId === st.id;

          return (
            <div
              key={st.id}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="avatar tiny" style={{ fontSize: '13px' }}>
                    {st.avatar}
                  </div>
                  <div>
                    <strong style={{ fontSize: '15px' }}>{st.name}</strong>
                    <div style={{ fontSize: '11px', color: '#7a8e7a' }}>
                      {t.attended} {t.attended === 1 ? 'lesson' : 'lessons'} attended
                    </div>
                  </div>
                </div>

                {/* Balance badge */}
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: t.balanceDue > 0 ? '#fff3d9' : '#eaf4e8',
                    color: t.balanceDue > 0 ? '#8a6523' : '#356330',
                    border: `1px solid ${t.balanceDue > 0 ? '#f0ddb0' : '#cbe4c5'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {t.balanceDue > 0 ? (
                    <>
                      <Clock size={12} />
                      Unpaid: {t.balanceDue.toLocaleString()} {currency} ({t.unpaidCount})
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={12} />
                      All Paid
                    </>
                  )}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: 'auto', paddingTop: '4px' }}>
                {role === 'Teacher' && t.unpaidCount > 0 && (
                  <button
                    className="text-button"
                    onClick={() => handleMarkAllPaid(st.id)}
                    disabled={busy}
                    style={{
                      background: '#eef6ec',
                      border: '1px solid #cce4c8',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#286654',
                      fontWeight: 600,
                    }}
                  >
                    ✓ Mark all paid
                  </button>
                )}

                <button
                  className="text-button"
                  onClick={() => handleCopyInvoice(st)}
                  style={{
                    marginLeft: 'auto',
                    border: '1px solid #dce4d5',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    background: isCopied ? '#e9f4e6' : '#fff',
                    color: isCopied ? '#286654' : '#55695b',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                  {isCopied ? 'Copied!' : 'Copy Summary'}
                </button>
              </div>
            </div>
          );
        })}
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
            gap: '18px',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
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
            + Record Lesson
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
            {sortedSessions.length} {sortedSessions.length === 1 ? 'lesson date' : 'lesson dates'} logged
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

                  {/* Student Attendance & Payment Controls */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-start' }}>
                    {session.records
                      .filter((rec) => (role === 'Student' ? rec.studentId === currentStudent.id : true))
                      .map((rec) => {
                        const isPresent = rec.status === 'present';
                        const isPaid = !!rec.paid;

                        return (
                          <div
                            key={rec.studentId}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#f8faf7',
                              border: '1px solid #e2e8de',
                              padding: '5px 8px',
                              borderRadius: '8px',
                            }}
                          >
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334739', minWidth: '45px' }}>
                              {rec.studentName}:
                            </span>

                            {/* Present / Absent button */}
                            <button
                              type="button"
                              onClick={() => toggleStudentPresence(session, rec.studentId)}
                              disabled={role !== 'Teacher' || busy}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '5px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: isPresent ? '#e8f3e5' : '#f5f5f3',
                                color: isPresent ? '#286654' : '#8c958a',
                                border: `1px solid ${isPresent ? '#b6deb0' : '#d8dad4'}`,
                                cursor: role === 'Teacher' ? 'pointer' : 'default',
                              }}
                              title={role === 'Teacher' ? 'Click to toggle Present / Absent' : undefined}
                            >
                              {isPresent ? '✓ Present' : '✕ Absent'}
                            </button>

                            {/* Paid / Unpaid button (only shown if present) */}
                            {isPresent && (
                              <button
                                type="button"
                                onClick={() => toggleStudentPaid(session, rec.studentId)}
                                disabled={role !== 'Teacher' || busy}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '5px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  background: isPaid ? '#286654' : '#fff4db',
                                  color: isPaid ? '#fff' : '#8e6c27',
                                  border: `1px solid ${isPaid ? '#286654' : '#ebd196'}`,
                                  cursor: role === 'Teacher' ? 'pointer' : 'default',
                                }}
                                title={role === 'Teacher' ? 'Click to toggle Paid / Unpaid' : undefined}
                              >
                                {isPaid ? '✓ Paid' : `Unpaid (${rate} ${currency})`}
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>

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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
