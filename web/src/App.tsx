import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, Users, CalendarCheck, ClipboardList, Building2, Settings, Bell, ChevronDown, Clock3, CheckCircle2, CircleAlert, Menu, LogOut, Plus, Loader2, ShieldCheck } from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import type { User } from '@supabase/supabase-js'

type Organization = { id: string; name: string; organization_type: string; timezone: string }
type Page = 'Ringkasan' | 'Organisasi' | 'Data Anggota' | 'Presensi' | 'Laporan' | 'Pengaturan'

const nav = [{label:'Ringkasan' as Page,icon:Activity},{label:'Organisasi' as Page,icon:Building2},{label:'Data Anggota' as Page,icon:Users},{label:'Presensi' as Page,icon:CalendarCheck},{label:'Laporan' as Page,icon:ClipboardList}]
const orgTypes = ['Sekolah','Yayasan','Pesantren','Perusahaan','Kursus','Komunitas','Organisasi Lainnya']

function AuthScreen({ onDone }: { onDone: () => void }) {
  const [mode,setMode] = useState<'login'|'register'|'reset'>('login')
  const [name,setName] = useState('')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const [error,setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!supabase) return
    setBusy(true); setError(''); setMessage('')
    try {
      if (mode === 'register') {
        const {data,error} = await supabase.auth.signUp({email,password,options:{data:{full_name:name,display_name:name}}})
        if(error) throw error
        if(data.session) onDone()
        else setMessage('Pendaftaran berhasil. Silakan periksa email untuk verifikasi sebelum masuk.')
      } else if (mode === 'reset') {
        const {error} = await supabase.auth.resetPasswordForEmail(email)
        if(error) throw error
        setMessage('Jika email terdaftar, tautan pemulihan akan dikirim ke kotak masuk Anda.')
      } else {
        const {error} = await supabase.auth.signInWithPassword({email,password})
        if(error) throw error
        onDone()
      }
    } catch(err) { setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.') }
    finally { setBusy(false) }
  }
  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand"><div className="brand-mark"><CalendarCheck size={22}/></div><div><strong>HADIRKU</strong><small>Attendance Platform</small></div></div>
    <p className="eyebrow">SATU PLATFORM, SEMUA ORGANISASI</p>
    <h1>{mode==='login'?'Selamat datang kembali':mode==='register'?'Buat akun HADIRKU':'Pulihkan kata sandi'}</h1>
    <p className="auth-sub">{mode==='login'?'Masuk untuk mengelola kehadiran organisasi Anda.':mode==='register'?'Daftar untuk mulai membangun workspace presensi.':'Kami akan mengirim tautan pemulihan ke email Anda.'}</p>
    <form onSubmit={submit}>
      {mode==='register' && <label>Nama lengkap<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Nama Anda"/></label>}
      <label>Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com"/></label>
      {mode!=='reset' && <label>Kata sandi<input required minLength={6} type="password" autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter"/></label>}
      {error && <div className="form-error">{error}</div>}{message && <div className="form-success">{message}</div>}
      <button className="primary-btn" disabled={busy}>{busy?<Loader2 className="spin" size={17}/>:null}{mode==='login'?'Masuk':mode==='register'?'Daftar akun':'Kirim tautan pemulihan'}</button>
    </form>
    <div className="auth-links">
      {mode==='login' && <><button onClick={()=>{setMode('register');setError('');setMessage('')}}>Belum punya akun? Daftar</button><button onClick={()=>{setMode('reset');setError('');setMessage('')}}>Lupa kata sandi?</button></>}
      {mode!=='login' && <button onClick={()=>{setMode('login');setError('');setMessage('')}}>Kembali ke halaman masuk</button>}
    </div>
    <div className="auth-security"><ShieldCheck size={15}/> Data organisasi dilindungi dengan akses berbasis peran.</div>
  </section></main>
}

function App() {
  const [user,setUser] = useState<User|null>(null)
  const [authLoading,setAuthLoading] = useState(true)
  const [organizations,setOrganizations] = useState<Organization[]>([])
  const [organization,setOrganization] = useState<Organization|null>(null)
  const [page,setPage] = useState<Page>('Ringkasan')
  const [menuOpen,setMenuOpen] = useState(false)
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  const [peopleCount,setPeopleCount] = useState(0)
  const [sessionCount,setSessionCount] = useState(0)
  const [orgName,setOrgName] = useState('')
  const [orgType,setOrgType] = useState('Sekolah')
  const [creating,setCreating] = useState(false)

  useEffect(()=>{
    if(!supabase){setAuthLoading(false);return}
    supabase.auth.getSession().then(({data})=>{setUser(data.session?.user??null);setAuthLoading(false)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setUser(session?.user??null)})
    return ()=>subscription.unsubscribe()
  },[])

  const loadOrganizations = useCallback(async()=>{
    if(!supabase||!user)return
    setLoading(true);setError('')
    const {data:memberships,error:memberError}=await supabase.from('organization_memberships').select('organization_id').eq('user_id',user.id).eq('membership_status','active')
    if(memberError){setError(memberError.message);setLoading(false);return}
    const ids=(memberships??[]).map(m=>m.organization_id)
    if(!ids.length){setOrganizations([]);setOrganization(null);setLoading(false);return}
    const {data:orgs,error:orgError}=await supabase.from('organizations').select('id,name,organization_type,timezone').in('id',ids).eq('is_active',true).order('name')
    if(orgError){setError(orgError.message);setLoading(false);return}
    const list=(orgs??[]) as Organization[]
    setOrganizations(list)
    setOrganization(current=>current&&list.some(o=>o.id===current.id)?list.find(o=>o.id===current.id)??null:list[0]??null)
    setLoading(false)
  },[user])

  useEffect(()=>{if(user)void loadOrganizations();else{setOrganizations([]);setOrganization(null)}},[user,loadOrganizations])

  useEffect(()=>{
    async function loadStats(){
      if(!supabase||!organization)return
      const [people,sessions]=await Promise.all([
        supabase.from('people').select('id',{count:'exact',head:true}).eq('organization_id',organization.id).eq('is_active',true),
        supabase.from('attendance_sessions').select('id',{count:'exact',head:true}).eq('organization_id',organization.id)
      ])
      setPeopleCount(people.count??0);setSessionCount(sessions.count??0)
    }
    void loadStats()
  },[organization])

  async function createOrganization(e:FormEvent){
    e.preventDefault();if(!supabase)return
    setCreating(true);setError('')
    const {data,error}=await supabase.rpc('create_organization',{p_name:orgName.trim(),p_organization_type:orgType,p_timezone:'Asia/Makassar'})
    if(error){setError(error.message);setCreating(false);return}
    await loadOrganizations()
    if(data){const {data:org}=await supabase.from('organizations').select('id,name,organization_type,timezone').eq('id',data).single();if(org){setOrganization(org as Organization);setPage('Ringkasan')}}
    setOrgName('');setCreating(false)
  }
  async function logout(){if(supabase)await supabase.auth.signOut()}
  const displayName=user?.user_metadata?.display_name||user?.email?.split('@')[0]||'Pengguna'

  if(!isSupabaseConfigured)return <main className="auth-shell"><section className="auth-card"><div className="auth-brand"><div className="brand-mark"><CalendarCheck/></div><strong>HADIRKU</strong></div><h1>Konfigurasi diperlukan</h1><p className="auth-sub">Tambahkan URL Supabase dan publishable key ke file <code>web/.env.local</code> untuk mengaktifkan login.</p><pre>VITE_SUPABASE_URL=https://qmmdhjjezuflznapalbo.supabase.co{ '\n' }VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...</pre></section></main>
  if(authLoading)return <main className="loading-screen"><Loader2 className="spin"/> Memuat HADIRKU...</main>
  if(!user)return <AuthScreen onDone={()=>{}}/>

  return <div className="app-shell">
    <aside className={menuOpen?'sidebar open':'sidebar'}>
      <div className="brand"><div className="brand-mark"><CalendarCheck size={21}/></div><div><strong>HADIRKU</strong><small>Attendance Platform</small></div></div>
      {organization?<div className="org-switch"><div className="org-avatar">{organization.name.slice(0,1).toUpperCase()}</div><div className="org-switch-text"><b>{organization.name}</b><small>{organization.organization_type}</small></div><ChevronDown size={16}/></div>:<div className="org-switch"><div className="org-avatar">+</div><div className="org-switch-text"><b>Belum ada organisasi</b><small>Buat workspace pertama</small></div></div>}
      <p className="nav-caption">MENU UTAMA</p>
      <nav>{nav.map(item=><button key={item.label} className={page===item.label?'nav-item selected':'nav-item'} onClick={()=>{setPage(item.label);setMenuOpen(false)}}><item.icon size={18}/><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-bottom"><button className={'nav-item '+(page==='Pengaturan'?'selected':'')} onClick={()=>setPage('Pengaturan')}><Settings size={18}/>Pengaturan</button><div className="help-card"><b>HADIRKU untuk semua</b><p>Kelola kehadiran sekolah, pesantren, perusahaan, kursus, dan komunitas.</p></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMenuOpen(!menuOpen)}><Menu/></button><div className="breadcrumb">Workspace <span>/</span> <b>{page}</b></div><div className="top-actions"><button className="icon-button" title="Notifikasi"><Bell size={18}/></button><div className="profile"><div className="profile-avatar">{displayName.slice(0,1).toUpperCase()}</div><div><b>{displayName}</b><small>{user.email}</small></div><button className="icon-button" onClick={logout} title="Keluar"><LogOut size={17}/></button></div></div></header>
      <div className="content">
        {error&&<div className="form-error page-error">{error}</div>}
        {page==='Organisasi'?<><section className="welcome-row"><div><p className="eyebrow">WORKSPACE ORGANISASI</p><h1>Organisasi Anda</h1><p className="muted">Kelola ruang kerja yang terhubung dengan akun ini.</p></div></section>
          <section className="panel org-panel"><div className="panel-heading"><div><h2>Buat organisasi baru</h2><p>Setiap organisasi memiliki data dan akses yang terpisah.</p></div><Building2 size={22}/></div><form className="org-form" onSubmit={createOrganization}><label>Nama organisasi<input required value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="Contoh: SMP Harapan Bangsa"/></label><label>Jenis organisasi<select value={orgType} onChange={e=>setOrgType(e.target.value)}>{orgTypes.map(t=><option key={t}>{t}</option>)}</select></label><button className="primary-btn" disabled={creating||!orgName.trim()}>{creating?<Loader2 className="spin" size={17}/>:<Plus size={17}/>} Buat organisasi</button></form></section>
          <section className="panel org-list"><div className="panel-heading"><div><h2>Daftar organisasi</h2><p>{organizations.length} organisasi terhubung</p></div></div>{organizations.length?organizations.map(o=><button className={'org-list-item '+(organization?.id===o.id?'current':'')} key={o.id} onClick={()=>{setOrganization(o);setPage('Ringkasan')}}><div className="org-avatar">{o.name.slice(0,1).toUpperCase()}</div><div><b>{o.name}</b><small>{o.organization_type} · {o.timezone}</small></div><span>{organization?.id===o.id?'Sedang aktif':'Buka workspace →'}</span></button>):<p className="empty-state">Belum ada organisasi. Buat organisasi pertama untuk memulai.</p>}</section>
        </>:!organization?<section className="empty-org"><div className="empty-icon"><Building2 size={28}/></div><p className="eyebrow">MULAI DARI SINI</p><h1>Buat workspace organisasi</h1><p>Tambahkan organisasi pertama agar Anda dapat mengelola anggota dan presensi.</p><button className="primary-btn" onClick={()=>setPage('Organisasi')}><Plus size={17}/> Buat organisasi</button></section>
        :page==='Ringkasan'?<><section className="welcome-row"><div><p className="eyebrow">DASHBOARD ORGANISASI</p><h1>Selamat datang, {displayName}</h1><p className="muted">Ringkasan aktivitas <b>{organization.name}</b>.</p></div><div className="date-chip"><Clock3 size={16}/> {organization.timezone}</div></section>
          <section className="notice"><div className="notice-icon"><CircleAlert size={19}/></div><div><b>Workspace {organization.name} aktif</b><p>Mulai dengan menambahkan data anggota dan membuat sesi presensi.</p></div><button onClick={()=>setPage('Data Anggota')}>Kelola anggota →</button></section>
          <section className="stats-grid"><Stat icon={Users} label="Total Anggota" value={String(peopleCount)} note="Anggota aktif" color="teal"/><Stat icon={CalendarCheck} label="Sesi Presensi" value={String(sessionCount)} note="Total sesi tercatat" color="blue"/><Stat icon={Clock3} label="Hadir Hari Ini" value="—" note="Ringkasan presensi menyusul" color="amber"/><Stat icon={CheckCircle2} label="Tingkat Kehadiran" value="—" note="Akan dihitung dari data presensi" color="violet"/></section>
          <section className="section-heading"><div><h2>Modul HADIRKU</h2><p>Pilih bagian yang ingin Anda kelola.</p></div></section><section className="module-grid">{[{title:'Data Organisasi',desc:'Profil dan unit organisasi',icon:Building2,target:'Organisasi' as Page,color:'teal'},{title:'Data Anggota',desc:'Siswa, karyawan, guru, anggota',icon:Users,target:'Data Anggota' as Page,color:'blue'},{title:'Presensi',desc:'Catat kehadiran harian',icon:CalendarCheck,target:'Presensi' as Page,color:'violet'},{title:'Laporan',desc:'Rekap dan ekspor kehadiran',icon:ClipboardList,target:'Laporan' as Page,color:'amber'}].map(m=><button className="module-card" key={m.title} onClick={()=>setPage(m.target)}><div className={'module-icon '+m.color}><m.icon size={21}/></div><div><b>{m.title}</b><p>{m.desc}</p></div><span className="arrow">→</span></button>)}</section>
          <section className="lower-grid"><article className="panel"><div className="panel-heading"><div><h2>Langkah berikutnya</h2><p>Persiapan awal organisasi</p></div><span className="pill">3 langkah</span></div>{['Lengkapi profil organisasi','Tambahkan data anggota','Buat sesi presensi pertama'].map((s,i)=><div className="activity-row" key={s}><div className="step-number">{i+1}</div><div className="activity-info"><b>{s}</b><small>{i===0?'Periksa informasi organisasi':i===1?'Masukkan data siswa atau karyawan':'Mulai pencatatan kehadiran'}</small></div><span className="status">{i===0?'Tersedia':'Berikutnya'}</span></div>)}</article><article className="panel tip-panel"><div className="tip-symbol"><Activity size={22}/></div><h2>Satu platform, banyak kebutuhan</h2><p>HADIRKU dirancang fleksibel untuk sekolah, pesantren, yayasan, perusahaan, kursus, dan komunitas.</p><div className="tip-footer">HADIRKU <span>•</span> Attendance made simple</div></article></section>
        </>:<section className="empty-org"><div className="empty-icon"><ClipboardList size={27}/></div><p className="eyebrow">MODUL BERIKUTNYA</p><h1>{page}</h1><p>Workspace sudah terhubung. Modul {page.toLowerCase()} sedang disiapkan agar terhubung penuh dengan database.</p><button className="secondary-btn" onClick={()=>setPage('Ringkasan')}>Kembali ke ringkasan</button></section>}
        <footer>© 2026 HADIRKU. Platform presensi untuk semua organisasi.</footer>
      </div>
    </main>
  </div>
}
function Stat({icon:Icon,label,value,note,color}:any){return <article className="stat-card"><div className={'stat-icon '+color}><Icon size={19}/></div><p>{label}</p><strong>{value}</strong><small>{note}</small></article>}
export default App
