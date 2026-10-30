'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import type { AssignmentEntry, HomeworkStatus, Role } from '../../lib/types';
import { AssignmentCard } from './AssignmentCard';

interface HomeworkViewProps {
  role: Role;
  assignments: AssignmentEntry[];
  filter: string;
  onFilterChange: (newFilter: string) => void;
  getStatus: (assignment: AssignmentEntry) => HomeworkStatus;
  getStudentSubmissions: (assignment: AssignmentEntry) => Record<string, HomeworkStatus>;
  onOpenAssignment: (assignment: AssignmentEntry) => void;
  onOpenCreateModal: () => void;
}

const FILTER_OPTIONS = ['All homework', 'To do', 'Draft', 'Handed in', 'Reviewed'] as const;

export function HomeworkView({
  role,
  assignments,
  filter,
  onFilterChange,
  getStatus,
  getStudentSubmissions,
  onOpenAssignment,
  onOpenCreateModal,
}: HomeworkViewProps) {
  const filteredAssignments = assignments.filter((a) => {
    if (filter === 'All homework') return true;
    if (role === 'Teacher') {
      const subs = getStudentSubmissions(a);
      const statuses = Object.values(subs);
      return statuses.includes(filter as HomeworkStatus);
    }
    return getStatus(a) === filter;
  });

  return (
    <>
      <div className="page-heading heading-row">
        <div>
          <div className="eyebrow">ONE IDEA AT A TIME</div>
          <h1>{role === 'Teacher' ? 'Class homework (Hajun, Mark, Juwon)' : 'Your writing adventures'}</h1>
          <p>
            {role === 'Teacher'
              ? 'Track submissions from Hajun, Mark, and Juwon, or create a new assignment.'
              : 'Start a draft, add a photo, or pick up where you left off.'}
          </p>
        </div>
        {role === 'Teacher' && (
          <button className="primary" onClick={onOpenCreateModal}>
            <Plus size={18} /> Assign homework
          </button>
        )}
      </div>

      <div className="toolbar">
        <div className="tabs">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              className={filter === f ? 'active' : ''}
              onClick={() => onFilterChange(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="cards three">
        {filteredAssignments.map((a) => (
          <AssignmentCard
            key={a.id}
            assignment={a}
            status={getStatus(a)}
            role={role}
            studentSubmissions={getStudentSubmissions(a)}
            onOpen={onOpenAssignment}
          />
        ))}
      </div>

      {filteredAssignments.length === 0 && (
        <div className="empty">
          Nothing here yet. Your writing journey is just getting started.
        </div>
      )}
    </>
  );
}
