'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
  BookOpen,
  Send,
  Zap,
  Target,
  HelpCircle,
  Award,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import type { Role, Student, AssignmentEntry, WritingScorecard } from '../../lib/types';
import {
  analyzeEssayWithAi,
  type AiEssayReviewResult,
  type EssayAdvisingPrompt,
} from '../../lib/ai-essay-coach';

interface AiEssayReviewAssistantProps {
  role: Role;
  student: Student;
  assignment: AssignmentEntry;
  draft: string;
  feedback: string;
  onFeedbackChange: (text: string) => void;
  onApplyScorecard?: (card: WritingScorecard) => void;
  onToast?: (message: string) => void;
}

const SAMPLE_STUDENT_ESSAY = `In my opinion, our school should change the rule about desk work and give us 30 minutes of outdoor project time every day.

One reason is that sitting in a chair for six hours makes students very tired and lose focus. When we go outside, the fresh air and sunlight wake up our brains. For example, last Wednesday our science class observed leaves in the courtyard, and everyone remembered the plant parts much better than reading a textbook.

Another reason is that outdoor time teaches teamwork. We can build small gardens, measure shadows, and talk to each other without whispering. Some teachers might worry that students will play and get dirty, but if we have clear project goals, it will be very good and fun.

In conclusion, replacing 30 minutes of sitting with outdoor learning will make students healthier, happier, and more creative.`;

export function AiEssayReviewAssistant({
  role,
  student,
  assignment,
  draft,
  feedback,
  onFeedbackChange,
  onApplyScorecard,
  onToast,
}: AiEssayReviewAssistantProps) {
  // STRICT CONSTRAINT: Do NOT render anything if the user is in student mode
  if (role !== 'Teacher') {
    return null;
  }

  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [reviewResult, setReviewResult] = useState<AiEssayReviewResult | null>(null);
  const [focusMode, setFocusMode] = useState<'balanced' | 'competition' | 'structure' | 'foundations'>('balanced');
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [insertedPromptId, setInsertedPromptId] = useState<string | null>(null);
  const [appliedScorecard, setAppliedScorecard] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'prompts' | 'rubric' | 'feedback' | 'diagnostics'>('prompts');
  const [customTextToReview, setCustomTextToReview] = useState<string>('');

  const effectiveText = (customTextToReview.trim() || draft.trim());

  // Function to perform the AI review
  const handleRunReview = useCallback(
    async (textOverride?: string, focusOverride?: 'balanced' | 'competition' | 'structure' | 'foundations') => {
      const textToUse = textOverride !== undefined ? textOverride : effectiveText;
      const focusToUse = focusOverride || focusMode;

      if (!textToUse.trim()) {
        onToast?.(`No essay text available for ${student.name}. You can click "Use Sample Essay" to preview the AI review.`);
        return;
      }

      setIsAnalyzing(true);
      setAppliedScorecard(false);

      try {
        // First try calling the server API route
        const res = await fetch('/api/ai-review', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': 'Teacher',
          },
          body: JSON.stringify({
            essayText: textToUse,
            studentName: student.name,
            assignmentTitle: assignment.title,
            assignmentType: assignment.type,
            assignmentInstructions: assignment.instructions,
            targetWordCount: assignment.words || 150,
            reviewFocus: focusToUse,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as { success: boolean; review: AiEssayReviewResult };
          if (data.success && data.review) {
            setReviewResult(data.review);
            onToast?.(`✨ AI Preliminary Review ready for ${student.name}!`);
            setIsAnalyzing(false);
            return;
          }
        }
      } catch {
        // Fall back gracefully to direct client-side analysis
      }

      // Local analysis fallback
      try {
        const localReview = analyzeEssayWithAi({
          essayText: textToUse,
          studentName: student.name,
          assignmentTitle: assignment.title,
          assignmentType: assignment.type,
          assignmentInstructions: assignment.instructions,
          targetWordCount: assignment.words || 150,
          reviewFocus: focusToUse,
        });
        setReviewResult(localReview);
        onToast?.(`✨ AI Preliminary Review ready for ${student.name}!`);
      } catch (err) {
        console.error('Failed to run AI review:', err);
        onToast?.('Unable to generate AI review. Please try again.');
      } finally {
        setIsAnalyzing(false);
      }
    },
    [effectiveText, focusMode, onToast, student.name, assignment]
  );

  // Auto-clear or re-evaluate when student changes
  useEffect(() => {
    setReviewResult(null);
    setCustomTextToReview('');
    setAppliedScorecard(false);
    setInsertedPromptId(null);
  }, [student.id, assignment.id]);

  const handleCopyPrompt = (prompt: EssayAdvisingPrompt) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(prompt.studentPrompt);
      setCopiedPromptId(prompt.id);
      onToast?.(`Copied prompt for ${student.name} to clipboard!`);
      setTimeout(() => setCopiedPromptId(null), 2500);
    }
  };

  const handleInsertPromptToFeedback = (prompt: EssayAdvisingPrompt) => {
    const promptAddition = `\n\n💭 Question for your next draft:\n${prompt.studentPrompt}`;
    const newFeedback = feedback.trim() ? `${feedback.trim()}${promptAddition}` : promptAddition.trim();
    onFeedbackChange(newFeedback);
    setInsertedPromptId(prompt.id);
    onToast?.(`Inserted prompt into ${student.name}’s feedback box!`);
    setTimeout(() => setInsertedPromptId(null), 2500);
  };

  const handleApplyScorecard = () => {
    if (reviewResult && onApplyScorecard) {
      onApplyScorecard(reviewResult.suggestedScorecard);
      setAppliedScorecard(true);
      onToast?.(`Applied AI suggested rubric (${reviewResult.suggestedScorecard.total}/25) to ${student.name}’s scorecard!`);
    }
  };

  const handleInsertSuggestedFeedback = () => {
    if (reviewResult) {
      const current = feedback.trim();
      const next = current
        ? `${current}\n\n---\n${reviewResult.suggestedTeacherFeedback}`
        : reviewResult.suggestedTeacherFeedback;
      onFeedbackChange(next);
      onToast?.(`Inserted AI preliminary feedback into teacher box!`);
    }
  };

  return (
    <>
      {/* Sidebar Widget Card in Teacher Review Column */}
      <div
        className="ai-review-card"
        style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f7fbf8 100%)',
          border: '1.5px solid #c9decb',
          borderRadius: '13px',
          padding: '18px',
          marginBottom: '18px',
          boxShadow: '0 4px 16px rgba(40, 102, 84, 0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle decorative pro badge watermark */}
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            background: 'linear-gradient(135deg, #7627bb 0%, #286654 100%)',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 800,
            letterSpacing: '1px',
            padding: '12px 20px 4px',
            borderRadius: '0 0 0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(118, 39, 187, 0.25)',
          }}
        >
          <Sparkles size={11} /> PRO PREVIEW
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: '#e9f4ea',
              color: '#286654',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Zap size={16} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', color: '#1f483b', fontWeight: 700 }}>
              AI Preliminary Review
            </h4>
            <span style={{ fontSize: '10px', color: '#688273' }}>
              Advising prompts & rubric check for {student.name}
            </span>
          </div>
        </div>

        <p style={{ fontSize: '11px', color: '#566b60', lineHeight: 1.5, margin: '6px 0 12px' }}>
          {reviewResult
            ? `Preliminary review ready · Suggested score: ${reviewResult.suggestedScorecard.total}/25 (${reviewResult.readingLevel.split(' ')[0]})`
            : `Run an optional AI check to generate Socratic prompts, diagnose structure, and assist your grading.`}
        </p>

        {/* Quick Actions in Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {!reviewResult ? (
            <>
              <button
                type="button"
                onClick={() => handleRunReview()}
                disabled={isAnalyzing}
                style={{
                  background: 'linear-gradient(135deg, #286654 0%, #1e5243 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isAnalyzing ? 'wait' : 'pointer',
                  boxShadow: '0 2px 8px rgba(40, 102, 84, 0.2)',
                  transition: 'transform 0.15s, opacity 0.15s',
                  width: '100%',
                }}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Analyzing {student.name}’s essay…
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Run AI Preliminary Review
                  </>
                )}
              </button>

              {!effectiveText && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomTextToReview(SAMPLE_STUDENT_ESSAY);
                    handleRunReview(SAMPLE_STUDENT_ESSAY);
                  }}
                  style={{
                    background: '#fcf8ee',
                    color: '#855e1b',
                    border: '1px dashed #e4cf98',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <BookOpen size={12} /> Test with sample student essay
                </button>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div
                style={{
                  background: '#f0f7f2',
                  border: '1px solid #d2e7d7',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '11px',
                  color: '#24513f',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong>Rubric Total:</strong>
                  <span style={{ fontWeight: 700, color: '#1b6348' }}>
                    {reviewResult.suggestedScorecard.total}/25
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#527263' }}>
                  <span>Target Prompts:</span>
                  <span>{reviewResult.teacherAdvisingPrompts.length} available</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsOpenModal(true)}
                  style={{
                    flex: 1,
                    background: '#286654',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                  }}
                >
                  <ExternalLink size={13} /> View Full Review & Prompts
                </button>

                <button
                  type="button"
                  onClick={() => handleRunReview()}
                  disabled={isAnalyzing}
                  title="Re-run review"
                  style={{
                    background: '#fff',
                    border: '1px solid #ccd8cf',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: '#3e584c',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={13} className={isAnalyzing ? 'animate-spin' : ''} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <button
                  type="button"
                  onClick={handleApplyScorecard}
                  disabled={appliedScorecard}
                  style={{
                    flex: 1,
                    background: appliedScorecard ? '#e6f4ea' : '#fff',
                    color: appliedScorecard ? '#137333' : '#286654',
                    border: `1px solid ${appliedScorecard ? '#34a853' : '#b2cbbe'}`,
                    borderRadius: '6px',
                    padding: '6px 8px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: appliedScorecard ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  {appliedScorecard ? <Check size={11} /> : <Award size={11} />}
                  {appliedScorecard ? 'Rubric applied' : 'Apply rubric (/25)'}
                </button>

                <button
                  type="button"
                  onClick={handleInsertSuggestedFeedback}
                  style={{
                    flex: 1,
                    background: '#fff',
                    color: '#7627bb',
                    border: '1px solid #d4bee8',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <MessageSquare size={11} /> Insert feedback
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comprehensive AI Preliminary Review Studio Modal */}
      {isOpenModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="AI Preliminary Review & Teacher Advising Studio"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(18, 35, 28, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#fefdfb',
              width: '880px',
              maxWidth: '96vw',
              maxHeight: '90vh',
              borderRadius: '18px',
              border: '1px solid #d7e2da',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #1d4d3f 0%, #286654 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '1px',
                    }}
                  >
                    ✦ LITTLE STEPS PRO PREVIEW
                  </span>
                  <span style={{ fontSize: '11px', color: '#cbe4d7' }}>
                    Optional Preliminary Review
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#fff', fontWeight: 800 }}>
                  AI Essay Review & Teacher Advising Studio
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#e0f0e8' }}>
                  Reviewing <strong>{student.name}’s</strong> essay for “{assignment.title}”
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleRunReview()}
                  disabled={isAnalyzing}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={13} className={isAnalyzing ? 'animate-spin' : ''} />
                  Re-analyze
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    color: '#fff',
                    fontSize: '16px',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Focus Mode Selector Bar */}
            <div
              style={{
                padding: '12px 24px',
                background: '#f4f8f5',
                borderBottom: '1px solid #e1ebe4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#335043' }}>
                  Review Focus:
                </span>
                <div style={{ display: 'flex', gap: '4px', background: '#e3eee7', padding: '3px', borderRadius: '8px' }}>
                  {(
                    [
                      { id: 'balanced', label: '🌟 Balanced Coach' },
                      { id: 'competition', label: '🏆 Competition Prep' },
                      { id: 'structure', label: '🧱 Structure & Flow' },
                      { id: 'foundations', label: '✍️ Foundations' },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setFocusMode(mode.id);
                        handleRunReview(undefined, mode.id);
                      }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: focusMode === mode.id ? 700 : 500,
                        background: focusMode === mode.id ? '#286654' : 'transparent',
                        color: focusMode === mode.id ? '#ffffff' : '#3d5c4e',
                        cursor: 'pointer',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {(
                  [
                    { id: 'prompts', label: '💡 Teacher Prompts' },
                    { id: 'rubric', label: '📊 Rubric & Score' },
                    { id: 'feedback', label: '💬 Draft Feedback' },
                    { id: 'diagnostics', label: '🔍 Text Stats' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: activeTab === tab.id ? '#286654' : '#ccdcd2',
                      background: activeTab === tab.id ? '#eaf4ee' : '#ffffff',
                      color: activeTab === tab.id ? '#1e5243' : '#576f62',
                      fontSize: '12px',
                      fontWeight: activeTab === tab.id ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                background: '#fafbf9',
              }}
            >
              {isAnalyzing && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '60px 20px',
                    gap: '12px',
                    color: '#286654',
                  }}
                >
                  <RefreshCw size={28} className="animate-spin" />
                  <h4 style={{ margin: 0, fontSize: '16px' }}>
                    Analyzing {student.name}’s essay across 5 writing dimensions…
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#688273' }}>
                    Detecting connectors, sentence rhythm, Socratic improvement targets, and rubric alignment.
                  </p>
                </div>
              )}

              {!isAnalyzing && !reviewResult && (
                <div
                  style={{
                    background: '#fff',
                    border: '1px dashed #c0d4c6',
                    borderRadius: '12px',
                    padding: '40px 20px',
                    textAlign: 'center',
                  }}
                >
                  <Zap size={32} style={{ color: '#286654', margin: '0 auto 12px' }} />
                  <h3 style={{ margin: '0 0 6px', color: '#1f483b' }}>
                    Ready for Preliminary Essay Check
                  </h3>
                  <p style={{ margin: '0 auto 18px', maxWidth: '420px', fontSize: '13px', color: '#687e71' }}>
                    Run the AI writing coach to get actionable prompts you can ask {student.name} to deepen their thinking and polish their essay.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRunReview()}
                    style={{
                      background: '#286654',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Sparkles size={16} /> Run Preliminary Review
                  </button>
                </div>
              )}

              {!isAnalyzing && reviewResult && (
                <div>
                  {/* Headline Banner */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #eef7f1 0%, #f9fdfa 100%)',
                      border: '1px solid #cce3d3',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#286654',
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                        }}
                      >
                        ✦ PRELIMINARY DIAGNOSTIC SUMMARY
                      </span>
                      <h4 style={{ margin: '4px 0 2px', fontSize: '15px', color: '#1c4a3b' }}>
                        {reviewResult.headline}
                      </h4>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#5b7668', marginTop: '4px' }}>
                        <span>
                          <strong>Word Count:</strong> {reviewResult.wordCount} words
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Paragraphs:</strong> {reviewResult.paragraphCount}
                        </span>
                        <span>•</span>
                        <span>
                          <strong>CEFR Level:</strong> {reviewResult.readingLevel}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleApplyScorecard}
                        disabled={appliedScorecard}
                        style={{
                          background: appliedScorecard ? '#e6f4ea' : '#286654',
                          color: appliedScorecard ? '#137333' : '#ffffff',
                          border: `1px solid ${appliedScorecard ? '#34a853' : '#286654'}`,
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: appliedScorecard ? 'default' : 'pointer',
                        }}
                      >
                        {appliedScorecard ? <Check size={13} /> : <Award size={13} />}
                        {appliedScorecard ? 'Rubric Applied' : `Apply Rubric (${reviewResult.suggestedScorecard.total}/25)`}
                      </button>

                      <button
                        type="button"
                        onClick={handleInsertSuggestedFeedback}
                        style={{
                          background: '#fff',
                          color: '#7627bb',
                          border: '1px solid #d4bee8',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <MessageSquare size={13} /> Insert Feedback Draft
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: TEACHER ADVISING PROMPTS */}
                  {activeTab === 'prompts' && (
                    <div>
                      <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ margin: '0 0 4px', fontSize: '16px', color: '#1f483b' }}>
                          Socratic Prompts to Coach {student.name}
                        </h4>
                        <p style={{ margin: 0, fontSize: '12px', color: '#688273' }}>
                          Use these targeted questions in class, written feedback, or writing conferences to guide {student.name} to self-correct and expand.
                        </p>
                      </div>

                      <div style={{ display: 'grid', gap: '14px' }}>
                        {reviewResult.teacherAdvisingPrompts.map((p) => {
                          const isCopied = copiedPromptId === p.id;
                          const isInserted = insertedPromptId === p.id;

                          return (
                            <div
                              key={p.id}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #d7e4dc',
                                borderRadius: '12px',
                                padding: '16px 18px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '16px' }}>{p.icon}</span>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      color: '#286654',
                                      background: '#edf6f0',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                    }}
                                  >
                                    {p.category}
                                  </span>
                                  {p.recommendedTag && (
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        color: '#b06000',
                                        background: '#fef7e0',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                      }}
                                    >
                                      {p.recommendedTag}
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPrompt(p)}
                                    style={{
                                      background: isCopied ? '#e6f4ea' : '#f5f8f6',
                                      border: '1px solid #ccdcd2',
                                      borderRadius: '6px',
                                      padding: '5px 9px',
                                      fontSize: '11px',
                                      color: isCopied ? '#137333' : '#335043',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                                    {isCopied ? 'Copied' : 'Copy'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleInsertPromptToFeedback(p)}
                                    style={{
                                      background: isInserted ? '#f3e8fd' : '#286654',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '5px 10px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: isInserted ? '#7627bb' : '#ffffff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {isInserted ? <Check size={12} /> : <Send size={12} />}
                                    {isInserted ? 'Added to Feedback' : 'Add to Feedback'}
                                  </button>
                                </div>
                              </div>

                              <div
                                style={{
                                  background: '#faf7ef',
                                  borderLeft: '3px solid #dfb66a',
                                  padding: '10px 14px',
                                  borderRadius: '0 8px 8px 0',
                                  margin: '8px 0',
                                  fontStyle: 'italic',
                                  fontSize: '13px',
                                  color: '#3d3423',
                                  lineHeight: 1.6,
                                }}
                              >
                                {p.studentPrompt}
                              </div>

                              <div style={{ marginTop: '8px', fontSize: '11px', color: '#688273', lineHeight: 1.5 }}>
                                <strong style={{ color: '#2b4d3f' }}>Teacher Rationale:</strong> {p.pedagogicalRationale}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: SUGGESTED RUBRIC */}
                  {activeTab === 'rubric' && (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '16px',
                        }}
                      >
                        <div>
                          <h4 style={{ margin: '0 0 4px', fontSize: '16px', color: '#1f483b' }}>
                            Preliminary Rubric Assessment: {reviewResult.suggestedScorecard.total}/25
                          </h4>
                          <p style={{ margin: 0, fontSize: '12px', color: '#688273' }}>
                            Aligned with the Little Steps Cambridge preparation competition rubric.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleApplyScorecard}
                          disabled={appliedScorecard}
                          style={{
                            background: appliedScorecard ? '#e6f4ea' : '#286654',
                            color: appliedScorecard ? '#137333' : '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: appliedScorecard ? 'default' : 'pointer',
                          }}
                        >
                          {appliedScorecard ? <Check size={14} /> : <Award size={14} />}
                          {appliedScorecard ? 'Applied to Scorecard' : 'Apply All Scores to Scorecard'}
                        </button>
                      </div>

                      <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                        {[
                          {
                            key: 'ideas' as const,
                            label: 'Ideas & Originality',
                            score: reviewResult.suggestedScorecard.ideas,
                            rationale: reviewResult.scorecardRationale.ideas,
                          },
                          {
                            key: 'structure' as const,
                            label: 'Structure & Organisation',
                            score: reviewResult.suggestedScorecard.structure,
                            rationale: reviewResult.scorecardRationale.structure,
                          },
                          {
                            key: 'development' as const,
                            label: 'Development & Examples',
                            score: reviewResult.suggestedScorecard.development,
                            rationale: reviewResult.scorecardRationale.development,
                          },
                          {
                            key: 'vocabulary' as const,
                            label: 'Vocabulary & Style',
                            score: reviewResult.suggestedScorecard.vocabulary,
                            rationale: reviewResult.scorecardRationale.vocabulary,
                          },
                          {
                            key: 'grammar' as const,
                            label: 'Grammar & Accuracy',
                            score: reviewResult.suggestedScorecard.grammar,
                            rationale: reviewResult.scorecardRationale.grammar,
                          },
                        ].map((c) => (
                          <div
                            key={c.key}
                            style={{
                              background: '#fff',
                              border: '1px solid #dce8df',
                              borderRadius: '10px',
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '16px',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <strong style={{ fontSize: '13px', color: '#1c4a3b' }}>{c.label}</strong>
                              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#688273' }}>
                                {c.rationale}
                              </p>
                            </div>
                            <div
                              style={{
                                background: '#edf6f0',
                                color: '#1e5243',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '14px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {c.score} / 5
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          background: '#f8f6ee',
                          border: '1px solid #e7dcb9',
                          borderRadius: '10px',
                          padding: '14px',
                          fontSize: '12px',
                          color: '#5e4e2a',
                        }}
                      >
                        <strong>Suggested Targets for Next Draft:</strong>
                        <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                          {reviewResult.suggestedScorecard.targetSkills.map((t, idx) => (
                            <li key={idx} style={{ margin: '3px 0' }}>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: DRAFT FEEDBACK */}
                  {activeTab === 'feedback' && (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '16px',
                        }}
                      >
                        <div>
                          <h4 style={{ margin: '0 0 4px', fontSize: '16px', color: '#1f483b' }}>
                            Recommended Teacher Feedback Draft
                          </h4>
                          <p style={{ margin: 0, fontSize: '12px', color: '#688273' }}>
                            Growth-mindset, encouraging feedback ready to personalize and return to {student.name}.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleInsertSuggestedFeedback}
                          style={{
                            background: '#286654',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <Send size={13} /> Insert into Teacher Feedback Box
                        </button>
                      </div>

                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #d2e4d7',
                          borderRadius: '12px',
                          padding: '18px',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'inherit',
                          fontSize: '13px',
                          lineHeight: 1.8,
                          color: '#284638',
                        }}
                      >
                        {reviewResult.suggestedTeacherFeedback}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: TEXT STATS & DIAGNOSTICS */}
                  {activeTab === 'diagnostics' && (
                    <div>
                      <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ margin: '0 0 4px', fontSize: '16px', color: '#1f483b' }}>
                          Linguistic & Structural Diagnostics
                        </h4>
                        <p style={{ margin: 0, fontSize: '12px', color: '#688273' }}>
                          Objective metrics detected in {student.name}’s writing.
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '12px',
                          marginBottom: '20px',
                        }}
                      >
                        <div style={{ background: '#fff', border: '1px solid #e0eae3', borderRadius: '10px', padding: '14px' }}>
                          <small style={{ color: '#7a8e83' }}>Word Count</small>
                          <h3 style={{ margin: '4px 0 0', color: '#1f483b', fontSize: '20px' }}>
                            {reviewResult.wordCount}
                          </h3>
                          <span style={{ fontSize: '11px', color: '#567566' }}>Target: {reviewResult.targetWordCount} words</span>
                        </div>

                        <div style={{ background: '#fff', border: '1px solid #e0eae3', borderRadius: '10px', padding: '14px' }}>
                          <small style={{ color: '#7a8e83' }}>Paragraphs</small>
                          <h3 style={{ margin: '4px 0 0', color: '#1f483b', fontSize: '20px' }}>
                            {reviewResult.paragraphCount}
                          </h3>
                          <span style={{ fontSize: '11px', color: '#567566' }}>Sections detected</span>
                        </div>

                        <div style={{ background: '#fff', border: '1px solid #e0eae3', borderRadius: '10px', padding: '14px' }}>
                          <small style={{ color: '#7a8e83' }}>Avg Sentence Length</small>
                          <h3 style={{ margin: '4px 0 0', color: '#1f483b', fontSize: '20px' }}>
                            {reviewResult.averageSentenceLength}
                          </h3>
                          <span style={{ fontSize: '11px', color: '#567566' }}>Words / sentence</span>
                        </div>

                        <div style={{ background: '#fff', border: '1px solid #e0eae3', borderRadius: '10px', padding: '14px' }}>
                          <small style={{ color: '#7a8e83' }}>Reading Level</small>
                          <h3 style={{ margin: '4px 0 0', color: '#1f483b', fontSize: '16px' }}>
                            {reviewResult.readingLevel.split(' ')[0]}
                          </h3>
                          <span style={{ fontSize: '11px', color: '#567566' }}>{reviewResult.readingLevel.split('(')[1]?.replace(')', '') || 'Standard'}</span>
                        </div>
                      </div>

                      {/* Strengths & Growth Columns */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ background: '#eaf4ee', border: '1px solid #c9decb', borderRadius: '10px', padding: '16px' }}>
                          <strong style={{ color: '#137333', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Check size={14} /> Observed Strengths
                          </strong>
                          <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '12px', color: '#274b37' }}>
                            {reviewResult.strengths.map((s, idx) => (
                              <li key={idx} style={{ margin: '4px 0' }}>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div style={{ background: '#fef7e8', border: '1px solid #edd4a8', borderRadius: '10px', padding: '16px' }}>
                          <strong style={{ color: '#b06000', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Lightbulb size={14} /> Growth Opportunities
                          </strong>
                          <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '12px', color: '#5a461e' }}>
                            {reviewResult.growthOpportunities.map((g, idx) => (
                              <li key={idx} style={{ margin: '4px 0' }}>
                                {g}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pro Version Footer */}
            <div
              style={{
                padding: '14px 24px',
                background: '#f2f6f3',
                borderTop: '1px solid #dce6e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={14} style={{ color: '#7627bb' }} />
                <span style={{ fontSize: '11px', color: '#4a6356' }}>
                  <strong>Little Steps PRO Feature:</strong> Automated essay analysis & Socratic teacher prompts. Free preview active.
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                style={{
                  background: '#286654',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '7px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close Studio
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
