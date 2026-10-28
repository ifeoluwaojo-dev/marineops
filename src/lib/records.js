// Predictable demo changes: no network requests and no mutation of previous state.
export function applyDemoOperation(current,entity,action,record,newId=()=>crypto.randomUUID()) {
  if (!['vessels','maintenance','fuel_logs'].includes(entity)) throw new Error('Invalid record category');
  if (!['create','update','delete'].includes(action)) throw new Error('Invalid record operation');
  const collection=current[entity];
  let updated;
  if (action==='create') {
    const id=newId();
    updated=[{...record,id,created_at:new Date().toISOString()},...collection];
  } else if(action==='update') {
    if(!collection.some(item=>item.id===record.id)) throw new Error('Record no longer exists');
    updated=collection.map(item=>item.id===record.id?{...item,...record}:item);
  } else updated=collection.filter(item=>item.id!==record.id);
  const next={...current,[entity]:updated};
  if(entity==='vessels'&&action==='delete'){
    next.maintenance=current.maintenance.filter(t=>t.vessel_id!==record.id);
    next.fuel_logs=current.fuel_logs.filter(l=>l.vessel_id!==record.id);
  }
  return next;
}
