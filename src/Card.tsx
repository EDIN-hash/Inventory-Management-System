import React, { useState, useEffect, useRef, memo } from "react";
import { createPortal } from "react-dom";
import { getOptimizedImageUrl, getThumbnailUrl, getFullImageUrl } from "./device-utils";

const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1080;

// CSS стили для модального окна
const modalStyles = `
.photo-modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(4px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.photo-modal-content {
    position: relative;
    overflow: visible;
    max-width: 90vw;
    max-height: none;
}

.photo-modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
    background-color: rgba(0, 0, 0, 0.5);
    border: none;
    border-radius: 9999px;
    color: white;
    cursor: pointer;
    z-index: 10;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.photo-modal-close:hover {
    background-color: rgba(0, 0, 0, 0.7);
}

.photo-modal-nav-prev,
.photo-modal-nav-next {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 48px;
    height: 48px;
    background-color: rgba(0, 0, 0, 0.5);
    border: none;
    border-radius: 9999px;
    color: white;
    cursor: pointer;
    z-index: 10;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.photo-modal-nav-prev:hover,
.photo-modal-nav-next:hover {
    background-color: rgba(0, 0, 0, 0.7);
}

.photo-modal-nav-prev {
    left: 16px;
}

.photo-modal-nav-next {
    right: 16px;
}

.photo-modal-image {
    object-fit: contain;
    max-height: 75vh;
    width: auto;
    margin: 0 auto;
    padding: 24px;
}

.photo-modal-info {
    background-color: rgba(0, 0, 0, 0.3);
    padding: 16px 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.photo-modal-title {
    font-weight: 600;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.photo-modal-counter {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    margin-top: 4px;
}

.photo-modal-description {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    margin-top: 8px;
}
`;

// Вставляем стили в head при загрузке компонента
if (typeof document !== 'undefined' && !document.getElementById('photo-modal-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'photo-modal-styles';
    styleElement.textContent = modalStyles;
    document.head.appendChild(styleElement);
}

function optimizeImageUrl(url, isFullSize = false) {
    if (!url || typeof url !== 'string') return '';
    
    if (url.includes('drive.google.com')) {
        const fileIdMatch = url.match(/\/d\/([^/]+)/);
        if (fileIdMatch) {
            const size = isFullSize ? 'w1920' : 'w800';
            return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=${size}`;
        }
    }
    
    if (url.includes('photos.app.goo.gl')) {
        return url;
    }
    
    if (url.includes('cloudinary.com')) {
        return isFullSize ? getFullImageUrl(url) : getThumbnailUrl(url);
    }
    
    if (url.includes('?')) {
        return `${url}&w=${MAX_IMAGE_WIDTH}&h=${MAX_IMAGE_HEIGHT}`;
    }
    
    return url;
}

// LazyImage component with IntersectionObserver
const LazyImage = memo(function LazyImage({ src, alt, className, style, onClick }) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const imgRef = useRef(null);
    
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '100px', threshold: 0.1 }
        );
        
        if (imgRef.current) {
            observer.observe(imgRef.current);
        }
        
        return () => observer.disconnect();
    }, []);
    
    return (
        <div ref={imgRef} className="relative" onClick={onClick}>
            {isVisible && (
                <img
                    src={src}
                    alt={alt}
                    className={className}
                    style={{ ...style, opacity: isLoaded ? 1 : 0, width: '100%', height: 'auto', objectFit: 'contain' }}
                    onLoad={() => setIsLoaded(true)}
                    loading="lazy"
                    decoding="async"
                />
            )}
            {!isLoaded && isVisible && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
                    <div className="loading-pulse" style={{ width: 30, height: 30 }}></div>
                </div>
            )}
        </div>
    );
});

export default function Card({ item, editItem, deleteItem, role }) {
    const [openPhoto, setOpenPhoto] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const cardRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    
    // Lazy load card content
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                const card = entry.target;
                const images = card.querySelectorAll('img');
                images.forEach((image) => {
                    image.src = image.dataset.src;
                });
                setIsVisible(true);
                observer.disconnect();
            },
            { rootMargin: '200px', threshold: 0.1 }
        );
        
        if (cardRef.current) {
            observer.observe(cardRef.current);
        }
        
        return () => observer.disconnect();
    }, []);
    
    const getPhotos = () => {
        const photos = [];
        if (item.photo_url) photos.push({
            thumbnail: item.photo_url,
            full: getFullImageUrl(item.photo_url),
            original: item.photo_url
        });
        if (item.photo_url2) photos.push({
            thumbnail: item.photo_url2,
            full: getFullImageUrl(item.photo_url2),
            original: item.photo_url2
        });
        return photos;
    };
    
    const photos = getPhotos();
    const hasMultiplePhotos = photos.length > 1;
    const currentPhoto = photos[currentPhotoIndex];
    
    const handlePrevPhoto = (e) => {
        e.stopPropagation();
        setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    };
    
    const handleNextPhoto = (e) => {
        e.stopPropagation();
        setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    };

    return (
        <>
            <div ref={cardRef} className="card card-premium card-hover-effect fade-in-up" style={{ contain: 'paint layout' }}>
                <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1">
                        <h2 className="card-title truncate max-w-full">{item.name}</h2>
                        {item.id && (
                            <div className="id-container">
                                <span className="id-badge">ID: {item.id}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end">
                        <span className={`badge-modern ${getCategoryColor(item.category)}`}>
                            {item.category}
                        </span>
                        {item.quantity && (
                            <span className="badge-modern bg-purple-900/50 border-purple-500/50 text-purple-400">
                                {item.quantity}
                            </span>
                        )}
                    </div>
                </div>
                
                {item.category === 'Krzesla' ? (
                    <div className="flex justify-center items-center mb-3">
                        <div className="flex flex-col gap-1 text-center">
                            <span className="badge-modern quantity-text bg-blue-900/50 border-blue-500/50 text-blue-400">
                                Ilosc suma: {item.ilosc}
                            </span>
                            {item.wysokosc && (
                                <span className="badge-modern quantity-text bg-purple-900/50 border-purple-500/50 text-purple-400">
                                    Ilosc wyjechala: {item.wysokosc}
                                </span>
                            )}
                            <span className="badge-modern quantity-text bg-green-900/50 border-green-500/50 text-green-400">
                                Zostalo: {item.ilosc - (item.wysokosc || 0)}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-between items-center mb-3">
                        <span className={`badge-modern status-text ${item.stan === 1 || item.stan === true ? 'bg-green-900/50 border-green-500/50 text-green-400' : 'bg-red-900/50 border-red-500/50 text-red-400'}`}>
                            {item.stan === 1 || item.stan === true ? 'Na stanie' : 'Wyjechało'}
                        </span>
                        <span className="badge-modern quantity-text bg-blue-900/50 border-blue-500/50 text-blue-400">
                            Ilość: {item.ilosc}
                        </span>
                    </div>
                )}
                
                {photos.length > 0 && isVisible && (
                    <div className="mb-4 relative group cursor-pointer" onClick={() => setOpenPhoto(true)}>
                        <LazyImage
                            src={optimizeImageUrl(currentPhoto?.thumbnail || currentPhoto?.original)}
                            alt={item.name}
                            className="card-image group-hover:opacity-90 transition-opacity w-full"
                            style={{ maxWidth: '100%', height: 'auto' }}
                        />
                        
                        {item.category === 'LADY' && hasMultiplePhotos && (
                            <>
                                <button
                                    onClick={handlePrevPhoto}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full w-8 h-8 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100"
                                >
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                                    </svg>
                                </button>
                                <button
                                    onClick={handleNextPhoto}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full w-8 h-8 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100"
                                >
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                    </svg>
                                </button>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full">
                                    <span className="text-white text-xs">{currentPhotoIndex + 1} / {photos.length}</span>
                                </div>
                            </>
                        )}
                        
                        {item.category !== 'LADY' && (
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-opacity flex items-center justify-center">
                                <span className="text-white text-sm font-medium bg-black bg-opacity-50 px-3 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    Powiększ
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Stoisko section for specific categories */}
                {['Lodowki', 'Telewizory', 'Ekspresy', 'LADY', 'Krzesla'].includes(item.category) && item.stoisko && (
                    <div className="stoisko-section">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 stoisko-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            <div>
                                <div className="stoisko-label">Stoisko</div>
                                <div className="stoisko-value">{item.stoisko}</div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="space-y-2 text-sm">
                    {item.description && (
                        <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <p className="card-description">{item.description}</p>
                        </div>
                    )}
                    
                    {item.category !== 'Krzesla' && item.category !== 'LADY' && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-slate-600">
                            <div className="dimension-item">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121M12 12l2.879 2.879"></path>
                                </svg>
                                <div>
                                    <div className="dimension-label">Wysokość</div>
                                    <div className="dimension-value">{item.wysokosc || '-'}&nbsp;cm</div>
                                </div>
                            </div>
                            
                            <div className="dimension-item">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121M12 12l2.879 2.879"></path>
                                </svg>
                                <div>
                                    <div className="dimension-label">Szerokość</div>
                                    <div className="dimension-value">{item.szerokosc || '-'}&nbsp;cm</div>
                                </div>
                            </div>
                            
                            <div className="dimension-item">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121M12 12l2.879 2.879"></path>
                                </svg>
                                <div>
                                    <div className="dimension-label">Głębokość</div>
                                    <div className="dimension-value">{item.glebokosc || '-'}&nbsp;cm</div>
                                </div>
                            </div>
                            
                            <div className="dimension-item col-span-2">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                <div>
                                    <div className="dimension-label">Data wyjazdu</div>
                                    <div className="dimension-value">{item.data_wyjazdu || '-'}</div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {item.linknadysk && (
                        <div className="pt-2">
                            <a
                                href={item.linknadysk}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                                </svg>
                                Link na Dysk
                            </a>
                        </div>
                    )}
                    
                    {item.updatedAt && (
                        <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                            <div className="flex justify-between">
                                <span className="font-medium">Ostatnio edytowane:</span>
                                <span>{new Date(item.updatedAt).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Przez:</span>
                                <span>{item.updatedBy || 'Nieznany'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Urządzenie:</span>
                                <span>{item.deviceId || 'Nieznane'}</span>
                            </div>
                            {item.deviceId && (
                                <div className="flex justify-between">
                                    <span className="font-medium">Info urządzenia:</span>
                                    <span className="text-right">{item.deviceId}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="font-medium">Stoisko:</span>
                                <span>{item.stoisko || '*Tutaj wpisz stoisko*'}</span>
                            </div>
                        </div>
                    )}
                </div>
                
                {role && (role === "admin" || role === "moder") && (
                    <div className="card-footer">
                        <button
                            className="card-action-btn card-edit-btn ripple"
                            onClick={() => editItem(item)}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                            </svg>
                            Edytuj
                        </button>
                        <button
                            className="card-action-btn card-delete-btn ripple"
                            onClick={() => deleteItem(item.name)}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            Usuń
                        </button>
                    </div>
                )}
            </div>

            {openPhoto && photos.length > 0 && (
                <PhotoModal
                    photos={photos}
                    currentIndex={currentPhotoIndex}
                    setCurrentIndex={setCurrentPhotoIndex}
                    onClose={() => setOpenPhoto(false)}
                    itemName={item.name}
                    itemCategory={item.category}
                    description={item.description}
                />
            )}
        </>
    );
}

function PhotoModal({ photos, currentIndex, setCurrentIndex, onClose, itemName, itemCategory, description }) {
    const [container] = useState(() => {
        const div = document.createElement('div');
        div.id = 'photo-modal-portal';
        return div;
    });

    useEffect(() => {
        document.body.appendChild(container);
        return () => {
            document.body.removeChild(container);
        };
    }, [container]);

    const hasMultiplePhotos = photos.length > 1;
    
    const modalContent = (
        <div
            className="photo-modal-overlay"
            onClick={onClose}
        >
            <div
                className="photo-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    className="photo-modal-close"
                    onClick={onClose}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                
                {hasMultiplePhotos && (
                    <>
                        <button
                            className="photo-modal-nav-prev"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentIndex(currentIndex === 0 ? photos.length - 1 : currentIndex - 1);
                            }}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                        </button>
                        <button
                            className="photo-modal-nav-next"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentIndex(currentIndex === photos.length - 1 ? 0 : currentIndex + 1);
                            }}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </button>
                    </>
                )}
                
                <img
                    src={optimizeImageUrl(photos[currentIndex]?.original || photos[currentIndex]?.full || '')}
                    alt={itemName}
                    className="photo-modal-image"
                />
                
                <div className="photo-modal-info">
                    <h3 className="photo-modal-title">{itemName}</h3>
                    {hasMultiplePhotos && (
                        <p className="photo-modal-counter">Фото {currentIndex + 1} из {photos.length}</p>
                    )}
                    <p className="photo-modal-description">{description}</p>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, container);
}

function getCategoryColor(category) {
    switch (category) {
        case "Telewizory":
            return "bg-blue-800/50 border-blue-600/50 text-blue-300";
        case "Lodowki":
            return "bg-green-800/50 border-green-600/50 text-green-300";
        case "Ekspresy":
            return "bg-gray-700/50 border-gray-500/50 text-gray-300";
        case "Krzesla":
            return "bg-gray-600/50 border-gray-400/50 text-gray-200";
        case "NM":
            return "bg-indigo-800/50 border-indigo-600/50 text-indigo-300";
        case "LADY":
            return "bg-pink-800/50 border-pink-600/50 text-pink-300";
        default:
            return "bg-indigo-800/50 border-indigo-600/50 text-indigo-300";
    }
}