/** Drop only a named disposable F7 database, using a fresh connection per attempt. */
export async function dropFixture({name,createClient,bounded,log=message=>{},sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 if(!/^f7_fixture_[a-f0-9]{12}$/.test(name))throw Error('Refusing cleanup outside the F7 fixture namespace');
 let lastError;
 for(let attempt=1;attempt<=3;attempt++){
  const client=createClient();
  try{await bounded(client.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`),'QA drop',15000,false);return;}
  catch(error){lastError=error;log(`F7 QA drop attempt ${attempt}/3 failed`);}
  finally{await bounded(client.$disconnect(),'Cleanup client disconnect',3000,false).catch(()=>{});}
  if(attempt<3)await sleep(1000*attempt);
 }
 throw lastError;
}
