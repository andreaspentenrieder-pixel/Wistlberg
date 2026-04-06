import { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { Reservation, OperationType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Users, Clock, TrendingUp, Filter, Search, Download, Bell, BellRing } from 'lucide-react';
import { isToday } from 'date-fns';
import ReservationList from './ReservationList';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    pending: 0,
    guestsToday: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [pendingOnly, setPendingOnly] = useState(true);
  const [newNotification, setNewNotification] = useState(false);
  const lastReservationCount = useRef<number | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'reservations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resData = snapshot.docs.map(doc => doc.data() as Reservation);
      
      const today = resData.filter(r => isToday(new Date(r.date)));
      
      setStats({
        total: resData.length,
        today: today.length,
        pending: resData.filter(r => r.status === 'pending').length,
        guestsToday: today.reduce((sum, r) => sum + r.guests, 0)
      });

      // Notification logic
      if (lastReservationCount.current !== null && resData.length > lastReservationCount.current) {
        const latest = resData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (latest && latest.status === 'pending') {
          setNewNotification(true);
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch (e) {}
        }
      }
      lastReservationCount.current = resData.length;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reservations');
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-brand-950">Admin Dashboard</h2>
          <p className="text-brand-900/60">Verwalten Sie alle Frühstücksreservierungen und Statistiken.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <button 
              onClick={() => setNewNotification(false)}
              className={`p-3 rounded-2xl border transition-all relative ${
                newNotification 
                  ? "bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-200" 
                  : "bg-white border-brand-100 text-brand-600 hover:bg-brand-50"
              }`}
            >
              {newNotification ? <BellRing className="w-5 h-5 animate-bounce" /> : <Bell className="w-5 h-5" />}
              {stats.pending > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {stats.pending}
                </span>
              )}
            </button>
            
            <AnimatePresence>
              {newNotification && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-brand-100 p-4 z-50"
                >
                  <p className="text-sm font-bold text-brand-950 mb-1">Neue Reservierung!</p>
                  <p className="text-xs text-brand-900/60">Eine neue Buchungsanfrage ist eingegangen.</p>
                  <button 
                    onClick={() => {
                      setPendingOnly(true);
                      setNewNotification(false);
                    }}
                    className="mt-3 w-full py-2 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg hover:bg-brand-100 transition-all"
                  >
                    Anzeigen
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-100 rounded-xl text-sm font-medium hover:bg-brand-50 transition-all">
            <Download className="w-4 h-4" /> Exportieren
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl border border-brand-100 shadow-sm"
        >
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
            <Calendar className="w-5 h-5 text-brand-600" />
          </div>
          <div className="text-2xl font-bold text-brand-950">{stats.today}</div>
          <div className="text-xs text-brand-900/60 font-medium uppercase tracking-wider">Buchungen heute</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl border border-brand-100 shadow-sm"
        >
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-4">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-brand-950">{stats.guestsToday}</div>
          <div className="text-xs text-brand-900/60 font-medium uppercase tracking-wider">Gäste heute</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl border border-brand-100 shadow-sm"
        >
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-brand-950">{stats.pending}</div>
          <div className="text-xs text-brand-900/60 font-medium uppercase tracking-wider">Offene Anfragen</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-3xl border border-brand-100 shadow-sm"
        >
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-brand-950">{stats.total}</div>
          <div className="text-xs text-brand-900/60 font-medium uppercase tracking-wider">Gesamtbuchungen</div>
        </motion.div>
      </div>

      {/* Filters & List */}
      <div className="bg-white rounded-3xl border border-brand-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-brand-50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <h3 className="text-xl font-bold text-brand-950">Alle Reservierungen</h3>
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
              <input 
                type="text" 
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-brand-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-brand-500 outline-none w-full"
              />
            </div>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-10 pr-4 py-2 bg-brand-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            <button 
              onClick={() => setPendingOnly(!pendingOnly)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                pendingOnly 
                  ? "bg-brand-600 text-white" 
                  : "bg-brand-50 text-brand-900 hover:bg-brand-100"
              }`}
            >
              <Filter className="w-4 h-4" />
              {pendingOnly ? "Nur Offen" : "Alle"}
            </button>
          </div>
        </div>
        <div className="p-6">
          <ReservationList 
            isAdmin={true} 
            searchTerm={searchTerm}
            filterDate={filterDate}
            pendingOnly={pendingOnly}
          />
        </div>
      </div>
    </div>
  );
}
