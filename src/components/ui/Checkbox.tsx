import { type InputHTMLAttributes, forwardRef } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    return (
      <div>
        <label htmlFor={id} className="flex items-start gap-2">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            className={`mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${className}`}
            {...props}
          />
          <span className="text-sm text-gray-700">{label}</span>
        </label>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
