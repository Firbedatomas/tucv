import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";

export type Variant = "primary" | "secondary" | "ghost";

export const buttonBaseClass =
  "inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-[var(--tucv-radius)] transition disabled:opacity-50 disabled:cursor-not-allowed";

export const buttonVariantStyle: Record<Variant, React.CSSProperties> = {
  primary: {
    backgroundColor: "var(--tucv-primary)",
    color: "var(--tucv-primary-text)",
    border: "2px solid var(--tucv-border)",
    boxShadow: "var(--tucv-shadow)",
  },
  secondary: {
    backgroundColor: "var(--tucv-surface)",
    color: "var(--tucv-text)",
    border: "2px solid var(--tucv-border)",
    boxShadow: "var(--tucv-shadow)",
  },
  ghost: { backgroundColor: "transparent", color: "var(--tucv-primary)" },
};

const base = buttonBaseClass;
const variants = buttonVariantStyle;

export function LinkButton({
  variant = "primary",
  className = "",
  style,
  href,
  children,
}: {
  variant?: Variant;
  className?: string;
  style?: React.CSSProperties;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${base} ${className}`}
      style={{ ...variants[variant], ...style }}
    >
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  className = "",
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`${base} ${className}`}
      style={{ ...variants[variant], ...style }}
      {...props}
    />
  );
}
