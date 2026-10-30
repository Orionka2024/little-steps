'use client';

import React from 'react';
import { MessageCircle, Send } from 'lucide-react';
import type { MessageEntry, Role, Student } from '../../lib/types';

interface MessagesViewProps {
  role: Role;
  currentStudent: Student;
  messages: MessageEntry[];
  messageText: string;
  onMessageTextChange: (text: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  busy: boolean;
  loaded: boolean;
}

export function MessagesView({
  role,
  currentStudent,
  messages,
  messageText,
  onMessageTextChange,
  onSendMessage,
  busy,
  loaded,
}: MessagesViewProps) {
  const sortedMessages = [...messages].sort((a, b) => a.time.localeCompare(b.time));
  const activeSenderName = role === 'Student' ? currentStudent.name : 'Teacher';

  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">LET’S TALK ABOUT YOUR IDEAS</div>
        <h1>A helping hand</h1>
        <p>Questions, encouragement, and little moments of “I get it!”</p>
      </div>

      <div className="message-board">
        <div className="message-header">
          <span className="avatar">✎</span>
          <div>
            <strong>Your writing conversation</strong>
            <small>
              Classroom chat: Hajun, Mark, Juwon & Teacher
            </small>
          </div>
        </div>

        <div className="messages">
          {sortedMessages.length === 0 && (
            <div className="empty">
              <MessageCircle size={32} />
              <h3>Every good question starts a conversation.</h3>
              <p>Write a question or a note below.</p>
            </div>
          )}

          {sortedMessages.map((m) => {
            const formattedDate = new Date(m.time).toLocaleDateString('en-GB', {
              month: 'short',
              day: 'numeric',
            });
            const isMine =
              m.sender === activeSenderName ||
              (role === 'Student' && m.studentId === currentStudent.id);

            return (
              <div
                className={`bubble ${isMine ? 'mine' : ''}`}
                key={m.id}
              >
                <small>
                  {m.sender} · {formattedDate}
                </small>
                <p>{m.text}</p>
              </div>
            );
          })}
        </div>

        <form className="message-form" onSubmit={onSendMessage}>
          <input
            aria-label="Your message"
            maxLength={3000}
            value={messageText}
            onChange={(e) => onMessageTextChange(e.target.value)}
            placeholder={
              role === 'Student'
                ? `Write as ${currentStudent.name}…`
                : 'Write a question or encouraging feedback as Teacher…'
            }
          />
          <button
            type="submit"
            className="primary"
            disabled={busy || !loaded || !messageText.trim()}
          >
            <Send size={18} /> Send
          </button>
        </form>
      </div>
    </>
  );
}
