"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

/* ─── Size Map ──────────────────────────────────────────────────────── */
const sizeClasses = {
  sm: "max-w-sm",       // 384px – confirmations
  md: "max-w-md",       // 448px – small forms
  lg: "max-w-lg",       // 512px – medium forms
  xl: "max-w-xl",       // 576px
  "2xl": "max-w-2xl",   // 672px
  "3xl": "max-w-3xl",   // 768px
  "4xl": "max-w-4xl",   // 896px – large editors
  "5xl": "max-w-5xl",   // 1024px
  full: "max-w-[calc(100vw-2rem)]",
  page: "max-w-4xl",    // 896px, taller for PDF preview
} as const;

export type ModalSize = keyof typeof sizeClasses;

/* ─── Modal (Root) ──────────────────────────────────────────────────── */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: ModalSize;
  className?: string;
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
  showClose?: boolean;
}

export function Modal({
  open,
  onClose,
  children,
  size = "md",
  className,
  closeOnOverlay = true,
  closeOnEsc = true,
  showClose = true,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === "Escape") onClose();
    },
    [closeOnEsc, onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  // Focus trap (basic – focus panel on open)
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlay && e.target === overlayRef.current) onClose();
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-6 md:p-10 animate-in fade-in-0 duration-200"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative my-auto w-full rounded-lg border bg-background shadow-lg outline-none animate-in zoom-in-95 fade-in-0 duration-200",
          sizeClasses[size],
          className
        )}
      >
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ─── Sub-components ────────────────────────────────────────────────── */

export function ModalHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 p-6 pb-0", className)}
      {...props}
    />
  );
}

export function ModalTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function ModalDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function ModalBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6", className)} {...props} />
  );
}

export function ModalFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 p-6 pt-0 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}
