import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = 'primary', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition',
        variant === 'primary' ? 'bg-primary text-white hover:opacity-90' : 'bg-slate-200 text-ink hover:bg-slate-300',
        className
      )}
      {...props}
    />
  )
})
