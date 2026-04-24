import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Academy Styling: White bg, Slate borders, rounded geometry
        'flex w-full min-w-0 bg-white px-4 py-2 text-base text-slate-900 shadow-sm transition-all outline-none md:text-sm',
        'h-14 rounded-xl border border-slate-200', // Matched height with Select component
        
        // Typography & Placeholder
        'font-medium placeholder:text-slate-400',
        
        // File Upload Styling
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-black file:uppercase file:tracking-widest file:text-indigo-600',
        
        // Academy Focus & Interaction
        'hover:border-slate-300 hover:bg-slate-50/50',
        'focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-600/5',
        
        // Error States
        'aria-invalid:border-red-500 aria-invalid:ring-red-500/10',
        
        // Disabled States
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
        
        className,
      )}
      {...props}
    />
  )
}

export { Input }