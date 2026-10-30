'use client';

import React from 'react';
import { Plus, Search, ArrowUpRight } from 'lucide-react';
import type { MaterialEntry, Role } from '../../lib/types';

interface MaterialsViewProps {
  role: Role;
  resources: MaterialEntry[];
  query: string;
  onQueryChange: (newQuery: string) => void;
  onOpenResource: (resource: MaterialEntry) => void;
  onOpenCreateModal: () => void;
}

export function MaterialsView({
  role,
  resources,
  query,
  onQueryChange,
  onOpenResource,
  onOpenCreateModal,
}: MaterialsViewProps) {
  const filteredResources = resources.filter((r) =>
    `${r.title} ${r.type}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <div className="page-heading heading-row">
        <div>
          <div className="eyebrow">YOUR WRITER’S TOOLBOX</div>
          <h1>A little help along the way</h1>
          <p>Helpful guides and words to make your ideas shine.</p>
        </div>
        {role === 'Teacher' && (
          <button className="primary" onClick={onOpenCreateModal}>
            <Plus size={18} /> Add material
          </button>
        )}
      </div>

      <label className="search">
        <Search size={18} />
        <input
          placeholder="Find a guide or a word bank…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </label>

      <div className="material-grid">
        {filteredResources.map((r) => (
          <button className="material-card" key={r.id} onClick={() => onOpenResource(r)}>
            <div className={`material-art ${r.color}`}>{r.icon || '📖'}</div>
            <small>{r.type}</small>
            <h3>{r.title}</h3>
            <span className="text-button">
              Open resource <ArrowUpRight size={17} />
            </span>
          </button>
        ))}
      </div>

      {filteredResources.length === 0 && (
        <p className="empty">No resources found. Try another word.</p>
      )}
    </>
  );
}
