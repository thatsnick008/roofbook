"use client";

import * as React from "react";
import { cn } from "@/lib/format";

export function Field({
  label,
  hint,
  className,
  children
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, onFocus, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn("input", className)}
        onFocus={(event) => {
          if (props.type === "number" && Number(event.currentTarget.value) === 0) event.currentTarget.select();
          onFocus?.(event);
        }}
        {...props}
      />
    );
  }
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn("input h-24 resize-none py-2.5", className)} {...props} />;
  }
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn("input appearance-none pr-9", className)} {...props}>
        {children}
      </select>
    );
  }
);

export function MoneyInput({
  value,
  onValueChange,
  className,
  onFocus,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        className={cn("input pl-7", className)}
        value={Number.isFinite(value) ? value : 0}
        onFocus={(event) => {
          if (Number(event.currentTarget.value) === 0) event.currentTarget.select();
          onFocus?.(event);
        }}
        onChange={(event) => onValueChange(parseFloat(event.target.value) || 0)}
        {...props}
      />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-bg/60 px-3.5 py-2.5 text-sm"
    >
      <span className="text-left">{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand" : "bg-muted/40"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}
