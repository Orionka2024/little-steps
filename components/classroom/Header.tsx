'use client';

import React from 'react';
import { ChevronRight, LogOut } from 'lucide-react';
import type { Role, Student } from '../../lib/types';
import { STUDENTS } from '../../lib/types';

interface HeaderProps {
  page: string;
  role: Role;
  onRoleChange: (newRole: Role) => void;
  selectedStudent: Student;
  onStudentChange: (student: Student) => void;
  onLogout?: () => void;
}

export function Header({
  page,
  role,
  onRoleChange,
  selectedStudent,
  onStudentChange,
  onLogout,
}: HeaderProps) {
  return (
    <header>
      <div className="breadcrumb">
        My classroom <ChevronRight size={14} /> <strong>{page === 'Editor' ? 'Homework' : page}</strong>
      </div>

      <div className="header-right">
        <span className="private-dot">
          {role === 'Teacher' ? 'Teacher Workspace' : `Student: ${selectedStudent.name}`}
        </span>

        <select
          aria-label="Preview role"
          value={role}
          onChange={(e) => onRoleChange(e.target.value as Role)}
        >
          <option value="Student">Student Mode</option>
          <option value="Teacher">Teacher Mode</option>
        </select>

        {role === 'Student' && (
          <select
            aria-label="Select student"
            value={selectedStudent.id}
            onChange={(e) => {
              const matched = STUDENTS.find((st) => st.id === e.target.value);
              if (matched) onStudentChange(matched);
            }}
          >
            {STUDENTS.map((st) => (
              <option key={st.id} value={st.id}>
                Student: {st.name}
              </option>
            ))}
          </select>
        )}

        <div className="avatar small">
          {role === 'Student' ? selectedStudent.avatar : 'T'}
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
