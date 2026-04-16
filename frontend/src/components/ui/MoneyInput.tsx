type MoneyInputProps = {
  name: string;
  label: string;
  defaultValue?: string;
  currency?: string;
  placeholder?: string;
};

export function MoneyInput({
  name,
  label,
  defaultValue = "",
  currency = "USD",
  placeholder = "0.00",
}: MoneyInputProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-neutral-900">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
          {currency === "USD" ? "$" : currency}
        </span>
        <input
          name={name}
          type="text"
          inputMode="decimal"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-neutral-200 bg-white pl-8 pr-4 py-3 text-sm shadow-sm outline-none transition focus:border-neutral-400"
        />
      </div>
    </label>
  );
}