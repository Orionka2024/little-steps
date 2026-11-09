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

  const matchesFilter = (a: AssignmentEntry, targetFilter: string): boolean => {
    if (role !== 'Teacher' && !a.posted) return false;
    if (targetFilter === 'All homework') {
      return role === 'Teacher' ? true : Boolean(a.posted);
    }
    if (targetFilter === 'Unposted (Drafts)') return !a.posted;
    if (targetFilter === 'Posted') return Boolean(a.posted);
    // Only posted assignments are active classroom assignments for status tabs
    if (!a.posted) return false;
    if (role === 'Teacher') {
      const subs = getStudentSubmissions(a);
      const statuses = Object.values(subs);
      return statuses.includes(targetFilter as HomeworkStatus);
    }
    return getStatus(a) === targetFilter;
  };

  const filteredAssignments = assignments.filter((a) => matchesFilter(a, activeFilter));

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
          {filterOptions.map((f) => {
            const count = assignments.filter((a) => matchesFilter(a, f)).length;
            return (
              <button
                key={f}
                className={activeFilter === f ? 'active' : ''}
                onClick={() => onFilterChange(f)}
              >
                {f}
                {count > 0 && (
                  <span
                    style={{
                      marginLeft: '6px',
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      background: activeFilter === f ? 'rgba(255,255,255,0.25)' : '#e9efe8',
                      color: activeFilter === f ? '#fff' : '#286654',
                      fontWeight: 700,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
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
            ? activeFilter === 'All homework'
              ? 'No homework assignments posted yet. Check back soon for new writing tasks!'
              : `No homework assignments in "${activeFilter}" right now.`
            : 'No assignments found under this filter.'}
        </div>
      )}
    </>
  );
}
