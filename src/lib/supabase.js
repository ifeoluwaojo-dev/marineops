import {createClient} from '@supabase/supabase-js';

const url=(import.meta.env.VITE_SUPABASE_URL||'').trim();
const key=(import.meta.env.VITE_SUPABASE_ANON_KEY||'').trim();
export const cloudReady=Boolean(url&&key);
// Use a publishable / anon key ONLY. Row-level security protects each user's records.
export const supabase=cloudReady?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export const ENTITY_TABLES={vessels:'vessels',maintenance:'maintenance_tasks',fuel_logs:'fuel_logs'};
export const WRITE_FIELDS={
  vessels:['name','code','type','status','location','year','capacity','manager','notes'],
  maintenance:['vessel_id','title','system','priority','status','due_date','assignee','notes','completed_at'],
  fuel_logs:['vessel_id','log_date','fuel_type','liters','distance_nm','engine_hours','notes'],
};
export function writableRecord(entity,record) {
  return Object.fromEntries(WRITE_FIELDS[entity].filter(k=>Object.prototype.hasOwnProperty.call(record,k)).map(k=>[k,record[k]===undefined?null:record[k]]));
}
export async function getAllRecords() {
  const [v,t,f]=await Promise.all([
    supabase.from('vessels').select('*').order('name'),
    supabase.from('maintenance_tasks').select('*').order('due_date'),
    supabase.from('fuel_logs').select('*').order('log_date',{ascending:false})
  ]);
  const err=v.error||t.error||f.error;
  if(err)throw err;
  return {vessels:v.data,maintenance:t.data,fuel_logs:f.data};
}
export async function cloudWrite(entity,action,record,userId) {
  const table=ENTITY_TABLES[entity]; if(!table)throw new Error('Unknown record type');
  if(action==='delete'){
    const {error}=await supabase.from(table).delete().eq('id',record.id).eq('user_id',userId);
    if(error)throw error;
    return;
  }
  const data=writableRecord(entity,record);
  if(action==='create'){
    const {error}=await supabase.from(table).insert({...data,user_id:userId});
    if(error)throw error;
  } else {
    const {error}=await supabase.from(table).update(data).eq('id',record.id).eq('user_id',userId);
    if(error)throw error;
  }
}
