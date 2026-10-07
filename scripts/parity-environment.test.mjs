import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parityEnvironment} from './parity-environment.mjs';
test('CI never reads QA configuration and uses disposable local PostgreSQL without TLS',()=>{
 const settings=parityEnvironment({root:'.',ci:true,env:{PARITY_DATABASE_URL:'postgresql://fixture:fixture@127.0.0.1:5432/parity'},readLocal:()=>{throw Error('QA file accessed');}});
 assert.equal(new URL(settings.TEST_DATABASE_URL_UNPOOLED).searchParams.get('sslmode'),'disable');
});
test('CI rejects missing or remote connections without exposing their URL',()=>{
 for(const env of [{},{PARITY_DATABASE_URL:'postgresql://secret:private@remote.example/parity'},{PARITY_DATABASE_URL:'https://localhost/db'}])assert.throws(()=>parityEnvironment({root:'.',ci:true,env}),error=>!error.message.includes('secret')&&/CI|--ci/.test(error.message));
});
test('local mode still reads only TEST variables; CI env cannot override QA',()=>{
 const settings=parityEnvironment({root:'.',ci:false,env:{PARITY_DATABASE_URL:'ignored'},readLocal:()=>"TEST_DATABASE_URL_UNPOOLED='postgresql://fixture:fixture@qa.test/local'\nDATABASE_URL=ignored"});
 assert.equal(settings.TEST_DATABASE_URL_UNPOOLED,'postgresql://fixture:fixture@qa.test/local');assert.equal(settings.DATABASE_URL,undefined);
});
