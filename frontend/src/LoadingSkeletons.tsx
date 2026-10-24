import React from 'react';

const Bone = ({ className = '' }: { className?: string }) => <div className={`ui-skeleton-bone ${className}`} aria-hidden="true" />;

export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="ui-skeleton-list" aria-label="Loading content" aria-busy="true">
    {Array.from({ length: rows }).map((_, index) => (
      <div className="ui-skeleton-row" key={index}>
        <Bone className="ui-skeleton-avatar" />
        <div className="ui-skeleton-copy">
          <Bone className="ui-skeleton-title" />
          <Bone className="ui-skeleton-line" />
          <Bone className="ui-skeleton-line ui-skeleton-line-short" />
        </div>
        <Bone className="ui-skeleton-button" />
      </div>
    ))}
  </div>
);

export const DashboardSkeleton = () => (
  <div className="ui-skeleton-dashboard" aria-label="Loading dashboard" aria-busy="true">
    <div className="ui-skeleton-stat-grid">
      {Array.from({ length: 6 }).map((_, index) => <Bone className="ui-skeleton-stat" key={index} />)}
    </div>
    <ListSkeleton rows={4} />
  </div>
);

export const ProfileSkeleton = () => (
  <div className="ui-skeleton-profile" aria-label="Loading profile" aria-busy="true">
    <div className="ui-skeleton-profile-header"><Bone className="ui-skeleton-profile-avatar" /><div><Bone className="ui-skeleton-title" /><Bone className="ui-skeleton-line" /></div></div>
    <div className="ui-skeleton-profile-grid">
      <div className="ui-skeleton-panel"><Bone className="ui-skeleton-title" />{Array.from({ length: 5 }).map((_, index) => <Bone className="ui-skeleton-field" key={index} />)}</div>
      <div className="ui-skeleton-panel"><Bone className="ui-skeleton-title" />{Array.from({ length: 3 }).map((_, index) => <Bone className="ui-skeleton-field" key={index} />)}</div>
    </div>
  </div>
);

export const CardGridSkeleton = ({ cards = 6 }: { cards?: number }) => (
  <div className="ui-skeleton-card-grid" aria-label="Loading listings" aria-busy="true">
    {Array.from({ length: cards }).map((_, index) => <div className="ui-skeleton-product" key={index}><Bone className="ui-skeleton-product-media" /><Bone className="ui-skeleton-title" /><Bone className="ui-skeleton-line" /><Bone className="ui-skeleton-button" /></div>)}
  </div>
);
