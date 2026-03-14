import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PasswordCell = ({ password }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '220px' }}>
            <span style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '160px',
                display: 'block',
                opacity: visible ? 1 : 0.5,
                filter: visible ? 'none' : 'blur(4px)',
                userSelect: visible ? 'text' : 'none',
                transition: 'all 0.2s',
            }}>
                {password}
            </span>
            <button
                onClick={() => setVisible(v => !v)}
                title={visible ? 'Hide password' : 'Reveal password'}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '2px 4px',
                    flexShrink: 0,
                    opacity: 0.7,
                }}
            >
                {visible ? '🙈' : '👁️'}
            </button>
        </div>
    );
};

const UserList = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/admin/users');
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
        }
    };

    const deleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await axios.delete(`/api/admin/users/${id}`);
            fetchUsers(); // Refresh the list
        } catch (error) {
            console.error('Error deleting user:', error);
            alert(error.response?.data?.error || 'Failed to delete user');
        }
    };

    return (
        <div className="admin-section">
            <h2>Users</h2>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Password (Hashed)</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {Array.isArray(users) && users.map(user => (
                        <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td><PasswordCell password={user.password} /></td>
                            <td>{user.role}</td>
                            <td>{new Date(user.created_at).toLocaleDateString()}</td>
                            <td>
                                {user.role !== 'admin' && (
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => deleteUser(user.id)}
                                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                                    >
                                        Delete
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UserList;
