import { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Node, Edge } from '@xyflow/react';

import BoardNode from './nodes/BoardNode';
import CommissionNode from './nodes/CommissionNode';
import HorizontalNode from './nodes/HorizontalNode';
import {
  boardMembers,
  directiveCommissions,
  horizontalCommissions,
  directionColors,
} from './commissions-data';

interface CommissionsChartViewProps {
  lang: 'es' | 'en';
}

const nodeTypes = {
  board: BoardNode,
  commission: CommissionNode,
  horizontal: HorizontalNode,
};

const BOARD_Y = 0;
const BOARD_X_POSITIONS = [0, 200, 400];
const DIRECTIVE_Y = 180;
const DIRECTIVE_X_POSITIONS = [0, 150, 300, 450];
const HORIZONTAL_X = 50;
const HORIZONTAL_Y_START = 420;
const HORIZONTAL_Y_INCREMENT = 60;

const BOARD_NODE_IDS: Record<string, string> = {
  presidencia: 'board-presidencia',
  secretaria: 'board-secretaria',
  tesoreria: 'board-tesoreria',
};

const BOARD_DIRECTIONS = ['presidencia', 'secretaria', 'tesoreria'] as const;

export default function CommissionsChartView({ lang }: CommissionsChartViewProps) {
  const nodes = useMemo<Node[]>(() => {
    const members = boardMembers[lang];

    const boardNodes: Node[] = members.map((member, index) => {
      const direction = BOARD_DIRECTIONS[index];
      return {
        id: BOARD_NODE_IDS[direction],
        type: 'board',
        position: { x: BOARD_X_POSITIONS[index], y: BOARD_Y },
        data: {
          role: member.role,
          name: member.name,
          color: directionColors[direction],
        },
      };
    });

    const directiveNodes: Node[] = directiveCommissions.map((commission, index) => ({
      id: `commission-${commission.id}`,
      type: 'commission',
      position: { x: DIRECTIVE_X_POSITIONS[index], y: DIRECTIVE_Y },
      data: {
        name: commission.name[lang],
        description: commission.description[lang],
        color: commission.color,
        responsibilities: commission.responsibilities[lang],
      },
    }));

    const horizontalNodes: Node[] = horizontalCommissions.map((commission, index) => ({
      id: `horizontal-${commission.id}`,
      type: 'horizontal',
      position: { x: HORIZONTAL_X, y: HORIZONTAL_Y_START + index * HORIZONTAL_Y_INCREMENT },
      data: {
        name: commission.name[lang],
        responsibilities: commission.responsibilities[lang],
        color: commission.color,
      },
    }));

    return [...boardNodes, ...directiveNodes, ...horizontalNodes];
  }, [lang]);

  const edges = useMemo<Edge[]>(() => {
    return directiveCommissions
      .filter((commission) => commission.parent !== undefined)
      .map((commission) => {
        const boardId = BOARD_NODE_IDS[commission.parent!];
        const directionColor = directionColors[commission.parent!];

        return {
          id: `edge-${boardId}-commission-${commission.id}`,
          source: boardId,
          target: `commission-${commission.id}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: directionColor, strokeWidth: 2 },
        };
      });
  }, []);

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={'dots' as any} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
