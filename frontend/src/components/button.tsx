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
          ? 'bg-accent text-[#231815] hover:brightness-105'
          : 'border border-[#516451] bg-[#1a211d] text-secondary hover:border-[#6f856f]',
        className
      )}
      {...props}
    />
  )
})
