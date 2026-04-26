'use client'

import * as React from 'react'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  formatters,
  components,
  disabled,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  // Business Logic: Disable Weekends (0 = Sunday, 6 = Saturday)
  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  // Business Logic: Disable Past Dates (relative to today)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isPast = (date: Date) => date < today

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      // Combine Weekend and Past Date logic with any passed disabled props
      disabled={[isWeekend, isPast, ...(Array.isArray(disabled) ? disabled : disabled ? [disabled] : [])]}
      className={cn(
        // Functional base — always applied
        'bg-white group/calendar select-none w-full',
        '[--cell-size:38px] sm:[--cell-size:44px] [--rdp-accent-color:theme(colors.indigo.600)] [--rdp-background-alpha:0]',
        // Default chrome (padding, border, rounding, shadow) — listed BEFORE className
        // so callers can override them (e.g. "p-0 border-none shadow-none rounded-none" on mobile)
        'p-6 rounded-[2rem] border border-slate-100 shadow-sm',
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('flex flex-col relative', defaultClassNames.months),
        month: cn('flex flex-col w-full gap-6', defaultClassNames.month),
        nav: cn(
          'flex items-center gap-2 absolute top-0 right-0 justify-end h-10 z-10',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          'border border-slate-200 rounded-xl bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50/50 size-10 p-0 transition-all',
        ),
        button_next: cn(
          'border border-slate-200 rounded-xl bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50/50 size-10 p-0 transition-all',
        ),
        month_caption: cn(
          'flex items-center justify-start h-10 w-full mb-4',
          defaultClassNames.month_caption,
        ),
        caption_label: cn(
          'text-sm font-[950] uppercase tracking-tighter text-slate-900',
          defaultClassNames.caption_label,
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex border-b border-slate-50 pb-3', defaultClassNames.weekdays),
        weekday: cn(
          'text-slate-400 rounded-none flex-1 font-black text-[10px] uppercase tracking-widest text-center',
          // Subtly dim the Saturday and Sunday headers
          '[&:nth-child(1)]:opacity-30 [&:nth-child(7)]:opacity-30',
          defaultClassNames.weekday,
        ),
        week: cn('flex w-full mt-2', defaultClassNames.week),
        day: cn(
          'relative p-0 text-center flex-1 aspect-square',
          defaultClassNames.day,
        ),
        today: cn(
          'text-indigo-600 font-black',
          defaultClassNames.today,
        ),
        outside: cn(
          'text-slate-200 opacity-50',
          defaultClassNames.outside,
        ),
        disabled: cn(
          'text-slate-200 opacity-40 cursor-not-allowed line-through',
          defaultClassNames.disabled,
        ),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return (
              <ChevronLeftIcon className={cn('size-4', className)} {...props} />
            )
          }
          if (orientation === 'right') {
            return (
              <ChevronRightIcon
                className={cn('size-4', className)}
                {...props}
              />
            )
          }
          return (
            <ChevronDownIcon className={cn('size-4', className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)
  
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      data-day={day.date.toLocaleDateString()}
      disabled={modifiers.disabled}
      className={cn(
        // Base Day Style: Larger touch targets, Slate text
        'size-10 rounded-xl font-bold text-xs transition-all duration-300',
        'hover:bg-slate-100 hover:text-indigo-600',
        
        // Selected State: Solid Indigo Circle
        modifiers.selected && [
          'bg-indigo-600! text-white! rounded-xl shadow-lg shadow-indigo-100 scale-110 z-10',
        ],
        
        // Today Marker: Soft Indigo highlight
        modifiers.today && !modifiers.selected && 'text-indigo-600 bg-indigo-50/50',

        // Disabled State overrides
        modifiers.disabled && 'hover:bg-transparent hover:text-slate-200 cursor-not-allowed',
        
        className,
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }