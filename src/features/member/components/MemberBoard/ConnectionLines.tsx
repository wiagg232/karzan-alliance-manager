import { useEffect, useState, useRef } from 'react';
import { useMemberBoardStore } from './store/useMemberBoardStore';

export default function ConnectionLines() {
    const { localMembers, stagingMembers } = useMemberBoardStore();
    const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);
    const linesRef = useRef(lines);
    const containerRef = useRef<SVGSVGElement>(null);
    
    // Update ref whenever lines change
    linesRef.current = lines;

    useEffect(() => {
        const updateLines = () => {
            if (!containerRef.current) return;
            
            const allMembers = [...localMembers, ...stagingMembers];
            const newLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
            
            const svg = containerRef.current;
            const svgRect = svg.getBoundingClientRect();
            const matrix = svg.getScreenCTM()?.inverse();

            if (!matrix) return;

            allMembers.forEach(member => {
                if (member.parentId) {
                    const parent = allMembers.find(m => m.id === member.parentId);
                    if (parent) {
                        const el1 = document.getElementById(`member-${member.id}`);
                        const el2 = document.getElementById(`member-${parent.id}`);
                        
                        if (el1 && el2) {
                            const rect1 = el1.getBoundingClientRect();
                            const rect2 = el2.getBoundingClientRect();
                            
                            const pt1 = svg.createSVGPoint();
                            pt1.x = rect1.left + rect1.width / 2;
                            pt1.y = rect1.top + rect1.height / 2;
                            const p1 = pt1.matrixTransform(matrix);

                            const pt2 = svg.createSVGPoint();
                            pt2.x = rect2.left + rect2.width / 2;
                            pt2.y = rect2.top + rect2.height / 2;
                            const p2 = pt2.matrixTransform(matrix);

                            newLines.push({
                                x1: p1.x,
                                y1: p1.y,
                                x2: p2.x,
                                y2: p2.y,
                            });
                        }
                    }
                }
            });
            // Only update state if lines actually changed (shallow comparison)
            const currentLines = linesRef.current;
            if (newLines.length !== currentLines.length) {
                setLines(newLines);
            } else {
                let hasChanged = false;
                for (let i = 0; i < newLines.length; i++) {
                    if (newLines[i].x1 !== currentLines[i].x1 || newLines[i].y1 !== currentLines[i].y1 ||
                        newLines[i].x2 !== currentLines[i].x2 || newLines[i].y2 !== currentLines[i].y2) {
                        hasChanged = true;
                        break;
                    }
                }
                if (hasChanged) {
                    setLines(newLines);
                }
            }
        };

        // Initial update
        updateLines();
        
        // Polling for position changes (e.g. after layout shifts or moves)
        // Reduced interval from 200ms to 500ms for better performance
        const interval = setInterval(updateLines, 500);
        
        // Update on window events
        window.addEventListener('resize', updateLines);
        window.addEventListener('scroll', updateLines);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', updateLines);
            window.removeEventListener('scroll', updateLines);
        };
    }, [localMembers, stagingMembers]);

    return (
        <svg
            ref={containerRef}
            className="absolute inset-0 pointer-events-none z-20"
            style={{ width: '100%', height: '100%', minHeight: '180vh' }}
        >
            <defs>
                <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="0"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill="rgba(239, 68, 68, 0.6)" />
                </marker>
            </defs>
            {lines.map((line, i) => (
                <line
                    key={i}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke="rgba(239, 68, 68, 0.6)"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                />
            ))}
        </svg>
    );
}
