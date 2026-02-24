import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn('min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary', className)}
      {...props}
    />
  )
})
