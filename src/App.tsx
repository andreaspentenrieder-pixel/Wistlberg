import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Coffee, Calendar, User as UserIcon, LogOut, Shield, Menu, X, ChevronRight, Clock, Users, AlertCircle } from 'lucide-react';
import { cn } from './lib/utils';

// Components
import ReservationForm from './components/ReservationForm';
import ReservationList from './components/ReservationList';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'reserve' | 'my-reservations' | 'admin' | 'menu'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            // Ensure the owner is always admin
            if (currentUser.email === 'andreas.pentenrieder@gmail.com' && data.role !== 'admin') {
              const updatedProfile = { ...data, role: 'admin' as const };
              await setDoc(doc(db, 'users', currentUser.uid), updatedProfile);
              setProfile(updatedProfile);
            } else {
              setProfile(data);
            }
          } else {
            // Create default profile for new user
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              name: currentUser.displayName || 'Gast',
              email: currentUser.email || '',
              role: currentUser.email === 'andreas.pentenrieder@gmail.com' ? 'admin' : 'customer'
            };
            await setDoc(doc(db, 'users', currentUser.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
          setError("Profil konnte nicht geladen werden. Bitte versuchen Sie es erneut.");
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError("Der Login wurde blockiert. Bitte erlauben Sie Popups oder öffnen Sie die App in einem neuen Tab.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError("Diese Domain ist nicht für den Login autorisiert. Bitte kontaktieren Sie den Administrator.");
      } else {
        setError("Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.");
      }
    }
  };

  const reload = () => window.location.reload();

  const logout = async () => {
    try {
      await signOut(auth);
      setView('home');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Coffee className="w-12 h-12 text-brand-600" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Admin Bar */}
      {profile?.role === 'admin' && (
        <div className="bg-brand-950 text-white py-2 px-4 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest z-[60] relative">
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-brand-400" />
            <span>Admin Modus</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('admin')}
              className={cn(
                "hover:text-brand-400 transition-colors underline underline-offset-4",
                view === 'admin' && "text-brand-400"
              )}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setView('home')}
              className={cn(
                "hover:text-brand-400 transition-colors",
                view === 'home' && "text-brand-400"
              )}
            >
              Vorschau
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-brand-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
                <div className="relative">
                  <img 
                    src="https://www.nationalpark-cafe.com/logo.png" 
                    alt="Logo" 
                    className="h-10 w-auto"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden bg-brand-600 p-2 rounded-lg">
                    <Coffee className="w-6 h-6 text-white" />
                  </div>
                </div>
                <span className="font-display font-bold text-xl tracking-tight hidden sm:block uppercase">Nationalpark Café Wistlberg</span>
              </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => setView('home')} className={cn("text-sm font-medium transition-colors", view === 'home' ? "text-brand-600" : "text-brand-900/60 hover:text-brand-900")}>Startseite</button>
              <button onClick={() => setView('menu')} className={cn("text-sm font-medium transition-colors", view === 'menu' ? "text-brand-600" : "text-brand-900/60 hover:text-brand-900")}>Speisekarte</button>
              {user && (
                <>
                  <button onClick={() => setView('reserve')} className={cn("text-sm font-medium transition-colors", view === 'reserve' ? "text-brand-600" : "text-brand-900/60 hover:text-brand-900")}>Reservieren</button>
                  <button onClick={() => setView('my-reservations')} className={cn("text-sm font-medium transition-colors", view === 'my-reservations' ? "text-brand-600" : "text-brand-900/60 hover:text-brand-900")}>Meine Buchungen</button>
                  {profile?.role === 'admin' && (
                    <button onClick={() => setView('admin')} className={cn("text-sm font-medium transition-colors flex items-center gap-1", view === 'admin' ? "text-brand-600" : "text-brand-900/60 hover:text-brand-900")}>
                      <Shield className="w-4 h-4" /> Admin
                    </button>
                  )}
                </>
              )}
              
              {user ? (
                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-brand-100">
                  <div className="flex items-center gap-2">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-brand-200" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-brand-600" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-brand-900">{user.displayName?.split(' ')[0]}</span>
                  </div>
                  <button onClick={logout} className="p-2 text-brand-900/60 hover:text-brand-600 transition-colors">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={login}
                  className="bg-brand-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-brand-700 transition-all shadow-sm hover:shadow-md"
                >
                  Anmelden
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-brand-900">
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-brand-100 overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-1">
                <button onClick={() => { setView('home'); setMobileMenuOpen(false); }} className="block w-full text-left px-3 py-4 text-base font-medium text-brand-900 border-b border-brand-50">Startseite</button>
                <button onClick={() => { setView('menu'); setMobileMenuOpen(false); }} className="block w-full text-left px-3 py-4 text-base font-medium text-brand-900 border-b border-brand-50">Speisekarte</button>
                {user ? (
                  <>
                    <button onClick={() => { setView('reserve'); setMobileMenuOpen(false); }} className="block w-full text-left px-3 py-4 text-base font-medium text-brand-900 border-b border-brand-50">Reservieren</button>
                    <button onClick={() => { setView('my-reservations'); setMobileMenuOpen(false); }} className="block w-full text-left px-3 py-4 text-base font-medium text-brand-900 border-b border-brand-50">Meine Buchungen</button>
                    {profile?.role === 'admin' && (
                      <button onClick={() => { setView('admin'); setMobileMenuOpen(false); }} className="block w-full text-left px-3 py-4 text-base font-medium text-brand-600 border-b border-brand-50 flex items-center gap-2">
                        <Shield className="w-5 h-5" /> Admin Dashboard
                      </button>
                    )}
                    <button onClick={logout} className="block w-full text-left px-3 py-4 text-base font-medium text-red-600 flex items-center gap-2">
                      <LogOut className="w-5 h-5" /> Abmelden
                    </button>
                  </>
                ) : (
                  <button onClick={login} className="block w-full text-left px-3 py-4 text-base font-medium text-brand-600">Anmelden</button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="flex-grow pt-20">
        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700 shadow-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-grow">
                <p className="text-sm font-medium">{error}</p>
                <button 
                  onClick={reload}
                  className="text-xs font-bold underline mt-1 hover:text-red-800"
                >
                  App neu laden
                </button>
              </div>
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
            >
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-sm font-medium mb-6"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                    </span>
                    Jetzt Frühstück reservieren
                  </motion.div>
                  <h1 className="text-5xl sm:text-6xl font-bold text-brand-950 mb-6 leading-tight">
                    Genieße Dein <span className="text-brand-600">Frühstück</span> mitten im Nationalpark.
                  </h1>
                  <p className="text-lg text-brand-900/70 mb-8 max-w-xl">
                    Das NATIONALPARK CAFÉ WISTLBERG bietet Dir regionale Köstlichkeiten in entspannter Atmosphäre. Starte Deinen Tag perfekt mit unserem reichhaltigen Frühstücksangebot.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => user ? setView('reserve') : login()}
                      className="bg-brand-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-brand-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 group"
                    >
                      Tisch reservieren
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => setView('menu')}
                      className="bg-white text-brand-900 border border-brand-200 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-brand-50 transition-all"
                    >
                      Speisekarte ansehen
                    </button>
                  </div>

                  {!user && (
                    <div className="mt-6 p-4 bg-brand-50 rounded-2xl border border-brand-100 max-w-md">
                      <p className="text-xs text-brand-900/60 leading-relaxed">
                        <span className="font-bold text-brand-700">Probleme beim Anmelden?</span><br />
                        Falls der Login nicht öffnet, erlauben Sie bitte Popups oder öffnen Sie die App in einem neuen Tab über das Menü oben rechts.
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-12 grid grid-cols-3 gap-8 border-t border-brand-100 pt-8">
                    <div>
                      <div className="text-2xl font-bold text-brand-950">10:00</div>
                      <div className="text-sm text-brand-900/60">Öffnungszeit</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-brand-950">100%</div>
                      <div className="text-sm text-brand-900/60">Regional</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-brand-950">4.8/5</div>
                      <div className="text-sm text-brand-900/60">Bewertung</div>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-3xl overflow-hidden shadow-2xl aspect-[4/5] relative z-10"
                  >
                    <img 
                      src="https://www.nationalpark-cafe.com/images/hero-breakfast.jpg" 
                      alt="Frühstück im NATIONALPARK CAFÉ WISTLBERG" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&q=80&w=2000";
                      }}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    <div className="absolute bottom-8 left-8 right-8 text-white">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex -space-x-2">
                          {[1,2,3].map(i => (
                            <img key={i} src={`https://i.pravatar.cc/100?u=${i}`} className="w-8 h-8 rounded-full border-2 border-white" alt="User" />
                          ))}
                        </div>
                        <span className="text-sm font-medium">+120 Gäste heute</span>
                      </div>
                      <p className="font-display text-xl font-semibold">"Das beste Frühstück im Bayerischen Wald!"</p>
                    </div>
                  </motion.div>
                  <div className="absolute -top-6 -right-6 w-32 h-32 bg-brand-200 rounded-full blur-3xl opacity-50 -z-10"></div>
                  <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-brand-300 rounded-full blur-3xl opacity-50 -z-10"></div>
                </div>
              </div>

              {/* Features */}
                  <div className="mt-24 grid md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-brand-100 shadow-sm hover:shadow-md transition-all">
                  <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center mb-6">
                    <Clock className="w-6 h-6 text-brand-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Frühstückszeiten</h3>
                  <p className="text-brand-900/60">Wähle Deinen Wunschtermin zwischen 10:00 und 12:00 Uhr.</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-brand-100 shadow-sm hover:shadow-md transition-all">
                  <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center mb-6">
                    <Users className="w-6 h-6 text-brand-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Gruppen willkommen</h3>
                  <p className="text-brand-900/60">Ob zu zweit oder mit der ganzen Familie – wir haben Platz für alle.</p>
                </div>
                <div 
                  onClick={() => user ? setView('reserve') : login()}
                  className="bg-white p-8 rounded-3xl border border-brand-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-600 transition-colors">
                    <Calendar className="w-6 h-6 text-brand-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Einfache Buchung</h3>
                  <p className="text-brand-900/60">In nur wenigen Klicks ist Dein Tisch reserviert. Sofortige Bestätigung.</p>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'reserve' && user && (
            <motion.div 
              key="reserve"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
            >
              <div className="mb-8">
                <button onClick={() => setView('home')} className="text-brand-600 font-medium flex items-center gap-1 mb-4 hover:underline">
                  <ChevronRight className="w-4 h-4 rotate-180" /> Zurück
                </button>
                <h2 className="text-3xl font-bold text-brand-950 uppercase">Tisch reservieren</h2>
                <p className="text-brand-900/60">Bitte fülle das Formular aus, um Deinen Frühstückstisch zu sichern.</p>
              </div>
              <ReservationForm user={user} onComplete={() => setView('my-reservations')} />
            </motion.div>
          )}

          {view === 'my-reservations' && user && (
            <motion.div 
              key="my-reservations"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
            >
              <div className="mb-8 flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-brand-950">Meine Reservierungen</h2>
                  <p className="text-brand-900/60">Hier finden Sie alle Ihre aktuellen und vergangenen Buchungen.</p>
                </div>
                <button 
                  onClick={() => setView('reserve')}
                  className="bg-brand-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-brand-700 transition-all flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" /> Neue Buchung
                </button>
              </div>
              <ReservationList userId={user.uid} isAdmin={false} />
            </motion.div>
          )}

          {view === 'admin' && profile?.role === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
            >
              <AdminDashboard />
            </motion.div>
          )}

          {view === 'menu' && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
            >
              <div className="mb-8 flex justify-between items-center">
                <div>
                  <button onClick={() => setView('home')} className="text-brand-600 font-medium flex items-center gap-1 mb-4 hover:underline">
                    <ChevronRight className="w-4 h-4 rotate-180" /> Zurück
                  </button>
                  <h2 className="text-3xl font-bold text-brand-950 uppercase">Unsere Speisekarte</h2>
                  <p className="text-brand-900/60">Entdecke die regionalen Spezialitäten vom NATIONALPARK CAFÉ WISTLBERG.</p>
                </div>
                <a 
                  href="https://www.nationalpark-cafe.com/speisekarte.pdf" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-700 transition-all shadow-md flex items-center gap-2"
                  download
                >
                  <Download className="w-5 h-5" /> PDF Download
                </a>
              </div>
              
              <div className="bg-white rounded-3xl border border-brand-100 shadow-xl overflow-hidden aspect-[1/1.4] w-full relative">
                <iframe 
                  src="https://www.nationalpark-cafe.com/speisekarte.pdf" 
                  className="w-full h-full border-none"
                  title="Speisekarte Nationalpark Café Wistlberg"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-brand-50 -z-10">
                  <div className="text-center p-8">
                    <Coffee className="w-12 h-12 text-brand-200 mx-auto mb-4 animate-pulse" />
                    <p className="text-brand-900/40 font-medium">Lade Speisekarte...</p>
                    <p className="text-xs text-brand-900/30 mt-2">Falls die Karte nicht lädt, nutze bitte den Download-Button.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-brand-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <img 
                    src="https://www.nationalpark-cafe.com/logo.png" 
                    alt="Logo" 
                    className="h-8 w-auto"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden flex items-center gap-2">
                    <Coffee className="w-6 h-6 text-brand-600" />
                    <span className="font-display font-bold text-xl tracking-tight uppercase">Nationalpark Café Wistlberg</span>
                  </div>
                </div>
                <p className="text-brand-900/60 max-w-sm">
                  Dein regionaler Partner für unvergessliche Frühstücksmomente im Nationalpark Bayerischer Wald.
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-4">Kontakt</h4>
                <ul className="space-y-2 text-brand-900/60 text-sm">
                  <li>Buchwaldstr. 53</li>
                  <li>94151 Mauth</li>
                  <li>Tel: +49 8558 12345</li>
                  <li>Email: <a href="mailto:info@nationalpark-cafe.com" className="hover:text-brand-600 transition-colors">info@nationalpark-cafe.com</a></li>
                  <li>Web: <a href="https://www.nationalpark-cafe.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 transition-colors">www.nationalpark-cafe.com</a></li>
                </ul>
              </div>
            <div>
              <h4 className="font-bold mb-4">Öffnungszeiten</h4>
              <ul className="space-y-2 text-brand-900/60 text-sm">
                <li>Mo - So: 10:00 - 18:00</li>
                <li>Dienstag: Ruhetag*</li>
                <li>Frühstück: 10:00 - 12:00</li>
                <li className="text-[10px] italic mt-2">*In den bayerischen Sommerferien täglich geöffnet</li>
              </ul>
            </div>
          </div>
            <div className="mt-12 pt-8 border-t border-brand-50 text-center text-sm text-brand-900/40">
              © 2026 Nationalpark Café Wistlberg. Alle Rechte vorbehalten.
            </div>
        </div>
      </footer>
    </div>
  );
}
