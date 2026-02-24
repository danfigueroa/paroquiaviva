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
        'inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold transition duration-200 disabled:opacity-60',
        variant === 'primary'
          ? 'bg-primary text-onPrimary hover:bg-primaryStrong'
          : 'border border-primary/60 bg-panel text-secondary hover:bg-bgSoft hover:border-primary',
        className
      )}
      {...props}
    />
  )
})
