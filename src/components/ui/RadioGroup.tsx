import { type InputHTMLAttributes, forwardRef } from "react";

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  options: RadioOption[];
  error?: string;
}

export const RadioGroup = forwardRef<HTMLInputElement, RadioGroupProps>(
  ({ label, options, error, name, ...props }, ref) => {
    return (
      <fieldset>
        {label && (
          <legend className="block text-sm font-medium text-gray-700">
            {label}
          </legend>
        )}
        <div className="mt-1 space-y-2">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2">
              <input
                ref={ref}
                type="radio"
                name={name}
                value={opt.value}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                {...props}
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </fieldset>
    );
  }
);

RadioGroup.displayName = "RadioGroup";
