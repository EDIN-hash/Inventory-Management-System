import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import "./styles.css";
import api from "./services/api";
import { generateDeviceId, getDeviceBaseId } from "./utils/device";
import type { Item, User, SortConfig, StatusFilter, HistorySort } from "./types";
import { CATEGORIES } from "./types";
import Card from "./components/Card";
import HistoryCard from "./components/HistoryCard";
import UserDevicesSettings from "./UserDevicesSettings";

// Настройка Modal до определения компонента
Modal.setAppElement("#root");

const categories = CATEGORIES;

const defaultModalData = {
    name: "",
    quantity: "",
    ilosc: 1,
    description: "",
    photo_url: "",
    photo_url2: "",
    category: "NM",
    wysokosc: 0,
    szerokosc: 0,
    glebokosc: 0,
    dataWyjazdu: "",
    stoisko: "",
    stan: false,
    linknadysk: "",
};

export default function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [registerUsername, setRegisterUsername] = useState("");
    const [registerPassword, setRegisterPassword] = useState("");
    const [registerRole, setRegisterRole] = useState("spectator");
    const [items, setItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [modalData, setModalData] = useState(defaultModalData);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState("NM");
    const [darkMode, setDarkMode] = useState(false);
    const [SERVER_URL, setServerUrl] = useState(import.meta.env.VITE_SERVER_URL || "/.netlify/functions/neon-proxy");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'na-stanie', 'wyjechalo'
    
    // History filters
    const [historySort, setHistorySort] = useState('date_desc'); // 'date_desc', 'date_asc', 'user'
    const [historyUserFilter, setHistoryUserFilter] = useState('all');
    const [historyDeviceFilter, setHistoryDeviceFilter] = useState('all');
    const [isGetIdModalOpen, setIsGetIdModalOpen] = useState(false);
    const [selectedCategoryForId, setSelectedCategoryForId] = useState('NM');
    const [generatedId, setGeneratedId] = useState('');
    const [tvSize, setTvSize] = useState('55'); // Размер телевизора по умолчанию
    const [showUpdateBanner, setShowUpdateBanner] = useState(false);

    // Check for PWA updates
    useEffect(() => {
        const handleUpdate = () => setShowUpdateBanner(true);
        window.addEventListener('swUpdateAvailable', handleUpdate);
        
        if (window.swUpdateAvailable) {
            setShowUpdateBanner(true);
        }
        
        return () => window.removeEventListener('swUpdateAvailable', handleUpdate);
    }, []);

    const handleUpdateApp = () => {
        if (window.swRegistration?.waiting) {
            window.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
    };

    // Load dark mode preference from localStorage
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('darkMode');
        if (savedDarkMode) {
            setDarkMode(savedDarkMode === 'true');
        }
        
        const warmup = async () => {
            try {
                const functionUrl = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV 
                    ? 'http://localhost:8888/.netlify/functions/neon-proxy'
                    : '/.netlify/functions/neon-proxy');
                await fetch(functionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'SELECT 1', params: [] }) });
            } catch (e) {}
        };
        warmup();
    }, []);

    // Load saved user session from localStorage on app start
    useEffect(() => {
        const verifyAuth = async () => {
            try {
                const user = await api.verifyToken();
                if (user) {
                    setCurrentUser(user);
                    console.log('Auto-login successful for user:', user.username);
                }
            } catch (error) {
                console.error('Failed to verify token:', error);
                api.logout();
            }
        };
        verifyAuth();
    }, []);

    // Apply dark mode class to body
    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            if (selectedCategory === 'Historia') {
                const history = await api.getHistory();
                setItems(history);
            } else {
                const items = await api.getItems(selectedCategory || null);
                setItems(items);
            }
        } catch (err) {
            console.error("Fetch items error:", err);
            alert("Failed to load items: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [selectedCategory]);

    // Log category change
    useEffect(() => {
        if (currentUser && selectedCategory) {
            api.addHistoryEntry({
                item_name: selectedCategory,
                action: 'view_category',
                field_name: 'category_opened',
                old_value: '',
                new_value: selectedCategory,
                changed_by: currentUser.username,
                device_id: generateDeviceId()
            }).catch(() => {}); // Ignore if history table doesn't exist
        }
    }, [selectedCategory, currentUser]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const user = await api.loginUser(username, password);
            if (user) {
                setCurrentUser(user);
                setUsername('');
                setPassword('');
                setShowLoginModal(false);
                console.log('User logged in:', user.username);
            } else {
                alert('Invalid username or password');
            }
        } catch (err) {
            console.error("Login error:", err);
            alert("Login failed: " + (err as Error).message);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.registerUser(registerUsername, registerPassword, registerRole);
            alert("Registration successful. You may log in.");
            setIsRegisterModalOpen(false);
            setRegisterUsername("");
            setRegisterPassword("");
            setRegisterRole("spectator");
        } catch (err) {
            console.error("Registration error:", err);
            if ((err as Error).message.includes('Username already exists')) {
                alert("This username is already taken. Please choose a different username.");
            } else {
                alert("Registration failed: " + (err as Error).message);
            }
        }
    };

    const handleLogout = () => {
        api.logout();
        setCurrentUser(null);
        console.log('User logged out');
    };

    const handleGetNextId = async () => {
        try {
            const nextId = await api.getNextAvailableId(selectedCategoryForId, tvSize);
            setGeneratedId(nextId);
        } catch (err) {
            console.error("Get next ID error:", err);
            if (err.message.includes('Все ID для телевизоров размера')) {
                alert(err.message);
            } else {
                alert("Failed to get next ID: " + err.message);
            }
        }
    };

    const handleCopyId = () => {
        if (generatedId) {
            navigator.clipboard.writeText(generatedId);
            alert(`ID ${generatedId} copied to clipboard!`);
        }
    };

    const openItemModal = (item = null) => {
        if (item) {
            // Convert numeric fields from strings to numbers, handling Polish decimal format
            const parsePolishNumber = (value) => {
                if (value === null || value === undefined || value === '') return 0;
                // Replace Polish comma with dot for parsing, then convert to number
                const numericValue = typeof value === 'string' 
                    ? parseFloat(value.replace(',', '.')) 
                    : Number(value);
                return isNaN(numericValue) ? 0 : numericValue;
            };

            setModalData({
                ...item,
                wysokosc: parsePolishNumber(item.wysokosc),
                szerokosc: parsePolishNumber(item.szerokosc),
                glebokosc: parsePolishNumber(item.glebokosc),
                ilosc: parsePolishNumber(item.ilosc),
                dataWyjazdu: item.data_wyjazdu || '',
                stan: item.stan === 1 || item.stan === true,
            });
        } else {
            setModalData(defaultModalData);
        }
        setEditingItem(item || null);
        setIsItemModalOpen(true);
    };

    const closeItemModal = () => setIsItemModalOpen(false);

    const handleSaveItem = async () => {
        if (!modalData.name) {
            alert("ID (Name) jest wymagany!");
            return;
        }
        
        const currentUsername = currentUser?.username || "Unknown";
        const currentDeviceId = getDeviceBaseId();
        
        // Format date as DD.MM.YYYY (just pass through, no conversion)
        const dataWyjazduValue = modalData.dataWyjazdu || '';
        
        const itemData = {
            ...modalData,
            data_wyjazdu: dataWyjazduValue,
            stan: modalData.stan ? 1 : 0,
            ilosc: modalData.ilosc || 0,
            quantity: modalData.quantity || '',
            description: modalData.description || '',
            photo_url: modalData.photo_url || '',
            photo_url2: modalData.photo_url2 || '',
            linknadysk: modalData.linknadysk || '',
            stoisko: modalData.stoisko || '',
            updatedBy: currentUsername,
            deviceId: currentDeviceId
        };
        try {
            if (editingItem) {
                await api.updateItem(editingItem.name, itemData);
            } else {
                await api.addItem(itemData);
            }
            // Запись в историю - не блокирует сохранение при ошибке
            try {
                if (editingItem) {
                    await api.addHistoryEntry({
                        item_name: modalData.name,
                        action: 'edit',
                        field_name: 'all',
                        old_value: editingItem.name !== modalData.name ? editingItem.name : '',
                        new_value: modalData.name,
                        changed_by: currentUsername,
                        device_id: currentDeviceId
                    });
                } else {
                    await api.addHistoryEntry({
                        item_name: modalData.name,
                        action: 'add',
                        field_name: 'new_item',
                        old_value: '',
                        new_value: modalData.category,
                        changed_by: currentUsername,
                        device_id: currentDeviceId
                    });
                }
            } catch (historyErr) {
                console.warn("History logging failed:", historyErr);
            }
            await fetchItems();
            closeItemModal();
        } catch (err) {
            console.error("Save item error:", err);
            alert(err.message);
        }
    };


    const handleDeleteItem = async (itemName) => {
        if (!window.confirm("Delete this item?")) return;
        const currentUsername = currentUser?.username || "Unknown";
        const currentDeviceId = getDeviceBaseId();
        try {
            await api.deleteItem(itemName);
            try {
                await api.addHistoryEntry({
                    item_name: itemName,
                    action: 'delete',
                    field_name: 'all',
                    old_value: '',
                    new_value: '',
                    changed_by: currentUsername,
                    device_id: currentDeviceId
                });
            } catch (historyErr) {
                console.warn("History logging failed:", historyErr);
            }
            await fetchItems();
        } catch (err) {
            console.error("Delete item error:", err);
            alert(err.message);
        }
    };

    // Ensure items is an array before filtering
    const itemsArray = Array.isArray(items) ? items : [];
    
    // Filter by search query
    const searchFilteredItems = itemsArray.filter(
        (item) => {
            if (!item || !item.name) return false;
            
            const query = searchQuery.toLowerCase();
            const nameMatch = item.name.toLowerCase().includes(query);
            const descriptionMatch = (item.description || "").toLowerCase().includes(query);
            const stoiskoMatch = (item.stoisko || "").toLowerCase().includes(query);
            
            // Search in dimensions (wysokosc, szerokosc, glebokosc)
            const dimensionsMatch = 
                (item.wysokosc && item.wysokosc.toString().includes(query)) ||
                (item.szerokosc && item.szerokosc.toString().includes(query)) ||
                (item.glebokosc && item.glebokosc.toString().includes(query));
            
            // For LADY category, prioritize stoisko search
            if (item.category === 'LADY') {
                return nameMatch || descriptionMatch || stoiskoMatch;
            }
            
            return nameMatch || descriptionMatch || dimensionsMatch;
        }
    );
    
    // Filter by status
    const statusFilteredItems = searchFilteredItems.filter(item => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'na-stanie') return item.stan === 1 || item.stan === true;
        if (statusFilter === 'wyjechalo') return item.stan === 0 || item.stan === false || item.stan === null || item.stan === undefined;
        return true;
    });
    
    // Sort items
    let filteredItems;
    
    if (selectedCategory === 'Historia') {
        // History sorting logic
        filteredItems = [...statusFilteredItems];
        
        // Filter by user
        if (historyUserFilter !== 'all') {
            filteredItems = filteredItems.filter(item => item.changed_by === historyUserFilter);
        }
        
        // Filter by device
        if (historyDeviceFilter !== 'all') {
            filteredItems = filteredItems.filter(item => item.device_id === historyDeviceFilter);
        }
        
        // Sort - data is already sorted by date DESC from DB
        if (historySort === 'date_asc') {
            filteredItems.reverse();
        } else if (historySort === 'user') {
            filteredItems.sort((a, b) => (a.changed_by || '').localeCompare(b.changed_by || ''));
        }
    } else {
        // Regular items sorting
        filteredItems = [...statusFilteredItems].sort((a, b) => {
            if (!sortConfig.key) {
                return a.name.localeCompare(b.name);
            }
            
            const getNumericValue = (value) => {
                if (value === null || value === undefined || value === '') return 0;
                const numericValue = typeof value === 'string' 
                    ? parseFloat(value.replace(',', '.')) 
                    : Number(value);
                return isNaN(numericValue) ? 0 : numericValue;
            };
            
            const aValue = getNumericValue(a[sortConfig.key]);
            const bValue = getNumericValue(b[sortConfig.key]);
            
            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    const renderItemFormField = ([label, key, type = "input"]) => {
        // Special handling for Krzesla category
        let displayLabel = label;
        if (modalData.category === 'Krzesla') {
            if (key === 'wysokosc') {
                displayLabel = 'Ilosc wyjechala';
            }
        }
        
        return (
            <div className="form-control" key={key}>
                <label className="label">
                    <span className="label-text text-white">{displayLabel}</span>
                </label>
                {type === "textarea" ? (
                    <textarea
                        value={modalData[key]}
                        onChange={(e) => setModalData({ ...modalData, [key]: e.target.value })}
                        className="textarea textarea-bordered h-24 w-full bg-gray-700 border-gray-600 text-white"
                    />
                ) : key === "category" ? (
                    <select
                        value={modalData[key]}
                        onChange={(e) => setModalData({ ...modalData, [key]: e.target.value })}
                        className="select select-bordered w-full bg-gray-700 border-gray-600 text-white"
                    >
                        {categories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        type={
                            ["ilosc", "wysokosc", "szerokosc", "glebokosc"].includes(key)
                                ? "number"
                                : "text"
                        }
                        value={modalData[key]}
                        onChange={(e) =>
                            setModalData({
                                ...modalData,
                                [key]:
                                    ["name", "quantity", "description", "photo_url", "photo_url2", "linknadysk", "stoisko", "dataWyjazdu"].includes(key)
                                        ? e.target.value
                                        : (() => {
                                            const value = e.target.value;
                                            if (value === '') return 0;
                                            // Handle Polish decimal format (comma) and convert to number
                                            const numericValue = parseFloat(value.replace(',', '.'));
                                            return isNaN(numericValue) ? 0 : numericValue;
                                        })(),
                            })
                        }
                        className="input input-bordered w-full bg-gray-700 border-gray-600 text-white"
                    />
                )}
            </div>
        );
    };

return (
    <div className="min-h-screen bg-[#1a1b26] p-2 sm:p-6 transition-colors duration-300 main-container flex flex-col gradient-bg">
        <header className="header-section flex flex-col sm:flex-row justify-between items-center mb-4 gap-2 header-modern glass-effect">
            <div className="flex items-center gap-4 w-full">
                <h1 className="text-2xl sm:text-3xl font-bold main-title text-center sm:text-left text-gradient fade-in-up tokyo-accent">
                    Inventory Management
                </h1>
                 </div>
            
            {!currentUser ? (
                <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto auth-section">
                    <button
                        onClick={() => setShowLoginModal(true)}
                        className="btn btn-primary w-full sm:w-auto ripple hover-lift"
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="btn btn-secondary w-full sm:w-auto ripple hover-lift"
                    >
                        Register
                    </button>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center w-full">
                    <input
                        id="search"
                        name="search"
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input input-bordered bg-gray-700 border-gray-600 text-white flex-1 min-w-0"
                        style={{ minWidth: '200px' }}
                    />
                    {(currentUser.role === "admin") && selectedCategory !== 'Historia' && (
                        <button
                            onClick={() => openItemModal()}
                            className="btn btn-success w-full sm:w-auto ripple hover-lift bounce-in flex-shrink-0"
                        >
                            Add Item
                        </button>
                    )}
                    {(currentUser.role === "admin" || currentUser.role === "moder") && selectedCategory !== 'Historia' && (
                        <button
                            onClick={() => setIsGetIdModalOpen(true)}
                            className="btn btn-info w-full sm:w-auto ripple hover-lift bounce-in flex-shrink-0"
                        >
                            Get Free ID
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (navigator.serviceWorker.controller) {
                                navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
                                window.location.reload();
                            } else {
                                window.location.reload();
                            }
                        }}
                        className="btn btn-ghost btn-sm text-xs"
                        title="Обновить приложение"
                    >
                        ↻
                    </button>
                    <div className="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0">
                        <span className="text-sm sm:text-base text-slate-600 dark:text-slate-300">Logged in as: {currentUser.username}</span>
                        <span className="text-sm sm:text-base text-slate-600 dark:text-slate-300">Role: {currentUser.role}</span>
                        <button onClick={handleLogout} className="btn btn-error w-full sm:w-auto">
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </header>

        {/* Update Banner */}
        {showUpdateBanner && (
            <div className="bg-blue-600 text-white px-4 py-2 text-center">
                <span>Dostępna nowa wersja aplikacji! </span>
                <button
                    onClick={handleUpdateApp}
                    className="bg-white text-blue-600 px-4 py-1 rounded font-bold ml-2 hover:bg-blue-100"
                >
                    Aktualizuj
                </button>
            </div>
        )}

        {/* Category Tabs */}
        <div className="tabs-section pb-2">
            <div className="tabs-container flex flex-wrap gap-2 justify-center">
                {categories
                    .filter(cat => {
                        if (cat === 'Historia') return currentUser && currentUser.role === 'moder';
                        if (cat === 'Ustawienia') return currentUser && currentUser.role === 'moder';
                        return true;
                    })
                    .map((category) => (
                    <button
                        key={category}
                        className={`tab-modern text-sm sm:text-base px-4 py-2 rounded-md ${selectedCategory === category ? "active" : ""} slide-in`}
                        onClick={() => setSelectedCategory(category)}
                    >
                        {category}
                    </button>
                ))}
            </div>
        </div>

        {/* Sorting and Filter Controls */}
        <div className="controls-section mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
            {selectedCategory === 'Historia' ? (
                // History specific controls
                <div className="flex flex-wrap gap-3 items-center justify-center">
                    {/* Sort by date */}
                    <div className="filter-group">
                        <span className="text-white text-sm font-medium mr-2">Sortuj:</span>
                        <button
                            className={`sort-btn ${historySort === 'date_desc' ? 'active-sort' : ''}`}
                            onClick={() => setHistorySort('date_desc')}
                        >
                            Nowe ↓
                        </button>
                        <button
                            className={`sort-btn ${historySort === 'date_asc' ? 'active-sort' : ''}`}
                            onClick={() => setHistorySort('date_asc')}
                        >
                            Stare ↑
                        </button>
                    </div>

                    {/* Filter by user */}
                    <div className="filter-group">
                        <span className="text-white text-sm font-medium mr-2">Użytkownik:</span>
                        <select
                            className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600"
                            value={historyUserFilter}
                            onChange={(e) => setHistoryUserFilter(e.target.value)}
                        >
                            <option value="all">Wszyscy</option>
                            {[...new Set(items.map(i => i.changed_by).filter(Boolean))].map(user => (
                                <option key={user} value={user}>{user}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filter by device */}
                    <div className="filter-group">
                        <span className="text-white text-sm font-medium mr-2">Urządzenie:</span>
                        <select
                            className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600"
                            value={historyDeviceFilter}
                            onChange={(e) => setHistoryDeviceFilter(e.target.value)}
                        >
                            <option value="all">Wszystkie</option>
                            {[...new Set(items.map(i => i.device_id).filter(Boolean))].map(device => (
                                <option key={device} value={device}>{device}</option>
                            ))}
                        </select>
                    </div>
                </div>
            ) : (
                // Regular item controls
                <div className="flex flex-wrap gap-3 items-center justify-center">
                    {/* Status Filter */}
                    <div className="filter-group">
                        <span className="text-white text-sm font-medium mr-2">Status:</span>
                        <button
                            className={`filter-btn ${statusFilter === 'all' ? 'active-filter' : ''}`}
                            onClick={() => setStatusFilter('all')}
                        >
                            Wszystkie
                        </button>
                        <button
                            className={`filter-btn ${statusFilter === 'na-stanie' ? 'active-filter' : ''} bg-green-900/50 border-green-500/50 text-green-400`}
                            onClick={() => setStatusFilter('na-stanie')}
                        >
                            Na stanie
                        </button>
                        <button
                            className={`filter-btn ${statusFilter === 'wyjechalo' ? 'active-filter' : ''} bg-red-900/50 border-red-500/50 text-red-400`}
                            onClick={() => setStatusFilter('wyjechalo')}
                        >
                            Wyjechało
                        </button>
                    </div>

                    {/* Sorting Controls */}
                    <div className="sort-group">
                        <span className="text-white text-sm font-medium mr-2">Sortuj:</span>
                        <button
                            className={`sort-btn ${sortConfig.key === 'wysokosc' ? 'active-sort' : ''}`}
                            onClick={() => {
                                if (sortConfig.key === 'wysokosc') {
                                    setSortConfig({ key: 'wysokosc', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
                                } else {
                                    setSortConfig({ key: 'wysokosc', direction: 'asc' });
                                }
                            }}
                        >
                            Wysokość {sortConfig.key === 'wysokosc' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </button>
                        <button
                            className={`sort-btn ${sortConfig.key === 'szerokosc' ? 'active-sort' : ''}`}
                            onClick={() => {
                                if (sortConfig.key === 'szerokosc') {
                                    setSortConfig({ key: 'szerokosc', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
                                } else {
                                    setSortConfig({ key: 'szerokosc', direction: 'asc' });
                                }
                            }}
                        >
                            Szerokość {sortConfig.key === 'szerokosc' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </button>
                        <button
                            className={`sort-btn ${sortConfig.key === 'glebokosc' ? 'active-sort' : ''}`}
                            onClick={() => {
                                if (sortConfig.key === 'glebokosc') {
                                    setSortConfig({ key: 'glebokosc', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
                                } else {
                                    setSortConfig({ key: 'glebokosc', direction: 'asc' });
                                }
                            }}
                        >
                            Głębokość {sortConfig.key === 'glebokosc' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </button>
                        <button
                            className={`sort-btn ${sortConfig.key === 'ilosc' ? 'active-sort' : ''}`}
                            onClick={() => {
                                if (sortConfig.key === 'ilosc') {
                                    setSortConfig({ key: 'ilosc', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
                                } else {
                                    setSortConfig({ key: 'ilosc', direction: 'asc' });
                                }
                            }}
                        >
                            Ilość {sortConfig.key === 'ilosc' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </button>
                        <button
                            className={`sort-btn ${sortConfig.key === null ? 'active-sort' : ''}`}
                            onClick={() => setSortConfig({ key: null, direction: 'asc' })}
                        >
                            Reset
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Items Grid */}
        {isLoading ? (
            <div className="flex justify-center py-8">
                <div className="loading-pulse"></div>
            </div>
        ) : (
            <div className="items-grid grid-modern">
                {selectedCategory === 'Historia' ? (
                    filteredItems.map((entry) => (
                        <HistoryCard
                            key={entry.id}
                            entry={entry}
                        />
                    ))
                ) : selectedCategory === 'Ustawienia' ? (
                    <UserDevicesSettings />
                ) : (
                    filteredItems.map((item) => (
                        <Card
                            key={item.name}
                            item={item}
                            editItem={openItemModal}
                            deleteItem={handleDeleteItem}
                            role={currentUser?.role}
                        />
                    ))
                )}
            </div>
        )}

        {/* Item Modal */}
        <Modal
            isOpen={isItemModalOpen}
            onRequestClose={closeItemModal}
            className="modal-box w-full max-w-none sm:max-w-md p-4 sm:p-6 login-modal-dark"
            overlayClassName="modal-backdrop p-2 sm:p-0"
            contentLabel="Item Modal"
        >
            <>
                <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-white">
                    {editingItem ? "Edit Item" : "Add New Item"}
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 modal-content">
                    {/* Special field order for Krzesla and LADY categories (no dimensions) */}
                    {modalData.category === 'Krzesla' ? (
                        <>
                            {[
                                ["Name", "name"],
                                ["Ilość", "ilosc"],
                                ["Category", "category"],
                                ["Ilosc wyjechala", "wysokosc"], // Moved to top for Krzesla
                                ["Description", "description", "textarea"],
                                ["Photo URL", "photo_url"],
                                ["Stoisko", "stoisko"],
                                ["Szerokość (cm)", "szerokosc"],
                                ["Głębokość (cm)", "glebokosc"],
                                ["Google Drive Link", "linknadysk"]
                            ].map(renderItemFormField)}
                        </>
                    ) : modalData.category === 'LADY' ? (
                        <>
                            {[
                                ["Name", "name"],
                                ["Ilość", "ilosc"],
                                ["Category", "category"],
                                ["Description", "description", "textarea"],
                                ["Photo URL 1", "photo_url"],
                                ["Photo URL 2", "photo_url2"],
                                ["Stoisko", "stoisko"],
                                ["Google Drive Link", "linknadysk"]
                            ].map(renderItemFormField)}
                        </>
                    ) : (
                        <>
                            {[
                                ["Name", "name"],
                                ["Ilość", "ilosc"],
                                ["Category", "category"],
                                ["Description", "description", "textarea"],
                                ["Photo URL", "photo_url"],
                                ["Stoisko", "stoisko"],
                                ["Wysokość (cm)", "wysokosc"],
                                ["Szerokość (cm)", "szerokosc"],
                                ["Głębokość (cm)", "glebokosc"],
                                ["Google Drive Link", "linknadysk"],
                                ["Quantity (разновидность)", "quantity"],
                            ].map(renderItemFormField)}
                        </>
                    )}
                    <div className="form-control">
                        <label className="form-label text-white text-sm sm:text-base">Data Wyjazdu</label>
                        <input
                            type="text"
                            value={modalData.dataWyjazdu || ''}
                            onChange={(e) => {
                                let value = e.target.value.replace(/[^\d.]/g, '');
                                if (value.length === 2 || value.length === 5) {
                                    value += '.';
                                }
                                if (value.length <= 10) {
                                    setModalData({ ...modalData, dataWyjazdu: value });
                                }
                            }}
                            className="input input-bordered w-full bg-gray-700 border-gray-600 text-white"
                            placeholder="DD.MM.RRRR"
                            maxLength={10}
                        />
                    </div>
                    {/* Only show "Na stanie?" checkbox for non-Krzesla categories */}
                    {modalData.category !== 'Krzesla' && (
                        <div className="form-control">
                            <label className="form-label cursor-pointer text-white text-sm sm:text-base">
                                <span className="label-text text-white">Na stanie?</span>
                                <input
                                    type="checkbox"
                                    checked={modalData.stan}
                                    onChange={(e) => setModalData({ ...modalData, stan: e.target.checked })}
                                    className="checkbox"
                                />
                            </label>
                        </div>
                    )}
                </div>
                <div className="button-group mt-4 flex gap-2">
                    <button onClick={closeItemModal} className="btn btn-ghost bg-gray-600 hover:bg-gray-500 text-white w-full sm:w-auto">
                        Cancel
                    </button>
                    <button onClick={handleSaveItem} className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                        Save
                    </button>
                </div>
            </>
        </Modal>

        {/* Login Modal */}
        <Modal
            isOpen={showLoginModal}
            onRequestClose={() => setShowLoginModal(false)}
            className="modal-box w-full max-w-none sm:max-w-md p-4 sm:p-6 login-modal-dark"
            overlayClassName="modal-backdrop p-2 sm:p-0"
            contentLabel="Login Modal"
        >
            <>
                <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-white">Login</h2>
                <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                    <div className="form-control">
                        <label className="form-label text-sm sm:text-base text-white">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="input input-bordered w-full bg-gray-700 border-gray-600 text-white"
                            required
                        />
                    </div>
                    <div className="form-control">
                        <label className="form-label text-sm sm:text-base text-white">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input input-bordered w-full bg-gray-700 border-gray-600 text-white"
                            required
                        />
                    </div>
                    <div className="button-group mt-4 flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowLoginModal(false)}
                            className="btn btn-ghost bg-gray-600 hover:bg-gray-500 text-white w-full sm:w-auto"
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                            Login
                        </button>
                    </div>
                </form>
            </>
        </Modal>

        {/* Register Modal */}
        <Modal
            isOpen={isRegisterModalOpen}
            onRequestClose={() => setIsRegisterModalOpen(false)}
            className="modal-box w-full max-w-none sm:max-w-md p-4 sm:p-6 login-modal-dark"
            overlayClassName="modal-backdrop p-2 sm:p-0"
            contentLabel="Register Modal"
        >
            <>
                <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-white">Register New User</h2>
                <form onSubmit={handleRegister} className="space-y-3 sm:space-y-4">
                    <div className="form-control">
                        <label className="form-label text-sm sm:text-base text-white">Username</label>
                        <input
                            type="text"
                            value={registerUsername}
                            onChange={(e) => setRegisterUsername(e.target.value)}
                            className="input input-bordered w-full bg-gray-700 border-gray-600 text-white"
                            required
                        />
                    </div>
                    <div className="form-control">
                        <label className="form-label text-sm sm:text-base text-white">Password</label>
                        <input
                            type="password"
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            className="input input-bordered w-full bg-gray-700 border-gray-600 text-white"
                            required
                        />
                    </div>
                    <div className="form-control">
                        <label className="form-label text-sm sm:text-base text-white">Role</label>
                        <select
                            value={registerRole}
                            onChange={(e) => setRegisterRole(e.target.value)}
                            className="select select-bordered w-full bg-gray-700 border-gray-600 text-white"
                        >
                            <option value="spectator">Spectator</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div className="button-group mt-4 flex gap-2">
                        <button
                            type="button"
                            onClick={() => setIsRegisterModalOpen(false)}
                            className="btn btn-ghost bg-gray-600 hover:bg-gray-500 text-white w-full sm:w-auto"
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                            Register
                        </button>
                    </div>
                </form>
            </>
        </Modal>

        {/* Get Free ID Modal */}
        <Modal
            isOpen={isGetIdModalOpen}
            onRequestClose={() => setIsGetIdModalOpen(false)}
            className="modal-box w-full max-w-none sm:max-w-md p-4 sm:p-6 login-modal-dark get-free-id-modal"
            overlayClassName="modal-backdrop p-2 sm:p-0"
            contentLabel="Get Free ID Modal"
        >
            <>
                <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-white">Get Free ID</h2>
                <div className="space-y-3 sm:space-y-4 modal-content">
                    <div className="form-control">
                        <label className="form-label text-sm sm:text-base text-white">Category</label>
                        <select
                            value={selectedCategoryForId}
                            onChange={(e) => {
                                setSelectedCategoryForId(e.target.value);
                                // Сбросить размер телевизора при смене категории
                                if (e.target.value !== 'Telewizory') {
                                    setTvSize('55');
                                }
                            }}
                            className="select select-bordered w-full bg-gray-700 border-gray-600 text-white"
                        >
                            {categories.filter(cat => cat !== 'Historia').map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>
                    {selectedCategoryForId === 'Telewizory' && (
                        <div className="form-control">
                            <label className="form-label text-sm sm:text-base text-white">Размер экрана (дюймы)</label>
                            <input
                                type="text"
                                value={tvSize}
                                onChange={(e) => setTvSize(e.target.value)}
                                placeholder="Введите размер (например, 55)"
                                className="input input-bordered w-full bg-gray-700 border-gray-600 text-white"
                            />
                        </div>
                    )}
                    <div className="form-control">
                        <button
                            onClick={handleGetNextId}
                            className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                        >
                            Get Free ID
                        </button>
                    </div>
                    {generatedId && (
                        <div className="form-control generated-id-section">
                            <label className="form-label text-sm sm:text-base text-white">Generated ID</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    value={generatedId}
                                    readOnly
                                    className="input input-bordered w-full bg-gray-700 border-gray-600 text-white"
                                />
                                <div className="copy-button-container">
                                    <button
                                        onClick={handleCopyId}
                                        className="btn btn-info bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="button-group mt-4 flex gap-2">
                        <button
                            type="button"
                            onClick={() => setIsGetIdModalOpen(false)}
                            className="btn btn-ghost bg-gray-600 hover:bg-gray-500 text-white w-full sm:w-auto"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </>
        </Modal>
    </div>
);
}