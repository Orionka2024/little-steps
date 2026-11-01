'use client';

import React, { useState } from 'react';
import {
  Compass,
  Calendar,
  BookOpen,
  ExternalLink,
  Award,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ShieldCheck,
  Layers,
  GraduationCap,
} from 'lucide-react';
import type { Role, AssignmentEntry } from '../../lib/types';

interface RoadmapViewProps {
  role: Role;
  onOpenAssignment?: (assignment: AssignmentEntry) => void;
  diagnosticAssignment?: AssignmentEntry;
  onNavigate?: (pageName: string) => void;
}

export function RoadmapView({
  role,
  onOpenAssignment,
  diagnosticAssignment,
  onNavigate,
}: RoadmapViewProps) {
  const [activeTab, setActiveTab] = useState<'roadmap' | 'tips' | 'exercises' | 'levels'>('roadmap');

  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">TEACHER’S COMPASS & COMPETITION PLAYBOOK</div>
        <h1>
          Writing Roadmap & Teacher Guide <span className="wave">✦</span>
        </h1>
        <p>
          A structured 16-week progression from diagnostic writing to international competition-ready essays.
        </p>
      </div>

      <div className="tabs toolbar" style={{ marginBottom: '24px' }}>
        <button
          className={activeTab === 'roadmap' ? 'active' : ''}
          onClick={() => setActiveTab('roadmap')}
        >
          <Calendar size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
          16-Week Roadmap
        </button>
        <button
          className={activeTab === 'tips' ? 'active' : ''}
          onClick={() => setActiveTab('tips')}
        >
          <Lightbulb size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
          Teacher’s Tips & Routines
        </button>
        <button
          className={activeTab === 'exercises' ? 'active' : ''}
          onClick={() => setActiveTab('exercises')}
        >
          <BookOpen size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
          Curated Exercises & Official Links
        </button>
        <button
          className={activeTab === 'levels' ? 'active' : ''}
          onClick={() => setActiveTab('levels')}
        >
          <GraduationCap size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
          CEFR Levels & 25pt Rubric
        </button>
      </div>

      {/* TAB 1: 16-WEEK ROADMAP */}
      {activeTab === 'roadmap' && (
        <div style={{ display: 'grid', gap: '22px' }}>
          <div
            style={{
              background: '#f4f8f2',
              border: '1px solid #dce8d6',
              borderRadius: '14px',
              padding: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  color: '#286654',
                  textTransform: 'uppercase',
                }}
              >
                ★ Assessment Cadence Reminder
              </span>
              <h3 style={{ margin: '6px 0', fontSize: '18px', color: '#273f3b' }}>
                Assess in Weeks 1, 4, 8, 12, and 16
              </h3>
              <p style={{ fontSize: '12px', color: '#5b6e61', margin: 0, maxWidth: '640px' }}>
                Always keep both their <strong>first draft</strong> and <strong>revised draft</strong>. Give each
                student only <strong>two major improvement targets</strong> at a time.
              </p>
            </div>
            {diagnosticAssignment && onOpenAssignment && (
              <button
                className="primary"
                onClick={() => onOpenAssignment(diagnosticAssignment)}
                style={{ whiteSpace: 'nowrap' }}
              >
                Start Week 1 Diagnostic <ArrowRight size={15} />
              </button>
            )}
          </div>

          {/* STAGE 1 */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e1e7dc',
              borderRadius: '13px',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span
                style={{
                  background: '#e8f3ea',
                  color: '#286654',
                  fontWeight: 800,
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                }}
              >
                STAGE 1 · WEEKS 1–4
              </span>
              <h3 style={{ fontSize: '17px', color: '#273f3b', margin: 0 }}>
                Diagnostic & Foundational Sentence Craft
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#68776d', marginBottom: '16px' }}>
              <strong>Target Milestone:</strong> A well-developed, original 150-word piece with confident sentence
              boundaries.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div
                style={{
                  background: '#fafbf9',
                  border: '1px solid #ebf0e6',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <strong style={{ fontSize: '13px', color: '#273f3b', display: 'block', marginBottom: '4px' }}>
                  Week 1: Diagnostic Assessment
                </strong>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: '0 0 8px' }}>
                  Prompt: <em>"If you could change one rule in your school, what would it be and why?"</em> (10 min
                  brainstorm, 20 min write).
                </p>
                <small style={{ fontSize: '10px', color: '#286654', fontWeight: 600 }}>
                  ✓ Run baseline 25-point Scorecard & select 2 target skills.
                </small>
              </div>

              <div
                style={{
                  background: '#fafbf9',
                  border: '1px solid #ebf0e6',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <strong style={{ fontSize: '13px', color: '#273f3b', display: 'block', marginBottom: '4px' }}>
                  Weeks 2–3: Great Writing Units 1 & 2
                </strong>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: '0 0 8px' }}>
                  Teach thinking before vocabulary. Practice complete sentences, avoiding run-ons, and simple topic
                  sentences.
                </p>
                <small style={{ fontSize: '10px', color: '#7a867e' }}>
                  Oral brainstorms before writing; short 100-word sprints.
                </small>
              </div>

              <div
                style={{
                  background: '#fafbf9',
                  border: '1px solid #ebf0e6',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <strong style={{ fontSize: '13px', color: '#273f3b', display: 'block', marginBottom: '4px' }}>
                  Week 4: Benchmark Assessment #1
                </strong>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: '0 0 8px' }}>
                  150-word piece: <em>"A place that feels like home"</em> (Descriptive). Compare first draft with
                  revised draft.
                </p>
                <small style={{ fontSize: '10px', color: '#286654', fontWeight: 600 }}>
                  ✓ Scorecard re-assessment: Measure progress on the 2 initial targets.
                </small>
              </div>
            </div>
          </div>

          {/* STAGE 2 */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e1e7dc',
              borderRadius: '13px',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span
                style={{
                  background: '#eaf1f7',
                  color: '#28587d',
                  fontWeight: 800,
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                }}
              >
                STAGE 2 · WEEKS 5–8
              </span>
              <h3 style={{ fontSize: '17px', color: '#273f3b', margin: 0 }}>
                Paragraph Architecture & Development
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#68776d', marginBottom: '16px' }}>
              <strong>Target Milestone:</strong> 180-word connected essay with clear paragraph transitions and concrete
              evidence.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div
                style={{
                  background: '#fafbf9',
                  border: '1px solid #ebf0e6',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <strong style={{ fontSize: '13px', color: '#273f3b', display: 'block', marginBottom: '4px' }}>
                  Weeks 5–6: Weekly Model Text Analysis
                </strong>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: '0 0 8px' }}>
                  Study short award-winning extracts. Ask: <em>What makes this opening effective? How is the argument
                  supported?</em>
                </p>
                <small style={{ fontSize: '10px', color: '#7a867e' }}>
                  Focus: Great Writing Unit 3 (Cause & Effect / Reasons).
                </small>
              </div>

              <div
                style={{
                  background: '#fafbf9',
                  border: '1px solid #ebf0e6',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <strong style={{ fontSize: '13px', color: '#273f3b', display: 'block', marginBottom: '4px' }}>
                  Week 7: Evidence & Examples
                </strong>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: '0 0 8px' }}>
                  Moving past general claims. Teach "For instance", "Specifically", and sensory descriptions.
                </p>
                <small style={{ fontSize: '10px', color: '#7a867e' }}>
                  Prompt: <em>"Should every school have a garden?"</em>
                </small>
              </div>

              <div
                style={{
                  background: '#fafbf9',
                  border: '1px solid #ebf0e6',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <strong style={{ fontSize: '13px', color: '#273f3b', display: 'block', marginBottom: '4px' }}>
                  Week 8: Benchmark Assessment #2
                </strong>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: '0 0 8px' }}>
                  Mid-term scorecard review. Assess structure and development. Select 2 fresh targeted skills.
                </p>
                <small style={{ fontSize: '10px', color: '#286654', fontWeight: 600 }}>
                  ✓ Update 25-point Scorecard & celebrate growth.
                </small>
              </div>
            </div>
          </div>

          {/* STAGE 3 */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e1e7dc',
              borderRadius: '13px',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span
                style={{
                  background: '#f6ecf7',
                  color: '#712b7a',
                  fontWeight: 800,
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                }}
              >
                STAGE 3 · WEEKS 9–12
              </span>
              <h3 style={{ fontSize: '17px', color: '#273f3b', margin: 0 }}>
                Style, Voice & Varied Structures
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#68776d', marginBottom: '16px' }}>
              <strong>Target Milestone:</strong> 220 words with authentic personal voice and varied sentence rhythms
              (compound/complex).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div
                style={{
                  background: '#fafbf9',
                  border: '1px solid #ebf0e6',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <strong style={{ fontSize: '13px', color: '#273f3b', display: 'block', marginBottom: '4px' }}>
                  Weeks 9–10: Breaking Formulaic Writing
                </strong>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: '0 0 8px' }}>
                  Avoid teaching only one essay template. Compare persuasive, reflective, and creative story
                  structures.
                </p>
                <small style={{ fontSize: '10px', color: '#7a867e' }}>
                  Focus: Protecting individual student voice; avoiding clichés.
                </small>
              </div>

              <div
                style={{
                  background: '#fafbf9',
                  border: '1px solid #ebf0e6',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <strong style={{ fontSize: '13px', color: '#273f3b', display: 'block', marginBottom: '4px' }}>
                  Week 11: Sentence Variety & Rhythm
                </strong>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: '0 0 8px' }}>
                  Mixing short impactful sentences with descriptive complex clauses. Conjunctions & transitions.
                </p>
                <small style={{ fontSize: '10px', color: '#7a867e' }}>
                  Cambridge B1 level connectors: <em>Although, Whereas, In contrast</em>.
                </small>
              </div>

              <div
                style={{
                  background: '#fafbf9',
                  border: '1px solid #ebf0e6',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <strong style={{ fontSize: '13px', color: '#273f3b', display: 'block', marginBottom: '4px' }}>
                  Week 12: Benchmark Assessment #3
                </strong>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: '0 0 8px' }}>
                  Timed Competition Simulation (35 minutes, 220–250 words). Full assessment with competition rubric.
                </p>
                <small style={{ fontSize: '10px', color: '#286654', fontWeight: 600 }}>
                  ✓ Benchmark #3 Scorecard. Pinpoint final competition targets.
                </small>
              </div>
            </div>
          </div>

          {/* STAGE 4 */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e1e7dc',
              borderRadius: '13px',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span
                style={{
                  background: '#fdf3de',
                  color: '#8c6710',
                  fontWeight: 800,
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                }}
              >
                STAGE 4 · WEEKS 13–16
              </span>
              <h3 style={{ fontSize: '17px', color: '#273f3b', margin: 0 }}>
                Competition Simulation, Revision & Polish
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#68776d', marginBottom: '16px' }}>
              <strong>Target Milestone:</strong> 250+ word competition submission meeting strict word limits, original
              voice, and impeccable accuracy.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div
                style={{
                  background: '#fafbf9',
                  border: '1px solid #ebf0e6',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <strong style={{ fontSize: '13px', color: '#273f3b', display: 'block', marginBottom: '4px' }}>
                  Weeks 13–14: Two-Pass Revision Mastery
                </strong>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: '0 0 8px' }}>
                  Pass 1: Revise content, argument flow, and paragraph transitions.<br />
                  Pass 2: Punctuation, spelling, and precision vocabulary.
                </p>
                <small style={{ fontSize: '10px', color: '#7a867e' }}>
                  Students edit their own drafts; teacher provides guiding questions, not rewrites.
                </small>
              </div>

              <div
                style={{
                  background: '#fafbf9',
                  border: '1px solid #ebf0e6',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <strong style={{ fontSize: '13px', color: '#273f3b', display: 'block', marginBottom: '4px' }}>
                  Week 15: Ethics & AI/Assistance Check
                </strong>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: '0 0 8px' }}>
                  Ensure 100% adherence to competition guidelines on adult help and AI tools. Verify child’s authentic
                  expression.
                </p>
                <small style={{ fontSize: '10px', color: '#7a867e' }}>
                  Authentic voice always outperforms over-polished artificial text.
                </small>
              </div>

              <div
                style={{
                  background: '#fafbf9',
                  border: '1px solid #ebf0e6',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <strong style={{ fontSize: '13px', color: '#273f3b', display: 'block', marginBottom: '4px' }}>
                  Week 16: Final Showcase & Portfolio
                </strong>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: '0 0 8px' }}>
                  Final 25-point evaluation. Side-by-side comparison of Week 1 diagnostic vs. Week 16 competition entry.
                </p>
                <small style={{ fontSize: '10px', color: '#286654', fontWeight: 600 }}>
                  ✓ Final Competition Scorecard & Certificate of Growth.
                </small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEACHER'S 6 TIPS */}
      {activeTab === 'tips' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e1e7dc',
              borderRadius: '13px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  background: '#286654',
                  color: '#fff',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                1
              </span>
              <h3 style={{ fontSize: '16px', color: '#273f3b', margin: 0 }}>
                Teach thinking before vocabulary
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#5f6f64', lineHeight: 1.7, margin: '6px 0 10px' }}>
              A simple but thoughtful argument is infinitely better than a paragraph packed with impressive words
              without meaning. Judges in international competitions quickly spot thesaurus-stuffing.
            </p>
            <div
              style={{
                background: '#fafbf8',
                borderLeft: '3px solid #286654',
                padding: '8px 12px',
                fontSize: '11px',
                color: '#3d4d42',
              }}
            >
              <strong>Classroom Action:</strong> Ask students: <em>"What do you really mean here? If you had to explain
              this to your best friend on the playground, what would you say?"</em> Then capture those authentic words.
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e1e7dc',
              borderRadius: '13px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  background: '#286654',
                  color: '#fff',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                2
              </span>
              <h3 style={{ fontSize: '16px', color: '#273f3b', margin: 0 }}>
                Read short model texts every week
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#5f6f64', lineHeight: 1.7, margin: '6px 0 10px' }}>
              Children learn craft by imitation and analysis. Don't just assign an essay—read a 100-word excerpt
              together first.
            </p>
            <div
              style={{
                background: '#fafbf8',
                borderLeft: '3px solid #286654',
                padding: '8px 12px',
                fontSize: '11px',
                color: '#3d4d42',
              }}
            >
              <strong>The 3-Question Routine:</strong>
              <br />
              1. <em>What makes this opening effective?</em>
              <br />
              2. <em>How does the author support their central idea?</em>
              <br />
              3. <em>What single phrase would I change or polish?</em>
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e1e7dc',
              borderRadius: '13px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  background: '#286654',
                  color: '#fff',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                3
              </span>
              <h3 style={{ fontSize: '16px', color: '#273f3b', margin: 0 }}>
                Use discussion before writing ("Talk it, then jot it")
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#5f6f64', lineHeight: 1.7, margin: '6px 0 10px' }}>
              Children often develop substantially better arguments when they have first explained their ideas aloud.
              Speaking clarifies logic, reveals weak points, and builds confidence.
            </p>
            <div
              style={{
                background: '#fafbf8',
                borderLeft: '3px solid #286654',
                padding: '8px 12px',
                fontSize: '11px',
                color: '#3d4d42',
              }}
            >
              <strong>Classroom Action:</strong> 3-minute partner pitch before drafting. If a student gets stuck on
              sentence 1, have them close their eyes and explain what they picture to the teacher.
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e1e7dc',
              borderRadius: '13px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  background: '#286654',
                  color: '#fff',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                4
              </span>
              <h3 style={{ fontSize: '16px', color: '#273f3b', margin: 0 }}>
                Teach revision as a separate skill (Two-Pass Protocol)
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#5f6f64', lineHeight: 1.7, margin: '6px 0 10px' }}>
              Never ask students to fix spelling and rearrange paragraphs at the same time. Content revision and
              mechanical proofreading use two completely different modes of thinking.
            </p>
            <div
              style={{
                background: '#fafbf8',
                borderLeft: '3px solid #286654',
                padding: '8px 12px',
                fontSize: '11px',
                color: '#3d4d42',
              }}
            >
              <strong>Two-Pass Protocol:</strong>
              <br />
              • <strong>Pass 1 (Content & Flow):</strong> Strengthen the opening, check paragraph transitions, add 1
              concrete example.
              <br />
              • <strong>Pass 2 (Mechanics & Accuracy):</strong> Capital letters, punctuation, spelling checks, and
              word variety.
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e1e7dc',
              borderRadius: '13px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  background: '#286654',
                  color: '#fff',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                5
              </span>
              <h3 style={{ fontSize: '16px', color: '#273f3b', margin: 0 }}>
                Avoid teaching only one essay formula
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#5f6f64', lineHeight: 1.7, margin: '6px 0 10px' }}>
              Rigid formulas like the 5-paragraph hamburger essay produce wooden, predictable writing. Different
              competition prompts demand different architectural forms:
            </p>
            <div
              style={{
                background: '#fafbf8',
                borderLeft: '3px solid #286654',
                padding: '8px 12px',
                fontSize: '11px',
                color: '#3d4d42',
              }}
            >
              • <strong>Persuasive:</strong> Hook $\rightarrow$ Clear opinion $\rightarrow$ 2 Reasons with evidence $\rightarrow$ Counterpoint $\rightarrow$ Memorable conclusion.
              <br />
              • <strong>Reflective:</strong> Moment in time $\rightarrow$ Inner feelings $\rightarrow$ Shift in thinking $\rightarrow$ Life takeaway.
              <br />
              • <strong>Narrative:</strong> Immersive setting $\rightarrow$ Complication $\rightarrow$ Climax $\rightarrow$ Resolution.
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e1e7dc',
              borderRadius: '13px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  background: '#286654',
                  color: '#fff',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                6
              </span>
              <h3 style={{ fontSize: '16px', color: '#273f3b', margin: 0 }}>
                Protect children’s individual voices
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#5f6f64', lineHeight: 1.7, margin: '6px 0 10px' }}>
              Give feedback, questions, and guidance, but resist rewriting competition entries for the student. Always
              check each competition’s explicit rules on adult assistance and AI tool usage.
            </p>
            <div
              style={{
                background: '#fafbf8',
                borderLeft: '3px solid #286654',
                padding: '8px 12px',
                fontSize: '11px',
                color: '#3d4d42',
              }}
            >
              <strong>Oxford Owl Guidance (Ages 10–11):</strong> Emphasize planning for an audience, choosing
              appropriate register, and revising work independently. A genuine child's voice with vivid thoughts wins
              over sanitized adult prose.
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CURATED EXERCISES & OFFICIAL LINKS */}
      {activeTab === 'exercises' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <p style={{ fontSize: '12px', color: '#6a786f', margin: '0 0 8px' }}>
            Authoritative, official materials and exercises mapped directly to the 5 rubric criteria:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            {/* Cambridge A2 Flyers */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e1e7dc',
                borderRadius: '12px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: '9px',
                      background: '#e8f3ea',
                      color: '#286654',
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: '5px',
                    }}
                  >
                    CEFR A2 · CAMBRIDGE
                  </span>
                  <ExternalLink size={14} color="#7b8a7f" />
                </div>
                <h4 style={{ fontSize: '15px', color: '#273f3b', margin: '10px 0 6px' }}>
                  Cambridge A2 Flyers Writing Format
                </h4>
                <p style={{ fontSize: '11px', color: '#68776d', lineHeight: 1.6, margin: 0 }}>
                  Picture-based storytelling, sentence linking, and foundational paragraph construction. Ideal for
                  students solidifying narrative sequencing.
                </p>
              </div>
              <a
                href="https://www.cambridgeenglish.org/exams-and-tests/qualifications/young-learners/paper/flyers/format/"
                target="_blank"
                rel="noreferrer"
                className="text-button"
                style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                Open Cambridge A2 Format Guide <ArrowRight size={13} />
              </a>
            </div>

            {/* Cambridge B1 Writing Assessment */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e1e7dc',
                borderRadius: '12px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: '9px',
                      background: '#eaf1f7',
                      color: '#28587d',
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: '5px',
                    }}
                  >
                    CEFR B1 · CAMBRIDGE
                  </span>
                  <ExternalLink size={14} color="#7b8a7f" />
                </div>
                <h4 style={{ fontSize: '15px', color: '#273f3b', margin: '10px 0 6px' }}>
                  Cambridge B1 Writing Assessment Guide (PDF)
                </h4>
                <p style={{ fontSize: '11px', color: '#68776d', lineHeight: 1.6, margin: 0 }}>
                  Official teacher guidance with scoring criteria (Content, Communicative Achievement, Organisation,
                  Language) and authentic student samples.
                </p>
              </div>
              <a
                href="https://www.cambridgeenglish.org/images/231794-cambridge-english-assessing-writing-performance-at-level-b1.pdf"
                target="_blank"
                rel="noreferrer"
                className="text-button"
                style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                View Cambridge B1 Guide <ArrowRight size={13} />
              </a>
            </div>

            {/* Oxford Owl Primary Writing */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e1e7dc',
                borderRadius: '12px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: '9px',
                      background: '#fdf3de',
                      color: '#8c6710',
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: '5px',
                    }}
                  >
                    PRIMARY (AGES 9–11) · OXFORD
                  </span>
                  <ExternalLink size={14} color="#7b8a7f" />
                </div>
                <h4 style={{ fontSize: '15px', color: '#273f3b', margin: '10px 0 6px' }}>
                  Oxford Owl Primary Writing Guidance
                </h4>
                <p style={{ fontSize: '11px', color: '#68776d', lineHeight: 1.6, margin: 0 }}>
                  Writing development expectations, vocabulary planning, punctuation progression, and practical advice
                  for primary school learners.
                </p>
              </div>
              <a
                href="https://home.oxfordowl.co.uk/english/primary-writing/"
                target="_blank"
                rel="noreferrer"
                className="text-button"
                style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                Explore Oxford Owl Writing <ArrowRight size={13} />
              </a>
            </div>

            {/* British Council LearnEnglish Kids */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e1e7dc',
                borderRadius: '12px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: '9px',
                      background: '#e8f3ea',
                      color: '#286654',
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: '5px',
                    }}
                  >
                    EXERCISES · BRITISH COUNCIL
                  </span>
                  <ExternalLink size={14} color="#7b8a7f" />
                </div>
                <h4 style={{ fontSize: '15px', color: '#273f3b', margin: '10px 0 6px' }}>
                  British Council Writing Practice (A1–A2)
                </h4>
                <p style={{ fontSize: '11px', color: '#68776d', lineHeight: 1.6, margin: 0 }}>
                  Interactive model texts, spelling worksheets, sentence ordering, and guided short writing tasks for
                  young learners.
                </p>
              </div>
              <a
                href="https://learnenglishkids.britishcouncil.org/skills/writing"
                target="_blank"
                rel="noreferrer"
                className="text-button"
                style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                Browse British Council Exercises <ArrowRight size={13} />
              </a>
            </div>

            {/* ReadWriteThink Student Interactives */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e1e7dc',
                borderRadius: '12px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: '9px',
                      background: '#f6ecf7',
                      color: '#712b7a',
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: '5px',
                    }}
                  >
                    ORGANIZERS · READWRITETHINK
                  </span>
                  <ExternalLink size={14} color="#7b8a7f" />
                </div>
                <h4 style={{ fontSize: '15px', color: '#273f3b', margin: '10px 0 6px' }}>
                  ReadWriteThink Essay Map & Outliner
                </h4>
                <p style={{ fontSize: '11px', color: '#68776d', lineHeight: 1.6, margin: 0 }}>
                  Free interactive graphic organizer for mapping out thesis statements, main reasons, supporting
                  examples, and conclusions.
                </p>
              </div>
              <a
                href="https://www.readwritethink.org/classroom-resources/student-interactives"
                target="_blank"
                rel="noreferrer"
                className="text-button"
                style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                Launch Essay Outliner Tools <ArrowRight size={13} />
              </a>
            </div>

            {/* BBC Bitesize Primary English */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e1e7dc',
                borderRadius: '12px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: '9px',
                      background: '#fdf3de',
                      color: '#8c6710',
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: '5px',
                    }}
                  >
                    GRAMMAR & STYLE · BBC BITESIZE
                  </span>
                  <ExternalLink size={14} color="#7b8a7f" />
                </div>
                <h4 style={{ fontSize: '15px', color: '#273f3b', margin: '10px 0 6px' }}>
                  BBC Bitesize KS2 English Writing
                </h4>
                <p style={{ fontSize: '11px', color: '#68776d', lineHeight: 1.6, margin: 0 }}>
                  Interactive grammar lessons covering relative clauses, fronted adverbials, expanded noun phrases, and
                  dialogue punctuation.
                </p>
              </div>
              <a
                href="https://www.bbc.co.uk/bitesize/subjects/zv48q6f"
                target="_blank"
                rel="noreferrer"
                className="text-button"
                style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                Open BBC Bitesize Lessons <ArrowRight size={13} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CEFR LEVELS & 25-PT RUBRIC */}
      {activeTab === 'levels' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e1e7dc',
              borderRadius: '13px',
              padding: '22px',
            }}
          >
            <h3 style={{ fontSize: '17px', color: '#273f3b', marginBottom: '8px' }}>
              Adapting to Children’s Current English Level
            </h3>
            <p style={{ fontSize: '12px', color: '#68776d', marginBottom: '16px' }}>
              Diagnose each student's baseline with the Week 1 prompt, then tailor the Great Writing assignments:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#fafbf9', border: '1px solid #e8ede4', padding: '14px', borderRadius: '9px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#8c6710' }}>A1 · BEGINNER</span>
                <h4 style={{ margin: '6px 0 4px', fontSize: '14px', color: '#273f3b' }}>Sentence Builders</h4>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: 0 }}>
                  Can write simple sentences, but paragraphs are difficult. Use Great Writing Unit 1 thoroughly; focus
                  on subject-verb agreement and capitals.
                </p>
              </div>

              <div style={{ background: '#fafbf9', border: '1px solid #e8ede4', padding: '14px', borderRadius: '9px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#286654' }}>A2 · ELEMENTARY</span>
                <h4 style={{ margin: '6px 0 4px', fontSize: '14px', color: '#273f3b' }}>Short Paragraphers</h4>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: 0 }}>
                  Can write short paragraphs about familiar topics. Start Unit 2 of Great Writing; build to 150 words
                  with "because", "and", "but".
                </p>
              </div>

              <div style={{ background: '#fafbf9', border: '1px solid #e8ede4', padding: '14px', borderRadius: '9px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#28587d' }}>B1 · INTERMEDIATE</span>
                <h4 style={{ margin: '6px 0 4px', fontSize: '14px', color: '#273f3b' }}>Essay Explorers</h4>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: 0 }}>
                  Can write connected stories and explain opinions. Ready for 180–200 words, OREO structure, and
                  competition opening hooks.
                </p>
              </div>

              <div style={{ background: '#fafbf9', border: '1px solid #e8ede4', padding: '14px', borderRadius: '9px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#712b7a' }}>B2+ · ADVANCED</span>
                <h4 style={{ margin: '6px 0 4px', fontSize: '14px', color: '#273f3b' }}>Competition Contenders</h4>
                <p style={{ fontSize: '11px', color: '#5f6f64', margin: 0 }}>
                  Fluent and expressive. Focus directly on nuance, rhetorical questions, striking metaphors, and timed
                  competition simulations (250+ words).
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e1e7dc',
              borderRadius: '13px',
              padding: '22px',
            }}
          >
            <h3 style={{ fontSize: '17px', color: '#273f3b', marginBottom: '8px' }}>
              The 25-Point Scorecard Tier Breakdown
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#eaf4eb', border: '1px solid #cfebd4', padding: '14px', borderRadius: '9px' }}>
                <strong style={{ color: '#286654', fontSize: '13px' }}>21–25 Points · Competition Ready</strong>
                <p style={{ fontSize: '11px', color: '#315843', margin: '4px 0 0' }}>
                  Nuanced argument, memorable opening, varied syntactic rhythms, and strong individual voice.
                </p>
              </div>
              <div style={{ background: '#f2f8f3', border: '1px solid #d9ede0', padding: '14px', borderRadius: '9px' }}>
                <strong style={{ color: '#386f52', fontSize: '13px' }}>16–20 Points · Proficient</strong>
                <p style={{ fontSize: '11px', color: '#3a5948', margin: '4px 0 0' }}>
                  Solid paragraph structure, clear reasons, and good accuracy. Focus on deeper examples and voice.
                </p>
              </div>
              <div style={{ background: '#fff9ea', border: '1px solid #f3e3be', padding: '14px', borderRadius: '9px' }}>
                <strong style={{ color: '#8c680f', fontSize: '13px' }}>11–15 Points · Developing</strong>
                <p style={{ fontSize: '11px', color: '#685012', margin: '4px 0 0' }}>
                  Identifiable ideas and basic paragraphs. Select 2 targeted skills for focused revision.
                </p>
              </div>
              <div style={{ background: '#faeff0', border: '1px solid #ebd3d6', padding: '14px', borderRadius: '9px' }}>
                <strong style={{ color: '#9c343f', fontSize: '13px' }}>$\le$ 10 Points · Foundational</strong>
                <p style={{ fontSize: '11px', color: '#6e2b32', margin: '4px 0 0' }}>
                  Sentence fragments or run-ons. Focus on complete sentences and basic paragraph architecture.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
