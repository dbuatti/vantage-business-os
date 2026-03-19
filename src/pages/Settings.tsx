"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Palette, 
  Bell, 
  Shield, 
  Save,
  Globe,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

const Settings = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    company_email: '',
    company_phone: '',
    company_website: '',
    company_abn: '',
    application_name: 'Invoicify',
    primary_brand_color: '#6366f1'
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
      showSuccess('Settings saved successfully');
    } catch (error: any) {
      showError(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your company profile and application preferences.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2 px-6">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

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
              <div className="space-y-2 md:col-span-2">
                <Label>Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    value={form.company_website} 
                    onChange={(e) => setForm(prev => ({ ...prev, company_website: e.target.value }))}
                    placeholder="https://acme.com"
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;