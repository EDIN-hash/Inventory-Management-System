import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import api from '../services/api';
import type { Item, SortConfig, StatusFilter, HistorySort } from '../types';

interface ItemsContextType {
    items: Item[];
    isLoading: boolean;
    error: string | null;
    fetchItems: (category: string) => Promise<void>;
    addItem: (item: Item) => Promise<void>;
    updateItem: (name: string, item: Item) => Promise<void>;
    deleteItem: (name: string) => Promise<void>;
    // Filters
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    sortConfig: SortConfig;
    setSortConfig: (config: SortConfig) => void;
    statusFilter: StatusFilter;
    setStatusFilter: (filter: StatusFilter) => void;
    // History
    historySort: HistorySort;
    setHistorySort: (sort: HistorySort) => void;
    historyUserFilter: string;
    setHistoryUserFilter: (filter: string) => void;
    historyDeviceFilter: string;
    setHistoryDeviceFilter: (filter: string) => void;
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

export function ItemsProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [historySort, setHistorySort] = useState<HistorySort>('date_desc');
    const [historyUserFilter, setHistoryUserFilter] = useState('all');
    const [historyDeviceFilter, setHistoryDeviceFilter] = useState('all');

    const fetchItems = useCallback(async (category: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = category === 'Historia' 
                ? await api.getHistory()
                : await api.getItems(category);
            setItems(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch items');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const addItem = useCallback(async (item: Item) => {
        await api.addItem(item);
    }, []);

    const updateItem = useCallback(async (name: string, item: Item) => {
        await api.updateItem(name, item);
    }, []);

    const deleteItem = useCallback(async (name: string) => {
        await api.deleteItem(name);
    }, []);

    return (
        <ItemsContext.Provider value={{
            items,
            isLoading,
            error,
            fetchItems,
            addItem,
            updateItem,
            deleteItem,
            searchQuery,
            setSearchQuery,
            sortConfig,
            setSortConfig,
            statusFilter,
            setStatusFilter,
            historySort,
            setHistorySort,
            historyUserFilter,
            setHistoryUserFilter,
            historyDeviceFilter,
            setHistoryDeviceFilter,
        }}>
            {children}
        </ItemsContext.Provider>
    );
}

export function useItems() {
    const context = useContext(ItemsContext);
    if (context === undefined) {
        throw new Error('useItems must be used within ItemsProvider');
    }
    return context;
}