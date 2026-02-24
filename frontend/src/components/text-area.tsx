import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-28 w-full rounded-xl border border-[#344434] bg-[#101612] px-3 py-2 text-sm text-secondary placeholder:text-[#8f8a80] focus:outline-none focus:ring-2 focus:ring-[#e27d60]',
        className
      )}
      {...props}
    />
  )
})
