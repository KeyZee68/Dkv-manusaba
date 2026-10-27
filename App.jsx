import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Calendar, ClipboardList, Users, Image as ImageIcon, MessageCircle, LogIn, LogOut, Plus, Loader } from 'lucide-react';
import { auth, db, storage } from './firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const jadwalPelajaran = [
  { hari: 'Senin', mapel: 'Upacara, Matematika, Desain Grafis, Sejarah' },
  { hari: 'Selasa', mapel: 'Bahasa Indonesia, Tipografi, PKN, Agama' },
  { hari: 'Rabu', mapel: 'Fotografi, Bahasa Inggris, Penjas' },
  { hari: 'Kamis', mapel: 'Kewirausahaan, Videografi, Seni Budaya' },
  { hari: 'Jumat', mapel: 'Pramuka, BK, Muatan Lokal' }
];

const jadwalPiket = [
  { hari: 'Senin', siswa: 'Budi, Siti, Anton' },
  { hari: 'Selasa', siswa: 'Agus, Rina, Doni' },
  { hari: 'Rabu', siswa: 'Eka, Fajar, Gita' },
  { hari: 'Kamis', siswa: 'Hadi, Indah, Joko' },
  { hari: 'Jumat', siswa: 'Kiki, Lutfi, Maya' }
];

const strukturKelas = [
  { jabatan: 'Wali Kelas', nama: 'Bpk. Hendra S.Pd' },
  { jabatan: 'Ketua Kelas', nama: 'Budi Santoso' },
  { jabatan: 'Wakil Ketua', nama: 'Anton Syahputra' },
  { jabatan: 'Sekretaris', nama: 'Siti Aminah' },
  { jabatan: 'Bendahara', nama: 'Rina Wijaya' }
];

const Navbar = ({ user }) => {
  const location = useLocation();
  const navItems = [
    { path: '/', icon: <Calendar size={24} />, label: 'Jadwal' },
    { path: '/piket', icon: <ClipboardList size={24} />, label: 'Piket' },
    { path: '/struktur', icon: <Users size={24} />, label: 'Struktur' },
    { path: '/album', icon: <ImageIcon size={24} />, label: 'Album' },
    { path: '/chat', icon: user ? <MessageCircle size={24} /> : <LogIn size={24} />, label: user ? 'Chat' : 'Login' }
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-surface border-t border-gray-200 pb-safe md:top-0 md:bottom-auto z-50">
      <div className="max-w-md mx-auto md:max-w-4xl flex justify-around p-2 md:p-4">
        {navItems.map((item) => (
          <Link key={item.path} to={item.path} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location.pathname === item.path ? 'text-primary' : 'text-slate600 hover:text-primary hover:bg-gray-50'}`}>
            {item.icon}
            <span className="text-[10px] md:text-xs font-medium mt-1">{item.label}</span>
            {location.pathname === item.path && <div className="w-1 h-1 bg-primary rounded-full mt-1" />}
          </Link>
        ))}
      </div>
    </nav>
  );
};

const Jadwal = () => (
  <div className="p-4 pb-24 md:pt-24 max-w-md mx-auto">
    <h1 className="text-2xl font-display font-bold mb-6">Jadwal Pelajaran</h1>
    <div className="space-y-4">
      {jadwalPelajaran.map((j) => (
        <div key={j.hari} className="bg-surface p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-primary mb-2">{j.hari}</h2>
          <p className="text-slate600 text-sm">{j.mapel}</p>
        </div>
      ))}
    </div>
  </div>
);

const Piket = () => (
  <div className="p-4 pb-24 md:pt-24 max-w-md mx-auto">
    <h1 className="text-2xl font-display font-bold mb-6">Jadwal Piket</h1>
    <div className="space-y-4">
      {jadwalPiket.map((p) => (
        <div key={p.hari} className="bg-surface p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
          <span className="font-bold text-slate900">{p.hari}</span>
          <span className="text-sm text-slate600">{p.siswa}</span>
        </div>
      ))}
    </div>
  </div>
);

const Struktur = () => (
  <div className="p-4 pb-24 md:pt-24 max-w-md mx-auto">
    <h1 className="text-2xl font-display font-bold mb-6">Struktur Kelas</h1>
    <div className="bg-surface rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {strukturKelas.map((s, i) => (
        <div key={i} className={`p-4 flex justify-between items-center ${i !== strukturKelas.length - 1 ? 'border-b border-gray-100' : ''}`}>
          <span className="text-sm text-slate600">{s.jabatan}</span>
          <span className="font-bold text-primary text-right">{s.nama}</span>
        </div>
      ))}
    </div>
  </div>
);

const Album = ({ user, role }) => {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'photos'), orderBy('uploaded_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setError('Maksimal ukuran foto 2MB (JPG/PNG).');
    
    setUploading(true);
    setError('');
    try {
      const storageRef = ref(storage, `album/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, 'photos'), { image_url: url, uploaded_at: serverTimestamp() });
    } catch (err) {
      setError('Gagal mengunggah foto. Periksa koneksi.');
    }
    setUploading(false);
  };

  return (
    <div className="p-4 pb-24 md:pt-24 max-w-4xl mx-auto">
      <h1 className="text-2xl font-display font-bold mb-6">Album Kelas</h1>
      {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      
      {photos.length === 0 && !uploading ? (
        <div className="text-center text-slate600 mt-10">Belum ada momen yang diabadikan.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
          {photos.map((p) => (
            <div key={p.id} className="aspect-square bg-gray-200 rounded-xl overflow-hidden shadow-sm">
              <img src={p.image_url} alt="Dokumentasi" className="w-full h-full object-cover hover:scale-105 transition-transform" loading="lazy" />
            </div>
          ))}
        </div>
      )}

      {role === 'admin' && (
        <label className="fixed bottom-20 right-4 md:bottom-8 md:right-8 bg-primary text-white p-4 rounded-full shadow-lg cursor-pointer hover:bg-indigo-700 transition-colors z-40 flex items-center justify-center">
          {uploading ? <Loader className="animate-spin" size={24} /> : <Plus size={24} />}
          <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      )}
    </div>
  );
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/chat');
    } catch (err) {
      setError('Kredensial tidak valid. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pb-24 md:pt-24 max-w-md mx-auto flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full bg-surface p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-display font-bold text-center mb-6">Login Internal</h1>
        {error && <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg mb-4 text-center">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-slate600 mb-1">Email Siswa</label>
            <input type="email" required className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-slate600 mb-1">Password</label>
            <input type="password" required className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {loading ? 'Masuk...' : 'Masuk ke Forum'}
          </button>
        </form>
        <p className="text-xs text-center text-slate600 mt-4">Lupa password? Hubungi Ketua Kelas.</p>
      </div>
    </div>
  );
};

const Chat = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('created_at', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return unsub;
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        user_id: user.uid,
        name: user.email.split('@')[0],
        content: text.trim(),
        created_at: serverTimestamp()
      });
      setText('');
    } catch (err) {
      alert("Gagal mengirim pesan (Spam protection aktif / Koneksi terputus)");
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto md:pt-16 pb-16">
      <div className="bg-surface border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-lg font-display font-bold">Obrolan Kelas</h1>
        <button onClick={() => signOut(auth)} className="text-red-500 flex items-center text-sm font-medium"><LogOut size={16} className="mr-1"/> Keluar</button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base" aria-live="polite">
        {messages.map((m) => {
          const isMe = m.user_id === user.uid;
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && <span className="text-[10px] text-slate600 ml-1 mb-1">{m.name}</span>}
              <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-white border border-gray-200 text-slate900 rounded-bl-none'}`}>
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="bg-surface p-3 border-t border-gray-200 flex gap-2">
        <input type="text" maxLength={500} placeholder="Ketik pesan..." className="flex-1 bg-gray-100 border-transparent rounded-full px-4 py-2 text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary outline-none transition-all" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" disabled={!text.trim() || sending} className="bg-primary text-white p-2 rounded-full disabled:opacity-50 hover:bg-indigo-700">
          <MessageCircle size={20} />
        </button>
      </form>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          const docRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) setRole(docSnap.data().role);
        } catch (e) { console.error(e); }
      } else {
        setUser(null);
        setRole('student');
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return <div className="h-screen flex justify-center items-center text-primary"><Loader className="animate-spin" size= {40} /></div>;

  return (
    <BrowserRouter>
      <Navbar user={user} />
      <Routes>
        <Route path="/" element={<Jadwal />} />
        <Route path="/piket" element={<Piket />} />
        <Route path="/struktur" element={<Struktur />} />
        <Route path="/album" element={<Album user={user} role={role} />} />
        <Route path="/login" element={user ? <Navigate to="/chat" /> : <Login />} />
        <Route path="/chat" element={user ? <Chat user={user} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

