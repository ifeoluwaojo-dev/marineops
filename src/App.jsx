import React, {useCallback,useEffect,useMemo,useState} from 'react';
import {
  Activity, AlertCircle, AlertTriangle, Anchor, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, CheckCircle2,
  ChevronDown, ChevronRight, Clock3, Cloud, Database, Download, ExternalLink, FileText, Filter, Fuel, Gauge,
  LayoutDashboard, LockKeyhole, LogOut, Mail, MapPin, Menu, Pencil, Plus, RefreshCw, Search, ShieldCheck, Ship, Trash2, Waves, Wrench, X
} from 'lucide-react';
import {Area,AreaChart,Bar,BarChart,CartesianGrid,Cell,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {makeDemoData,loadDemoData,saveDemoData,isoDate} from './lib/demo.js';
import {applyDemoOperation} from './lib/records.js';
import {cloudReady,supabase,getAllRecords,cloudWrite} from './lib/supabase.js';
import {daysUntil,taskIsOverdue,taskIsDueSoon,fmtNumber,fmtDate,monthlyFuel,vesselStats,sum,tableToCSV} from './lib/metrics.js';

const EMPTY={vessels:[],maintenance:[],fuel_logs:[]};
const NAV_ITEMS=[
  {id:'overview',label:'Overview',icon:LayoutDashboard},
  {id:'vessels',label:'Vessel fleet',icon:Ship},
  {id:'maintenance',label:'Maintenance',icon:Wrench},
  {id:'fuel',label:'Fuel analytics',icon:Fuel},
  {id:'reports',label:'Reports & exports',icon:FileText},
];
const ENTITY_TITLE={vessels:'vessel',maintenance:'maintenance task',fuel_logs:'fuel log'};
const VESSEL_STATUSES=['At sea','In port','Maintenance'];
const TASK_STATUSES=['Open','In progress','Completed'];
const PRI=['Critical','High','Medium','Low'];
const PALETTE=['#239d91','#4e82cf','#c79255','#7558af','#5a7a83'];
const ymdToday=()=>isoDate(0);
const getName=(vessels,id)=>vessels.find(v=>String(v.id)===String(id))?.name||'Unknown vessel';

function Logo({compact=false}) {
  return <div className="logo-lockup"><span className="logo-emblem"><Waves size={23} strokeWidth={2.3}/></span>{!compact&&<span>marine<span className="logo-highlight">ops</span><sup>®</sup></span>}</div>;
}
function StatusPill({status}){
  const c=status==='At sea'||status==='Completed'?'green':status==='In port'||status==='In progress'?'blue':status==='Maintenance'||status==='Critical'?'amber':'neutral';
  return <span className={`status-pill ${c}`}><span className="status-dot"/>{status}</span>;
}
function PriorityPill({priority}){
  const c=priority==='Critical'?'critical':priority==='High'?'high':priority==='Medium'?'medium':'low';
  return <span className={`priority-pill ${c}`}>{priority}</span>;
}
function EmptyState({icon:Icon=Ship,title,description,action,onAction}){
  return <div className="empty-state"><span className="empty-icon"><Icon size={27}/></span><h3>{title}</h3><p>{description}</p>{action&&<button className="btn btn-primary" onClick={onAction}><Plus size={16}/>{action}</button>}</div>;
}
function Toast({notice,onDismiss}){
  if(!notice)return null;
  return <div className={`toast ${notice.kind==='error'?'toast-error':''}`} role="status"><span>{notice.kind==='error'?<AlertCircle size={20}/>:<CheckCircle2 size={20}/>}</span><span>{notice.message}</span><button aria-label="Dismiss message" onClick={onDismiss}><X size={16}/></button></div>;
}
function Header({page,setPage,stats,mode,user,onLogin,onLogout,onMenu,onCreate}){
 const label=NAV_ITEMS.find(x=>x.id===page)?.label||'Overview';
 return <header className="main-header">
   <div className="header-left"><button className="icon-btn mobile-menu" aria-label="Open navigation" onClick={onMenu}><Menu size={21}/></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={15}/><strong>{label}</strong></div></div>
   <div className="header-right">
     <span className="header-date"><CalendarDays size={15}/>{new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
     <button className="icon-btn notifications" aria-label={`${stats.overdue} overdue maintenance tasks`} title="View overdue tasks" onClick={()=>setPage('maintenance')}><Bell size={19}/>{stats.overdue>0&&<span className="notif-dot"/>}</button>
     <span className="header-divider"/>
     {mode==='cloud'&&user?<button className="account-chip" onClick={onLogout} title="Sign out"><span className="avatar-circle">{user.email?.[0]?.toUpperCase()||'U'}</span><span className="user-email">{user.email}</span><LogOut size={15}/></button>:<button className="account-chip" onClick={onLogin} title="Connect your workspace"><span className="avatar-circle demo-avatar">D</span><span className="user-email">Demo workspace</span><ChevronDown size={15}/></button>}
   </div>
 </header>;
}
function Sidebar({page,setPage,open,onClose,mode,user,stats,onLogin,onLogout}){
 return <><div className={`mobile-scrim ${open?'open':''}`} onClick={onClose}/><aside className={`sidebar ${open?'sidebar-open':''}`}>
   <div className="sidebar-top"><Logo/><button className="icon-btn close-sidebar" onClick={onClose} aria-label="Close navigation"><X size={19}/></button></div>
   <div className="workspace-selector"><span className="workspace-icon"><Anchor size={18}/></span><span className="workspace-copy"><strong>Fleet workspace</strong><small>Operations centre</small></span><ChevronDown size={16}/></div>
   <div className="side-nav-label">WORKSPACE</div><nav className="sidebar-nav">
     {NAV_ITEMS.map(({id,label,icon:Icon})=><button key={id} className={`nav-link ${page===id?'active':''}`} onClick={()=>{setPage(id);onClose()}}><Icon size={18} strokeWidth={2}/><span>{label}</span>{id==='maintenance'&&stats.overdue>0&&<span className="nav-counter">{stats.overdue}</span>}</button>)}
   </nav>
   <div className="sidebar-bottom">
     <div className="assist-card"><span className="assist-icon"><Activity size={20}/></span><strong>Built for better decisions.</strong><p>One calm place to manage vessels, maintenance and fuel operations.</p><span className="assist-pattern"/></div>
     <div className="side-nav-label small">ACCOUNT</div>
     <button className="nav-link side-account" onClick={mode==='cloud'&&user?onLogout:onLogin}>{mode==='cloud'&&user?<LogOut size={18}/>:<Database size={18}/>}<span>{mode==='cloud'?'Sign out':'Cloud connection'}</span><ArrowUpRight size={16}/></button>
     <div className="sidebar-footer"><span className="sidebar-online"/>MarineOps <span>v1.0</span></div>
   </div>
 </aside></>;
}
function MarineVisual({small=false}){
 return <div className={`marine-visual ${small?'small':''}`} aria-hidden="true">
  <div className="sonar-ring sonar-one"/><div className="sonar-ring sonar-two"/><div className="sonar-ring sonar-three"/>
  <svg viewBox="0 0 520 250" fill="none" role="img" aria-label="Illustration of a ship">
   <path d="M50 168H474L434 211H110L50 168Z" fill="#a4e3d7" fillOpacity=".2" stroke="#9bd9cc" strokeWidth="2"/>
   <path d="M58 169H475" stroke="#9bd9cc" strokeWidth="2"/><path d="M132 111H395V168H132V111Z" fill="#245b61" fillOpacity=".45" stroke="#8fd9c8" strokeWidth="2"/>
   <path d="M162 75H331V111H162V75Z" fill="#28515b" stroke="#9bd9cc" strokeWidth="2"/>
   <path d="M189 52H274V75H189V52Z" fill="#23545c" stroke="#9bd9cc" strokeWidth="2"/>
   <path d="M230 24V52M260 29V52M210 25V52" stroke="#b1f0e4" strokeWidth="3"/>
   <path d="M128 143H398M160 122V158M201 122V158M242 122V158M283 122V158M324 122V158M365 122V158" stroke="#91dfd2" strokeOpacity=".5"/>
   <rect x="199" y="85" width="22" height="12" rx="2" fill="#9bd9cc"/><rect x="231" y="85" width="22" height="12" rx="2" fill="#9bd9cc"/><rect x="263" y="85" width="22" height="12" rx="2" fill="#9bd9cc"/>
   <path d="M105 221C144 210 177 233 210 222C252 211 270 230 311 222C360 213 390 233 442 220" stroke="#9bd9cc" strokeOpacity=".65" strokeWidth="2"/>
   <path d="M80 236C128 226 157 244 209 235C252 228 287 246 329 235C370 225 414 244 458 232" stroke="#9bd9cc" strokeOpacity=".25" strokeWidth="2"/>
  </svg><span className="visual-label"><span className="pulse-dot"/> OPERATIONS ONLINE</span>
 </div>;
}
function MetricCard({icon:Icon,label,value,detail,variant='mint',trend,onClick}){
 return <button className={`metric-card metric-${variant}`} onClick={onClick} type="button"><div className="metric-top"><span className="metric-icon"><Icon size={19}/></span>{trend&&<span className="metric-trend"><ArrowUpRight size={13}/>{trend}</span>}</div><strong className="metric-value">{value}</strong><span className="metric-name">{label}</span><small>{detail}</small></button>;
}
function ChartTooltip({active,payload,label,unit='L'}){
 if(!active||!payload?.length)return null;
 return <div className="chart-tooltip"><span>{label}</span><strong>{fmtNumber(payload[0]?.value)} {unit}</strong></div>;
}
function PanelTitle({eyebrow,title,action,onAction}){
 return <div className="panel-title"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h3>{title}</h3></div>{action&&<button className="text-action" onClick={onAction}>{action}<ArrowUpRight size={16}/></button>}</div>;
}
function QuickTaskTable({tasks,vessels,onComplete,onEdit,limit}){
 const list=[...tasks].filter(t=>t.status!=='Completed').sort((a,b)=>a.due_date.localeCompare(b.due_date)).slice(0,limit||10);
 return list.length?<div className="table-wrapper"><table className="data-table"><thead><tr><th>Maintenance task</th><th>Vessel</th><th>Priority</th><th>Due date</th><th>Status</th><th aria-label="Actions"/></tr></thead><tbody>
 {list.map(t=><tr key={t.id}><td><button className="table-primary" onClick={()=>onEdit(t)}>{t.title}</button><div className="table-sub">{t.system}</div></td><td><span className="table-ship"><Ship size={14}/>{getName(vessels,t.vessel_id)}</span></td><td><PriorityPill priority={t.priority}/></td><td><span className={taskIsOverdue(t)?'overdue-text':''}>{fmtDate(t.due_date)}{taskIsOverdue(t)&&<span className="late-dot"/>}</span></td><td><StatusPill status={t.status}/></td><td><button aria-label={`Mark ${t.title} as completed`} title="Mark complete" className="table-icon" onClick={()=>onComplete(t)}><Check size={17}/></button></td></tr>)}
 </tbody></table></div>:<EmptyState icon={CheckCircle2} title="All caught up" description="There are no outstanding maintenance tasks."/>;
}
function Overview({data,stats,setPage,openForm,onComplete,onEdit}){
 const hour=new Date().getHours();
 const greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
 const series=monthlyFuel(data.fuel_logs);
 const byVessel=data.vessels.map((v,i)=>({name:v.name.split(' ').slice(-1)[0],litres:sum(data.fuel_logs.filter(f=>f.vessel_id===v.id),'liters'),color:PALETTE[i%PALETTE.length]}));
 const tasks=[...data.maintenance].filter(t=>t.status!=='Completed').sort((a,b)=>a.due_date.localeCompare(b.due_date));
 return <div className="view-container">
   <div className="welcome-row"><div><span className="eyebrow eyebrow-accent"><span className="eyebrow-line"/> FLEET INTELLIGENCE DASHBOARD</span><h1>{greeting}, <span>captain.</span></h1><p>Here's what's happening across your fleet today.</p></div><button className="btn btn-dark" onClick={()=>openForm('maintenance')}><Plus size={17}/>New maintenance task</button></div>
   <section className="hero-band"><div className="hero-content"><span className="hero-eyebrow"><span className="pulse-dot"/> FLEET STATUS · CURRENT WORKSPACE</span><h2>Your operations.<br/><em>In clearer view.</em></h2><p>From preventative maintenance to fuel performance, keep the important details within reach.</p><button className="hero-action" onClick={()=>setPage('vessels')}>Explore your fleet<ArrowUpRight size={17}/></button></div><MarineVisual/></section>
   <div className="section-heading"><h2>Fleet at a glance</h2><span>Based on your workspace records</span></div>
   <div className="metrics-grid">
    <MetricCard icon={Ship} label="Total vessels" value={fmtNumber(stats.total)} detail={`${stats.atSea} currently at sea`} variant="mint" onClick={()=>setPage('vessels')}/>
    <MetricCard icon={CalendarDays} label="Due in 14 days" value={fmtNumber(stats.dueSoon)} detail="Upcoming service tasks" variant="blue" onClick={()=>setPage('maintenance')}/>
    <MetricCard icon={AlertTriangle} label="Overdue tasks" value={fmtNumber(stats.overdue)} detail="Require attention" variant="peach" onClick={()=>setPage('maintenance')}/>
    <MetricCard icon={Fuel} label="Fuel recorded" value={`${fmtNumber(stats.fuel/1000,1)}k L`} detail="Across all recorded logs" variant="lavender" onClick={()=>setPage('fuel')}/>
   </div>
   <div className="insights-grid">
    <section className="white-panel fuel-trend"><PanelTitle eyebrow="PERFORMANCE" title="Fuel consumption trend" action="Full analytics" onAction={()=>setPage('fuel')}/><p className="panel-intro">Recorded fuel usage over the last six calendar months.</p><div className="chart-area" role="img" aria-label="Six-month fuel consumption chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={series} margin={{top:15,right:10,left:-18,bottom:0}}><defs><linearGradient id="fuelArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#159b8f" stopOpacity=".22"/><stop offset="100%" stopColor="#159b8f" stopOpacity="0"/></linearGradient></defs><CartesianGrid stroke="#edf1f1" vertical={false}/><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fill:'#84939b',fontSize:12}} dy={9}/><YAxis tickLine={false} axisLine={false} tick={{fill:'#84939b',fontSize:11}} tickFormatter={v=>`${Math.round(v/1000)}k`}/><Tooltip content={<ChartTooltip/>}/><Area dataKey="litres" type="monotone" stroke="#159b8f" strokeWidth={3} fill="url(#fuelArea)" activeDot={{r:5}}/></AreaChart></ResponsiveContainer></div><div className="chart-footnote"><span><span className="chart-dot"/> Consumption (litres)</span><span>Sample records when in demo mode</span></div></section>
    <section className="white-panel fleet-health"><PanelTitle eyebrow="FLEET PULSE" title="Operational overview" action="View vessels" onAction={()=>setPage('vessels')}/><p className="panel-intro">Your vessels by operational status.</p><div className="fleet-health-content"><div className="donut" style={{background:stats.total?`conic-gradient(#1eac95 0 ${stats.atSea/stats.total*100}%, #699acb ${stats.atSea/stats.total*100}% ${(stats.atSea+data.vessels.filter(v=>v.status==='In port').length)/stats.total*100}%, #dfac70 0)`: '#ebefed'}}><div className="donut-inner"><strong>{stats.total}</strong><span>Vessels</span></div></div><div className="fleet-legend"><div><span><i className="legend-dot sea"/>At sea</span><strong>{stats.atSea}</strong></div><div><span><i className="legend-dot port"/>In port</span><strong>{data.vessels.filter(v=>v.status==='In port').length}</strong></div><div><span><i className="legend-dot maintain"/>Maintenance</span><strong>{data.vessels.filter(v=>v.status==='Maintenance').length}</strong></div></div></div><div className="health-note"><Activity size={18}/><span>{stats.overdue===0?'Your maintenance schedule has no overdue tasks.':`${stats.overdue} maintenance ${stats.overdue===1?'task needs':'tasks need'} attention.`}</span></div></section>
   </div>
   <div className="insights-grid lower-insights">
    <section className="white-panel upcoming-panel"><PanelTitle eyebrow="PRIORITY WATCH" title="Upcoming maintenance" action="View all tasks" onAction={()=>setPage('maintenance')}/>{tasks.length?<div className="upcoming-list">{tasks.slice(0,4).map(t=><button className="upcoming-item" key={t.id} onClick={()=>onEdit(t)}><span className={`upcoming-marker ${taskIsOverdue(t)?'danger':''}`}><Wrench size={17}/></span><span className="upcoming-copy"><strong>{t.title}</strong><small>{getName(data.vessels,t.vessel_id)}</small></span><span className={`upcoming-when ${taskIsOverdue(t)?'late':''}`}>{taskIsOverdue(t)?`${Math.abs(daysUntil(t.due_date))}d overdue`:daysUntil(t.due_date)===0?'Due today':`In ${daysUntil(t.due_date)}d`}</span></button>)}</div>:<EmptyState icon={CheckCircle2} title="No tasks pending" description="Create a maintenance task to get started."/>}</section>
    <section className="white-panel by-vessel-panel"><PanelTitle eyebrow="FUEL SNAPSHOT" title="Consumption by vessel" action="View fuel logs" onAction={()=>setPage('fuel')}/><p className="panel-intro">All recorded fuel, grouped by vessel.</p><div className="bar-chart" role="img" aria-label="Fuel consumption by vessel"><ResponsiveContainer width="100%" height="100%"><BarChart data={byVessel} layout="vertical" margin={{left:0,right:17,top:0,bottom:0}}><CartesianGrid stroke="#eff3f3" horizontal={false}/><XAxis type="number" axisLine={false} tickLine={false} tick={{fill:'#88979e',fontSize:11}} tickFormatter={v=>`${Math.round(v/1000)}k`}/><YAxis type="category" dataKey="name" width={77} axisLine={false} tickLine={false} tick={{fill:'#5e717a',fontSize:12}}/><Tooltip content={<ChartTooltip/>}/><Bar dataKey="litres" radius={[0,5,5,0]} barSize={16}>{byVessel.map((v,i)=><Cell key={v.name} fill={v.color}/>)}</Bar></BarChart></ResponsiveContainer></div></section>
   </div>
   <section className="white-panel task-table-panel"><PanelTitle eyebrow="ACTIVITY" title="Maintenance queue" action="Open task board" onAction={()=>setPage('maintenance')}/><QuickTaskTable tasks={data.maintenance} vessels={data.vessels} onEdit={onEdit} onComplete={onComplete} limit={5}/></section>
  </div>;
}
function VesselCard({vessel,tasks,logs,onEdit,onDelete,onTask}){
 const active=tasks.filter(t=>t.vessel_id===vessel.id&&t.status!=='Completed').length;
 const totalFuel=sum(logs.filter(l=>l.vessel_id===vessel.id),'liters');
 return <article className="vessel-card"><div className="vessel-card-cover"><div className="vessel-card-top"><span className="vessel-code">{vessel.code}</span><span className="vessel-type">{vessel.type}</span></div><MarineVisual small/></div><div className="vessel-card-body"><div className="vessel-title-row"><div><h3>{vessel.name}</h3><p><MapPin size={14}/>{vessel.location||'Location not provided'}</p></div><StatusPill status={vessel.status}/></div><div className="vessel-data-grid"><div><small>Open tasks</small><strong>{active}</strong></div><div><small>Fuel recorded</small><strong>{fmtNumber(totalFuel/1000,1)}k L</strong></div><div><small>Built</small><strong>{vessel.year||'—'}</strong></div></div><div className="vessel-actions"><button onClick={()=>onEdit(vessel)} className="btn btn-outline"><Pencil size={15}/>Details & edit</button><button onClick={()=>onTask(vessel)} className="btn btn-soft"><Plus size={15}/>Task</button><button onClick={()=>onDelete(vessel)} title="Delete vessel" aria-label={`Delete ${vessel.name}`} className="btn btn-icon-danger"><Trash2 size={17}/></button></div></div></article>;
}
function Fleet({data,openForm,onDelete}){
 const [query,setQuery]=useState('');const [filter,setFilter]=useState('All vessels');
 const vessels=data.vessels.filter(v=>(filter==='All vessels'||v.status===filter)&&[v.name,v.code,v.type,v.location].join(' ').toLowerCase().includes(query.toLowerCase()));
 return <div className="view-container"><PageHeading eyebrow="FLEET MANAGEMENT" title="Your vessel fleet" description="Know your fleet, track its condition, and keep every vessel record in one place." action="Add new vessel" onAction={()=>openForm('vessels')}/>
 <div className="filterbar"><div className="search-field"><Search size={17}/><input aria-label="Search vessels" placeholder="Search by vessel, type, or location..." value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="select-wrap"><Filter size={16}/><select aria-label="Filter vessels by status" value={filter} onChange={e=>setFilter(e.target.value)}>{['All vessels',...VESSEL_STATUSES].map(s=><option key={s}>{s}</option>)}</select><ChevronDown size={14}/></div><span className="filter-count">{vessels.length} {vessels.length===1?'vessel':'vessels'}</span></div>
 {vessels.length?<div className="vessel-grid">{vessels.map(v=><VesselCard key={v.id} vessel={v} tasks={data.maintenance} logs={data.fuel_logs} onEdit={()=>openForm('vessels',v)} onDelete={()=>onDelete('vessels',v)} onTask={()=>openForm('maintenance',{vessel_id:v.id})}/>)}</div>:<EmptyState title="No vessels found" description="Try a different filter, or add your first vessel." action="Add vessel" onAction={()=>openForm('vessels')}/>}
 </div>;
}
function PageHeading({eyebrow,title,description,action,onAction}){
 return <div className="page-heading"><div><span className="eyebrow eyebrow-accent"><span className="eyebrow-line"/>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action&&<button className="btn btn-dark" onClick={onAction}><Plus size={17}/>{action}</button>}</div>;
}
function Maintenance({data,openForm,onDelete,onComplete}){
 const [query,setQuery]=useState('');const [filter,setFilter]=useState('All tasks');const [vesselFilter,setVesselFilter]=useState('all');
 const sorted=[...data.maintenance].filter(t=>{
  if(vesselFilter!=='all'&&t.vessel_id!==vesselFilter)return false;
  if(filter==='Overdue'&&!taskIsOverdue(t))return false;
  if(filter==='Due soon'&&!taskIsDueSoon(t))return false;
  if(filter==='Completed'&&t.status!=='Completed')return false;
  if(filter==='In progress'&&t.status!=='In progress')return false;
  return [t.title,t.system,t.assignee,getName(data.vessels,t.vessel_id)].join(' ').toLowerCase().includes(query.toLowerCase());
 }).sort((a,b)=>(a.status==='Completed'?1:0)-(b.status==='Completed'?1:0)||a.due_date.localeCompare(b.due_date));
 const totals={all:data.maintenance.length,overdue:data.maintenance.filter(t=>taskIsOverdue(t)).length,soon:data.maintenance.filter(t=>taskIsDueSoon(t)).length,completed:data.maintenance.filter(t=>t.status==='Completed').length};
 return <div className="view-container"><PageHeading eyebrow="PREVENTIVE MAINTENANCE" title="Maintenance centre" description="Plan inspections, prioritise urgent repairs, and keep your technical records up to date." action="Create task" onAction={()=>openForm('maintenance')}/>
 <div className="mini-stat-row"><div><span className="mini-stat-icon mint"><Wrench size={19}/></span><strong>{totals.all}</strong><small>All tasks</small></div><div><span className="mini-stat-icon coral"><AlertTriangle size={19}/></span><strong>{totals.overdue}</strong><small>Overdue</small></div><div><span className="mini-stat-icon sky"><Clock3 size={19}/></span><strong>{totals.soon}</strong><small>Due in 14 days</small></div><div><span className="mini-stat-icon violet"><CheckCircle2 size={19}/></span><strong>{totals.completed}</strong><small>Completed</small></div></div>
 <section className="white-panel maintenance-panel"><div className="maintenance-filters"><div className="filter-tabs" role="group" aria-label="Filter maintenance tasks">{['All tasks','Overdue','Due soon','In progress','Completed'].map(f=><button key={f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}</button>)}</div><div className="filter-fields"><div className="search-field compact"><Search size={16}/><input aria-label="Search maintenance tasks" placeholder="Search tasks..." value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="select-wrap"><select aria-label="Filter by vessel" value={vesselFilter} onChange={e=>setVesselFilter(e.target.value)}><option value="all">All vessels</option>{data.vessels.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><ChevronDown size={14}/></div></div></div>
 {sorted.length?<div className="table-wrapper"><table className="data-table full-table"><thead><tr><th>Task / system</th><th>Vessel</th><th>Priority</th><th>Due date</th><th>Assigned to</th><th>Status</th><th>Actions</th></tr></thead><tbody>{sorted.map(t=><tr key={t.id}><td><button className="table-primary" onClick={()=>openForm('maintenance',t)}>{t.title}</button><div className="table-sub">{t.system}</div></td><td>{getName(data.vessels,t.vessel_id)}</td><td><PriorityPill priority={t.priority}/></td><td className={taskIsOverdue(t)?'overdue-text':''}>{fmtDate(t.due_date)}{taskIsOverdue(t)&&<span className="late-dot"/>}</td><td>{t.assignee||'Unassigned'}</td><td><StatusPill status={t.status}/></td><td><div className="table-actions">{t.status!=='Completed'&&<button title="Mark completed" aria-label={`Complete ${t.title}`} onClick={()=>onComplete(t)}><Check size={16}/></button>}<button title="Edit" aria-label={`Edit ${t.title}`} onClick={()=>openForm('maintenance',t)}><Pencil size={16}/></button><button title="Delete" aria-label={`Delete ${t.title}`} onClick={()=>onDelete('maintenance',t)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>:<EmptyState icon={Wrench} title="No tasks match" description="Adjust the filters or create a new maintenance task." action="Create task" onAction={()=>openForm('maintenance')}/>}</section>
 </div>;
}
function FuelAnalytics({data,openForm,onDelete}){
 const [vesselId,setVesselId]=useState('all');const [period,setPeriod]=useState('180');
 const logs=data.fuel_logs.filter(l=>vesselId==='all'||l.vessel_id===vesselId).filter(l=>{
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-Number(period));return new Date(`${l.log_date}T12:00:00`)>=new Date(cutoff.getFullYear(),cutoff.getMonth(),cutoff.getDate(),0);
 }).sort((a,b)=>b.log_date.localeCompare(a.log_date));
 const litreTotal=sum(logs,'liters'), miles=sum(logs,'distance_nm'),hours=sum(logs,'engine_hours');
 const monthSeries=monthlyFuel(logs);
 return <div className="view-container"><PageHeading eyebrow="FUEL & VOYAGE LOGS" title="Fuel intelligence" description="Log consumption, compare trends, and find opportunities for operational efficiency." action="Add fuel record" onAction={()=>openForm('fuel_logs')}/>
 <div className="toolbar-between"><div className="toolbar-note"><Activity size={17}/> Analytics are calculated from recorded fuel logs, not live engine sensors.</div><div className="filter-fields"><div className="select-wrap"><select value={vesselId} onChange={e=>setVesselId(e.target.value)} aria-label="Filter fuel records by vessel"><option value="all">All vessels</option>{data.vessels.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><ChevronDown size={14}/></div><div className="select-wrap"><select value={period} onChange={e=>setPeriod(e.target.value)} aria-label="Choose date range"><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="180">Last 180 days</option><option value="365">Last 365 days</option></select><ChevronDown size={14}/></div></div></div>
 <div className="fuel-metric-grid"><div className="fuel-metric"><span><Fuel size={18}/> Total fuel recorded</span><strong>{fmtNumber(litreTotal)} <small>L</small></strong><p>For selected records</p></div><div className="fuel-metric"><span><MapPin size={18}/> Distance travelled</span><strong>{fmtNumber(miles)} <small>nm</small></strong><p>From recorded voyages</p></div><div className="fuel-metric"><span><Gauge size={18}/> Fuel intensity</span><strong>{fmtNumber(miles?litreTotal/miles:0,2)} <small>L/nm</small></strong><p>Fuel divided by recorded distance</p></div><div className="fuel-metric"><span><Clock3 size={18}/> Engine running time</span><strong>{fmtNumber(hours)} <small>h</small></strong><p>From the selected logs</p></div></div>
 <div className="insights-grid"><section className="white-panel fuel-graph-panel"><PanelTitle eyebrow="TREND" title="Recorded fuel over time"/><p className="panel-intro">Six-month view, based on available fuel entries.</p><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthSeries} margin={{top:15,right:5,left:-15,bottom:0}}><defs><linearGradient id="fuelAnalyticsArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#159b8f" stopOpacity=".23"/><stop offset="100%" stopColor="#159b8f" stopOpacity="0"/></linearGradient></defs><CartesianGrid stroke="#edf1f1" vertical={false}/><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fill:'#84939b',fontSize:12}}/><YAxis tickLine={false} axisLine={false} tick={{fill:'#84939b',fontSize:11}} tickFormatter={v=>`${Math.round(v/1000)}k`}/><Tooltip content={<ChartTooltip/>}/><Area dataKey="litres" type="monotone" stroke="#159b8f" strokeWidth={3} fill="url(#fuelAnalyticsArea)"/></AreaChart></ResponsiveContainer></div></section>
 <section className="white-panel fuel-tips"><PanelTitle eyebrow="ENGINEERING INSIGHTS" title="How to read the numbers"/><div className="insight-tip"><span><Gauge size={20}/></span><div><strong>Litres per nautical mile</strong><p>Compare similar journeys over time. Lower can indicate reduced fuel use, but routes and loading conditions matter.</p></div></div><div className="insight-tip"><span><Ship size={20}/></span><div><strong>Compare like for like</strong><p>Vessel type, speed, cargo, weather and engine condition affect consumption. Don't treat this as a standardised efficiency score.</p></div></div><div className="insight-tip"><span><ShieldCheck size={20}/></span><div><strong>Record quality matters</strong><p>This project uses manually entered logs and makes no certified emissions or compliance claims.</p></div></div></section></div>
 <section className="white-panel fuel-log-table"><PanelTitle eyebrow="DATA ENTRIES" title="Fuel log history" action="Add record" onAction={()=>openForm('fuel_logs')}/>{logs.length?<div className="table-wrapper"><table className="data-table"><thead><tr><th>Date</th><th>Vessel</th><th>Fuel type</th><th>Litres</th><th>Distance (nm)</th><th>Hours</th><th>Actions</th></tr></thead><tbody>{logs.map(l=><tr key={l.id}><td>{fmtDate(l.log_date)}</td><td><span className="table-primary static">{getName(data.vessels,l.vessel_id)}</span></td><td>{l.fuel_type}</td><td>{fmtNumber(l.liters)}</td><td>{fmtNumber(l.distance_nm)}</td><td>{fmtNumber(l.engine_hours)}</td><td><div className="table-actions"><button aria-label="Edit fuel record" title="Edit" onClick={()=>openForm('fuel_logs',l)}><Pencil size={16}/></button><button aria-label="Delete fuel record" title="Delete" onClick={()=>onDelete('fuel_logs',l)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>:<EmptyState icon={Fuel} title="No logs in this period" description="Choose another date range or add your first fuel record." action="Add fuel record" onAction={()=>openForm('fuel_logs')}/>}</section>
 </div>;
}
function Reports({data,stats,mode,onReset,toast,setPage}){
 const completed=data.maintenance.filter(t=>t.status==='Completed').length;
 const total=data.maintenance.length;
 const rate=total?Math.round(completed/total*100):0;
 const avgFuel=stats.distance?fmtNumber(stats.fuel/stats.distance,2):'0';
 function downloadCSV(entity){
  const defs={
   vessels:[{key:'name',label:'Vessel name'},{key:'code',label:'Reference'},{key:'type',label:'Type'},{key:'status',label:'Status'},{key:'location',label:'Location'},{key:'year',label:'Built'},{key:'capacity',label:'Capacity'},{key:'manager',label:'Manager'},{key:'notes',label:'Notes'}],
   maintenance:[{key:'title',label:'Task'},{key:'vessel',label:'Vessel'},{key:'system',label:'System'},{key:'priority',label:'Priority'},{key:'due_date',label:'Due date'},{key:'status',label:'Status'},{key:'assignee',label:'Assigned to'},{key:'notes',label:'Notes'}],
   fuel_logs:[{key:'log_date',label:'Log date'},{key:'vessel',label:'Vessel'},{key:'fuel_type',label:'Fuel type'},{key:'liters',label:'Litres'},{key:'distance_nm',label:'Distance (nm)'},{key:'engine_hours',label:'Engine hours'},{key:'notes',label:'Notes'}]
  };
  const rows=data[entity].map(r=>({...r,vessel:getName(data.vessels,r.vessel_id)}));
  const blob=new Blob(['\ufeff',tableToCSV(rows,defs[entity])],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`marineops-${entity}-${ymdToday()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
  toast(`${entity==='fuel_logs'?'Fuel logs':entity==='maintenance'?'Maintenance tasks':'Vessels'} exported as CSV.`);
 }
 return <div className="view-container"><PageHeading eyebrow="WORKSPACE REPORTING" title="Reports & exports" description="Turn your operating records into insights you can review, share, or improve."/>
 <div className="report-hero"><div><span className="eyebrow">FLEET SUMMARY</span><h2>Make decisions<br/><em>with the whole picture.</em></h2><p>Every chart here is based on the records currently in your workspace.</p></div><MarineVisual small/></div>
 <div className="report-kpis"><div><span>Vessels tracked</span><strong>{stats.total}</strong></div><div><span>Maintenance completion</span><strong>{rate}%</strong></div><div><span>Open maintenance</span><strong>{total-completed}</strong></div><div><span>Average fuel intensity</span><strong>{avgFuel}<small> L/nm</small></strong></div></div>
 <div className="section-heading"><h2>Download your data</h2><span>CSV files open in Excel and Google Sheets</span></div>
 <div className="report-grid"><ReportCard icon={Ship} title="Vessel register" description="Fleet specifications, status, locations, and managers." count={`${data.vessels.length} vessels`} onClick={()=>downloadCSV('vessels')}/><ReportCard icon={Wrench} title="Maintenance report" description="Task dates, assignments, priorities, and completion status." count={`${data.maintenance.length} tasks`} onClick={()=>downloadCSV('maintenance')}/><ReportCard icon={Fuel} title="Fuel usage report" description="Recorded fuel, voyage distance and engine running hours." count={`${data.fuel_logs.length} entries`} onClick={()=>downloadCSV('fuel_logs')}/></div>
 <section className="white-panel report-notes"><div><span className="section-icon"><ShieldCheck size={21}/></span><h3>How to present this project to employers</h3><p>MarineOps is an independently developed fleet-operations portfolio application. It demonstrates record management, maintenance scheduling, fuel calculations, accessible data visualisation, and a cloud-ready React/Supabase architecture. All included starting data are illustrative and do not represent real vessels or live telemetry.</p></div><div className="report-note-actions"><button className="btn btn-outline" onClick={()=>setPage('overview')}>Back to dashboard<ArrowRight size={16}/></button>{mode==='demo'&&<button className="btn btn-outline danger-outline" onClick={onReset}><RefreshCw size={16}/>Reset demo data</button>}</div></section>
 </div>;
}
function ReportCard({icon:Icon,title,description,count,onClick}){
 return <div className="report-card"><span className="report-icon"><Icon size={23}/></span><h3>{title}</h3><p>{description}</p><div className="report-card-footer"><span>{count}</span><button onClick={onClick} className="btn btn-soft"><Download size={16}/>Export CSV</button></div></div>;
}
function TextInput({label,name,value,onChange,required=false,type='text',placeholder='',min,max,step,children}){
 return <label className="form-field"><span>{label}{required&&<b> *</b>}</span>{children||<input name={name} type={type} required={required} value={value??''} onChange={e=>onChange(name,e.target.value)} placeholder={placeholder} min={min} max={max} step={step}/>}</label>;
}
function SelectField({label,name,value,onChange,options,required=true}){
 return <TextInput label={label} name={name} value={value} onChange={onChange} required={required}><div className="input-select"><select value={value??''} required={required} onChange={e=>onChange(name,e.target.value)}>{options.map(opt=>typeof opt==='string'?<option key={opt} value={opt}>{opt}</option>:<option key={opt.value} value={opt.value}>{opt.label}</option>)}</select><ChevronDown size={16}/></div></TextInput>;
}
function RecordModal({entity,initial,vessels,onClose,onSubmit,busy}){
 const isEdit=Boolean(initial?.id);
 const defaults={
  vessels:{name:'',code:'',type:'Bulk carrier',status:'At sea',location:'',year:new Date().getFullYear(),capacity:'',manager:'',notes:''},
  maintenance:{vessel_id:vessels[0]?.id||'',title:'',system:'Propulsion',priority:'Medium',status:'Open',due_date:isoDate(7),assignee:'',notes:'',completed_at:null},
  fuel_logs:{vessel_id:vessels[0]?.id||'',log_date:ymdToday(),fuel_type:'MGO',liters:'',distance_nm:'',engine_hours:'',notes:''}
 };
 const [form,setForm]=useState({...defaults[entity],...initial});
 const [err,setErr]=useState('');
 const setField=(k,v)=>setForm(prev=>({...prev,[k]:v}));
 async function submit(e){e.preventDefault();setErr('');
  try {
   let data={...form};
   if(entity==='vessels'){
    if(!data.name.trim()||!data.code.trim())throw new Error('Vessel name and reference are required.');
    data.year=data.year?Number(data.year):null;
   }
   if(entity==='maintenance'){
    if(!data.vessel_id)throw new Error('Add a vessel before creating a maintenance task.');
    data.completed_at=data.status==='Completed'?(data.completed_at||ymdToday()):null;
   }
   if(entity==='fuel_logs'){
    if(!data.vessel_id)throw new Error('Add a vessel before recording fuel.');
    for(const field of ['liters','distance_nm','engine_hours'])data[field]=Number(data[field]);
    if(!(data.liters>0)||data.distance_nm<0||data.engine_hours<0)throw new Error('Enter valid positive fuel and nonnegative distance/hour values.');
   }
   const ok=await onSubmit(entity,isEdit?'update':'create',data);
   if(ok)onClose();
  }catch(error){setErr(error.message)}
 }
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}><section className="record-modal" role="dialog" aria-modal="true" aria-label={`${isEdit?'Edit':'Add'} ${ENTITY_TITLE[entity]}`}><div className="modal-header"><div><span className="eyebrow">FLEET WORKSPACE</span><h2>{isEdit?'Edit':'Add'} {ENTITY_TITLE[entity]}</h2></div><button className="icon-btn" aria-label="Close form" onClick={onClose} disabled={busy}><X size={21}/></button></div><form onSubmit={submit} className="record-form">
  {entity==='vessels'&&<><div className="form-grid"><TextInput label="Vessel name" name="name" value={form.name} onChange={setField} placeholder="e.g. MV Ocean Star" required/><TextInput label="Fleet reference" name="code" value={form.code} onChange={setField} placeholder="e.g. VSL-005" required/><SelectField label="Vessel type" name="type" value={form.type} onChange={setField} options={['Bulk carrier','Container ship','Offshore support','Product tanker','General cargo','Passenger vessel','Other']}/><SelectField label="Operational status" name="status" value={form.status} onChange={setField} options={VESSEL_STATUSES}/><TextInput label="Current location" name="location" value={form.location} onChange={setField} placeholder="e.g. Liverpool Harbour"/><TextInput label="Year built" name="year" type="number" value={form.year} onChange={setField} min="1900" max="2100"/><TextInput label="Capacity" name="capacity" value={form.capacity} onChange={setField} placeholder="e.g. 16,000 DWT"/><TextInput label="Fleet manager" name="manager" value={form.manager} onChange={setField} placeholder="Name"/></div><label className="form-field"><span>Notes</span><textarea value={form.notes||''} onChange={e=>setField('notes',e.target.value)} placeholder="Equipment and operational notes..." rows="3"/></label></>}
  {entity==='maintenance'&&<><div className="form-grid"><SelectField label="Vessel" name="vessel_id" value={form.vessel_id} onChange={setField} options={vessels.map(v=>({value:v.id,label:v.name}))}/><TextInput label="Task title" name="title" value={form.title} onChange={setField} placeholder="e.g. Main engine oil sample" required/><SelectField label="System" name="system" value={form.system} onChange={setField} options={['Propulsion','Power generation','Hydraulics','Cooling system','Safety systems','Electrical','Hull & structure','Navigation','General']}/><SelectField label="Priority" name="priority" value={form.priority} onChange={setField} options={PRI}/><TextInput label="Due date" name="due_date" type="date" value={form.due_date} onChange={setField} required/><SelectField label="Status" name="status" value={form.status} onChange={setField} options={TASK_STATUSES}/><TextInput label="Assigned to" name="assignee" value={form.assignee} onChange={setField} placeholder="Engineering team or assignee"/></div><label className="form-field"><span>Work description</span><textarea value={form.notes||''} onChange={e=>setField('notes',e.target.value)} rows="3" placeholder="What needs to be inspected or serviced?"/></label></>}
  {entity==='fuel_logs'&&<><div className="form-grid"><SelectField label="Vessel" name="vessel_id" value={form.vessel_id} onChange={setField} options={vessels.map(v=>({value:v.id,label:v.name}))}/><TextInput label="Log date" name="log_date" type="date" value={form.log_date} onChange={setField} max={ymdToday()} required/><SelectField label="Fuel type" name="fuel_type" value={form.fuel_type} onChange={setField} options={['MGO','VLSFO','HFO','Other']}/><TextInput label="Fuel consumed (litres)" name="liters" type="number" step="0.01" min="0.01" value={form.liters} onChange={setField} placeholder="e.g. 3600" required/><TextInput label="Voyage distance (nautical miles)" name="distance_nm" type="number" step="0.01" min="0" value={form.distance_nm} onChange={setField} placeholder="e.g. 720" required/><TextInput label="Engine running time (hours)" name="engine_hours" type="number" step="0.01" min="0" value={form.engine_hours} onChange={setField} placeholder="e.g. 66" required/></div><label className="form-field"><span>Notes</span><textarea value={form.notes||''} onChange={e=>setField('notes',e.target.value)} rows="3" placeholder="Voyage conditions, fuel changes, or observations"/></label><div className="modal-hint"><Gauge size={17}/>{Number(form.distance_nm)>0&&Number(form.liters)>0?`${fmtNumber(Number(form.liters)/Number(form.distance_nm),2)} L/nm estimated fuel intensity for this entry.`:'Fuel intensity will be calculated automatically from litres and nautical miles.'}</div></>}
  {err&&<p className="form-error"><AlertCircle size={16}/>{err}</p>}
  <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="btn btn-dark" disabled={busy||((entity==='maintenance'||entity==='fuel_logs')&&vessels.length===0)}>{busy?<RefreshCw className="spin" size={16}/>:<Check size={17}/>} {isEdit?'Save changes':'Create record'}</button></div>
 </form></section></div>;
}
function AuthModal({onClose}){
 const [tab,setTab]=useState('signin'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[error,setError]=useState('');
 async function auth(e){e.preventDefault();if(!cloudReady)return;setBusy(true);setError('');setMsg('');try{
  const {data,error:err}=tab==='signin'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});
  if(err)throw err;
  if(tab==='signup'&&!data.session){setMsg('Account created. Check your email for the confirmation link before signing in.');}
  else onClose();
 }catch(err){setError(err.message)}finally{setBusy(false)}}
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="auth-modal" role="dialog" aria-modal="true" aria-label="Cloud account"><button className="auth-close icon-btn" onClick={onClose} aria-label="Close"><X size={21}/></button><span className="auth-emblem"><Cloud size={29}/></span><h2>Take your fleet<br/>to the cloud.</h2><p className="auth-summary">Demo mode works without an account. Sign in to save your real workspace securely with Supabase.</p>
 {!cloudReady?<><div className="cloud-instructions"><span><Database size={19}/></span><div><strong>Cloud mode isn't connected yet.</strong><p>First create a free Supabase project, run <code>sql/supabase_schema.sql</code>, and set the public environment variables shown in README.md.</p></div></div><a className="btn btn-dark full-width" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Open Supabase <ExternalLink size={16}/></a><button className="btn btn-outline full-width" onClick={onClose}>Keep exploring demo</button></>:<><div className="auth-tabs"><button className={tab==='signin'?'active':''} onClick={()=>{setTab('signin');setError('');setMsg('')}}>Sign in</button><button className={tab==='signup'?'active':''} onClick={()=>{setTab('signup');setError('');setMsg('')}}>Create account</button></div><form onSubmit={auth} className="auth-form"><label><Mail size={17}/><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" required/></label><label><LockKeyhole size={17}/><input type="password" autoComplete={tab==='signup'?'new-password':'current-password'} minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (6+ characters)" required/></label>{error&&<p className="form-error">{error}</p>}{msg&&<p className="auth-success"><CheckCircle2 size={18}/>{msg}</p>}<button className="btn btn-dark full-width" type="submit" disabled={busy}>{busy?'Please wait...':tab==='signup'?'Create cloud account':'Sign in'}<ArrowRight size={17}/></button></form><p className="auth-footnote"><ShieldCheck size={15}/> Your records are private to your signed-in account.</p></>}
 </section></div>;
}
function WelcomeEmpty({onAdd}){
 return <div className="first-use"><span className="first-use-icon"><Ship size={35}/></span><h2>Your fleet workspace is ready.</h2><p>Add your first vessel to start tracking maintenance, fuel logs and performance trends.</p><button className="btn btn-dark" onClick={onAdd}><Plus size={17}/>Add your first vessel</button></div>;
}
function Workspace({mode,user,onLogin,onLogout}){
 const [data,setData]=useState(()=>mode==='demo'?loadDemoData():EMPTY);
 const [loading,setLoading]=useState(mode==='cloud');
 const [notice,setNotice]=useState(null);
 const [page,setPage]=useState('overview');
 const [sidebarOpen,setSidebarOpen]=useState(false);
 const [modal,setModal]=useState(null);
 const [busy,setBusy]=useState(false);
 const stats=useMemo(()=>vesselStats(data.vessels,data.maintenance,data.fuel_logs),[data]);
 const flash=useCallback((message,kind='success')=>setNotice({message,kind}),[]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),4600);return()=>clearTimeout(timer)},[notice]);
 const refresh=useCallback(async()=>{if(mode!=='cloud')return;setLoading(true);try{const d=await getAllRecords();setData(d);}catch(err){flash(`Couldn't load cloud records: ${err.message}`,'error')}finally{setLoading(false)}},[mode,flash]);
 useEffect(()=>{if(mode==='cloud')refresh()},[mode,refresh]);
 async function write(entity,action,record){setBusy(true);
  try{
   if(mode==='cloud'){
    await cloudWrite(entity,action,record,user.id); await refresh();
   }else{
    const updated=applyDemoOperation(data,entity,action,record);
    saveDemoData(updated);
    setData(updated);
   }
   flash(`${ENTITY_TITLE[entity][0].toUpperCase()+ENTITY_TITLE[entity].slice(1)} ${action==='delete'?'deleted':action==='create'?'created':'updated'} successfully.`);
   return true;
  }catch(err){flash(err.message||'Something went wrong. Please try again.','error');return false}finally{setBusy(false)}
 }
 const openForm=(entity,record)=>setModal({entity,initial:record||null});
 async function remove(entity,record){if(window.confirm(`Delete ${entity==='vessels'?record.name:entity==='maintenance'?record.title:'this fuel log'}? ${entity==='vessels'?'Associated maintenance tasks and fuel logs will also be deleted.':''}`))await write(entity,'delete',record)}
 async function complete(task){await write('maintenance','update',{...task,status:'Completed',completed_at:ymdToday()})}
 function resetDemo(){if(mode!=='demo')return;if(window.confirm('Reset all demo edits and restore the sample vessels, maintenance tasks, and fuel logs?')){const d=makeDemoData();saveDemoData(d);setData(d);flash('Demo data has been restored.')}}
 return <div className="app-shell">
  <Sidebar page={page} setPage={setPage} open={sidebarOpen} onClose={()=>setSidebarOpen(false)} mode={mode} user={user} stats={stats} onLogin={onLogin} onLogout={onLogout}/>
  <div className="main-column"><Header page={page} setPage={setPage} stats={stats} mode={mode} user={user} onLogin={onLogin} onLogout={onLogout} onMenu={()=>setSidebarOpen(true)}/>
   <div className={`mode-banner ${mode==='cloud'?'cloud-banner':''}`}><span className="mode-indicator"><span className="pulse-dot"/>{mode==='demo'?'DEMO MODE':'CONNECTED WORKSPACE'}</span><span className="mode-message">{mode==='demo'?'Illustrative vessel data · Your edits are saved in this browser only.':'Private cloud records · Signed in with Supabase.'}</span>{mode==='demo'?<button onClick={onLogin}>Connect Supabase<ArrowUpRight size={14}/></button>:<button onClick={refresh}><RefreshCw size={13}/> Refresh</button>}</div>
   <main className="main-scroll" id="main-content">{loading?<div className="loading-state"><RefreshCw size={27} className="spin"/><p>Loading your fleet workspace...</p></div>:mode==='cloud'&&data.vessels.length===0&&page==='overview'?<WelcomeEmpty onAdd={()=>openForm('vessels')}/>:<>
    {page==='overview'&&<Overview data={data} stats={stats} setPage={setPage} openForm={openForm} onEdit={record=>openForm('maintenance',record)} onComplete={complete}/>}
    {page==='vessels'&&<Fleet data={data} openForm={openForm} onDelete={remove}/>}
    {page==='maintenance'&&<Maintenance data={data} openForm={openForm} onDelete={remove} onComplete={complete}/>}
    {page==='fuel'&&<FuelAnalytics data={data} openForm={openForm} onDelete={remove}/>}
    {page==='reports'&&<Reports data={data} stats={stats} mode={mode} onReset={resetDemo} toast={flash} setPage={setPage}/>}
    </>}
    <footer className="site-footer"><span>© {new Date().getFullYear()} MarineOps · An independent engineering portfolio project</span><span>Not a real-time vessel tracking or certified compliance system.</span></footer>
   </main>
  </div>
  {modal&&<RecordModal entity={modal.entity} initial={modal.initial} vessels={data.vessels} onClose={()=>setModal(null)} onSubmit={write} busy={busy}/>}
  <Toast notice={notice} onDismiss={()=>setNotice(null)}/>
 </div>;
}
export default function App(){
 const [user,setUser]=useState(null);
 const [mode,setMode]=useState('demo');
 const [authOpen,setAuthOpen]=useState(false);
 useEffect(()=>{
  if(!cloudReady)return;
  let mounted=true;
  supabase.auth.getSession().then(({data})=>{if(mounted&&data?.session?.user){setUser(data.session.user);setMode('cloud')}});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   if(!mounted)return;
   setUser(session?.user||null);
   if(event==='SIGNED_IN'&&session?.user){setMode('cloud');setAuthOpen(false)}
   if(event==='SIGNED_OUT')setMode('demo');
  });
  return()=>{mounted=false;subscription.unsubscribe()};
 },[]);
 async function signOut(){if(cloudReady&&user){const {error}=await supabase.auth.signOut();if(error){window.alert(`Sign-out error: ${error.message}`);return}}setMode('demo');setUser(null)}
 return <><Workspace key={`${mode}:${user?.id||'local'}`} mode={mode} user={user} onLogin={()=>setAuthOpen(true)} onLogout={signOut}/>{authOpen&&<AuthModal onClose={()=>setAuthOpen(false)}/>}</>;
}
