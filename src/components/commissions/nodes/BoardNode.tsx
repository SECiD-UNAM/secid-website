import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface BoardNodeData {
  role: string;
  name: string;
  color: string;
}

interface BoardNodeProps {
  data: BoardNodeData;
}

function BoardNode({ data }: BoardNodeProps) {
  return (
    <div
      style={{
        width: 160,
        background: '#111',
        border: `2px solid ${data.color}`,
        borderRadius: 12,
        boxShadow: `0 0 25px ${data.color}20`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${data.color}cc, ${data.color}66)`,
          padding: '10px 12px 8px',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          {data.role}
        </p>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.3,
          }}
        >
          {data.name}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: data.color }} />
    </div>
  );
}

export default memo(BoardNode);
