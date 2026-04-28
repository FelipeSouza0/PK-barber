import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Sparkles, 
  Eye, 
  Calendar, 
  Clock, 
  CalendarOff, 
  LogOut, 
  LogIn,
  CheckCircle2 as CheckCircle,
  AlertCircle,
  Loader2,
  LayoutDashboard,
  Settings,
  Plus,
  Trash2,
  ShieldCheck,
  User,
  Copy,
  ExternalLink,
  MessageCircle,
  QrCode,
  Phone as PhoneIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  db, 
  auth,
  googleProvider,
  handleFirestoreError, 
  testConnection 
} from './lib/firebase';
import { 
  collection, 
  addDoc, 
  setDoc,
  getDocs,
  doc,
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  updateDoc,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';

// WhatsApp Config (User can change this)
const WHATSAPP_NUMBER = "5511999999999"; // Para onde enviar o comprovante

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface AppConfig {
  times: { [key: number]: string[] };
  blockedDays: string[];
}

interface Appointment {
  id: string;
  userId: string;
  name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  barbershop: string;
  status: 'confirmado' | 'cancelado' | 'pendente';
  totalPrice: number;
  bookingFee: number;
  dueAmount: number;
  paid: boolean;
  createdAt: any;
}

function PixPayment({ amount, bookingFee, name, appointmentId, onConfirm, onCancel, loading }: { amount: number, bookingFee: number, name: string, appointmentId: string | null, onConfirm: () => void, onCancel: () => void, loading?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [fetchingQr, setFetchingQr] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (!appointmentId) return;

    const unsub = onSnapshot(doc(db, 'appointments', appointmentId), (doc) => {
      if (doc.exists() && doc.data().status === 'confirmado') {
        setIsConfirmed(true);
      }
    });

    return () => unsub();
  }, [appointmentId]);

  useEffect(() => {
    async function generatePayment() {
      if (!appointmentId) return;
      try {
        const response = await fetch('/api/mercadopago/create-pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: bookingFee,
            name: name,
            email: 'cliente@agendpk.com.br',
            appointmentId: appointmentId
          })
        });
        const data = await response.json();
        if (data.qr_code) {
          setQrCode(data.qr_code);
          setQrCodeBase64(data.qr_code_base64);
        }
      } catch (err) {
        console.error("Erro ao gerar PIX:", err);
      } finally {
        setFetchingQr(false);
      }
    }
    generatePayment();
  }, [bookingFee, name, appointmentId]);

  const copyKey = () => {
    if (qrCode) {
      navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const remainingValue = amount - bookingFee;

  if (isConfirmed) {
    return (
      <div className="space-y-6 bg-gold/5 p-12 border-2 border-gold flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-editorial-bg" />
        </div>
        <h3 className="font-serif italic text-3xl text-gold">Pagamento Confirmado!</h3>
        <p className="text-sm text-editorial-muted leading-relaxed max-w-xs">
          Seu horário na <span className="text-white">PK Barbershop</span> foi garantido com sucesso. 
          Prepare o estilo, estamos te esperando!
        </p>
        <button 
          onClick={onConfirm}
          className="mt-6 w-full bg-gold text-editorial-bg py-4 font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all"
        >
          Ver Meus Agendamentos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white/[0.02] p-8 border border-gold/20 flex flex-col items-center">
      <h3 className="font-serif italic text-2xl text-gold text-center">Pagamento via PIX</h3>
      
      <div className="w-48 h-48 bg-white p-4 rounded-lg flex items-center justify-center relative overflow-hidden">
        {fetchingQr ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
            <span className="text-[10px] uppercase tracking-widest text-editorial-bg animate-pulse">Gerando...</span>
          </div>
        ) : qrCodeBase64 ? (
          <img src={`data:image/jpeg;base64,${qrCodeBase64}`} alt="QR Code PIX" className="w-full h-full" />
        ) : (
          <QrCode className="w-full h-full text-editorial-bg opacity-10" />
        )}
      </div>

      <div className="w-full space-y-4">
        {qrCode && (
          <div className="p-4 bg-white/5 border border-white/10 text-center">
            <p className="text-[0.6rem] uppercase tracking-widest text-editorial-muted mb-1">Copia e Cola</p>
            <p className="font-mono text-[10px] break-all opacity-50 max-h-12 overflow-hidden mask-fade-bottom">
              {qrCode}
            </p>
            <button 
              onClick={copyKey}
              type="button"
              className="mt-2 text-[0.6rem] uppercase tracking-widest text-gold hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiado!' : 'Copiar Código'}
            </button>
          </div>
        )}

        <div className="space-y-2 border-t border-white/10 pt-4">
          <div className="flex justify-between text-[0.65rem] uppercase tracking-widest text-editorial-muted">
            <span>Taxa de Reserva (20%)</span>
            <span>R$ {(amount * 0.2).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[0.65rem] uppercase tracking-widest text-editorial-muted">
            <span>Taxa Administrativa</span>
            <span>R$ 0,50</span>
          </div>
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gold border-t border-white/5 pt-2">
            <span>Total a Pagar Agora</span>
            <span>R$ {bookingFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[0.6rem] uppercase tracking-widest text-emerald-500/80 italic pt-2 text-center w-full">
            <span>Saldo a pagar no local: R$ {remainingValue.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-gold/10 p-3 rounded text-[0.6rem] uppercase tracking-widest text-gold border border-gold/20 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>Após pagar, clique no botão abaixo para finalizar seu agendamento e enviar o comprovante via WhatsApp.</p>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            disabled={loading}
            className="w-full bg-gold text-editorial-bg py-4 font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {loading ? 'Processando...' : 'Finalizar e Enviar Comprovante'}
          </button>
          <button onClick={onCancel} disabled={loading} className="w-full py-2 text-xs text-editorial-muted uppercase tracking-widest hover:text-white transition-all disabled:opacity-20">Cancelar e voltar</button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_SERVICES: Service[] = [
  { id: 'corte', name: 'Corte', duration: 30, price: 50 },
  { id: 'barba', name: 'Barba', duration: 30, price: 40 },
  { id: 'completo', name: 'Completo', duration: 45, price: 80 },
  { id: 'sobrancelha', name: 'Sobrancelha', duration: 15, price: 20 }
];

const DEFAULT_TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
const INITIAL_CONFIG: AppConfig = {
  times: {
    1: DEFAULT_TIMES, 2: DEFAULT_TIMES, 3: DEFAULT_TIMES, 4: DEFAULT_TIMES, 5: DEFAULT_TIMES, 6: DEFAULT_TIMES
  },
  blockedDays: []
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'booking' | 'appointments' | 'admin'>('booking');
  const [adminSubTab, setAdminSubTab] = useState<'dashboard' | 'services' | 'settings' | 'manage'>('dashboard');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [config, setConfig] = useState<AppConfig>(INITIAL_CONFIG);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [lookupPhone, setLookupPhone] = useState<string | null>(null);
  const [lookupPhoneInput, setLookupPhoneInput] = useState('');
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [adminConfigDay, setAdminConfigDay] = useState<number>(1); // Default to Monday

  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.email === 'felipe.souza@a7.net.br' && user.emailVerified) {
        setIsAdmin(true);
        if (activeTab !== 'admin') {
          setActiveTab('admin');
        }
      }
    });
    return () => unsubAuth();
  }, [activeTab]);

  useEffect(() => {
    testConnection();
    
    // Fetch Services
    const unsubServices = onSnapshot(collection(db, 'services'), (snap) => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
    });

    // Fetch Config
    const unsubConfig = onSnapshot(doc(db, 'config', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.times)) {
          setConfig({
            times: { 1: data.times, 2: data.times, 3: data.times, 4: data.times, 5: data.times, 6: data.times },
            blockedDays: data.blockedDays || []
          });
        } else {
          setConfig(data as AppConfig);
        }
      }
    });

    setDataLoading(false);
    return () => {
      unsubServices();
      unsubConfig();
    };
  }, []);

  useEffect(() => {
    if (!lookupPhone && !isAdmin) {
      setAppointments([]);
      return;
    }

    const baseQuery = collection(db, 'appointments');
    let q;

    if (isAdmin) {
      q = query(baseQuery, orderBy('createdAt', 'desc'));
    } else {
      q = query(
        baseQuery,
        where('phone', '==', lookupPhone)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Appointment[];

      // Sort in-memory to avoid needing composite indexes for phone + createdAt
      data = data.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      if (isAdmin) {
        setAllAppointments(data);
      } else {
        setAppointments(data);
      }
    }, (error) => {
      console.error("Error fetching appointments:", error);
    });

    return () => unsubscribe();
  }, [lookupPhone, isAdmin]);

  const toggleAdmin = () => {
    if (adminPinInput === '1234') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setActiveTab('admin');
      showMessage('Modo Admin Ativado', 'success');
      setAdminPinInput('');
    } else {
      showMessage('PIN Incorreto', 'error');
    }
  };

  const handleLogoutAdmin = async () => {
    await signOut(auth);
    setIsAdmin(false);
    setActiveTab('booking');
    showMessage('Modo Admin Desativado', 'success');
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      setShowAdminLogin(false);
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      showMessage('Erro ao autenticar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultData = async () => {
    try {
      setLoading(true);
      const servicesSnap = await getDocs(collection(db, 'services'));
      if (servicesSnap.empty) {
        for (const s of DEFAULT_SERVICES) {
          await setDoc(doc(db, 'services', s.id), { name: s.name, duration: s.duration, price: s.price });
        }
      }
      const configSnap = await doc(db, 'config', 'general');
      await setDoc(configSnap, INITIAL_CONFIG, { merge: true });
      showMessage('Dados inicializados com sucesso!', 'success');
    } catch (error) {
      handleFirestoreError(error, 'write', 'initialization');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error' | 'warning') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const toggleService = (id: string) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
    setSelectedTime(null);
  };

  const getTotalDuration = () => {
    return selectedServices.reduce((total, id) => {
      const service = services.find(s => s.id === id);
      return total + (service?.duration || 0);
    }, 0);
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((total, id) => {
      const service = services.find(s => s.id === id);
      return total + (service?.price || 0);
    }, 0);
  };

  const getBookingFee = () => {
    const total = getTotalPrice();
    return (total * 0.20) + 0.50;
  };

  const getAvailableTimeslots = () => {
    const duration = getTotalDuration();
    if (!selectedDate) return [];
    
    const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay();
    const dayTimes = config.times[dayOfWeek] || [];
    
    if (duration === 0) return dayTimes;
    
    const lastTime = dayTimes[dayTimes.length - 1];
    if (!lastTime) return [];
    
    const [lastHour, lastMin] = lastTime.split(':').map(Number);
    const lastTimeMinutes = lastHour * 60 + lastMin;
    
    return dayTimes.filter(time => {
      const [hour, min] = time.split(':').map(Number);
      const timeMinutes = hour * 60 + min;
      return timeMinutes + duration <= lastTimeMinutes;
    });
  };

  const generateNextSevenDays = () => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      if (!config.blockedDays.includes(dateStr)) {
        dates.push(date);
      }
    }
    return dates;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (selectedServices.length === 0 || !selectedDate || !selectedTime) {
      showMessage('Selecione um serviço, data e horário!', 'warning');
      return;
    }

    setLoading(true);

    try {
      if (!showPayment) {
        const serviceNames = selectedServices
          .map(id => services.find(s => s.id === id)?.name)
          .join(' + ');

        const totalPrice = getTotalPrice();
        const bookingFee = getBookingFee();

        const docRef = await addDoc(collection(db, 'appointments'), {
          userId: 'anonymous',
          name: formData.name,
          phone: formData.phone,
          service: serviceNames,
          date: selectedDate,
          time: selectedTime,
          barbershop: 'PK Barbershop',
          status: 'pendente',
          totalPrice: totalPrice,
          bookingFee: bookingFee,
          dueAmount: totalPrice - bookingFee,
          paid: false,
          paymentMethod: 'pix',
          createdAt: serverTimestamp()
        });

        setCreatedAppointmentId(docRef.id);
        setShowPayment(true);
        setLoading(false);
        return;
      }

      // If user clicks confirm after payment screen
      const serviceNames = selectedServices
        .map(id => services.find(s => s.id === id)?.name)
        .join(' + ');

      const totalPrice = getTotalPrice();
      const bookingFee = getBookingFee();

      // Redirect to WhatsApp as a fallback/backup
      const pixMsg = `Olá! Acabei de fazer um agendamento na PK Barbershop.\n\nServiço: ${serviceNames}\nData: ${selectedDate} às ${selectedTime}h\nTotal: R$ ${totalPrice}\nTaxa Reserva: R$ ${bookingFee.toFixed(2)}`;
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(pixMsg)}`, '_blank');

      showMessage('Tudo pronto! Seu agendamento foi confirmado. Prepare o estilo!', 'success');
      
      // Cleanup
      setSelectedServices([]);
      setSelectedDate(null);
      setSelectedTime(null);
      const lastPhone = formData.phone;
      setFormData(prev => ({ ...prev, phone: '' }));
      setShowPayment(false);
      setCreatedAppointmentId(null);
      setActiveTab('appointments');
      setLookupPhone(lastPhone);
    } catch (error) {
      handleFirestoreError(error, 'create', '/appointments');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'confirmado' | 'cancelado') => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
      showMessage(`Status atualizado para ${status}`, 'success');
    } catch (error) {
      handleFirestoreError(error, 'update', `/appointments/${id}`);
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'appointments', id));
      showMessage('Agendamento removido!', 'success');
    } catch (error) {
      handleFirestoreError(error, 'delete', `/appointments/${id}`);
    }
  };

  // Admin Management Functions
  const addService = async (s: Omit<Service, 'id'>) => {
    const id = s.name.toLowerCase().replace(/\s+/g, '-');
    await setDoc(doc(db, 'services', id), s);
    showMessage('Serviço adicionado', 'success');
  };

  const deleteService = async (id: string) => {
    await deleteDoc(doc(db, 'services', id));
    showMessage('Serviço removido', 'success');
  };

  const updateConfig = async (newConfig: AppConfig) => {
    await setDoc(doc(db, 'config', 'general'), newConfig);
    showMessage('Configurações salvas', 'success');
  };

  const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const availableDates = generateNextSevenDays();

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-editorial-bg flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gold animate-spin" />
      </div>
    );
  }

  // Dashboard Stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayStats = allAppointments.filter(a => a.date === todayStr && a.status === 'confirmado');
  const dailyRevenue = todayStats.reduce((sum, a) => sum + (a.totalPrice || 0), 0);

  const dashboardStats = [
    { name: 'Confirmados', value: allAppointments.filter(a => a.status === 'confirmado').length },
    { name: 'Cancelados', value: allAppointments.filter(a => a.status === 'cancelado').length }
  ];

  const serviceHistoryRows = allAppointments.reduce((acc: any[], apt) => {
    const existing = acc.find(x => x.name === apt.service);
    if (existing) existing.value += 1;
    else acc.push({ name: apt.service, value: 1 });
    return acc;
  }, []).sort((a,b) => b.value - a.value).slice(0, 5);

  const COLORS = ['#C5A059', '#666666', '#FFFFFF', '#333333'];

  return (
    <div className="min-h-screen flex flex-col bg-editorial-bg text-editorial-ink p-6 md:p-12 md:pt-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center border-b border-white/10 pb-2 mb-6">
        <div className="flex flex-col items-center md:items-start w-full md:w-auto">
          <div className="relative w-80 h-48 md:w-[600px] md:h-80 -mt-8 -mb-6 md:-ml-16">
            <img 
              src="/logo.png" 
              alt="PK Barbershop Logo" 
              className="w-full h-full object-contain filter brightness-110 contrast-110 drop-shadow-[0_0_30px_rgba(197,160,89,0.25)]"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
        <div className="text-center md:text-right mt-0 md:mt-0 pb-4 md:pb-0">
          <p className="uppercase tracking-[0.25rem] text-[0.55rem] text-editorial-muted mb-0">Localização</p>
          <p className="text-[10px] md:text-xs font-sans opacity-80 leading-tight">Rua Sebastião Lopes Primo, 622 — Jardim do Sol, Eng. Coelho - SP</p>
          <p className="text-[10px] md:text-xs font-sans opacity-60">CEP: 13445-460</p>
          
          <div className="mt-4">
            {isAdmin && (
              <div className="flex items-center justify-end gap-3">
                <span className="text-[0.75rem] uppercase tracking-widest text-gold font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Admin Ativo
                </span>
                <button 
                  onClick={handleLogoutAdmin}
                  className="p-1 text-editorial-muted hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex flex-wrap gap-8 mb-12">
        <button 
          onClick={() => setActiveTab('booking')}
          className={`uppercase tracking-[0.15rem] text-xs font-bold transition-all border-b pb-2 ${
            activeTab === 'booking' ? 'text-gold border-gold' : 'text-editorial-muted border-transparent hover:text-white'
          }`}
        >
          Novo Agendamento
        </button>
        <button 
          onClick={() => setActiveTab('appointments')}
          className={`uppercase tracking-[0.15rem] text-xs font-bold transition-all border-b pb-2 ${
            activeTab === 'appointments' ? 'text-gold border-gold' : 'text-editorial-muted border-transparent hover:text-white'
          }`}
        >
          Meus Agendamentos
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('admin')}
            className={`uppercase tracking-[0.15rem] text-xs font-bold transition-all border-b pb-2 ${
              activeTab === 'admin' ? 'text-gold border-gold' : 'text-editorial-muted border-transparent hover:text-white'
            }`}
          >
            Painel de Controle
          </button>
        )}
      </nav>

      {/* Messages */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-8 right-8 p-4 z-50 flex items-center gap-3 font-sans text-xs uppercase tracking-widest border ${
              message.type === 'success' ? 'bg-gold text-editorial-bg border-gold' :
              message.type === 'error' ? 'bg-red-900/80 text-white border-red-500' :
              'bg-white/5 text-gold border-gold/30'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full max-w-7xl mx-auto pb-24">
        {activeTab === 'booking' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16 items-start">
            <section className="flex flex-col">
              <h2 className="font-serif italic text-2xl mb-6 border-b border-gold inline-block self-start pr-12 pb-2">Serviços</h2>
              <div className="space-y-0">
                {services.map((service) => {
                  const isSelected = selectedServices.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={`w-full py-5 border-b border-white/5 flex justify-between items-center group transition-all text-left ${
                        isSelected ? 'text-gold' : 'text-editorial-ink/70 hover:text-gold'
                      }`}
                    >
                      <div>
                        <p className={`text-lg transition-all ${isSelected ? 'font-bold' : 'group-hover:pl-2'}`}>{service.name}</p>
                        <p className="text-[0.65rem] uppercase tracking-widest opacity-40 mt-1">{service.duration} minutos</p>
                      </div>
                      <span className="font-serif italic text-lg">R$ {service.price}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="flex flex-col">
              <h2 className="font-serif italic text-2xl mb-6 border-b border-gold inline-block self-start pr-12 pb-2">Horário</h2>
              <p className="text-[0.7rem] uppercase tracking-widest text-editorial-muted mb-4">Escolha o Dia</p>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {availableDates.map(date => {
                  const dateStr = date.toISOString().split('T')[0];
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`p-4 border transition-all text-center flex flex-col items-center ${
                        isSelected ? 'bg-gold text-editorial-bg border-gold' : 'bg-transparent border-white/10 hover:border-gold'
                      }`}
                    >
                      <span className="text-[0.65rem] uppercase tracking-tighter opacity-70">{days[date.getDay()]}</span>
                      <span className="text-2xl font-serif leading-none mt-1">{date.getDate()}</span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[0.7rem] uppercase tracking-widest text-editorial-muted mb-4">Disponibilidade</p>
              {selectedServices.length === 0 ? (
                <div className="py-8 text-center text-editorial-muted text-xs italic opacity-50 border border-white/5">Selecione os serviços para ver horários</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {getAvailableTimeslots().map(time => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-3 border text-xs font-bold transition-all ${
                          isSelected ? 'border-gold text-gold shadow-[0_0_15px_rgba(197,160,89,0.2)]' : 'bg-transparent border-white/10 text-editorial-ink hover:border-gold hover:text-gold'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="flex flex-col h-full border-t lg:border-t-0 lg:border-l border-white/5 pt-12 lg:pt-0 lg:pl-12">
              <h2 className="font-serif italic text-2xl mb-6 border-b border-gold inline-block self-start pr-12 pb-2">Finalizar</h2>
              <form onSubmit={handleSubmit} className="flex flex-col flex-1">
                <div className="space-y-6 mb-8">
                  <div className="space-y-1">
                    <label className="block text-[0.65rem] uppercase tracking-widest text-editorial-muted">Nome Completo</label>
                    <input type="text" required value={formData.name} placeholder="Seu nome..." onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full bg-transparent border-b border-white/20 py-2 outline-none focus:border-gold transition-all text-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[0.65rem] uppercase tracking-widest text-editorial-muted">Contato Telefônico</label>
                    <input type="tel" required value={formData.phone} placeholder="(00) 00000-0000" onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full bg-transparent border-b border-white/20 py-2 outline-none focus:border-gold transition-all text-lg" />
                  </div>
                </div>
                <div className="bg-white/[0.03] p-6 mb-8 space-y-3">
                  <div className="flex justify-between text-xs tracking-tight">
                    <span className="text-editorial-muted">Serviços</span>
                    <span className="text-right">{selectedServices.length > 0 ? selectedServices.map(id => services.find(s => s.id === id)?.name).join(' + ') : 'Nenhum'}</span>
                  </div>
                  <div className="flex justify-between text-xs tracking-tight">
                    <span className="text-editorial-muted">Data</span>
                    <span>{selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs tracking-tight">
                    <span className="text-editorial-muted">Horário</span>
                    <span>{selectedTime ? `${selectedTime}h` : '—'}</span>
                  </div>
                  <div className="pt-4 mt-2 border-t border-white/10 flex justify-between items-end">
                    <span className="text-sm font-bold uppercase tracking-wider text-gold">Valor do Serviço</span>
                    <span className="font-serif italic text-2xl text-gold">R$ {getTotalPrice()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[0.65rem] uppercase tracking-[0.2rem] text-emerald-500/80 pt-1">
                    <span>Taxa de Reserva Online</span>
                    <span className="font-bold">R$ {getBookingFee().toFixed(2)}</span>
                  </div>
                </div>

                {showPayment ? (
                  <div className="animate-in slide-in-from-right-4">
                    <PixPayment 
                      amount={getTotalPrice()} 
                      bookingFee={getBookingFee()}
                      name={formData.name}
                      appointmentId={createdAppointmentId}
                      onConfirm={() => handleSubmit()} 
                      onCancel={() => setShowPayment(false)} 
                      loading={loading}
                    />
                  </div>
                ) : (
                  <button type="submit" disabled={loading || selectedServices.length === 0 || !selectedDate || !selectedTime} className="w-full bg-gold text-editorial-bg py-6 font-bold uppercase tracking-[0.3rem] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm shadow-xl flex items-center justify-center">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Prosseguir para Pagamento'}
                  </button>
                )}
              </form>
            </section>
          </div>
        ) : activeTab === 'appointments' ? (
          <div className="animate-in fade-in max-w-3xl mx-auto py-12">
            <h2 className="font-serif italic text-4xl mb-12 text-center text-gold">Seus Agendamentos</h2>
            {!lookupPhone ? (
               <div className="text-center py-20 border border-white/5 bg-white/[0.02] px-8">
                 <div className="max-w-xs mx-auto">
                   <p className="font-serif italic text-2xl text-editorial-muted mb-6">Acesse seu histórico</p>
                   <label className="block text-xs uppercase tracking-widest text-editorial-muted mb-2 text-left ml-1">Telefone</label>
                   <input type="tel" value={lookupPhoneInput} onChange={(e) => setLookupPhoneInput(e.target.value)} placeholder="(00) 00000-0000" className="w-full bg-white/[0.03] border border-white/10 p-4 outline-none focus:border-gold transition-all text-sm mb-4" />
                   <button onClick={() => setLookupPhone(lookupPhoneInput)} className="w-full bg-gold text-editorial-bg py-4 font-bold uppercase tracking-[0.2rem] text-sm hover:opacity-90 transition-all font-sans">Visualizar Registros</button>
                 </div>
               </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-20 border border-white/5 bg-white/[0.02]">
                <CalendarOff className="w-16 h-16 mx-auto opacity-10 mb-4" />
                <p className="font-serif italic text-2xl text-editorial-muted">Nenhum agendamento encontrado</p>
                <button onClick={() => setLookupPhone(null)} className="mt-4 text-xs uppercase tracking-widest text-gold hover:underline">Tentar outro número</button>
              </div>
            ) : (
              <div className="space-y-px">
                <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
                  <p className="text-sm uppercase tracking-[0.1rem] text-editorial-muted">Registros para: <span className="text-gold font-bold">{lookupPhone}</span></p>
                  <button onClick={() => setLookupPhone(null)} className="text-xs uppercase tracking-[0.1rem] text-gold hover:underline">Trocar número</button>
                </div>
                {appointments.map((apt) => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={apt.id} className="group bg-white/[0.01] border-b border-white/[0.05] p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <span className={`text-xs uppercase tracking-widest px-2 py-0.5 border ${apt.status === 'confirmado' ? 'bg-gold/5 text-gold border-gold/20' : 'bg-red-500/5 text-red-500 border-red-500/20'}`}>{apt.status}</span>
                        <h4 className="font-serif italic text-2xl">{apt.service}</h4>
                      </div>
                      <div className="flex flex-wrap gap-8 text-sm uppercase tracking-widest text-editorial-muted">
                        <p>Data: <span className="text-editorial-ink">{new Date(apt.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span></p>
                        <p>Horário: <span className="text-editorial-ink">{apt.time}h</span></p>
                      </div>
                    </div>
                    {apt.status === 'confirmado' && (
                      <button onClick={() => updateStatus(apt.id, 'cancelado')} className="opacity-0 group-hover:opacity-100 uppercase text-xs tracking-[0.1rem] text-red-500/50 hover:text-red-500 transition-all font-bold">Cancelar</button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
             <div className="flex gap-6 mb-10 overflow-x-auto pb-4">
               {[
                { id: 'dashboard', label: 'Monitoramento', icon: LayoutDashboard },
                { id: 'services', label: 'Serviços', icon: Scissors },
                { id: 'settings', label: 'Horários e Dias', icon: Settings },
                { id: 'manage', label: 'Agendamentos', icon: Calendar }
               ].map(sub => (
                 <button key={sub.id} onClick={() => setAdminSubTab(sub.id as any)} className={`flex items-center gap-2 px-4 py-2 text-[0.65rem] uppercase tracking-widest transition-all border ${adminSubTab === sub.id ? 'bg-gold text-editorial-bg border-gold' : 'border-white/10 text-editorial-muted hover:border-gold/50'}`}>
                   <sub.icon className="w-3 h-3" /> {sub.label}
                 </button>
               ))}
            </div>

            {adminSubTab === 'dashboard' && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                 <div className="col-span-full flex justify-end">
                    <button 
                      onClick={initializeDefaultData}
                      className="text-[0.6rem] uppercase tracking-widest text-editorial-muted border border-white/10 px-4 py-2 hover:border-gold hover:text-gold transition-all"
                    >
                      Restaurar Valores Padrão (Admin Only)
                    </button>
                 </div>
                 <div className="bg-gold/10 border border-gold/30 p-8 flex flex-col justify-center items-center shadow-[0_0_30px_rgba(197,160,89,0.1)]">
                   <p className="uppercase tracking-[0.2rem] text-xs text-gold mb-2 font-bold italic">Receita do Dia</p>
                   <h4 className="text-5xl font-serif italic text-gold">R$ {dailyRevenue}</h4>
                   <p className="text-xs text-editorial-muted mt-2 uppercase tracking-widest">{todayStats.length} atendimentos hoje</p>
                 </div>
                 <div className="bg-white/[0.02] border border-white/5 p-8">
                   <h3 className="font-serif italic text-xl mb-8 text-gold">Status Geral</h3>
                   <div className="h-[250px]">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie data={dashboardStats} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                           {dashboardStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                         </Pie>
                         <RechartsTooltip contentStyle={{ backgroundColor: '#111', border: 'none' }} />
                       </PieChart>
                     </ResponsiveContainer>
                   </div>
                 </div>
                 <div className="bg-white/[0.02] border border-white/5 p-8">
                   <h3 className="font-serif italic text-xl mb-8 text-gold">Ranking Serviços</h3>
                   <div className="h-[250px]">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={serviceHistoryRows}>
                         <XAxis dataKey="name" stroke="#666" fontSize={10} />
                         <YAxis stroke="#666" fontSize={10} />
                         <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#111', border: 'none' }} />
                         <Bar dataKey="value" fill="#C5A059" />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                 </div>
               </div>
            )}

            {adminSubTab === 'services' && (
              <div className="max-w-2xl space-y-8">
                <form className="bg-white/[0.02] border border-gold/10 p-6 grid grid-cols-3 gap-4" onSubmit={(e) => {
                  e.preventDefault();
                  const f = e.target as any;
                  if (editingService) {
                    updateDoc(doc(db, 'services', editingService.id), {
                      name: f.sname.value,
                      duration: Number(f.sdur.value),
                      price: Number(f.sprice.value)
                    });
                    setEditingService(null);
                    showMessage('Serviço atualizado', 'success');
                  } else {
                    addService({ name: f.sname.value, duration: Number(f.sdur.value), price: Number(f.sprice.value) });
                  }
                  f.reset();
                }}>
                  <div className="col-span-3 mb-4 flex justify-between items-center border-b border-gold/20 pb-2">
                    <h3 className="font-serif italic text-2xl text-gold">{editingService ? 'Editar Serviço' : 'Novo Serviço'}</h3>
                    {editingService && (
                      <button type="button" onClick={() => setEditingService(null)} className="text-xs text-editorial-muted hover:text-white uppercase tracking-widest">Desistir da Edição</button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[0.7rem] uppercase tracking-widest text-editorial-muted">Nome</label>
                    <input name="sname" defaultValue={editingService?.name || ''} className="bg-transparent border-b border-white/10 p-2 text-base outline-none focus:border-gold" required />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[0.7rem] uppercase tracking-widest text-editorial-muted">Minutos</label>
                    <input name="sdur" type="number" defaultValue={editingService?.duration || ''} className="bg-transparent border-b border-white/10 p-2 text-base outline-none focus:border-gold" required />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[0.7rem] uppercase tracking-widest text-editorial-muted">Preço (R$)</label>
                    <input name="sprice" type="number" defaultValue={editingService?.price || ''} className="bg-transparent border-b border-white/10 p-2 text-base outline-none focus:border-gold" required />
                  </div>
                  <button type="submit" className="col-span-3 bg-gold text-editorial-bg py-4 font-bold uppercase tracking-widest text-sm mt-2 transition-all hover:opacity-90">
                    {editingService ? 'Salvar Alterações' : 'Cadastrar Serviço'}
                  </button>
                </form>
                <div className="bg-white/[0.01]">
                  {services.map(s => (
                    <div key={s.id} className="flex justify-between items-center py-6 border-b border-white/5 group px-4 hover:bg-white/[0.03] transition-all">
                      <div className="flex-1">
                        <p className="text-lg font-bold uppercase tracking-wider">{s.name} <span className="text-xs font-normal text-editorial-muted ml-2">{s.duration}min • R${s.price}</span></p>
                      </div>
                      <div className="flex gap-6 opacity-0 group-hover:opacity-100 transition-all items-center">
                        <button onClick={() => setEditingService(s)} className="text-gold text-xs uppercase tracking-widest font-bold hover:underline">Editar</button>
                        <button onClick={() => deleteService(s.id)} className="text-red-500/50 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminSubTab === 'settings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/[0.02] p-8 border border-white/5">
                   <h3 className="font-serif italic text-2xl mb-4 text-gold">Horários por Dia</h3>
                   
                   <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                     {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((d, i) => (
                       <button
                         key={d}
                         onClick={() => setAdminConfigDay(i)}
                         className={`px-3 py-2 text-xs font-bold transition-all border ${
                           adminConfigDay === i ? 'bg-gold text-editorial-bg border-gold' : 'border-white/10 text-editorial-muted'
                         }`}
                       >
                         {d}
                       </button>
                     ))}
                   </div>

                   <p className="text-xs text-editorial-muted mb-4 uppercase tracking-widest">
                     Editando: <span className="text-gold font-bold">{['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][adminConfigDay]}</span>
                   </p>

                   <div className="flex flex-wrap gap-2 mb-6">
                     {(config.times[adminConfigDay] || []).map(t => (
                       <button key={t} onClick={() => {
                         const newDayTimes = (config.times[adminConfigDay] || []).filter(x => x !== t);
                         updateConfig({ ...config, times: { ...config.times, [adminConfigDay]: newDayTimes } });
                       }} className="bg-white/5 px-3 py-2 text-xs border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 transition-all font-bold">{t} ✕</button>
                     ))}
                   </div>
                   <form className="flex gap-2" onSubmit={(e) => { 
                     e.preventDefault(); 
                     const v = (e.target as any).t.value; 
                     if(v && !(config.times[adminConfigDay] || []).includes(v)) {
                       const newDays = [...(config.times[adminConfigDay] || []), v].sort();
                       updateConfig({...config, times: { ...config.times, [adminConfigDay]: newDays } });
                     }
                     (e.target as any).reset(); 
                   }}>
                     <input name="t" type="time" className="bg-white/5 border border-white/10 p-3 text-sm flex-1 text-white" />
                     <button type="submit" className="bg-gold text-editorial-bg px-6 py-2 font-bold text-xs uppercase tracking-widest">Add</button>
                   </form>
                </div>
                <div className="bg-white/[0.02] p-8 border border-white/5">
                   <h3 className="font-serif italic text-2xl mb-2 text-gold">Folgas e Feriados</h3>
                   <p className="text-xs text-editorial-muted mb-6 uppercase tracking-widest">Bloqueio de datas específicas no calendário</p>
                   <div className="flex flex-wrap gap-2 mb-6">
                     {config.blockedDays.map(d => (
                       <button key={d} onClick={() => updateConfig({ ...config, blockedDays: config.blockedDays.filter(x => x !== d) })} className="bg-red-500/10 px-3 py-2 text-xs border border-red-500/30 font-mono italic font-bold">{new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')} ✕</button>
                     ))}
                   </div>
                   <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = (e.target as any).d.value; if(v && !config.blockedDays.includes(v)) updateConfig({...config, blockedDays: [...config.blockedDays, v].sort()}); (e.target as any).reset(); }}>
                     <input name="d" type="date" className="bg-white/5 border border-white/10 p-3 text-sm flex-1 text-white" />
                     <button type="submit" className="bg-red-900 text-white px-6 py-2 font-bold text-xs uppercase tracking-widest">Block</button>
                   </form>
                </div>
              </div>
            )}

            {adminSubTab === 'manage' && (
              <div className="space-y-4">
                {allAppointments.map(apt => (
                  <div key={apt.id} className="bg-white/[0.02] p-6 flex justify-between items-center border border-white/5">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-widest">{apt.name} <span className="text-xs text-editorial-muted ml-2">{apt.phone}</span></p>
                      <p className="text-sm text-gold">{apt.service} — {apt.date} às {apt.time}h</p>
                      <div className="flex gap-4 mt-1 text-[0.65rem] uppercase tracking-widest">
                        <span className="text-editorial-muted">Total: R$ {apt.totalPrice}</span>
                        <span className="text-emerald-500/80">Taxa Reserva: R$ {apt.bookingFee?.toFixed(2) || '—'}</span>
                        <span className="text-gold font-bold">A receber: R$ {apt.dueAmount?.toFixed(2)}</span>
                        {apt.paid ? (
                          <span className="bg-emerald-500/20 text-emerald-500 px-1">TAXA PAGA</span>
                        ) : (
                          <span className="bg-red-500/20 text-red-500 px-1">AGUARDANDO PIX</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4">
                       {!apt.paid && (
                         <button onClick={() => updateDoc(doc(db, 'appointments', apt.id), { paid: true, status: 'confirmado' })} className="px-4 py-2 text-xs uppercase font-bold tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">Confirmar Pagto</button>
                       )}
                       <button onClick={() => updateStatus(apt.id, apt.status === 'confirmado' ? 'cancelado' : 'confirmado')} className={`px-4 py-2 text-xs uppercase font-bold tracking-widest border ${apt.status === 'confirmado' ? 'border-red-500/50 text-red-500' : 'border-gold/50 text-gold'}`}>{apt.status === 'confirmado' ? 'Cancelar' : 'Reativar'}</button>
                       <button onClick={() => deleteAppointment(apt.id)} className="p-2 text-white/20 hover:text-red-500 transition-all"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-auto py-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 relative">
        <div className="flex gap-4">
          <span className="text-[0.65rem] uppercase tracking-[0.2rem] text-editorial-muted">Engenheiro Coelho, SP</span>
          <span className="text-[0.65rem] uppercase tracking-[0.1rem] text-gold">•</span>
          <span className="text-[0.65rem] uppercase tracking-[0.2rem] text-editorial-muted">Desde 2017</span>
        </div>

        <button onClick={() => setShowAdminLogin(!showAdminLogin)} className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[0.5rem] uppercase tracking-[0.4rem] text-white/5 hover:text-gold transition-all duration-700">Acesso Restrito</button>

        <p className="text-[0.65rem] uppercase tracking-[0.3rem] text-gold font-bold">© 2024 PK Barbershop</p>
        <div className="text-right text-xs text-editorial-muted italic">Excelência em barbearia por mais de 7 anos no mercado.</div>

        {showAdminLogin && (
          <div className="fixed inset-0 bg-editorial-bg flex items-center justify-center z-[100] backdrop-blur-xl p-6">
             <div className="bg-white/[0.02] border border-gold/20 p-10 max-w-sm w-full text-center">
                <p className="uppercase tracking-[0.4rem] text-xs text-editorial-muted mb-8 italic">Painel de Acesso</p>
                <input type="password" maxLength={4} value={adminPinInput} onChange={(e) => setAdminPinInput(e.target.value)} placeholder="PIN" className="w-full bg-transparent border-b border-gold text-center text-4xl py-4 outline-none text-gold font-serif mb-8" />
                <div className="flex gap-4">
                   <button onClick={toggleAdmin} className="flex-1 bg-gold text-editorial-bg py-4 font-bold uppercase tracking-widest text-xs">Entrar</button>
                   <button onClick={() => setShowAdminLogin(false)} className="px-6 py-4 border border-white/10 text-editorial-muted">✕</button>
                </div>
             </div>
          </div>
        )}
      </footer>
    </div>
  );
}
