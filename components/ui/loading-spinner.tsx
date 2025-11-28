import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
    className?: string;
    size?: number;
}

export function LoadingSpinner({ className, size = 24 }: LoadingSpinnerProps) {
    return (
        <div className="flex items-center justify-center w-full h-full min-h-[200px]">
            <Loader2
                className={cn("animate-spin text-primary", className)}
                size={size}
            />
        </div>
    );
}
