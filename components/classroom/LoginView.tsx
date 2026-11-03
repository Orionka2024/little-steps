'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Eye,
  EyeOff,
} from 'lucide-react';
import type { ClassroomUser } from '../../lib/auth-types';
import { CLASSROOM_USERS } from '../../lib/auth-types';

interface LoginViewProps {
  onLoginSuccess: (user: ClassroomUser) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [selectedUser, setSelectedUser] = useState<ClassroomUser>(CLASSROOM_USERS[1]); // Default to Hajun
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [boundUsername, setBoundUsername] = useState<string | null>(null);

  // Teacher unlock modal state for switching accounts on a bound device
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherTargetUser, setTeacherTargetUser] = useState<ClassroomUser | null>(null);
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherModalError, setTeacherModalError] = useState('');

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Check if this device is already bound to a student account
  useEffect(() => {
    try {
      const bound = localStorage.getItem('classroom_device_account');
      if (bound) {
        setBoundUsername(bound);
        const matched = CLASSROOM_USERS.find(
          (u) => u.username.toLowerCase() === bound.toLowerCase()
        );
        if (matched) {
          setSelectedUser(matched);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const boundUser = boundUsername
    ? CLASSROOM_USERS.find((u) => u.username.toLowerCase() === boundUsername.toLowerCase()) || null
    : null;

  const handleSelectUser = (user: ClassroomUser) => {
    setError('');

    // If device is bound to someone else, prevent switching to a different account
    if (boundUsername && boundUsername.toLowerCase() !== user.username.toLowerCase()) {
      setTeacherTargetUser(user);
      setTeacherModalError(
        `This device is locked to ${boundUser?.displayName || boundUsername}. Enter Teacher password to switch accounts.`
      );
      setTeacherPassword('');
      setShowTeacherModal(true);
      return;
    }

    setSelectedUser(user);
    setPassword('');
    // Auto focus password input
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your password.');
      passwordInputRef.current?.focus();
      return;
    }

    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedUser.username,
          password: password.trim(),
        }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; user?: ClassroomUser };

      if (!res.ok || !data.ok || !data.user) {
        throw new Error(data.error || 'Incorrect password. Please try again.');
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
      passwordInputRef.current?.focus();
    } finally {
      setBusy(false);
    }
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
          teacherUnlock: true,
          teacherPassword: teacherPassword.trim(),
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
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setTeacherModalError(msg);
    } finally {
      setBusy(false);
    }
  };

  const isBoundDevice = Boolean(boundUsername);

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
          boxShadow: '0 16px 44px #244b360f',
        }}
      >
        {/* LOGO & HEADING */}
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
              margin: '0 auto 12px',
              transform: 'rotate(-5deg)',
              boxShadow: '0 6px 16px #28695933',
            }}
          >
            <NotebookPen size={28} />
          </div>
          <h1
            style={{
              fontSize: '23px',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 800,
              color: '#273f3b',
              margin: '0 0 5px',
            }}
          >
            Little Steps · Writing Club
          </h1>
          <p style={{ fontSize: '13px', color: '#6d7e72', margin: 0 }}>
            {isBoundDevice
              ? `Welcome back, ${boundUser?.displayName || boundUsername}! Enter password to continue.`
              : 'Select your account and enter your password to start.'}
          </p>
        </div>

        {/* DEVICE BOUND NOTICE */}
        {isBoundDevice && boundUser && (
          <div
            style={{
              background: '#f2f8f0',
              border: '1px solid #d4e8ce',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#2b7352" />
              <span style={{ fontSize: '12px', color: '#27523c', fontWeight: 600 }}>
                This device is registered to {boundUser.displayName}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setTeacherTargetUser(CLASSROOM_USERS[0]);
                setTeacherModalError('');
                setTeacherPassword('');
                setShowTeacherModal(true);
              }}
              style={{
                background: 'none',
                border: 0,
                color: '#496b56',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Switch
            </button>
          </div>
        )}

        {/* ERROR BANNER */}
        {error && (
          <div
            style={{
              background: '#fdeeed',
              border: '1px solid #f4bcbb',
              borderRadius: '9px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#a32b29',
              marginBottom: '18px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        {/* QUICK SELECT */}
        <div style={{ marginBottom: '22px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '12px', color: '#687b6e', fontWeight: 700 }}>
              <Sparkles size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> Quick
              Select:
            </span>
            <span style={{ fontSize: '11px', color: '#8a998c' }}>
              {isBoundDevice ? 'Device locked' : 'Tap to choose profile'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {CLASSROOM_USERS.map((u) => {
              const isSelected = selectedUser.username === u.username;
              const isLockedOnDevice =
                boundUsername && boundUsername.toLowerCase() !== u.username.toLowerCase();

              return (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => handleSelectUser(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: isSelected
                      ? '2px solid #286959'
                      : isLockedOnDevice
                      ? '1px dashed #dbe2d8'
                      : '1px solid #dce4d6',
                    background: isSelected
                      ? '#f1f8f3'
                      : isLockedOnDevice
                      ? '#fafbfa'
                      : '#ffffff',
                    opacity: isLockedOnDevice ? 0.65 : 1,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 3px 10px #28695914' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                        fontSize: '11px',
                      }}
                    >
                      {u.avatar}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#273f3b',
                          fontWeight: isSelected ? 700 : 600,
                          lineHeight: 1.2,
                        }}
                      >
                        {u.displayName}
                      </div>
                      <div style={{ fontSize: '10px', color: '#7a8c7e', lineHeight: 1.1 }}>
                        {u.role === 'Teacher' ? 'Teacher' : 'Student'}
                      </div>
                    </div>
                  </div>

                  {isLockedOnDevice ? (
                    <Lock size={13} color="#9ea8a0" />
                  ) : isSelected ? (
                    <CheckCircle2 size={15} color="#286959" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit}>
          {/* Selected user indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8faf6',
              border: '1px solid #e2ebd8',
              borderRadius: '9px',
              padding: '8px 12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={15} color="#456854" />
              <span style={{ fontSize: '12px', color: '#334c3e' }}>
                Signing in as <strong>{selectedUser.displayName}</strong>
              </span>
            </div>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 7px',
                borderRadius: '4px',
                background: selectedUser.role === 'Teacher' ? '#e1ebe0' : '#f3e8dc',
                color: selectedUser.role === 'Teacher' ? '#255e3a' : '#805b3e',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {selectedUser.role}
            </span>
          </div>

          {/* Password field */}
          <div style={{ marginBottom: '22px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#3e5246',
                marginBottom: '6px',
              }}
            >
              Password
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: '1px solid #cfdad0',
                borderRadius: '9px',
                padding: '0 12px',
                background: '#ffffff',
                transition: 'border 0.2s',
              }}
            >
              <Lock size={16} color="#8a998c" />
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`Enter password for ${selectedUser.displayName}`}
                autoComplete="current-password"
                autoCapitalize="none"
                style={{
                  border: 0,
                  padding: '12px 0',
                  outline: 'none',
                  background: 'none',
                  width: '100%',
                  fontSize: '13px',
                  color: '#273f3b',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  background: 'none',
                  border: 0,
                  padding: '4px',
                  cursor: 'pointer',
                  color: '#8a998c',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            className="primary"
            type="submit"
            disabled={busy || !password.trim()}
            style={{
              width: '100%',
              padding: '13px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: '9px',
            }}
          >
            {busy ? (
              'Signing In…'
            ) : (
              <>
                Sign In as {selectedUser.displayName} <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* FOOTER INFO: 30-Day session and Device policy */}
        <div
          style={{
            marginTop: '22px',
            paddingTop: '16px',
            borderTop: '1px solid #edf0e9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: '#53705d',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <ShieldCheck size={13} color="#2e7355" />
            Keeps you logged in for 30 days
          </span>

          {boundUsername && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setTeacherTargetUser(CLASSROOM_USERS[0]);
                setTeacherModalError('');
                setTeacherPassword('');
                setShowTeacherModal(true);
              }}
              style={{
                fontSize: '11px',
                color: '#587361',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <KeyRound size={12} /> Teacher Unlock
            </button>
          )}
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
                  width: '44px',
                  height: '44px',
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
                  : `Enter Teacher password to unlock and switch device to ${teacherTargetUser?.displayName}.`}
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
