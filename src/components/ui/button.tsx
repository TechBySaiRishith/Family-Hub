import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background hover:bg-foreground/90 shadow-sm",
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm",
        outline:
          "border-foreground/20 bg-transparent hover:bg-foreground/5 hover:border-foreground/30 aria-expanded:bg-foreground/5",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70 aria-expanded:bg-secondary",
        ghost:
          "hover:bg-foreground/5 aria-expanded:bg-foreground/5",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 rounded-sm px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-sm px-3 text-[0.8125rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-7 text-[0.9375rem] has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-10",
        "icon-xs":
          "size-7 rounded-sm [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm":
          "size-8 rounded-sm",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<typeof ButtonPrimitive> &
  VariantProps<typeof buttonVariants>

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  nativeButton,
  ...props
}: ButtonProps) {
  // Auto-detect non-button elements in render prop to avoid base-ui warning
  const isNativeButton =
    nativeButton ??
    (render && React.isValidElement(render) && render.type !== "button"
      ? false
      : true)

  return (
    <ButtonPrimitive
      data-slot="button"
      render={render}
      nativeButton={isNativeButton}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
