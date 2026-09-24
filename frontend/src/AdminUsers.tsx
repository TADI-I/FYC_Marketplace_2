import React, { useEffect, useState } from 'react';
import { getAllUsers, updateUser } from './api';

type User = {
  _id: string;
  name: string;
  email: string;
  campus?: string;
  whatsapp?: string;
  type?: string;
  updatedAt?: string;
};

export interface AdminUsersProps {
  darkMode?: boolean;
}

const AdminUsers: React.FC<AdminUsersProps> = ({ darkMode = false }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all'|'buyer'|'seller'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<User>>({});

  // Calculate counts
  const buyerCount = users.filter(u => u.type === 'buyer').length;
  const sellerCount = users.filter(u => u.type === 'seller').length;
  const totalCount = users.length;

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers(filterType);
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterType]);

  const startEdit = (u: User) => {
    setEditingId(u._id);
    setForm({ name: u.name, email: u.email, campus: u.campus, whatsapp: u.whatsapp });
  };

  const save = async () => {
    if (!editingId) return;
    try {
      const resp = await updateUser(editingId, form);
      if (!resp.success) throw new Error(resp.error || 'Update failed');
      setEditingId(null);
      setForm({});
      await load();
      alert('User updated');
    } catch (err: any) {
      alert(err.message || 'Failed to update');
    }
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <div style={{
      marginTop: '1.5rem',
      padding: '1rem',
      border: '1px solid rgba(16, 17, 15, .17)',
      borderRadius: '0.5rem',
      backgroundColor: 'white'
    }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Manage Users
      </h3>

      {/* Stats Display */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem',
        padding: '1rem',
        backgroundColor: '#fbfaf6',
        borderRadius: '0.5rem',
        border: '1px solid rgba(16, 17, 15, .17)'
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#74756f', marginTop: '0.25rem' }}>
            Total Users
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10110f' }}>
            {buyerCount}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#74756f', marginTop: '0.25rem' }}>
            Buyers
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f97316' }}>
            {sellerCount}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#74756f', marginTop: '0.25rem' }}>
            Sellers
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button 
          onClick={() => setFilterType('all')} 
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid rgba(16, 17, 15, .24)',
            borderRadius: '0.25rem',
            backgroundColor: filterType === 'all' ? '#1f2937' : 'white',
            color: filterType === 'all' ? 'white' : 'black',
            cursor: 'pointer',
            fontWeight: filterType === 'all' ? 600 : 400
          }}
        >
          All
        </button>
        <button 
          onClick={() => setFilterType('buyer')} 
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid rgba(16, 17, 15, .24)',
            borderRadius: '0.25rem',
            backgroundColor: filterType === 'buyer' ? '#1f2937' : 'white',
            color: filterType === 'buyer' ? 'white' : 'black',
            cursor: 'pointer',
            fontWeight: filterType === 'buyer' ? 600 : 400
          }}
        >
          Buyers
        </button>
        <button 
          onClick={() => setFilterType('seller')} 
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid rgba(16, 17, 15, .24)',
            borderRadius: '0.25rem',
            backgroundColor: filterType === 'seller' ? '#1f2937' : 'white',
            color: filterType === 'seller' ? 'white' : 'black',
            cursor: 'pointer',
            fontWeight: filterType === 'seller' ? 600 : 400
          }}
        >
          Sellers
        </button>
        <button 
          onClick={load} 
          style={{
            marginLeft: 'auto',
            padding: '0.5rem 1rem',
            border: '1px solid rgba(16, 17, 15, .24)',
            borderRadius: '0.25rem',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {users.map(u => (
          <div 
            key={u._id} 
            style={{
              padding: '1.5rem',
              border: '1px solid rgba(16, 17, 15, .17)',
              borderRadius: '0.5rem',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              {editingId === u._id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                      Name
                    </label>
                    <input 
                      value={form.name || ''} 
                      onChange={e => setForm({...form, name: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid rgba(16, 17, 15, .24)',
                        borderRadius: '0.375rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                      Email
                    </label>
                    <input 
                      value={form.email || ''} 
                      onChange={e => setForm({...form, email: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid rgba(16, 17, 15, .24)',
                        borderRadius: '0.375rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                      Campus
                    </label>
                    <input 
                      value={form.campus || ''} 
                      onChange={e => setForm({...form, campus: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid rgba(16, 17, 15, .24)',
                        borderRadius: '0.375rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                      WhatsApp
                    </label>
                    <input 
                      value={form.whatsapp || ''} 
                      onChange={e => setForm({...form, whatsapp: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid rgba(16, 17, 15, .24)',
                        borderRadius: '0.375rem'
                      }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {u.name} 
                    <span style={{ fontSize: '0.75rem', color: '#74756f', fontWeight: 400, marginLeft: '0.5rem' }}>
                      ({u.type})
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#3e403a', marginBottom: '0.25rem' }}>
                    {u.email}
                  </div>
                  {u.campus && (
                    <div style={{ fontSize: '0.875rem', color: '#3e403a', marginBottom: '0.25rem' }}>
                      Campus: {u.campus}
                    </div>
                  )}
                  {u.whatsapp && (
                    <div style={{ fontSize: '0.875rem', color: '#3e403a' }}>
                      WhatsApp: {u.whatsapp}
                    </div>
                  )}
                  {u.updatedAt && (
                    <div style={{ fontSize: '0.75rem', color: '#74756f', marginTop: '0.5rem' }}>
                      Last updated: {new Date(u.updatedAt).toLocaleString()}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '1rem' }}>
              {editingId === u._id ? (
                <>
                  <button 
                    onClick={save} 
                    style={{ 
                      backgroundColor: '#10110f', 
                      color: 'white', 
                      padding: '0.5rem 1rem', 
                      borderRadius: '0.25rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => { setEditingId(null); setForm({}); }} 
                    style={{ 
                      padding: '0.5rem 1rem',
                      border: '1px solid rgba(16, 17, 15, .24)',
                      borderRadius: '0.25rem',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => startEdit(u)} 
                  style={{ 
                    padding: '0.5rem 1rem',
                    border: '1px solid rgba(16, 17, 15, .24)',
                    borderRadius: '0.25rem',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        ))}
        {users.length === 0 && <div style={{ textAlign: 'center', color: '#74756f', padding: '2rem' }}>No users found</div>}
      </div>
    </div>
  );
};

export default AdminUsers;