'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Zap, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/lib/api';

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  orgName: z.string().min(1, 'Organization name required'),
  agreeToTerms: z.boolean().refine(v => v, 'You must agree to the terms'),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const password = watch('password', '');
  const passwordStrength = password.length >= 12 ? 'strong' : password.length >= 8 ? 'medium' : 'weak';

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    try {
      const result = await authApi.signup(data) as any;
      setAuth({
        user: result.user,
        org: result.org,
        token: result.token,
        refreshToken: result.refreshToken,
      });
      toast.success('Account created! Welcome to WinkX AI 🎉');
      router.push('/onboarding');
    } catch (err: any) {
      toast.error(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    '14-day free trial — no credit card required',
    'Connect WhatsApp, Instagram & Facebook',
    'AI-powered flow builder',
    '100+ workflow templates',
    'Unlimited contacts',
  ];

  return (
    <div className="min-h-screen bg-gradient-dark flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center w-5/12 p-12 border-r border-white/5 bg-gradient-to-br from-primary-600/10 to-transparent">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl">WinkX AI</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h2 className="text-3xl font-bold text-white mb-4">Start automating in minutes</h2>
          <p className="text-white/50 mb-10">Join 50,000+ businesses growing with WinkX AI.</p>

          <div className="space-y-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-white/70 text-sm">{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md py-8"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg">WinkX AI</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-white/50 mb-8">Start your 14-day free trial today</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">First Name</label>
                <input
                  {...register('firstName')}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 transition-all"
                  placeholder="John"
                />
                {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Last Name</label>
                <input
                  {...register('lastName')}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 transition-all"
                  placeholder="Doe"
                />
                {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 transition-all"
                placeholder="you@company.com"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Organization Name</label>
              <input
                {...register('orgName')}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 transition-all"
                placeholder="Acme Corp"
              />
              {errors.orgName && <p className="text-red-400 text-xs mt-1">{errors.orgName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 transition-all pr-12"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2 flex gap-1">
                  {['weak', 'medium', 'strong'].map(level => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordStrength === 'strong' ? 'bg-emerald-500'
                          : passwordStrength === 'medium' && level !== 'strong' ? 'bg-amber-500'
                          : passwordStrength === 'weak' && level === 'weak' ? 'bg-red-500'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              )}
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input {...register('agreeToTerms')} type="checkbox" className="mt-0.5 rounded" />
              <span className="text-sm text-white/50">
                I agree to the{' '}
                <a href="/terms" className="text-primary-400 hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-primary-400 hover:underline">Privacy Policy</a>
              </span>
            </label>
            {errors.agreeToTerms && <p className="text-red-400 text-xs">{errors.agreeToTerms.message}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-primary text-white font-semibold hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2 shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create Account
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
