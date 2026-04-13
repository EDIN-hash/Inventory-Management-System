import React, { useState } from 'react';

export default function LoginModal({ onLogin, onClose }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const submit = () => {
        onLogin(username, password);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded shadow-md w-80">
                <h2 className="text-lg font-bold mb-4">Login</h2>
                <input
                    type="text"
                    placeholder="Username"
                    className="input input-bordered w-full mb-2"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="input input-bordered w-full mb-4"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <button className="btn btn-primary" onClick={submit}>Login</button>
                    <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
