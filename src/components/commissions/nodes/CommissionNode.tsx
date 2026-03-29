import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface CommissionNodeData {
  name: string;
  description: string;
  color: string;
  responsibilities: string[];
}

interface CommissionNodeProps {
  data: CommissionNodeData;
}

function CommissionNode({ data }: CommissionNodeProps) {
  return (
    <div
      style={{
        width: 140,
        background: '#111',
        border: `1.5px solid ${data.color}`,
        borderRadius: 10,
        padding: '10px 10px 8px',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: data.color }} />
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 700,
          color: data.color,
          lineHeight: 1.3,
        }}
      >
        {data.name}
      </p>
      <p
        style={{
          margin: '4px 0 8px',
          fontSize: 9,
          color: '#888',
          lineHeight: 1.4,
        }}
      >
        {data.description}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {data.responsibilities.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 8,
              padding: '2px 5px',
              borderRadius: 4,
              background: `${data.color}15`,
              color: data.color,
              fontWeight: 600,
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default memo(CommissionNode);
