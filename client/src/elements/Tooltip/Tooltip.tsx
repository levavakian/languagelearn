import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useStateValue } from '../../state/state';
import type { CourseSettings, NoteNode } from '../../state/state';

export const Tooltip = () => {
    const settings = useStateValue(state => state.currentCourse.settings);
    const tooltipInfo = useStateValue(state => state.currentChat.tooltipInfo);

    if (!tooltipInfo) return null;

    return (
        <div className="absolute z-50" style={{
            left: `${tooltipInfo.x}px`,
            top: `${tooltipInfo.y}px`,
        }}>
            <div className="bg-white shadow-lg rounded-lg p-4 border border-gray-200 w-64 h-64 mb-8 mr-8">
                {/* Content will go here later */}
            </div>
        </div>
    );
};