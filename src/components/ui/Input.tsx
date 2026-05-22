import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, className = '', id, ...props }, ref) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-zinc-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          {...props}
          className={[
            'rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500',
            'px-4 py-3 text-base min-h-[3rem]',
            'focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent',
            'disabled:opacity-50',
            error ? 'border-red-500' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    )
  },
)
