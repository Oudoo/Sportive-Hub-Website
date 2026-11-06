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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
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

export function PageTitle({ children, lede }: { children: ReactNode; lede?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-medium tracking-tight md:text-4xl">{children}</h1>
      {lede && <p className="mt-2 max-w-2xl text-olive">{lede}</p>}
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

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border px-4 text-xs font-medium uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        buttonStyles[variant],
        className,
      )}
    />
  );
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
export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor?: string; error?: string; hint?: string; children: ReactNode }) {
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

export function Alert({ tone = "info", children }: { tone?: "info" | "good" | "bad"; children: ReactNode }) {
  const styles = { info: "border-olive/30 bg-pastel/40 text-olive", good: "border-olive/30 bg-pastel text-olive", bad: "border-red-800/30 bg-red-50 text-red-900" };
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
