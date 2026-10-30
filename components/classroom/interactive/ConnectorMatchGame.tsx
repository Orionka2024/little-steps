'use client';

import React, { useState } from 'react';
import { Sparkles, CheckCircle, RotateCcw } from 'lucide-react';
import type { ConnectingWordsActivity } from '../../../lib/types';

interface ConnectorMatchGameProps {
  activity: ConnectingWordsActivity;
  studentName?: string;
  onComplete?: (score: number, total: number) => void;
}

export function ConnectorMatchGame({
  activity,
  studentName,
  onComplete,
}: ConnectorMatchGameProps) {
  const [selectedPairIndex, setSelectedPairIndex] = useState(0);
  const [matches, setMatches] = useState<Record<number, string>>({});
  const [completed, setCompleted] = useState(false);

  const categories = Array.from(
    new Set(activity.pairs.map((p) => p.category))
  );

  const currentPair = activity.pairs[selectedPairIndex];
  const total = activity.pairs.length;

  const handleChooseCategory = (cat: string) => {
    const isCorrect = cat === currentPair.category;
    const nextMatches = {
      ...matches,
      [selectedPairIndex]: cat,
    };
    setMatches(nextMatches);

    // If correct, move to next after brief pause or immediately
    if (isCorrect) {
      if (selectedPairIndex < total - 1) {
        setSelectedPairIndex((prev) => prev + 1);
      } else {
        setCompleted(true);
        if (onComplete) {
          onComplete(total, total);
        }
      }
    }
  };

  const handleReset = () => {
    setSelectedPairIndex(0);
    setMatches({});
    setCompleted(false);
  };

  if (completed) {
    return (
      <div
        style={{
          background: '#f2f8f3',
          border: '1px solid #c9dec9',
          borderRadius: '12px',
          padding: '28px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '42px', display: 'block', marginBottom: '8px' }}>
          🎉
        </span>
        <h3 style={{ fontSize: '20px', color: '#1b542e', marginBottom: '6px' }}>
          Connecting Words Champion!
        </h3>
        <p style={{ color: '#527259', fontSize: '13px', marginBottom: '18px' }}>
          {studentName ? `${studentName}, you` : 'You'} successfully categorized all{' '}
          <strong>{total}</strong> connecting phrases!
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

  const userChoice = matches[selectedPairIndex];
  const isCorrectChoice = userChoice === currentPair.category;
  const isWrongChoice = userChoice && !isCorrectChoice;

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
          Card {selectedPairIndex + 1} of {total}
        </span>
        <span>
          Matched: {Object.keys(matches).filter((k) => matches[Number(k)] === activity.pairs[Number(k)].category).length}/{total}
        </span>
      </div>

      <div
        style={{
          background: '#fafbf7',
          border: '2px dashed #d5e0cb',
          borderRadius: '10px',
          padding: '20px',
          textAlign: 'center',
          marginBottom: '20px',
        }}
      >
        <small style={{ fontSize: '11px', color: '#7a8d79', textTransform: 'uppercase' }}>
          How does this phrase help your essay?
        </small>
        <h3
          style={{
            fontSize: '22px',
            color: '#286654',
            margin: '8px 0 0',
            fontFamily: 'Manrope, sans-serif',
          }}
        >
          “{currentPair.phrase}”
        </h3>
      </div>

      <p style={{ fontSize: '12px', color: '#687765', marginBottom: '10px' }}>
        Select the matching purpose:
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {categories.map((cat) => {
          const isSelected = userChoice === cat;
          const isCorrect = isSelected && isCorrectChoice;
          const isWrong = isSelected && isWrongChoice;

          return (
            <button
              key={cat}
              onClick={() => handleChooseCategory(cat)}
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                border: isCorrect
                  ? '2px solid #52a050'
                  : isWrong
                  ? '2px solid #d9615e'
                  : '1px solid #dbe4d8',
                background: isCorrect ? '#eaf4e6' : isWrong ? '#fcedec' : '#fcfdfb',
                color: isCorrect ? '#216124' : isWrong ? '#a42826' : '#2b3f36',
                fontSize: '12px',
                fontWeight: 600,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <span>{cat}</span>
              {isCorrect && <CheckCircle size={15} color="#2e7d32" />}
            </button>
          );
        })}
      </div>

      {isWrongChoice && (
        <p
          style={{
            marginTop: '12px',
            fontSize: '11px',
            color: '#b73735',
            textAlign: 'center',
          }}
        >
          Think about how this word changes the flow of your ideas. Try another category!
        </p>
      )}
    </div>
  );
}
