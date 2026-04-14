import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface UserRole {
    email: string;
    role: string;
}

export default function RoleManager() {
    const [users, setUsers] = useState<UserRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState('spectator');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            await api.initUserRolesTable();
            const data = await api.getAllUserRoles();
            setUsers(data);
        } catch (err) {
            console.error('Load users error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail) return;
        
        setSaving(true);
        try {
            await api.setUserRole(newEmail, newRole);
            await loadUsers();
            setNewEmail('');
            alert(`Role set: ${newRole} for ${newEmail}`);
        } catch (err) {
            alert('Error: ' + (err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (email: string) => {
        if (!window.confirm(`Delete role for ${email}?`)) return;
        try {
            await api.deleteUserRole(email);
            await loadUsers();
        } catch (err) {
            alert('Error: ' + (err as Error).message);
        }
    };

    return (
        <div className="card bg-gray-800 p-3 text-white w-full max-w-lg mx-auto">
            <h2 className="text-lg font-bold mb-3 text-center">Role Management</h2>
            
            <form onSubmit={handleAddUser} className="flex flex-wrap gap-2 mb-3 justify-center">
                <input
                    type="email"
                    placeholder="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="input input-bordered bg-gray-700 w-full"
                    required
                />
                <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="select select-bordered bg-gray-700"
                >
                    <option value="spectator">Spectator</option>
                    <option value="moder">Moder</option>
                    <option value="admin">Admin</option>
                </select>
                <button type="submit" disabled={saving} className="btn btn-primary">
                    {saving ? '...' : 'Add'}
                </button>
            </form>

            {loading ? (
                <div className="text-center py-2">Loading...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table table-xs w-full">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Role</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.email}>
                                    <td className="text-xs">{u.email}</td>
                                    <td>
                                        <span className={`badge badge-xs ${
                                            u.role === 'admin' ? 'badge-error' :
                                            u.role === 'moder' ? 'badge-warning' :
                                            'badge-info'
                                        }`}>{u.role}</span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handleDeleteUser(u.email)}
                                            className="btn btn-xs btn-error"
                                        >
                                            X
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {users.length === 0 && (
                <div className="text-center py-2 text-gray-400 text-sm">
                    No users
                </div>
            )}
        </div>
    );
}