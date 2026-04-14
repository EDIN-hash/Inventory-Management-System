import React, { useState, useEffect } from "react";
import api from "./services/api";

export default function UserDevicesSettings() {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [userDevices, setUserDevices] = useState([]);
    const [nicknames, setNicknames] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersData, nicknamesData] = await Promise.all([
                api.getUserDevices(),
                api.getDeviceNicknames()
            ]);
            
            const uniqueUsers = [...new Set(usersData.map(d => d.changed_by).filter(Boolean))];
            setUsers(uniqueUsers);
            
            const nicknamesMap = {};
            nicknamesData.forEach(n => {
                nicknamesMap[n.device_id] = n.nickname;
            });
            setNicknames(nicknamesMap);
            
            setLoading(false);
        } catch (error) {
            console.error('Error loading data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedUser) {
            loadDevicesForUser(selectedUser);
        }
    }, [selectedUser]);

    const loadDevicesForUser = async (username) => {
        try {
            const data = await api.getUserDevicesByUser(username);
            setUserDevices(data.map(d => d.device_id));
        } catch (error) {
            console.error('Error loading devices:', error);
            setUserDevices([]);
        }
    };

    const handleSaveNickname = async (deviceId, nickname) => {
        setSaving(true);
        try {
            await api.saveDeviceNickname(selectedUser, deviceId, nickname);
            setNicknames(prev => ({ ...prev, [deviceId]: nickname }));
        } catch (error) {
            console.error('Error saving nickname:', error);
        }
        setSaving(false);
    };

    const handleDeleteNickname = async (deviceId) => {
        setSaving(true);
        try {
            await api.deleteDeviceNickname(selectedUser, deviceId);
            setNicknames(prev => {
                const updated = { ...prev };
                delete updated[deviceId];
                return updated;
            });
        } catch (error) {
            console.error('Error deleting nickname:', error);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="loading-pulse"></div>
            </div>
        );
    }

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Ustawienia urządzeń</h2>
            
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-6">
                <p className="text-slate-400 text-sm mb-4">
                    Tutaj możesz przypisać nicknames do urządzeń użytkowników. 
                    Nickname będzie wyświetlany w historii zamiast pełnego ID urządzenia.
                </p>
                
                <div className="mb-4">
                    <label className="block text-white text-sm font-medium mb-2">
                        Wybierz użytkownika:
                    </label>
                    <select
                        className="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                    >
                        <option value="">-- Wybierz użytkownika --</option>
                        {users.map(user => (
                            <option key={user} value={user}>{user}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedUser && (
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        Urządzenia użytkownika: {selectedUser}
                    </h3>
                    
                    {userDevices.length === 0 ? (
                        <p className="text-slate-400">Brak urządzeń dla tego użytkownika</p>
                    ) : (
                        <div className="space-y-4">
                            {userDevices.map((deviceId) => (
                                <div 
                                    key={deviceId} 
                                    className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                                >
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                        <div className="flex-1">
                                            <div className="text-slate-400 text-xs mb-1">Oryginalne ID:</div>
                                            <div className="text-slate-300 text-sm font-mono">{deviceId}</div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-slate-400 text-xs mb-1">Twój nickname:</div>
                                            <input
                                                type="text"
                                                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                                                placeholder="Np. Komputer biurowy"
                                                defaultValue={nicknames[deviceId] || ''}
                                                onBlur={(e) => handleSaveNickname(deviceId, e.target.value)}
                                            />
                                        </div>
                                        {nicknames[deviceId] && (
                                            <button
                                                onClick={() => handleDeleteNickname(deviceId)}
                                                className="text-red-400 hover:text-red-300 text-sm"
                                                disabled={saving}
                                            >
                                                Usuń
                                            </button>
                                        )}
                                        {nicknames[deviceId] && (
                                            <div className="flex-1">
                                                <div className="text-green-400 text-xs mb-1">Będzie wyświetlane jako:</div>
                                                <div className="text-green-300 font-medium">
                                                    {nicknames[deviceId]} ({selectedUser})
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!selectedUser && users.length > 0 && (
                <div className="text-center text-slate-400 py-8">
                    Wybierz użytkownika z listy powyżej, aby zobaczyć jego urządzenia
                </div>
            )}

            <div className="mt-6 bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <h4 className="text-white font-medium mb-2">Wszystkie nicknames ({Object.keys(nicknames).length}):</h4>
                {Object.keys(nicknames).length === 0 ? (
                    <p className="text-slate-400 text-sm">Brak przypisanych nicknames</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                        {Object.entries(nicknames).map(([deviceId, nickname]) => (
                            <div key={deviceId} className="text-sm bg-gray-800 rounded p-2">
                                <span className="text-green-400 font-medium">{nickname}</span>
                                <span className="text-slate-500 mx-2">→</span>
                                <span className="text-slate-400 font-mono text-xs">{deviceId.substring(0, 25)}...</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
