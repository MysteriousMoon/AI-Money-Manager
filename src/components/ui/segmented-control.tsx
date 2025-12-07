import * as React from "react"
import { cn } from "@/lib/utils"

interface SegmentedControlProps {
    options: { label: string; value: string }[]
    value: string
    onChange: (value: string) => void
    className?: string
}

export function SegmentedControl({
    options,
    value,
    onChange,
    className,
}: SegmentedControlProps) {
    const selectedIndex = options.findIndex((o) => o.value === value)
    const count = options.length

    // p-1 is 0.25rem. We use calc to adjust for the padding.
    // Container padding: 0.25rem (left) + 0.25rem (right) = 0.5rem total horizontal deduction.
    // Slider width: (100% - 0.5rem) / count
    // Slider left: 0.25rem + (index) * width

    return (
        <div className={cn("relative flex items-center bg-muted p-1 rounded-full select-none w-fit", className)}>
            {/* Slider */}
            <div
                className="absolute top-1 bottom-1 bg-background rounded-full shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]"
                style={{
                    width: `calc((100% - 0.5rem) / ${count})`,
                    left: `calc(0.25rem + ((100% - 0.5rem) / ${count}) * ${selectedIndex})`,
                }}
            />
            {/* Items */}
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "flex-1 z-10 text-xs font-medium text-center py-1.5 px-3 min-w-[2.5rem] whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full",
                        value === option.value
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground/70"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}
