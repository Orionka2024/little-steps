'use client';

import React, { useState, useEffect } from 'react';
import {
  NotebookPen,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  X,
} from 'lucide-react';
import type { ClassroomUser } from '../../lib/auth-types';
import { CLASSROOM_USERS } from '../../lib/auth-types';

interface LoginViewProps {
  onLoginSuccess: (user: ClassroomUser) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [boundUsername, setBoundUsername] = useState<string | null>(null);

  // Teacher unlock modal state for switching accounts or accessing Teacher workspace
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherTargetUser, setTeacherTargetUser] = useState<ClassroomUser | null>(null);
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherModalError, setTeacherModalError] = useState('');

  // Check if this device is already bound to a student account
  useEffect(() => {
    try {
      const bound = localStorage.getItem('classroom_device_account');
      if (bound) setBoundUsername(bound);
    } catch {
      // ignore
    }
  }, []);

  const boundUser = boundUsername
    ? CLASSROOM_USERS.find((u) => u.username.toLowerCase() === boundUsername.toLowerCase()) || null
    : null;

  const performLogin = async (targetUsername: string, password?: string) => {
    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername, password }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; user?: ClassroomUser };

      if (!res.ok || !data.ok || !data.user) {
        throw new Error(data.error || 'Login failed. Please try again.');
      }

      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const sessionData = {
        ...data.user,
        expiresAt: data.user.expiresAt || Date.now() + THIRTY_DAYS_MS,
      };

      try {
        localStorage.setItem('classroom_user_session', JSON.stringify(sessionData));
        localStorage.setItem('classroom_device_account', data.user.username);
      } catch {
        // ignore incognito quota
      }

      onLoginSuccess(sessionData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleQuickSelectClick = (user: ClassroomUser) => {
    // If device is bound to someone else, block logging into a different account unless unlocked by teacher
    if (boundUsername && boundUsername.toLowerCase() !== user.username.toLowerCase()) {
      setTeacherTargetUser(user);
      setTeacherModalError(
        `This device is locked to ${boundUser?.displayName || boundUsername}. Enter Teacher password to switch accounts.`
      );
      setShowTeacherModal(true);
      return;
    }

    // Teacher account requires Teacher password to protect grades/billing
    if (user.role === 'Teacher') {
      setTeacherTargetUser(user);
      setTeacherModalError('');
      setTeacherPassword('');
      setShowTeacherModal(true);
      return;
    }

    // Students log in with 1 tap without any password!
    performLogin(user.username);
  };

  const handleTeacherUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherPassword.trim()) {
      setTeacherModalError('Please enter the Teacher password.');
      return;
    }

    if (!teacherTargetUser) return;

    setBusy(true);
    setTeacherModalError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: teacherTargetUser.username,
          password: teacherPassword.trim(),
        }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; user?: ClassroomUser };

      if (!res.ok || !data.ok || !data.user) {
        throw new Error(data.error || 'Incorrect Teacher password.');
      }

      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const sessionData = {
        ...data.user,
        expiresAt: data.user.expiresAt || Date.now() + THIRTY_DAYS_MS,
      };

      try {
        localStorage.setItem('classroom_user_session', JSON.stringify(sessionData));
        localStorage.setItem('classroom_device_account', data.user.username);
      } catch {}

      setShowTeacherModal(false);
      onLoginSuccess(sessionData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setTeacherModalError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setError('Please select or enter your name.');
      return;
    }

    const matched = CLASSROOM_USERS.find((u) => u.username.toLowerCase() === cleanUser);
    if (matched) {
      handleQuickSelectClick(matched);
    } else {
      performLogin(cleanUser);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafbf8',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          border: '1px solid #e5ebe1',
          borderRadius: '20px',
          padding: '36px 30px',
          boxShadow: '0 12px 40px #244b360d',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '54px',
              background: '#286959',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '14px',
              margin: '0 auto 14px',
              transform: 'rotate(-6deg)',
              boxShadow: '0 6px 16px #28695933',
            }}
          >
            <NotebookPen size={28} />
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 800,
              color: '#273f3b',
              margin: '0 0 6px',
            }}
          >
            Little Steps · Writing Club
          </h1>
          <p style={{ fontSize: '13px', color: '#748378', margin: 0 }}>
            {boundUser ? `Welcome back, ${boundUser.displayName}!` : 'Select your name to start writing'}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: '#fdeeed',
              border: '1px solid #f4bcbb',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#a32b29',
              marginBottom: '18px',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {/* BOUND DEVICE PRIMARY ACTION: 1-Tap Entry for the registered user */}
        {boundUser && (
          <div
            style={{
              background: '#f3f8f1',
              border: '1px solid #d4e7d0',
              borderRadius: '14px',
              padding: '18px',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: boundUser.role === 'Teacher' ? '#e2ebd8' : '#f2ddc8',
                color: boundUser.role === 'Teacher' ? '#255e3a' : '#805b3e',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: '18px',
                margin: '0 auto 10px',
                boxShadow: '0 4px 12px #00000010',
              }}
            >
              {boundUser.avatar}
            </div>
            <strong style={{ fontSize: '15px', color: '#273f3b', display: 'block', marginBottom: '2px' }}>
              {boundUser.displayName}
            </strong>
            <small style={{ fontSize: '11px', color: '#5e7264', display: 'block', marginBottom: '14px' }}>
              Device active session (stays signed in for 30 days)
            </small>

            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() => performLogin(boundUser.username)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                gap: '8px',
                boxShadow: '0 4px 12px #28665425',
              }}
            >
              {busy ? 'Opening Classroom…' : `Continue as ${boundUser.displayName}`}{' '}
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* QUICK SELECT SECTION */}
        <div style={{ marginTop: boundUser ? '10px' : '0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '12px', color: '#526658', fontWeight: 700 }}>
              <Sparkles size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> Quick
              Select:
            </span>
            <span style={{ fontSize: '11px', color: '#889689' }}>No password required</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {CLASSROOM_USERS.map((u) => {
              const isLockedForDevice =
                Boolean(boundUsername) &&
                boundUsername?.toLowerCase() !== u.username.toLowerCase();
              const isCurrentBound =
                Boolean(boundUsername) &&
                boundUsername?.toLowerCase() === u.username.toLowerCase();

              return (
                <button
                  key={u.username}
                  type="button"
                  disabled={busy}
                  onClick={() => handleQuickSelectClick(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: isCurrentBound
                      ? '2px solid #286654'
                      : isLockedForDevice
                      ? '1px solid #ebeee8'
                      : '1px solid #dfe5db',
                    background: isCurrentBound
                      ? '#f4f8f2'
                      : isLockedForDevice
                      ? '#fafbf9'
                      : '#ffffff',
                    cursor: busy ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    opacity: isLockedForDevice ? 0.75 : 1,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: u.role === 'Teacher' ? '#e2ebd8' : '#f2ddc8',
                      color: u.role === 'Teacher' ? '#255e3a' : '#805b3e',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    {u.avatar}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#273f3b',
                        fontWeight: isCurrentBound ? 800 : 600,
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {u.displayName}
                    </span>
                    <small style={{ fontSize: '9px', color: '#829184' }}>
                      {u.role === 'Teacher' ? 'Teacher' : 'Student'}
                    </small>
                  </div>
                  {isLockedForDevice && <Lock size={12} color="#9aa79d" />}
                  {isCurrentBound && <CheckCircle2 size={13} color="#286654" />}
                </button>
              );
            })}
          </div>

          {boundUsername && (
            <p
              style={{
                fontSize: '10px',
                color: '#7b8a7f',
                marginTop: '10px',
                lineHeight: 1.45,
                textAlign: 'center',
              }}
            >
              🔒 This device is locked to <strong>{boundUser?.displayName || boundUsername}</strong> so other users cannot access different accounts.
            </p>
          )}
        </div>

        {/* DEVICE BINDING UNLOCK OR MANUAL USERNAME */}
        <div
          style={{
            marginTop: '22px',
            paddingTop: '18px',
            borderTop: '1px solid #edf0e9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {boundUsername ? (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setTeacherTargetUser(CLASSROOM_USERS[0]);
                setTeacherModalError('');
                setTeacherPassword('');
                setShowTeacherModal(true);
              }}
              style={{ fontSize: '11px', color: '#587361', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <KeyRound size={13} /> Teacher Unlock / Switch Account
            </button>
          ) : (
            <form onSubmit={handleManualSubmit} style={{ width: '100%', display: 'flex', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '1px solid #d9e2d5',
                  borderRadius: '8px',
                  padding: '0 10px',
                  background: '#fafbf9',
                  flex: 1,
                }}
              >
                <User size={14} color="#8a998c" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Or type name: hajun, mark…"
                  autoCapitalize="none"
                  style={{
                    border: 0,
                    padding: '9px 0',
                    outline: 'none',
                    background: 'none',
                    width: '100%',
                    fontSize: '12px',
                  }}
                />
              </div>
              <button
                type="submit"
                className="primary"
                disabled={busy || !username.trim()}
                style={{ padding: '8px 14px', fontSize: '11px' }}
              >
                Sign In
              </button>
            </form>
          )}

          <span
            style={{
              fontSize: '10px',
              padding: '3px 7px',
              borderRadius: '5px',
              background: '#eef4ec',
              color: '#3d6148',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            30-day session
          </span>
        </div>
      </div>

      {/* TEACHER UNLOCK MODAL */}
      {showTeacherModal && (
        <div className="modal-overlay" onClick={() => setShowTeacherModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: '380px', padding: '28px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close" onClick={() => setShowTeacherModal(false)}>
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  background: '#eef6ec',
                  borderRadius: '50%',
                  color: '#286654',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 10px',
                }}
              >
                <Lock size={20} />
              </div>
              <h3 style={{ fontSize: '18px', color: '#273f3b', margin: '0 0 4px' }}>
                Teacher Authorization
              </h3>
              <p style={{ fontSize: '12px', color: '#687b70', margin: 0 }}>
                {teacherTargetUser?.role === 'Teacher'
                  ? 'Enter Teacher password to enter teacher workspace.'
                  : `Enter Teacher password to switch device account to ${teacherTargetUser?.displayName}.`}
              </p>
            </div>

            {teacherModalError && (
              <div
                style={{
                  background: '#fdeeed',
                  border: '1px solid #f4bcbb',
                  borderRadius: '7px',
                  padding: '8px 12px',
                  fontSize: '11px',
                  color: '#a32b29',
                  marginBottom: '14px',
                  textAlign: 'center',
                }}
              >
                {teacherModalError}
              </div>
            )}

            <form onSubmit={handleTeacherUnlockSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#3e5246',
                    marginBottom: '6px',
                  }}
                >
                  Teacher Password
                </label>
                <input
                  type="password"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="Enter teacher password"
                  autoFocus
                  style={{
                    border: '1px solid #dce4d4',
                    borderRadius: '7px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  style={{
                    padding: '10px',
                    borderRadius: '7px',
                    border: '1px solid #dfe5dc',
                    background: '#fff',
                    color: '#4f6154',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={busy || !teacherPassword.trim()}
                  style={{ padding: '10px', fontSize: '12px' }}
                >
                  {busy ? 'Verifying…' : 'Unlock & Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
