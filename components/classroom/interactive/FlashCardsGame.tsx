'use client';

import React, { useState } from 'react';
import { RotateCw, Check, RotateCcw, Shuffle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { FlashCardsActivity } from '../../../lib/types';

interface FlashCardsGameProps {
  activity: FlashCardsActivity;
  studentName?: string;
  onComplete?: (score: number, total: number) => void;
}

export function FlashCardsGame({ activity, studentName, onComplete }: FlashCardsGameProps) {
  const [deck, setDeck] = useState(activity.cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIndices, setMasteredIndices] = useState<Set<number>>(new Set());
  const [completed, setCompleted] = useState(false);

  const total = deck.length;
  const currentCard = deck[currentIndex];

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCompleted(true);
      if (onComplete) {
        onComplete(masteredIndices.size, total);
      }
    }
  };

  const handlePrevious = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleMarkMastered = () => {
    const updated = new Set(masteredIndices);
    updated.add(currentIndex);
    setMasteredIndices(updated);

    if (currentIndex === total - 1) {
      if (onComplete) {
        onComplete(updated.size, total);
      }
      setCompleted(true);
    } else {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredIndices(new Set());
    setCompleted(false);
  };

  const handleReset = () => {
    setDeck(activity.cards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredIndices(new Set());
    setCompleted(false);
  };

  if (completed) {
    const score = masteredIndices.size;
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
          marginTop: '12px',
        }}
      >
        <span style={{ fontSize: '42px', display: 'block', marginBottom: '8px' }}>
          {perfect ? '🏆' : '🌟'}
        </span>
        <h3 style={{ fontSize: '20px', color: '#273f3b', marginBottom: '6px' }}>
          {perfect ? 'Flash Cards Mastered!' : 'Great Study Session!'}
        </h3>
        <p style={{ color: '#5f7062', fontSize: '13px', marginBottom: '18px' }}>
          {studentName ? `${studentName}, you` : 'You'} mastered <strong>{score}</strong> out of{' '}
          <strong>{total}</strong> cards ({percent}%)!
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            className="primary"
            onClick={handleReset}
            style={{ display: 'inline-flex', gap: '8px' }}
          >
            <RotateCcw size={16} /> Review Again
          </button>
          <button
            type="button"
            onClick={handleShuffle}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #cfded4',
              background: '#fff',
              color: '#286654',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            <Shuffle size={15} /> Shuffle & Test
          </button>
        </div>
      </div>
    );
  }

  const isMastered = masteredIndices.has(currentIndex);

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e1e7dc',
        borderRadius: '12px',
        padding: '22px',
        marginTop: '12px',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          fontSize: '12px',
          color: '#5f7267',
        }}
      >
        <span style={{ fontWeight: 700, color: '#273f3b' }}>
          Card {currentIndex + 1} of {total}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#286654', fontWeight: 600 }}>
            ★ {masteredIndices.size}/{total} Mastered
          </span>
          <button
            type="button"
            onClick={handleShuffle}
            title="Shuffle deck"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '5px',
              border: '1px solid #dfe6db',
              background: '#f9fbf8',
              fontSize: '11px',
              color: '#4e6255',
              cursor: 'pointer',
            }}
          >
            <Shuffle size={13} /> Shuffle
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '5px',
          background: '#eef2ea',
          borderRadius: '4px',
          marginBottom: '20px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${((currentIndex + 1) / total) * 100}%`,
            background: '#286654',
            borderRadius: '4px',
            transition: 'width 0.25s ease',
          }}
        />
      </div>

      {/* Main Flashcard Container */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleFlip}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleFlip();
          }
        }}
        style={{
          background: isFlipped ? '#f8fdf9' : '#fffdf9',
          border: isFlipped ? '2px solid #589679' : '2px solid #e8decb',
          borderRadius: '16px',
          minHeight: '220px',
          padding: '30px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
          position: 'relative',
          transition: 'all 0.2s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '16px',
            fontSize: '10px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: isFlipped ? '#2a6a52' : '#8c7757',
            background: isFlipped ? '#e3f3e8' : '#f5eee1',
            padding: '3px 8px',
            borderRadius: '4px',
          }}
        >
          {isFlipped ? 'Definition / Meaning' : 'Word / Term'}
        </div>

        {currentCard.hint && !isFlipped && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '16px',
              fontSize: '11px',
              color: '#8b7d6b',
              fontStyle: 'italic',
            }}
          >
            Hint: {currentCard.hint}
          </div>
        )}

        {isMastered && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '16px',
              fontSize: '11px',
              color: '#286654',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Check size={13} /> Mastered
          </div>
        )}

        {/* Content */}
        {!isFlipped ? (
          <div>
            <span style={{ fontSize: '13px', color: '#978873', display: 'block', marginBottom: '8px' }}>
              Vocabulary Term
            </span>
            <h2
              style={{
                fontSize: '28px',
                color: '#263b33',
                margin: '0 0 10px',
                fontFamily: 'Georgia, serif',
                letterSpacing: '-0.3px',
              }}
            >
              {currentCard.front}
            </h2>
            <small style={{ color: '#908678', fontSize: '11px' }}>
              Tap anywhere on this card to flip and view meaning ↺
            </small>
          </div>
        ) : (
          <div>
            <span style={{ fontSize: '13px', color: '#447b66', display: 'block', marginBottom: '8px' }}>
              Meaning & Context
            </span>
            <p
              style={{
                fontSize: '18px',
                lineHeight: 1.6,
                color: '#1f3e33',
                margin: '0 0 12px',
                fontWeight: 600,
                maxWidth: '520px',
              }}
            >
              {currentCard.back}
            </p>
            {currentCard.hint && (
              <p style={{ margin: 0, fontSize: '12px', color: '#527768', fontStyle: 'italic' }}>
                Note: {currentCard.hint}
              </p>
            )}
            <small style={{ display: 'block', marginTop: '14px', color: '#688c7c', fontSize: '11px' }}>
              Tap to flip back ↺
            </small>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '18px',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #dce4d9',
              background: '#fff',
              color: currentIndex === 0 ? '#b5c0b8' : '#384d41',
              fontSize: '12px',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={16} /> Prev
          </button>

          <button
            type="button"
            onClick={handleFlip}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #d7e4d8',
              background: '#f2f8f3',
              color: '#286654',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCw size={14} /> Flip Card
          </button>

          <button
            type="button"
            onClick={handleNext}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #dce4d9',
              background: '#fff',
              color: '#384d41',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {currentIndex === total - 1 ? 'Finish' : 'Next'} <ChevronRight size={16} />
          </button>
        </div>

        {/* Self assessment */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={handleNext}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #ebd9c2',
              background: '#fffbf5',
              color: '#916327',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Still Learning ⏳
          </button>

          <button
            type="button"
            onClick={handleMarkMastered}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              background: '#286654',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Check size={14} /> Got It! ⭐
          </button>
        </div>
      </div>
    </div>
  );
}
