'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Calendar, Plus, Clock, Check, X, Video, MapPin, User,
  ChevronLeft, ChevronRight, Filter, Loader2, Bell, RefreshCw,
} from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';
import { api } from '@/lib/api';

const appointmentsApi = {
  list: (params?: any) => api.get(`/api/appointments?${new URLSearchParams(params || {}).toString()}`),
  create: (data: any) => api.post('/api/appointments', data),
  update: (id: string, data: any) => api.patch(`/api/appointments/${id}`, data),
  cancel: (id: string) => api.patch(`/api/appointments/${id}`, { status: 'CANCELLED' }),
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  CONFIRMED: { label: 'Confirmed', color: 'status-connected' },
  CANCELLED: { label: 'Cancelled', color: 'status-disconnected' },
  COMPLETED: { label: 'Completed', color: 'bg-violet-500/10 text-violet-400 border border-violet-500/20' },
  RESCHEDULED: { label: 'Rescheduled', color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  NO_SHOW: { label: 'No Show', color: 'bg-red-500/10 text-red-400 border border-red-500/20' },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [today] = useState(new Date());
  const [calDate, setCalDate] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', filter],
    queryFn: () => appointmentsApi.list({ status: filter !== 'all' ? filter : undefined, limit: 50 }) as any,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.cancel(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['appointments'] }); toast.success('Appointment cancelled'); },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.update(id, { status: 'CONFIRMED' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['appointments'] }); toast.success('Appointment confirmed'); },
  });

  const appointments = data?.appointments || [];

  // Calendar helpers
  const daysInMonth = getDaysInMonth(calDate.year, calDate.month);
  const firstDayOfMonth = new Date(calDate.year, calDate.month, 1).getDay();
  const apptsByDay: Record<number, any[]> = {};
  appointments.forEach((a: any) => {
    const d = new Date(a.startTime);
    if (d.getFullYear() === calDate.year && d.getMonth() === calDate.month) {
      const day = d.getDate();
      if (!apptsByDay[day]) apptsByDay[day] = [];
      apptsByDay[day].push(a);
    }
  });

  const prevMonth = () => setCalDate(d => d.month === 0 ? { year: d.year - 1, month: 11 } : { ...d, month: d.month - 1 });
  const nextMonth = () => setCalDate(d => d.month === 11 ? { year: d.year + 1, month: 0 } : { ...d, month: d.month + 1 });

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const upcomingCount = appointments.filter((a: any) => new Date(a.startTime) > today && a.status === 'CONFIRMED').length;
  const pendingCount = appointments.filter((a: any) => a.status === 'PENDING').length;
  const todayCount = appointments.filter((a: any) => {
    const d = new Date(a.startTime);
    return d.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground text-sm mt-1">Schedule and manage client appointments</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border">
            <button onClick={() => setViewMode('list')} className={cn('p-2 rounded-lg transition-all', viewMode === 'list' ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <Filter className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('calendar')} className={cn('p-2 rounded-lg transition-all', viewMode === 'calendar' ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <Calendar className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-glow">
            <Plus className="w-4 h-4" />Book Appointment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Today's Appointments", value: todayCount, icon: Calendar, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Confirmed Upcoming', value: upcomingCount, icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Pending Confirmation', value: pendingCount, icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="metric-card">
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}><stat.icon className={`w-4 h-4 ${stat.color}`} /></div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border w-fit">
        {['all', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', filter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label}
          </button>
        ))}
      </div>

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-20 card-premium">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No appointments</h3>
            <p className="text-sm text-muted-foreground mb-6">Book your first appointment to get started</p>
            <button onClick={() => setShowModal(true)} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
              Book Appointment
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt: any, i: number) => {
              const start = new Date(appt.startTime);
              const end = new Date(appt.endTime);
              const statusCfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.PENDING;
              return (
                <motion.div key={appt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card-premium p-4 flex items-center gap-4">
                  {/* Date block */}
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs text-primary font-medium">{start.toLocaleDateString('en', { month: 'short' })}</span>
                    <span className="text-2xl font-black text-foreground leading-tight">{start.getDate()}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{appt.title}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{start.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span>
                      {appt.contact && <span className="flex items-center gap-1"><User className="w-3 h-3" />{appt.contact.firstName} {appt.contact.lastName}</span>}
                      {appt.meetingLink && <span className="flex items-center gap-1"><Video className="w-3 h-3" />Virtual</span>}
                    </div>
                  </div>

                  <span className={cn('text-xs px-2.5 py-1.5 rounded-full font-medium shrink-0', statusCfg.color)}>{statusCfg.label}</span>

                  <div className="flex items-center gap-1 shrink-0">
                    {appt.status === 'PENDING' && (
                      <button onClick={() => confirmMutation.mutate(appt.id)} className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Confirm">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {['PENDING', 'CONFIRMED'].includes(appt.status) && (
                      <button onClick={() => cancelMutation.mutate(appt.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all" title="Cancel">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {appt.meetingLink && (
                      <a href={appt.meetingLink} target="_blank" className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-all" title="Join Meeting">
                        <Video className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-muted transition-all"><ChevronLeft className="w-4 h-4" /></button>
            <h3 className="font-semibold text-foreground">{MONTH_NAMES[calDate.month]} {calDate.year}</h3>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-muted transition-all"><ChevronRight className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayAppts = apptsByDay[day] || [];
              const isToday = today.getFullYear() === calDate.year && today.getMonth() === calDate.month && today.getDate() === day;
              return (
                <div key={day} className={cn('min-h-[64px] p-1.5 rounded-xl border transition-all', isToday ? 'border-primary/50 bg-primary/5' : 'border-border/50 hover:bg-muted/30')}>
                  <p className={cn('text-xs font-medium mb-1', isToday ? 'text-primary' : 'text-foreground')}>{day}</p>
                  <div className="space-y-0.5">
                    {dayAppts.slice(0, 2).map((a: any) => (
                      <div key={a.id} className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary truncate">{a.title}</div>
                    ))}
                    {dayAppts.length > 2 && <div className="text-xs text-muted-foreground px-1">+{dayAppts.length - 2} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Book modal */}
      {showModal && <BookAppointmentModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); queryClient.invalidateQueries({ queryKey: ['appointments'] }); toast.success('Appointment booked!'); }} />}
    </div>
  );
}

function BookAppointmentModal({ onClose, onCreated }: any) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    timezone: 'UTC',
    meetingLink: '',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleBook = async () => {
    if (!form.title.trim() || !form.startTime || !form.endTime) return toast.error('Title and time required');
    setIsLoading(true);
    try {
      await appointmentsApi.create(form);
      onCreated();
    } catch (e: any) {
      toast.error(e.message || 'Booking failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Book Appointment</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Title *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Discovery Call with Client" className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Start Time *</label>
              <input type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">End Time *</label>
              <input type="datetime-local" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Meeting Link (optional)</label>
            <input value={form.meetingLink} onChange={e => setForm({ ...form, meetingLink: e.target.value })} placeholder="https://meet.google.com/..." className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Any additional details..." className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all resize-none" />
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm">Cancel</button>
          <button onClick={handleBook} disabled={isLoading} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}Book Appointment
          </button>
        </div>
      </motion.div>
    </div>
  );
}
