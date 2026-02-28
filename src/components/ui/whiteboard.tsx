"use client"

import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Excalidraw, exportToSvg } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { supabase } from '@/lib/supabase';

export type WhiteboardTool = 'freedraw' | 'eraser' | 'selection';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawAPI = any;

// map hex stroke color → color name used in the database
const COLOR_NAMES: Record<string, string> = {
    '#78716c': 'yamaguri',
    '#6366f1': 'ajisai',
};

interface WhiteboardProps {
    activeTool: WhiteboardTool;
    strokeWidth: number;
    strokeColor: string;
    onRegisterSave: (fn: () => void) => void;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ activeTool, strokeWidth, strokeColor, onRegisterSave }) => {
    const apiRef = useRef<ExcalidrawAPI>(null);
    const pendingSaveRef = useRef<((artist: string, desc: string) => Promise<void>) | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [artist, setArtist] = useState('');
    const [desc, setDesc] = useState('');

    useEffect(() => {
        apiRef.current?.setActiveTool({ type: activeTool });
    }, [activeTool]);

    useEffect(() => {
        apiRef.current?.updateScene({ appState: { currentItemStrokeWidth: strokeWidth } });
    }, [strokeWidth]);

    useEffect(() => {
        apiRef.current?.updateScene({ appState: { currentItemStrokeColor: strokeColor } });
    }, [strokeColor]);

    const handleModalConfirm = async () => {
        setShowModal(false);
        await pendingSaveRef.current?.(artist, desc);
        setArtist('');
        setDesc('');
    };

    return (
        <div className="fixed w-[100vw] h-[100vh]">
            <style>{`
                .excalidraw .layer-ui__wrapper,
                .excalidraw .App-toolbar-container,
                .excalidraw .App-toolbar,
                .excalidraw .App-bottom-bar,
                .excalidraw footer,
                .excalidraw .footer-center,
                .excalidraw .Island,
                .excalidraw .island,
                .excalidraw .HintViewer { display: none !important; }
            `}</style>

            {showModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md backdrop-brightness-90">
                    <div
                        className="bg-amber-50 rounded-lg shadow-lg p-6 flex flex-col gap-4 min-w-[280px]"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex flex-col gap-1">
                            <label className="text-stone-500/70 font-nunitosans font-medium text-xs">title</label>
                            <input
                                value={desc}
                                onChange={e => setDesc(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleModalConfirm()}
                                className="text-stone-600 font-nunitosans font-semibold text-sm border-b border-stone-300 bg-amber-50 outline-none pb-1"
                                placeholder="..."
                                autoFocus
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-stone-500/70 font-nunitosans font-medium text-xs">artist</label>
                            <input
                                value={artist}
                                onChange={e => setArtist(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleModalConfirm()}
                                className="text-stone-600 font-nunitosans font-semibold text-sm border-b border-stone-300 bg-amber-50 outline-none pb-1"
                                placeholder="..."
                            />
                        </div>
                        <div className="flex justify-end gap-4 mt-2">
                            <button
                                onClick={() => { setShowModal(false); setArtist(''); setDesc(''); }}
                                className="text-stone-400 font-nunitosans font-medium text-xs hover:text-stone-600 duration-100"
                            >
                                cancel
                            </button>
                            <button
                                onClick={handleModalConfirm}
                                className="text-stone-600 font-nunitosans font-semibold text-xs hover:text-stone-800 duration-100"
                            >
                                save
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <Excalidraw
                excalidrawAPI={(api) => {
                    apiRef.current = api;
                    api.setActiveTool({ type: activeTool });
                    onRegisterSave(() => {
                        pendingSaveRef.current = async (artistName, description) => {
                            const appState = api.getAppState();
                            const svg = await exportToSvg({
                                elements: api.getSceneElements(),
                                appState,
                                files: api.getFiles(),
                                exportPadding: 20,
                            });
                            const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });

                            // download locally
                            const localUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = localUrl;
                            a.download = 'whiteboard.svg';
                            a.click();
                            URL.revokeObjectURL(localUrl);

                            // upload to Supabase
                            if (supabase) {
                                const now = new Date();
                                const pad = (n: number) => String(n).padStart(2, '0');
                                const id = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
                                const filename = `${id}.svg`;
                                const { error: uploadError } = await supabase.storage
                                    .from('fan_art')
                                    .upload(filename, blob, { contentType: 'image/svg+xml' });
                                if (uploadError) {
                                    console.error('Upload failed:', uploadError);
                                    return;
                                }
                                const { data: urlData } = supabase.storage.from('fan_art').getPublicUrl(filename);
                                const color = COLOR_NAMES[appState.currentItemStrokeColor] ?? 'ajisai';
                                const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                                const { error: insertError } = await supabase.from('fan_art').insert({
                                    id,
                                    url: urlData.publicUrl,
                                    description,
                                    artist: artistName,
                                    color,
                                    date,
                                });
                                if (insertError) console.error('Insert failed:', insertError);
                            }
                        };
                        setShowModal(true);
                    });
                }}
                initialData={{
                    appState: {
                        viewBackgroundColor: '#fcfaed',
                        currentItemStrokeColor: strokeColor,
                        currentItemStrokeWidth: strokeWidth,
                        currentItemRoughness: 0,
                        currentItemOpacity: 100,
                        activeTool: { type: activeTool, customType: null, lastActiveTool: null, locked: false },
                    },
                }}
                UIOptions={{
                    canvasActions: {
                        changeViewBackgroundColor: false,
                        clearCanvas: false,
                        export: false,
                        loadScene: false,
                        saveToActiveFile: false,
                        toggleTheme: false,
                        saveAsImage: false,
                    },
                    tools: { image: false },
                }}
            />
        </div>
    );
};

export default Whiteboard;
