// All demo companies, vessels, tasks, and logs are invented. No live tracking data.
export const STORAGE_KEY = 'marineops-demo-v1';

export function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
}

export function makeDemoData() {
  const vessels = [
    { id:'v1', name:'MV Northstar', code:'DEMO-001', type:'Bulk carrier', status:'At sea', location:'North Atlantic', year:2018, capacity:'32,500 DWT', manager:'Alex Morgan', notes:'General cargo operations and planned maintenance.' },
    { id:'v2', name:'MV Horizon', code:'DEMO-002', type:'Container ship', status:'At sea', location:'English Channel', year:2020, capacity:'2,400 TEU', manager:'Taylor Reed', notes:'Regular regional freight services.' },
    { id:'v3', name:'OSV Meridian', code:'DEMO-003', type:'Offshore support', status:'In port', location:'Aberdeen Harbour', year:2016, capacity:'4,200 GT', manager:'Jordan Ellis', notes:'Support vessel with portside inspection programme.' },
    { id:'v4', name:'MT Atlas', code:'DEMO-004', type:'Product tanker', status:'Maintenance', location:'Rotterdam', year:2014, capacity:'18,900 DWT', manager:'Morgan Lee', notes:'Scheduled machinery overhaul in dry dock.' },
  ];
  const taskEntries = [
    ['m1','v1','Main engine lubrication check','Propulsion','High','In progress',3,'Alex Morgan','Inspect filters, sample lubricating oil and record findings.'],
    ['m2','v2','Auxiliary generator service','Power generation','Critical','Open',-3,'Taylor Reed','Inspect bearings, belts and cooling circuit.'],
    ['m3','v3','Fire pump performance test','Safety systems','High','Open',8,'Jordan Ellis','Record pressure and flow readings during test.'],
    ['m4','v4','Sea-water cooling inspection','Cooling system','Medium','In progress',-1,'Morgan Lee','Inspect strainers, valves and related pipework.'],
    ['m5','v1','Navigation light inspection','Electrical','Low','Open',18,'Alex Morgan','Verify operation and replace failed lamps.'],
    ['m6','v2','Fuel injector visual assessment','Propulsion','Medium','Completed',-11,'Taylor Reed','Inspected injectors and documented observations.'],
    ['m7','v3','Hull coating condition review','Hull & structure','Medium','Completed',-8,'Jordan Ellis','Review coating and corrosion indicators.'],
    ['m8','v4','Bilge alarm functional test','Safety systems','Critical','Open',1,'Morgan Lee','Carry out functionality test before release.'],
    ['m9','v1','Steering gear inspection','Hydraulics','High','Open',12,'Alex Morgan','Check for leaks and verify hydraulic pressure.'],
  ];
  const maintenance = taskEntries.map(([id,vessel_id,title,system,priority,status,offset,assignee,notes])=>({
    id,vessel_id,title,system,priority,status,due_date:isoDate(offset),assignee,notes,
    completed_at:status==='Completed'?isoDate(offset+2):null, created_at:isoDate(-25)
  }));
  const fuel_logs = [];
  // Six months of fictitious fuel entries, ending near today, with varied fuel usage.
  for (let m=5;m>=0;m--) {
    for (let i=0;i<4;i++) {
      const d=new Date(); d.setHours(12,0,0,0); d.setDate(1); d.setMonth(d.getMonth()-m); d.setDate(4+i*6);
      const log_date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
      fuel_logs.push({ id:`f${m}-${i}`, vessel_id:`v${i+1}`, log_date,
        fuel_type:i===3?'VLSFO':'MGO', liters:Math.round(2900+i*660+m*85+(5-m)*130),
        distance_nm:Math.round(400+i*88+m*9), engine_hours:Math.round(52+i*8+m*2),
        notes:'Illustrative voyage fuel log.', created_at:isoDate(-8)});
    }
  }
  return { vessels, maintenance, fuel_logs };
}

export function loadDemoData() {
  try {
    const raw=window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data=JSON.parse(raw);
      if (Array.isArray(data.vessels)&&Array.isArray(data.maintenance)&&Array.isArray(data.fuel_logs)) return data;
    }
  } catch { /* ignore corrupted demo storage */ }
  return makeDemoData();
}
export function saveDemoData(data) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
