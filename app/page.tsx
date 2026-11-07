'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type {
  Entry,
  AssignmentEntry,
  MaterialEntry,
  SubmissionEntry,
  MessageEntry,
  AttendanceEntry,
  BillingConfigEntry,
  DeletedAttendanceEntry,
  Role,
  HomeworkStatus,
  FileAttachment,
  GoogleDriveAttachment,
  Student,
  InteractiveActivity,
  WritingScorecard,
  AssignmentTaskType,
  FlashCardItem,
  WordScrambleItem,
  QuizQuestion,
  DeletedAssignmentEntry,
} from '../lib/types';
import { parseGoogleDriveUrl } from '../lib/google-drive';
import {
  isAssignment,
  isMaterial,
  isSubmission,
  isMessage,
  isAttendance,
  isBillingConfig,
  isDeletedAttendance,
  isDeletedAssignment,
  STUDENTS,
  PREVIEW_STUDENT,
} from '../lib/types';
import type { ClassroomUser } from '../lib/auth-types';
import {
  INITIAL_ASSIGNMENTS,
  INITIAL_MATERIALS,
  INITIAL_ATTENDANCE,
  INITIAL_BILLING_CONFIG,
} from '../lib/initial-data';
import { Sidebar } from '../components/classroom/Sidebar';
import { Header } from '../components/classroom/Header';
import { HomeView } from '../components/classroom/HomeView';
import { HomeworkView } from '../components/classroom/HomeworkView';
import { RoadmapView } from '../components/classroom/RoadmapView';
import { MaterialsView } from '../components/classroom/MaterialsView';
import { MessagesView } from '../components/classroom/MessagesView';
import { AttendanceView } from '../components/classroom/AttendanceView';
import { EditorView } from '../components/classroom/EditorView';
import { ResourceModal, CreateModal } from '../components/classroom/Modals';
import { BackupModal } from '../components/classroom/BackupModal';
import { Toast } from '../components/classroom/Toast';
import { LoginView } from '../components/classroom/LoginView';
import { saveCurriculumBackup, getLatestCurriculumBackup } from '../lib/backup-storage';

function getInitialUserSession(): ClassroomUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem('classroom_user_session');
    if (cached) {
      const parsed = JSON.parse(cached) as ClassroomUser;
      if (parsed && parsed.username) {
        // Enforce 30-day session persistence
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem('classroom_user_session');
          return null;
        }
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function getInitialClassroomRows(): Entry[] {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem('classroom_saved_rows');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return (parsed as Entry[]).map((entry) => {
          if (
            entry.kind === 'assignment' &&
            ['a0', 'a1', 'a2', 'a3', 'a4'].includes(entry.id) &&
            (entry as AssignmentEntry).posted === false
          ) {
            return { ...entry, posted: true };
          }
          return entry;
        });
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function persistRows(rowsToSave: Entry[], trigger?: string): void {
  try {
    localStorage.setItem('classroom_saved_rows', JSON.stringify(rowsToSave));
  } catch {
    // ignore
  }
  saveCurriculumBackup(rowsToSave, trigger || 'persist_rows').catch(() => {});
}

function queueEntryForBackgroundSync(entry: Entry): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('classroom_pending_sync_queue');
    const list: Entry[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((e) => e.id !== entry.id);
    filtered.push(entry);
    localStorage.setItem('classroom_pending_sync_queue', JSON.stringify(filtered));
  } catch {}
}

function removeEntryFromBackgroundSyncQueue(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('classroom_pending_sync_queue');
    if (!raw) return;
    const list: Entry[] = JSON.parse(raw);
    const filtered = list.filter((e) => e.id !== id);
    localStorage.setItem('classroom_pending_sync_queue', JSON.stringify(filtered));
  } catch {}
}

function getPendingSyncQueue(): Entry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('classroom_pending_sync_queue');
    return raw ? (JSON.parse(raw) as Entry[]) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<ClassroomUser | null>(getInitialUserSession);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(() => !getInitialUserSession());
  const [page, setPage] = useState<string>('Home');
  const [role, setRole] = useState<Role>(() => getInitialUserSession()?.role || 'Student');
  const [selectedStudent, setSelectedStudent] = useState<Student>(() => {
    const initialUser = getInitialUserSession();
    if (initialUser?.role === 'Student' && initialUser.studentId) {
      const matched = STUDENTS.find((s) => s.id === initialUser.studentId);
      if (matched) return matched;
    }
    return STUDENTS[0];
  });
  const [reviewingStudent, setReviewingStudent] = useState<Student>(STUDENTS[0]); // Default to Hajun
  const [rows, setRows] = useState<Entry[]>(getInitialClassroomRows);
  const [active, setActive] = useState<AssignmentEntry | null>(null);
  const [resource, setResource] = useState<MaterialEntry | null>(null);
  const [modal, setModal] = useState<string>('');
  const [editingAssignment, setEditingAssignment] = useState<AssignmentEntry | null>(null);
  const [toast, setToast] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<string>('All homework');
  const [query, setQuery] = useState<string>('');
  const [draft, setDraft] = useState<string>('');
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [scorecard, setScorecard] = useState<WritingScorecard | undefined>(undefined);
  const [annotations, setAnnotations] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [dirty, setDirty] = useState<boolean>(false);

  const isTeacherReviewing =
    role === 'Student' && (currentUser?.role === 'Teacher' || !currentUser?.studentId);
  const activeStudent = isTeacherReviewing ? PREVIEW_STUDENT : selectedStudent;

  const applyUserSession = useCallback((user: ClassroomUser) => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const sessionWithExpiry: ClassroomUser = {
      ...user,
      expiresAt: user.expiresAt || Date.now() + THIRTY_DAYS_MS,
    };
    try {
      localStorage.setItem('classroom_user_session', JSON.stringify(sessionWithExpiry));
      localStorage.removeItem('classroom_device_account');
    } catch {
      // ignore
    }
    setCurrentUser(sessionWithExpiry);
    setRole(sessionWithExpiry.role);
    if (sessionWithExpiry.role === 'Student' && sessionWithExpiry.studentId) {
      const student = STUDENTS.find((s) => s.id === sessionWithExpiry.studentId);
      if (student) setSelectedStudent(student);
    }
  }, []);

  // Validate / synchronize session with server on load
  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as { authenticated: boolean; user?: ClassroomUser };
          if (data.authenticated && data.user) {
            applyUserSession(data.user);
          }
        } else if (res.status === 401) {
          try {
            localStorage.removeItem('classroom_user_session');
          } catch {}
          setCurrentUser(null);
        }
      })
      .finally(() => setCheckingAuth(false));
  }, [applyUserSession]);

  // Fetch initial records from storage, combine with durable IndexedDB backup, and heal server if needed
  useEffect(() => {
    if (!currentUser) return;

    Promise.all([
      fetch('/api/data')
        .then(async (response) => {
          if (!response.ok) {
            const errData = (await response.json()) as { error?: string };
            throw new Error(errData.error || 'Failed to load classroom data');
          }
          return response.json() as Promise<Entry[]>;
        })
        .catch(() => null),
      getLatestCurriculumBackup().catch(() => null),
    ])
      .then(([serverData, durableBackup]) => {
        const rawServer = serverData || [];
        const formattedServer = rawServer.map((item) => ({
          ...item,
          id: item.localId || item.id,
        }));

        setRows((prev) => {
          const serverMap = new Map(formattedServer.map((item) => [item.id, item]));
          const allTombstones = [
            ...formattedServer.filter(isDeletedAttendance),
            ...prev.filter(isDeletedAttendance),
            ...(durableBackup ? durableBackup.filter(isDeletedAttendance) : []),
          ];
          const allDeletedIds = new Set(allTombstones.map((t) => t.targetId));
          const allDeletedDates = new Set(
            allTombstones
              .map((t) => (t as unknown as { date?: string }).date)
              .filter((d): d is string => Boolean(d))
          );

          const merged = [...formattedServer];
          const unsavedToSync: Entry[] = [];

          // Merge local in-memory/localStorage items
          for (const localItem of prev) {
            if (isAttendance(localItem)) {
              if (
                allDeletedIds.has(localItem.id) ||
                (localItem.date && allDeletedDates.has(localItem.date))
              ) {
                continue;
              }
            }

            if (!serverMap.has(localItem.id)) {
              merged.push(localItem);
              serverMap.set(localItem.id, localItem);
              unsavedToSync.push(localItem);
            }
          }

          // Merge durable IndexedDB items (recovers custom assignments if server container rebooted)
          if (durableBackup) {
            for (const backupItem of durableBackup) {
              if (isAttendance(backupItem)) {
                if (
                  allDeletedIds.has(backupItem.id) ||
                  (backupItem.date && allDeletedDates.has(backupItem.date))
                ) {
                  continue;
                }
              }

              if (!serverMap.has(backupItem.id)) {
                merged.push(backupItem);
                serverMap.set(backupItem.id, backupItem);
                unsavedToSync.push(backupItem);
              }
            }
          }

          persistRows(merged, 'initial_sync_merge');

          if (unsavedToSync.length > 0) {
            const syncable = unsavedToSync.filter((entry) => {
              if (currentUser.role === 'Teacher') return true;
              return entry.kind === 'submission' || entry.kind === 'message';
            });
            if (syncable.length > 0) {
              fetch('/api/data', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-user-role': currentUser.role,
                },
                body: JSON.stringify(syncable),
              }).catch(() => {});
            }
          }

          return merged;
        });
        setLoaded(true);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoaded(true);
      });
  }, [currentUser]);

  // Periodic background re-synchronization & window-focus live update across devices
  useEffect(() => {
    if (!currentUser) return;

    const pullLatestData = () => {
      // Flush any queued offline entries (e.g. submissions handed in while offline)
      const pendingQueue = getPendingSyncQueue();
      if (pendingQueue.length > 0) {
        fetch('/api/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentUser?.role || role,
          },
          body: JSON.stringify(pendingQueue),
        })
          .then((res) => {
            if (res.ok) {
              for (const item of pendingQueue) {
                removeEntryFromBackgroundSyncQueue(item.id);
              }
            }
          })
          .catch(() => {});
      }

      // Don't interrupt if the user is actively typing an unsaved draft
      if (dirty) return;

      fetch('/api/data')
        .then(async (response) => {
          if (!response.ok) return null;
          return response.json() as Promise<Entry[]>;
        })
        .then((serverData) => {
          if (!serverData || !Array.isArray(serverData)) return;
          const formatted = serverData.map((item) => ({
            ...item,
            id: item.localId || item.id,
          }));

          setRows((prev) => {
            const prevMap = new Map(prev.map((item) => [item.id, JSON.stringify(item)]));
            let hasChanges = false;
            for (const item of formatted) {
              const prevStr = prevMap.get(item.id);
              if (!prevStr || prevStr !== JSON.stringify(item)) {
                hasChanges = true;
                break;
              }
            }

            if (!hasChanges) return prev;

            const nextMap = new Map(prev.map((item) => [item.id, item]));
            for (const item of formatted) {
              nextMap.set(item.id, item);
            }
            const nextList = Array.from(nextMap.values());
            persistRows(nextList, 'background_live_sync');
            return nextList;
          });
        })
        .catch(() => {});
    };

    // Revalidate when user switches back to this tab/window
    const handleFocus = () => pullLatestData();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pullLatestData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    // Auto-poll every 10 seconds for live simultaneous updates without manual page refresh
    const interval = setInterval(pullLatestData, 10000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [currentUser, dirty]);

  // Prevent accidental navigation when unsaved changes exist
  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  // Toast auto-dismissal
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Derived datasets
  const allAssignments = useMemo<AssignmentEntry[]>(() => {
    const deletedIds = new Set(
      rows.filter(isDeletedAssignment).map((d) => d.targetId)
    );
    const custom = rows.filter(isAssignment).filter((a) => !deletedIds.has(a.id));
    const initialMapped = INITIAL_ASSIGNMENTS
      .filter((init) => !deletedIds.has(init.id))
      .map((init) => {
        const overridden = custom.find((c) => c.id === init.id);
        return overridden || init;
      });
    const newCustom = custom.filter((c) => !INITIAL_ASSIGNMENTS.some((init) => init.id === c.id));
    return [...newCustom, ...initialMapped];
  }, [rows]);

  const allMaterials = useMemo<MaterialEntry[]>(() => {
    const custom = rows.filter(isMaterial);
    const initialMapped = INITIAL_MATERIALS.map((init) => {
      const overridden = custom.find((c) => c.id === init.id);
      return overridden || init;
    });
    const newCustom = custom.filter((c) => !INITIAL_MATERIALS.some((init) => init.id === c.id));
    return [...newCustom, ...initialMapped];
  }, [rows]);

  const visibleAssignments = useMemo<AssignmentEntry[]>(() => {
    if (role === 'Teacher') return allAssignments;
    return allAssignments.filter((a) => a.posted !== false);
  }, [allAssignments, role]);

  const allMessages = useMemo<MessageEntry[]>(() => {
    return rows.filter(isMessage);
  }, [rows]);

  const allAttendance = useMemo<AttendanceEntry[]>(() => {
    const tombstones = rows.filter((r): r is DeletedAttendanceEntry => isDeletedAttendance(r));
    const deletedIds = new Set(tombstones.map((r) => r.targetId));
    const deletedDates = new Set(
      tombstones
        .map((r) => (r as unknown as { date?: string }).date)
        .filter((d): d is string => Boolean(d))
    );

    const isRecordDeleted = (id: string, date?: string) =>
      deletedIds.has(id) || (Boolean(date) && deletedDates.has(date!));

    const custom = rows.filter(isAttendance).filter((c) => !isRecordDeleted(c.id, c.date));
    const result: AttendanceEntry[] = [];
    const seenDates = new Set<string>();

    // Custom items are latest teacher edits
    for (const c of custom) {
      result.push(c);
      seenDates.add(c.date);
    }

    // Add initial remaining attendance dates that haven't been deleted or replaced
    for (const init of INITIAL_ATTENDANCE) {
      if (
        !isRecordDeleted(init.id, init.date) &&
        !seenDates.has(init.date) &&
        !custom.some((c) => c.id === init.id)
      ) {
        result.push(init);
        seenDates.add(init.date);
      }
    }

    return result;
  }, [rows]);

  const billingConfig = useMemo<BillingConfigEntry>(() => {
    const custom = rows.find(isBillingConfig);
    return custom || INITIAL_BILLING_CONFIG;
  }, [rows]);


  // Retrieve submission for a specific assignment and student
  const getSubmission = useCallback(
    (assignmentId: string, studentId: string): SubmissionEntry | undefined => {
      return rows.find(
        (entry): entry is SubmissionEntry =>
          isSubmission(entry) &&
          entry.assignment === assignmentId &&
          (entry.studentId === studentId || (!entry.studentId && studentId === 'hajun'))
      );
    },
    [rows]
  );

  // Retrieve all student submissions for an assignment
  const getStudentSubmissions = useCallback(
    (assignment: AssignmentEntry): Record<string, HomeworkStatus> => {
      const result: Record<string, HomeworkStatus> = {};
      for (const st of STUDENTS) {
        const sub = getSubmission(assignment.id, st.id);
        result[st.id] = sub?.status || 'To do';
      }
      return result;
    },
    [getSubmission]
  );

  // Status for the active student in student mode
  const getHomeworkStatus = useCallback(
    (assignment: AssignmentEntry): HomeworkStatus => {
      return getSubmission(assignment.id, activeStudent.id)?.status || 'To do';
    },
    [getSubmission, activeStudent.id]
  );

  const completedCount = useMemo(() => {
    return visibleAssignments.filter((a) =>
      ['Handed in', 'Reviewed'].includes(getHomeworkStatus(a))
    ).length;
  }, [visibleAssignments, getHomeworkStatus]);

  async function action(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Try again.';
      setToast(msg);
    } finally {
      setBusy(false);
    }
  }

  async function saveEntry(entry: Entry) {
    // 1. Local-first optimistic durability: ALWAYS save to React state & durable storage immediately
    setRows((prev) => {
      const next = [...prev.filter((x) => x.id !== entry.id), entry];
      persistRows(next, `save_${entry.kind}`);
      return next;
    });

    // Dedicated local vault for student essay submissions
    if (entry.kind === 'submission') {
      try {
        localStorage.setItem(`saved_sub_${entry.assignment}_${entry.studentId}`, JSON.stringify(entry));
        localStorage.removeItem(`active_draft_${entry.assignment}_${entry.studentId}`);
      } catch {}
    }

    // 2. Dispatch to server in background
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || role,
        },
        body: JSON.stringify(entry),
      });

      if (!res.ok) {
        queueEntryForBackgroundSync(entry);
        return;
      }

      removeEntryFromBackgroundSyncQueue(entry.id);
    } catch {
      // Offline or network glitch: queued for background auto-retry
      queueEntryForBackgroundSync(entry);
    }
  }

  async function saveEntries(entries: Entry[]) {
    if (entries.length === 0) return;

    // 1. Local-first optimistic durability
    setRows((prev) => {
      const ids = new Set(entries.map((e) => e.id));
      const next = [...prev.filter((x) => !ids.has(x.id)), ...entries];
      persistRows(next, 'save_batch');
      return next;
    });

    for (const entry of entries) {
      if (entry.kind === 'submission') {
        try {
          localStorage.setItem(`saved_sub_${entry.assignment}_${entry.studentId}`, JSON.stringify(entry));
          localStorage.removeItem(`active_draft_${entry.assignment}_${entry.studentId}`);
        } catch {}
      }
    }

    // 2. Dispatch to server in background
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || role,
        },
        body: JSON.stringify(entries),
      });

      if (!res.ok) {
        for (const e of entries) queueEntryForBackgroundSync(e);
        return;
      }

      for (const e of entries) removeEntryFromBackgroundSyncQueue(e.id);
    } catch {
      for (const e of entries) queueEntryForBackgroundSync(e);
    }
  }

  function openAssignment(assignment: AssignmentEntry) {
    if (role === 'Student' && !assignment.posted) {
      setToast('This homework assignment has not been released yet.');
      return;
    }
    setActive(assignment);
    const targetStudent = role === 'Teacher' ? reviewingStudent : activeStudent;
    const existingSubmission = getSubmission(assignment.id, targetStudent.id);

    // Check for saved local vault submission if not in memory
    let localSavedSubmission: SubmissionEntry | null = null;
    if (!existingSubmission && typeof window !== 'undefined') {
      try {
        const rawVault = localStorage.getItem(`saved_sub_${assignment.id}_${targetStudent.id}`);
        if (rawVault) {
          localSavedSubmission = JSON.parse(rawVault);
        }
      } catch {}
    }

    const sub = existingSubmission || localSavedSubmission;

    // Check for active uncommitted draft auto-save
    let autoDraft: string | null = null;
    if (typeof window !== 'undefined' && role === 'Student') {
      try {
        autoDraft = localStorage.getItem(`active_draft_${assignment.id}_${targetStudent.id}`);
      } catch {}
    }

    const initialDraft = autoDraft !== null ? autoDraft : (sub?.text || '');
    setDraft(initialDraft);
    setFiles(sub?.files || []);
    setFeedback(sub?.feedback || '');
    setScorecard(sub?.scorecard);
    setAnnotations(sub?.annotations || '');
    setDirty(autoDraft !== null && autoDraft !== (sub?.text || ''));
    setPage('Editor');
  }

  async function handleTogglePost(assignment: AssignmentEntry) {
    if (role !== 'Teacher') return;
    const newPostedStatus = !assignment.posted;
    const updatedAssignment: AssignmentEntry = {
      ...assignment,
      posted: newPostedStatus,
    };

    await action(async () => {
      await saveEntry(updatedAssignment);
      if (active && active.id === assignment.id) {
        setActive(updatedAssignment);
      }
      setToast(
        newPostedStatus
          ? `"${assignment.title}" is now posted to the classroom!`
          : `"${assignment.title}" unposted. Hidden from students.`
      );
    });
  }

  function handleOpenEditAssignment(assignment: AssignmentEntry) {
    if (role !== 'Teacher') return;
    setEditingAssignment(assignment);
    setModal('assignment');
  }

  function handleDeleteAssignment(assignment: AssignmentEntry) {
    if (role !== 'Teacher') return;
    const confirmed = window.confirm(
      `Are you sure you want to delete assignment "${assignment.title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    action(async () => {
      const res = await fetch(`/api/data?id=${encodeURIComponent(assignment.id)}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser?.role || role,
        },
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error || 'Failed to delete assignment.');
      }

      const tombstone: DeletedAssignmentEntry = {
        id: `del_asgn_${assignment.id}`,
        kind: 'deleted_assignment',
        targetId: assignment.id,
      };

      setRows((prev) => {
        const next = [
          ...prev.filter(
            (r) =>
              r.id !== assignment.id &&
              r.id !== tombstone.id &&
              !(isSubmission(r) && r.assignment === assignment.id)
          ),
          tombstone,
        ];
        persistRows(next);
        return next;
      });

      if (active && active.id === assignment.id) {
        setActive(null);
      }
      setToast(`Assignment "${assignment.title}" has been deleted.`);
    });
  }

  // Teacher switches which student they are reviewing in Editor
  function handleReviewingStudentChange(student: Student) {
    if (!active) return;
    setReviewingStudent(student);
    const existingSubmission = getSubmission(active.id, student.id);
    setDraft(existingSubmission?.text || '');
    setFiles(existingSubmission?.files || []);
    setFeedback(existingSubmission?.feedback || '');
    setScorecard(existingSubmission?.scorecard);
    setAnnotations(existingSubmission?.annotations || '');
    setDirty(false);
  }

  // Student switches who they are writing as
  function handleStudentChange(student: Student) {
    setSelectedStudent(student);
    if (active) {
      const existingSubmission = getSubmission(active.id, student.id);
      setDraft(existingSubmission?.text || '');
      setFiles(existingSubmission?.files || []);
      setFeedback(existingSubmission?.feedback || '');
      setScorecard(existingSubmission?.scorecard);
      setAnnotations(existingSubmission?.annotations || '');
      setDirty(false);
    }
  }

  const effectivePage =
    role === 'Student' && (page === 'Attendance' || page === 'Roadmap') ? 'Home' : page;

  function navigateTo(targetPage: string) {
    if (dirty && !confirm('Leave this draft without saving your latest changes?')) {
      return;
    }
    if (role === 'Student' && (targetPage === 'Attendance' || targetPage === 'Roadmap')) {
      return;
    }
    setDirty(false);
    setPage(targetPage);
    setActive(null);
  }

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setFilter('All homework');
    if (newRole === 'Student' && (page === 'Attendance' || page === 'Roadmap')) {
      setPage('Home');
    }
  };

  async function handleLogout() {
    try {
      localStorage.removeItem('classroom_user_session');
    } catch {
      // ignore
    }
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    setPage('Home');
    setToast('Signed out successfully.');
  }

  async function uploadFiles(list: FileList | null) {
    if (!list) return;

    await action(async () => {
      const added: FileAttachment[] = [];

      for (const file of Array.from(list)) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('Files must be smaller than 10 MB.');
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/files', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || 'File upload failed');
        }

        const fileMeta = (await response.json()) as FileAttachment;
        added.push(fileMeta);
      }

      setFiles((prev) => [...prev, ...added]);
      setDirty(true);
      setToast('Files uploaded. Save or hand in to attach them to your homework.');
    });
  }

  async function submitHomework(status: HomeworkStatus) {
    if (!active) return;

    if (status === 'Handed in' && !draft.trim() && !files.length) {
      setToast('Write something or attach a file first.');
      return;
    }

    await action(async () => {
      const existingSubmission = getSubmission(active.id, activeStudent.id);
      const submissionRecord: SubmissionEntry = {
        id: `s-${active.id}-${activeStudent.id}`,
        kind: 'submission',
        assignment: active.id,
        studentId: activeStudent.id,
        studentName: activeStudent.name,
        text: draft,
        files,
        status,
        feedback: existingSubmission?.feedback || '',
        scorecard: existingSubmission?.scorecard,
        activityScore: existingSubmission?.activityScore,
        updated: new Date().toISOString(),
      };

      await saveEntry(submissionRecord);
      setDirty(false);
      setToast(
        status === 'Handed in'
          ? isTeacherReviewing
            ? 'Homework handed in in student preview mode.'
            : `You did it, ${activeStudent.name}! Your homework is handed in.`
          : isTeacherReviewing
          ? 'Draft saved in student preview mode.'
          : `Draft saved for ${activeStudent.name}.`
      );
    });
  }

  const handleResetSubmission = () => {
    if (!active || role !== 'Teacher') return;
    const targetStudent = reviewingStudent;
    const submissionId = `s-${active.id}-${targetStudent.id}`;

    action(async () => {
      const res = await fetch(`/api/data?id=${encodeURIComponent(submissionId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Failed to remove submission');
      }

      setRows((prev) => {
        const next = prev.filter(
          (r) =>
            r.id !== submissionId &&
            (r as unknown as { localId?: string }).localId !== submissionId &&
            !(isSubmission(r) && r.assignment === active.id && r.studentId === targetStudent.id)
        );
        persistRows(next);
        return next;
      });
      setDraft('');
      setFiles([]);
      setFeedback('');
      setScorecard(undefined);
      setAnnotations('');
      setDirty(false);
      setToast(`Submission data for ${targetStudent.name} has been reset.`);
    });
  };

  // Student completes a warm-up edutainment activity in Editor
  const handleActivityComplete = (score: number, total: number) => {
    if (!active) return;
    action(async () => {
      const existingSubmission = getSubmission(active.id, activeStudent.id);
      const submissionRecord: SubmissionEntry = {
        id: `s-${active.id}-${activeStudent.id}`,
        kind: 'submission',
        assignment: active.id,
        studentId: activeStudent.id,
        studentName: activeStudent.name,
        text: draft,
        files,
        status: existingSubmission?.status || 'Draft',
        feedback: existingSubmission?.feedback || '',
        scorecard: existingSubmission?.scorecard,
        activityScore: {
          score,
          total,
          completedAt: new Date().toISOString(),
        },
        updated: new Date().toISOString(),
      };

      await saveEntry(submissionRecord);
      setToast(`Edutainment warm-up complete! Scored ${score}/${total} ⭐`);
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    action(async () => {
      const senderName = role === 'Student' ? activeStudent.name : 'Teacher';
      const newMsg: MessageEntry = {
        id: crypto.randomUUID(),
        kind: 'message',
        text: message.trim(),
        sender: senderName,
        studentId: role === 'Student' ? activeStudent.id : undefined,
        time: new Date().toISOString(),
      };

      await saveEntry(newMsg);
      setMessage('');
      setToast(`Message sent as ${senderName}.`);
    });
  };

  const handleSaveAttendance = async (entry: AttendanceEntry) => {
    await action(async () => {
      // Clear any prior deletion tombstones for this entry id or date
      setRows((prev) => {
        const next = prev.filter(
          (x) =>
            !(
              isDeletedAttendance(x) &&
              (x.targetId === entry.id ||
                (entry.date && (x as unknown as { date?: string }).date === entry.date))
            )
        );
        persistRows(next);
        return next;
      });
      await saveEntry(entry);
      setToast(`Attendance saved for ${entry.date || entry.topic || 'lesson'}.`);
    });
  };

  const handleSaveAttendanceBatch = async (entries: AttendanceEntry[], label?: string) => {
    await action(async () => {
      const entryIds = new Set(entries.map((e) => e.id));
      const entryDates = new Set(entries.map((e) => e.date).filter(Boolean));
      setRows((prev) => {
        const next = prev.filter(
          (x) =>
            !(
              isDeletedAttendance(x) &&
              (entryIds.has(x.targetId) ||
                (Boolean((x as unknown as { date?: string }).date) &&
                  entryDates.has((x as unknown as { date?: string }).date!)))
            )
        );
        persistRows(next);
        return next;
      });
      await saveEntries(entries);
      const studentName = label && label !== 'all'
        ? STUDENTS.find((s) => s.id === label)?.name || label
        : null;
      if (studentName) {
        setToast(`Marked ${entries.length} lesson${entries.length > 1 ? 's' : ''} as paid for ${studentName}.`);
      } else {
        const totalAmount = entries.reduce(
          (sum, e) => sum + (e.ratePerLesson || billingConfig.defaultRate || 900),
          0
        );
        setToast(`Marked ${entries.length} lesson${entries.length > 1 ? 's' : ''} as paid (${totalAmount.toLocaleString()} CZK).`);
      }
    });
  };

  const handleDeleteAttendance = async (id: string) => {
    await action(async () => {
      const targetSession = allAttendance.find((a) => a.id === id);
      const targetDate = targetSession?.date;
      const matchingInit = targetSession
        ? INITIAL_ATTENDANCE.find((init) => init.id === id || init.date === targetDate)
        : INITIAL_ATTENDANCE.find((init) => init.id === id);

      const matchingRows = rows.filter(
        (r) => isAttendance(r) && (r.id === id || (targetDate && r.date === targetDate))
      );

      const targetIds = Array.from(
        new Set([id, matchingInit?.id, ...matchingRows.map((r) => r.id)].filter(Boolean))
      ) as string[];

      const tombstones: DeletedAttendanceEntry[] = [];

      for (const targetId of targetIds) {
        try {
          const deleteUrl = targetDate
            ? `/api/data?id=${encodeURIComponent(targetId)}&date=${encodeURIComponent(targetDate)}`
            : `/api/data?id=${encodeURIComponent(targetId)}`;
          await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { 'x-user-role': role },
          });
        } catch {}

        tombstones.push({
          id: `del_${targetId}`,
          kind: 'deleted_attendance',
          targetId,
          ...(targetDate ? { date: targetDate } : {}),
        });
      }

      if (tombstones.length > 0) {
        await saveEntries(tombstones);
      }

      setRows((prev) => {
        const next = [
          ...prev.filter(
            (x) =>
              !targetIds.includes(x.id) &&
              (!isAttendance(x) || !targetDate || x.date !== targetDate) &&
              (!isDeletedAttendance(x) || !targetIds.includes(x.targetId))
          ),
          ...tombstones,
        ];
        persistRows(next);
        return next;
      });
      setToast('Lesson attendance entry deleted.');
    });
  };

  const handleSaveBillingConfig = async (config: BillingConfigEntry) => {
    await action(async () => {
      await saveEntry(config);
      setToast('Billing preferences and student balances updated.');
    });
  };


  const handleCreateModalSubmit = (fd: FormData) => {
    action(async () => {
      const title = String(fd.get('title') || '');
      const type = String(fd.get('type') || '');
      const activityType = String(fd.get('activityType') || 'none');

      let interactive: InteractiveActivity | undefined;
      if (activityType === 'word_scramble') {
        const word = String(fd.get('scramble_word1') || 'GLIMMER').trim().toUpperCase();
        const hint = String(fd.get('scramble_hint1') || 'A soft gentle shine');
        const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
        interactive = {
          type: 'word_scramble',
          title: `${title} Word Scramble`,
          words: [{ scrambled, word, hint }],
        };
      } else if (activityType === 'quiz') {
        const question = String(fd.get('quiz_question') || 'What makes a strong first draft?');
        const opt1 = String(fd.get('quiz_opt1') || 'Sharing honest ideas and feelings');
        const opt2 = String(fd.get('quiz_opt2') || 'Making it 100% perfect on the first try');
        const explanation = String(fd.get('quiz_explanation') || 'Drafts are for exploring your imagination!');
        interactive = {
          type: 'quiz',
          title: `${title} Comprehension Quiz`,
          questions: [
            {
              question,
              options: [opt1, opt2],
              correctIndex: 0,
              explanation,
            },
          ],
        };
      } else if (activityType === 'connecting_words') {
        interactive = {
          type: 'connecting_words',
          title: 'Connecting Words Challenge',
          pairs: [
            { phrase: 'For example', category: 'Give an example' },
            { phrase: 'However', category: 'Show a difference' },
            { phrase: 'In addition', category: 'Add an idea' },
          ],
        };
      }

      if (modal === 'assignment') {
        const taskFormat = (String(fd.get('taskFormat') || 'essay')) as AssignmentTaskType;
        const posted = fd.get('posted') === 'true';

        let interactive: InteractiveActivity | undefined;
        let icon = '✏️';
        let defaultType = 'Opinion essay';
        let color = 'mint';

        if (taskFormat === 'flashcards') {
          icon = '🗂️';
          color = 'lavender';
          defaultType = 'Vocabulary Flash Cards';
          const rawCards = fd.get('flashcards_data');
          let cards: FlashCardItem[] = [];
          if (typeof rawCards === 'string' && rawCards.trim()) {
            try {
              cards = JSON.parse(rawCards);
            } catch {}
          }
          if (!cards.length) {
            cards = [
              {
                front: 'MOMENTOUS',
                back: 'Of great importance or significance, especially in having a major effect on future events.',
                hint: 'Adjective - very significant',
              },
            ];
          }
          interactive = {
            type: 'flashcards',
            title: `${title} Flash Cards`,
            cards,
          };
        } else if (taskFormat === 'test') {
          icon = '📝';
          color = 'peach';
          defaultType = 'Topic & Vocabulary Test';
          const rawQuestions = fd.get('quiz_questions_data');
          let questions: QuizQuestion[] = [];
          if (typeof rawQuestions === 'string' && rawQuestions.trim()) {
            try {
              questions = JSON.parse(rawQuestions);
            } catch {}
          }
          if (!questions.length) {
            questions = [
              {
                question: 'What is the most effective way to start an essay introduction?',
                options: ['A bold, clear thesis statement', 'A list of dictionary words'],
                correctIndex: 0,
                explanation: 'A strong thesis or bold opening statement captivates your reader!',
              },
            ];
          }
          interactive = {
            type: 'quiz',
            title: `${title} Test`,
            questions,
          };
        } else if (taskFormat === 'word_scramble') {
          icon = '🔤';
          color = 'mint';
          defaultType = 'Word Scramble Challenge';
          const rawWords = fd.get('scramble_words_data');
          let words: WordScrambleItem[] = [];
          if (typeof rawWords === 'string' && rawWords.trim()) {
            try {
              words = JSON.parse(rawWords);
            } catch {}
          }
          if (!words.length) {
            words = [
              { word: 'GLIMMER', scrambled: 'MLMGREI', hint: 'A soft gentle shine' },
            ];
          }
          interactive = {
            type: 'word_scramble',
            title: `${title} Word Scramble`,
            words,
          };
        } else if (taskFormat === 'connecting_words') {
          icon = '🔗';
          color = 'mint';
          defaultType = 'Connecting Words Challenge';
          interactive = {
            type: 'connecting_words',
            title: `${title} Connecting Words`,
            pairs: [
              { phrase: 'For example', category: 'Give an example' },
              { phrase: 'However', category: 'Show a difference' },
              { phrase: 'In addition', category: 'Add an idea' },
              { phrase: 'Because', category: 'Show a reason' },
            ],
          };
        } else if (activityType === 'word_scramble') {
          const word = String(fd.get('scramble_word1') || 'GLIMMER').trim().toUpperCase();
          const hint = String(fd.get('scramble_hint1') || 'A soft gentle shine');
          const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
          interactive = {
            type: 'word_scramble',
            title: `${title} Word Scramble`,
            words: [{ scrambled, word, hint }],
          };
        } else if (activityType === 'quiz') {
          const question = String(fd.get('quiz_question') || 'What makes a strong first draft?');
          const opt1 = String(fd.get('quiz_opt1') || 'Sharing honest ideas and feelings');
          const opt2 = String(fd.get('quiz_opt2') || 'Making it 100% perfect on the first try');
          const explanation = String(fd.get('quiz_explanation') || 'Drafts are for exploring your imagination!');
          interactive = {
            type: 'quiz',
            title: `${title} Comprehension Quiz`,
            questions: [
              {
                question,
                options: [opt1, opt2],
                correctIndex: 0,
                explanation,
              },
            ],
          };
        } else if (activityType === 'connecting_words') {
          interactive = {
            type: 'connecting_words',
            title: 'Connecting Words Challenge',
            pairs: [
              { phrase: 'For example', category: 'Give an example' },
              { phrase: 'However', category: 'Show a difference' },
              { phrase: 'In addition', category: 'Add an idea' },
            ],
          };
        }

        const existingId = String(fd.get('assignmentId') || editingAssignment?.id || '').trim();
        const isEditing = Boolean(existingId);
        const targetId = existingId || crypto.randomUUID();

        const existingColor = String(fd.get('color') || editingAssignment?.color || color);
        const existingIcon = String(fd.get('icon') || editingAssignment?.icon || icon);

        const assignmentToSave: AssignmentEntry = {
          id: targetId,
          kind: 'assignment',
          taskType: taskFormat,
          title,
          type: type.trim() || defaultType,
          color: existingColor,
          icon: existingIcon,
          due: String(fd.get('due') || ''),
          description: String(fd.get('description') || ''),
          instructions: String(fd.get('instructions') || ''),
          minutes: Number(fd.get('minutes')) || 25,
          posted,
          interactive,
        };
        await saveEntry(assignmentToSave);
        if (active && active.id === targetId) {
          setActive(assignmentToSave);
        }
        setModal('');
        setEditingAssignment(null);
        setToast(
          isEditing
            ? `Homework "${title}" updated & safely backed up.`
            : posted
            ? `Homework "${title}" assigned, posted & safely backed up.`
            : `Homework "${title}" saved as draft & safely backed up.`
        );
      } else if (modal === 'material') {
        let uploadedFile: FileAttachment | undefined;
        const file = fd.get('file');

        if (file instanceof File && file.size > 0) {
          const uploadData = new FormData();
          uploadData.append('file', file);
          const uploadRes = await fetch('/api/files', {
            method: 'POST',
            body: uploadData,
          });
          if (!uploadRes.ok) throw new Error(await uploadRes.text());
          uploadedFile = (await uploadRes.json()) as FileAttachment;
        }

        let googleDriveAttachment: GoogleDriveAttachment | undefined;
        const rawDriveUrl = String(fd.get('googleDriveUrl') || '').trim();
        const rawDriveName = String(fd.get('googleDriveName') || '').trim();

        if (rawDriveUrl) {
          const driveInfo = parseGoogleDriveUrl(rawDriveUrl);
          if (driveInfo.isValid) {
            googleDriveAttachment = {
              url: driveInfo.cleanUrl,
              name: rawDriveName || driveInfo.label,
              fileId: driveInfo.fileId,
              driveType: driveInfo.driveType,
              embedUrl: driveInfo.embedUrl,
            };
          } else {
            googleDriveAttachment = {
              url: rawDriveUrl,
              name: rawDriveName || 'Google Drive Attachment',
              driveType: 'file',
            };
          }
        }

        const newMaterial: MaterialEntry = {
          id: crypto.randomUUID(),
          kind: 'material',
          title,
          type,
          color: 'mint',
          icon: '📖',
          body: String(fd.get('body') || ''),
          file: uploadedFile,
          googleDrive: googleDriveAttachment,
          interactive,
        };
        await saveEntry(newMaterial);
        setModal('');
        setToast(`Material "${title}" added to classroom & safely backed up.`);
      }
    });
  };

  const handleRestoreCurriculum = async (restoredEntries: Entry[]) => {
    await action(async () => {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || role,
        },
        body: JSON.stringify(restoredEntries),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error || 'Failed to restore curriculum to server.');
      }

      setRows(restoredEntries);
      persistRows(restoredEntries, 'manual_restore');
      setToast(`Curriculum successfully restored (${restoredEntries.length} items).`);
      setModal('');
    });
  };

  const handleForceSyncServer = async () => {
    await action(async () => {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || role,
        },
        body: JSON.stringify(rows),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error || 'Failed to synchronize with server.');
      }

      persistRows(rows, 'force_sync');
      setToast('Classroom successfully synchronized with cloud server.');
    });
  };

  // Build submission lookup map for active assignment across all students
  const activeStudentSubmissions = useMemo(() => {
    if (!active) return {};
    const map: Record<string, SubmissionEntry | undefined> = {};
    for (const st of STUDENTS) {
      map[st.id] = getSubmission(active.id, st.id);
    }
    return map;
  }, [active, getSubmission]);

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#fafbf8',
          color: '#5b7264',
          fontSize: '14px',
        }}
      >
        Opening your classroom…
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={applyUserSession} />;
  }

  return (
    <div className="shell">
      <Sidebar
        page={effectivePage}
        role={role}
        currentUser={currentUser}
        selectedStudent={activeStudent}
        totalAssignments={visibleAssignments.length}
        completedAssignments={completedCount}
        onNavigate={navigateTo}
      />

      <div className="main">
        <Header
          page={effectivePage}
          role={role}
          currentUser={currentUser}
          onRoleChange={handleRoleChange}
          selectedStudent={activeStudent}
          onStudentChange={handleStudentChange}
          onLogout={handleLogout}
          onOpenBackupModal={() => setModal('backup')}
        />

        <main>
          {error && <div className="notice">{error}</div>}

          {!loaded && !error && <div className="notice">Loading your saved classroom…</div>}

          {effectivePage === 'Home' && (
            <HomeView
              role={role}
              currentStudent={activeStudent}
              assignments={visibleAssignments}
              resources={allMaterials}
              completedCount={completedCount}
              getStatus={getHomeworkStatus}
              getStudentSubmissions={getStudentSubmissions}
              onOpenAssignment={openAssignment}
              onOpenResource={(res) => {
                setResource(res);
                setModal('resource');
              }}
              onNavigate={navigateTo}
              onTogglePost={handleTogglePost}
              onEditAssignment={handleOpenEditAssignment}
              onDeleteAssignment={handleDeleteAssignment}
            />
          )}

          {effectivePage === 'Homework' && (
            <HomeworkView
              role={role}
              assignments={allAssignments}
              filter={filter}
              onFilterChange={setFilter}
              getStatus={getHomeworkStatus}
              getStudentSubmissions={getStudentSubmissions}
              onOpenAssignment={openAssignment}
              onOpenCreateModal={() => {
                setEditingAssignment(null);
                setModal('assignment');
              }}
              onTogglePost={handleTogglePost}
              onEditAssignment={handleOpenEditAssignment}
              onDeleteAssignment={handleDeleteAssignment}
              onOpenBackupModal={() => setModal('backup')}
            />
          )}

          {effectivePage === 'Materials' && (
            <MaterialsView
              role={role}
              resources={allMaterials}
              query={query}
              onQueryChange={setQuery}
              onOpenResource={(res) => {
                setResource(res);
                setModal('resource');
              }}
              onOpenCreateModal={() => setModal('material')}
              onOpenBackupModal={() => setModal('backup')}
            />
          )}

          {effectivePage === 'Attendance' && role === 'Teacher' && (
            <AttendanceView
              role={role}
              currentStudent={selectedStudent}
              attendanceList={allAttendance}
              billingConfig={billingConfig}
              onSaveAttendance={handleSaveAttendance}
              onSaveAttendanceBatch={handleSaveAttendanceBatch}
              onDeleteAttendance={handleDeleteAttendance}
              onSaveBillingConfig={handleSaveBillingConfig}
              busy={busy}
            />
          )}

          {effectivePage === 'Roadmap' && role === 'Teacher' && (
            <RoadmapView
              role={role}
              diagnosticAssignment={
                role === 'Teacher' || allAssignments.find((a) => a.id === 'a0')?.posted
                  ? allAssignments.find((a) => a.id === 'a0') || allAssignments[0]
                  : undefined
              }
              onOpenAssignment={openAssignment}
              onNavigate={navigateTo}
            />
          )}

          {effectivePage === 'Messages' && (
            <MessagesView
              role={role}
              currentStudent={activeStudent}
              messages={allMessages}
              messageText={message}
              onMessageTextChange={setMessage}
              onSendMessage={handleSendMessage}
              busy={busy}
              loaded={loaded}
            />
          )}

          {effectivePage === 'Editor' && active && (
            <EditorView
              role={role}
              assignment={active}
              currentStudent={activeStudent}
              reviewingStudent={reviewingStudent}
              onReviewingStudentChange={handleReviewingStudentChange}
              studentSubmissions={activeStudentSubmissions}
              draft={draft}
              onDraftChange={(val) => {
                setDraft(val);
                setDirty(true);
                if (active && activeStudent.id && role === 'Student') {
                  try {
                    localStorage.setItem(`active_draft_${active.id}_${activeStudent.id}`, val);
                  } catch {}
                }
              }}
              files={files}
              onUploadFiles={uploadFiles}
              onRemoveFile={(idx) => {
                setFiles(files.filter((_, n) => n !== idx));
                setDirty(true);
              }}
              onSaveDraft={() => submitHomework('Draft')}
              onSubmitHomework={() => submitHomework('Handed in')}
              onResetSubmission={handleResetSubmission}
              onTogglePost={handleTogglePost}
              onSaveAnnotations={(newAnnotations) => {
                setAnnotations(newAnnotations);
                const targetSub = getSubmission(active.id, reviewingStudent.id);
                if (targetSub) {
                  action(async () => {
                    await saveEntry({
                      ...targetSub,
                      annotations: newAnnotations,
                      updated: new Date().toISOString(),
                    });
                    setToast(`Apple Pencil markings saved for ${reviewingStudent.name}.`);
                  });
                }
              }}
              onActivityComplete={handleActivityComplete}
              submission={
                role === 'Teacher'
                  ? getSubmission(active.id, reviewingStudent.id)
                  : getSubmission(active.id, activeStudent.id)
              }
              scorecard={
                role === 'Teacher'
                  ? scorecard
                  : getSubmission(active.id, activeStudent.id)?.scorecard
              }
              onSaveScorecard={setScorecard}
              feedback={feedback}
              onFeedbackChange={setFeedback}
              onReturnFeedback={() =>
                action(async () => {
                  const targetSub = getSubmission(active.id, reviewingStudent.id);
                  if (!targetSub) return;
                  await saveEntry({
                    ...targetSub,
                    feedback,
                    annotations,
                    scorecard,
                    status: 'Reviewed',
                    updated: new Date().toISOString(),
                  });
                  setToast(
                    annotations
                      ? `Feedback, scorecard & markings returned to ${reviewingStudent.name}.`
                      : `Feedback & scorecard saved and returned to ${reviewingStudent.name}.`
                  );
                })
              }
              dirty={dirty}
              busy={busy}
              loaded={loaded}
              onBack={() => navigateTo('Homework')}
              onOpenWritingGuide={() => {
                setResource(INITIAL_MATERIALS[0]);
                setModal('resource');
              }}
              onEditAssignment={handleOpenEditAssignment}
              onDeleteAssignment={handleDeleteAssignment}
            />
          )}

          <footer>
            Made for curious minds and growing writers.{' '}
            <span>Little steps, every day. ✦</span>
          </footer>
        </main>
      </div>

      {modal === 'resource' && resource && (
        <ResourceModal
          resource={resource}
          currentStudent={activeStudent}
          onClose={() => setModal('')}
        />
      )}

      {(modal === 'assignment' || modal === 'material') && (
        <CreateModal
          type={modal}
          initialAssignment={modal === 'assignment' ? editingAssignment : null}
          busy={busy}
          loaded={loaded}
          onClose={() => {
            setModal('');
            setEditingAssignment(null);
          }}
          onSubmit={handleCreateModalSubmit}
        />
      )}

      {modal === 'backup' && (
        <BackupModal
          entries={rows}
          onClose={() => setModal('')}
          onRestore={handleRestoreCurriculum}
          onSyncServer={handleForceSyncServer}
          busy={busy}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast('')} />}
    </div>
  );
}
