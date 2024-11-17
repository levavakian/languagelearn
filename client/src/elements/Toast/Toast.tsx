import React, { useEffect } from "react";
import toast, { Toaster, useToasterStore, ToastBar } from "react-hot-toast";

function useMaxToasts(max: number) {
    const { toasts } = useToasterStore();
    
    useEffect(() => {
        toasts
        .filter((t) => t.visible)
        .filter((_, i) => i >= max)
        .forEach((t) => toast.dismiss(t.id));
    }, [toasts, max]);
}

export function ToasterWithMax({
    max = 10,
    ...props
}: React.ComponentProps<typeof Toaster> & {
    max?: number;
}) {
    useMaxToasts(max);
    
    return (
        <Toaster {...props}>
            {(t) => (
                <ToastBar toast={t}>
                    {({ icon, message }) => (
                        <div onClick={() => toast.dismiss(t.id)} style={{ cursor: 'pointer' }}>
                            {icon}
                            {message}
                        </div>
                    )}
                </ToastBar>
            )}
        </Toaster>
    );
}