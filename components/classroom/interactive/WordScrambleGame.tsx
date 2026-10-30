'use client';

import React, { useState } from 'react';
import { Sparkles, HelpCircle, Check, ArrowRight, RotateCcw } from 'lucide-react';
import type { WordScrambleActivity } from '../../../lib/types';

interface WordScrambleGameProps {
  activity: WordScrambleActivity;
  studentName?: string;
  onComplete?: (score: number, total: number) => void;
}

export function WordScrambleGame({ activity, studentName, onComplete }: WordScrambleGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [status, setStatus] = useState<'unanswered' | 'correct' | 'wrong'>('unanswered');
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const currentItem = activity.words[currentIndex];
  const total = activity.words.length;

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim()) return;

    const isMatch = guess.trim().toLowerCase() === currentItem.word.toLowerCase();
    if (isMatch) {
      setStatus('correct');
      const newScore = score + 1;
      setScore(newScore);

      if (currentIndex === total - 1 && onComplete) {
        onComplete(newScore, total);
      }
    } else {
      setStatus('wrong');
    }
  };

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
      setGuess('');
      setShowHint(false);
      setStatus('unanswered');
    } else {
      setCompleted(true);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setGuess('');
    setShowHint(false);
    setStatus('unanswered');
    setScore(0);
    setCompleted(false);
  };

  if (completed) {
    const perfect = score === total;

    return (
      <div
        style={{
          background: '#fbf8f3',
          border: '1px solid #ebdcc5',
          borderRadius: '12px',
          padding: '28px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '42px', display: 'block', marginBottom: '8px' }}>
          {perfect ? '🎯' : '✨'}
        </span>
        <h3 style={{ fontSize: '20px', color: '#273f3b', marginBottom: '6px' }}>
          {perfect ? 'Word Master!' : 'Great word hunt!'}
        </h3>
        <p style={{ color: '#687762', fontSize: '13px', marginBottom: '18px' }}>
          {studentName ? `${studentName}, you` : 'You'} solved <strong>{score}</strong> of{' '}
          <strong>{total}</strong> scrambled vocabulary words!
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
        border: '1px solid #e2e8dc',
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
          <Sparkles size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> Word{' '}
          {currentIndex + 1} of {total}
        </span>
        <span>
          Solved: {score}/{total}
        </span>
      </div>

      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <p style={{ fontSize: '12px', color: '#7a8c79', marginBottom: '8px' }}>
          Unscramble the letters:
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {currentItem.scrambled
            .toUpperCase()
            .split('')
            .map((char, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-grid',
                  placeItems: 'center',
                  width: '38px',
                  height: '42px',
                  background: '#f2f6ee',
                  border: '1px solid #cfdcc6',
                  borderRadius: '6px',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#286654',
                }}
              >
                {char}
              </span>
            ))}
        </div>
      </div>

      <form onSubmit={handleCheck} style={{ maxWidth: '340px', margin: '0 auto 16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={guess}
            onChange={(e) => {
              setGuess(e.target.value);
              if (status === 'wrong') setStatus('unanswered');
            }}
            placeholder="Type your word here…"
            disabled={status === 'correct'}
            style={{
              flex: 1,
              padding: '10px 14px',
              border:
                status === 'correct'
                  ? '2px solid #57a353'
                  : status === 'wrong'
                  ? '2px solid #e06c69'
                  : '1px solid #d2ded0',
              borderRadius: '8px',
              fontSize: '14px',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 600,
            }}
          />
          {status !== 'correct' && (
            <button className="primary" type="submit" disabled={!guess.trim()}>
              Check
            </button>
          )}
        </div>
      </form>

      {status === 'wrong' && (
        <p style={{ textAlign: 'center', color: '#b93835', fontSize: '12px', marginBottom: '12px' }}>
          Not quite yet! Check the letters and try again.
        </p>
      )}

      {status === 'correct' && (
        <div
          style={{
            background: '#eaf4e7',
            padding: '12px',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#235e26',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '14px',
          }}
        >
          <Check size={16} style={{ display: 'inline', verticalAlign: '-3px' }} /> Brilliant! You got it: {currentItem.word}
        </div>
      )}

      {currentItem.hint && (
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          {showHint ? (
            <span
              style={{
                fontSize: '12px',
                color: '#556950',
                background: '#f7f6ec',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e2cd',
              }}
            >
              💡 Hint: {currentItem.hint}
            </span>
          ) : (
            <button
              type="button"
              className="text-button"
              onClick={() => setShowHint(true)}
              style={{ fontSize: '11px', display: 'inline-flex', gap: '4px' }}
            >
              <HelpCircle size={13} /> Need a clue? Show hint
            </button>
          )}
        </div>
      )}

      {status === 'correct' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            className="primary"
            onClick={handleNext}
            style={{ display: 'inline-flex', gap: '8px' }}
          >
            {currentIndex < total - 1 ? 'Next Word' : 'See Results'}{' '}
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
