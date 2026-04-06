import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { Reservation, OperationType } from '../types';
import { motion } from 'motion/react';
import { Calendar, Clock, Users, Mail, Phone, User as UserIcon, Send, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, addDays } from 'date-fns';

interface ReservationFormProps {
  user: User;
  onComplete: () => void;
}

const TIME_SLOTS = [
  '10:00', '10:30', '11:00', '11:30', '12:00'
];

export default function ReservationForm({ user, onComplete }: ReservationFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    time: '10:00',
    guests: 2,
    name: user.displayName || '',
    email: user.email || '',
    phone: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const reservationData: Reservation = {
        ...formData,
        status: 'pending',
        userId: user.uid,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'reservations'), reservationData);
      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      console.error("Reservation error:", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, 'reservations');
      } catch (handledErr: any) {
        const info = JSON.parse(handledErr.message);
        setError(info.userMessage || "Reservierung fehlgeschlagen.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-12 rounded-3xl border border-brand-100 shadow-xl text-center"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-brand-950 mb-2 uppercase">Reservierung erfolgreich!</h3>
        <p className="text-brand-900/60">Wir freuen uns auf Deinen Besuch im NATIONALPARK CAFÉ WISTLBERG.</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-3xl border border-brand-100 shadow-xl">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Date */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brand-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-600" /> Datum
          </label>
          <input 
            type="date" 
            required
            min={format(new Date(), 'yyyy-MM-dd')}
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-brand-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Time */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brand-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" /> Uhrzeit
          </label>
          <select 
            required
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-brand-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all appearance-none bg-white"
          >
            {TIME_SLOTS.map(slot => (
              <option key={slot} value={slot}>{slot} Uhr</option>
            ))}
          </select>
        </div>

        {/* Guests */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brand-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-600" /> Personen
          </label>
          <input 
            type="number" 
            required
            min="1"
            max="20"
            value={formData.guests}
            onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) })}
            className="w-full px-4 py-3 rounded-xl border border-brand-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brand-900 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-brand-600" /> Name
          </label>
          <input 
            type="text" 
            required
            placeholder="Dein vollständiger Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-brand-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brand-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-brand-600" /> Email
          </label>
          <input 
            type="email" 
            required
            placeholder="Deine@email.de"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-brand-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brand-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-brand-600" /> Telefon (optional)
          </label>
          <input 
            type="tel" 
            placeholder="+49 123 456789"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-brand-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-brand-900">Besondere Wünsche oder Allergien</label>
        <textarea 
          rows={3}
          placeholder="z.B. Hochstuhl benötigt, veganes Frühstück..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-brand-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all resize-none"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <Clock className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <button 
        type="submit"
        disabled={loading}
        className={cn(
          "w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg",
          loading ? "bg-brand-300 cursor-not-allowed" : "bg-brand-600 text-white hover:bg-brand-700 hover:shadow-xl"
        )}
      >
        {loading ? (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Clock className="w-5 h-5" />
          </motion.div>
        ) : (
          <>
            <Send className="w-5 h-5" /> Reservierung absenden
          </>
        )}
      </button>
      
      <p className="text-xs text-center text-brand-900/40">
        Mit dem Absenden erklärst Du dich mit unserer Datenschutzerklärung einverstanden.
      </p>
    </form>
  );
}
