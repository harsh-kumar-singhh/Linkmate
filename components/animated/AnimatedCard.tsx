"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
}

export function AnimatedCard({ children, ...props }: AnimatedCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            {...props}
        >
            {children}
        </motion.div>
    );
}
