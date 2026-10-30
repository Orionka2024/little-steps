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
}

export function AssignmentCard({
  assignment,
  status,
  role,
  studentSubmissions,
  onOpen,
}: AssignmentCardProps) {
  const formattedDate = new Date(`${assignment.due}T12:00:00`).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <button className="assignment" onClick={() => onOpen(assignment)}>
      <div className={`card-art ${assignment.color}`}>
        <span>{assignment.icon || '✏️'}</span>
        <span className="art-dots">
          ✧<br />＋
        </span>
        <span className="type">{assignment.type}</span>
      </div>

      <div className="card-body">
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
          <span className={`badge ${status === 'To do' ? 'amber' : 'green'}`}>
            {status === 'To do' ? <Clock size={12} /> : <Check size={12} />} {status}
          </span>
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
    </button>
  );
}
