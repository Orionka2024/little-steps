'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Paperclip,
  X,
  Send,
  ChevronRight,
  Check,
  Sparkles,
  Trash2,
  PenTool,
} from 'lucide-react';
import type {
  AssignmentEntry,
  FileAttachment,
  SubmissionEntry,
  Role,
  Student,
  WritingScorecard,
} from '../../lib/types';
import { STUDENTS } from '../../lib/types';
import { InteractiveActivityContainer } from './interactive/InteractiveActivityContainer';
import { AnnotationCanvas } from './AnnotationCanvas';
import { ScorecardWidget } from './ScorecardWidget';

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
  onResetSubmission?: () => void;
  onSaveAnnotations?: (annotations: string) => void;
  submission?: SubmissionEntry;
  scorecard?: WritingScorecard;
  onSaveScorecard?: (card: WritingScorecard) => void;
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
  onResetSubmission,
  onSaveAnnotations,
  submission,
  scorecard,
  onSaveScorecard,
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
  const [markupMode, setMarkupMode] = useState<boolean>(false);
  const [showStudentMarkup, setShowStudentMarkup] = useState<boolean>(true);
  const [localAnnotations, setLocalAnnotations] = useState<string | null>(null);
  const [prevSubmissionKey, setPrevSubmissionKey] = useState<string | undefined>(
    submission?.id
  );

  // Adjust state during render if target submission changed (React recommended pattern)
  if (submission?.id !== prevSubmissionKey) {
    setPrevSubmissionKey(submission?.id);
    setLocalAnnotations(null);
  }

  const annotations = localAnnotations ?? (submission?.annotations || '');

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3>
                  {role === 'Teacher'
                    ? `${reviewingStudent.name}’s essay (${submission?.status || 'To do'})`
                    : `Your first draft starts here (${currentStudent.name})`}
                </h3>

                {/* Teacher iPad Pencil Markup Toggle */}
                {role === 'Teacher' && (
                  <button
                    type="button"
                    onClick={() => setMarkupMode(!markupMode)}
                    title="Write comments and corrections directly on the essay with your Apple Pencil"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: markupMode ? '1px solid #16a34a' : '1px solid #d2ded0',
                      background: markupMode ? '#f0fdf4' : '#f5f8f4',
                      color: markupMode ? '#15803d' : '#45594b',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <PenTool size={13} />
                    {markupMode ? '✍️ Apple Pencil Markup: ON' : '✍️ Apple Pencil Markup'}
                  </button>
                )}

                {/* Student View Teacher Markup Toggle */}
                {role === 'Student' && submission?.annotations && (
                  <button
                    type="button"
                    onClick={() => setShowStudentMarkup(!showStudentMarkup)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 9px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: showStudentMarkup ? '1px solid #16a34a' : '1px solid #d2ded0',
                      background: showStudentMarkup ? '#f0fdf4' : '#f5f8f4',
                      color: showStudentMarkup ? '#15803d' : '#57675c',
                    }}
                  >
                    <Sparkles size={13} color="#16a34a" />
                    {showStudentMarkup ? 'Teacher Notes: Visible' : 'View Teacher Notes'}
                  </button>
                )}
              </div>

              <span>{wordCount} words</span>
            </div>

            {role === 'Teacher' && markupMode ? (
              <div style={{ width: '100%' }}>
                {/* Annotation Canvas enclosing the essay paper */}
                <AnnotationCanvas
                  key={`teacher-${reviewingStudent.id}-${submission?.id || 'new'}`}
                  initialData={annotations}
                  onSave={(data) => {
                    setLocalAnnotations(data);
                    onSaveAnnotations?.(data);
                  }}
                  readOnly={false}
                  studentName={reviewingStudent.name}
                >
                  <div
                    style={{
                      minHeight: '420px',
                      padding: '24px 28px',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '16px',
                      lineHeight: '2.4rem',
                      color: '#273f3b',
                      whiteSpace: 'pre-wrap',
                      background: '#fdfdfb',
                      backgroundImage:
                        'repeating-linear-gradient(transparent, transparent 2.3rem, #eaf0e7 2.3rem, #eaf0e7 2.4rem)',
                      backgroundAttachment: 'local',
                    }}
                  >
                    {draft.trim() ? (
                      draft
                    ) : (
                      <div style={{ color: '#88988b', fontStyle: 'italic', paddingTop: '20px' }}>
                        {reviewingStudent.name} hasn’t submitted an essay yet. You can still use your
                        Apple Pencil to write guidance or practice prompts on this paper.
                      </div>
                    )}
                  </div>
                </AnnotationCanvas>
              </div>
            ) : role === 'Student' && submission?.annotations && showStudentMarkup ? (
              <div style={{ width: '100%' }}>
                <AnnotationCanvas
                  key={`student-${submission.id}`}
                  initialData={submission.annotations}
                  readOnly={true}
                  studentName={currentStudent.name}
                >
                  <div
                    style={{
                      minHeight: '380px',
                      padding: '24px 28px',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '16px',
                      lineHeight: '2.4rem',
                      color: '#273f3b',
                      whiteSpace: 'pre-wrap',
                      background: '#fdfdfb',
                      backgroundImage:
                        'repeating-linear-gradient(transparent, transparent 2.3rem, #eaf0e7 2.3rem, #eaf0e7 2.4rem)',
                      backgroundAttachment: 'local',
                    }}
                  >
                    {draft || 'No text written yet.'}
                  </div>
                </AnnotationCanvas>
              </div>
            ) : (
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
            )}

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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {(submission || draft.length > 0) && onResetSubmission && (
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9ba89f',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                      }}
                      disabled={busy || !loaded}
                      onClick={() => {
                        if (confirm('Clear your current draft and start over?')) {
                          onResetSubmission();
                        }
                      }}
                    >
                      Clear draft
                    </button>
                  )}
                  <button disabled={busy || !loaded} onClick={onSaveDraft}>
                    Save draft
                  </button>
                </div>
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

          <ScorecardWidget
            role={role}
            student={role === 'Teacher' ? reviewingStudent : currentStudent}
            scorecard={scorecard ?? submission?.scorecard}
            onSaveScorecard={onSaveScorecard}
            onInsertToFeedback={(reportText) => {
              onFeedbackChange(feedback ? `${feedback}\n\n${reportText}` : reportText);
            }}
            disabled={busy || !loaded}
          />

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
                  disabled={busy || !submission || (!feedback.trim() && !annotations)}
                  onClick={onReturnFeedback}
                >
                  {annotations ? 'Return feedback & markings' : 'Return feedback'} to{' '}
                  {reviewingStudent.name} <Check size={16} />
                </button>
                {submission && onResetSubmission && (
                  <button
                    type="button"
                    style={{
                      marginTop: '10px',
                      width: '100%',
                      background: '#fff',
                      border: '1px solid #ebd0cf',
                      color: '#a32b29',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                    disabled={busy || !loaded}
                    onClick={() => {
                      if (
                        confirm(
                          `Reset and clear all homework data for ${reviewingStudent.name}? This will return their assignment to 'To do'.`
                        )
                      ) {
                        onResetSubmission();
                      }
                    }}
                  >
                    <Trash2 size={13} /> Reset {reviewingStudent.name}’s submission
                  </button>
                )}
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
