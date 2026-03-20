"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Mail, Lock, Loader2, ArrowRight, ShieldCheck, Zap, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { showError, showSuccess } from '@/utils/toast';

const Login = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session && !loading) {
      navigate('/');
    }
  }, [session, loading, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        showSuccess('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showSuccess('Signed in successfully!');
      }
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      showError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-hidden">
      {/* Left Side: Branding & Features */}
      <div className="hidden lg:flex flex-1 bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-indigo-600 to-purple-700" />
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:40px_40px]" />
        
        <div className="relative z-10 max-w-lg space-y-12 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <Sparkles className="w-10 h-10" />
            </div>
            <h1 className="text-5xl font-black tracking-tighter">Vantage</h1>
          </div>
          
          <div className="space-y-8">
            <h2 className="text-4xl font-bold leading-tight">The Intelligent Operating System for your Business.</h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/10 rounded-xl"><ShieldCheck className="w-5 h-5" /></div>
                <div>
                  <p className="font-bold text-lg">Bank-Grade Security</p>
                  <p className="text-white/70 text-sm">Your financial data is encrypted and protected with industry-leading standards.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/10 rounded-xl"><Zap className="w-5 h-5" /></div>
                <div>
                  <p className="font-bold text-lg">AI-Powered Insights</p>
                  <p className="text-white/70 text-sm">Get smart recommendations on where to invest your time for maximum return.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/10 rounded-xl"><Globe className="w-5 h-5" /></div>
                <div>
                  <p className="font-bold text-lg">Global Compliance</p>
                  <p className="text-white/70 text-sm">Ready for tax season with automated reports and accountant-ready data.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/20 flex items-center gap-6 text-sm font-medium text-white/60">
            <span>Trusted by 5,000+ businesses</span>
            <div className="h-4 w-[1px] bg-white/20" />
            <span>99.9% Uptime</span>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background relative">
        <div className="absolute top-0 right-0 p-8 lg:hidden">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="font-black text-xl tracking-tighter">Vantage</span>
          </div>
        </div>

        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="space-y-2">
            <h3 className="text-3xl font-black tracking-tight">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h3>
            <p className="text-muted-foreground font-medium">
              {isSignUp ? 'Start your 14-day free trial today.' : 'Enter your credentials to access your dashboard.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-12 rounded-2xl gap-2 font-bold border-2 hover:bg-muted/50"
              onClick={() => handleOAuthLogin('google')}
              disabled={isLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
            <Button 
              variant="outline" 
              className="h-12 rounded-2xl gap-2 font-bold border-2 hover:bg-muted/50"
              onClick={() => handleOAuthLogin('github')}
              disabled={isLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </Button>
          </div>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              or use email
            </span>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 rounded-2xl border-2 focus:border-primary transition-all text-base"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Password</Label>
                {!isSignUp && <button type="button" className="text-xs font-bold text-primary hover:underline">Forgot password?</button>}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-14 rounded-2xl border-2 focus:border-primary transition-all text-base"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-2xl font-black text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm font-medium text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-black text-primary hover:text-primary/80 transition-colors"
            >
              {isSignUp ? 'Sign In' : 'Sign Up for Free'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;