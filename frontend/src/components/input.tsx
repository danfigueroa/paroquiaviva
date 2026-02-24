import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-xl border border-[#344434] bg-[#101612] px-3 text-sm text-secondary placeholder:text-[#8f8a80] focus:outline-none focus:ring-2 focus:ring-[#e27d60]',
        className
      )}
      {...props}
    />
  )
})
