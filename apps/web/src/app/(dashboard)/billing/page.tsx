'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  CreditCard, Check, Zap, ArrowRight, Loader2, Crown, Shield,
  TrendingUp, Users, MessageSquare, Bot, BarChart3, ExternalLink,
} from 'lucide-react';
import { billingApi } from '@/lib/api';
import { formatNumber, formatCurrency, cn } from '@/lib/utils';

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [loading, setLoading] = useState<string | null>(null);

  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => billingApi.plans() as any,
  });

  const { data: subData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => billingApi.subscription() as any,
  });

  const { data: usageData } = useQuery({
    queryKey: ['usage'],
    queryFn: () => billingApi.usage() as any,
  });

  const plans = plansData?.plans || DEFAULT_PLANS;
  const subscription = subData?.subscription;
  const usage = usageData?.usage || {};

  const handleCheckout = async (planId: string) => {
    setLoading(planId);
    try {
      const result = await billingApi.checkout({ planId, interval }) as any;
      if (result.url) window.location.href = result.url;
    } catch (e: any) {
      toast.error(e.message || 'Failed to start checkout');
    } finally {
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    setLoading('portal');
    try {
      const result = await billingApi.portal() as any;
      if (result.url) window.location.href = result.url;
    } catch (e: any) {
      toast.error(e.message || 'Failed to open billing portal');
    } finally {
      setLoading(null);
    }
  };

  const USAGE_METRICS = [
    { key: 'messages_sent', label: 'Messages Sent', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { key: 'contacts', label: 'Contacts', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { key: 'flows_active', label: 'Active Flows', icon: Zap, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { key: 'ai_messages', label: 'AI Messages', icon: Bot, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing & Subscription</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your plan and payment details</p>
        </div>
        {subscription && (
          <button onClick={handlePortal} disabled={loading === 'portal'} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-medium transition-all">
            {loading === 'portal' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Manage Billing
          </button>
        )}
      </div>

      {/* Current Plan */}
      {subscription && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-premium p-6 border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow"><Crown className="w-6 h-6 text-white" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Current Plan</p>
                <p className="text-xl font-bold text-foreground">{subscription.plan?.name || 'Active Plan'}</p>
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Active until {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
              </div>
            </div>
            {subscription.cancelAtPeriodEnd && (
              <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                Cancels at period end
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Usage */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">This Month's Usage</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {USAGE_METRICS.map((metric, i) => (
            <motion.div key={metric.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="metric-card">
              <div className={`w-9 h-9 rounded-lg ${metric.bg} flex items-center justify-center`}><metric.icon className={`w-4 h-4 ${metric.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{formatNumber(usage[metric.key] || 0)}</p>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Available Plans</h2>
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border">
            {(['month', 'year'] as const).map(i => (
              <button key={i} onClick={() => setInterval(i)} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', interval === i ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>
                {i === 'month' ? 'Monthly' : 'Annual'}{i === 'year' && <span className="ml-1 text-xs text-emerald-400">-20%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan: any, i: number) => {
            const isCurrentPlan = subscription?.plan?.id === plan.id || subscription?.plan?.slug === plan.slug;
            const price = interval === 'year' ? (plan.priceMonthly * 12 * 0.8) : plan.priceMonthly;
            return (
              <motion.div key={plan.id || plan.slug} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={cn('card-premium p-6 relative', plan.isPopular ? 'border-primary/50 shadow-glow' : '')}>
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-primary text-white text-xs font-bold rounded-full shadow-glow">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-foreground">{formatCurrency(price / (interval === 'year' ? 12 : 1), 'USD').replace('.00', '')}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                  {interval === 'year' && <p className="text-xs text-emerald-400 mt-1">Billed {formatCurrency(price)} annually</p>}
                </div>

                <div className="space-y-3 mb-6">
                  {(plan.features || []).map((feature: string) => (
                    <div key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-foreground/80">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => isCurrentPlan ? handlePortal() : handleCheckout(plan.id || plan.slug)}
                  disabled={loading === (plan.id || plan.slug)}
                  className={cn('w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2', isCurrentPlan
                    ? 'bg-muted text-muted-foreground cursor-default'
                    : plan.isPopular
                      ? 'bg-gradient-primary text-white hover:opacity-90 shadow-glow'
                      : 'border border-border text-foreground hover:bg-muted'
                  )}
                >
                  {loading === (plan.id || plan.slug) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isCurrentPlan ? 'Current Plan' : plan.priceMonthly === 0 ? 'Get Started Free' : 'Upgrade'}
                  {!isCurrentPlan && <ArrowRight className="w-4 h-4" />}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const DEFAULT_PLANS = [
  {
    slug: 'starter', name: 'Starter', description: 'Perfect for small businesses',
    priceMonthly: 29, isPopular: false,
    features: ['3 Channels', '1,000 conversations/mo', '5 Automation Flows', 'Basic Analytics', 'Email Support'],
  },
  {
    slug: 'growth', name: 'Growth', description: 'For growing businesses', isPopular: true,
    priceMonthly: 79,
    features: ['10 Channels', 'Unlimited conversations', '50 Automation Flows', 'AI Agent (5K msg/mo)', 'Advanced Analytics', 'CRM & Campaigns', 'Priority Support'],
  },
  {
    slug: 'enterprise', name: 'Enterprise', description: 'For large organizations',
    priceMonthly: 199, isPopular: false,
    features: ['Unlimited Channels', 'Unlimited everything', 'AI Agents (unlimited)', 'White-label option', 'Custom Integrations', 'Dedicated Success Manager', 'SLA & SSO'],
  },
];
