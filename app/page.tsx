'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type {
  Entry,
  AssignmentEntry,
  MaterialEntry,
  SubmissionEntry,
  MessageEntry,
  Role,
  HomeworkStatus,
  FileAttachment,
  Student,
  InteractiveActivity,
} from '../lib/types';
import {
  isAssignment,
  isMaterial,
  isSubmission,
  isMessage,
  STUDENTS,
} from '../lib/types';
import type { ClassroomUser } from '../lib/auth-types';
import { INITIAL_ASSIGNMENTS, INITIAL_MATERIALS } from '../lib/initial-data';
import { Sidebar } from '../components/classroom/Sidebar';
import { Header } from '../components/classroom/Header';
import { HomeView } from '../components/classroom/HomeView';
import { HomeworkView } from '../components/classroom/HomeworkView';
import { MaterialsView } from '../components/classroom/MaterialsView';
import { MessagesView } from '../components/classroom/MessagesView';
import { EditorView } from '../components/classroom/EditorView';
import { ResourceModal, CreateModal } from '../components/classroom/Modals';
import { Toast } from '../components/classroom/Toast';
import { LoginView } from '../components/classroom/LoginView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<ClassroomUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [page, setPage] = useState<string>('Home');
  const [role, setRole] = useState<Role>('Student');
  const [selectedStudent, setSelectedStudent] = useState<Student>(STUDENTS[0]); // Default to Hajun
  const [reviewingStudent, setReviewingStudent] = useState<Student>(STUDENTS[0]); // Default to Hajun
  const [rows, setRows] = useState<Entry[]>([]);
  const [active, setActive] = useState<AssignmentEntry | null>(null);
  const [resource, setResource] = useState<MaterialEntry | null>(null);
  const [modal, setModal] = useState<string>('');
  const [toast, setToast] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<string>('All homework');
  const [query, setQuery] = useState<string>('');
  const [draft, setDraft] = useState<string>('');
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [annotations, setAnnotations] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [dirty, setDirty] = useState<boolean>(false);

  const applyUserSession = useCallback((user: ClassroomUser) => {
    setCurrentUser(user);
    setRole(user.role);
    if (user.role === 'Student' && user.studentId) {
      const student = STUDENTS.find((s) => s.id === user.studentId);
      if (student) setSelectedStudent(student);
    }
  }, []);

  // Check existing session on load
  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as { authenticated: boolean; user?: ClassroomUser };
          if (data.authenticated && data.user) {
            applyUserSession(data.user);
          }
        }
      })
      .finally(() => setCheckingAuth(false));
  }, [applyUserSession]);

  // Fetch initial records from storage
  useEffect(() => {
    if (!currentUser) return;

    fetch('/api/data')
      .then(async (response) => {
        if (!response.ok) {
          const errData = (await response.json()) as { error?: string };
          throw new Error(errData.error || 'Failed to load classroom data');
        }
        return response.json() as Promise<Entry[]>;
      })
      .then((data) => {
        setRows(
          data.map((item) => ({
            ...item,
            id: item.localId || item.id,
          }))
        );
        setLoaded(true);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoaded(true);
      });
  }, [currentUser]);

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
    const custom = rows.filter(isAssignment);
    return [...INITIAL_ASSIGNMENTS, ...custom];
  }, [rows]);

  const allMaterials = useMemo<MaterialEntry[]>(() => {
    const custom = rows.filter(isMaterial);
    return [...INITIAL_MATERIALS, ...custom];
  }, [rows]);

  const allMessages = useMemo<MessageEntry[]>(() => {
    return rows.filter(isMessage);
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
      return getSubmission(assignment.id, selectedStudent.id)?.status || 'To do';
    },
    [getSubmission, selectedStudent.id]
  );

  const completedCount = useMemo(() => {
    return allAssignments.filter((a) =>
      ['Handed in', 'Reviewed'].includes(getHomeworkStatus(a))
    ).length;
  }, [allAssignments, getHomeworkStatus]);

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
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': role,
      },
      body: JSON.stringify(entry),
    });

    if (!res.ok) {
      const errorJson = (await res.json()) as { error?: string };
      throw new Error(errorJson.error || 'Could not save. Please try again.');
    }

    setRows((prev) => [...prev.filter((x) => x.id !== entry.id), entry]);
  }

  function openAssignment(assignment: AssignmentEntry) {
    setActive(assignment);
    const targetStudent = role === 'Teacher' ? reviewingStudent : selectedStudent;
    const existingSubmission = getSubmission(assignment.id, targetStudent.id);
    setDraft(existingSubmission?.text || '');
    setFiles(existingSubmission?.files || []);
    setFeedback(existingSubmission?.feedback || '');
    setAnnotations(existingSubmission?.annotations || '');
    setDirty(false);
    setPage('Editor');
  }

  // Teacher switches which student they are reviewing in Editor
  function handleReviewingStudentChange(student: Student) {
    if (!active) return;
    setReviewingStudent(student);
    const existingSubmission = getSubmission(active.id, student.id);
    setDraft(existingSubmission?.text || '');
    setFiles(existingSubmission?.files || []);
    setFeedback(existingSubmission?.feedback || '');
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
      setAnnotations(existingSubmission?.annotations || '');
      setDirty(false);
    }
  }

  function navigateTo(targetPage: string) {
    if (dirty && !confirm('Leave this draft without saving your latest changes?')) {
      return;
    }
    setDirty(false);
    setPage(targetPage);
    setActive(null);
  }

  async function handleLogout() {
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
      const existingSubmission = getSubmission(active.id, selectedStudent.id);
      const submissionRecord: SubmissionEntry = {
        id: `s-${active.id}-${selectedStudent.id}`,
        kind: 'submission',
        assignment: active.id,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        text: draft,
        files,
        status,
        feedback: existingSubmission?.feedback || '',
        activityScore: existingSubmission?.activityScore,
        updated: new Date().toISOString(),
      };

      await saveEntry(submissionRecord);
      setDirty(false);
      setToast(
        status === 'Handed in'
          ? `You did it, ${selectedStudent.name}! Your homework is handed in.`
          : `Draft saved for ${selectedStudent.name}.`
      );
    });
  }

  const handleResetSubmission = () => {
    if (!active) return;
    const targetStudent = role === 'Teacher' ? reviewingStudent : selectedStudent;
    const submissionId = `s-${active.id}-${targetStudent.id}`;

    action(async () => {
      const res = await fetch(`/api/data?id=${encodeURIComponent(submissionId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Failed to remove submission');
      }

      setRows((prev) =>
        prev.filter(
          (r) =>
            r.id !== submissionId &&
            (r as unknown as { localId?: string }).localId !== submissionId &&
            !(isSubmission(r) && r.assignment === active.id && r.studentId === targetStudent.id)
        )
      );
      setDraft('');
      setFiles([]);
      setFeedback('');
      setAnnotations('');
      setDirty(false);
      setToast(`Submission data for ${targetStudent.name} has been reset.`);
    });
  };

  // Student completes a warm-up edutainment activity in Editor
  const handleActivityComplete = (score: number, total: number) => {
    if (!active) return;
    action(async () => {
      const existingSubmission = getSubmission(active.id, selectedStudent.id);
      const submissionRecord: SubmissionEntry = {
        id: `s-${active.id}-${selectedStudent.id}`,
        kind: 'submission',
        assignment: active.id,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        text: draft,
        files,
        status: existingSubmission?.status || 'Draft',
        feedback: existingSubmission?.feedback || '',
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
      const senderName = role === 'Student' ? selectedStudent.name : 'Teacher';
      const newMsg: MessageEntry = {
        id: crypto.randomUUID(),
        kind: 'message',
        text: message.trim(),
        sender: senderName,
        studentId: role === 'Student' ? selectedStudent.id : undefined,
        time: new Date().toISOString(),
      };

      await saveEntry(newMsg);
      setMessage('');
      setToast(`Message sent as ${senderName}.`);
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
        const newAssignment: AssignmentEntry = {
          id: crypto.randomUUID(),
          kind: 'assignment',
          title,
          type,
          color: 'mint',
          icon: '✏️',
          due: String(fd.get('due') || ''),
          description: String(fd.get('description') || ''),
          instructions: String(fd.get('instructions') || ''),
          minutes: 25,
          interactive,
        };
        await saveEntry(newAssignment);
        setModal('');
        setToast('Homework assigned to the classroom.');
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

        const newMaterial: MaterialEntry = {
          id: crypto.randomUUID(),
          kind: 'material',
          title,
          type,
          color: 'mint',
          icon: '📖',
          body: String(fd.get('body') || ''),
          file: uploadedFile,
          interactive,
        };
        await saveEntry(newMaterial);
        setModal('');
        setToast('Material added to classroom.');
      }
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
        page={page}
        role={role}
        selectedStudent={selectedStudent}
        totalAssignments={allAssignments.length}
        completedAssignments={completedCount}
        onNavigate={navigateTo}
      />

      <div className="main">
        <Header
          page={page}
          role={role}
          onRoleChange={setRole}
          selectedStudent={selectedStudent}
          onStudentChange={handleStudentChange}
          onLogout={handleLogout}
        />

        <main>
          {error && <div className="notice">{error}</div>}

          {!loaded && !error && <div className="notice">Loading your saved classroom…</div>}

          {page === 'Home' && (
            <HomeView
              role={role}
              currentStudent={selectedStudent}
              assignments={allAssignments}
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
            />
          )}

          {page === 'Homework' && (
            <HomeworkView
              role={role}
              assignments={allAssignments}
              filter={filter}
              onFilterChange={setFilter}
              getStatus={getHomeworkStatus}
              getStudentSubmissions={getStudentSubmissions}
              onOpenAssignment={openAssignment}
              onOpenCreateModal={() => setModal('assignment')}
            />
          )}

          {page === 'Materials' && (
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
            />
          )}

          {page === 'Messages' && (
            <MessagesView
              role={role}
              currentStudent={selectedStudent}
              messages={allMessages}
              messageText={message}
              onMessageTextChange={setMessage}
              onSendMessage={handleSendMessage}
              busy={busy}
              loaded={loaded}
            />
          )}

          {page === 'Editor' && active && (
            <EditorView
              role={role}
              assignment={active}
              currentStudent={selectedStudent}
              reviewingStudent={reviewingStudent}
              onReviewingStudentChange={handleReviewingStudentChange}
              studentSubmissions={activeStudentSubmissions}
              draft={draft}
              onDraftChange={(val) => {
                setDraft(val);
                setDirty(true);
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
                  : getSubmission(active.id, selectedStudent.id)
              }
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
                    status: 'Reviewed',
                    updated: new Date().toISOString(),
                  });
                  setToast(
                    annotations
                      ? `Feedback and Apple Pencil markings returned to ${reviewingStudent.name}.`
                      : `Feedback saved and returned to ${reviewingStudent.name}.`
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
          currentStudent={selectedStudent}
          onClose={() => setModal('')}
        />
      )}

      {(modal === 'assignment' || modal === 'material') && (
        <CreateModal
          type={modal}
          busy={busy}
          loaded={loaded}
          onClose={() => setModal('')}
          onSubmit={handleCreateModalSubmit}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast('')} />}
    </div>
  );
}
