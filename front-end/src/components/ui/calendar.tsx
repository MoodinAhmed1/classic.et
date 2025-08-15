"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3",
        className
      )}
      classNames={{
        months: "flex gap-4 flex-col md:flex-row relative",
        month: "flex flex-col w-full gap-4",
        nav: "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 aria-disabled:opacity-50 p-0 select-none"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        caption: "flex items-center justify-center h-8 w-full px-2",
        caption_label: "select-none font-medium text-sm",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none",
        row: "flex w-full mt-2",
        cell: "relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
        ),
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeftIcon className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRightIcon className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}

export { Calendar }
