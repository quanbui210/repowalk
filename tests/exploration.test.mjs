import test from 'node:test';
import assert from 'node:assert/strict';
import { walkingHeight, floorPortals, compareFiles, roomDepth } from '../lib/exploration.ts';
import { analyzeSource } from '../lib/analyze-source.ts';

test('walks every stair flight upward and downward without teleporting',()=>{
 const floors=4;let y=0;
 for(let flight=0;flight<floors;flight++){
  const x=flight%2?11.8:8;
  for(let step=0;step<=120;step++){
   const z=flight%2?2+step*.05:8-step*.05;
   const next=walkingHeight(x,z,y,floors);assert.notEqual(next,null);assert.ok(Math.abs(next-y)<=.051);y=next;
  }
  assert.equal(y,(flight+1)*6);
 }
 for(let flight=floors-1;flight>=0;flight--){const x=flight%2?11.8:8;for(let step=0;step<=120;step++){const z=flight%2?8-step*.05:2+step*.05;const next=walkingHeight(x,z,y,floors);assert.notEqual(next,null);y=next}assert.equal(y,flight*6)}
});
test('stair side entry cannot jump up several metres or fall through a flight',()=>{
 assert.equal(walkingHeight(8,4,0,3),null);
 assert.equal(walkingHeight(5,4,3,3),null);
 assert.equal(walkingHeight(11.8,4,0,3),null);
 assert.equal(walkingHeight(5,1.4,6,3),6);
});
test('every file portal belongs to exactly one gallery floor',()=>{
 const portals=Array.from({length:137},(_,i)=>({path:`file${i}`,kind:'file',x:0,z:0}));const spread=Array.from({length:4},(_,i)=>floorPortals(portals,i,4)).flat();assert.equal(spread.length,137);assert.equal(new Set(spread.map(p=>p.path)).size,137);assert.equal(floorPortals(portals,4,4).length,0);
});
test('source architecture discovers functions, arrow functions, classes, and exact ranges',()=>{
 const code='export function sum(a: number, b: number) {\n if (a > 0) return a + b;\n return b;\n}\nexport const twice = (x: number) => x * 2;\nclass Store {\n get() { return 1; }\n}';const result=analyzeSource(code,'source.ts');assert.equal(result.mode,'ast');assert.deepEqual(result.constructs.map(c=>[c.name,c.kind,c.start,c.end]),[['sum','function',1,4],['twice','function',5,5],['Store','class',6,8],['get','function',7,7]]);assert.equal(result.constructs[0].complexity,2);assert.equal(analyzeSource('def f():\n return 1','source.py').mode,'unsupported');assert.equal(analyzeSource('function {','bad.ts').mode,'unparsed');
});
test('Git history compares actual blob identifiers, including additions and removals',()=>{
 const before=[{path:'old.ts',sha:'a'},{path:'same.ts',sha:'b'},{path:'edit.ts',sha:'c'}],after=[{path:'same.ts',sha:'b'},{path:'edit.ts',sha:'d'},{path:'new.ts',sha:'e'}];assert.deepEqual(compareFiles(before,after),{'same.ts':'unchanged','edit.ts':'modified','new.ts':'added','old.ts':'removed'});
});
test('source galleries grow with the number of discovered constructs',()=>{assert.ok(roomDepth(30)>roomDepth(2));});
