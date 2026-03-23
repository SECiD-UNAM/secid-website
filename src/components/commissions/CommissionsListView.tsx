import React from 'react';
import {
  directiveCommissions,
  horizontalCommissions,
  parentLabels,
  directionColors,
  commissionsI18n,
  boardMembers,
} from './commissions-data';
import type { Commission } from './commissions-data';

interface Props {
  lang: 'es' | 'en';
}

const DIRECTIONS = ['presidencia', 'secretaria', 'tesoreria'] as const;
type DirectionId = (typeof DIRECTIONS)[number];

function DirectionLetter({ id, color }: { id: DirectionId; color: string }) {
  const letter = id.charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: `linear-gradient(135deg, ${color}, ${color}99)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
        fontSize: 16,
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

function SubAreaTags({ tags, color }: { tags: string[]; color: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            background: `${color}12`,
            color,
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 12,
            fontWeight: 500,
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function CommissionCard({ commission, lang }: { commission: Commission; lang: 'es' | 'en' }) {
  return (
    <div
      style={{
        background: 'var(--card-bg, #1a1a1a)',
        border: `1px solid var(--color-border, #333)`,
        borderLeft: `3px solid ${commission.color}`,
        borderRadius: 10,
        padding: '0.875rem 1rem',
        marginBottom: '0.5rem',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary, #f1f1f1)' }}>
        {commission.name[lang]}
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--color-text-secondary, #9ca3af)',
          marginTop: 4,
          lineHeight: 1.4,
        }}
      >
        {commission.description[lang]}
      </div>
      <SubAreaTags tags={commission.responsibilities[lang]} color={commission.color} />
    </div>
  );
}

function DirectionSection({
  directionId,
  lang,
  boardMemberName,
}: {
  directionId: DirectionId;
  lang: 'es' | 'en';
  boardMemberName: string;
}) {
  const color = directionColors[directionId];
  const label = parentLabels[directionId][lang];
  const commissions = directiveCommissions.filter((c) => c.parent === directionId);

  return (
    <div
      data-direction={directionId}
      style={{
        background: 'var(--color-surface, #111)',
        border: '1px solid var(--color-border, #2a2a2a)',
        borderRadius: 14,
        padding: '1.25rem',
        marginBottom: '0.75rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingBottom: '0.75rem',
          marginBottom: '0.75rem',
          borderBottom: '1px solid var(--color-border, #2a2a2a)',
        }}
      >
        <DirectionLetter id={directionId} color={color} />
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--color-text-primary, #f1f1f1)',
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #9ca3af)' }}>
            {boardMemberName}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: commissions.length > 1 ? '1fr 1fr' : '1fr',
          gap: '0.5rem',
        }}
      >
        {commissions.map((commission) => (
          <CommissionCard key={commission.id} commission={commission} lang={lang} />
        ))}
      </div>
    </div>
  );
}

function HorizontalCommissionCard({ commission, lang }: { commission: Commission; lang: 'es' | 'en' }) {
  return (
    <div
      style={{
        background: 'var(--card-bg, #1a1a1a)',
        border: `1px solid var(--color-border, #333)`,
        borderRadius: 10,
        padding: '0.875rem 1rem',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${commission.color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <i className={commission.icon} style={{ color: commission.color, fontSize: 14 }} />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary, #f1f1f1)' }}>
          {commission.name[lang]}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #9ca3af)', marginTop: 3, lineHeight: 1.4 }}>
          {commission.description[lang]}
        </div>
      </div>
    </div>
  );
}

export default function CommissionsListView({ lang }: Props) {
  const i18n = commissionsI18n[lang];
  const members = boardMembers[lang];

  const memberByDirection: Record<DirectionId, string> = {
    presidencia: members[0]?.name ?? '',
    secretaria: members[1]?.name ?? '',
    tesoreria: members[2]?.name ?? '',
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--color-text-primary, #f1f1f1)',
            marginBottom: '0.75rem',
          }}
        >
          {i18n.boardTitle}
        </h2>

        {DIRECTIONS.map((directionId) => (
          <DirectionSection
            key={directionId}
            directionId={directionId}
            lang={lang}
            boardMemberName={memberByDirection[directionId]}
          />
        ))}
      </div>

      <div>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--color-text-primary, #f1f1f1)',
            marginBottom: '0.75rem',
          }}
        >
          {i18n.horizontalTitle}
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
          }}
        >
          {horizontalCommissions.map((commission) => (
            <HorizontalCommissionCard key={commission.id} commission={commission} lang={lang} />
          ))}
        </div>
      </div>
    </div>
  );
}
