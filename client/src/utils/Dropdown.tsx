import classNames from 'classnames';
import { PropsWithChildren, useEffect } from 'react';
import React from 'react';

export const Dropdown: React.FC<PropsWithChildren<{
    x: number;
    y: number;
    onClose?: () => void;
}>> = ({
    x,
    y,
    children,
    onClose
}) => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            // Check if the click was outside the dropdown
            if (onClose && !target.closest('[data-dropdown-content]')) {
                onClose();
            }
        };

        window.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('click', handleClickOutside);
        };
    }, [onClose]);

    // Determine which half of the screen was clicked.
    const isLeft = x < screenWidth / 2;
    const isTop = y < screenHeight / 2;

    // Based on quadrant, pick transform origin and translation classes.
    const positionClass = classNames('transform', {
        // top-left quadrant
        'origin-top-left translate-x-0 translate-y-0': isLeft && isTop,
        // top-right quadrant
        'origin-top-right -translate-x-full': !isLeft && isTop,
        // bottom-left quadrant
        'origin-bottom-left -translate-y-full': isLeft && !isTop,
        // bottom-right quadrant
        'origin-bottom-right -translate-x-full -translate-y-full': !isLeft && !isTop,
    });

    return (
        <div
            className={classNames(
                'fixed',
                positionClass
            )}
            style={{ left: x, top: y }}
            data-dropdown-content
        >
            {children}
        </div>
    );
};