"use client";

import { useEffect, useRef, type ChangeEvent } from "react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import {
  formatMoneyInputValue,
  moneyDigits,
  moneyInputToDecimal,
} from "@/lib/format";

export interface MoneyInputProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  className?: string;
}

export function MoneyInput({
  id,
  value,
  onValueChange,
  placeholder = "0,00",
  disabled,
  readOnly,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  className,
}: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const lastDigitsRef = useRef(moneyDigits(value));

  useEffect(() => {
    lastDigitsRef.current = moneyDigits(value);
  }, [value]);

  function applyMask(target: HTMLInputElement, digits: string) {
    const display = digits ? `R$ ${formatMoneyInputValue(digits)}` : "";
    target.value = display;
    target.setSelectionRange(display.length, display.length);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const digits = moneyDigits(event.target.value);
    if (digits === lastDigitsRef.current) {
      requestAnimationFrame(() => {
        if (inputRef.current) applyMask(inputRef.current, lastDigitsRef.current);
      });
      return;
    }
    lastDigitsRef.current = digits;
    onValueChange(moneyInputToDecimal(digits));
    requestAnimationFrame(() => {
      if (inputRef.current) applyMask(inputRef.current, lastDigitsRef.current);
    });
  }

  const numericValue = Number(value);
  const display = value && Number.isFinite(numericValue)
    ? `R$ ${formatMoneyInputValue(numericValue.toFixed(2))}`
    : "";

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={display}
      onChange={handleChange}
      disabled={disabled}
      readOnly={readOnly}
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      className={cn("tabular-nums", className)}
    />
  );
}