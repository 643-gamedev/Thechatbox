
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useUser } from '@/lib/UserContext';
import ServerBar from './ServerBar';
import ChannelSidebar from './ChannelSidebar';
import CreateServerModal from '@/components/modals/CreateServerModal';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AppLayout() {
  const navigate = useNavigate();
  const { serverId } = useParams();
  const { currentUser, isGuest } = useUser();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const effectiveServerId = serverId || 'main';

  // Handle invite link on load
  useEffect(() => {
    if (isGuest || !currentUser?.email) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (!token) return;
    // Clear the param from URL immediately
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
    // Find the server with this token
    db.entities.Server.filter({ invite_token: token }).then(async (servers) => {
      const server = servers[0];
      if (!server) { toast.error('Invalid or expired invite link'); return; }
      // Check if already a member
      const existing = await db.entities.ServerMember.filter({ server_id: server.id, user_email: currentUser.email });
      if (existing.length > 0) { navigate(`/server/${server.id}`); return; }
      await db.entities.ServerMember.create({
        server_id: server.id,
        user_email: currentUser.email,
        display_name: currentUser.full_name || currentUser.email,
        role: 'member',
      });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['my-memberships', currentUser.email] });
      toast.success(`Joined ${server.name}!`);
      navigate(`/server/${server.id}`);
    });
  }, [currentUser?.email, isGuest]);

  // Servers the user is a member of
  const { data: memberRows = [] } = useQuery({
    queryKey: ['my-memberships', currentUser?.email],
    queryFn: () => isGuest ? [] : db.entities.ServerMember.filter({ user_email: currentUser?.email }),
    enabled: !isGuest && !!currentUser?.email,
  });

  // All servers (to look up by id)
  const { data: allServers = [] } = useQuery({
    queryKey: ['servers'],
    queryFn: () => db.entities.Server.list(),
  });

  const myServers = allServers.filter(s =>
    !s.is_main && memberRows.some(m => m.server_id === s.id)
  );

  // Current server
  const currentServer = effectiveServerId === 'main'
    ? { id: 'main', name: 'THECHATBOX', icon: '🦦', is_main: true }
    : allServers.find(s => s.id === effectiveServerId) || null;

  // Channels for current server
  const { data: channels = [] } = useQuery({
    queryKey: ['channels', effectiveServerId],
    queryFn: () => db.entities.Channel.filter({ server_id: effectiveServerId }),
  });

  return (
    <div className="h-screen flex bg-background overflow-hidden relative crt-flicker">
      {/* Scanlines */}
      <div className="scanlines fixed inset-0 z-50 pointer-events-none" />

      {/* Mobile toggle */}
      <Button
        variant="ghost" size="icon"
        className="fixed top-3 left-3 z-40 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </Button>

      {/* Left column: server bar + channel sidebar */}
      <div className={`fixed md:static z-30 h-full flex transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <ServerBar
          servers={myServers}
          onCreateServer={() => setCreateOpen(true)}
          onDiscover={() => { navigate('/discover'); setSidebarOpen(false); }}
          onSettings={() => { navigate('/settings'); setSidebarOpen(false); }}
        />
        <ChannelSidebar server={currentServer} channels={channels} />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>

      {/* Create server modal */}
      <CreateServerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(s) => navigate(`/server/${s.id}`)}
      />
    </div>
  );
}