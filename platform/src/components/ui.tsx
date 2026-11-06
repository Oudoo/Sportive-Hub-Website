import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/**
 * Small, dependency-free UI primitives in the brand palette. No hooks, so every
 * one of these works in both Server and Client Components.
 */

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-sm border border-charcoal/15 bg-white/60 p-5 md:p-6", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="text-lg font-medium tracking-tight">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ children, lede, action }: { children: ReactNode; lede?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-medium tracking-tight md:text-4xl">{children}</h1>
        {lede && <p className="mt-2 max-w-2xl text-olive">{lede}</p>}
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-charcoal text-milk hover:bg-olive border-charcoal hover:border-olive",
  secondary: "bg-transparent text-charcoal border-charcoal/40 hover:border-charcoal",
  danger: "bg-transparent text-red-800 border-red-800/40 hover:bg-red-50",
  ghost: "bg-transparent text-olive border-transparent hover:text-charcoal",
};

export const buttonClass = (variant: ButtonVariant = "primary", className?: string) =>
  cx(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border px-4 text-xs font-medium uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    buttonStyles[variant],
    className,
  );

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button {...props} className={buttonClass(variant, className)} />;
}

const fieldStyles =
  "w-full rounded-sm border border-olive/60 bg-milk px-3 py-2 text-base text-charcoal outline-none focus:border-olive focus:ring-2 focus:ring-olive/30";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldStyles, className)} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(fieldStyles, className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldStyles, "min-h-28", className)} />;
}

/** A labelled form control with an optional inline error. */
export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor?: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-xs uppercase tracking-[0.12em] text-olive">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-red-800">{error}</p> : hint ? <p className="text-sm text-olive/80">{hint}</p> : null}
    </div>
  );
}

/** A checkbox with its label on one line. */
export function Checkbox({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" {...props} className="mt-1 h-4 w-4 accent-olive" />
      <span>
        {label}
        {hint && <span className="block text-xs text-olive/80">{hint}</span>}
      </span>
    </label>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "info";

const badgeStyles: Record<Tone, string> = {
  neutral: "bg-charcoal/10 text-charcoal",
  good: "bg-pastel text-olive",
  warn: "bg-sand/50 text-charcoal",
  bad: "bg-red-100 text-red-900",
  info: "bg-olive text-milk",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide", badgeStyles[tone])}>
      {children}
    </span>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "good" | "bad" | "warn"; children: ReactNode }) {
  const styles = {
    info: "border-olive/30 bg-pastel/40 text-olive",
    good: "border-olive/30 bg-pastel text-olive",
    bad: "border-red-800/30 bg-red-50 text-red-900",
    warn: "border-sand bg-sand/30 text-charcoal",
  };
  return <div role="status" className={cx("rounded-sm border px-3 py-2 text-sm", styles[tone])}>{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-sm border border-charcoal/15 bg-white/60 p-5">
      <div className="text-xs uppercase tracking-[0.14em] text-olive">{label}</div>
      <div className="mt-2 text-4xl font-medium tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-sm text-olive/80">{hint}</div>}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cx("border-b border-charcoal/20 pb-2 pr-4 text-left text-xs font-normal uppercase tracking-[0.12em] text-olive", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx("border-b border-charcoal/10 py-2.5 pr-4 align-top", className)}>{children}</td>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-olive">{children}</p>;
}

/** A thin bar from 0 to 1, used for tier progress. */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-charcoal/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full bg-olive transition-[width]" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Monospace block for codes, links and secrets. */
export function Code({ children, className }: { children: ReactNode; className?: string }) {
  return <code className={cx("break-all rounded-sm bg-charcoal/5 px-1.5 py-0.5 font-mono text-[13px]", className)}>{children}</code>;
}

/** Key/value rows for detail panels. */
export function Dl({ rows }: { rows: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-2 text-sm">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-xs uppercase tracking-[0.12em] text-olive">{row.label}</dt>
          <dd className="break-words">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Previous / next links for paginated lists. */
export function Pagination({ page, total, perPage, href, label }: { page: number; total: number; perPage: number; href: (page: number) => string; label: string }) {
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  if (lastPage <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-olive">
        Page {page} of {lastPage} · {total} {label}
      </span>
      <div className="flex gap-4">
        {page > 1 && (
          <a href={href(page - 1)} className="underline underline-offset-4">
            Previous
          </a>
        )}
        {page < lastPage && (
          <a href={href(page + 1)} className="underline underline-offset-4">
            Next
          </a>
        )}
      </div>
    </div>
  );
}
