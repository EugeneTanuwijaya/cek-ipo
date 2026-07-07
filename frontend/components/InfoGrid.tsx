import { Fragment } from 'react';

export default function InfoGrid({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2.5 text-sm">
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <dt className="text-mute">{label}</dt>
          <dd className="tabular-nums">{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
