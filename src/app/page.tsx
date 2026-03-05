"use client"

import React, { useState, useRef, useMemo, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/ui/navbar";
import Art from "@/components/cards/art";
import Cursor from "@/components/ui/cursor";
import type { NavFilter } from "@/types/filter";
import type { WhiteboardTool } from "@/components/ui/whiteboard";

const Whiteboard = dynamic(() => import("@/components/ui/whiteboard"), { ssr: false });

function HomeContent() {
  const isAdmin = typeof document !== 'undefined' &&
    document.cookie.split(';').some(c => c.trim() === 'admin=true');

  const [isActive, setIsActive] = useState(false);
  const [radius, setRadius] = useState(20);
  const [navFilter, setNavFilter] = useState<NavFilter>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTool, setActiveTool] = useState<WhiteboardTool>('freedraw');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeColor, setStrokeColor] = useState('#6366f1'); // indigo-500

  const saveFnRef = useRef<(() => void) | null>(null);

  const handleOver = useCallback((n: number) => { setIsActive(true); setRadius(n); }, []);
  const handleLeave = useCallback((n: number) => { setIsActive(false); setRadius(n); }, []);
  const handleFilterChange = useCallback((filter: NavFilter) => { setNavFilter(filter); setSearchQuery(''); }, []);
  const handleSearch = useCallback((q: string) => setSearchQuery(q), []);
  const handleRegisterSave = useCallback((fn: () => void) => { saveFnRef.current = fn; }, []);
  const handleSave = useCallback(() => saveFnRef.current?.(), []);
  const handleSaved = useCallback(() => { setNavFilter({ type: 'fan_art' }); setSearchQuery(''); }, []);

  const cursorElement = useMemo(() =>
    <Cursor isActive={isActive} radius={radius} />,
    [isActive, radius]
  );

  const navbar = useMemo(() => (
    <div onMouseOver={() => handleOver(46)} onMouseLeave={() => handleLeave(22)}>
      <Navbar
        onFilterChange={handleFilterChange}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        strokeColor={strokeColor}
        onStrokeColorChange={setStrokeColor}
        onSave={handleSave}
        onSearch={handleSearch}
      />
    </div>
  ), [handleOver, handleLeave, handleFilterChange, activeTool, strokeWidth, strokeColor, handleSave, handleSearch]);

  const contentSections = useMemo(() => (
    <div id="/"
         className="pl-[16vw] pr-[25vw] sm:pl-[13vw] sm:pr-[20vw] md:px-[11vw] pt-3 sm:pt-4 md:pt-4 w-full md:w-1/2 my-4"
         onMouseOver={() => handleOver(46)}
         onMouseLeave={() => handleLeave(22)}>
      <Art filter={navFilter} onFilterChange={handleFilterChange} searchQuery={searchQuery} isAdmin={isAdmin} />
    </div>
  ), [handleOver, handleLeave, navFilter, handleFilterChange, searchQuery, isAdmin]);

  const mainContent = useMemo(() => (
    <div className="absolute top-0 left-0 right-0 w-full min-h-[100vh] bg-amber-50 select-none overflow-y-auto opacity-0 animate-fadeIn">
      {navbar}
      <Whiteboard
        activeTool={activeTool}
        strokeWidth={strokeWidth}
        strokeColor={strokeColor}
        onRegisterSave={handleRegisterSave}
        onSaved={handleSaved}
      />
      {contentSections}
      
    </div>
  ), [navbar, contentSections, activeTool, strokeWidth, strokeColor, handleRegisterSave, handleSaved]);

  return (
    <main>
      {mainContent}
      {cursorElement}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
