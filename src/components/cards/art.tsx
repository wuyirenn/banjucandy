"use client"

import React, { useState, useEffect } from 'react';
import { FaTrash } from 'react-icons/fa6';
import LightboxModal from '../ui/lightbox';
import { supabase } from '@/lib/supabase';
import type { NavFilter } from '@/types/filter';

interface ImageData {
    id: number;
    src: string;
    description: string;
    location: string;
    date: string;
    color: string;
    artist: string;
}

interface ArtProps {
    filter?: NavFilter;
    onFilterChange?: (filter: NavFilter) => void;
    searchQuery?: string;
    isAdmin?: boolean;
}

const Art: React.FC<ArtProps> = ({ filter, onFilterChange, searchQuery, isAdmin }) => {
    const [images, setImages] = useState<ImageData[]>([]);
    const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [radius, setRadius] = useState(20);
    const [loadedImages, setLoadedImages] = useState<{[key: number]: boolean}>({});
    const [imagesVisible, setImagesVisible] = useState(false);
    const pendingLoads = React.useRef<{[key: number]: boolean}>({});
    const rafRef = React.useRef<number | null>(null);

    useEffect(() => {
        if (!isAdmin || !supabase) return;
        const client = supabase;
        fetch('/api/admin-login', { method: 'POST' })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.access_token) {
                    client.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
                }
            })
            .catch(e => console.error('Admin auth failed:', e));
    }, [isAdmin]);

    useEffect(() => {
        let cancelled = false;

        const fetchImages = async () => {
            if (!supabase) { console.error('Supabase not configured.'); return; }

            setImagesVisible(false);
            await new Promise(r => setTimeout(r, 1000));
            if (cancelled) return;

            setImages([]);

            let query;

            if (filter?.type === 'projects') {
                query = supabase
                    .from('project_images')
                    .select('id, date, description, url, color')
                    .eq('project_id', filter.projectId);
            } else if (filter?.type === 'sketches') {
                const { year, month } = filter;
                const start = `${year}-${String(month).padStart(2, '0')}-01`;
                const nextMonth = month === 12 ? 1 : month + 1;
                const nextYear = month === 12 ? year + 1 : year;
                const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
                query = supabase
                    .from('sketches')
                    .select('id, date, description, url, color')
                    .gte('date', start)
                    .lt('date', end)
                    .order('id', { ascending: false });
            } else if (filter?.type === 'fan_art') {
                let q = supabase
                    .from('fan_art')
                    .select('id, date, description, url, color, artist')
                    .order('id', { ascending: false });
                if (filter.artist) q = q.eq('artist', filter.artist);
                query = q;
            } else {
                query = supabase
                    .from('sketches')
                    .select('id, date, description, url, color')
                    .order('id', { ascending: false });
            }

            const { data, error } = await query;
            if (cancelled) return;
            if (error) { console.error(error); return; }
            if (!data) return;

            const mapped: ImageData[] = data.map(row => ({
                id: Number(row.id),
                src: row.url,
                description: row.description ?? '',
                location: '',
                date: row.date ?? '',
                color: row.color ?? 'yamaguri',
                artist: ('artist' in row ? row.artist : null) ?? 'anonymous',
            }));

            setImages(mapped);
            setLoadedImages(mapped.reduce((acc, img) => ({ ...acc, [img.id]: false }), {}));
            setTimeout(() => setImagesVisible(true), 100);
        };

        fetchImages();
        return () => { cancelled = true; };
    }, [filter]);


    useEffect(() => {
        if (images.length === 0) return;
        pendingLoads.current = {};
        const loaders: HTMLImageElement[] = [];
        images.forEach(image => {
            const img = new Image();
            img.src = image.src;
            img.onload = () => {
                pendingLoads.current[image.id] = true;
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                rafRef.current = requestAnimationFrame(() => {
                    setLoadedImages(prev => ({ ...prev, ...pendingLoads.current }));
                });
            };
            loaders.push(img);
        });
        return () => {
            loaders.forEach(img => { img.onload = null; });
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [images]);

    const openLightbox = React.useCallback((image: ImageData) => setSelectedImage(image), []);
    const closeLightbox = React.useCallback(() => setSelectedImage(null), []);
    const handleOver = React.useCallback((n: number) => { setIsActive(true); setRadius(n); }, []);
    const handleLeave = React.useCallback((n: number) => { setIsActive(false); setRadius(n); }, []);

    const handleDelete = async (image: ImageData) => {
        if (!supabase) return;
        const filename = image.src.split('/').pop()!;
        await supabase.storage.from('fan_art').remove([filename]);
        await supabase.from('fan_art').delete().eq('url', image.src);
        setImages(prev => prev.filter(img => img.id !== image.id));
    };

    const q = searchQuery?.trim().toLowerCase() ?? '';
    const visibleImages = q
        ? images.filter(img => {
            const matchDesc = img.description.toLowerCase().includes(q);
            const matchArtist = filter?.type === 'fan_art' && img.artist.toLowerCase().includes(q);
            return matchDesc || matchArtist;
          })
        : images;

    return (
        <main className="">
            <div className="font-avantgarde drop-shadow-md">
                {!filter && (
                    <div className="flex flex-col mt-10 sm:mt-14 md:mt-20 text-left">
                        <span className="text-stone-500/70 font-nunitosans font-medium text-sm">
                            drawing with friends on <span className="text-stone-600">sundays @ noon!</span> 
                        </span>
                        <span className="font-nunitosans font-medium text-sm text-stone-600">
                            2/28: third wheel coffee, SF
                        </span>
                    </div>
                )}
                <div className="columns-1 gap-4 mt-10 sm:mt-14 md:mt-20">
                    {visibleImages.map((image) => (
                        <div
                            key={image.id}
                            className="mb-4 break-inside-avoid w-full"
                            style={{ display: 'inline-block', width: '100%', contentVisibility: 'auto' }}
                        >
                            <div className={`transition-opacity duration-1000 ease-in-out ${loadedImages[image.id] && imagesVisible ? 'opacity-100' : 'opacity-0'}`}>
                                <div className="relative group">
                                    <img
                                        src={image.src}
                                        alt={image.description}
                                        className="w-full h-auto object-cover rounded-lg shadow-md"
                                        onClick={() => openLightbox(image)}
                                        onMouseOver={() => handleOver(46)}
                                        onMouseLeave={() => handleLeave(22)}
                                        width="100%"
                                        height="auto"
                                    />
                                    {isAdmin && filter?.type === 'fan_art' && (
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDelete(image); }}
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-100 bg-white/80 rounded p-1.5 text-stone-400 hover:text-stone-600"
                                        >
                                            <FaTrash size={11} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className={`font-nunitosans font-semibold text-xs ${image.color === 'yamaguri' ? 'text-stone-600' : 'text-indigo-600'}`}>
                                        {filter?.type === 'fan_art'
                                            ? <>&ldquo;{image.description}&rdquo; by <span className="underline cursor-pointer" onClick={e => { e.stopPropagation(); onFilterChange?.({ type: 'fan_art', artist: image.artist }); }}>{image.artist}</span></>
                                            : image.description}
                                    </span>
                                    <span className={`font-nunitosans font-medium text-xs ${image.color === 'yamaguri' ? 'text-stone-500/70' : 'text-indigo-500/70'}`}>{image.date ? image.date.replaceAll('-', '.') : ''}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {!filter && (
                    <div className="mt-4 mb-8 text-left text-stone-500/70 font-nunitosans font-medium text-sm">
                        tune in later for more sketches!
                    </div>
                )}
                {filter?.type === 'sketches' && (
                    <div className="mt-4 mb-8 text-left text-stone-500/70 font-nunitosans font-medium text-sm">
                        tune in later for more!
                    </div>
                )}
                {filter?.type === 'fan_art' && (
                    <div className="mt-4 mb-8 text-left text-stone-500/70 font-nunitosans font-medium text-sm">
                        nothing more to see! doodle on the page (and click save) to add to the gallery!
                    </div>
                )}
            </div>
            {selectedImage && <LightboxModal
                image={selectedImage}
                onClose={closeLightbox}
                onCursorOver={handleOver}
                onCursorLeave={handleLeave}
                isFanArt={filter?.type === 'fan_art'}
            />}
        </main>
    );
};

export default Art;
