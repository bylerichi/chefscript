import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import StyleCreator from './pages/StyleCreator';
import FeedSpyExtractor from './pages/FeedSpyExtractor';
import TemplateEditor from './pages/TemplateEditor';
import Plagiat from './pages/Plagiat';
import Auth from './pages/Auth';
import Layout from './components/Layout';
import AboutUs from './pages/AboutUs';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Disclaimer from './pages/Disclaimer';
import { supabase } from './lib/supabase';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsAuthenticated(true);
      } else if (event === 'USER_DELETED') {
        setIsAuthenticated(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkAuth() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth error:', error.message);
        setIsAuthenticated(false);
        return;
      }

      if (!session) {
        setIsAuthenticated(false);
        return;
      }

      // Check if session is expired
      const expiresAt = session?.expires_at;
      if (expiresAt && Date.now() / 1000 >= expiresAt) {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(true);
    } catch (err) {
      console.error('Auth check failed:', err);
      setIsAuthenticated(false);
    }
  }

  if (isAuthenticated === null) {
    return null;
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={isAuthenticated ? <Navigate to="/" /> : <Auth />} />
        <Route element={isAuthenticated ? <Layout /> : <Navigate to="/auth" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/styles" element={<StyleCreator />} />
          <Route path="/feedspy" element={<FeedSpyExtractor />} />
          <Route path="/templates" element={<TemplateEditor />} />
          <Route path="/plagiat" element={<Plagiat />} />
        </Route>
        <Route element={<Layout />}>
          <Route path="/about" element={<AboutUs />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;