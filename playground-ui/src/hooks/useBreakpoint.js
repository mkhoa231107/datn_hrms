import { useState, useEffect } from 'react';

/**
 * useBreakpoint — returns current responsive breakpoint info.
 * xs: < 480 | sm: 480-767 | md: 768-1023 | lg: 1024-1279 | xl: 1280+
 */
export function useBreakpoint() {
    const getBreakpoint = () => {
        const w = window.innerWidth;
        if (w < 480)  return 'xs';
        if (w < 768)  return 'sm';
        if (w < 1024) return 'md';
        if (w < 1280) return 'lg';
        return 'xl';
    };

    const [bp, setBp] = useState(getBreakpoint);
    const [width, setWidth] = useState(window.innerWidth);

    useEffect(() => {
        let raf;
        const handler = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                setWidth(window.innerWidth);
                setBp(getBreakpoint());
            });
        };
        window.addEventListener('resize', handler, { passive: true });
        return () => window.removeEventListener('resize', handler);
    }, []);

    return {
        bp,
        width,
        isMobile:  width < 768,   // xs + sm
        isTablet:  width >= 768 && width < 1024,  // md
        isDesktop: width >= 1024, // lg + xl
    };
}
