'use client';

import React from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
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
  onEditAssignment?: (assignment: AssignmentEntry, e: React.MouseEvent) => void;
  onDeleteAssignment?: (assignment: AssignmentEntry, e: React.MouseEvent) => void;
  onOpenBackupModal?: () => void;
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
  onEditAssignment,
  onDeleteAssignment,
  onOpenBackupModal,
}: HomeworkViewProps) {
  const filterOptions = role === 'Teacher' ? TEACHER_FILTERS : STUDENT_FILTERS;
  const activeFilter = (filterOptions as readonly string[]).includes(filter)
    ? filter
    : 'All homework';

  const filteredAssignments = assignments
    .filter((a) => (role === 'Teacher' ? true : a.posted !== false))
    .filter((a) => {
      if (activeFilter === 'All homework') return true;
      if (activeFilter === 'Unposted (Drafts)') return a.posted === false;
      if (activeFilter === 'Posted') return a.posted !== false;
      if (role === 'Teacher') {
        const subs = getStudentSubmissions(a);
        const statuses = Object.values(subs);
        return statuses.includes(activeFilter as HomeworkStatus);
      }
      return getStatus(a) === activeFilter;
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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {onOpenBackupModal && (
              <button
                type="button"
                className="secondary"
                onClick={onOpenBackupModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ShieldCheck size={16} /> Backup & Sync
              </button>
            )}
            <button className="primary" onClick={onOpenCreateModal}>
              <Plus size={18} /> Assign homework
            </button>
          </div>
        )}
      </div>

      <div className="toolbar">
        <div className="tabs">
          {filterOptions.map((f) => (
            <button
              key={f}
              className={activeFilter === f ? 'active' : ''}
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
            onEdit={onEditAssignment}
            onDelete={onDeleteAssignment}
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
