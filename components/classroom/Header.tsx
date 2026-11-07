'use client';

import React from 'react';
import { ChevronRight, LogOut, ShieldCheck } from 'lucide-react';
import type { Role, Student } from '../../lib/types';
import type { ClassroomUser } from '../../lib/auth-types';

interface HeaderProps {
  page: string;
  role: Role;
  currentUser?: ClassroomUser | null;
  onRoleChange: (newRole: Role) => void;
  selectedStudent: Student;
  onStudentChange?: (student: Student) => void;
  onLogout?: () => void;
  onOpenBackupModal?: () => void;
}

export function Header({
  page,
  role,
  currentUser,
  onRoleChange,
  selectedStudent,
  onLogout,
  onOpenBackupModal,
}: HeaderProps) {
  const isRealStudent = currentUser?.role === 'Student';

  return (
    <header>
      <div className="breadcrumb">
        My classroom <ChevronRight size={14} /> <strong>{page === 'Editor' ? 'Homework' : page}</strong>
      </div>

      <div className="header-right">
        <span className="private-dot">
          {role === 'Teacher'
            ? 'Teacher Workspace'
            : isRealStudent
            ? `Student: ${currentUser?.displayName || selectedStudent.name}`
            : 'Student View (Preview)'}
        </span>

        {!isRealStudent && (
          <select
            aria-label="Workspace mode"
            value={role}
            onChange={(e) => onRoleChange(e.target.value as Role)}
            style={{ fontWeight: 600 }}
          >
            <option value="Teacher">Teacher Mode</option>
            <option value="Student">Review Student View</option>
          </select>
        )}

        <div className="avatar small">
          {role === 'Teacher' ? 'T' : isRealStudent ? (currentUser?.avatar || selectedStudent.avatar) : 'S'}
        </div>

        {role === 'Teacher' && onOpenBackupModal && (
          <button
            type="button"
            className="text-button"
            onClick={onOpenBackupModal}
            title="Curriculum Backup & Cloud Sync"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: '#286654',
              fontWeight: 600,
              background: '#eaf2ec',
              padding: '4px 8px',
              borderRadius: '6px',
              marginLeft: '4px',
            }}
          >
            <ShieldCheck size={13} /> Backup
          </button>
        )}

        {onLogout && (
          <button
            type="button"
            className="text-button"
            onClick={onLogout}
            title="Sign Out"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: '#7b8c7c',
              marginLeft: '4px',
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        )}
      </div>
    </header>
  );
}
