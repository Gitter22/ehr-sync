// Small, self-contained illustrative diagrams for the "How this works" page. Plain SVG shapes,
// no external image assets — colors are hardcoded to match the app's theme palette (theme.ts)
// since these are one-off illustrations, not themed UI components.
import type { ReactNode } from 'react';
import { Box } from '@mui/material';

const C = {
  blue: '#2563eb',
  blueLight: '#dbe6fe',
  grey: '#a5a5a5',
  greyLine: '#d6d6d6',
  greyBg: '#f5f5f5',
  green: '#18a808',
  greenBg: '#d9f7d3',
  orange: '#eb6d25',
  orangeBg: '#fbe3cf',
  dark: '#272727',
};

function Diagram({
  viewBox,
  children,
  height,
}: {
  viewBox: string;
  children: ReactNode;
  height?: number;
}) {
  return (
    <Box sx={{ my: 3, display: 'flex', justifyContent: 'center' }}>
      <Box
        component="svg"
        viewBox={viewBox}
        sx={{ width: '100%', maxWidth: 560, height: height ?? 'auto' }}
      >
        {children}
      </Box>
    </Box>
  );
}

function Box3({
  x,
  y,
  w,
  h,
  label,
  sub,
  fill,
  stroke,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  fill: string;
  stroke: string;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <text
        x={x + w / 2}
        y={sub ? y + h / 2 - 4 : y + h / 2 + 5}
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        fill={C.dark}
      >
        {label}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fontSize={11} fill={C.grey}>
          {sub}
        </text>
      )}
    </g>
  );
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
  markerId,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  markerId: string;
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={C.grey}
      strokeWidth={1.5}
      markerEnd={`url(#${markerId})`}
    />
  );
}

function ArrowMarker({ id }: { id: string }) {
  return (
    <defs>
      <marker id={id} markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill={C.grey} />
      </marker>
    </defs>
  );
}

// 1. HAPI FHIR / Oracle Health -> sync engine -> our database, one-way only.
export function BigPictureDiagram() {
  return (
    <Diagram viewBox="0 0 560 120">
      <ArrowMarker id="m1" />
      <Box3
        x={10}
        y={35}
        w={150}
        h={50}
        label="HAPI FHIR /"
        sub="Oracle Health"
        fill={C.greyBg}
        stroke={C.greyLine}
      />
      <Arrow x1={165} y1={60} x2={205} y2={60} markerId="m1" />
      <Box3 x={210} y={35} w={140} h={50} label="Sync process" fill={C.blueLight} stroke={C.blue} />
      <Arrow x1={355} y1={60} x2={395} y2={60} markerId="m1" />
      <Box3
        x={400}
        y={35}
        w={150}
        h={50}
        label="Our database"
        fill={C.greyBg}
        stroke={C.greyLine}
      />
      <text x={280} y={100} textAnchor="middle" fontSize={11} fill={C.grey}>
        Data only ever flows this direction — nothing is sent back out
      </text>
    </Diagram>
  );
}

// 2. Patients Resource Sync first, then Conditions + Medication Requests Syncs side by side.
export function PatientsFirstDiagram() {
  return (
    <Diagram viewBox="0 0 560 150">
      <ArrowMarker id="m2" />
      <Box3
        x={20}
        y={50}
        w={160}
        h={50}
        label="Patients"
        sub="Resource Sync"
        fill={C.blueLight}
        stroke={C.blue}
      />
      <Arrow x1={185} y1={55} x2={225} y2={25} markerId="m2" />
      <Arrow x1={185} y1={80} x2={225} y2={100} markerId="m2" />
      <Box3
        x={230}
        y={0}
        w={310}
        h={50}
        label="Conditions Resource Sync"
        fill={C.greenBg}
        stroke={C.green}
      />
      <Box3
        x={230}
        y={75}
        w={310}
        h={50}
        label="Medication Requests Sync"
        fill={C.greenBg}
        stroke={C.green}
      />
      <text x={280} y={140} textAnchor="middle" fontSize={11} fill={C.grey}>
        The other two can't start until Patients Resource Sync knows who everyone is — then both run
        together
      </text>
    </Diagram>
  );
}

// 3. Progress saved along the way; resuming picks up from the last save point, not from zero.
export function CheckpointDiagram() {
  const dots = [40, 140, 240, 340, 440];
  return (
    <Diagram viewBox="0 0 560 130">
      <line x1={40} y1={40} x2={440} y2={40} stroke={C.greyLine} strokeWidth={3} />
      {dots.slice(0, 4).map((cx, i) => (
        <circle key={i} cx={cx} cy={40} r={9} fill={C.green} stroke="white" strokeWidth={2} />
      ))}
      <circle cx={440} cy={40} r={11} fill="white" stroke={C.orange} strokeWidth={3} />
      <text x={440} y={20} textAnchor="middle" fontSize={11} fill={C.orange} fontWeight={700}>
        interrupted here
      </text>
      <text x={340} y={70} textAnchor="middle" fontSize={11} fill={C.grey}>
        last saved point
      </text>
      <path
        d="M 340 90 Q 390 115 440 90"
        fill="none"
        stroke={C.blue}
        strokeWidth={2}
        strokeDasharray="4 3"
        markerEnd="url(#m3)"
      />
      <defs>
        <marker id="m3" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={C.blue} />
        </marker>
      </defs>
      <text x={390} y={128} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.blue}>
        picks back up here — not from the beginning
      </text>
    </Diagram>
  );
}

// 4. A failed request retries quickly a few times, then more slowly, before it's flagged.
export function RetryDiagram() {
  return (
    <Diagram viewBox="0 0 560 130">
      <ArrowMarker id="m4" />
      <Box3 x={10} y={40} w={100} h={50} label="Request" fill={C.blueLight} stroke={C.blue} />
      <Arrow x1={115} y1={65} x2={155} y2={65} markerId="m4" />
      <Box3
        x={160}
        y={40}
        w={130}
        h={50}
        label="Didn't work"
        sub="quick retry × 3"
        fill={C.orangeBg}
        stroke={C.orange}
      />
      <Arrow x1={295} y1={65} x2={335} y2={65} markerId="m4" />
      <Box3
        x={340}
        y={40}
        w={130}
        h={50}
        label="Still stuck"
        sub="wait, retry × 2"
        fill={C.orangeBg}
        stroke={C.orange}
      />
      <Arrow x1={475} y1={65} x2={515} y2={65} markerId="m4" />
      <text x={517} y={60} fontSize={20}>
        🚩
      </text>
      <text x={517} y={85} fontSize={10} fill={C.grey}>
        flagged for
      </text>
      <text x={517} y={97} fontSize={10} fill={C.grey}>
        a person
      </text>
    </Diagram>
  );
}

// 5. Conditions Sync and Medication Requests Sync taking turns vs. running side by side.
export function ParallelVsSequentialDiagram() {
  return (
    <Diagram viewBox="0 0 560 160" height={165}>
      <text x={10} y={20} fontSize={12} fontWeight={700} fill={C.dark}>
        Before: taking turns
      </text>
      <Box3
        x={10}
        y={30}
        w={160}
        h={30}
        label="Conditions Sync"
        fill={C.greyBg}
        stroke={C.greyLine}
      />
      <Box3
        x={190}
        y={30}
        w={210}
        h={30}
        label="Medication Requests Sync"
        fill={C.greyBg}
        stroke={C.greyLine}
      />
      <text x={410} y={50} fontSize={11} fill={C.grey}>
        one after the other
      </text>

      <text x={10} y={95} fontSize={12} fontWeight={700} fill={C.dark}>
        Now: side by side
      </text>
      <Box3
        x={10}
        y={105}
        w={260}
        h={30}
        label="Conditions Sync"
        fill={C.greenBg}
        stroke={C.green}
      />
      <text x={280} y={123} fontSize={11} fill={C.grey}>
        +
      </text>
      <Box3
        x={300}
        y={105}
        w={260}
        h={30}
        label="Medication Requests Sync"
        fill={C.greenBg}
        stroke={C.green}
      />
      <text x={280} y={148} textAnchor="middle" fontSize={11} fill={C.grey}>
        running at the same time, each on its own line of work
      </text>
    </Diagram>
  );
}

// 6. HAPI FHIR (can re-check just what's new) vs. Oracle Health (can't, and only one patient
// at a time), two different re-check strategies.
export function TwoSystemsDiagram() {
  return (
    <Diagram viewBox="0 0 560 160" height={170}>
      <Box3 x={10} y={10} w={250} h={40} label="HAPI FHIR" fill={C.blueLight} stroke={C.blue} />
      <text x={135} y={70} textAnchor="middle" fontSize={11} fill={C.dark}>
        "Just show me what
      </text>
      <text x={135} y={85} textAnchor="middle" fontSize={11} fill={C.dark}>
        changed recently"
      </text>
      <text x={135} y={105} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.green}>
        quick re-checks
      </text>

      <Box3
        x={300}
        y={10}
        w={250}
        h={40}
        label="Oracle Health"
        fill={C.orangeBg}
        stroke={C.orange}
      />
      <text x={425} y={70} textAnchor="middle" fontSize={11} fill={C.dark}>
        "Show me everyone again,
      </text>
      <text x={425} y={85} textAnchor="middle" fontSize={11} fill={C.dark}>
        about 10 patients at a time"
      </text>
      <text x={425} y={105} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.orange}>
        full re-check, every time
      </text>
    </Diagram>
  );
}

// 7. Turning pages by position (can skip/repeat) vs. by bookmark (always safe).
export function CursorVsOffsetDiagram() {
  return (
    <Diagram viewBox="0 0 560 170" height={180}>
      <text x={140} y={18} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.dark}>
        By position ("page 2")
      </text>
      {['1', '2', '3', '4', '5'].map((n, i) => (
        <rect
          key={n}
          x={20 + i * 48}
          y={30}
          width={40}
          height={30}
          rx={5}
          fill={n === '3' ? C.orangeBg : C.greyBg}
          stroke={n === '3' ? C.orange : C.greyLine}
          strokeDasharray={n === '3' ? '3 2' : undefined}
        />
      ))}
      <text x={140} y={78} textAnchor="middle" fontSize={10} fill={C.orange}>
        an item removed here shifts everything after it — a page can silently skip one
      </text>

      <text x={425} y={18} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.dark}>
        By bookmark ("after #4")
      </text>
      {['1', '2', '3', '4', '5'].map((n, i) => (
        <rect
          key={n}
          x={305 + i * 48}
          y={30}
          width={40}
          height={30}
          rx={5}
          fill={C.greenBg}
          stroke={C.green}
        />
      ))}
      <path d="M 401 65 L 401 75" stroke={C.green} strokeWidth={2} markerEnd="url(#m7)" />
      <defs>
        <marker id="m7" markerWidth={8} markerHeight={8} refX={4} refY={6} orient="auto">
          <path d="M0,0 L4,6 L8,0 Z" fill={C.green} />
        </marker>
      </defs>
      <text x={425} y={90} textAnchor="middle" fontSize={10} fill={C.green}>
        bookmark
      </text>
      <text x={425} y={120} textAnchor="middle" fontSize={10} fill={C.grey}>
        changes elsewhere don't move a
      </text>
      <text x={425} y={134} textAnchor="middle" fontSize={10} fill={C.grey}>
        bookmark you're already holding
      </text>
    </Diagram>
  );
}

// 8. A shared tap/valve limits real throughput no matter how many requests are "ready".
export function RateLimitDiagram() {
  return (
    <Diagram viewBox="0 0 560 155" height={165}>
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={10}
          y1={20 + i * 20}
          x2={230}
          y2={70}
          stroke={C.greyLine}
          strokeWidth={2}
        />
      ))}
      <text x={10} y={12} fontSize={11} fill={C.grey}>
        lots of work ready to go
      </text>
      <rect
        x={230}
        y={55}
        width={30}
        height={30}
        rx={6}
        fill={C.orangeBg}
        stroke={C.orange}
        strokeWidth={2}
      />
      <text x={245} y={105} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.orange}>
        shared speed limit
      </text>
      <line
        x1={260}
        y1={70}
        x2={480}
        y2={70}
        stroke={C.blue}
        strokeWidth={3}
        markerEnd="url(#m8)"
      />
      <defs>
        <marker id="m8" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={C.blue} />
        </marker>
      </defs>
      <text x={480} y={55} textAnchor="middle" fontSize={11} fill={C.dark}>
        HAPI FHIR
      </text>
      <text x={480} y={95} textAnchor="middle" fontSize={11} fill={C.dark}>
        or Oracle Health
      </text>
      <text x={245} y={135} textAnchor="middle" fontSize={10} fill={C.grey}>
        Patients, Conditions, and Medication Requests Syncs all share one limit per system
      </text>
    </Diagram>
  );
}
