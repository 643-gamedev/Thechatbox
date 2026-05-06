import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useParams } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { UserProvider, useUser } from '@/lib/UserContext';
import { LayoutProvider } from '@/lib/LayoutContext';
import LoginScreen from '@/components/LoginScreen';
import IncomingCallListener from '@/components/phone/IncomingCallListener';
import DialupLoadingScreen from '@/components/DialupLoadingScreen';

import { Navigate } from 'react-router-dom';
import Landing from '@/pages/Landing';
import AppLayout from '@/components/layout/AppLayout';
import ServerHome from '@/pages/ServerHome';
import Chat from '@/pages/Chat';
import CodeEditor from '@/pages/CodeEditor';
import TerminalPage from '@/pages/TerminalPage';
import Discover from '@/pages/Discover';
import Settings from '@/pages/Settings';
import Games from '@/pages/Games';
import VoiceChannel from '@/pages/VoiceChannel';
import DirectMessages from '@/pages/DirectMessages';
import Phone from '@/pages/Phone';

function LegacyChatRedirect() {
  const { channelId } = useParams();
  return <Navigate to={`/server/main/chat/${channelId}`} replace />;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const { currentUser, loading: userLoading, loginAsGuest, isGuest } = useUser();

  // Show dialup loading screen once per session (browser tab)
  const [showDialup, setShowDialup] = React.useState(
    () => !sessionStorage.getItem('dialup_shown')
  );

  if (showDialup) {
    return <DialupLoadingScreen onDone={() => setShowDialup(false)} />;
  }

  if (isLoadingPublicSettings || isLoadingAuth || userLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="text-center space-y-3">
          <p className="text-4xl">🦦</p>
          <p className="text-sm tracking-wider" style={{ color: '#39FF14' }}>THECHATBOX</p>
          <p className="text-xs" style={{ color: '#39FF1488' }}>
            initializing<span className="cursor-blink">_</span>
          </p>
        </div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Show login if no session at all (but not on landing page)
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/download" element={<Landing />} />
        <Route path="*" element={<LoginScreen onGuest={loginAsGuest} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<Landing />} />
      <Route path="/download" element={<Landing />} />
      <Route element={<AppLayout />}>
        {/* App entry */}
        <Route path="/app" element={<ServerHome />} />
        <Route path="/server" element={<ServerHome />} />
        <Route path="/server/:serverId" element={<ServerHome />} />
        <Route path="/server/:serverId/chat/:channelId" element={<Chat />} />
        <Route path="/server/:serverId/voice/:channelId" element={<VoiceChannel />} />
        <Route path="/code-editor" element={<CodeEditor />} />
        <Route path="/terminal" element={<TerminalPage />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/games" element={<Games />} />
        <Route path="/dm" element={<DirectMessages />} />
        <Route path="/phone" element={<Phone />} />
        {/* Legacy redirect: old /chat/:id links → main server */}
        <Route path="/chat/:channelId" element={<LegacyChatRedirect />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <UserProvider>
            <LayoutProvider>
              <IncomingCallListener>
                <AuthenticatedApp />
              </IncomingCallListener>
            </LayoutProvider>
          </UserProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App
