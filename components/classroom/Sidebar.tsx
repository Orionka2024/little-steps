'use client';

import React from 'react';
import { Home, NotebookPen, FolderOpen, MessageCircle } from 'lucide-react';
import type { Role, Student } from '../../lib/types';

interface SidebarProps {
  page: string;
  role: Role;
  selectedStudent: Student;
  totalAssignments: number;
  completedAssignments: number;
  onNavigate: (pageName: string) => void;
}

export function Sidebar({
  page,
  role,
  selectedStudent,
  totalAssignments,
  completedAssignments,
  onNavigate,
}: SidebarProps) {
  const pendingCount = totalAssignments - completedAssignments;

  const navItems = [
    { name: 'Home', icon: Home },
    { name: 'Homework', icon: NotebookPen },
    { name: 'Materials', icon: FolderOpen },
    { name: 'Messages', icon: MessageCircle },
  ] as const;

  return (
    <aside className="sidebar">
      <a className="brand" onClick={() => onNavigate('Home')} role="button" tabIndex={0}>
        <span className="brand-icon">
          <NotebookPen size={25} />
        </span>
        <span>
          little steps<span className="brand-sub">WRITING CLUB</span>
        </span>
      </a>

      <div className="class-label">YOUR LEARNING SPACE</div>

      <nav>
        {navItems.map(({ name, icon: Icon }) => (
          <button
            key={name}
            className={page === name ? 'selected' : ''}
            onClick={() => onNavigate(name)}
          >
            <Icon size={20} />
            {name}
            {name === 'Homework' && (
              <span className="nav-count">{pendingCount > 0 ? pendingCount : 0}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="side-note">
        <span>✦</span>
        <h4>
          Little steps.
          <br />
          Big ideas.
        </h4>
        <p>Every great writer started with a first draft.</p>
        <div className="scribble">keep going ↗</div>
      </div>

      <div className="side-bottom">
        <div className="avatar">
          {role === 'Student' ? selectedStudent.avatar : 'T'}
        </div>
        <div>
          <strong>
            {role === 'Student'
              ? `${selectedStudent.name} (Student)`
              : 'Teacher workspace'}
          </strong>
          <small>
            {role === 'Student'
              ? 'Essay explorers · Ages 10–11'
              : 'Classroom: Hajun, Mark, Juwon'}
          </small>
        </div>
      </div>
    </aside>
  );
}
