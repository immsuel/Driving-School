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
  mode = 'single',
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
      mode={mode}
      showOutsideDays={showOutsideDays}
      disabled={[isWeekend, isPast, ...(Array.isArray(disabled) ? disabled : disabled ? [disabled] : [])]}
      className={cn(
        'bg-white group/calendar select-none w-full',
        // Tighter cell size on desktop — mobile keeps the larger touch target
        '[--cell-size:38px] [--rdp-accent-color:theme(colors.indigo.600)] [--rdp-background-alpha:0]',
        // Compact padding and rounding — callers can override
        'p-4 rounded-2xl border border-slate-100 shadow-sm',
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
        month: cn('flex flex-col w-full gap-4', defaultClassNames.month),
        nav: cn(
          'flex items-center gap-1.5 absolute top-0 right-0 justify-end h-8 z-10',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          'border border-slate-200 rounded-lg bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50/50 size-8 p-0 transition-all',
        ),
        button_next: cn(
          'border border-slate-200 rounded-lg bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50/50 size-8 p-0 transition-all',
        ),
        month_caption: cn(
          'flex items-center justify-start h-8 w-full mb-3',
          defaultClassNames.month_caption,
        ),
        caption_label: cn(
          'text-[11px] font-[950] uppercase tracking-widest text-slate-900',
          defaultClassNames.caption_label,
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex border-b border-slate-50 pb-2', defaultClassNames.weekdays),
        weekday: cn(
          'text-slate-400 rounded-none flex-1 font-black text-[9px] uppercase tracking-widest text-center',
          '[&:nth-child(1)]:opacity-30 [&:nth-child(7)]:opacity-30',
          defaultClassNames.weekday,
        ),
        week: cn('flex w-full mt-1', defaultClassNames.week),
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
              <ChevronLeftIcon className={cn('size-3.5', className)} {...props} />
            )
          }
          if (orientation === 'right') {
            return (
              <ChevronRightIcon className={cn('size-3.5', className)} {...props} />
            )
          }
          return (
            <ChevronDownIcon className={cn('size-3.5', className)} {...props} />
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
        // Base: compact square, slightly smaller text
        'size-8 rounded-lg font-bold text-[11px] transition-all duration-200',
        'hover:bg-slate-100 hover:text-indigo-600',

        modifiers.selected && [
          'bg-indigo-600! text-white! rounded-lg shadow-md shadow-indigo-100 scale-105 z-10',
        ],

        modifiers.today && !modifiers.selected && 'text-indigo-600 bg-indigo-50/50',

        modifiers.disabled && 'hover:bg-transparent hover:text-slate-200 cursor-not-allowed',

        className,
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }