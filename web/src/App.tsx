import { useState } from 'react'
import { Activity, Users, CalendarCheck, ClipboardList, Building2, Settings, Search, Bell, ChevronDown, Clock3, CheckCircle2, CircleAlert, Menu } from 'lucide-react'

const modules = [
  { title: 'Data Organisasi', desc: 'Kelola profil dan unit organisasi', icon: Building2, color: 'teal' },
  { title: 'Data Anggota', desc: 'Siswa, karyawan, guru, dan anggota', icon: Users, color: 'blue' },
  { title: 'Presensi', desc: 'Catat kehadiran harian', icon: CalendarCheck, color: 'violet' },
  { title: 'Laporan', desc: 'Rekap dan ekspor kehadiran', icon: ClipboardList, color: 'amber' },
]
const activities = [
  { name: 'Profil organisasi', detail: 'Lengkapi identitas organisasi Anda', status: 'Perlu diatur' },
  { name: 'Data anggota', detail: 'Tambahkan anggota untuk memulai presensi', status: 'Menunggu' },
  { name: 'Sesi presensi', detail: 'Buat sesi presensi pertama', status: 'Menunggu' },
]
function Stat({ icon: Icon, label, note, color }: any) {
  return <article className="stat-card"><div className={'stat-icon '+color}><Icon size={19}/></div><p>{label}</p><strong>—</strong><small>{note}</small></article>
}
export default function App() {
  const [active, setActive] = useState('Ringkasan')
  const [menuOpen, setMenuOpen] = useState(false)
  const nav = [{label:'Ringkasan',icon:Activity},{label:'Organisasi',icon:Building2},{label:'Data Anggota',icon:Users},{label:'Presensi',icon:CalendarCheck},{label:'Laporan',icon:ClipboardList}]
  return <div className="app-shell">
    <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark"><CalendarCheck size={21}/></div><div><strong>HADIRKU</strong><small>Attendance Platform</small></div></div>
      <div className="org-switch"><div className="org-avatar">O</div><div><b>Organisasi Saya</b><small>Workspace utama</small></div><ChevronDown size={16}/></div>
      <p className="nav-caption">MENU UTAMA</p>
      <nav>{nav.map(item => <button key={item.label} className={active===item.label?'nav-item selected':'nav-item'} onClick={()=>{setActive(item.label);setMenuOpen(false)}}><item.icon size={18}/><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item" onClick={()=>setActive('Pengaturan')}><Settings size={18}/>Pengaturan</button><div className="help-card"><b>Butuh bantuan?</b><p>Pusat bantuan HADIRKU akan segera hadir.</p></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMenuOpen(!menuOpen)}><Menu/></button><div className="breadcrumb">Workspace <span>/</span> <b>{active}</b></div><div className="top-actions"><button className="icon-button"><Search size={18}/></button><button className="icon-button"><Bell size={18}/></button><div className="profile"><div className="profile-avatar">A</div><div><b>Administrator</b><small>Admin organisasi</small></div><ChevronDown size={15}/></div></div></header>
      <div className="content">
        <section className="welcome-row"><div><p className="eyebrow">DASHBOARD ORGANISASI</p><h1>{active==='Ringkasan'?'Selamat datang di HADIRKU':active}</h1><p className="muted">Kelola kehadiran dan aktivitas organisasi dalam satu tempat.</p></div><div className="date-chip"><Clock3 size={16}/> Workspace awal</div></section>
        <section className="notice"><div className="notice-icon"><CircleAlert size={19}/></div><div><b>Workspace baru siap disiapkan</b><p>Lengkapi profil organisasi dan data anggota untuk mulai menggunakan presensi.</p></div><button onClick={()=>setActive('Organisasi')}>Atur organisasi <span>→</span></button></section>
        <section className="stats-grid"><Stat icon={Users} label="Total Anggota" note="Belum ada data anggota" color="teal"/><Stat icon={CalendarCheck} label="Hadir Hari Ini" note="Menunggu data presensi" color="blue"/><Stat icon={Clock3} label="Terlambat" note="Menunggu data presensi" color="amber"/><Stat icon={CheckCircle2} label="Tingkat Kehadiran" note="Akan dihitung otomatis" color="violet"/></section>
        <section className="section-heading"><div><h2>Modul HADIRKU</h2><p>Pilih bagian yang ingin Anda kelola.</p></div></section>
        <section className="module-grid">{modules.map(m=><button className="module-card" key={m.title} onClick={()=>setActive(m.title.replace('Data ','').replace('Organisasi','Organisasi'))}><div className={'module-icon '+m.color}><m.icon size={21}/></div><div><b>{m.title}</b><p>{m.desc}</p></div><span className="arrow">→</span></button>)}</section>
        <section className="lower-grid"><article className="panel"><div className="panel-heading"><div><h2>Langkah berikutnya</h2><p>Persiapan awal organisasi</p></div><span className="pill">3 langkah</span></div>{activities.map((a,i)=><div className="activity-row" key={a.name}><div className="step-number">{i+1}</div><div className="activity-info"><b>{a.name}</b><small>{a.detail}</small></div><span className="status">{a.status}</span></div>)}</article><article className="panel tip-panel"><div className="tip-symbol"><Activity size={22}/></div><h2>Satu platform, banyak kebutuhan</h2><p>HADIRKU dirancang fleksibel untuk sekolah, pesantren, yayasan, perusahaan, kursus, komunitas, dan organisasi lainnya.</p><div className="tip-footer">HADIRKU <span>•</span> Attendance made simple</div></article></section>
        <footer>© 2026 HADIRKU. Platform presensi untuk semua organisasi.</footer>
      </div>
    </main>
  </div>
}