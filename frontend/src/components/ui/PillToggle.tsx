export interface PillToggleOption<T extends string> {
  value: T;
  label: string;
}

export function PillToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: PillToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            option.value === value
              ? "bg-white text-accent shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
