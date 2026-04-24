import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300 disabled:pointer-events-none disabled:opacity-30 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/20 focus-visible:border-indigo-600",
  {
    variants: {
      variant: {
        // Academy Primary: Deep Indigo with a subtle lift on hover
        default: 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-[0.98]',
        destructive:
          'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-100',
        // Academy Outline: Subtle Slate borders that turn Indigo
        outline:
          'border border-slate-200 bg-white text-slate-600 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50/30',
        secondary:
          'bg-slate-900 text-white hover:bg-indigo-600 shadow-xl shadow-slate-200',
        ghost:
          'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
        link: 'text-indigo-600 underline-offset-4 hover:underline font-bold',
      },
      size: {
        default: 'h-12 px-6 py-3',
        sm: 'h-9 rounded-lg gap-1.5 px-4 text-[10px]',
        lg: 'h-14 rounded-2xl px-8 text-base',
        // New XL size for the primary Booking flow actions
        xl: 'h-16 rounded-2xl px-12 text-[11px] tracking-[0.2em]',
        icon: 'size-11',
        'icon-sm': 'size-9',
        'icon-lg': 'size-14',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }