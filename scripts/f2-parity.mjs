import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
const root = process.cwd(), requireDb = createRequire(resolve(root,'packages/db/package.json'));
/** @type {typeof import('../packages/db/dist/index.js').PrismaClient} */
const PrismaClient = requireDb('@prisma/client').PrismaClient;
const settings={};
for(const line of readFileSync(resolve(root,'hive/qa.env'),'utf8').split('\n')){
 const m=line.match(/^(TEST_DATABASE_URL(?:_UNPOOLED)?)=(.*)$/);if(m)settings[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');
}
if(process.argv[2]!=='--confirm-qa-migracion-ts'||!settings.TEST_DATABASE_URL_UNPOOLED)throw Error('QA confirmation and test connection required');
const admin=new PrismaClient({datasources:{db:{url:settings.TEST_DATABASE_URL_UNPOOLED}}});
const dbName='f2_fixture_'+randomBytes(6).toString('hex'), scratch=mkdtempSync(resolve(tmpdir(),'rys-f2-'));
const safe=s=>String(s).replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[QA connection]').replace(/ep-[a-z0-9-]+(?:\.[a-z0-9.-]+)?/g,'[QA endpoint]');
const now=new Date(), today=new Date(now.toISOString().slice(0,10)+'T00:00:00Z'), future=new Date(today.getTime()+86400000), past=new Date(today.getTime()-86400000);
const date=d=>d.toISOString().slice(0,10), fixture=JSON.parse(readFileSync(resolve(root,'docs/specs/56/fixtures/dataset.json'),'utf8')), ids={...fixture.ids,ownerExpired:'f2-owner-expired'};
const secret=randomBytes(32).toString('hex');
let db, app, legacy, created=false;
const rows=[];
const jwt=(id,rol)=>{const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),p=Buffer.from(JSON.stringify({id,rol,tv:0,nbf:Math.floor(Date.now()/1000)-1,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');return `${h}.${p}.${createHmac('sha256',secret).update(`${h}.${p}`).digest('base64url')}`;};
const childEnv={PATH:process.env.PATH,HOME:process.env.HOME,DOTNET_ROOT:process.env.DOTNET_ROOT||'/home/lukzy/.dotnet',TZ:'UTC',JWT_SECRET:secret,FRONTEND_ORIGIN:'http://127.0.0.1:3100',COOKIE_SECURE:'false',ASPNETCORE_ENVIRONMENT:'Production'};
try {
 await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);created=true;
 const url=new URL(settings.TEST_DATABASE_URL_UNPOOLED);url.pathname='/'+dbName;
 const env={...childEnv,DATABASE_URL:url.toString(),DATABASE_URL_UNPOOLED:url.toString()};
 const migrate=spawnSync(process.execPath,[requireDb.resolve('prisma/build/index.js'),'migrate','deploy','--schema',resolve(root,'packages/db/prisma/schema.prisma')],{env,encoding:'utf8'});
 if(migrate.status!==0)throw Error(safe(migrate.stderr||migrate.stdout));
 db=new PrismaClient({datasources:{db:{url:url.toString()}}});
 /** @type {Array<[string,NonNullable<import('../packages/db/dist/index.js').Prisma.UsuarioCreateInput['rol']>]>} */
 const people=[['duenoA','SUPERADMIN'],['duenoB','SUPERADMIN'],['jugadorA','USUARIO'],['jugadorB','USUARIO'],['organizadorA','USUARIO'],['tecnico','TECNICO'],['adminA','ADMIN'],['ownerExpired','SUPERADMIN']];
 for(const [key,rol]of people)await db.usuario.create({data:{id:ids[key],nombre:'Prueba '+key,email:key+'@example.test',password:'not-a-real-password',rol,creadoEn:today}});
 const complex=async(id,duenoId,nombre,published,sub=true,age=40)=>{
  await db.complejo.create({data:{id,duenoId,nombre,publicado:published,direccion:'Ficticia',distrito:'Cayma',slug:id,creadoEn:new Date(now.getTime()-age*86400000),actualizadoEn:today}});
  if(sub)await db.suscripcion.create({data:{id:'sub-'+id,complejoId:id,plan:'MENSUAL',estado:'ACTIVA',fechaInicio:past,fechaFin:new Date(today.getTime()+20*86400000)}});
 };
 await complex(ids.complejoA,ids.duenoA,'Complejo Prueba A',true);await complex(ids.complejoB,ids.duenoB,'Complejo Prueba B',true);
 await complex('hidden-complex',ids.duenoB,'Oculto',false);await complex('expired-complex',ids.duenoB,'Vencido',true,false);
 await complex('trial-complex',ids.duenoA,'Prueba Reciente',true,false,5);
 await complex('owner-expired-complex',ids.ownerExpired,'Vencido Único',true,false);
 await complex('pending-complex',ids.jugadorA,'Solicitud pendiente',true,false,5);
 await db.complejoMiembro.create({data:{id:'member-a',complejoId:ids.complejoA,usuarioId:ids.adminA,rolSede:'ADMIN',activo:true}});
 const cancha=async(id,nombre,complejoId,activa=true)=>db.cancha.create({data:{id,nombre,complejoId,activa,tipo:'FUTBOL5',precioPorHora:'50.10',capacidad:10,creadoEn:today}});
 await cancha(ids.canchaA,'Cancha Prueba A',ids.complejoA);await cancha(ids.canchaB,'Cancha Prueba B',ids.complejoB);
 await cancha('inactive-court','Inactiva',ids.complejoA,false);await cancha('hidden-court','Oculta','hidden-complex');await cancha('expired-court','Vencida','expired-complex');await cancha('pending-court','Pendiente','pending-complex');await cancha('trial-court','Trial','trial-complex');
 for(let i=0;i<12;i++)await cancha('legacy-'+i,'Legacy '+String(i).padStart(2,'0'),null);
 await db.promocion.create({data:{id:'global-price',nombre:'Global',tipo:'PRECIO_ESPECIAL',valor:'40.00',creadoEn:past}});
 await db.promocion.create({data:{id:'court-price',nombre:'Especial A',tipo:'PRECIO_ESPECIAL',valor:'35.50',canchaId:ids.canchaA,creadoEn:today}});
 await db.reserva.create({data:{id:'occupied',usuarioId:ids.jugadorA,canchaId:ids.canchaB,fecha:future,horaInicio:1080,horaFin:1140,estado:'CONFIRMADA',total:'50.10',codigo:'F2-TEST'}});
 await db.resena.create({data:{id:'review-a',complejoId:ids.complejoA,usuarioId:ids.jugadorA,puntuacion:5,comentario:'Comentario ficticio',creadoEn:today}});
 await db.resena.create({data:{id:'review-b',complejoId:ids.complejoA,usuarioId:ids.jugadorB,puntuacion:4,creadoEn:past}});
 /** @type {Array<[string,Date,string,string]>} */
 const matches = [['match-today',today,'Principiante','Prueba Hoy'],['match-future',future,'Intermedio','Prueba Mañana'],['match-past',past,'Avanzado','Prueba Ayer']];
 for(const [id,fecha,nivel,titulo] of matches)await db.partidoAbierto.create({data:{id,organizadorId:ids.organizadorA,titulo,formato:'Fútbol 5',nivel,cuposTotales:10,distrito:'Cayma',cancha:'Cancha Prueba',precio:'10.25',fecha,desdeMin:1080,hastaMin:1140,creadoEn:today}});
 await db.anotacionPartido.create({data:{id:'joined-a',partidoId:'match-future',usuarioId:ids.jugadorA}});
 process.env.DATABASE_URL=url.toString();process.env.DATABASE_URL_UNPOOLED=url.toString();process.env.JWT_SECRET=secret;process.env.TZ='UTC';
 app=await createRequire(resolve(root,'apps/api/package.json'))('./dist/app.js').createApp();await app.init();await app.getHttpAdapter().getInstance().ready();
 const content=resolve(scratch,'runtime/legacy');mkdirSync(content,{recursive:true});
 legacy=spawn('/home/lukzy/.dotnet/dotnet',[resolve(root,'apps/api-dotnet/bin/Release/net10.0/ReservaFacil.Api.dll'),'--contentRoot',content,'--urls','http://127.0.0.1:15100'],{env,cwd:content,stdio:['ignore','pipe','pipe']});
 let logs='';legacy.stdout.on('data',b=>logs+=safe(b));legacy.stderr.on('data',b=>logs+=safe(b));
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:15100/healthz')).ok)break;}catch{}if(legacy.exitCode!==null)throw Error('Legacy failed: '+logs);await new Promise(r=>setTimeout(r,200));if(i===99)throw Error('Legacy startup timeout');}
 const all=JSON.parse(readFileSync(resolve(root,'docs/specs/56/fixtures/endpoint-cases.json'),'utf8')).cases.filter(c=>['E024','E025','E029','E030','E031','E052','E066'].includes(c.endpointId));
 const interpolate=s=>String(s).replace(/\$\{ids\.([^}]+)\}/g,(_,key)=>ids[key]).replace(/\$\{dates\.futureDay\}/g,date(future));
 const cases=all.map(c=>({id:c.id,endpointId:c.endpointId,path:interpolate(c.request.path),query:Object.fromEntries(Object.entries(c.request.query).map(([k,v])=>[k,interpolate(v)])),expected:c.expected.status}));
 const add=(id,endpointId,path,query={},actor=null)=>cases.push({id,endpointId,path,query,actor});
 add('expired-owner-list','E024','/api/canchas',{},['ownerExpired','SUPERADMIN']);add('expired-owner-get','E025',`/api/canchas/${ids.canchaA}`,{},['ownerExpired','SUPERADMIN']);
 add('list-all','E024','/api/canchas');add('list-inactive','E024','/api/canchas',{activas:false});add('list-own-owner','E024','/api/canchas',{propias:true},['duenoA','SUPERADMIN']);add('list-own-member','E024','/api/canchas',{propias:true},['adminA','ADMIN']);add('list-own-platform','E024','/api/canchas',{propias:true},['tecnico','TECNICO']);
 add('limit-10','E029','/api/canchas/disponibles');add('slot-occupied','E029','/api/canchas/disponibles',{fecha:date(future),horaInicio:1080,horaFin:1140});add('filter-city-legacy','E029','/api/canchas/disponibles',{ciudad:'NO_CITY'});add('invalid-slot','E029','/api/canchas/disponibles',{fecha:date(future)});add('invalid-date','E029','/api/canchas/disponibles',{fecha:'2026-02-30',horaInicio:1080,horaFin:1140});add('invalid-integer','E029','/api/canchas/disponibles',{horaInicio:'x',horaFin:'1.5'});add('invalid-bool','E024','/api/canchas',{activas:'x'});
 add('quote-required','E031',`/api/canchas/${ids.canchaA}/cotizar`);add('quote-inactive','E031','/api/canchas/inactive-court/cotizar',{fecha:date(future),horaInicio:1080,horaFin:1140});add('quote-partial','E031',`/api/canchas/${ids.canchaA}/cotizar`,{fecha:date(future),horaInicio:1080,horaFin:1141});
 add('reviews-hidden','E066','/api/resenas/publicas',{complejoId:'hidden-complex'});add('reviews-expired','E066','/api/resenas/publicas',{complejoId:'expired-complex'});add('reviews-empty','E066','/api/resenas/publicas',{complejoId:ids.complejoB});add('partidos-personalized','E052','/api/partidos',{},['jugadorA','USUARIO']);add('partidos-ignore-level','E052','/api/partidos',{nivel:'INVALID'});add('partidos-literal-wildcard','E052','/api/partidos',{q:'%'});
 for(const c of cases){
  const query=new URLSearchParams(Object.entries(c.query).map(([k,v])=>[k,String(v)])).toString(),path=c.path+(query?'?'+query:'');
  const headers=c.actor?{cookie:'token='+jwt(ids[c.actor[0]],c.actor[1])}:{};
  const old=await fetch('http://127.0.0.1:15100'+path,{headers}),next=await app.inject({method:'GET',url:path,headers});
  const oldBody=await old.json(),nextBody=next.json();
  const traceValid=(!oldBody.traceId&&!nextBody.traceId)||(/^00-[a-f0-9]{32}-[a-f0-9]{16}-0[01]$/.test(oldBody.traceId)&&/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/.test(nextBody.traceId));
  delete oldBody.traceId;delete nextBody.traceId;
  const headerPairs=['content-type','cache-control','set-cookie'].map(key=>[key,key==='content-type'?(old.headers.get(key)||'').split(';')[0]:old.headers.get(key)||null,key==='content-type'?String(next.headers[key]||'').split(';')[0]:next.headers[key]||null]);
  const headersPass=headerPairs.every(([,a,b])=>a===b);
  const pass=headersPass&&old.status===next.statusCode&&(c.expected===undefined||old.status===c.expected)&&traceValid&&isDeepStrictEqual(oldBody,nextBody);
  rows.push({id:c.id,endpointId:c.endpointId,method:'GET',path:c.path,statusLegacy:old.status,statusNest:next.statusCode,headers:Object.fromEntries(headerPairs.map(([key,a,b])=>[key,{legacy:a,nest:b}])),result:pass?'PASS':'FAIL',...(pass?{}:{legacy:oldBody,nest:nextBody})});
 }
 for(const path of ['/api/caja/hoy','/api/reservas','/api/abonos','/api/metas','/api/reportes/dashboard']){const response=await app.inject({method:'GET',url:path});if(response.statusCode!==404)throw Error('Out-of-scope route exposed: '+path);}
 writeFileSync(resolve(root,'docs/specs/56/f2/parity-results.json'),JSON.stringify({runtime:process.version,basis:'F0 cases + synthetic disposable QA fixture database shared by read-only .NET/Nest calls',normalization:['traceId only: validate shape, remove random request IDs; no business field normalization'],rows},null,2)+'\n');
 console.log(`F2 parity ${rows.filter(r=>r.result==='PASS').length}/${rows.length}; per-route results saved`);
 if(rows.some(r=>r.result==='FAIL'))process.exitCode=1;
} catch(error){console.error(safe(error?.stack||String(error)));process.exitCode=1;}
finally{if(legacy){legacy.kill('SIGTERM');await new Promise(r=>{if(legacy.exitCode!==null)return r();legacy.once('exit',r);setTimeout(()=>{legacy.kill('SIGKILL');r();},5000);});}await app?.close();await db?.$disconnect();if(created){try{await admin.$executeRawUnsafe(`DROP DATABASE "${dbName}" WITH (FORCE)`);console.log('Disposable QA fixture database removed');}catch(error){console.error(safe(error));process.exitCode=1;}}await admin.$disconnect();rmSync(scratch,{recursive:true,force:true});}
