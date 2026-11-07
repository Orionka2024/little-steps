'use client';

import React from 'react';
import { Sparkles, ArrowUpRight, ChevronRight, Leaf, Compass } from 'lucide-react';
import type { AssignmentEntry, MaterialEntry, HomeworkStatus, Role, Student } from '../../lib/types';
import { AssignmentCard } from './AssignmentCard';

interface HomeViewProps {
  role: Role;
  currentStudent: Student;
  assignments: AssignmentEntry[];
  resources: MaterialEntry[];
  completedCount: number;
  getStatus: (assignment: AssignmentEntry) => HomeworkStatus;
  getStudentSubmissions: (assignment: AssignmentEntry) => Record<string, HomeworkStatus>;
  onOpenAssignment: (assignment: AssignmentEntry) => void;
  onOpenResource: (resource: MaterialEntry) => void;
  onNavigate: (page: string) => void;
  onTogglePost?: (assignment: AssignmentEntry, e: React.MouseEvent) => void;
  onEditAssignment?: (assignment: AssignmentEntry, e: React.MouseEvent) => void;
  onDeleteAssignment?: (assignment: AssignmentEntry, e: React.MouseEvent) => void;
}

export function HomeView({
  role,
  currentStudent,
  assignments,
  resources,
  completedCount,
  getStatus,
  getStudentSubmissions,
  onOpenAssignment,
  onOpenResource,
  onNavigate,
  onTogglePost,
  onEditAssignment,
  onDeleteAssignment,
}: HomeViewProps) {
  const totalCount = assignments.length;
  const progressPercent =
    totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;
  const nextAssignment =
    totalCount > 0
      ? assignments.find((a) => a.posted !== false && getStatus(a) === 'To do') ||
        assignments.find((a) => a.posted !== false) ||
        assignments[0]
      : null;

  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">A LITTLE PRACTICE, A LOT OF POSSIBILITY</div>
        <h1>
          {role === 'Teacher'
            ? 'Welcome, teacher!'
            : currentStudent.id === 'preview' || currentStudent.name === 'Student'
            ? 'Welcome to Student View!'
            : `Hello, ${currentStudent.name}!`}
          <span className="wave">✦</span>
        </h1>
        <p>
          {role === 'Teacher'
            ? 'Track work from Hajun, Mark, and Juwon, or assign a new writing topic.'
            : currentStudent.id === 'preview' || currentStudent.name === 'Student'
            ? 'Review assignments, interactive activities, and club resources as seen by students.'
            : 'Your ideas belong here. Let’s turn them into something wonderful.'}
        </p>
      </div>

      <section className="hero">
        <div className="hero-copy">
          <span className="pill">
            <Sparkles size={14} /> YOUR NEXT LITTLE STEP
          </span>
          <h2>
            Big stories start
            <br />
            with your ideas.
          </h2>
          <p>Find your words, make a first draft, and let your imagination do the rest.</p>
          {nextAssignment ? (
            <button className="primary" onClick={() => onOpenAssignment(nextAssignment)}>
              Let’s get writing <ArrowUpRight size={17} />
            </button>
          ) : (
            <div style={{ marginTop: '16px', fontSize: '13px', color: '#38644b', fontWeight: 600 }}>
              ✨ All caught up! No homework tasks posted yet.
            </div>
          )}
          <small>No perfect words needed. Just a beginning.</small>
        </div>

        <div className="hero-illustration" aria-hidden="true">
          <div className="orb" />
          <span className="star s1">✦</span>
          <span className="star s2">✧</span>
          <span className="star s3">✦</span>
          <div className="paper back" />
          <div className="paper">
            <span className="paper-title">My big idea</span>
            <div className="line short" />
            <div className="line" />
            <div className="line" />
            <div className="line mid" />
            <div className="paper-picture">🌱</div>
            <span className="paper-heart">♡</span>
          </div>
          <div className="pencil" />
          <div className="sticker">
            one word
            <br />
            at a time ♡
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <div>
          <div className="section-title">
            <h2>
              Your writing adventures <span>{totalCount}</span>
            </h2>
            <button className="text-button" onClick={() => onNavigate('Homework')}>
              All homework <ChevronRight size={16} />
            </button>
          </div>
          <div className="cards">
            {assignments.length > 0 ? (
              assignments.map((a) => (
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
              ))
            ) : (
              <div
                className="empty"
                style={{
                  gridColumn: '1 / -1',
                  padding: '30px 20px',
                  textAlign: 'center',
                  fontSize: '12px',
                }}
              >
                {role === 'Student'
                  ? 'No homework tasks posted yet. Check back soon or explore the writing guide!'
                  : 'No homework assignments available.'}
              </div>
            )}
          </div>
        </div>

        <aside className="right-col">
          <div className="progress-box">
            <div className="section-title">
              <h3>{role === 'Student' ? `Look at you grow, ${currentStudent.name}!` : 'Classroom progress'}</h3>
              <Leaf size={21} />
            </div>
            <p>One little step at a time.</p>
            <div className="progress-row">
              <strong>
                {completedCount}
                <span> / {totalCount}</span>
              </strong>
              <span>adventures handed in</span>
            </div>
            <div className="progress-track">
              <div style={{ width: `${progressPercent}%` }} />
            </div>
            <small>
              {totalCount === 0
                ? 'No active homework assignments right now.'
                : completedCount
                ? 'Keep it up. Your ideas are growing!'
                : 'Your next adventure is waiting for you.'}
            </small>
          </div>

          <div className="teacher-note">
            <span className="eyebrow">A NOTE FOR OUR WRITERS</span>
            <h3>Your voice matters. 💬</h3>
            <p>
              “Don’t worry about getting it perfect the first time. A first draft is just you telling
              yourself the story.”
            </p>
            <span className="note-author">
              <span className="avatar tiny">✎</span> Your writing club
            </span>
          </div>

          {role === 'Teacher' && (
            <div
              style={{
                marginTop: '16px',
                background: '#ffffff',
                border: '1px solid #e1e7dc',
                borderRadius: '13px',
                padding: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Compass size={17} color="#286654" />
                <strong style={{ fontSize: '13px', color: '#273f3b' }}>
                  Teacher’s Compass
                </strong>
              </div>
              <p style={{ fontSize: '11px', color: '#68776f', margin: '0 0 10px', lineHeight: 1.5 }}>
                Explore the 16-week timeline, 6 competition tips, and curated official links.
              </p>
              <button
                className="text-button"
                onClick={() => onNavigate('Roadmap')}
                style={{ fontSize: '11px', fontWeight: 600 }}
              >
                Open roadmap & tips <ChevronRight size={14} />
              </button>
            </div>
          )}
        </aside>
      </div>

      <div className="section-title">
        <h2>A little help along the way</h2>
        <button className="text-button" onClick={() => onNavigate('Materials')}>
          Explore materials <ChevronRight size={16} />
        </button>
      </div>

      <div className="resource-row">
        {resources.map((r) => (
          <button className="resource" key={r.id} onClick={() => onOpenResource(r)}>
            <span className={`resource-icon ${r.color}`}>{r.icon || '📖'}</span>
            <span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <small>{r.type}</small>
                {r.googleDrive && (
                  <span
                    style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: '#e8f0fe',
                      color: '#1a73e8',
                      fontWeight: 600,
                    }}
                  >
                    Drive
                  </span>
                )}
              </div>
              <strong>{r.title}</strong>
            </span>
            <ChevronRight size={17} />
          </button>
        ))}
      </div>
    </>
  );
}
