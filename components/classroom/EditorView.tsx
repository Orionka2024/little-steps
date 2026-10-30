'use client';

import React from 'react';
import { ArrowLeft, Paperclip, X, Send, ChevronRight, Check, Sparkles } from 'lucide-react';
import type {
  AssignmentEntry,
  FileAttachment,
  SubmissionEntry,
  Role,
  Student,
} from '../../lib/types';
import { STUDENTS } from '../../lib/types';
import { InteractiveActivityContainer } from './interactive/InteractiveActivityContainer';

interface EditorViewProps {
  role: Role;
  assignment: AssignmentEntry;
  currentStudent: Student;
  reviewingStudent: Student;
  onReviewingStudentChange: (student: Student) => void;
  studentSubmissions: Record<string, SubmissionEntry | undefined>;
  draft: string;
  onDraftChange: (text: string) => void;
  files: FileAttachment[];
  onUploadFiles: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
  onSaveDraft: () => void;
  onSubmitHomework: () => void;
  submission?: SubmissionEntry;
  feedback: string;
  onFeedbackChange: (text: string) => void;
  onReturnFeedback: () => void;
  onActivityComplete?: (score: number, total: number) => void;
  dirty: boolean;
  busy: boolean;
  loaded: boolean;
  onBack: () => void;
  onOpenWritingGuide: () => void;
}

export function EditorView({
  role,
  assignment,
  currentStudent,
  reviewingStudent,
  onReviewingStudentChange,
  studentSubmissions,
  draft,
  onDraftChange,
  files,
  onUploadFiles,
  onRemoveFile,
  onSaveDraft,
  onSubmitHomework,
  submission,
  feedback,
  onFeedbackChange,
  onReturnFeedback,
  onActivityComplete,
  dirty,
  busy,
  loaded,
  onBack,
  onOpenWritingGuide,
}: EditorViewProps) {
  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const formattedDueDate = new Date(`${assignment.due}T12:00:00`).toLocaleDateString('en-GB', {
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <button className="text-button back-link" onClick={onBack}>
        <ArrowLeft size={16} /> Back to homework
      </button>

      <div className="page-heading">
        <span className="eyebrow">{assignment.type}</span>
        <h1>{assignment.title}</h1>
        <p>
          Due {formattedDueDate} · About {assignment.minutes || 25} minutes
        </p>
      </div>

      {role === 'Teacher' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#fff',
            border: '1px solid #e2e8dc',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >
          <strong style={{ fontSize: '13px', color: '#273f3b' }}>
            Reviewing student work:
          </strong>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {STUDENTS.map((st) => {
              const stSub = studentSubmissions[st.id];
              const stStatus = stSub?.status || 'To do';
              const isSelected = reviewingStudent.id === st.id;
              const isDone = stStatus === 'Handed in' || stStatus === 'Reviewed';

              return (
                <button
                  key={st.id}
                  onClick={() => onReviewingStudentChange(st)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #286654' : '1px solid #e2e8dc',
                    background: isSelected ? '#e9f2ec' : '#fff',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <span className="avatar tiny">{st.avatar}</span>
                  <span>{st.name}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: isDone ? '#d6eed5' : '#f0f1ec',
                      color: isDone ? '#1c5e3f' : '#6b7873',
                      fontWeight: 600,
                    }}
                  >
                    {stStatus}
                  </span>
                  {stSub?.activityScore && (
                    <span
                      style={{
                        fontSize: '10px',
                        color: '#d99726',
                        fontWeight: 700,
                      }}
                    >
                      ★ {stSub.activityScore.score}/{stSub.activityScore.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Edutainment warm-up game or quiz */}
      {assignment.interactive && (
        <div style={{ marginBottom: '24px' }}>
          <InteractiveActivityContainer
            activity={assignment.interactive}
            studentName={role === 'Student' ? currentStudent.name : reviewingStudent.name}
            onComplete={role === 'Student' ? onActivityComplete : undefined}
          />
        </div>
      )}

      <div className="editor-grid">
        <div>
          <div className="instructions">
            <h3>Your mission</h3>
            <p>{assignment.instructions}</p>
          </div>

          <div className="writing-box">
            <div className="writing-top">
              <h3>
                {role === 'Teacher'
                  ? `${reviewingStudent.name}’s essay (${submission?.status || 'To do'})`
                  : `Your first draft starts here (${currentStudent.name})`}
              </h3>
              <span>{wordCount} words</span>
            </div>

            <textarea
              aria-label="Essay draft"
              placeholder={
                role === 'Teacher'
                  ? `${reviewingStudent.name} has not written an essay yet.`
                  : 'I want to tell you about…'
              }
              value={draft}
              readOnly={role === 'Teacher'}
              onChange={(e) => onDraftChange(e.target.value)}
              maxLength={50000}
            />

            <div className="writing-bottom">
              <span>
                {role === 'Teacher'
                  ? submission
                    ? `Submitted by ${submission.studentName || reviewingStudent.name} · ${submission.status}`
                    : `No submission yet from ${reviewingStudent.name}`
                  : dirty
                  ? 'You have unsaved changes'
                  : submission
                  ? `Saved to ${currentStudent.name}’s workspace`
                  : 'Ready when you are'}
              </span>
              {role === 'Student' && (
                <button disabled={busy || !loaded} onClick={onSaveDraft}>
                  Save draft
                </button>
              )}
            </div>
          </div>

          <div className="upload-box">
            <Paperclip size={22} />
            <div>
              <h3>
                {role === 'Teacher'
                  ? `Files uploaded by ${reviewingStudent.name}`
                  : 'Prefer to write on paper?'}
              </h3>
              <p>
                {role === 'Teacher'
                  ? files.length
                    ? `${files.length} attachment(s) from ${reviewingStudent.name}`
                    : `No files attached by ${reviewingStudent.name}.`
                  : 'Add a photo, PDF, Word document or text file. Up to 10 MB each.'}
              </p>
            </div>
            {role === 'Student' && (
              <label className="upload-button">
                {busy ? 'Uploading…' : 'Add files'}
                <input
                  type="file"
                  multiple
                  disabled={busy || !loaded}
                  accept=".png,.jpg,.jpeg,.webp,.heic,.pdf,.doc,.docx,.txt"
                  onChange={(e) => {
                    onUploadFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>

          {files.map((f, i) => (
            <div className="file-row" key={f.key}>
              <Paperclip size={16} />
              <a
                href={`/api/files?key=${encodeURIComponent(f.key)}`}
                target="_blank"
                rel="noreferrer"
              >
                {f.name}
              </a>
              {role === 'Student' && (
                <button
                  aria-label={`Remove ${f.name}`}
                  onClick={() => onRemoveFile(i)}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}

          {role === 'Student' && (
            <div className="submit-row">
              <span>You can save a draft and come back later.</span>
              <button
                className="primary"
                disabled={busy || !loaded}
                onClick={onSubmitHomework}
              >
                Hand in homework ({currentStudent.name}) <Send size={17} />
              </button>
            </div>
          )}
        </div>

        <aside>
          {role === 'Teacher' && submission?.activityScore && (
            <div
              style={{
                background: '#fffdf4',
                border: '1px solid #ebd9a2',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '18px',
              }}
            >
              <span style={{ fontSize: '11px', color: '#856404', fontWeight: 700 }}>
                <Sparkles size={13} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                EDUTAINMENT SCORE
              </span>
              <h4 style={{ margin: '6px 0 4px', fontSize: '16px', color: '#273f3b' }}>
                {submission.studentName || reviewingStudent.name} scored{' '}
                <strong style={{ color: '#286654' }}>
                  {submission.activityScore.score}/{submission.activityScore.total}
                </strong>{' '}
                ⭐
              </h4>
              <small style={{ color: '#747970' }}>
                Completed warm-up activity
              </small>
            </div>
          )}

          <div className="tip-box">
            <span>✦ WRITER’S LITTLE HELPER</span>
            <h3>Stuck on your first sentence?</h3>
            <p>Close your eyes and picture your idea. What is the first thing you notice?</p>
            <hr />
            <strong>Try these little steps</strong>
            <p>
              1. Gather three ideas.
              <br />
              2. Choose your favourite.
              <br />
              3. Write as if you’re telling a friend.
            </p>
            <button className="text-button" onClick={onOpenWritingGuide}>
              Open the writing guide <ChevronRight size={16} />
            </button>
          </div>

          <div className="feedback-box">
            <h3>Teacher feedback</h3>
            {role === 'Teacher' ? (
              <>
                <textarea
                  aria-label="Teacher feedback"
                  value={feedback}
                  onChange={(e) => onFeedbackChange(e.target.value)}
                  placeholder={`Write feedback for ${reviewingStudent.name}…`}
                />
                <button
                  className="primary"
                  disabled={busy || !submission || !feedback.trim()}
                  onClick={onReturnFeedback}
                >
                  Return feedback to {reviewingStudent.name} <Check size={16} />
                </button>
                {!submission && (
                  <small>
                    {reviewingStudent.name} has not submitted any work yet.
                  </small>
                )}
              </>
            ) : (
              <p>
                {submission?.feedback ||
                  'Your feedback will appear here after your teacher reviews your work.'}
              </p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
