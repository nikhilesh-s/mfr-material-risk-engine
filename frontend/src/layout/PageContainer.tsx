import type { PropsWithChildren, ReactNode } from 'react';

type Props = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}>;

function PageContainer({ eyebrow, title, description, actions, children }: Props) {
  return (
    <div className="space-y-6">
      <section className="dravix-hero overflow-hidden rounded-[2rem] border px-8 py-8 text-white shadow-[0_18px_60px_rgba(118,33,35,0.16)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-4xl">
            {eyebrow ? (
              <div className="text-xs uppercase tracking-[0.24em] text-white/62">{eyebrow}</div>
            ) : null}
            <h1 className="mt-3 text-4xl font-light">{title}</h1>
            {description ? <p className="mt-4 max-w-3xl text-base leading-7 text-white/78">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </section>
      {children}
    </div>
  );
}

export default PageContainer;
