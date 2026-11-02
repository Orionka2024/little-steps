'use client';

import React from 'react';
import { Clock, Check, ArrowUpRight } from 'lucide-react';
import type { AssignmentEntry, HomeworkStatus, Role } from '../../lib/types';
import { STUDENTS } from '../../lib/types';

interface AssignmentCardProps {
  assignment: AssignmentEntry;
  status: HomeworkStatus;
  role?: Role;
  studentSubmissions?: Record<string, HomeworkStatus>;
  onOpen: (assignment: AssignmentEntry) => void;
  onTogglePost?: (assignment: AssignmentEntry, e: React.MouseEvent) => void;
}

export function AssignmentCard({
  assignment,
  status,
  role,
  studentSubmissions,
  onOpen,
  onTogglePost,
}: AssignmentCardProps) {
  const formattedDate = new Date(`${assignment.due}T12:00:00`).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="assignment"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(assignment)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(assignment);
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      <div className={`card-art ${assignment.color}`}>
        <span>{assignment.icon || '✏️'}</span>
        <span className="art-dots">
          ✧<br />＋
        </span>
        <span className="type">{assignment.type}</span>
      </div>

      <div className="card-body">
        {role === 'Teacher' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              paddingBottom: '8px',
              borderBottom: '1px solid #f0f3ed',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                padding: '3px 7px',
                borderRadius: '5px',
                background: assignment.posted ? '#e7f3e8' : '#fff2de',
                color: assignment.posted ? '#246142' : '#94580f',
                fontWeight: 700,
                border: assignment.posted ? '1px solid #c7e5cb' : '1px solid #f9deb1',
              }}
            >
              {assignment.posted ? '📢 Posted' : '🔒 Unposted'}
            </span>

            {onTogglePost && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePost(assignment, e);
                }}
                style={{
                  background: assignment.posted ? '#f4f6f3' : '#286654',
                  color: assignment.posted ? '#4c5c53' : '#ffffff',
                  border: assignment.posted ? '1px solid #d2ded7' : 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  padding: '3px 9px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                title={
                  assignment.posted
                    ? 'Unpost homework (hide from students)'
                    : 'Post homework (make visible to students)'
                }
              >
                {assignment.posted ? 'Unpost' : 'Post to class'}
              </button>
            )}
          </div>
        )}

        {role === 'Teacher' ? (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {STUDENTS.map((st) => {
              const stStatus = studentSubmissions?.[st.id] || 'To do';
              const isDone = stStatus === 'Handed in' || stStatus === 'Reviewed';
              return (
                <span
                  key={st.id}
                  style={{
                    fontSize: '9px',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    background: isDone ? '#e9f3e7' : '#f3f4f1',
                    color: isDone ? '#286654' : '#6b7873',
                    fontWeight: isDone ? 700 : 500,
                  }}
                >
                  {st.name}: {stStatus}
                </span>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span className={`badge ${status === 'To do' ? 'amber' : 'green'}`}>
              {status === 'To do' ? <Clock size={12} /> : <Check size={12} />} {status}
            </span>
            {assignment.taskType && assignment.taskType !== 'essay' && (
              <span
                style={{
                  fontSize: '9px',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  background: '#f2f6f2',
                  color: '#285844',
                  fontWeight: 600,
                }}
              >
                {assignment.taskType === 'flashcards'
                  ? '🗂️ Flash Cards'
                  : assignment.taskType === 'test'
                  ? '📝 Test'
                  : assignment.taskType === 'word_scramble'
                  ? '🔤 Word Game'
                  : '🔗 Connector Match'}
              </span>
            )}
          </div>
        )}

        <h3>{assignment.title}</h3>
        <p>{assignment.description}</p>

        <div className="card-foot">
          <span>
            {formattedDate} <i>·</i> {assignment.minutes || 25} min
          </span>
          <span className="arrow">
            <ArrowUpRight size={18} />
          </span>
        </div>
      </div>
    </div>
  );
}
