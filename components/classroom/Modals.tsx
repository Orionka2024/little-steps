'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Plus,
  Download,
  Sparkles,
  BookOpen,
  Gamepad2,
  Trash2,
  PlusCircle,
  ExternalLink,
  Eye,
  EyeOff,
  HardDrive,
  Check,
} from 'lucide-react';
import type {
  MaterialEntry,
  Student,
  AssignmentTaskType,
  AssignmentEntry,
  FlashCardItem,
  QuizQuestion,
  WordScrambleItem,
} from '../../lib/types';
import { parseGoogleDriveUrl, getGoogleDriveBadge } from '../../lib/google-drive';
import { InteractiveActivityContainer } from './interactive/InteractiveActivityContainer';

interface ResourceModalProps {
  resource: MaterialEntry;
  currentStudent?: Student;
  onClose: () => void;
  onActivityComplete?: (score: number, total: number) => void;
}

export function ResourceModal({
  resource,
  currentStudent,
  onClose,
  onActivityComplete,
}: ResourceModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'interactive'>('content');
  const [showDrivePreview, setShowDrivePreview] = useState(false);

  const driveBadge = useMemo(
    () => getGoogleDriveBadge(resource.googleDrive?.driveType),
    [resource.googleDrive?.driveType]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={resource.title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        <button className="close" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>

        <span className="eyebrow">{resource.type}</span>
        <h2>{resource.title}</h2>

        {resource.interactive && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '18px',
              borderBottom: '1px solid #e3e8de',
              paddingBottom: '12px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: activeTab === 'content' ? '1px solid #286654' : '1px solid #e1e7dc',
                background: activeTab === 'content' ? '#eaf2ec' : '#fff',
                color: activeTab === 'content' ? '#1f5445' : '#57675f',
                fontWeight: activeTab === 'content' ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <BookOpen size={14} /> Guide Notes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('interactive')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: activeTab === 'interactive' ? '1px solid #286654' : '1px solid #e1e7dc',
                background: activeTab === 'interactive' ? '#eaf2ec' : '#fff',
                color: activeTab === 'interactive' ? '#1f5445' : '#57675f',
                fontWeight: activeTab === 'interactive' ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <Gamepad2 size={14} /> Interactive Challenge ⭐
            </button>
          </div>
        )}

        {activeTab === 'content' ? (
          <>
            <div className="resource-content">{resource.body}</div>

            {/* Google Drive Attachment */}
            {resource.googleDrive && (
              <div
                style={{
                  marginTop: '16px',
                  background: '#f8fafd',
                  border: '1px solid #d2e3fc',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: driveBadge.bg,
                        border: `1px solid ${driveBadge.borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0,
                      }}
                    >
                      {driveBadge.icon}
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#202124', display: 'block' }}>
                        {resource.googleDrive.name || driveBadge.name}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#5f6368' }}>
                        Google Drive • {driveBadge.name}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {resource.googleDrive.embedUrl && (
                      <button
                        type="button"
                        onClick={() => setShowDrivePreview(!showDrivePreview)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          borderRadius: '6px',
                          border: '1px solid #bad3fc',
                          background: showDrivePreview ? '#e8f0fe' : '#fff',
                          color: '#1a73e8',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {showDrivePreview ? <EyeOff size={13} /> : <Eye size={13} />}
                        {showDrivePreview ? 'Hide preview' : 'Preview'}
                      </button>
                    )}
                    <a
                      href={resource.googleDrive.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '11px',
                        padding: '6px 12px',
                        background: '#1a73e8',
                        color: '#fff',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      Open in Drive <ExternalLink size={13} />
                    </a>
                  </div>
                </div>

                {showDrivePreview && resource.googleDrive.embedUrl && (
                  <div
                    style={{
                      marginTop: '12px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid #d2e3fc',
                      background: '#fff',
                    }}
                  >
                    <iframe
                      src={resource.googleDrive.embedUrl}
                      title={resource.googleDrive.name || 'Google Drive Preview'}
                      width="100%"
                      height="380"
                      style={{ border: 0, display: 'block' }}
                      allow="autoplay"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Local Computer File Attachment */}
            {resource.file && (
              <a
                className="primary"
                href={`/api/files?key=${encodeURIComponent(resource.file.key)}`}
                style={{ marginTop: '16px' }}
              >
                <Download size={17} /> Download {resource.file.name}
              </a>
            )}
          </>
        ) : (
          resource.interactive && (
            <InteractiveActivityContainer
              activity={resource.interactive}
              studentName={currentStudent?.name}
              onComplete={onActivityComplete}
            />
          )
        )}
      </section>
    </div>
  );
}

interface CreateModalProps {
  type: 'assignment' | 'material';
  initialAssignment?: AssignmentEntry | null;
  busy: boolean;
  loaded: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}

export function CreateModal({
  type,
  initialAssignment,
  busy,
  loaded,
  onClose,
  onSubmit,
}: CreateModalProps) {
  const isEditing = Boolean(initialAssignment);
  const dialogRef = useRef<HTMLElement>(null);
  const [taskFormat, setTaskFormat] = useState<AssignmentTaskType>(
    initialAssignment?.taskType ||
      (initialAssignment?.interactive?.type as AssignmentTaskType) ||
      'essay'
  );
  const [activityType, setActivityType] = useState<string>('none');
  const [posted, setPosted] = useState<boolean>(
    initialAssignment ? (initialAssignment.posted ?? true) : true
  );

  // Google Drive & Local file attachment state for materials
  const [driveUrl, setDriveUrl] = useState('');
  const [driveName, setDriveName] = useState('');
  const [localFileName, setLocalFileName] = useState('');

  const driveInfo = useMemo(() => parseGoogleDriveUrl(driveUrl), [driveUrl]);
  const driveBadge = useMemo(() => getGoogleDriveBadge(driveInfo.driveType), [driveInfo.driveType]);

  // Flashcards builder state
  const [flashcards, setFlashcards] = useState<Array<{ front: string; back: string; hint: string }>>(() => {
    if (initialAssignment?.interactive?.type === 'flashcards' && initialAssignment.interactive.cards?.length) {
      return (initialAssignment.interactive.cards as FlashCardItem[]).map((c: FlashCardItem) => ({
        front: c.front,
        back: c.back,
        hint: c.hint || '',
      }));
    }
    return [
      {
        front: 'MOMENTOUS',
        back: 'Of great importance or significance, having a major effect on future events.',
        hint: 'Adjective - very significant',
      },
      {
        front: 'VIVID',
        back: 'Producing powerful, detailed, and clear sensory images in the reader’s mind.',
        hint: 'Sensory adjective',
      },
      {
        front: 'PERSUASIVE',
        back: 'Convincing someone to believe or do something through compelling reasoning.',
        hint: 'Rhetorical adjective',
      },
    ];
  });

  // Quiz / Test builder state
  const [quizQuestions, setQuizQuestions] = useState<
    Array<{
      question: string;
      opt1: string;
      opt2: string;
      opt3: string;
      explanation: string;
    }>
  >(() => {
    if (initialAssignment?.interactive?.type === 'quiz' && initialAssignment.interactive.questions?.length) {
      return (initialAssignment.interactive.questions as QuizQuestion[]).map((q: QuizQuestion) => ({
        question: q.question,
        opt1: q.options[0] || '',
        opt2: q.options[1] || '',
        opt3: q.options[2] || '',
        explanation: q.explanation || '',
      }));
    }
    return [
      {
        question: 'Which sentence serves as the strongest opening for an opinion essay?',
        opt1: 'If our school replaces 30 minutes of desk work with outdoor project time, creativity will soar.',
        opt2: 'I think that rules are boring and people do not like them.',
        opt3: 'School is an institution that students attend daily.',
        explanation: 'A specific, bold thesis statement with cause and effect engages the reader immediately!',
      },
      {
        question: 'What is the primary function of transition words such as "Furthermore" or "In addition"?',
        opt1: 'To add another supporting argument or detail that strengthens your point',
        opt2: 'To immediately conclude the entire essay',
        opt3: 'To indicate an opposing viewpoint or objection',
        explanation: 'Additive transition words link related arguments together smoothly.',
      },
    ];
  });

  // Word Scramble builder state
  const [scrambleWords, setScrambleWords] = useState<Array<{ word: string; hint: string }>>(() => {
    if (initialAssignment?.interactive?.type === 'word_scramble' && initialAssignment.interactive.words?.length) {
      return (initialAssignment.interactive.words as WordScrambleItem[]).map((w: WordScrambleItem) => ({
        word: w.word,
        hint: w.hint || '',
      }));
    }
    return [
      { word: 'GLIMMER', hint: 'A soft, gentle unsteady light' },
      { word: 'WHISPER', hint: 'A soft, quiet sound or voice' },
      { word: 'COZINESS', hint: 'Feeling warm, comfortable, and safe' },
    ];
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('taskFormat', taskFormat);
    fd.set('posted', String(posted));

    if (initialAssignment) {
      fd.set('assignmentId', initialAssignment.id);
      if (initialAssignment.color) fd.set('color', initialAssignment.color);
      if (initialAssignment.icon) fd.set('icon', initialAssignment.icon);
    }

    if (taskFormat === 'flashcards') {
      fd.set('flashcards_data', JSON.stringify(flashcards));
    } else if (taskFormat === 'test') {
      const formatted = quizQuestions.map((q) => ({
        question: q.question,
        options: [q.opt1, q.opt2, ...(q.opt3.trim() ? [q.opt3] : [])],
        correctIndex: 0,
        explanation: q.explanation,
      }));
      fd.set('quiz_questions_data', JSON.stringify(formatted));
    } else if (taskFormat === 'word_scramble') {
      const formatted = scrambleWords.map((w) => {
        const clean = w.word.trim().toUpperCase();
        return {
          word: clean,
          scrambled: clean.split('').sort(() => Math.random() - 0.5).join(''),
          hint: w.hint,
        };
      });
      fd.set('scramble_words_data', JSON.stringify(formatted));
    }

    onSubmit(fd);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Create ${type}`}
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        <button className="close" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>

        <span className="eyebrow">TEACHER WORKSPACE</span>
        <h2>
          {type === 'assignment'
            ? isEditing
              ? 'Edit classroom homework'
              : 'Assign classroom homework'
            : 'Add to the toolbox'}
        </h2>

        <form onSubmit={handleSubmit}>
          {isEditing && (
            <>
              <input type="hidden" name="assignmentId" value={initialAssignment?.id || ''} />
              {initialAssignment?.color && <input type="hidden" name="color" value={initialAssignment.color} />}
              {initialAssignment?.icon && <input type="hidden" name="icon" value={initialAssignment.icon} />}
            </>
          )}
          {type === 'assignment' && (
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontWeight: 700, color: '#275240', marginBottom: '8px', display: 'block' }}>
                Select Homework Task Type:
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: '8px',
                }}
              >
                {[
                  {
                    id: 'essay' as const,
                    label: 'Write Essay',
                    icon: '✍️',
                    desc: 'Essay prompt & drafting',
                  },
                  {
                    id: 'flashcards' as const,
                    label: 'Flash Cards',
                    icon: '🗂️',
                    desc: 'Vocabulary & study deck',
                  },
                  {
                    id: 'test' as const,
                    label: 'Test / Quiz',
                    icon: '📝',
                    desc: 'Comprehension quiz',
                  },
                  {
                    id: 'word_scramble' as const,
                    label: 'Word Scramble',
                    icon: '🔤',
                    desc: 'Vocabulary spelling game',
                  },
                  {
                    id: 'connecting_words' as const,
                    label: 'Connecting Words',
                    icon: '🔗',
                    desc: 'Transition matching',
                  },
                ].map((item) => {
                  const isSelected = taskFormat === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTaskFormat(item.id)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: '9px',
                        border: isSelected ? '2px solid #286654' : '1px solid #dce4d9',
                        background: isSelected ? '#edf5ee' : '#fff',
                        color: isSelected ? '#1b4b3b' : '#57675e',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '3px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{item.icon}</span>
                      <strong style={{ fontSize: '11px' }}>{item.label}</strong>
                      <span style={{ fontSize: '9px', color: isSelected ? '#336351' : '#88988e' }}>
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <label>
            Title
            <input
              name="title"
              required
              maxLength={100}
              defaultValue={initialAssignment?.title || ''}
              placeholder={
                type === 'assignment'
                  ? taskFormat === 'essay'
                    ? 'e.g. A Place That Feels Like Home'
                    : taskFormat === 'flashcards'
                    ? 'e.g. Descriptive Vocabulary Flash Cards'
                    : taskFormat === 'test'
                    ? 'e.g. Unit 1 Topic & Vocabulary Test'
                    : taskFormat === 'word_scramble'
                    ? 'e.g. Sensory Words Scramble'
                    : 'e.g. Transition Phrases Challenge'
                  : 'Give this resource a name'
              }
            />
          </label>

          <label>
            {type === 'assignment' ? 'Category / Tag' : 'Resource type'}
            <input
              name="type"
              required
              maxLength={40}
              defaultValue={
                initialAssignment?.type ||
                (type === 'assignment'
                  ? taskFormat === 'essay'
                    ? 'Opinion essay'
                    : taskFormat === 'flashcards'
                    ? 'Vocabulary Flash Cards'
                    : taskFormat === 'test'
                    ? 'Topic & Vocabulary Test'
                    : taskFormat === 'word_scramble'
                    ? 'Word Scramble Challenge'
                    : 'Connecting Words Challenge'
                  : 'Writing guide')
              }
            />
          </label>

          {type === 'assignment' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Due date
                  <input name="due" type="date" required defaultValue={initialAssignment?.due || ''} />
                </label>
                <label>
                  Estimated duration (minutes)
                  <input name="minutes" type="number" defaultValue={initialAssignment?.minutes ?? 25} min={5} max={180} />
                </label>
              </div>

              <label>
                Short introduction / Goal
                <input
                  name="description"
                  maxLength={180}
                  required
                  defaultValue={initialAssignment?.description || ''}
                  placeholder={
                    taskFormat === 'essay'
                      ? 'Every place has a story. Tell us about a place that makes you feel happy.'
                      : taskFormat === 'flashcards'
                      ? 'Master these key vocabulary words from our lessons and practice their definitions.'
                      : taskFormat === 'test'
                      ? 'Test your understanding of topics and vocabulary covered this week.'
                      : 'Practice spelling and meaning with interactive word games.'
                  }
                />
              </label>

              <label>
                Student instructions
                <textarea
                  name="instructions"
                  required
                  maxLength={6000}
                  defaultValue={
                    initialAssignment?.instructions ||
                    (taskFormat === 'essay'
                      ? 'Write a 150–200 word essay. State your opinion clearly in the introduction, provide two reasons with real examples, and end with a strong conclusion.'
                      : taskFormat === 'flashcards'
                      ? 'Review each flashcard, flip to see the meaning, and practice until you know every card! In the notes below, write sentences using your new words.'
                      : taskFormat === 'test'
                      ? 'Read each test question carefully and select the best answer. You will see your score and feedback when complete.'
                      : 'Unscramble each vocabulary word using the clues provided, then practice using them in sentences.')
                  }
                />
              </label>

              {/* Task-specific interactive builders */}

              {/* 1. Flash Cards Builder */}
              {taskFormat === 'flashcards' && (
                <div
                  style={{
                    background: '#f9f6fc',
                    border: '1px solid #e5daf3',
                    borderRadius: '10px',
                    padding: '16px',
                    marginTop: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <strong style={{ fontSize: '13px', color: '#4a2f77' }}>
                      🗂️ Flash Card Deck ({flashcards.length} cards):
                    </strong>
                    <button
                      type="button"
                      onClick={() =>
                        setFlashcards([
                          ...flashcards,
                          { front: '', back: '', hint: '' },
                        ])
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#58368f',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      <PlusCircle size={13} /> Add Card
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {flashcards.map((card, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #decde9',
                          borderRadius: '8px',
                          padding: '12px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '6px',
                          }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#59388f' }}>
                            Card #{idx + 1}
                          </span>
                          {flashcards.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setFlashcards(flashcards.filter((_, i) => i !== idx))
                              }
                              title="Delete card"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#b24c4c',
                                cursor: 'pointer',
                                padding: '2px',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        <input
                          placeholder="Front (Word / Term, e.g. MOMENTOUS)"
                          value={card.front}
                          onChange={(e) => {
                            const updated = [...flashcards];
                            updated[idx].front = e.target.value;
                            setFlashcards(updated);
                          }}
                          required
                          style={{ marginBottom: '6px', fontSize: '12px', padding: '8px' }}
                        />
                        <textarea
                          placeholder="Back (Definition / Meaning / Example sentence)"
                          value={card.back}
                          onChange={(e) => {
                            const updated = [...flashcards];
                            updated[idx].back = e.target.value;
                            setFlashcards(updated);
                          }}
                          required
                          style={{
                            minHeight: '60px',
                            marginBottom: '6px',
                            fontSize: '12px',
                            padding: '8px',
                          }}
                        />
                        <input
                          placeholder="Optional Hint or Word Class (e.g. Adjective - very important)"
                          value={card.hint}
                          onChange={(e) => {
                            const updated = [...flashcards];
                            updated[idx].hint = e.target.value;
                            setFlashcards(updated);
                          }}
                          style={{ fontSize: '11px', padding: '6px 8px' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Test / Quiz Builder */}
              {taskFormat === 'test' && (
                <div
                  style={{
                    background: '#fcf8f2',
                    border: '1px solid #ebdcc5',
                    borderRadius: '10px',
                    padding: '16px',
                    marginTop: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <strong style={{ fontSize: '13px', color: '#68451b' }}>
                      📝 Test Questions ({quizQuestions.length} questions):
                    </strong>
                    <button
                      type="button"
                      onClick={() =>
                        setQuizQuestions([
                          ...quizQuestions,
                          {
                            question: '',
                            opt1: '',
                            opt2: '',
                            opt3: '',
                            explanation: '',
                          },
                        ])
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#7c5421',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      <PlusCircle size={13} /> Add Question
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {quizQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e7d8c4',
                          borderRadius: '8px',
                          padding: '12px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '6px',
                          }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#7a511e' }}>
                            Question #{idx + 1}
                          </span>
                          {quizQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setQuizQuestions(quizQuestions.filter((_, i) => i !== idx))
                              }
                              title="Delete question"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#b24c4c',
                                cursor: 'pointer',
                                padding: '2px',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        <input
                          placeholder="Question text"
                          value={q.question}
                          onChange={(e) => {
                            const updated = [...quizQuestions];
                            updated[idx].question = e.target.value;
                            setQuizQuestions(updated);
                          }}
                          required
                          style={{ marginBottom: '6px', fontSize: '12px', padding: '8px' }}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                          <input
                            placeholder="Option 1 (Correct Answer) ⭐"
                            value={q.opt1}
                            onChange={(e) => {
                              const updated = [...quizQuestions];
                              updated[idx].opt1 = e.target.value;
                              setQuizQuestions(updated);
                            }}
                            required
                            style={{
                              fontSize: '11px',
                              padding: '7px 8px',
                              borderColor: '#b4cfb0',
                              background: '#f8fdf7',
                            }}
                          />
                          <input
                            placeholder="Option 2 (Incorrect Distractor)"
                            value={q.opt2}
                            onChange={(e) => {
                              const updated = [...quizQuestions];
                              updated[idx].opt2 = e.target.value;
                              setQuizQuestions(updated);
                            }}
                            required
                            style={{ fontSize: '11px', padding: '7px 8px' }}
                          />
                          <input
                            placeholder="Option 3 (Optional Distractor)"
                            value={q.opt3}
                            onChange={(e) => {
                              const updated = [...quizQuestions];
                              updated[idx].opt3 = e.target.value;
                              setQuizQuestions(updated);
                            }}
                            style={{ fontSize: '11px', padding: '7px 8px' }}
                          />
                        </div>

                        <input
                          placeholder="Feedback explanation (shown to student after answering)"
                          value={q.explanation}
                          onChange={(e) => {
                            const updated = [...quizQuestions];
                            updated[idx].explanation = e.target.value;
                            setQuizQuestions(updated);
                          }}
                          style={{ marginTop: '6px', fontSize: '11px', padding: '6px 8px' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Word Scramble Builder */}
              {taskFormat === 'word_scramble' && (
                <div
                  style={{
                    background: '#f4f8f3',
                    border: '1px solid #d7e4d4',
                    borderRadius: '10px',
                    padding: '16px',
                    marginTop: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <strong style={{ fontSize: '13px', color: '#275240' }}>
                      🔤 Vocabulary Words to Scramble:
                    </strong>
                    <button
                      type="button"
                      onClick={() =>
                        setScrambleWords([
                          ...scrambleWords,
                          { word: '', hint: '' },
                        ])
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#286654',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      <PlusCircle size={13} /> Add Word
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {scrambleWords.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#fff',
                          border: '1px solid #dbe6d6',
                          borderRadius: '8px',
                          padding: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <input
                          placeholder="Word (e.g. GLIMMER)"
                          value={item.word}
                          onChange={(e) => {
                            const updated = [...scrambleWords];
                            updated[idx].word = e.target.value.toUpperCase();
                            setScrambleWords(updated);
                          }}
                          required
                          style={{ flex: 1, margin: 0, padding: '7px 8px', fontSize: '12px' }}
                        />
                        <input
                          placeholder="Hint / Clue for students"
                          value={item.hint}
                          onChange={(e) => {
                            const updated = [...scrambleWords];
                            updated[idx].hint = e.target.value;
                            setScrambleWords(updated);
                          }}
                          style={{ flex: 1.5, margin: 0, padding: '7px 8px', fontSize: '11px' }}
                        />
                        {scrambleWords.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setScrambleWords(scrambleWords.filter((_, i) => i !== idx))
                            }
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#b24c4c',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Connecting Words Note */}
              {taskFormat === 'connecting_words' && (
                <div
                  style={{
                    background: '#f4f8f3',
                    border: '1px solid #d7e4d4',
                    borderRadius: '10px',
                    padding: '14px',
                    marginTop: '16px',
                    fontSize: '12px',
                    color: '#285e48',
                  }}
                >
                  <p style={{ margin: 0 }}>
                    🔗 <strong>Connecting Words Challenge</strong> tests students on matching transition
                    phrases (&ldquo;For example&rdquo;, &ldquo;However&rdquo;, &ldquo;In addition&rdquo;,
                    &ldquo;Because&rdquo;) with their rhetorical roles in essays.
                  </p>
                </div>
              )}

              {/* 5. Optional Warm-up for Essay */}
              {taskFormat === 'essay' && (
                <div
                  style={{
                    background: '#f8faf7',
                    border: '1px solid #e1e9de',
                    borderRadius: '10px',
                    padding: '14px',
                    marginTop: '16px',
                  }}
                >
                  <label style={{ margin: 0, fontWeight: 700, color: '#275240' }}>
                    <Sparkles size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                    Optional Warm-up Activity before essay:
                  </label>
                  <select
                    name="activityType"
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      padding: '8px 10px',
                      borderRadius: '7px',
                      border: '1px solid #c9d8c6',
                    }}
                  >
                    <option value="none">None (Essay only)</option>
                    <option value="word_scramble">🔤 Vocabulary Word Scramble Warm-up</option>
                    <option value="quiz">📝 Quick Comprehension Quiz Warm-up</option>
                    <option value="connecting_words">🔗 Connecting Words Match Warm-up</option>
                  </select>
                </div>
              )}

              {/* Post to classroom checkbox */}
              <div
                style={{
                  background: '#fcfaf6',
                  border: '1px solid #ebd9c5',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginTop: '16px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    margin: 0,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#4f3a22',
                  }}
                >
                  <input
                    type="checkbox"
                    name="posted"
                    value="true"
                    checked={posted}
                    onChange={(e) => setPosted(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#286654',
                      cursor: 'pointer',
                      margin: 0,
                    }}
                  />
                  <span>
                    {isEditing
                      ? 'Homework is posted to classroom'
                      : 'Post to classroom immediately'}
                  </span>
                </label>
                <p
                  style={{
                    margin: '4px 0 0 28px',
                    fontSize: '11px',
                    color: '#7f6f5d',
                    lineHeight: 1.5,
                  }}
                >
                  {isEditing
                    ? posted
                      ? 'Students (Hajun, Mark, Juwon) can see and work on this assignment. Uncheck to unpost and hide it.'
                      : 'Students cannot see this assignment. Check to post it to the classroom now.'
                    : 'Leave unchecked to keep as an unposted draft (hidden from students until you post it).'}
                </p>
              </div>
            </>
          ) : (
            <>
              <label>
                Resource content
                <textarea
                  name="body"
                  required
                  maxLength={15000}
                  placeholder="Add your guide, examples, or helpful notes…"
                />
              </label>

              <div style={{ marginTop: '16px', borderTop: '1px solid #e5ebe1', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 700, color: '#275240', margin: 0 }}>
                    Attachments & Resources (Optional)
                  </label>
                  <span style={{ fontSize: '11px', color: '#68776f' }}>
                    Attach computer files, Google Drive, or both
                  </span>
                </div>

                {/* Option 1: File from Computer */}
                <div
                  style={{
                    background: '#f9faf7',
                    border: '1px solid #e4e9df',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <HardDrive size={15} color="#3d6b59" />
                    <span style={{ fontWeight: 600, fontSize: '12px', color: '#273f3b' }}>
                      File from Computer
                    </span>
                  </div>
                  <input
                    type="file"
                    name="file"
                    accept=".png,.jpg,.jpeg,.webp,.heic,.pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setLocalFileName(f ? f.name : '');
                    }}
                    style={{ fontSize: '12px', width: '100%' }}
                  />
                  {localFileName && (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#3d6b59' }}>
                      Attached file: <strong>{localFileName}</strong>
                    </div>
                  )}
                </div>

                {/* Option 2: File from Google Drive */}
                <div
                  style={{
                    background: '#f8fafd',
                    border: '1px solid #bad3fc',
                    borderRadius: '8px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px' }}>📁</span>
                      <span style={{ fontWeight: 600, fontSize: '12px', color: '#1a73e8' }}>
                        Google Drive File or Document
                      </span>
                    </div>
                    {driveUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setDriveUrl('');
                          setDriveName('');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#70757a',
                          fontSize: '11px',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <input
                    type="url"
                    name="googleDriveUrl"
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder="Paste Google Drive share link (Docs, Slides, Sheets, PDF, or folder)…"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #bad3fc',
                      background: '#fff',
                      marginBottom: '8px',
                      boxSizing: 'border-box',
                    }}
                  />

                  {driveUrl.trim() && (
                    <>
                      <input
                        type="text"
                        name="googleDriveName"
                        value={driveName}
                        onChange={(e) => setDriveName(e.target.value)}
                        placeholder={`Display title (optional, defaults to "${driveInfo.label}")`}
                        maxLength={120}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          border: '1px solid #d2e3fc',
                          background: '#fff',
                          marginBottom: '8px',
                          boxSizing: 'border-box',
                        }}
                      />

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: driveInfo.isValid ? driveBadge.bg : '#fce8e6',
                          border: `1px solid ${driveInfo.isValid ? driveBadge.borderColor : '#fad2cf'}`,
                          fontSize: '11px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{driveInfo.isValid ? driveBadge.icon : '⚠️'}</span>
                          <span
                            style={{
                              fontWeight: 600,
                              color: driveInfo.isValid ? driveBadge.accentColor : '#c5221f',
                            }}
                          >
                            {driveInfo.isValid
                              ? `${driveBadge.name} recognized`
                              : 'Please check link: enter a valid Google Drive or Docs URL'}
                          </span>
                        </div>
                        {driveInfo.isValid && (
                          <a
                            href={driveInfo.cleanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: driveBadge.accentColor,
                              textDecoration: 'underline',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            Test link <ExternalLink size={11} />
                          </a>
                        )}
                      </div>

                      <div style={{ marginTop: '6px', fontSize: '11px', color: '#5f6368', lineHeight: 1.4 }}>
                        💡 <em>Tip: Ensure sharing permission is set to <strong>"Anyone with the link can view"</strong> in Google Drive.</em>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          <button
            className="primary"
            type="submit"
            disabled={busy || !loaded}
            style={{ marginTop: '18px', width: '100%', justifyContent: 'center' }}
          >
            {busy
              ? 'Saving…'
              : isEditing
              ? 'Save assignment changes'
              : type === 'assignment'
              ? 'Assign homework'
              : 'Save material'}{' '}
            {isEditing ? <Check size={17} /> : <Plus size={17} />}
          </button>
        </form>
      </section>
    </div>
  );
}
