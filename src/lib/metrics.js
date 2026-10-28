export function dateAtNoon(s) { return s ? new Date(`${s}T12:00:00`) : null; }
export function daysUntil(date, today=new Date()) {
  const end=dateAtNoon(date);
  if (!end || Number.isNaN(+end)) return null;
  const start=new Date(today.getFullYear(),today.getMonth(),today.getDate(),12);
  return Math.round((+end - +start)/86400000);
}
export function taskIsOverdue(t, today=new Date()) {
  return t.status!=='Completed' && (daysUntil(t.due_date,today)??0)<0;
}
export function taskIsDueSoon(t, today=new Date()) {
  const days=daysUntil(t.due_date,today);
  return t.status!=='Completed' && days!==null && days>=0 && days<=14;
}
export function sum(arr, key){ return arr.reduce((total,item)=>total+(Number(item[key])||0),0); }
export function fmtNumber(n,maximumFractionDigits=0){return new Intl.NumberFormat('en-GB',{maximumFractionDigits}).format(Number(n)||0);}
export function fmtDate(ymd) { if(!ymd)return '—';return dateAtNoon(ymd).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }
export function lastMonths(months=6,now=new Date()){
  return Array.from({length:months},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-(months-1-i),1);
    return {key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:d.toLocaleDateString('en-GB',{month:'short'})};
  });
}
export function monthlyFuel(logs,months=6,now=new Date()) {
  return lastMonths(months,now).map(m=>({name:m.label,litres:sum(logs.filter(l=>l.log_date?.startsWith(m.key)),'liters'),key:m.key}));
}
export function vesselStats(vessels,tasks,logs) {
  const ongoing=tasks.filter(t=>t.status!=='Completed');
  const distance=sum(logs,'distance_nm');
  return {
    total:vessels.length, atSea:vessels.filter(v=>v.status==='At sea').length,
    dueSoon:ongoing.filter(t=>taskIsDueSoon(t)).length, overdue:ongoing.filter(t=>taskIsOverdue(t)).length,
    completed:tasks.filter(t=>t.status==='Completed').length,
    fuel:sum(logs,'liters'), distance,
    intensity:distance?sum(logs,'liters')/distance:0,
  };
}
export function csvEscapeCell(value){
  let v=String(value??'');
  // Mitigate spreadsheet formula injection on export.
  if (/^[\s]*[=+@\-]/.test(v)) v=`'${v}`;
  return `"${v.replaceAll('"','""')}"`;
}
export function tableToCSV(data,columns){
  return [columns.map(c=>csvEscapeCell(c.label)).join(','), ...data.map(row=>columns.map(c=>csvEscapeCell(row[c.key])).join(','))].join('\r\n');
}
