'use client';

import React from 'react';
import type { InteractiveActivity } from '../../../lib/types';
import { QuizGame } from './QuizGame';
import { WordScrambleGame } from './WordScrambleGame';
import { ConnectorMatchGame } from './ConnectorMatchGame';
import { FlashCardsGame } from './FlashCardsGame';

interface InteractiveActivityContainerProps {
  activity: InteractiveActivity;
  studentName?: string;
  onComplete?: (score: number, total: number) => void;
}

export function InteractiveActivityContainer({
  activity,
  studentName,
  onComplete,
}: InteractiveActivityContainerProps) {
  return (
    <div style={{ marginTop: '16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#f2f7ef',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid #dce8d8',
          fontSize: '12px',
          color: '#2b5744',
          fontWeight: 600,
        }}
      >
        <span>
          {activity.type === 'quiz'
            ? '📝 Interactive Quiz & Test'
            : activity.type === 'word_scramble'
            ? '🔤 Vocabulary Word Scramble'
            : activity.type === 'flashcards'
            ? '🗂️ Vocabulary & Concept Flash Cards'
            : '🔗 Connecting Words Challenge'}
        </span>
        <span style={{ marginLeft: 'auto', fontWeight: 500, color: '#688274' }}>
          {activity.title}
        </span>
      </div>

      {activity.type === 'quiz' && (
        <QuizGame
          activity={activity}
          studentName={studentName}
          onComplete={onComplete}
        />
      )}

      {activity.type === 'word_scramble' && (
        <WordScrambleGame
          activity={activity}
          studentName={studentName}
          onComplete={onComplete}
        />
      )}

      {activity.type === 'connecting_words' && (
        <ConnectorMatchGame
          activity={activity}
          studentName={studentName}
          onComplete={onComplete}
        />
      )}

      {activity.type === 'flashcards' && (
        <FlashCardsGame
          activity={activity}
          studentName={studentName}
          onComplete={onComplete}
        />
      )}
    </div>
  );
}
