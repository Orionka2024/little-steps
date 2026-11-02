'use client';

import React from 'react';
import {
  Home,
  NotebookPen,
  FolderOpen,
  MessageCircle,
  Compass,
  CalendarCheck,
} from 'lucide-react';
import type { Role, Student } from '../../lib/types';
import type { ClassroomUser } from '../../lib/auth-types';

interface SidebarProps {
  page: string;
  role: Role;
  currentUser?: ClassroomUser | null;
  selectedStudent: Student;
  totalAssignments: number;
  completedAssignments: number;
  onNavigate: (pageName: string) => void;
}

export function Sidebar({
  page,
  role,
  currentUser,
  selectedStudent,
  totalAssignments,
  completedAssignments,
  onNavigate,
}: SidebarProps) {
  const pendingCount = totalAssignments - completedAssignments;

  const allNavItems = [
    { name: 'Home', icon: Home, teacherOnly: false },
    { name: 'Homework', icon: NotebookPen, teacherOnly: false },
    { name: 'Attendance', icon: CalendarCheck, teacherOnly: true },
    { name: 'Roadmap', icon: Compass, teacherOnly: true },
    { name: 'Materials', icon: FolderOpen, teacherOnly: false },
    { name: 'Messages', icon: MessageCircle, teacherOnly: false },
  ] as const;

  const navItems = allNavItems.filter((item) => !item.teacherOnly || role === 'Teacher');


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
          {role === 'Teacher'
            ? 'T'
            : currentUser?.role === 'Student'
            ? currentUser.avatar
            : 'S'}
        </div>
        <div>
          <strong>
            {role === 'Teacher'
              ? 'Teacher workspace'
              : currentUser?.role === 'Student'
              ? `${selectedStudent.name} (Student)`
              : 'Student View (Preview)'}
          </strong>
          <small>
            {role === 'Teacher'
              ? 'Classroom: Hajun, Mark, Juwon'
              : currentUser?.role === 'Student'
              ? 'Essay explorers'
              : 'Reviewing student experience'}
          </small>
        </div>
      </div>
    </aside>
  );
}
