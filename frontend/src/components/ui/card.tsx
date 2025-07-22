import { cn } from "@/lib/utils";
import * as React from "react";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("rounded-lg border border-gray-700 bg-gray-800 shadow-lg", className)}
            {...props}
        />
    )
);

Card.displayName = "Card";

export { Card };
