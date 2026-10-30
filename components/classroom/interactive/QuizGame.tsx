'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, Sparkles, RotateCcw, ArrowRight } from 'lucide-react';
import type { QuizActivity } from '../../../lib/types';

interface QuizGameProps {
  activity: QuizActivity;
  studentName?: string;
  onComplete?: (score: number, total: number) => void;
}

export function QuizGame({ activity, studentName, onComplete }: QuizGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const question = activity.questions[currentIndex];
  const total = activity.questions.length;

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelectedOption(idx);
    setAnswered(true);

    const isCorrect = idx === question.correctIndex;
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) {
      setScore(newScore);
    }

    if (currentIndex === total - 1 && onComplete) {
      onComplete(newScore, total);
    }
  };

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setAnswered(false);
    } else {
      setCompleted(true);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore(0);
    setCompleted(false);
  };

  if (completed) {
    const percent = Math.round((score / total) * 100);
    const perfect = score === total;

    return (
      <div
        style={{
          background: '#f8faf5',
          border: '1px solid #dbe6d5',
          borderRadius: '12px',
          padding: '28px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '42px', display: 'block', marginBottom: '8px' }}>
          {perfect ? '🏆' : '🌟'}
        </span>
        <h3 style={{ fontSize: '20px', color: '#273f3b', marginBottom: '6px' }}>
          {perfect ? 'Outstanding job!' : 'Great effort!'}
        </h3>
        <p style={{ color: '#5f7062', fontSize: '13px', marginBottom: '18px' }}>
          {studentName ? `${studentName}, you` : 'You'} scored <strong>{score}</strong> out of{' '}
          <strong>{total}</strong> ({percent}%)!
        </p>

        <button
          className="primary"
          onClick={handleReset}
          style={{ display: 'inline-flex', gap: '8px', margin: 'auto' }}
        >
          <RotateCcw size={16} /> Play Again
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e1e7dc',
        borderRadius: '12px',
        padding: '20px 24px',
        marginTop: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          fontSize: '11px',
          color: '#7b8c78',
          fontWeight: 600,
        }}
      >
        <span>
          <Sparkles size={13} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
          Question {currentIndex + 1} of {total}
        </span>
        <span>
          Score: {score}/{total}
        </span>
      </div>

      <h4
        style={{
          fontSize: '15px',
          color: '#284637',
          lineHeight: 1.5,
          marginBottom: '16px',
        }}
      >
        {question.question}
      </h4>

      <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
        {question.options.map((opt, idx) => {
          const isChosen = selectedOption === idx;
          const isCorrect = idx === question.correctIndex;

          let bg = '#fafbf9';
          let border = '1px solid #e1e7dc';
          let color = '#354a3e';

          if (answered) {
            if (isCorrect) {
              bg = '#e9f5e8';
              border = '1px solid #6cb169';
              color = '#1f6120';
            } else if (isChosen) {
              bg = '#fbeeed';
              border = '1px solid #e5908e';
              color = '#912826';
            }
          } else if (isChosen) {
            bg = '#e9f2ec';
            border = '1px solid #286654';
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={answered}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '8px',
                background: bg,
                border,
                color,
                fontSize: '13px',
                fontWeight: isChosen || (answered && isCorrect) ? 600 : 400,
                textAlign: 'left',
                cursor: answered ? 'default' : 'pointer',
                transition: 'all .15s',
              }}
            >
              <span>{opt}</span>
              {answered && isCorrect && <CheckCircle2 size={16} color="#2e7d32" />}
              {answered && isChosen && !isCorrect && <XCircle size={16} color="#c62828" />}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          style={{
            background:
              selectedOption === question.correctIndex ? '#eaf4e7' : '#fff4e5',
            padding: '12px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#3d4d3e',
            lineHeight: 1.6,
            marginBottom: '14px',
          }}
        >
          <strong>
            {selectedOption === question.correctIndex
              ? '✨ Spot on!'
              : '💡 Good try! Here’s why:'}
          </strong>{' '}
          {question.explanation}
        </div>
      )}

      {answered && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="primary"
            onClick={handleNext}
            style={{ display: 'inline-flex', gap: '8px' }}
          >
            {currentIndex < total - 1 ? 'Next Question' : 'Finish Quiz'}{' '}
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
