'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  PenTool,
  Highlighter,
  Eraser,
  Undo2,
  Trash2,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { AnnotationStroke, AnnotationPoint } from '../../lib/types';

interface AnnotationCanvasProps {
  initialData?: string;
  onSave?: (data: string) => void;
  readOnly?: boolean;
  studentName?: string;
  children: React.ReactNode;
}

const PEN_COLORS = [
  { id: 'red', label: 'Correction (Red)', color: '#dc2626' },
  { id: 'green', label: 'Praise (Green)', color: '#16a34a' },
  { id: 'blue', label: 'Suggestion (Blue)', color: '#2563eb' },
  { id: 'gold', label: 'Star / Sticker (Gold)', color: '#d97706' },
  { id: 'purple', label: 'Vocabulary (Purple)', color: '#9333ea' },
];

const PEN_SIZES = [
  { label: 'Fine', size: 2 },
  { label: 'Medium', size: 4 },
  { label: 'Bold', size: 8 },
];

export function AnnotationCanvas({
  initialData,
  onSave,
  readOnly = false,
  studentName,
  children,
}: AnnotationCanvasProps) {
  const paperAreaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [activeColor, setActiveColor] = useState<string>('#dc2626');
  const [activeSize, setActiveSize] = useState<number>(3);
  const [strokes, setStrokes] = useState<AnnotationStroke[]>(() => {
    if (!initialData) return [];
    try {
      const parsed = JSON.parse(initialData) as AnnotationStroke[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [pencilOnly, setPencilOnly] = useState<boolean>(false);
  const [penDetected, setPenDetected] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(true);

  const currentStrokeRef = useRef<AnnotationStroke | null>(null);

  // Redraw all strokes on canvas with high-DPI scaling
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const paperArea = paperAreaRef.current;
    if (!canvas || !paperArea) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = paperArea.getBoundingClientRect();

    if (rect.width > 0 && rect.height > 0) {
      const targetWidth = Math.floor(rect.width * dpr);
      const targetHeight = Math.floor(rect.height * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!visible) {
      ctx.restore();
      return;
    }

    for (const stroke of strokes) {
      if (stroke.points.length < 2) {
        if (stroke.points.length === 1) {
          const pt = stroke.points[0];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, stroke.size / 2, 0, Math.PI * 2);
          ctx.fillStyle = stroke.isHighlighter
            ? 'rgba(250, 204, 21, 0.45)'
            : stroke.color;
          ctx.fill();
        }
        continue;
      }

      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.isHighlighter) {
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
        ctx.lineWidth = stroke.size * 3;
      } else {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length - 1; i++) {
        const current = stroke.points[i];
        const next = stroke.points[i + 1];
        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;
        ctx.quadraticCurveTo(current.x, current.y, midX, midY);
      }

      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }

    ctx.restore();
  }, [strokes, visible]);

  // Keep canvas matched with container size using ResizeObserver
  useEffect(() => {
    redrawCanvas();
    const paper = paperAreaRef.current;
    if (!paper) return;

    const observer = new ResizeObserver(() => {
      redrawCanvas();
    });
    observer.observe(paper);

    window.addEventListener('resize', redrawCanvas);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', redrawCanvas);
    };
  }, [redrawCanvas]);

  // Notify parent of updated strokes
  const handleUpdateStrokes = useCallback(
    (newStrokes: AnnotationStroke[]) => {
      setStrokes(newStrokes);
      if (onSave) {
        onSave(JSON.stringify(newStrokes));
      }
    },
    [onSave]
  );

  // Undo last stroke
  const handleUndo = () => {
    if (strokes.length === 0) return;
    const updated = strokes.slice(0, -1);
    handleUpdateStrokes(updated);
  };

  // Clear all annotations
  const handleClear = () => {
    if (strokes.length === 0) return;
    if (confirm('Clear all handwritten notes and markings?')) {
      handleUpdateStrokes([]);
    }
  };

  // Distance helper for eraser
  const isNearPoint = (p1: AnnotationPoint, p2: AnnotationPoint, threshold: number) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return dx * dx + dy * dy <= threshold * threshold;
  };

  // Pointer event handlers with Apple Pencil palm-rejection
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): AnnotationPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    // Detect stylus / Apple Pencil
    if (e.pointerType === 'pen') {
      setPenDetected(true);
    }

    // Palm rejection: If pencil-only mode is active, reject all finger touches
    if (pencilOnly && e.pointerType !== 'pen') {
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const pt = getCanvasPoint(e);

    if (tool === 'eraser') {
      const threshold = 20;
      const remaining = strokes.filter(
        (st) => !st.points.some((p) => isNearPoint(p, pt, threshold))
      );
      if (remaining.length !== strokes.length) {
        handleUpdateStrokes(remaining);
      }
      return;
    }

    const newStroke: AnnotationStroke = {
      color: activeColor,
      size: activeSize,
      isHighlighter: tool === 'highlighter',
      points: [pt],
    };
    currentStrokeRef.current = newStroke;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;

    if (pencilOnly && e.pointerType !== 'pen') {
      return;
    }

    const pt = getCanvasPoint(e);

    if (tool === 'eraser') {
      const threshold = 20;
      const remaining = strokes.filter(
        (st) => !st.points.some((p) => isNearPoint(p, pt, threshold))
      );
      if (remaining.length !== strokes.length) {
        handleUpdateStrokes(remaining);
      }
      return;
    }

    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push(pt);

      // Incremental render of active stroke
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const stroke = currentStrokeRef.current;
      const pts = stroke.points;
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.isHighlighter) {
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
          ctx.lineWidth = stroke.size * 3;
        } else {
          ctx.strokeStyle = stroke.color;
          const pressure = pt.pressure || 0.5;
          ctx.lineWidth = stroke.size * (0.6 + pressure * 0.8);
        }

        const prev = pts[pts.length - 2];
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      const completed = [...strokes, currentStrokeRef.current];
      currentStrokeRef.current = null;
      handleUpdateStrokes(completed);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #d8e2d4',
        background: '#ffffff',
      }}
    >
      {/* 1. TEACHER TOOLBAR - Completely outside the canvas (zIndex: 30) */}
      {!readOnly && (
        <div
          style={{
            position: 'relative',
            zIndex: 30, // Higher than canvas to ensure all clicks register
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            background: '#ffffff',
            borderBottom: '1px solid #e2ebd8',
            padding: '10px 14px',
          }}
        >
          {/* Tool selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setTool('pen')}
              title="Pen tool"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '7px',
                border: tool === 'pen' ? '2px solid #286654' : '1px solid #d8e2d4',
                background: tool === 'pen' ? '#edf6f2' : '#ffffff',
                color: tool === 'pen' ? '#286654' : '#45594b',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <PenTool size={15} /> Pen
            </button>

            <button
              type="button"
              onClick={() => setTool('highlighter')}
              title="Highlighter tool"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '7px',
                border:
                  tool === 'highlighter' ? '2px solid #d97706' : '1px solid #d8e2d4',
                background: tool === 'highlighter' ? '#fef3c7' : '#ffffff',
                color: tool === 'highlighter' ? '#92400e' : '#45594b',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <Highlighter size={15} /> Highlight
            </button>

            <button
              type="button"
              onClick={() => setTool('eraser')}
              title="Eraser tool"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '7px',
                border: tool === 'eraser' ? '2px solid #dc2626' : '1px solid #d8e2d4',
                background: tool === 'eraser' ? '#fee2e2' : '#ffffff',
                color: tool === 'eraser' ? '#991b1b' : '#45594b',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <Eraser size={15} /> Eraser
            </button>

            {/* Color pills when pen is active */}
            {tool === 'pen' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginLeft: '4px',
                  borderLeft: '1px solid #e2ebd8',
                  paddingLeft: '10px',
                }}
              >
                {PEN_COLORS.map((c) => {
                  const isSelected = activeColor === c.color;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveColor(c.color)}
                      title={c.label}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: c.color,
                        border: isSelected
                          ? '3px solid #1c2e27'
                          : '1px solid rgba(0,0,0,0.2)',
                        boxShadow: isSelected ? '0 0 0 2px #fff' : 'none',
                        transform: isSelected ? 'scale(1.15)' : 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Thickness pills */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                borderLeft: '1px solid #e2ebd8',
                paddingLeft: '10px',
              }}
            >
              {PEN_SIZES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setActiveSize(s.size)}
                  title={`${s.label} line`}
                  style={{
                    padding: '6px 9px',
                    fontSize: '11px',
                    fontWeight: activeSize === s.size ? 700 : 500,
                    borderRadius: '6px',
                    border:
                      activeSize === s.size
                        ? '1px solid #286654'
                        : '1px solid #d8e2d4',
                    background: activeSize === s.size ? '#edf6f2' : '#fff',
                    color: activeSize === s.size ? '#286654' : '#647467',
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons: Palm rejection & Undo & Clear */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setPencilOnly(!pencilOnly)}
              title={
                pencilOnly
                  ? 'Apple Pencil Only is active: Hand/palm touch rejected'
                  : 'Tap to reject all finger/palm touches while drawing with Apple Pencil'
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: pencilOnly ? '1px solid #16a34a' : '1px solid #d8e2d4',
                background: pencilOnly ? '#f0fdf4' : '#fafbf8',
                color: pencilOnly ? '#15803d' : '#647467',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ShieldCheck size={14} color={pencilOnly ? '#16a34a' : '#88988b'} />
              {pencilOnly ? 'Pencil Only (Palm Protected)' : 'Palm Rejection'}
            </button>

            <button
              type="button"
              onClick={handleUndo}
              disabled={strokes.length === 0}
              title="Undo last stroke"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #d8e2d4',
                background: '#fff',
                color: '#55665a',
                fontSize: '11px',
                fontWeight: 600,
                cursor: strokes.length > 0 ? 'pointer' : 'not-allowed',
                opacity: strokes.length > 0 ? 1 : 0.5,
              }}
            >
              <Undo2 size={13} /> Undo
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={strokes.length === 0}
              title="Clear all strokes"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #f2cfcd',
                background: '#fff',
                color: '#b91c1c',
                fontSize: '11px',
                fontWeight: 600,
                cursor: strokes.length > 0 ? 'pointer' : 'not-allowed',
                opacity: strokes.length > 0 ? 1 : 0.5,
              }}
            >
              <Trash2 size={13} /> Clear
            </button>

            {penDetected && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '4px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                 Pencil
              </span>
            )}
          </div>
        </div>
      )}

      {/* 2. READ-ONLY STUDENT BANNER */}
      {readOnly && strokes.length > 0 && (
        <div
          style={{
            position: 'relative',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f4f8f4',
            borderBottom: '1px solid #c9dec5',
            padding: '9px 14px',
            fontSize: '12px',
            color: '#255e3a',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#16a34a" />
            <span>
              {studentName
                ? `Teacher’s handwritten comments for ${studentName}`
                : 'Teacher’s handwritten comments & markings'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              border: 'none',
              background: 'none',
              color: '#346a48',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {visible ? <EyeOff size={13} /> : <Eye size={13} />}
            {visible ? 'Hide markings' : 'Show markings'}
          </button>
        </div>
      )}

      {/* 3. DRAWING PAPER CONTAINER - Holds essay children + canvas overlay */}
      <div
        ref={paperAreaRef}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '400px',
        }}
      >
        {/* Essay Text Content (children) rendered underneath */}
        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>

        {/* Canvas strictly overlays the essay paper area, NEVER covering toolbar */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 10,
            touchAction: 'none',
            pointerEvents: readOnly ? 'none' : 'auto',
            cursor: readOnly
              ? 'default'
              : tool === 'eraser'
              ? 'crosshair'
              : tool === 'highlighter'
              ? 'cell'
              : 'crosshair',
          }}
        />
      </div>
    </div>
  );
}
