import { cn } from "@/lib/utils";

interface ContentContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

export function ContentContainer({ children, className, ...props }: ContentContainerProps) {
    return (
        <div
            className={cn(
                "container max-w-7xl mx-auto p-4 pb-24 md:p-8 space-y-6 md:space-y-8",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
