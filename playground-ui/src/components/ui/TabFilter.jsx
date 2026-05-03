import React, { useRef, useEffect, useState } from 'react';

/**
 * TabFilter - A premium tab component with a sliding background effect.
 * 
 * @param {Array} tabs - Array of { id, label } objects
 * @param {string} activeTabId - The currently selected tab ID
 * @param {function} onTabChange - Callback function when a tab is clicked
 * @param {string} className - Additional CSS classes for the container
 */
const TabFilter = ({ tabs, activeTabId, onTabChange, className = "" }) => {
    const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });
    const containerRef = useRef(null);

    useEffect(() => {
        // Run immediately and also on a small delay to catch layout shifts
        const updatePill = () => {
            const activeBtn = containerRef.current?.querySelector(`[data-tab-id="${activeTabId}"]`);
            if (activeBtn) {
                setPillStyle({
                    left: activeBtn.offsetLeft,
                    width: activeBtn.offsetWidth,
                    opacity: 1
                });
            }
        };

        updatePill();
        const timer = setTimeout(updatePill, 100);
        
        return () => clearTimeout(timer);
    }, [activeTabId, tabs]);

    if (!tabs || tabs.length === 0) return null;

    return (
        <div className={`max-w-full overflow-x-auto ${className}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div 
                ref={containerRef} 
                className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl w-max relative overflow-hidden"
            >
            {/* Sliding Background Pill */}
            <div 
                className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm transition-all duration-300 ease-in-out z-0"
                style={{
                    left: `${pillStyle.left}px`,
                    width: `${pillStyle.width}px`,
                    opacity: pillStyle.opacity
                }}
            />
            
            {tabs.map(tab => {
                const isActive = activeTabId === tab.id;
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        data-tab-id={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`
                            relative z-10 px-6 py-2 rounded-lg text-xs font-bold transition-all duration-300 whitespace-nowrap 
                            flex items-center gap-2
                            ${isActive 
                                ? 'text-violet-600 cursor-default' 
                                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                            }
                            active:scale-90 select-none
                        `}
                    >
                        {Icon && <Icon size={16} className={`${isActive ? 'text-violet-600' : 'text-slate-400'} transition-colors`} />}
                        {tab.label}
                    </button>
                );
            })}
            </div>
        </div>
    );
};

export default TabFilter;
