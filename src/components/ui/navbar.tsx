"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "react-scroll";
import { usePathname } from "next/navigation";
import { IconContext } from "react-icons";
import { FaPenNib, FaEraser, FaFloppyDisk, FaRocket, FaMagnifyingGlass } from "react-icons/fa6";
import { BsCursorFill } from "react-icons/bs";
import IconToggle from "./icon-toggle";
import { supabase } from "@/lib/supabase";
import type { NavFilter } from "@/types/filter";
import type { WhiteboardTool } from "./whiteboard";

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// primary: stone-600 bold — section labels, main nav actions
const itemClass = "text-right text-stone-600 font-nunitosans font-bold tracking-wide text-xs md:text-sm hover:text-base py-[0.25rem] pointer-events-auto transition-transform duration-300 ease-in-out";
// secondary: stone-500 semibold — years, category sub-headings
const subItemClass = "text-right text-stone-500 font-nunitosans font-semibold tracking-wide text-xs md:text-sm hover:text-base py-0 pointer-events-auto transition-transform duration-300 ease-in-out cursor-pointer";
// tertiary: stone-500/70 medium — months, project ids, metadata
const metaItemClass = "text-right text-stone-500/70 font-nunitosans font-medium tracking-wide text-xs md:text-sm hover:text-base py-0 pointer-events-auto transition-transform duration-300 ease-in-out cursor-pointer";

interface NavItemProps {
    to: string;
    delay: string;
    children: React.ReactNode;
    pathname: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, delay, children, pathname }) => {
    const isHomePage = pathname === "/";
    const router = useRouter();

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        router.push("/");
    };

    return (
        <div className={`opacity-0 animate-fadeIn duration-700 ${delay} ${itemClass}`}>
            {isHomePage ? (
                <Link href="" to={to} smooth={true} duration={500} spy={true}>{children}</Link>
            ) : (
                to === "/" ? (
                    <a href="/" onClick={handleClick}>{children}</a>
                ) : (
                    <a href={`/#${to}`}>{children}</a>
                )
            )}
        </div>
    );
};

interface IconLinkProps {
    href?: string;
    delay: string;
    children: React.ReactNode;
}

const IconLink: React.FC<IconLinkProps> = ({ href, delay, children }) => {
    return (
        <main>
            <a href={href} target="_blank" className={`opacity-0 animate-fadeIn duration-700 ${delay}`}>
                <IconContext.Provider value={{ className: "hover:size-7 duration-100 ease-out" }}>
                    {children}
                </IconContext.Provider>
            </a>
        </main>
    );
};

interface SketchMeta {
    years: number[];
    monthsByYear: Record<number, number[]>;
}

interface NavbarProps {
    onFilterChange?: (filter: NavFilter) => void;
    activeTool?: WhiteboardTool;
    onToolChange?: (tool: WhiteboardTool) => void;
    strokeWidth?: number;
    onStrokeWidthChange?: (w: number) => void;
    strokeColor?: string;
    onStrokeColorChange?: (c: string) => void;
    onSave?: () => void;
    onSearch?: (q: string) => void;
}

const STROKE_WIDTHS = [1, 2, 4] as const;
const STROKE_HEIGHTS: Record<number, string> = { 1: '2px', 2: '4px', 4: '7px' };
const COLORS = ['#78716c', '#6366f1'] as const; // stone-500, indigo-500
const COLOR_CLASSES: Record<string, string> = { '#78716c': 'bg-stone-500', '#6366f1': 'bg-indigo-500' };

const Navbar: React.FC<NavbarProps> = ({ onFilterChange, activeTool, onToolChange, strokeWidth, onStrokeWidthChange, strokeColor, onStrokeColorChange, onSave, onSearch }) => {
    const pathname = usePathname();
    const [openDropdown, setOpenDropdown] = useState<'sketches' | 'projects' | null>(null);
    const [expandedYear, setExpandedYear] = useState<number | null>(null);
    const [sketchMeta, setSketchMeta] = useState<SketchMeta>({ years: [], monthsByYear: {} });
    const [projectIds, setProjectIds] = useState<string[]>([]);

    // Local state for immediate visual feedback (no parent re-render delay)
    const [localTool, setLocalTool] = useState<WhiteboardTool>(activeTool ?? 'freedraw');
    const [localWidth, setLocalWidth] = useState(strokeWidth ?? 2);
    const [localColor, setLocalColor] = useState(strokeColor ?? '#6366f1');

    useEffect(() => { if (activeTool !== undefined) setLocalTool(activeTool); }, [activeTool]);
    useEffect(() => { if (strokeWidth !== undefined) setLocalWidth(strokeWidth); }, [strokeWidth]);
    useEffect(() => { if (strokeColor !== undefined) setLocalColor(strokeColor); }, [strokeColor]);

    const [penHover, setPenHover] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleToolChange = (tool: WhiteboardTool) => { setLocalTool(tool); onToolChange?.(tool); };
    const handleWidthChange = (w: number) => { setLocalWidth(w); onStrokeWidthChange?.(w); };
    const handleColorChange = (c: string) => { setLocalColor(c); onStrokeColorChange?.(c); };
    const handleFilterChange = (filter: NavFilter) => { setSearchQuery(''); onSearch?.(''); onFilterChange?.(filter); };

    // Fetch sketch years/months and distinct project IDs on mount
    useEffect(() => {
        const fetchNavData = async () => {
            if (!supabase) return;

            const [{ data: sketchData }, { data: projectData }] = await Promise.all([
                supabase.from('sketches').select('date').not('date', 'is', null),
                supabase.from('projects').select('id'),
            ]);

            if (sketchData) {
                const monthsByYear: Record<number, number[]> = {};
                sketchData.forEach(({ date }) => {
                    const [yearStr, monthStr] = date.split('-');
                    const year = parseInt(yearStr, 10);
                    const month = parseInt(monthStr, 10);
                    if (!monthsByYear[year]) monthsByYear[year] = [];
                    if (!monthsByYear[year].includes(month)) monthsByYear[year].push(month);
                });
                Object.values(monthsByYear).forEach(months => months.sort((a, b) => a - b));
                const years = Object.keys(monthsByYear).map(Number).sort((a, b) => b - a);
                setSketchMeta({ years, monthsByYear });
            }

            if (projectData) {
                const ids = Array.from(new Set(projectData.map(r => r.id))).sort();
                setProjectIds(ids);
            }
        };
        fetchNavData();
    }, []);


    return (
        <main className="fixed w-full z-50 top-0 left-0 text-stone-600">
            <div className="fixed top-[-.25rem] left-[-.25rem] m-nav drop-shadow-md">
                <IconToggle />
            </div>

            <div className="fixed top-[.25rem] mt-nav left-[16.5vw] sm:left-[13.5vw] md:left-[11.5vw] drop-shadow-md">
                <div className="opacity-0 animate-fadeIn duration-700 delay-500 flex items-center gap-2 border-b border-stone-200 pb-1">
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onSearch?.(searchQuery.trim())}
                        placeholder="search"
                        className="text-stone-600 font-nunitosans font-medium text-sm bg-transparent outline-none w-44 placeholder:text-stone-400"
                    />
                    <button
                        onClick={() => onSearch?.(searchQuery.trim())}
                        className="text-stone-400 hover:text-indigo-500 duration-100 ease-out"
                    >
                        <FaMagnifyingGlass size={13} />
                    </button>
                </div>
            </div>

            <div className="fixed top-[-.25rem] right-0 m-nav drop-shadow-md">
                <ul>
                    {/* SKETCHES */}
                    <div
                        onMouseEnter={() => setOpenDropdown('sketches')}
                        onMouseLeave={() => { setOpenDropdown(null); setExpandedYear(null); }}
                    >
                        <div
                            className={`opacity-0 animate-fadeIn duration-700 delay-600 ${itemClass} cursor-pointer`}
                            onClick={() => handleFilterChange(null)}
                        >
                            SKETCHES
                        </div>
                        {openDropdown === 'sketches' && (
                            <div className="opacity-0 animate-fadeIn duration-300">
                                {sketchMeta.years.map(year => (
                                    <div
                                        key={year}
                                        onMouseEnter={() => setExpandedYear(year)}
                                        onMouseLeave={() => setExpandedYear(null)}
                                    >
                                        <div className={subItemClass}>{year}</div>
                                        {expandedYear === year && (
                                            <div className="opacity-0 animate-fadeIn duration-200">
                                                {sketchMeta.monthsByYear[year].map(m => (
                                                    <div
                                                        key={m}
                                                        className={metaItemClass}
                                                        onClick={() => handleFilterChange({ type: 'sketches', year, month: m })}
                                                    >
                                                        {MONTHS[m - 1]}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* PROJECTS */}
                    <div
                        onMouseEnter={() => setOpenDropdown('projects')}
                        onMouseLeave={() => setOpenDropdown(null)}
                    >
                        <div className={`opacity-0 animate-fadeIn duration-700 delay-700 ${itemClass}`}>
                            PROJECTS
                        </div>
                        {openDropdown === 'projects' && (
                            <div className="opacity-0 animate-fadeIn duration-300 pb-[0.25rem]">
                                {projectIds.map(id => (
                                    <div
                                        key={id}
                                        className={subItemClass}
                                        onClick={() => handleFilterChange({ type: 'projects', projectId: id })}
                                    >
                                        {id}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div
                        className={`opacity-0 animate-fadeIn duration-700 delay-800 ${itemClass} cursor-pointer`}
                        onClick={() => handleFilterChange({ type: 'fan_art' })}
                    >
                        COMMUNITY
                    </div>
                    <NavItem to="about" delay="delay-900" pathname={pathname}>ABOUT</NavItem>
                </ul>
            </div>

            <div className="fixed bottom-0 right-0 m-nav drop-shadow-md">
                {/* Save */}
                <div className="flex justify-end opacity-0 animate-fadeIn duration-700 delay-1400">
                    <button onClick={() => onSave?.()} className="text-stone-500/70 hover:text-stone-600 duration-100 ease-out">
                    <IconContext.Provider value={{ className: "hover:size-7 duration-100 ease-out" }}>
                        <FaFloppyDisk size={22}/>
                    </IconContext.Provider>
                    </button>
                </div>
                <div className="h-6" />
                {/* Draw tool with hover submenu */}
                <div
                    className="relative flex justify-end"
                    onMouseEnter={() => setPenHover(true)}
                    onMouseLeave={() => setPenHover(false)}
                >
                    {penHover && (
                        <div className="absolute right-full pr-6 -translate-y-3 opacity-0 animate-fadeIn duration-200">
                            <div className="flex gap-6 p-2">
                                {/* Colors */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-right text-stone-500/70 font-nunitosans font-medium tracking-wide text-xs md:text-sm py-0 transition-transform duration-300 ease-in-out">color</span>
                                    <div className="flex gap-1.5">
                                        {COLORS.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => {handleColorChange(c); handleToolChange('freedraw')}}
                                                className={`w-5 h-3 rounded-sm ${COLOR_CLASSES[c]} transition-opacity duration-100 ${localColor === c ? 'opacity-100' : 'opacity-30'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                {/* Stroke widths */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-right text-stone-500/70 font-nunitosans font-medium tracking-wide text-xs md:text-sm py-0 transition-transform duration-300 ease-in-out">weight</span>
                                    <div className="flex gap-2 items-center">
                                        {STROKE_WIDTHS.map(w => (
                                            <button key={w} onClick={() => {handleWidthChange(w); handleToolChange('freedraw')}}>
                                                <div
                                                    className={`w-5 rounded-sm transition-colors duration-100 ${localWidth === w ? 'bg-stone-500' : 'bg-stone-300'}`}
                                                    style={{ height: STROKE_HEIGHTS[w] }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => handleToolChange('freedraw')}
                        className={`opacity-0 animate-fadeIn delay-1500 duration-700 ease-out ${localTool === 'freedraw' ? 'text-stone-600' : 'text-stone-400'}`}
                    >
                        <IconContext.Provider value={{ className: "hover:size-7 hover:text-stone-600 duration-100 ease-out" }} >
                            <FaPenNib size={22} />
                        </IconContext.Provider>
                    </button>
                </div>
                <div className="h-6" />
                <button onClick={() => handleToolChange('eraser')} className={`flex justify-end w-full opacity-0 animate-fadeIn delay-1600 hover:scale-110 duration-700 ease-out ${localTool === 'eraser' ? 'text-stone-600' : 'text-stone-400'}`}>
                    <IconContext.Provider value={{ className: "hover:size-7 hover:text-stone-600 duration-100 ease-out" }} >
                        <FaEraser size={22} />
                    </IconContext.Provider>
                </button>
                <div className="h-6" />
                <button onClick={() => handleToolChange('selection')} className={`flex justify-end w-full opacity-0 animate-fadeIn delay-1700 hover:scale-110 duration-700 ease-out ${localTool === 'selection' ? 'text-stone-600' : 'text-stone-400'}`}>
                    <IconContext.Provider value={{ className: "hover:size-7 hover:text-stone-600 duration-100 ease-out" }} >
                        <BsCursorFill size={22} />
                    </IconContext.Provider>
                </button>
            </div>

            <div className="fixed bottom-0 left-0 m-nav drop-shadow-md">
                <IconLink href="https://wuyirenn.com" delay="delay-1500">
                    <FaRocket size={22} />
                </IconLink>
                {/* <div className="h-6" /> */}
            </div>
        </main>
    );
};

export default Navbar;
