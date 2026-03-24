import { memo } from 'react';

interface HorizontalNodeData {
  name: string;
  responsibilities: string[];
  color: string;
}

interface HorizontalNodeProps {
  data: HorizontalNodeData;
}

function HorizontalNode({ data }: HorizontalNodeProps) {
  return (
    <div
      style={{
        width: 500,
        background: '#111',
        border: `1px solid ${data.color}30`,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.5rem 1rem',
      }}
    >
      <div
        style={{
          width: 6,
          alignSelf: 'stretch',
          background: data.color,
          borderRadius: 3,
          flexShrink: 0,
        }}
      />
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 700,
            color: data.color,
          }}
        >
          {data.name}
        </p>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 10,
            color: '#666',
          }}
        >
          {data.responsibilities.join(' · ')}
        </p>
      </div>
    </div>
  );
}

export default memo(HorizontalNode);
