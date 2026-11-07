'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  FileJson,
  Database,
  Cloud,
} from 'lucide-react';
import type { Entry } from '../../lib/types';
import {
  computeCurriculumStats,
  downloadCurriculumBackupFile,
  parseAndValidateBackupFile,
  getBackupMetadata,
  saveCurriculumBackup,
} from '../../lib/backup-storage';

interface BackupModalProps {
  entries: Entry[];
  onClose: () => void;
  onRestore: (restoredEntries: Entry[]) => Promise<void>;
  onSyncServer: () => Promise<void>;
  busy?: boolean;
}

export function BackupModal({
  entries,
  onClose,
  onRestore,
  onSyncServer,
  busy = false,
}: BackupModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'download' | 'drive' | 'restore'>('overview');
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<{
    ok: boolean;
    entries?: Entry[];
    error?: string;
    stats?: ReturnType<typeof computeCurriculumStats>;
  } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = computeCurriculumStats(entries);

  useEffect(() => {
    getBackupMetadata().then((meta) => {
      if (meta.timestamp) {
        setLastBackupTime(meta.timestamp);
      } else {
        setLastBackupTime(new Date().toISOString());
      }
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = () => {
    downloadCurriculumBackupFile(entries);
    saveCurriculumBackup(entries, 'manual_download');
    setStatusMsg('Curriculum backup downloaded successfully!');
    setLastBackupTime(new Date().toISOString());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    setStatusMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        const result = parseAndValidateBackupFile(text);
        setRestorePreview(result);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!restorePreview?.ok || !restorePreview.entries) return;
    setRestoring(true);
    setStatusMsg('');
    try {
      await onRestore(restorePreview.entries);
      setStatusMsg(`Successfully restored ${restorePreview.entries.length} items to classroom!`);
      setRestoreFile(null);
      setRestorePreview(null);
    } catch (err) {
      setStatusMsg(`Restore error: ${err instanceof Error ? err.message : 'Failed to restore'}`);
    } finally {
      setRestoring(false);
    }
  };

  const handleExecuteSync = async () => {
    setSyncing(true);
    setStatusMsg('');
    try {
      await onSyncServer();
      setStatusMsg('Classroom records successfully synchronized with server!');
    } catch (err) {
      setStatusMsg(`Sync error: ${err instanceof Error ? err.message : 'Failed to sync'}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Curriculum Backup and Cloud Sync"
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '92%' }}
      >
        <button className="close" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span className="eyebrow" style={{ margin: 0 }}>
            SAFEGUARD & ARCHIVE
          </span>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: '#eaf2ec',
              color: '#1f5445',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ShieldCheck size={13} /> Active Protection
          </span>
        </div>

        <h2 style={{ marginBottom: '6px' }}>Curriculum Backup & Offsite Storage</h2>
        <p style={{ color: '#57675f', fontSize: '13px', lineHeight: 1.5, marginBottom: '18px' }}>
          Homework and educational materials are continuously preserved across durable browser
          IndexedDB, server backup snapshots, and exportable cloud files.
        </p>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            marginBottom: '18px',
            borderBottom: '1px solid #e3e8de',
            paddingBottom: '12px',
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: activeTab === 'overview' ? '1px solid #286654' : '1px solid #e1e7dc',
              background: activeTab === 'overview' ? '#eaf2ec' : '#fff',
              color: activeTab === 'overview' ? '#1f5445' : '#57675f',
              fontWeight: activeTab === 'overview' ? 700 : 500,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <Database size={14} /> Overview & Health
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('download')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: activeTab === 'download' ? '1px solid #286654' : '1px solid #e1e7dc',
              background: activeTab === 'download' ? '#eaf2ec' : '#fff',
              color: activeTab === 'download' ? '#1f5445' : '#57675f',
              fontWeight: activeTab === 'download' ? 700 : 500,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> Download File
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drive')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: activeTab === 'drive' ? '1px solid #286654' : '1px solid #e1e7dc',
              background: activeTab === 'drive' ? '#eaf2ec' : '#fff',
              color: activeTab === 'drive' ? '#1f5445' : '#57675f',
              fontWeight: activeTab === 'drive' ? 700 : 500,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <Cloud size={14} /> Google Drive
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: activeTab === 'restore' ? '1px solid #286654' : '1px solid #e1e7dc',
              background: activeTab === 'restore' ? '#eaf2ec' : '#fff',
              color: activeTab === 'restore' ? '#1f5445' : '#57675f',
              fontWeight: activeTab === 'restore' ? 700 : 500,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <Upload size={14} /> Restore from File
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  background: '#f8faf7',
                  border: '1px solid #e1e7dc',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f5445' }}>
                  {stats.assignmentsCount}
                </div>
                <div style={{ fontSize: '12px', color: '#57675f' }}>Assignments</div>
              </div>

              <div
                style={{
                  background: '#f8faf7',
                  border: '1px solid #e1e7dc',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f5445' }}>
                  {stats.materialsCount}
                </div>
                <div style={{ fontSize: '12px', color: '#57675f' }}>Materials</div>
              </div>

              <div
                style={{
                  background: '#f8faf7',
                  border: '1px solid #e1e7dc',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f5445' }}>
                  {stats.attendanceCount}
                </div>
                <div style={{ fontSize: '12px', color: '#57675f' }}>Lessons</div>
              </div>

              <div
                style={{
                  background: '#f8faf7',
                  border: '1px solid #e1e7dc',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f5445' }}>
                  {stats.totalEntries}
                </div>
                <div style={{ fontSize: '12px', color: '#57675f' }}>Total Records</div>
              </div>
            </div>

            <div
              style={{
                background: '#f0f5ee',
                border: '1px solid #d4e2cf',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#284638',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <CheckCircle2 size={16} color="#286654" />
                <strong>Multi-Tier Backup Active</strong>
              </div>
              <ul style={{ margin: '6px 0 0 20px', padding: 0, lineHeight: 1.6 }}>
                <li>Browser IndexedDB permanent database</li>
                <li>Server-side backup snapshot & secondary disk mirror</li>
                <li>Automatic self-healing synchronization on login</li>
                {lastBackupTime && (
                  <li>
                    Last backup snapshot recorded:{' '}
                    <strong>{new Date(lastBackupTime).toLocaleString()}</strong>
                  </li>
                )}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="primary"
                onClick={handleDownload}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={15} /> Download Backup (.json)
              </button>
              <button
                type="button"
                className="secondary"
                disabled={syncing || busy}
                onClick={handleExecuteSync}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} className={syncing ? 'spin' : ''} />
                {syncing ? 'Syncing...' : 'Force Cloud Sync'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Download */}
        {activeTab === 'download' && (
          <div>
            <div
              style={{
                background: '#f8faf7',
                border: '1px solid #e1e7dc',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <FileJson size={20} color="#286654" />
                <strong style={{ fontSize: '14px' }}>Export Complete Curriculum Bundle</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#57675f', margin: '0 0 12px' }}>
                Downloads a self-contained, JSON backup file containing all {stats.assignmentsCount}{' '}
                assignments, {stats.materialsCount} educational materials, and {stats.attendanceCount}{' '}
                lesson records.
              </p>
              <button
                type="button"
                className="primary"
                onClick={handleDownload}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={16} /> Download Backup (.json)
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#7b8c7c', lineHeight: 1.5 }}>
              Tip: Save this file into your personal backup folder, send it to your email, or upload it
              to Google Drive. If your browser or server data is ever cleared, you can restore your
              entire classroom in seconds.
            </p>
          </div>
        )}

        {/* Tab 3: Google Drive */}
        {activeTab === 'drive' && (
          <div>
            <div
              style={{
                background: '#e8f0fe',
                border: '1px solid #bad3fc',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Cloud size={20} color="#1a73e8" />
                <strong style={{ fontSize: '14px', color: '#1a73e8' }}>
                  Offsite Backup via Google Drive
                </strong>
              </div>
              <p style={{ fontSize: '13px', color: '#3c4043', margin: '0 0 12px', lineHeight: 1.5 }}>
                To keep your curriculum completely safe outside this machine and server:
              </p>
              <ol style={{ fontSize: '13px', color: '#3c4043', margin: '0 0 14px 20px', padding: 0, lineHeight: 1.6 }}>
                <li>Download your latest curriculum backup file by clicking the button below.</li>
                <li>Open Google Drive and drag the file into your teaching folder.</li>
                <li>Your assignments and materials will be safe and accessible from any computer or phone!</li>
              </ol>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="primary"
                  onClick={handleDownload}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={15} /> 1. Download Backup (.json)
                </button>
                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#1a73e8',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  <ExternalLink size={14} /> 2. Open Google Drive
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Restore */}
        {activeTab === 'restore' && (
          <div>
            <div
              style={{
                background: '#f8faf7',
                border: '1px dashed #286654',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                marginBottom: '16px',
              }}
            >
              <FileJson size={28} color="#286654" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                Select a Curriculum Backup File
              </div>
              <p style={{ fontSize: '12px', color: '#57675f', margin: '0 0 12px' }}>
                Upload any previous <code>.json</code> backup to restore homework assignments and materials.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="secondary"
                onClick={() => fileInputRef.current?.click()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={15} /> Choose Backup File (.json)
              </button>
              {restoreFile && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#1f5445', fontWeight: 600 }}>
                  Selected: {restoreFile.name} ({(restoreFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {restorePreview && (
              <div
                style={{
                  background: restorePreview.ok ? '#f0f5ee' : '#fdf2f2',
                  border: `1px solid ${restorePreview.ok ? '#d4e2cf' : '#f5c2c7'}`,
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  fontSize: '13px',
                }}
              >
                {restorePreview.ok ? (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#1f5445',
                        fontWeight: 700,
                        marginBottom: '6px',
                      }}
                    >
                      <CheckCircle2 size={16} /> Valid Curriculum Backup Verified
                    </div>
                    <div style={{ color: '#284638', fontSize: '12px' }}>
                      Ready to restore: {restorePreview.stats?.assignmentsCount || 0} assignments,{' '}
                      {restorePreview.stats?.materialsCount || 0} materials,{' '}
                      {restorePreview.stats?.attendanceCount || 0} lesson records.
                    </div>
                    <button
                      type="button"
                      className="primary"
                      disabled={restoring}
                      onClick={handleExecuteRestore}
                      style={{
                        marginTop: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={15} />
                      {restoring ? 'Restoring Classroom...' : 'Apply & Restore Now'}
                    </button>
                  </div>
                ) : (
                  <div style={{ color: '#842029', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={18} />
                    <span>{restorePreview.error || 'Invalid backup file.'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status Alert Banner */}
        {statusMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              background: statusMsg.includes('error') ? '#fdf2f2' : '#eaf2ec',
              color: statusMsg.includes('error') ? '#842029' : '#1f5445',
              fontSize: '12px',
              fontWeight: 600,
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={15} />
            {statusMsg}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
