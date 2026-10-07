import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
/** CI accepts only a loopback disposable PostgreSQL service, never QA credentials. */
export function parityEnvironment({root,ci,smoke=false,env=process.env,readLocal=()=>readFileSync(resolve(root,'hive/qa.env'),'utf8')}){
 if(ci){
  let url;try{url=new URL(env.PARITY_DATABASE_URL);}catch{throw Error('--ci requires PARITY_DATABASE_URL for local disposable PostgreSQL');}
  if(!['postgres:','postgresql:'].includes(url.protocol)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.pathname.length<2)throw Error('CI parity requires a loopback PostgreSQL service');
  url.searchParams.set('sslmode','disable');return {TEST_DATABASE_URL:url.toString(),TEST_DATABASE_URL_UNPOOLED:url.toString()};
 }
 const settings={};for(const line of (smoke?'TEST_DATABASE_URL_UNPOOLED=postgresql://fixture:fixture@localhost/fixture':readLocal()).split('\n')){const m=line.match(/^(TEST_DATABASE_URL(?:_UNPOOLED)?)=(.*)$/);if(m)settings[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');}
 return settings;
}
