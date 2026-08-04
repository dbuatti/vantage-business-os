import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Sparkles, Home } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30 mb-8">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="font-black tracking-tighter text-6xl mb-3">404</h1>
        <p className="text-muted-foreground text-sm font-semibold uppercase tracking-widest mb-6">
          Page not found
        </p>
        <p className="text-sm text-muted-foreground/70 mb-8">
          This page doesn&apos;t exist or has been moved. Return to your command center.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 h-11 px-6 rounded-2xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <Home className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
