'use client';

import React, { useState } from 'react';
import { NotebookPen, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import type { ClassroomUser } from '../../lib/auth-types';
import { CLASSROOM_USERS } from '../../lib/auth-types';

interface LoginViewProps {
  onLoginSuccess: (user: ClassroomUser) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleQuickFill = (u: ClassroomUser) => {
    setUsername(u.username);
    setPassword(u.password);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; user?: ClassroomUser };

      if (!res.ok || !data.ok || !data.user) {
        throw new Error(data.error || 'Invalid credentials');
      }

      onLoginSuccess(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setBusy(false);
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
          maxWidth: '430px',
          background: '#ffffff',
          border: '1px solid #e5ebe1',
          borderRadius: '18px',
          padding: '36px 32px',
          boxShadow: '0 12px 40px #244b360d',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '46px',
              height: '52px',
              background: '#286959',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '14px',
              margin: '0 auto 14px',
              transform: 'rotate(-6deg)',
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
          <p style={{ fontSize: '13px', color: '#748378' }}>
            Sign in with your username and password
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#3e5246',
                marginBottom: '6px',
              }}
            >
              Username
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: '1px solid #d9e2d5',
                borderRadius: '8px',
                padding: '0 12px',
                background: '#fafbf9',
              }}
            >
              <User size={16} color="#8a998c" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="teacher, hajun, mark, or juwon"
                autoCapitalize="none"
                style={{
                  border: 0,
                  padding: '12px 0',
                  outline: 'none',
                  background: 'none',
                  width: '100%',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

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
                border: '1px solid #d9e2d5',
                borderRadius: '8px',
                padding: '0 12px',
                background: '#fafbf9',
              }}
            >
              <Lock size={16} color="#8a998c" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  border: 0,
                  padding: '12px 0',
                  outline: 'none',
                  background: 'none',
                  width: '100%',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <button
            className="primary"
            type="submit"
            disabled={busy || !username || !password}
            style={{ width: '100%', padding: '13px', fontSize: '13px', gap: '8px' }}
          >
            {busy ? 'Signing In…' : 'Sign In'} <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Demo Access Pills */}
        <div
          style={{
            marginTop: '26px',
            paddingTop: '20px',
            borderTop: '1px solid #edf0e9',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '11px', color: '#7b8c7c', fontWeight: 600 }}>
              <Sparkles size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Quick
              Select:
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {CLASSROOM_USERS.map((u) => (
              <button
                key={u.username}
                type="button"
                onClick={() => handleQuickFill(u)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '7px',
                  border: '1px solid #e1e7dc',
                  background: '#f8faf6',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
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
                <span style={{ fontSize: '11px', color: '#33473c', fontWeight: 600 }}>
                  {u.displayName}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
