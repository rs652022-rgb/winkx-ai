'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Settings, User, Building2, Users, Bell, Shield, Palette,
  Globe, Loader2, Save, Plus, Trash2, Mail, Crown, LogOut, Key,
} from 'lucide-react';
import { authApi, orgsApi } from '@/lib/api';
import { cn, getInitials } from '@/lib/utils';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'org', label: 'Organization', icon: Building2 },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const { user, org, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });
  const [orgForm, setOrgForm] = useState({
    name: org?.name || '',
    website: '',
    timezone: 'UTC',
    currency: 'USD',
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');

  const { data: membersData } = useQuery({
    queryKey: ['org-members', org?.id],
    queryFn: () => orgsApi.members(org!.id) as any,
    enabled: !!org?.id && tab === 'team',
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => authApi.updateProfile(data),
    onSuccess: () => toast.success('Profile updated'),
    onError: (e: any) => toast.error(e.message || 'Update failed'),
  });

  const updateOrgMutation = useMutation({
    mutationFn: (data: any) => orgsApi.update(org!.id, data),
    onSuccess: () => toast.success('Organization updated'),
    onError: (e: any) => toast.error(e.message || 'Update failed'),
  });

  const inviteMutation = useMutation({
    mutationFn: (data: any) => orgsApi.invite(org!.id, data),
    onSuccess: () => {
      toast.success('Invite sent!');
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['org-members', org?.id] });
    },
    onError: (e: any) => toast.error(e.message || 'Invite failed'),
  });

  const members = membersData?.members || [];

  return (
    <div className="p-6 flex gap-6 h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-48 shrink-0">
        <h1 className="text-xl font-bold text-foreground mb-6">Settings</h1>
        <nav className="space-y-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left', tab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}>
              <t.icon className="w-4 h-4 shrink-0" />
              {t.label}
            </button>
          ))}
          <button onClick={() => { logout(); window.location.href = '/login'; }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all text-left mt-4">
            <LogOut className="w-4 h-4 shrink-0" />Sign Out
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* PROFILE */}
        {tab === 'profile' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Profile Settings</h2>

            <div className="card-premium p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-white text-xl font-bold shadow-glow">
                  {getInitials(user?.firstName || '', user?.lastName)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{user?.firstName} {user?.lastName}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  {user?.isSuperAdmin && <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full mt-1 inline-block">Super Admin</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-2">First Name</label>
                  <input value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-2">Last Name</label>
                  <input value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-xs font-medium text-foreground mb-2">Email</label>
                <input value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} type="email" className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
              </div>
              <button onClick={() => updateProfileMutation.mutate(profileForm)} disabled={updateProfileMutation.isPending} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50">
                {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save Changes
              </button>
            </div>
          </motion.div>
        )}

        {/* ORG */}
        {tab === 'org' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Organization Settings</h2>
            <div className="card-premium p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold">
                  {org?.name?.charAt(0) || 'O'}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{org?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{org?.plan?.toLowerCase() || 'Starter'} plan</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-2">Organization Name</label>
                  <input value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-2">Website</label>
                  <input value={orgForm.website} onChange={e => setOrgForm({ ...orgForm, website: e.target.value })} placeholder="https://example.com" className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-2">Timezone</label>
                    <select value={orgForm.timezone} onChange={e => setOrgForm({ ...orgForm, timezone: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none">
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern (ET)</option>
                      <option value="America/Los_Angeles">Pacific (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="Asia/Dubai">Dubai (GST)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-2">Currency</label>
                    <select value={orgForm.currency} onChange={e => setOrgForm({ ...orgForm, currency: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none">
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="INR">INR</option>
                      <option value="AED">AED</option>
                    </select>
                  </div>
                </div>
              </div>
              <button onClick={() => updateOrgMutation.mutate(orgForm)} disabled={updateOrgMutation.isPending} className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50">
                {updateOrgMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save Changes
              </button>
            </div>
          </motion.div>
        )}

        {/* TEAM */}
        {tab === 'team' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Team Members</h2>

            {/* Invite form */}
            <div className="card-premium p-6">
              <h3 className="font-medium text-foreground mb-4">Invite Team Member</h3>
              <div className="flex gap-3">
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" type="email" className="flex-1 px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none">
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                  <option value="AGENT">Agent</option>
                </select>
                <button onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })} disabled={!inviteEmail.trim() || inviteMutation.isPending} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50">
                  {inviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Invite
                </button>
              </div>
            </div>

            {/* Members list */}
            <div className="card-premium overflow-hidden">
              <div className="p-4 border-b border-border">
                <p className="text-sm font-medium text-foreground">{members.length} members</p>
              </div>
              {members.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No team members yet</div>
              ) : members.map((m: any) => (
                <div key={m.id} className="flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-all">
                  <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">
                    {getInitials(m.user?.firstName || '?', m.user?.lastName)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{m.user?.firstName} {m.user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                  </div>
                  <span className="text-xs capitalize bg-muted/50 text-muted-foreground px-2.5 py-1 rounded-full border border-border">{m.role?.toLowerCase()}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* SECURITY */}
        {tab === 'security' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Security Settings</h2>
            <div className="card-premium p-6 space-y-4">
              <div>
                <p className="font-medium text-foreground mb-1">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground mb-4">Add an extra layer of security to your account</p>
                {user?.twoFactorEnabled ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm"><Shield className="w-4 h-4" />2FA is enabled</div>
                ) : (
                  <button onClick={() => authApi.setup2FA().then(() => toast.info('Follow instructions to set up 2FA'))} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-medium transition-all">
                    <Shield className="w-4 h-4" />Enable 2FA
                  </button>
                )}
              </div>
              <div className="border-t border-border pt-4">
                <p className="font-medium text-foreground mb-1">Change Password</p>
                <p className="text-xs text-muted-foreground mb-4">Use a strong, unique password for your account</p>
                <button onClick={() => { authApi.forgotPassword(user?.email || ''); toast.success('Password reset email sent'); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-medium transition-all">
                  <Key className="w-4 h-4" />Send Reset Email
                </button>
              </div>
              <div className="border-t border-border pt-4">
                <p className="font-medium text-destructive mb-1">Danger Zone</p>
                <p className="text-xs text-muted-foreground mb-4">Permanently delete your account and all data</p>
                <button className="px-4 py-2.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-sm font-medium transition-all">
                  Delete Account
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* NOTIFICATIONS */}
        {tab === 'notifications' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>
            <div className="card-premium p-6 space-y-4">
              {[
                { label: 'New conversation assigned', desc: 'Get notified when a conversation is assigned to you' },
                { label: 'New incoming message', desc: 'Get notified when a new message arrives' },
                { label: 'Campaign completed', desc: 'Get notified when a campaign finishes running' },
                { label: 'Lead qualified', desc: 'Get notified when a lead is marked qualified' },
                { label: 'Flow trigger errors', desc: 'Get notified when automation flows encounter errors' },
                { label: 'Weekly report', desc: 'Receive a weekly summary of your metrics' },
              ].map((notif, i) => (
                <div key={notif.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{notif.label}</p>
                    <p className="text-xs text-muted-foreground">{notif.desc}</p>
                  </div>
                  <button className="relative w-10 h-5 rounded-full bg-primary" onClick={e => { const t = e.currentTarget; t.classList.toggle('bg-primary'); t.classList.toggle('bg-muted'); const dot = t.querySelector('div')!; dot.classList.toggle('left-5'); dot.classList.toggle('left-0.5'); }}>
                    <div className="absolute top-0.5 left-5 w-4 h-4 rounded-full bg-white shadow-sm transition-all" />
                  </button>
                </div>
              ))}
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all mt-2">
                <Save className="w-4 h-4" />Save Preferences
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
