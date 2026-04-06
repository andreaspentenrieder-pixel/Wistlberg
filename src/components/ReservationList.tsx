import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { Reservation, OperationType, ReservationStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, Users, Trash2, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, MapPin, Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ReservationListProps {
  userId?: string;
  isAdmin: boolean;
  searchTerm?: string;
  filterDate?: string;
  pendingOnly?: boolean;
}

export default function ReservationList({ userId, isAdmin, searchTerm = '', filterDate = '', pendingOnly = false }: ReservationListProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let q;
    if (isAdmin) {
      q = query(collection(db, 'reservations'), orderBy('date', 'desc'), orderBy('time', 'desc'));
    } else if (userId) {
      q = query(collection(db, 'reservations'), where('userId', '==', userId), orderBy('date', 'desc'));
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
      setReservations(resData);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Snapshot error:", err);
      try {
        handleFirestoreError(err, OperationType.LIST, 'reservations');
      } catch (handledErr: any) {
        const info = JSON.parse(handledErr.message);
        setError(info.userMessage || "Fehler beim Laden der Reservierungen.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, isAdmin]);

  const filteredReservations = reservations.filter(res => {
    const matchesSearch = 
      res.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      res.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = filterDate ? res.date === filterDate : true;
    const matchesPending = pendingOnly ? res.status === 'pending' : true;

    return matchesSearch && matchesDate && matchesPending;
  });

  const sendEmail = (res: Reservation, type: 'confirm' | 'cancel') => {
    const subject = type === 'confirm' 
      ? `Bestätigung Deiner Reservierung - NATIONALPARK CAFÉ WISTLBERG` 
      : `Stornierung Deiner Reservierung - NATIONALPARK CAFÉ WISTLBERG`;
    
    const dateStr = format(new Date(res.date), 'dd.MM.yyyy');
    const body = type === 'confirm'
      ? `Hallo ${res.name},\n\nwir freuen uns, Deine Reservierung im NATIONALPARK CAFÉ WISTLBERG bestätigen zu können!\n\nDetails:\nDatum: ${dateStr}\nUhrzeit: ${res.time} Uhr\nPersonen: ${res.guests}\n\nWir freuen uns auf Deinen Besuch!\n\nHerzliche Grüße,\nDein Team vom NATIONALPARK CAFÉ WISTLBERG`
      : `Hallo ${res.name},\n\nleider müssen wir Deine Reservierung im NATIONALPARK CAFÉ WISTLBERG für den ${dateStr} um ${res.time} Uhr stornieren.\n\nFür Rückfragen stehen wir Dir gerne zur Verfügung.\n\nHerzliche Grüße,\nDein Team vom NATIONALPARK CAFÉ WISTLBERG`;

    const mailtoUrl = `mailto:${res.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const updateStatus = async (id: string, status: ReservationStatus) => {
    setError(null);
    try {
      await updateDoc(doc(db, 'reservations', id), { status });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `reservations/${id}`);
      } catch (handledErr: any) {
        const info = JSON.parse(handledErr.message);
        setError(info.userMessage || "Status konnte nicht aktualisiert werden.");
      }
    }
  };

  const deleteReservation = async (id: string) => {
    if (!window.confirm('Möchten Sie diese Reservierung wirklich löschen?')) return;
    setError(null);
    try {
      await deleteDoc(doc(db, 'reservations', id));
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `reservations/${id}`);
      } catch (handledErr: any) {
        const info = JSON.parse(handledErr.message);
        setError(info.userMessage || "Reservierung konnte nicht gelöscht werden.");
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-brand-100/50 animate-pulse rounded-2xl"></div>
        ))}
      </div>
    );
  }

  if (filteredReservations.length === 0) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-brand-100 text-center">
        <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-brand-300" />
        </div>
        <h3 className="text-xl font-bold text-brand-950 mb-2">Keine Reservierungen gefunden</h3>
        <p className="text-brand-900/60">Es entsprechen keine Buchungen den aktuellen Filtern.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm mb-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      <AnimatePresence>
        {filteredReservations.map((res) => (
          <motion.div 
            key={res.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden transition-all",
              expandedId === res.id ? "shadow-md ring-1 ring-brand-200" : "hover:shadow-md"
            )}
          >
            <div 
              className="p-5 flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedId(expandedId === res.id ? null : res.id)}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex flex-col items-center justify-center text-xs font-bold",
                  res.status === 'confirmed' ? "bg-green-50 text-green-700" : 
                  res.status === 'cancelled' ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-700"
                )}>
                  <span>{format(new Date(res.date), 'dd')}</span>
                  <span className="uppercase">{format(new Date(res.date), 'MMM', { locale: de })}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-brand-950">{res.time} Uhr</h4>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      res.status === 'confirmed' ? "bg-green-100 text-green-700" : 
                      res.status === 'cancelled' ? "bg-red-100 text-red-700" : "bg-brand-100 text-brand-700"
                    )}>
                      {res.status === 'confirmed' ? 'Bestätigt' : 
                       res.status === 'cancelled' ? 'Storniert' : 'Anstehend'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-brand-900/60 mt-1">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {res.guests} Pers.</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Nationalpark Café Wistlberg</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {expandedId === res.id ? <ChevronUp className="w-5 h-5 text-brand-400" /> : <ChevronDown className="w-5 h-5 text-brand-400" />}
              </div>
            </div>

            <AnimatePresence>
              {expandedId === res.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-brand-50 bg-brand-50/30 overflow-hidden"
                >
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-brand-900/40 uppercase tracking-widest mb-1">Kunde</p>
                        <p className="text-sm font-medium text-brand-950">{res.name}</p>
                        <p className="text-xs text-brand-900/60">{res.email}</p>
                        {res.phone && <p className="text-xs text-brand-900/60">{res.phone}</p>}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-brand-900/40 uppercase tracking-widest mb-1">Details</p>
                        <p className="text-xs text-brand-900/60">Gebucht am: {format(new Date(res.createdAt), 'dd.MM.yyyy HH:mm')}</p>
                        <p className="text-xs text-brand-900/60">ID: {res.id?.slice(-8)}</p>
                      </div>
                    </div>

                    {res.notes && (
                      <div className="bg-white p-3 rounded-xl border border-brand-100">
                        <p className="text-[10px] font-bold text-brand-900/40 uppercase tracking-widest mb-1">Anmerkungen</p>
                        <p className="text-xs text-brand-900/70 italic">"{res.notes}"</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      {isAdmin ? (
                        <>
                          {res.status !== 'confirmed' && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => updateStatus(res.id!, 'confirmed')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-all"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Bestätigen
                              </button>
                              <button 
                                onClick={() => sendEmail(res, 'confirm')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-100 text-brand-700 text-xs font-bold rounded-lg hover:bg-brand-200 transition-all"
                                title="Bestätigungs-Mail senden"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {res.status !== 'cancelled' && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => updateStatus(res.id!, 'cancelled')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-all"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Stornieren
                              </button>
                              <button 
                                onClick={() => sendEmail(res, 'cancel')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-100 text-brand-700 text-xs font-bold rounded-lg hover:bg-brand-200 transition-all"
                                title="Stornierungs-Mail senden"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          <button 
                            onClick={() => deleteReservation(res.id!)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-950 text-white text-xs font-bold rounded-lg hover:bg-black transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Löschen
                          </button>
                        </>
                      ) : (
                        res.status === 'pending' && (
                          <button 
                            onClick={() => updateStatus(res.id!, 'cancelled')}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 transition-all"
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> Buchung stornieren
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
