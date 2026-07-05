"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { buttonBaseClass, buttonVariantStyle, type Variant } from "@/components/ui/Button";
import { trackEvent } from "@/lib/track";

// Igual que LinkButton (mismo ADN visual) pero dispara un evento Plausible al
// click. Centraliza el tracking de CTAs para no repetir onClick + trackEvent en
// cada botón. El evento se dispara en el click real del usuario (no en render),
// así que no hay duplicados por rerender.
export function TrackedLinkButton({
  href,
  event,
  eventProps,
  variant = "primary",
  className = "",
  style,
  children,
}: {
  href: string;
  event: string;
  eventProps?: Record<string, string | number | boolean>;
  variant?: Variant;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${buttonBaseClass} ${className}`}
      style={{ ...buttonVariantStyle[variant], ...style }}
      onClick={() => trackEvent(event, eventProps)}
    >
      {children}
    </Link>
  );
}
