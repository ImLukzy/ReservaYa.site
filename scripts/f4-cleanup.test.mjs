import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dropFixture} from './f4-cleanup.mjs';
const bounded=async promise=>promise;
test('reconnects after a broken connection and closes every client',async()=>{
 const sql=[],closed=[];let attempts=0;
 await dropFixture({name:'f4_fixture_abcdef123456',bounded,sleep:async()=>{},createClient:()=>{const id=++attempts;return {$executeRawUnsafe:async query=>{sql.push(query);if(id===1)throw Error('Connection unavailable');},$disconnect:async()=>closed.push(id)};}});
 assert.equal(attempts,2);assert.deepEqual(closed,[1,2]);assert.ok(sql.every(query=>query==='DROP DATABASE IF EXISTS "f4_fixture_abcdef123456" WITH (FORCE)'));
});
test('reports failure after three connections without claiming cleanup succeeded',async()=>{
 let attempts=0,closed=0;
 await assert.rejects(dropFixture({name:'f4_fixture_abcdef123456',bounded,sleep:async()=>{},createClient:()=>{attempts++;return {$executeRawUnsafe:async()=>{throw Error('offline');},$disconnect:async()=>closed++};}}),/offline/);
 assert.equal(attempts,3);assert.equal(closed,3);
});
test('refuses non-fixture names before creating a connection',async()=>{
 await assert.rejects(dropFixture({name:'production',bounded,createClient:()=>{throw Error('Unexpected connection');}}),/fixture namespace/);
});
