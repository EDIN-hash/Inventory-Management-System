export interface Item {
    name: string;
    quantity?: string;
    ilosc?: number;
    description?: string;
    photo_url?: string;
    photo_url2?: string;
    category?: string;
    wysokosc?: number;
    szerokosc?: number;
    glebokosc?: number;
    data_wyjazdu?: string | null;
    stan?: number | boolean;
    linknadysk?: string;
    updatedAt?: string;
    updatedBy?: string;
    deviceId?: string;
    stoisko?: string;
}

export interface User {
    username: string;
    role: 'spectator' | 'moder' | 'admin';
}

export interface AuthResponse {
    token: string;
    username: string;
    role: string;
}

export interface HistoryEntry {
    id?: number;
    item_name: string;
    action: string;
    field_name: string;
    old_value: string;
    new_value: string;
    changed_by: string;
    device_id: string;
    timestamp?: string;
}

export interface DeviceNickname {
    username: string;
    device_id: string;
    nickname: string;
}

export interface UserDevice {
    changed_by: string;
    device_id: string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
    key: string | null;
    direction: SortDirection;
}

export type StatusFilter = 'all' | 'na-stanie' | 'wyjechalo';
export type HistorySort = 'date_desc' | 'date_asc' | 'user';

export type Category = 
    | 'Telewizory'
    | 'Lodowki'
    | 'Ekspresy'
    | 'Krzesla'
    | 'NM'
    | 'LADY'
    | 'Historia'
    | 'Ustawienia';

export const CATEGORIES: Category[] = [
    'Telewizory',
    'Lodowki',
    'Ekspresy',
    'Krzesla',
    'NM',
    'LADY',
    'Historia',
    'Ustawienia'
];