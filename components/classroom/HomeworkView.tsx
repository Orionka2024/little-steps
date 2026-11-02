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
  onTogglePost?: (assignment: AssignmentEntry, e: React.MouseEvent) => void;
}

const TEACHER_FILTERS = [
  'All homework',
  'Unposted (Drafts)',
  'Posted',
  'To do',
  'Draft',
  'Handed in',
  'Reviewed',
] as const;

const STUDENT_FILTERS = ['All homework', 'To do', 'Draft', 'Handed in', 'Reviewed'] as const;

export function HomeworkView({
  role,
  assignments,
  filter,
  onFilterChange,
  getStatus,
  getStudentSubmissions,
  onOpenAssignment,
  onOpenCreateModal,
  onTogglePost,
}: HomeworkViewProps) {
  const filterOptions = role === 'Teacher' ? TEACHER_FILTERS : STUDENT_FILTERS;

  const filteredAssignments = assignments
    .filter((a) => (role === 'Teacher' ? true : a.posted === true))
    .filter((a) => {
      if (filter === 'All homework') return true;
      if (filter === 'Unposted (Drafts)') return !a.posted;
      if (filter === 'Posted') return !!a.posted;
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
              ? 'Prepare assignments, preview them, and post them when ready for students to see.'
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
          {filterOptions.map((f) => (
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
            onTogglePost={onTogglePost}
          />
        ))}
      </div>

      {filteredAssignments.length === 0 && (
        <div className="empty">
          {role === 'Student'
            ? 'No homework assignments posted yet. Check back soon for new writing tasks!'
            : 'No assignments found under this filter.'}
        </div>
      )}
    </>
  );
}
