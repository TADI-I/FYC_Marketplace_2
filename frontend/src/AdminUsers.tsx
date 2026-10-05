import React, { useEffect, useState } from 'react';
import { getAllUsers, updateUser } from './api';
import { showNotification } from './AppNotificationModal';

const ADMIN_PAGE_SIZE = 10;

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
  const [visibleCount, setVisibleCount] = useState(ADMIN_PAGE_SIZE);

  // Calculate counts
  const buyerCount = users.filter(u => u.type === 'buyer').length;
  const sellerCount = users.filter(u => u.type === 'seller').length;
  const totalCount = users.length;

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers(filterType);
      setUsers(data.users || []);
      setVisibleCount(ADMIN_PAGE_SIZE);
    } catch (err) {
      console.error(err);
      showNotification({ type: 'error', title: 'Users could not be loaded', message: 'Please try loading the user list again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterType]);

  const visibleUsers = users.slice(0, visibleCount);
  const hasMoreUsers = visibleCount < users.length;

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
      showNotification({ type: 'success', title: 'User updated', message: 'The account changes were saved successfully.' });
    } catch (err: any) {
      showNotification({ type: 'error', title: 'Update failed', message: err.message || 'The user could not be updated.' });
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
        {visibleUsers.map(u => (
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
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '1rem' }}>
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
            </div>
          </div>
        ))}
        {users.length === 0 && <div style={{ textAlign: 'center', color: '#74756f', padding: '2rem' }}>No users found</div>}
        {hasMoreUsers && (
          <button
            onClick={() => setVisibleCount(count => Math.min(count + ADMIN_PAGE_SIZE, users.length))}
            style={{
              alignSelf: 'center',
              padding: '0.75rem 1.25rem',
              border: '1px solid rgba(0, 122, 255, .24)',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(0, 122, 255, .1)',
              color: '#007aff',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Load 10 more ({users.length - visibleCount} remaining)
          </button>
        )}
      </div>

      {editingId && (
        <div className="apple-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="admin-user-edit-title">
          <div className="apple-modal-card bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <h3 id="admin-user-edit-title" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
              Edit User
            </h3>
            <div style={{ display: 'grid', gap: '0.875rem' }}>
              <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Name
                <input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
              </label>
              <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Email
                <input value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} />
              </label>
              <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Campus
                <input value={form.campus || ''} onChange={e => setForm({...form, campus: e.target.value})} />
              </label>
              <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.875rem', fontWeight: 600 }}>
                WhatsApp
                <input value={form.whatsapp || ''} onChange={e => setForm({...form, whatsapp: e.target.value})} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={save} style={{ backgroundColor: '#007aff', color: 'white', padding: '0.75rem 1rem', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', flex: 1 }}>
                Save
              </button>
              <button onClick={() => { setEditingId(null); setForm({}); }} style={{ padding: '0.75rem 1rem', border: '1px solid rgba(16, 17, 15, .24)', borderRadius: '0.5rem', backgroundColor: 'white', cursor: 'pointer', flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
