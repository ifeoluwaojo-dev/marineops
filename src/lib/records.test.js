import test from 'node:test';
import assert from 'node:assert/strict';
import {applyDemoOperation} from './records.js';
import {makeDemoData} from './demo.js';

test('create record preserves existing records and original state',()=>{
 const data=makeDemoData();const next=applyDemoOperation(data,'vessels','create',{name:'MV Test'},()=> 'test-uuid');
 assert.equal(next.vessels[0].id,'test-uuid');
 assert.equal(next.vessels.length,data.vessels.length+1);
 assert.equal(data.vessels.length,4);
});
test('edit existing task and preserve other fields',()=>{
 const data=makeDemoData();const task=data.maintenance[0];
 const next=applyDemoOperation(data,'maintenance','update',{id:task.id,status:'Completed'});
 assert.equal(next.maintenance[0].status,'Completed');
 assert.equal(next.maintenance[0].title,task.title);
 assert.notEqual(next.maintenance[0],task);
});
test('deleting vessel cascades its demo maintenance and fuel logs',()=>{
 const data=makeDemoData(); const next=applyDemoOperation(data,'vessels','delete',data.vessels[0]);
 assert.equal(next.vessels.length,3);
 assert.equal(next.maintenance.some(t=>t.vessel_id==='v1'),false);
 assert.equal(next.fuel_logs.some(l=>l.vessel_id==='v1'),false);
 assert.equal(data.vessels.length,4);
});
