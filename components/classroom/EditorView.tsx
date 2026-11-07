'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Pencil,
  Download,
  Maximize2,
  Minimize2,
  BookOpen,
  FileText,
  Undo2,
  Redo2,
  Volume2,
  VolumeX,
  Bold,
  Italic,
  List,
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
import { AiEssayReviewAssistant } from './AiEssayReviewAssistant';
interface ConnectorGroup {
  category: string;
  color: string;
  textColor: string;
  words: string[];
}

const CONNECTOR_GROUPS: ConnectorGroup[] = [
  {
    category: '💡 Starters',
    color: '#e8f0fe',
    textColor: '#1967d2',
    words: [
      'In my opinion,',
      'I believe that',
      'One reason is that',
      'Another point is that',
      'To begin with,',
    ],
  },
  {
    category: '➕ Adding',
    color: '#e6f4ea',
    textColor: '#137333',
    words: [
      'In addition,',
      'Furthermore,',
      'Also,',
      'Moreover,',
      'What is more,',
    ],
  },
  {
    category: '⚖️ Contrasting',
    color: '#fef7e0',
    textColor: '#b06000',
    words: [
      'However,',
      'On the other hand,',
      'Although',
      'Even though',
      'Instead,',
    ],
  },
  {
    category: '🔍 Examples',
    color: '#f3e8fd',
    textColor: '#7627bb',
    words: [
      'For example,',
      'For instance,',
      'In particular,',
      'Such as',
    ],
  },
  {
    category: '🏁 Ending',
    color: '#fce8e6',
    textColor: '#c5221f',
    words: [
      'In conclusion,',
      'To sum up,',
      'Finally,',
      'All in all,',
      'In the end,',
    ],
  },
];

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
  onTogglePost?: (assignment: AssignmentEntry) => void;
  onEditAssignment?: (assignment: AssignmentEntry) => void;
  onDeleteAssignment?: (assignment: AssignmentEntry) => void;
  onToast?: (message: string) => void;
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
  onTogglePost,
  onEditAssignment,
  onDeleteAssignment,
  onToast,
}: EditorViewProps) {
  const [markupMode, setMarkupMode] = useState<boolean>(false);
  const [showStudentMarkup, setShowStudentMarkup] = useState<boolean>(true);
  const [localAnnotations, setLocalAnnotations] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [showPromptInFullScreen, setShowPromptInFullScreen] = useState<boolean>(true);
  const [fontSizeLevel, setFontSizeLevel] = useState<'normal' | 'large' | 'huge'>('large');
  const [isWideMode, setIsWideMode] = useState<boolean>(false);
  const [showConnectors, setShowConnectors] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [history, setHistory] = useState<string[]>([draft]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const lastPushTimeRef = useRef<number>(Date.now());
  const standardTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fullScreenTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Stop speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Sync undo history when reviewing student or assignment changes
  useEffect(() => {
    setHistory([draft]);
    setHistoryIndex(0);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [reviewingStudent.id, currentStudent.id, assignment.id]);

  const handleDraftChangeWithHistory = (newDraft: string, immediate = false) => {
    onDraftChange(newDraft);
    const now = Date.now();
    if (
      immediate ||
      now - lastPushTimeRef.current > 900 ||
      Math.abs(newDraft.length - (history[historyIndex]?.length || 0)) > 5
    ) {
      lastPushTimeRef.current = now;
      setHistory((prev) => {
        const upToCurrent = prev.slice(0, historyIndex + 1);
        if (upToCurrent[upToCurrent.length - 1] === newDraft) return upToCurrent;
        return [...upToCurrent, newDraft].slice(-40);
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 39));
    } else {
      setHistory((prev) => {
        const copy = [...prev];
        copy[historyIndex] = newDraft;
        return copy;
      });
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = () => {
    if (canUndo) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      onDraftChange(history[nextIndex]);
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      onDraftChange(history[nextIndex]);
    }
  };

  const insertTextAtCursor = (textToInsert: string) => {
    const el = isFullScreen ? fullScreenTextareaRef.current : standardTextareaRef.current;
    if (!el) {
      const updated = draft ? `${draft} ${textToInsert} ` : `${textToInsert} `;
      handleDraftChangeWithHistory(updated, true);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const before = draft.slice(0, start);
    const after = draft.slice(end);
    const needsSpaceBefore = start > 0 && !/\s$/.test(before);
    const prefix = needsSpaceBefore ? ' ' : '';
    const insertion = `${prefix}${textToInsert} `;
    const nextValue = before + insertion + after;
    handleDraftChangeWithHistory(nextValue, true);
    setTimeout(() => {
      el.focus();
      const newPos = start + insertion.length;
      el.setSelectionRange(newPos, newPos);
    }, 20);
  };

  const wrapSelection = (prefix: string, suffix: string, defaultText = 'text') => {
    const el = isFullScreen ? fullScreenTextareaRef.current : standardTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const selected = draft.slice(start, end);
    const replacement = selected
      ? `${prefix}${selected}${suffix}`
      : `${prefix}${defaultText}${suffix}`;
    const nextValue = draft.slice(0, start) + replacement + draft.slice(end);
    handleDraftChangeWithHistory(nextValue, true);
    setTimeout(() => {
      el.focus();
      if (selected) {
        el.setSelectionRange(start + prefix.length, end + prefix.length);
      } else {
        el.setSelectionRange(
          start + prefix.length,
          start + prefix.length + defaultText.length
        );
      }
    }, 20);
  };

  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this device/browser.');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const textToRead = draft.trim();
    if (!textToRead) {
      alert('Write a sentence or paragraph first to listen to it read aloud!');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'en-US';
    utterance.rate = 0.88; // Slightly slower, clear enunciation for young English learners
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const renderWritingToolbar = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginBottom: '10px',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '6px 10px',
          background: '#f9f8f4',
          border: '1px solid #e3ddcf',
          borderRadius: '8px',
        }}
      >
        {/* Left tool group: Undo/Redo & Formatting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo || role === 'Teacher'}
            title="Undo last change (Ctrl+Z)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: canUndo && role !== 'Teacher' ? 'pointer' : 'default',
              border: '1px solid #d5cfc2',
              background: '#ffffff',
              color: canUndo && role !== 'Teacher' ? '#273f3b' : '#a8a59e',
              opacity: canUndo && role !== 'Teacher' ? 1 : 0.6,
            }}
          >
            <Undo2 size={13} /> Undo
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo || role === 'Teacher'}
            title="Redo (Ctrl+Y)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: canRedo && role !== 'Teacher' ? 'pointer' : 'default',
              border: '1px solid #d5cfc2',
              background: '#ffffff',
              color: canRedo && role !== 'Teacher' ? '#273f3b' : '#a8a59e',
              opacity: canRedo && role !== 'Teacher' ? 1 : 0.6,
            }}
          >
            <Redo2 size={13} /> Redo
          </button>

          <span style={{ width: '1px', height: '16px', background: '#dcd6ca', margin: '0 4px' }} />

          <button
            type="button"
            onClick={() => wrapSelection('**', '**', 'important')}
            disabled={role === 'Teacher'}
            title="Bold (emphasize key words)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '26px',
              borderRadius: '5px',
              border: '1px solid #d5cfc2',
              background: '#ffffff',
              color: role !== 'Teacher' ? '#273f3b' : '#a8a59e',
              cursor: role !== 'Teacher' ? 'pointer' : 'default',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            <Bold size={13} />
          </button>

          <button
            type="button"
            onClick={() => wrapSelection('*', '*', 'words')}
            disabled={role === 'Teacher'}
            title="Italic"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '26px',
              borderRadius: '5px',
              border: '1px solid #d5cfc2',
              background: '#ffffff',
              color: role !== 'Teacher' ? '#273f3b' : '#a8a59e',
              cursor: role !== 'Teacher' ? 'pointer' : 'default',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            <Italic size={13} />
          </button>

          <button
            type="button"
            onClick={() => insertTextAtCursor('\n• ')}
            disabled={role === 'Teacher'}
            title="Insert bullet list item"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '26px',
              borderRadius: '5px',
              border: '1px solid #d5cfc2',
              background: '#ffffff',
              color: role !== 'Teacher' ? '#273f3b' : '#a8a59e',
              cursor: role !== 'Teacher' ? 'pointer' : 'default',
            }}
          >
            <List size={13} />
          </button>
        </div>

        {/* Right tool group: Read Aloud & Connectors Drawer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleToggleSpeech}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              background: isSpeaking ? '#fde8e8' : '#eaf4ee',
              border: `1px solid ${isSpeaking ? '#f1aeb5' : '#b2d8c3'}`,
              color: isSpeaking ? '#b02a37' : '#1e6648',
            }}
            title={isSpeaking ? 'Click to stop reading' : 'Listen to your essay read aloud in clear English'}
          >
            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {isSpeaking ? 'Stop listening' : 'Listen to essay'}
          </button>

          <button
            type="button"
            onClick={() => setShowConnectors((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              background: showConnectors ? '#e8f0fe' : '#ffffff',
              border: `1px solid ${showConnectors ? '#1967d2' : '#d5cfc2'}`,
              color: showConnectors ? '#1967d2' : '#3c4043',
            }}
            title="Open linking words and sentence starters helper"
          >
            <Sparkles size={13} color="#1967d2" />
            <span>Linking words & starters</span>
            <span style={{ fontSize: '10px', opacity: 0.7 }}>{showConnectors ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Linking Words Drawer */}
      {showConnectors && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #dce4d9',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 3px 10px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#286654',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              ✦ Click any word to insert it into your essay:
            </span>
            <button
              type="button"
              onClick={() => setShowConnectors(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '11px',
                color: '#747970',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Close helper
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {CONNECTOR_GROUPS.map((group) => (
              <div
                key={group.category}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#474d49',
                    minWidth: '92px',
                  }}
                >
                  {group.category}:
                </span>
                {group.words.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => insertTextAtCursor(w)}
                    disabled={role === 'Teacher'}
                    style={{
                      background: group.color,
                      color: group.textColor,
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '6px',
                      padding: '3px 9px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: role === 'Teacher' ? 'default' : 'pointer',
                    }}
                    title={`Insert "${w}" at your cursor`}
                  >
                    + {w}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const [prevSubmissionKey, setPrevSubmissionKey] = useState<string | undefined>(
    submission?.id
  );

  // Press Esc to exit full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

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

  const handleDownloadEssay = () => {
    if (!draft.trim()) return;
    const authorName = role === 'Teacher' ? reviewingStudent.name : currentStudent.name;
    const cleanTitle = assignment.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${authorName}_${cleanTitle}_Essay.txt`;
    const content = `Student: ${authorName}
Assignment: ${assignment.title}
Due Date: ${assignment.due}
Status: ${submission?.status || 'Draft'}
Words: ${wordCount}
Saved Date: ${new Date().toLocaleString()}

--------------------
ESSAY CONTENT:
--------------------

${draft}
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

      {role === 'Student' && !assignment.posted && (
        <div className="notice" style={{ marginBottom: '24px' }}>
          🔒 This homework assignment has not yet been posted by your teacher. Please check back soon!
        </div>
      )}

      {role === 'Teacher' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: assignment.posted ? '#f0f7f2' : '#fdf8ee',
            border: assignment.posted ? '1px solid #cbe3d2' : '1px solid #fae2bd',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>{assignment.posted ? '📢' : '🔒'}</span>
            <div>
              <strong style={{ fontSize: '13px', color: assignment.posted ? '#246142' : '#94580f' }}>
                {assignment.posted ? 'Posted to Classroom' : 'Not Yet Posted (Hidden from Students)'}
              </strong>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: assignment.posted ? '#3b705e' : '#8c591c' }}>
                {assignment.posted
                  ? 'All students (Hajun, Mark, Juwon) can see, open, and work on this homework.'
                  : 'Students cannot see this assignment yet. You can prepare, review, or edit it before posting.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {onEditAssignment && (
              <button
                type="button"
                onClick={() => onEditAssignment(assignment)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  padding: '8px 14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: '7px',
                  background: '#ffffff',
                  color: '#285844',
                  border: '1px solid #cfdad3',
                }}
                title="Edit assignment details, prompt, due date, or instructions"
              >
                <Pencil size={13} /> Edit assignment
              </button>
            )}

            {onTogglePost && (
              <button
                type="button"
                onClick={() => onTogglePost(assignment)}
                style={{
                  fontSize: '12px',
                  padding: '8px 14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: '7px',
                  background: assignment.posted ? '#ffffff' : '#286654',
                  color: assignment.posted ? '#34473d' : '#ffffff',
                  border: assignment.posted ? '1px solid #cfdad3' : '1px solid #286654',
                }}
                title={
                  assignment.posted
                    ? 'Unpost homework (hide from students)'
                    : 'Post homework (make visible to students)'
                }
              >
                {assignment.posted ? 'Unpost (Hide from students)' : 'Post to classroom now ✦'}
              </button>
            )}

            {onDeleteAssignment && (
              <button
                type="button"
                onClick={() => onDeleteAssignment(assignment)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  padding: '8px 14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: '7px',
                  background: '#fff2f2',
                  color: '#a83232',
                  border: '1px solid #fad7d7',
                }}
                title="Delete this assignment and submissions"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        </div>
      )}

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
            studentName={role === 'Student' ? (currentStudent.id === 'preview' ? 'Student' : currentStudent.name) : reviewingStudent.name}
            onComplete={role === 'Student' ? onActivityComplete : undefined}
          />
        </div>
      )}

      <div className="editor-grid" style={{ gridTemplateColumns: isWideMode ? '1fr' : undefined }}>
        <div>
          <div className="instructions">
            <h3>
              {assignment.taskType === 'flashcards'
                ? '🗂️ Flash Card Study Mission'
                : assignment.taskType === 'test'
                ? '📝 Topic Test & Assessment'
                : assignment.taskType === 'word_scramble'
                ? '🔤 Vocabulary Word Scramble Challenge'
                : assignment.taskType === 'connecting_words'
                ? '🔗 Connecting Words Challenge'
                : 'Your writing mission'}
            </h3>
            <p>{assignment.instructions}</p>
          </div>

          <div className="writing-box">
            <div className="writing-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3>
                  {assignment.taskType === 'flashcards'
                    ? role === 'Teacher'
                      ? `${reviewingStudent.name}’s Vocabulary Practice Notes (${submission?.status || 'To do'})`
                      : currentStudent.id === 'preview'
                      ? 'Your Vocabulary Practice Notes'
                      : `Your Vocabulary Practice Notes (${currentStudent.name})`
                    : assignment.taskType === 'test'
                    ? role === 'Teacher'
                      ? `${reviewingStudent.name}’s Test Submission & Notes (${submission?.status || 'To do'})`
                      : currentStudent.id === 'preview'
                      ? 'Your Test Reflection & Notes'
                      : `Your Test Reflection & Notes (${currentStudent.name})`
                    : role === 'Teacher'
                    ? `${reviewingStudent.name}’s essay (${submission?.status || 'To do'})`
                    : currentStudent.id === 'preview'
                    ? 'Your first draft starts here'
                    : `Your first draft starts here (${currentStudent.name})`}
                </h3>

                {/* Big Screen Expand Button */}
                <button
                  type="button"
                  onClick={() => setIsFullScreen(true)}
                  title="Expand to big screen full-screen focus writing mode"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid #286654',
                    background: '#eef6f2',
                    color: '#286654',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Maximize2 size={13} />
                  Big Screen Focus
                </button>

                {/* Wide Mode in-page toggle */}
                <button
                  type="button"
                  onClick={() => setIsWideMode(!isWideMode)}
                  title={isWideMode ? 'Show side helper column' : 'Hide side column to widen writing paper'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: '1px solid #d2ded0',
                    background: isWideMode ? '#f0f4ee' : '#ffffff',
                    color: '#465a4c',
                  }}
                >
                  {isWideMode ? 'Normal width' : 'Wider screen'}
                </button>

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

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {draft.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadEssay}
                    title="Export / download a copy of this essay to keep on your computer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid #d2ded0',
                      background: '#ffffff',
                      color: '#285844',
                    }}
                  >
                    <Download size={12} />
                    Download essay
                  </button>
                )}
                <span style={{ fontWeight: 600, color: '#4a5d51' }}>{wordCount} words</span>
              </div>
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
              <>
                {renderWritingToolbar()}
                <textarea
                  ref={standardTextareaRef}
                  aria-label="Homework work"
                  placeholder={
                    role === 'Teacher'
                      ? `${reviewingStudent.name} has not submitted work or notes yet.`
                      : assignment.taskType === 'flashcards'
                      ? 'Practice using your flashcard vocabulary words in 2-3 sentences here, or jot down notes...'
                      : assignment.taskType === 'test'
                      ? 'Write down any reflection, notes, or questions for your teacher here...'
                      : assignment.taskType === 'word_scramble' || assignment.taskType === 'connecting_words'
                      ? 'Write sentences using your new vocabulary and transition phrases here...'
                      : 'I want to tell you about…'
                  }
                  value={draft}
                  readOnly={role === 'Teacher'}
                  onChange={(e) => handleDraftChangeWithHistory(e.target.value)}
                  maxLength={50000}
                  spellCheck={true}
                  lang="en"
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  style={{
                    minHeight: isWideMode ? '580px' : '460px',
                    fontSize: fontSizeLevel === 'huge' ? '18px' : fontSizeLevel === 'large' ? '16px' : '15px',
                    lineHeight: '2.2rem',
                  }}
                />
              </>
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
                  ? currentStudent.id === 'preview'
                    ? 'Saved to student workspace'
                    : `Saved to ${currentStudent.name}’s workspace`
                  : 'Ready when you are'}
              </span>
              {role === 'Student' && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {draft.length > 0 && (
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
                        if (confirm('Clear your current unsaved draft text?')) {
                          onDraftChange('');
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
                {assignment.taskType === 'flashcards'
                  ? currentStudent.id === 'preview'
                    ? 'Hand in flash card notes'
                    : `Hand in flash card notes (${currentStudent.name})`
                  : assignment.taskType === 'test'
                  ? currentStudent.id === 'preview'
                    ? 'Submit test results'
                    : `Submit test results (${currentStudent.name})`
                  : assignment.taskType === 'word_scramble' || assignment.taskType === 'connecting_words'
                  ? currentStudent.id === 'preview'
                    ? 'Hand in activity & notes'
                    : `Hand in activity & notes (${currentStudent.name})`
                  : currentStudent.id === 'preview'
                  ? 'Hand in homework'
                  : `Hand in homework (${currentStudent.name})`}{' '}
                <Send size={17} />
              </button>
            </div>
          )}
        </div>

        {!isWideMode && (
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

            {/* Optional AI Preliminary Review & Teacher Advising Tool (Pro Feature Preview) */}
            {role === 'Teacher' && (
              <AiEssayReviewAssistant
                role={role}
                student={reviewingStudent}
                assignment={assignment}
                draft={draft}
                feedback={feedback}
                onFeedbackChange={onFeedbackChange}
                onApplyScorecard={onSaveScorecard}
                onToast={onToast}
              />
            )}

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
        )}
      </div>

      {/* Full-screen Big Screen Focus Writing Studio */}
      {isFullScreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Big screen essay writing studio"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: '#f8f6f0',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            width: '100vw',
            overflow: 'hidden',
            color: '#273f3b',
          }}
        >
          {/* Studio Header */}
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 24px',
              background: '#ffffff',
              borderBottom: '1px solid #e5dfd5',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: '#f1ede4',
                  border: '1px solid #ded6c7',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  color: '#273f3b',
                }}
                title="Exit big screen mode (Esc)"
              >
                <Minimize2 size={16} /> Exit big screen{' '}
                <span style={{ opacity: 0.6, fontSize: '11px' }}>(Esc)</span>
              </button>

              <div>
                <span
                  style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#747970',
                    fontWeight: 700,
                  }}
                >
                  {assignment.type || 'Writing'} · {(assignment.taskType || 'essay').toUpperCase()}
                </span>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#273f3b',
                  }}
                >
                  {assignment.title}
                </h2>
              </div>
            </div>

            {/* Center controls: Prompt toggle, Word counter, Font zoom */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowPromptInFullScreen((v) => !v)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: showPromptInFullScreen ? '#e8f3ee' : '#ffffff',
                  border: `1px solid ${showPromptInFullScreen ? '#286654' : '#ded6c7'}`,
                  color: showPromptInFullScreen ? '#286654' : '#575f5b',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <BookOpen size={15} />
                {showPromptInFullScreen ? 'Hide prompt' : 'Show prompt'}
              </button>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: '#faf8f3',
                  border: '1px solid #ebd9a2',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#474d49',
                }}
              >
                <FileText size={15} color="#286654" />
                <span>
                  <strong>{wordCount}</strong> {wordCount === 1 ? 'word' : 'words'}
                  {assignment.words ? ` / ${assignment.words} target` : ''}
                </span>
                {assignment.words && wordCount >= assignment.words && (
                  <span style={{ color: '#286654', marginLeft: '4px' }}>🎯 Target reached!</span>
                )}
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '1px solid #ded6c7',
                  borderRadius: '7px',
                  overflow: 'hidden',
                  background: '#ffffff',
                }}
              >
                <button
                  type="button"
                  onClick={() => setFontSizeLevel('normal')}
                  style={{
                    padding: '5px 10px',
                    border: 'none',
                    background: fontSizeLevel === 'normal' ? '#286654' : '#ffffff',
                    color: fontSizeLevel === 'normal' ? '#ffffff' : '#575f5b',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                  title="Standard text size"
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => setFontSizeLevel('large')}
                  style={{
                    padding: '5px 10px',
                    border: 'none',
                    borderLeft: '1px solid #ded6c7',
                    borderRight: '1px solid #ded6c7',
                    background: fontSizeLevel === 'large' ? '#286654' : '#ffffff',
                    color: fontSizeLevel === 'large' ? '#ffffff' : '#575f5b',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                  title="Larger text size"
                >
                  A+
                </button>
                <button
                  type="button"
                  onClick={() => setFontSizeLevel('huge')}
                  style={{
                    padding: '5px 10px',
                    border: 'none',
                    background: fontSizeLevel === 'huge' ? '#286654' : '#ffffff',
                    color: fontSizeLevel === 'huge' ? '#ffffff' : '#575f5b',
                    fontWeight: 800,
                    fontSize: '16px',
                    cursor: 'pointer',
                  }}
                  title="Huge text size"
                >
                  A++
                </button>
              </div>
            </div>

            {/* Right actions: Download essay, Save draft, Hand in */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {draft.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([draft], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const safeTitle = (assignment.title || 'essay').replace(/[^a-z0-9_-]/gi, '_');
                    const studentTag = role === 'Student' ? currentStudent.name : reviewingStudent.name;
                    a.download = `${safeTitle}_${studentTag}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    background: '#ffffff',
                    border: '1px solid #ded6c7',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#286654',
                    cursor: 'pointer',
                  }}
                  title="Download essay as a text file backup"
                >
                  <Download size={15} /> Save file
                </button>
              )}

              {role === 'Student' && (
                <>
                  <button
                    type="button"
                    onClick={onSaveDraft}
                    disabled={busy || !loaded}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: '#ffffff',
                      border: '1px solid #286654',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#286654',
                      cursor: busy ? 'not-allowed' : 'pointer',
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <Check size={15} /> Save draft
                  </button>

                  <button
                    type="button"
                    onClick={onSubmitHomework}
                    disabled={busy || !loaded}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      background: '#286654',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#ffffff',
                      cursor: busy ? 'not-allowed' : 'pointer',
                      opacity: busy ? 0.6 : 1,
                      boxShadow: '0 2px 6px rgba(40,102,84,0.3)',
                    }}
                  >
                    <Send size={15} /> Hand in
                  </button>
                </>
              )}
            </div>
          </header>

          {/* Main Writing Canvas */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '20px 24px 40px',
            }}
          >
            {/* Collapsible Mission / Prompt banner */}
            {showPromptInFullScreen && (
              <div
                style={{
                  width: '100%',
                  maxWidth: '1050px',
                  background: '#ffffff',
                  border: '1px solid #ebd9a2',
                  borderLeft: '5px solid #d4973b',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#856404',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      🎯 WRITING MISSION
                    </span>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        color: '#273f3b',
                        fontWeight: 500,
                      }}
                    >
                      {assignment.instructions}
                    </p>
                    {assignment.description && assignment.description !== assignment.instructions && (
                      <details style={{ marginTop: '10px' }}>
                        <summary
                          style={{
                            fontSize: '13px',
                            color: '#286654',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          View assignment description & background notes
                        </summary>
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '12px',
                            background: '#f8f6f0',
                            borderRadius: '8px',
                            fontSize: '13px',
                            lineHeight: '1.6',
                            color: '#474d49',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {assignment.description}
                        </div>
                      </details>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPromptInFullScreen(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#747970',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                    title="Hide prompt banner"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Large Ruled Notebook Desk Paper */}
            <div
              style={{
                width: '100%',
                maxWidth: '1050px',
                flex: 1,
                minHeight: '75vh',
                background: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)',
                border: '1px solid #e7e1d5',
                padding: '36px 44px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {/* Notebook left margin accent */}
              <div
                style={{
                  position: 'absolute',
                  top: '36px',
                  bottom: '36px',
                  left: '32px',
                  width: '2px',
                  background: '#f2cac7',
                  pointerEvents: 'none',
                }}
              />

              {/* Student Writing Tools Toolbar inside Big Screen */}
              {renderWritingToolbar()}

              <textarea
                ref={fullScreenTextareaRef}
                aria-label="Homework work (Big Screen)"
                placeholder={
                  role === 'Teacher'
                    ? `${reviewingStudent.name} has not submitted work or notes yet.`
                    : 'I want to tell you about… (Start writing your essay here)'
                }
                value={draft}
                readOnly={role === 'Teacher'}
                onChange={(e) => handleDraftChangeWithHistory(e.target.value)}
                maxLength={50000}
                spellCheck={true}
                lang="en"
                autoCapitalize="sentences"
                autoCorrect="on"
                style={{
                  width: '100%',
                  flex: 1,
                  minHeight: '65vh',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  paddingLeft: '16px',
                  color: '#273f3b',
                  fontFamily: 'inherit',
                  fontSize:
                    fontSizeLevel === 'huge'
                      ? '22px'
                      : fontSizeLevel === 'large'
                      ? '18px'
                      : '16px',
                  lineHeight:
                    fontSizeLevel === 'huge'
                      ? '2.8rem'
                      : fontSizeLevel === 'large'
                      ? '2.4rem'
                      : '2.1rem',
                  backgroundImage:
                    fontSizeLevel === 'huge'
                      ? 'repeating-linear-gradient(transparent, transparent 2.7rem, #eef3eb 2.7rem, #eef3eb 2.8rem)'
                      : fontSizeLevel === 'large'
                      ? 'repeating-linear-gradient(transparent, transparent 2.3rem, #eef3eb 2.3rem, #eef3eb 2.4rem)'
                      : 'repeating-linear-gradient(transparent, transparent 2.0rem, #eef3eb 2.0rem, #eef3eb 2.1rem)',
                  backgroundAttachment: 'local',
                }}
              />

              {/* Bottom status & tips */}
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '14px',
                  borderTop: '1px solid #f0eae1',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#747970',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <span>
                  💡 <strong>Tip:</strong> Press <strong>Esc</strong> anytime to return to standard view. All changes are saved continuously.
                </span>
                <span>
                  ~{Math.max(1, Math.ceil(wordCount / 180))} min read · {draft.length} characters
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
