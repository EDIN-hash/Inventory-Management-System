import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { useAuth0 } from "@auth0/auth0-react";
import "./styles.css";
import api from "./services/api";
import { generateDeviceId, getDeviceBaseId } from "./utils/device";
import type { Item, SortConfig, StatusFilter, HistorySort } from "./types";
import { CATEGORIES } from "./types";
import Card from "./components/Card";
import HistoryCard from "./components/HistoryCard";
import RoleManager from "./components/RoleManager";

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
    const { 
        isLoading: authLoading, 
        isAuthenticated, 
        error,
        loginWithRedirect, 
        logout: auth0Logout, 
        user: auth0User 
    } = useAuth0();
    
    const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [modalData, setModalData] = useState(defaultModalData);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [selectedCategory, setSelectedCategory] = useState("NM");
    const [darkMode, setDarkMode] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [historySort, setHistorySort] = useState<HistorySort>('date_desc');
    const [historyUserFilter, setHistoryUserFilter] = useState('all');
    const [historyDeviceFilter, setHistoryDeviceFilter] = useState('all');
    const [isGetIdModalOpen, setIsGetIdModalOpen] = useState(false);
    const [selectedCategoryForId, setSelectedCategoryForId] = useState('NM');
    const [generatedId, setGeneratedId] = useState('');
    const [tvSize, setTvSize] = useState('55');
    const [showUpdateBanner, setShowUpdateBanner] = useState(false);

    useEffect(() => {
        const handleUpdate = () => setShowUpdateBanner(true);
        window.addEventListener('swUpdateAvailable', handleUpdate);
        if (window.swUpdateAvailable) setShowUpdateBanner(true);
        return () => window.removeEventListener('swUpdateAvailable', handleUpdate);
    }, []);

    const handleUpdateApp = () => {
        if (window.swRegistration?.waiting) {
            window.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
    };

    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        localStorage.setItem('darkMode', String(darkMode));
    }, [darkMode]);

    // Get role from database on login - auto-create if not exists
    useEffect(() => {
        const fetchUser = async () => {
            if (!authLoading && isAuthenticated && auth0User) {
                const email = auth0User.email;
                if (email) {
                    // First ensure table exists
                    await api.initUserRolesTable();
                    
                    // Get role from database
                    let role = await api.getUserRole(email);
                    
                    // If no role exists, set default as spectator
                    if (role === 'spectator') {
                        // Check if user exists in DB - if not, add with default spectator
                        const existingUsers = await api.getAllUserRoles();
                        const userExists = existingUsers.some(u => u.email === email.toLowerCase());
                        
                        if (!userExists) {
                            // Auto-create new user in database with spectator role
                            await api.setUserRole(email, 'spectator');
                            console.log('New user added to DB:', email, 'role: spectator');
                        }
                    }
                    
                    setCurrentUser({ username: email, role });
                    console.log('User logged in:', email, 'role from DB:', role);
                }
            } else if (!authLoading && !isAuthenticated) {
                setCurrentUser(null);
            }
        };
        fetchUser();
    }, [authLoading, isAuthenticated, auth0User]);

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const data = selectedCategory === 'Historia' 
                ? await api.getHistory()
                : await api.getItems(selectedCategory);
            setItems(data);
        } catch (err) {
            console.error("Fetch items error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [selectedCategory]);

    const openItemModal = (item: Item | null = null) => {
        if (item) {
            const parsePolishNumber = (value: any) => {
                if (value === null || value === undefined || value === '') return 0;
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
        setEditingItem(item);
        setIsItemModalOpen(true);
    };

    const closeItemModal = () => setIsItemModalOpen(false);

    const handleSaveItem = async () => {
        if (!modalData.name) {
            alert("ID (Name) jest wymagany!");
            return;
        }
        const currentUsername = currentUser?.username || "Unknown";
        const itemData = {
            ...modalData,
            data_wyjazdu: modalData.dataWyjazdu || '',
            stan: modalData.stan ? 1 : 0,
        };
        try {
            if (editingItem) {
                await api.updateItem(editingItem.name, itemData);
            } else {
                await api.addItem(itemData);
            }
            await fetchItems();
            closeItemModal();
        } catch (err) {
            console.error("Save item error:", err);
            alert(err instanceof Error ? err.message : "Save failed");
        }
    };

    const handleDeleteItem = async (itemName: string) => {
        if (!window.confirm("Delete this item?")) return;
        try {
            await api.deleteItem(itemName);
            await fetchItems();
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    const handleGetNextId = async () => {
        try {
            const nextId = await api.getNextAvailableId(selectedCategoryForId, tvSize);
            setGeneratedId(nextId);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed");
        }
    };

    const handleCopyId = () => {
        if (generatedId) {
            navigator.clipboard.writeText(generatedId);
            alert(`ID ${generatedId} copied!`);
        }
    };

    const closeGetIdModal = () => setIsGetIdModalOpen(false);

    const itemsArray = Array.isArray(items) ? items : [];
    
    const searchFilteredItems = itemsArray.filter((item) => {
        if (!item || !item.name) return false;
        const query = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(query) || 
               (item.description || "").toLowerCase().includes(query);
    });
    
    const statusFilteredItems = searchFilteredItems.filter(item => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'na-stanie') return item.stan === 1 || item.stan === true;
        if (statusFilter === 'wyjechalo') return item.stan === 0 || item.stan === false;
        return true;
    });

    const filteredItems = selectedCategory === 'Historia' 
        ? statusFilteredItems
        : [...statusFilteredItems].sort((a, b) => a.name.localeCompare(b.name));

    const renderItemFormField = ([label, key, type = "input"]) => (
        <div className="form-control" key={key}>
            <label className="label">
                <span className="label-text text-white">{label}</span>
            </label>
            {type === "textarea" ? (
                <textarea
                    value={modalData[key as keyof typeof modalData]}
                    onChange={(e) => setModalData({ ...modalData, [key]: e.target.value })}
                    className="textarea textarea-bordered h-24 w-full bg-gray-700 border-gray-600 text-white"
                />
            ) : (
                <input
                    type={["ilosc", "wysokosc", "szerokosc", "glebokosc"].includes(key) ? "number" : "text"}
                    value={modalData[key as keyof typeof modalData]}
                    onChange={(e) => setModalData({ ...modalData, [key]: e.target.value })}
                    className="input input-bordered w-full bg-gray-700 border-gray-600 text-white"
                />
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#1a1b26] p-3">
            <header className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                <h1 className="text-3xl font-bold text-white">Inventory Management</h1>
                {authLoading ? (
                    <span className="text-white">Loading...</span>
                ) : !currentUser ? (
                    <div className="flex gap-2">
                        <button onClick={() => loginWithRedirect()} className="btn btn-primary">Login</button>
                        <button onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })} className="btn btn-secondary">Register</button>
                    </div>
                ) : (
                    <div className="flex gap-2 items-center flex-wrap">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input input-bordered bg-gray-700 text-white"
                        />
                        {currentUser.role === "admin" && selectedCategory !== 'Historia' && (
                            <button onClick={() => openItemModal()} className="btn btn-success">Add</button>
                        )}
                        <button onClick={() => auth0Logout({ logoutParams: { returnTo: window.location.origin } })} className="btn btn-error">Logout</button>
                        <span className="text-white">{currentUser.username.split('@')[0]} ({currentUser.role})</span>
                    </div>
                )}
            </header>

            {showUpdateBanner && (
                <div className="bg-blue-600 text-white px-4 py-2 text-center mb-2">
                    <span>Dostępna nowa wersja aplikacji! </span>
                    <button onClick={handleUpdateApp} className="bg-white text-blue-600 px-4 py-1 rounded font-bold ml-2">Aktualizuj</button>
                </div>
            )}

            <div className="tabs pb-2 flex flex-wrap gap-2 justify-center mb-4">
                {categories.filter(cat => {
                    if (cat === 'Historia') return currentUser && (currentUser.role === 'moder' || currentUser.role === 'admin');
                    if (cat === 'Ustawienia') return currentUser && (currentUser.role === 'moder' || currentUser.role === 'admin');
                    return true;
                }).map((category) => (
                    <button
                        key={category}
                        className={`btn ${selectedCategory === category ? 'btn-active' : ''}`}
                        onClick={() => setSelectedCategory(category)}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {selectedCategory === 'Ustawienia' && (currentUser?.role === 'admin' || currentUser?.role === 'moder') ? (
                <RoleManager />
            ) : isLoading ? (
                <div className="flex justify-center py-8">
                    <span className="loading loading-spinner"></span>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                    {filteredItems.map((item) => (
                        <Card
                            key={item.name}
                            item={item}
                            editItem={openItemModal}
                            deleteItem={handleDeleteItem}
                            role={currentUser?.role}
                        />
                    ))}
                </div>
            )}

            <Modal
                isOpen={isItemModalOpen}
                onRequestClose={closeItemModal}
                className="modal-box w-full max-w-md p-6 bg-gray-800 text-white"
                overlayClassName="modal-backdrop"
            >
                <h2 className="text-xl font-bold mb-4">{editingItem ? "Edit Item" : "Add New Item"}</h2>
                <div className="space-y-3">
                    {[["Name", "name"], ["Ilość", "ilosc"], ["Category", "category"], ["Description", "description", "textarea"]].map(([l, k, t]) => renderItemFormField([l, k, t]))}
                </div>
                <div className="flex gap-2 mt-4">
                    <button onClick={closeItemModal} className="btn btn-ghost">Cancel</button>
                    <button onClick={handleSaveItem} className="btn btn-primary">Save</button>
                </div>
            </Modal>

            <Modal
                isOpen={isGetIdModalOpen}
                onRequestClose={closeGetIdModal}
                className="modal-box w-full max-w-md p-6 bg-gray-800 text-white"
                overlayClassName="modal-backdrop"
            >
                <h2 className="text-xl font-bold mb-4">Get Free ID</h2>
                <div className="space-y-3">
                    <div className="form-control">
                        <label className="label"><span className="label-text text-white">Category</span></label>
                        <select
                            value={selectedCategoryForId}
                            onChange={(e) => setSelectedCategoryForId(e.target.value)}
                            className="select select-bordered bg-gray-700 text-white"
                        >
                            {categories.filter(cat => cat !== 'Historia').map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    {selectedCategoryForId === 'Telewizory' && (
                        <div className="form-control">
                            <label className="label"><span className="label-text text-white">Size (inches)</span></label>
                            <input
                                type="text"
                                value={tvSize}
                                onChange={(e) => setTvSize(e.target.value)}
                                className="input input-bordered bg-gray-700 text-white"
                            />
                        </div>
                    )}
                    <button onClick={handleGetNextId} className="btn btn-primary w-full">Get Free ID</button>
                    {generatedId && (
                        <div className="flex gap-2">
                            <input type="text" value={generatedId} readOnly className="input input-bordered bg-gray-700 text-white flex-1" />
                            <button onClick={handleCopyId} className="btn btn-info">Copy</button>
                        </div>
                    )}
                </div>
                <div className="mt-4">
                    <button onClick={closeGetIdModal} className="btn btn-ghost">Close</button>
                </div>
            </Modal>
        </div>
    );
}