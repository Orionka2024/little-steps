'use client';

import React, { useState } from 'react';
import { Award, Copy, Check, Target, Sparkles, BookOpen } from 'lucide-react';
import type { WritingScorecard, Role, Student } from '../../lib/types';

export const RUBRIC_CRITERIA = [
  {
    key: 'ideas' as const,
    label: 'Ideas and originality',
    desc: 'Interesting, thoughtful ideas and an individual perspective',
  },
  {
    key: 'structure' as const,
    label: 'Structure and organisation',
    desc: 'Clear opening, connected paragraphs and effective ending',
  },
  {
    key: 'development' as const,
    label: 'Development and examples',
    desc: 'Specific, convincing details that explain the main ideas',
  },
  {
    key: 'vocabulary' as const,
    label: 'Vocabulary and style',
    desc: 'Precise words, varied sentences and engaging voice',
  },
  {
    key: 'grammar' as const,
    label: 'Grammar and accuracy',
    desc: 'Clear sentences, appropriate punctuation and spelling',
  },
];

export function getInterpretation(total: number): string {
  if (total >= 21) {
    return 'Competition ready: polish voice, stylistic flair, and rhetorical nuance.';
  }
  if (total >= 16) {
    return 'Proficient: strong structure and clarity; develop richer details.';
  }
  if (total >= 11) {
    return 'Developing: identify two skills for targeted improvement.';
  }
  return 'Foundational: focus on complete sentences and core paragraph architecture.';
}

export function formatScorecardReport(
  studentName: string,
  card: WritingScorecard,
  week?: string
): string {
  const targetLines =
    card.targetSkills.length > 0
      ? card.targetSkills.map((t, idx) => `  ${idx + 1}. ${t}`).join('\n')
      : '  (None selected)';

  return `Teacher’s essay assessment rubric
Writing scorecard
Teacher-created competition preparation rubric
Student: ${studentName}${week ? ` | ${week}` : ''}
${card.total}/25
Overall score

Ideas and originality
${card.ideas}/5
Interesting, thoughtful ideas and an individual perspective

Structure and organisation
${card.structure}/5
Clear opening, connected paragraphs and effective ending

Development and examples
${card.development}/5
Specific, convincing details that explain the main ideas

Vocabulary and style
${card.vocabulary}/5
Precise words, varied sentences and engaging voice

Grammar and accuracy
${card.grammar}/5
Clear sentences, appropriate punctuation and spelling

Suggested interpretation:
${card.interpretation || getInterpretation(card.total)}
Not an official Cambridge score or a prediction of competition results.

Two major improvement targets for next draft:
${targetLines}
`;
}

interface ScorecardWidgetProps {
  role: Role;
  student: Student;
  scorecard?: WritingScorecard;
  onSaveScorecard?: (card: WritingScorecard) => void;
  onInsertToFeedback?: (text: string) => void;
  disabled?: boolean;
}

export function ScorecardWidget({
  role,
  student,
  scorecard,
  onSaveScorecard,
  onInsertToFeedback,
  disabled = false,
}: ScorecardWidgetProps) {
  const [ideas, setIdeas] = useState<number>(scorecard?.ideas ?? 3);
  const [structure, setStructure] = useState<number>(scorecard?.structure ?? 3);
  const [development, setDevelopment] = useState<number>(scorecard?.development ?? 3);
  const [vocabulary, setVocabulary] = useState<number>(scorecard?.vocabulary ?? 3);
  const [grammar, setGrammar] = useState<number>(scorecard?.grammar ?? 3);
  const [targets, setTargets] = useState<string[]>(
    scorecard?.targetSkills ?? ['Structure and organisation', 'Development and examples']
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [inserted, setInserted] = useState<boolean>(false);

  const total = ideas + structure + development + vocabulary + grammar;
  const interpretation = getInterpretation(total);

  const currentCard: WritingScorecard = {
    ideas,
    structure,
    development,
    vocabulary,
    grammar,
    total,
    targetSkills: targets,
    interpretation,
    assessedAt: new Date().toISOString(),
  };

  const handleScoreChange = (key: keyof typeof currentCard, val: number) => {
    if (disabled || role !== 'Teacher') return;
    let nextIdeas = ideas;
    let nextStructure = structure;
    let nextDevelopment = development;
    let nextVocabulary = vocabulary;
    let nextGrammar = grammar;

    if (key === 'ideas') {
      nextIdeas = val;
      setIdeas(val);
    } else if (key === 'structure') {
      nextStructure = val;
      setStructure(val);
    } else if (key === 'development') {
      nextDevelopment = val;
      setDevelopment(val);
    } else if (key === 'vocabulary') {
      nextVocabulary = val;
      setVocabulary(val);
    } else if (key === 'grammar') {
      nextGrammar = val;
      setGrammar(val);
    }

    const nextTotal = nextIdeas + nextStructure + nextDevelopment + nextVocabulary + nextGrammar;
    const nextCard: WritingScorecard = {
      ideas: nextIdeas,
      structure: nextStructure,
      development: nextDevelopment,
      vocabulary: nextVocabulary,
      grammar: nextGrammar,
      total: nextTotal,
      targetSkills: targets,
      interpretation: getInterpretation(nextTotal),
      assessedAt: new Date().toISOString(),
    };
    onSaveScorecard?.(nextCard);
  };

  const toggleTarget = (label: string) => {
    if (disabled || role !== 'Teacher') return;
    let nextTargets: string[];
    if (targets.includes(label)) {
      nextTargets = targets.filter((t) => t !== label);
    } else {
      if (targets.length >= 2) {
        nextTargets = [targets[1], label];
      } else {
        nextTargets = [...targets, label];
      }
    }
    setTargets(nextTargets);

    const nextCard: WritingScorecard = {
      ...currentCard,
      targetSkills: nextTargets,
    };
    onSaveScorecard?.(nextCard);
  };

  const handleCopy = () => {
    const report = formatScorecardReport(student.name, currentCard);
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleInsert = () => {
    const report = formatScorecardReport(student.name, currentCard);
    onInsertToFeedback?.(report);
    setInserted(true);
    setTimeout(() => setInserted(false), 2500);
  };

  const getScoreColor = (score: number) => {
    if (score >= 21) return '#286654'; // Emerald
    if (score >= 16) return '#406e57'; // Forest
    if (score >= 11) return '#9e731b'; // Amber
    return '#a33d3b'; // Rose
  };

  // Student view when scorecard exists or default placeholder
  if (role === 'Student') {
    const cardToDisplay = scorecard ?? {
      ideas: 3,
      structure: 3,
      development: 3,
      vocabulary: 3,
      grammar: 3,
      total: 15,
      targetSkills: ['Structure and organisation', 'Development and examples'],
      interpretation: getInterpretation(15),
    };

    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e1e7dc',
          borderRadius: '13px',
          padding: '20px',
          marginTop: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="#286654" />
            <h3 style={{ fontSize: '15px', color: '#273f3b', margin: 0 }}>Writing Scorecard</h3>
          </div>
          <span
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              borderRadius: '6px',
              background: '#f2f6ee',
              color: '#385d47',
              fontWeight: 700,
            }}
          >
            {cardToDisplay.total}/25 Points
          </span>
        </div>

        <p style={{ fontSize: '11px', color: '#68776f', margin: '8px 0 14px' }}>
          Teacher assessment for competition preparation.
        </p>

        <div style={{ display: 'grid', gap: '10px' }}>
          {RUBRIC_CRITERIA.map((crit) => {
            const scoreVal = cardToDisplay[crit.key];
            return (
              <div
                key={crit.key}
                style={{
                  background: '#fafbf9',
                  border: '1px solid #eef2eb',
                  borderRadius: '8px',
                  padding: '9px 12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '12px', color: '#273f3b' }}>{crit.label}</strong>
                  <span
                    style={{
                      fontWeight: 700,
                      color: getScoreColor(scoreVal * 5),
                      fontSize: '12px',
                    }}
                  >
                    {scoreVal}/5
                  </span>
                </div>
                <small style={{ fontSize: '10px', color: '#7e8a82', display: 'block', marginTop: '2px' }}>
                  {crit.desc}
                </small>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: '14px',
            background: '#fffdf4',
            border: '1px solid #ebd9a2',
            borderRadius: '9px',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Target size={14} color="#8a6914" />
            <strong style={{ fontSize: '11px', color: '#7a5a07' }}>
              Your 2 Targets for this Revision:
            </strong>
          </div>
          {cardToDisplay.targetSkills.length > 0 ? (
            <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '11px', color: '#564415' }}>
              {cardToDisplay.targetSkills.map((t, idx) => (
                <li key={idx} style={{ marginBottom: '2px' }}>
                  <strong>{t}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <span style={{ fontSize: '11px', color: '#666' }}>Focus on general clarity and flow.</span>
          )}
        </div>

        <small
          style={{
            display: 'block',
            fontSize: '9px',
            color: '#9ba49b',
            marginTop: '10px',
            textAlign: 'center',
          }}
        >
          Not an official Cambridge score or competition prediction.
        </small>
      </div>
    );
  }

  // Teacher interactive scoring mode
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #dfe6db',
        borderRadius: '13px',
        padding: '18px',
        marginTop: '18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={18} color="#286654" />
          <h3 style={{ fontSize: '15px', color: '#273f3b', margin: 0 }}>Writing Scorecard</h3>
        </div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '6px',
            background: total >= 16 ? '#eaf4eb' : '#fff3dc',
            color: getScoreColor(total),
          }}
        >
          {total} / 25
        </span>
      </div>

      <p style={{ fontSize: '11px', color: '#707c75', margin: '0 0 14px' }}>
        Assess in Weeks 1, 4, 8, 12, 16. Keep first & revised drafts to track progress.
      </p>

      {/* 5 Criteria Sliders / Point Selectors */}
      <div style={{ display: 'grid', gap: '12px' }}>
        {RUBRIC_CRITERIA.map((crit) => {
          const scoreVal =
            crit.key === 'ideas'
              ? ideas
              : crit.key === 'structure'
              ? structure
              : crit.key === 'development'
              ? development
              : crit.key === 'vocabulary'
              ? vocabulary
              : grammar;

          return (
            <div
              key={crit.key}
              style={{
                background: '#fafbf8',
                border: '1px solid #e8ede4',
                borderRadius: '8px',
                padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#273f3b' }}>
                  {crit.label}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: getScoreColor(scoreVal * 5),
                  }}
                >
                  {scoreVal}/5
                </span>
              </div>
              <small
                style={{
                  fontSize: '10px',
                  color: '#7b877f',
                  display: 'block',
                  margin: '3px 0 8px',
                  lineHeight: 1.35,
                }}
              >
                {crit.desc}
              </small>

              {/* 1-5 Point Selector Buttons */}
              <div style={{ display: 'flex', gap: '5px' }}>
                {[1, 2, 3, 4, 5].map((num) => {
                  const isSelected = scoreVal === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleScoreChange(crit.key, num)}
                      style={{
                        flex: 1,
                        padding: '5px 0',
                        fontSize: '11px',
                        fontWeight: isSelected ? 700 : 500,
                        borderRadius: '5px',
                        border: isSelected ? '1px solid #286654' : '1px solid #dfe5dc',
                        background: isSelected ? '#286654' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#49594f',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggested Interpretation Banner */}
      <div
        style={{
          marginTop: '14px',
          background: total >= 16 ? '#f2f8f3' : '#fff9ea',
          border: total >= 16 ? '1px solid #cfebd4' : '1px solid #f3e3be',
          borderRadius: '8px',
          padding: '10px 12px',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            fontWeight: 800,
            letterSpacing: '0.5px',
            color: total >= 16 ? '#286654' : '#8c680f',
            display: 'block',
            marginBottom: '3px',
          }}
        >
          Suggested Interpretation
        </span>
        <p style={{ fontSize: '11px', color: '#455249', margin: 0, lineHeight: 1.45 }}>
          {interpretation}
        </p>
      </div>

      {/* Target Skills Picker (Max 2 rule) */}
      <div style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <strong style={{ fontSize: '11px', color: '#273f3b', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Target size={13} color="#286654" /> 2 Major Improvement Targets:
          </strong>
          <span style={{ fontSize: '10px', color: targets.length === 2 ? '#286654' : '#889487' }}>
            {targets.length}/2 selected
          </span>
        </div>
        <small style={{ fontSize: '10px', color: '#7a857e', display: 'block', marginBottom: '8px' }}>
          Give each student only two major targets at a time to prevent cognitive overload.
        </small>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {RUBRIC_CRITERIA.map((crit) => {
            const isTarget = targets.includes(crit.label);
            return (
              <button
                key={crit.key}
                type="button"
                disabled={disabled}
                onClick={() => toggleTarget(crit.label)}
                style={{
                  fontSize: '10px',
                  padding: '5px 9px',
                  borderRadius: '6px',
                  border: isTarget ? '1px solid #286654' : '1px solid #dfe5db',
                  background: isTarget ? '#e9f4ed' : '#ffffff',
                  color: isTarget ? '#215646' : '#57675c',
                  fontWeight: isTarget ? 700 : 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {isTarget && <Check size={11} />}
                {crit.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '8px 10px',
            borderRadius: '7px',
            border: '1px solid #dfe5dc',
            background: '#ffffff',
            color: '#34473b',
            cursor: 'pointer',
          }}
        >
          {copied ? <Check size={13} color="#286654" /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy Assessment'}
        </button>

        {onInsertToFeedback && (
          <button
            type="button"
            onClick={handleInsert}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 600,
              padding: '8px 10px',
              borderRadius: '7px',
              border: '1px solid #286654',
              background: '#286654',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            {inserted ? <Check size={13} color="#ffffff" /> : <Sparkles size={13} />}
            {inserted ? 'Inserted!' : 'Insert in Feedback'}
          </button>
        )}
      </div>

      <small
        style={{
          display: 'block',
          fontSize: '9px',
          color: '#99a499',
          marginTop: '12px',
          textAlign: 'center',
        }}
      >
        Not an official Cambridge score or competition prediction.
      </small>
    </div>
  );
}
