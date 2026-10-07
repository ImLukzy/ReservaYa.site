import {readFileSync,writeFileSync,mkdtempSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
const root=process.cwd(),dbRequire=createRequire(resolve(root,'packages/db/package.json')),apiRequire=createRequire(resolve(root,'apps/api/package.json'));
const {PrismaClient}=dbRequire('@prisma/client'),bcrypt=apiRequire('bcryptjs'),crypto=apiRequire('./dist/auth/crypto.js');
const settings={};for(const line of readFileSync(resolve(root,'hive/qa.env'),'utf8').split('\n')){const m=line.match(/^(TEST_DATABASE_URL(?:_UNPOOLED)?)=(.*)$/);if(m)settings[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');}
if(process.argv[2]!=='--confirm-qa-migracion-ts'||!settings.TEST_DATABASE_URL_UNPOOLED)throw Error('QA connection and confirmation required');
const safe=s=>String(s).replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[QA connection]').replace(/ep-[a-z0-9-]+(?:\.[a-z0-9.-]+)?/g,'[QA endpoint]');
const admin=new PrismaClient({datasources:{db:{url:settings.TEST_DATABASE_URL_UNPOOLED}}}),dbName='f3_fixture_'+randomBytes(6).toString('hex'),scratch=mkdtempSync(resolve(tmpdir(),'rys-f3-'));
const secret=randomBytes(32).toString('hex'),password='Ficticia123!',newPassword='Nueva123!',id='00000000000000000000000000000001',hash=await bcrypt.hash(password,10);
const base={id,nombre:'Jugador A',email:'jugador-a@example.test',password:hash,rol:'USUARIO',activo:true,tokenVersion:0,creadoEn:new Date('2026-01-01Z'),fechaNacimiento:new Date('2000-01-01Z'),username:'jugador_a',usernameCambiadoEn:new Date('2026-01-01Z')};
const f0=JSON.parse(readFileSync(resolve(root,'docs/specs/56/fixtures/endpoint-cases.json'),'utf8')).cases;
const origin='http://127.0.0.1:15110';let db,app,host,created=false;const rows=[],cross=[];const originalFetch=globalThis.fetch;
const fetchLocal=(path,options)=>originalFetch(origin+path,{redirect:'manual',...options});
function decodeJwt(token){const c=crypto.verify(token)||crypto.verify(token,'google-pendiente');if(!c)throw Error('Returned token signature/expiry invalid');const copy={...c};if(copy.exp-copy.nbf!==604800&&copy.exp-copy.nbf!==600)throw Error('Incorrect JWT TTL');delete copy.exp;delete copy.nbf;return copy;}
function cookies(values){return values.map(raw=>{
 const parts=raw.split(';').map(s=>s.trim()),[name,...value]=parts.shift().split('=');const v=decodeURIComponent(value.join('='));
 let normalized=v;if(v&&name==='token')normalized=decodeJwt(v);else if(v&&name==='__oauth_state'){if(Buffer.from(v,'base64').length!==32)throw Error('Bad OAuth state entropy');normalized='[32 random bytes]';}
 const attrs={};for(const part of parts){const [k,...v]=part.split('=');attrs[k.toLowerCase()]=v.length?v.join('=').toLowerCase():true;}
 return {name,value:normalized,attrs};
 }).sort((a,b)=>a.name.localeCompare(b.name));}
const sessionCookie=(response)=>response.cookies.find(c=>c.startsWith('token='))?.split(';')[0];
async function request(backend,path,{method='POST',body,headers={}}={}){
 if(backend==='legacy'){
  const r=await fetchLocal(path,{method,headers:{...headers,...(body!==undefined?{'content-type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});const text=await r.text();return {status:r.status,body:text?JSON.parse(text):null,cookies:r.headers.getSetCookie(),location:r.headers.get('location'),type:(r.headers.get('content-type')||'').split(';')[0]};
 }
 const r=await app.inject({method,url:path,headers,...(body!==undefined?{payload:body}:{})});return {status:r.statusCode,body:r.body?JSON.parse(r.body):null,cookies:typeof r.headers['set-cookie']==='string'?[r.headers['set-cookie']]:r.headers['set-cookie']||[],location:r.headers.location||null,type:String(r.headers['content-type']||'').split(';')[0]};
}
function normalized(response){
 const body=structuredClone(response.body);if(body?.traceId)delete body.traceId;
 if(body?.usuario?.id&&body.usuario.id!==id){if(!/^[a-f0-9]{32}$/.test(body.usuario.id))throw Error('New ID must be GUID N');body.usuario.id='[new GUID N]';}
 const jar=cookies(response.cookies);for(const c of jar){if(c.name==='token'&&typeof c.value==='object'&&c.value.id!==id)c.value.id='[new GUID N]';}
 let location=response.location;
 if(location){const u=new URL(location,'http://localhost');if(u.searchParams.has('state')){const state=u.searchParams.get('state');if(Buffer.from(state,'base64').length!==32)throw Error('Bad redirect state');u.searchParams.set('state','[32 random bytes]');location=u.toString();}if(u.searchParams.has('t')){u.searchParams.set('t',JSON.stringify(decodeJwt(u.searchParams.get('t'))));location=u.toString();}}
 return {status:response.status,body,cookies:jar,location,type:response.type};
}
async function restore(){await db.usuario.deleteMany({where:{id:{not:id}}});await db.usuario.upsert({where:{id},create:base,update:{...base,googleId:null,avatarUrl:null,fotoUrl:null,telefono:null}});}
async function compare(name,endpointId,path,options,prepare){const results=[];for(const backend of ['legacy','nest']){await restore();await prepare?.(backend);results.push(await request(backend,path,options));}const old=normalized(results[0]),next=normalized(results[1]),expected=f0.find(c=>c.id===name)?.expected.status,pass=isDeepStrictEqual(old,next)&&(expected===undefined||old.status===expected);rows.push({id:name,endpointId,path,result:pass?'PASS':'FAIL',...(pass?{status:old.status}:{legacy:old,nest:next})});}
try{
 await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);created=true;const url=new URL(settings.TEST_DATABASE_URL_UNPOOLED);url.pathname='/'+dbName;
 const env={PATH:process.env.PATH,HOME:process.env.HOME,DOTNET_ROOT:process.env.DOTNET_ROOT||'/home/lukzy/.dotnet',TZ:'UTC',JWT_SECRET:secret,DATABASE_URL:url.toString(),DATABASE_URL_UNPOOLED:url.toString(),COOKIE_SECURE:'false',PASSWORD_RESET_URL:'http://localhost:3100/restablecer',GOOGLE_CLIENT_ID:'fixture-client',GOOGLE_CLIENT_SECRET:'fixture-secret',GOOGLE_REDIRECT_URI:'http://localhost:3100/api/auth/google/callback',F3_QA_FIXTURE:'true',ASPNETCORE_ENVIRONMENT:'Production'};
 const migrate=spawnSync(process.execPath,[dbRequire.resolve('prisma/build/index.js'),'migrate','deploy','--schema',resolve(root,'packages/db/prisma/schema.prisma')],{env,encoding:'utf8'});if(migrate.status!==0)throw Error(safe(migrate.stderr||migrate.stdout));
 db=new PrismaClient({datasources:{db:{url:url.toString()}}});Object.assign(process.env,env);
 const content=resolve(scratch,'content');mkdirSync(content,{recursive:true});host=spawn('/home/lukzy/.dotnet/dotnet',[resolve(root,'tests/legacy-auth-host/bin/Release/net10.0/LegacyAuthHost.dll'),'--contentRoot',content,'--urls',origin],{env,cwd:content,stdio:['ignore','pipe','pipe']});let hostLogs='';host.stdout.on('data',b=>hostLogs+=safe(b));host.stderr.on('data',b=>hostLogs+=safe(b));
 for(let i=0;i<150;i++){try{if((await fetchLocal('/_test/health')).ok)break;}catch{}if(host.exitCode!==null)throw Error('Legacy fixture startup failed: '+hostLogs);await new Promise(r=>setTimeout(r,200));if(i===149)throw Error('Fixture startup timeout');}
 // Only mocked Google endpoints may be intercepted; all data comes from local fixture RSA keys.
 globalThis.fetch=async(input,options)=>{
  const u=String(input);if(u==='https://oauth2.googleapis.com/token'){const code=new URLSearchParams(options.body).get('code');return fetchLocal('/_test/google-token?code='+encodeURIComponent(code));}
  if(u==='https://www.googleapis.com/oauth2/v3/certs')return fetchLocal('/_test/jwks');
  if(/googleapis\.com|accounts\.google\.com|resend\.com/.test(u))throw Error('External provider forbidden');return originalFetch(input,options);
 };
 app=await apiRequire('./dist/app.js').createApp();await app.init();await app.getHttpAdapter().getInstance().ready();
 const captured=[];const mail=app.get(apiRequire('./dist/auth/providers.js').MailProvider);mail.send=async m=>{captured.push(m);};
 const token=crypto.sign({id,email:base.email,nombre:base.nombre,rol:'USUARIO',tv:0},604800),auth={cookie:'token='+token};
 const reset=crypto.resetToken(id,0,hash),pending=crypto.sign({sub:'fixture-new',email:'google-new@example.test',name:'Google Nuevo',picture:'https://example.invalid/avatar.png',aud:'google-pendiente'},600,'google-pendiente');
 const calls=[
 ['E005-nominal','E005','login',{email:base.email,password}],['E005-payload-invalido','E005','login',{}],['E005-credenciales-invalidas','E005','login',{email:base.email,password:'wrong'}],
 ['E006-nominal','E006','register',{nombre:'Jugador Nuevo',email:'nuevo@example.test',password:newPassword,fechaNacimiento:'2000-01-01',username:'jugador_nuevo'}],['E006-payload-invalido','E006','register',{}],['E006-menor14','E006','register',{nombre:'Niño',email:'child@example.test',password:newPassword,fechaNacimiento:new Date(Date.now()-365*86400000).toISOString().slice(0,10),username:'child_name'}],['E006-duplicate','E006','register',{nombre:'Duplicado',email:base.email,password:newPassword,fechaNacimiento:'2000-01-01',username:'jugador_a'}],
 ['E007-nominal','E007','logout',undefined,auth],['E007-token-invalido','E007','logout',undefined,{cookie:'token=invalid'}],
 ['E008-nominal','E008','forgot-password',{email:base.email}],['E008-payload-invalido','E008','forgot-password',{}],['E008-unknown','E008','forgot-password',{email:'missing@example.test'}],
 ['E009-nominal','E009','reset-password',{token:reset,password:newPassword}],['E009-payload-invalido','E009','reset-password',{token:'invalid',password:newPassword}],
 ['E010-nominal','E010','refrescar',undefined,auth],['E010-sin-sesion','E010','refrescar'],['E011-nominal','E011','me',undefined,auth],['E011-sin-sesion','E011','me'],
 ['E014-nominal','E014','google/completar',{t:pending,fechaNacimiento:'2000-01-01',username:'google_nuevo'}],['E014-payload-invalido','E014','google/completar',{t:'invalid',fechaNacimiento:'2000-01-01',username:'google_nuevo'}],
 ];
 let seq=0;for(const [name,e,route,body,headers]of calls)await compare(name,e,'/api/auth/'+route,{method:route==='me'?'GET':'POST',body,headers:{...headers,'x-forwarded-for':'192.0.2.'+(++seq)}});
 for(const route of ['me','refrescar'])for(const state of ['revoked','inactive'])await compare(`session-${route}-${state}`,route==='me'?'E011':'E010','/api/auth/'+route,{method:route==='me'?'GET':'POST',headers:auth},async()=>db.usuario.update({where:{id},data:state==='revoked'?{tokenVersion:1}:{activo:false}}));
 for(const url of ['/api/auth/google?returnUrl=%2Fdashboard','/api/auth/google?returnUrl=%2F%2Fevil.invalid','/api/auth/google/callback','/api/auth/google/callback?code=new&state=wrong'])await compare('google-'+(++seq),url.includes('callback')?'E013':'E012',url,{method:'GET'});
 for(const code of ['existing','new','unverified'])await compare('google-callback-'+code,'E013',`/api/auth/google/callback?code=${code}&state=fixed-state`,{method:'GET',headers:{cookie:'__oauth_state=fixed-state; __oauth_returnurl=%2Fdashboard'}});
 const google=app.get(apiRequire('./dist/auth/providers.js').GoogleProvider),configured=google.configured;
 google.configured=()=>false;await fetchLocal('/_test/google-enabled?enabled=false',{method:'POST'});
 try{await compare('E012-google-desactivado','E012','/api/auth/google',{method:'GET'});await compare('E014-no-config','E014','/api/auth/google/completar',{body:{}});}finally{google.configured=configured;await fetchLocal('/_test/google-enabled?enabled=true',{method:'POST'});}
 for(const route of ['me','refrescar'])await compare((route==='me'?'E011':'E010')+'-tv-revocado',route==='me'?'E011':'E010','/api/auth/'+route,{method:route==='me'?'GET':'POST',headers:auth},async()=>db.usuario.update({where:{id},data:{tokenVersion:1}}));
 await compare('E009-reset-usado','E009','/api/auth/reset-password',{body:{token:reset,password:newPassword}},async()=>db.usuario.update({where:{id},data:{tokenVersion:1}}));
 await compare('E012-nominal','E012','/api/auth/google',{method:'GET'});
 await compare('E013-nominal','E013','/api/auth/google/callback?code=new&state=fixed-state',{method:'GET',headers:{cookie:'__oauth_state=fixed-state'}});
 await compare('E013-sin-code-state','E013','/api/auth/google/callback',{method:'GET'});
 for(const source of ['legacy','nest']){
  await restore();const target=source==='legacy'?'nest':'legacy';
  const login=await request(source,'/api/auth/login',{body:{email:base.email,password}}),cookie=sessionCookie(login);
  const accepted=await request(target,'/api/auth/me',{method:'GET',headers:{cookie}});
  const logout=await request(target,'/api/auth/logout',{headers:{cookie}});
  const rejected=await request(source,'/api/auth/me',{method:'GET',headers:{cookie}});
  cross.push({id:`session-${source}-to-${target}`,result:login.status===200&&accepted.status===200&&logout.status===200&&rejected.status===403?'PASS':'FAIL'});
 }
 for(const source of ['legacy','nest']){
  await restore();const target=source==='legacy'?'nest':'legacy',before=captured.length,legacyBefore=source==='legacy'?(await (await fetchLocal('/_test/emails')).json()).length:0;
  await request(source,'/api/auth/forgot-password',{body:{email:base.email},headers:{'x-forwarded-for':'198.51.100.'+(++seq)}});
  let link;
  for(let i=0;i<100;i++){if(source==='nest')link=captured[before]?.link;else{const messages=await (await fetchLocal('/_test/emails')).json();link=messages[legacyBefore]?.text.match(/https?:\/\/\S+#t=[A-Za-z0-9_.-]+/)?.[0];}if(link)break;await new Promise(r=>setTimeout(r,20));}
  if(!link)throw Error('Captured reset link missing');const t=link.split('#t=')[1];
  const used=await request(target,'/api/auth/reset-password',{body:{token:t,password:newPassword},headers:{'x-forwarded-for':'203.0.113.'+(++seq)}});
  const again=await request(source,'/api/auth/reset-password',{body:{token:t,password:newPassword},headers:{'x-forwarded-for':'203.0.113.'+(++seq)}});
  cross.push({id:`reset-${source}-to-${target}-one-use`,result:used.status===200&&again.status===400?'PASS':'FAIL'});
 }
 for(const backend of ['legacy','nest']){
  await restore();const headers={'x-forwarded-for':'203.0.113.222'};
  const states=[];for(let i=0;i<6;i++)states.push((await request(backend,'/api/auth/login',{body:{email:base.email,password:'wrong'},headers})).status);
  cross.push({id:'rate-login-'+backend,result:isDeepStrictEqual(states,[401,401,401,401,401,429])?'PASS':'FAIL'});
 }
 writeFileSync(resolve(root,'docs/specs/56/f3/parity-results.json'),JSON.stringify({runtime:process.version,basis:'Actual legacy AuthController/GoogleOAuth/ValidSessionHandler with captured mail and in-memory RSA Google HTTP provider, no external provider calls',normalization:['JWTs cryptographically verified; random nbf/exp omitted only after exact TTL check','New register IDs validated GUID N and mapped','OAuth state validated 32 bytes and mapped; pending JWT verified','Cookie attributes compared semantically without changing flags; traceId only random'],rows,cross},null,2)+'\n');
 console.log(`F3 parity ${rows.filter(r=>r.result==='PASS').length}/${rows.length}; cross ${cross.filter(r=>r.result==='PASS').length}/${cross.length}`);if([...rows,...cross].some(r=>r.result==='FAIL'))process.exitCode=1;
}catch(e){console.error(safe(e?.stack||String(e)));process.exitCode=1;}
finally{globalThis.fetch=originalFetch;if(host){host.kill('SIGTERM');await new Promise(r=>{if(host.exitCode!==null)return r();host.once('exit',r);setTimeout(()=>{host.kill('SIGKILL');r();},5000);});}await app?.close();await db?.$disconnect();if(created){await admin.$executeRawUnsafe(`DROP DATABASE "${dbName}" WITH (FORCE)`);console.log('Disposable F3 QA database removed');}await admin.$disconnect();}
