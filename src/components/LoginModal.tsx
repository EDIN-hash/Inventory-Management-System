import React, { useState } from 'react';

export default function LoginModal({ onLogin, onClose }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const submit = (e: React.MouseEvent) => {
        e.preventDefault();
        onLogin(username, password);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded shadow-md w-80">
                <h2 className="text-lg font-bold mb-4">Login</h2>
                <form onSubmit={submit}>
                    <input
                        type="text"
                        placeholder="Username"
                        className="input input-bordered w-full mb-2"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="input input-bordered w-full mb-4"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                    <div className="flex justify-end gap-2">
                        <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Login</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
