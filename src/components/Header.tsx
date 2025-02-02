import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import TokenPurchaseModal from './TokenPurchaseModal';
import Logo from './Logo';

export default function Header() {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<number | null>(null);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);

  useEffect(() => {
    loadUserTokens();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserTokens();
    });

    const userSubscription = supabase
      .channel('users_channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          setTokens((payload.new as any).tokens);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      userSubscription.unsubscribe();
    };
  }, []);

  async function loadUserTokens() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from('users')
        .select('tokens')
        .single();
      
      if (data) {
        setTokens(data.tokens);
      }
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/auth');
  }

  return (
    <>
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex flex-col">
              <Logo />
              <span className="text-sm text-gray-600 mt-1">
                Effortless recipe creation for Facebook, Pinterest, and Instagram bloggers
              </span>
            </Link>

            <nav className="flex items-center space-x-4">
              <Link to="/">RecipeGen</Link>
              <Link to="/styles">Styles</Link>
              <Link to="/feedspy">FeedSpy</Link>
              <Link to="/templates">Templates</Link>
              <Link to="/plagiat">Plagiat</Link>
              <div className="flex items-center space-x-4 ml-4">
                <span className="text-sm font-medium">
                  {tokens !== null ? `${tokens} tokens` : '...'}
                </span>
                <button
                  onClick={() => setIsTokenModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Buy More
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium px-3 py-1.5 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <TokenPurchaseModal 
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
      />
    </>
  );
}