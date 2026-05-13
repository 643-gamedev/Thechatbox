import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, Compass, Settings } from 'lucide-react';
import { useUser } from '@/lib/UserContext';

export default function ServerBar({ servers, onCreateServer, onDiscover, onSettings }) {
  const { serverId } = useParams();
  const { logout, currentUser, isGuest } = useUser();

  const initial = currentUser?.display_name?.[0] || currentUser?.full_name?.[0] || currentUser?.email?.[0] || '?';

  return (
    <div
      className="w-16 h-full flex flex-col items-center py-3 gap-2 border-r border-border flex-shrink-0"
      style={{ background: '#050a05' }}
    >
      {/* Main Thechatbox server — always pinned at top */}
      <Link to="/server/main">
        <div
          title="Thechatbox (Main Server)"
          className={`w-10 h-10 flex items-center justify-center text-lg rounded-full border transition-all cursor-pointer hover:scale-110 ${
            serverId === 'main' ? 'rounded-xl' : 'rounded-full'
          }`}
          style={{
            borderColor: serverId === 'main' ? '#39FF14' : '#39FF1444',
            background: '#0a1a0a',
            boxShadow: serverId === 'main' ? '0 0 8px #39FF1466' : 'none',
          }}
        >
          🦦
        </div>
      </Link>

      {/* Divider */}
      <div className="w-8 border-t" style={{ borderColor: '#39FF1433' }} />

      {/* User's joined servers */}
      <div className="flex flex-col gap-2 items-center flex-1 overflow-y-auto w-full px-3">
        {servers.map(s => (
          <Link key={s.id} to={`/server/${s.id}`}>
            <div
              title={s.name}
              className={`w-10 h-10 flex items-center justify-center text-lg transition-all cursor-pointer hover:scale-110 ${
                serverId === s.id ? 'rounded-xl' : 'rounded-full'
              }`}
              style={{
                borderColor: serverId === s.id ? '#39FF14' : '#39FF1433',
                border: '1px solid',
                background: '#0a1a0a',
                boxShadow: serverId === s.id ? '0 0 8px #39FF1466' : 'none',
              }}
            >
              {s.icon || s.name[0].toUpperCase()}
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col gap-2 items-center">
        {/* Create server */}
        {!isGuest && (
          <button
            onClick={onCreateServer}
            title="Create Server"
            className="w-10 h-10 flex items-center justify-center rounded-full border transition-all hover:scale-110 hover:border-foreground"
            style={{ borderColor: '#39FF1444', background: '#0a1a0a', color: '#39FF14' }}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* Discover */}
        <button
          onClick={onDiscover}
          title="Discover Servers"
          className="w-10 h-10 flex items-center justify-center rounded-full border transition-all hover:scale-110"
          style={{ borderColor: '#39FF1444', background: '#0a1a0a', color: '#39FF14' }}
        >
          <Compass className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          onClick={onSettings}
          title="Settings"
          className="w-10 h-10 flex items-center justify-center rounded-full border transition-all hover:scale-110"
          style={{ borderColor: '#39FF1444', background: '#0a1a0a', color: '#39FF14' }}
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User avatar / logout */}
        <button
          onClick={logout}
          title={`Logout (${currentUser?.display_name || currentUser?.email})`}
          className="w-10 h-10 flex items-center justify-center rounded-full border overflow-hidden transition-all hover:scale-110"
          style={{ borderColor: '#39FF14', background: '#0a2a0a', color: '#39FF14' }}
        >
          {currentUser?.avatar_url ? (
            <img src={currentUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold">{initial.toUpperCase()}</span>
          )}
        </button>
      </div>
    </div>
  );
}
