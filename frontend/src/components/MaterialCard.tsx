import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

function MaterialCard({ title, subtitle, children }: Props) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--dravix-border)] bg-white p-5 shadow-[var(--dravix-shadow-soft)]">
      <h3 className="text-lg font-light text-[var(--dravix-ink)]">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm text-[var(--dravix-ink-soft)]">{subtitle}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export default MaterialCard;
