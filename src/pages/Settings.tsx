"use client";

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  Building2, 
  Palette, 
  Save,
  Globe,
  Mail,
  Phone,
  Calculator,
  Share2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import AccountantSettings from '@/components/AccountantSettings';

const Settings = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    company_email: '',
    company_phone: '',
    company_website: '',
    company_abn: '',
    application_name: 'Invoicify',
    primary_brand_color: '#6366f1',
    accountant_share_token: ''
  });

  useEffect(() => {
    if (session) fetchSettings();
  }, [session]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('owner_user_id', session?.user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data) setForm(data);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          ...form,
          owner_user_id: session.user.id,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      showSuccess('General settings saved');
    } catch (error: any) {
      showError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const generateNewToken = async () => {
    if (!confirm('This will invalidate any existing links you have shared. Continue?')) return;
    const newToken = crypto.randomUUID();
    setForm(prev => ({ ...prev, accountant_share_token: newToken }));
    // Save immediately
    const { error } = await supabase
      .from('settings')
      .update({ accountant_share_token: newToken })
      .eq('owner_user_id', session?.user.id);
    
    if (error) showError(error.message);
    else showSuccess('New access link generated');
  };

  const copyLink = () => {
    const url = `${window.location.origin}/portal/${form.accountant_share_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showSuccess('Link copied to clipboard');
  };

  if (loading) return null;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your business profile and application preferences.</p>
      </header>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="general" className="rounded-lg gap-2 py-2 px-4">
            <Building2 className="w-4 h-4" /> General
          </TabsTrigger>
          <TabsTrigger value="accountant" className="rounded-lg gap-2 py-2 px-4">
            <Calculator className="w-4 h-4" /> Accountant
          </TabsTrigger>
          <TabsTrigger value="share" className="rounded-lg gap-2 py-2 px-4">
            <Share2 className="w-4 h-4" /> Share Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 gap-8">
            {/* Company Profile */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <CardTitle>Company Profile</CardTitle>
                </div>
                <CardDescription>This information will appear on your invoices and reports.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input 
                      value={form.company_name} 
                      onChange={(e) => setForm(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="e.g. Acme Solutions Ltd"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax ID / ABN</Label>
                    <Input 
                      value={form.company_abn} 
                      onChange={(e) => setForm(prev => ({ ...prev, company_abn: e.target.value }))}
                      placeholder="e.g. 12 345 678 910"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        value={form.company_email} 
                        onChange={(e) => setForm(prev => ({ ...prev, company_email: e.target.value }))}
                        placeholder="billing@acme.com"
                        className="pl-10 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Business Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        value={form.company_phone} 
                        onChange={(e) => setForm(prev => ({ ...prev, company_phone: e.target.value }))}
                        placeholder="+1 234 567 890"
                        className="pl-10 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2 px-6">
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  <CardTitle>Appearance</CardTitle>
                </div>
                <CardDescription>Customize how the application looks for you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Application Name</Label>
                    <Input 
                      value={form.application_name} 
                      onChange={(e) => setForm(prev => ({ ...prev, application_name: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Brand Color</Label>
                    <div className="flex gap-3">
                      <Input 
                        type="color" 
                        value={form.primary_brand_color} 
                        onChange={(e) => setForm(prev => ({ ...prev, primary_brand_color: e.target.value }))}
                        className="w-12 h-10 p-1 rounded-lg cursor-pointer"
                      />
                      <Input 
                        value={form.primary_brand_color} 
                        onChange={(e) => setForm(prev => ({ ...prev, primary_brand_color: e.target.value }))}
                        className="rounded-xl font-mono"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2 px-6">
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Appearance'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accountant" className="animate-fade-in">
          <AccountantSettings />
        </TabsContent>

        <TabsContent value="share" className="animate-fade-in">
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 to-background p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Share with Accountant</CardTitle>
                  <CardDescription>Generate a secure, read-only link for your accountant to access your tax data.</CardDescription>
                </div>
              </div>

              <div className="space-y-6 mt-8">
                <div className="p-6 rounded-2xl bg-background border-2 border-dashed border-primary/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Secret Access Link</Label>
                    {form.accountant_share_token && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                    )}
                  </div>
                  
                  {form.accountant_share_token ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 bg-muted p-3 rounded-xl font-mono text-xs break-all border">
                        {window.location.origin}/portal/{form.accountant_share_token}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={copyLink} className="rounded-xl gap-2 shrink-0">
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copied' : 'Copy Link'}
                        </Button>
                        <Button variant="outline" asChild className="rounded-xl shrink-0">
                          <Link to={`/portal/${form.accountant_share_token}`}>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-4">No access link generated yet.</p>
                      <Button onClick={generateNewToken} className="rounded-xl gap-2">
                        <RefreshCw className="w-4 h-4" /> Generate Access Link
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 text-sm">
                    <p className="font-bold flex items-center gap-2 mb-1">
                      <Check className="w-4 h-4" /> Read-Only Access
                    </p>
                    <p className="opacity-80">Your accountant can view and print reports but cannot edit or delete any data.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-sm">
                    <p className="font-bold flex items-center gap-2 mb-1">
                      <RefreshCw className="w-4 h-4" /> Revoke Anytime
                    </p>
                    <p className="opacity-80">Click "Regenerate" to immediately invalidate the old link and create a new one.</p>
                  </div>
                </div>

                {form.accountant_share_token && (
                  <div className="flex justify-center pt-4">
                    <Button variant="ghost" onClick={generateNewToken} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl gap-2">
                      <RefreshCw className="w-4 h-4" /> Regenerate Secret Link
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;