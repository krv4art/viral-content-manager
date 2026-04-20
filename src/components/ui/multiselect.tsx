"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

type MultiselectProps = {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  width?: string;
};

export function Multiselect({
  label,
  options,
  selected,
  onChange,
  width = "w-[160px]",
}: MultiselectProps) {
  const isAllMode = selected.length === 0;

  const triggerText = isAllMode
    ? "Все"
    : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
      : `${label}: ${selected.length}`;

  const isChecked = (value: string) => isAllMode || selected.includes(value);

  const handleToggle = (value: string) => {
    if (isAllMode) {
      // В режиме «Все» снимаем один элемент → оставляем все остальные
      onChange(options.map((o) => o.value).filter((v) => v !== value));
    } else if (selected.includes(value)) {
      const next = selected.filter((s) => s !== value);
      // Если сняли последний отмеченный — возвращаемся к «Все»
      onChange(next.length === 0 ? [] : next);
    } else {
      const next = [...selected, value];
      // Если отметили все вручную — нормализуем обратно в «Все»
      onChange(next.length === options.length ? [] : next);
    }
  };

  const handleSelectAll = () => onChange([]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={`${width} justify-between font-normal`}>
          <span className={isAllMode ? "text-muted-foreground" : ""}>
            {triggerText}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={width}>
        <DropdownMenuLabel className="flex items-center justify-between py-1">
          <span className="text-xs font-medium">{label}</span>
          {!isAllMode && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              onClick={handleSelectAll}
            >
              Сбросить
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={isChecked(option.value)}
            onCheckedChange={() => handleToggle(option.value)}
            onSelect={(e) => e.preventDefault()}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
