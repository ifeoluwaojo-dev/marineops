import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDemoData} from './demo.js';
import {daysUntil,taskIsOverdue,taskIsDueSoon,sum,monthlyFuel,vesselStats,csvEscapeCell,tableToCSV} from './metrics.js';

test('demo dataset is coherent and contains meaningful records',()=>{
 const d=makeDemoData();
 assert.equal(d.vessels.length,4);
 assert.equal(d.maintenance.length,9);
 assert.equal(d.fuel_logs.length,24);
 assert.ok(d.maintenance.every(x=>d.vessels.some(v=>v.id===x.vessel_id)));
 assert.ok(d.fuel_logs.every(x=>d.vessels.some(v=>v.id===x.vessel_id)));
});
test('date-based statuses work',()=>{
 const now=new Date(2026,9,28);
 assert.equal(daysUntil('2026-10-29',now),1);
 assert.equal(daysUntil('2026-10-26',now),-2);
 assert.equal(taskIsOverdue({status:'Open',due_date:'2026-10-26'},now),true);
 assert.equal(taskIsOverdue({status:'Completed',due_date:'2026-10-26'},now),false);
 assert.equal(taskIsDueSoon({status:'Open',due_date:'2026-11-05'},now),true);
});
test('fleet metrics and chart aggregation are consistent',()=>{
 const d=makeDemoData();
 const m=vesselStats(d.vessels,d.maintenance,d.fuel_logs);
 assert.equal(m.total,4); assert.ok(m.overdue>0); assert.equal(m.fuel,sum(d.fuel_logs,'liters'));
 const series=monthlyFuel(d.fuel_logs,6);
 assert.equal(series.length,6); assert.equal(sum(series,'litres'),m.fuel);
});
test('CSV safely quotes text and prevents spreadsheet formulas',()=>{
 assert.equal(csvEscapeCell('a"b'),'"a""b"');
 assert.equal(csvEscapeCell('=2+2'),'"\'=2+2"');
 const csv=tableToCSV([{name:'=SUM(A1:A2)',id:'1'}],[{key:'name',label:'Name'}]);
 assert.ok(csv.includes("'=SUM"));
});
