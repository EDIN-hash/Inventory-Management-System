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
        <div className="card bg-gray-800 p-3 md:p-4 text-white w-full max-w-4xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Role Management</h2>
            
            <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                    type="email"
                    placeholder="user@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="input input-bordered bg-gray-700 flex-1 text-sm"
                    required
                />
                <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="select select-bordered bg-gray-700 text-sm"
                >
                    <option value="spectator">Spectator</option>
                    <option value="moder">Moder</option>
                    <option value="admin">Admin</option>
                </select>
                <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                    {saving ? '...' : 'Add'}
                </button>
            </form>

            {loading ? (
                <div className="text-center py-4">Loading...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table table-xs md:table-sm w-full">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.email}>
                                    <td className="text-xs sm:text-sm">{u.email}</td>
                                    <td>
                                        <span className={`badge badge-sm ${
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
                <div className="text-center py-4 text-gray-400 text-sm">
                    No users. Add above.
                </div>
            )}
        </div>
    );
}