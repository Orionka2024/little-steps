'use client';

import React from 'react';
import { ChevronRight, LogOut } from 'lucide-react';
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
}

export function Header({
  page,
  role,
  currentUser,
  onRoleChange,
  selectedStudent,
  onLogout,
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
