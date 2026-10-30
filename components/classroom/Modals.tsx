'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, Download, Sparkles, BookOpen, Gamepad2 } from 'lucide-react';
import type { MaterialEntry, Student } from '../../lib/types';
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
  busy: boolean;
  loaded: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}

export function CreateModal({ type, busy, loaded, onClose, onSubmit }: CreateModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const [activityType, setActivityType] = useState<string>('none');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(new FormData(e.currentTarget));
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
        style={{ maxWidth: '600px' }}
      >
        <button className="close" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>

        <span className="eyebrow">TEACHER WORKSPACE</span>
        <h2>{type === 'assignment' ? 'A new writing adventure' : 'Add to the toolbox'}</h2>

        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input
              name="title"
              required
              maxLength={100}
              placeholder={
                type === 'assignment'
                  ? 'What will your writers explore?'
                  : 'Give this resource a name'
              }
            />
          </label>

          <label>
            {type === 'assignment' ? 'Writing type' : 'Resource type'}
            <input
              name="type"
              required
              maxLength={40}
              placeholder={type === 'assignment' ? 'Opinion essay' : 'Writing guide'}
            />
          </label>

          {type === 'assignment' ? (
            <>
              <label>
                Due date
                <input name="due" type="date" required />
              </label>
              <label>
                Short introduction
                <input name="description" maxLength={180} required />
              </label>
              <label>
                Instructions
                <textarea
                  name="instructions"
                  required
                  maxLength={6000}
                  placeholder="Give your writers a clear task and a suggested word count."
                />
              </label>
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
              <label>
                Optional attachment
                <input
                  type="file"
                  name="file"
                  accept=".png,.jpg,.jpeg,.webp,.heic,.pdf,.doc,.docx,.txt"
                />
              </label>
            </>
          )}

          {/* Interactive Edutainment Selector for Teachers */}
          <div
            style={{
              background: '#f4f8f3',
              border: '1px solid #d7e4d4',
              borderRadius: '10px',
              padding: '14px',
              margin: '18px 0 10px',
            }}
          >
            <label style={{ margin: 0, fontWeight: 700, color: '#275240' }}>
              <Sparkles size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
              Add Edutainment Activity (Quiz or Word Game):
            </label>
            <select
              name="activityType"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              style={{
                width: '100%',
                marginTop: '8px',
                padding: '9px 12px',
                borderRadius: '7px',
                border: '1px solid #c9d8c6',
              }}
            >
              <option value="none">None (Standard only)</option>
              <option value="word_scramble">🔤 Vocabulary Word Scramble Game</option>
              <option value="quiz">📝 Multiple-Choice Comprehension Quiz</option>
              <option value="connecting_words">🔗 Connecting Words Match Challenge</option>
            </select>

            {activityType === 'word_scramble' && (
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#526658' }}>
                <label>
                  Word 1 & Hint (e.g. GLIMMER: A gentle shine)
                  <input
                    name="scramble_word1"
                    defaultValue="GLIMMER"
                    placeholder="Word to unscramble"
                  />
                  <input
                    name="scramble_hint1"
                    defaultValue="A soft gentle light"
                    placeholder="Clue or hint for students"
                    style={{ marginTop: '4px' }}
                  />
                </label>
              </div>
            )}

            {activityType === 'quiz' && (
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#526658' }}>
                <label>
                  Quiz Question:
                  <input
                    name="quiz_question"
                    defaultValue="What makes a first draft strong?"
                    placeholder="Question for students"
                  />
                </label>
                <label style={{ marginTop: '6px' }}>
                  Correct Answer (Option 1):
                  <input
                    name="quiz_opt1"
                    defaultValue="Sharing your honest ideas and feelings"
                    placeholder="Correct answer"
                  />
                </label>
                <label style={{ marginTop: '6px' }}>
                  Distractor (Option 2):
                  <input
                    name="quiz_opt2"
                    defaultValue="Getting every single word 100% perfect"
                    placeholder="Incorrect choice"
                  />
                </label>
                <label style={{ marginTop: '6px' }}>
                  Feedback Explanation:
                  <input
                    name="quiz_explanation"
                    defaultValue="First drafts are all about getting your ideas onto paper!"
                    placeholder="Friendly explanation"
                  />
                </label>
              </div>
            )}

            {activityType === 'connecting_words' && (
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#526658' }}>
                <p style={{ margin: 0 }}>
                  A mini-game challenging students to categorize transition phrases (such as
                  &ldquo;However&rdquo;, &ldquo;For example&rdquo;, &ldquo;Because&rdquo;, and
                  &ldquo;In addition&rdquo;).
                </p>
              </div>
            )}
          </div>

          <button className="primary" type="submit" disabled={busy || !loaded}>
            {busy ? 'Saving…' : type === 'assignment' ? 'Assign homework' : 'Save material'}{' '}
            <Plus size={17} />
          </button>
        </form>
      </section>
    </div>
  );
}
