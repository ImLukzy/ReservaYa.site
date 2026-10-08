import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyRequest } from 'fastify';
import type { Access } from '../management/access';
import { Ubicacion } from './ubicacion';
const r={} as FastifyRequest;
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.useRealTimers();});
function service(){return new Ubicacion({actor:async()=>({id:'owner',rol:'ADMIN'})} as unknown as Access);}
const result={display_name:'Fixture Cayma',lat:'-16.4',lon:'-71.53',address:{city_district:'Cayma'}};
describe('Nominatim proxy',()=>{
 it('caches identical requests, filters Arequipa and sends application identity',async()=>{
  const fetcher=vi.fn(async()=>Response.json([result,{...result,lat:'0',lon:'0'}]));vi.stubGlobal('fetch',fetcher);
  const geo=service();const first=await geo.buscar({q:'Fixture'},r),second=await geo.buscar({q:'Fixture'},r);
  expect(first).toEqual(second);expect(first.lugares).toEqual([{nombre:'Fixture Cayma',latitud:-16.4,longitud:-71.53,distrito:'Cayma'}]);expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('bounded=1'),expect.anything());
  expect(fetcher).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({headers:expect.objectContaining({'User-Agent':expect.stringContaining('ReservaYa'),Referer:'https://reservaya.site/'})}));
 });
 it('serializes application requests with at least one second and shares queued duplicates',async()=>{
  vi.useFakeTimers();vi.setSystemTime(10000);const times:number[]=[];
  vi.stubGlobal('fetch',vi.fn(async()=>{times.push(Date.now());return Response.json([result]);}));const geo=service();
  const a=geo.buscar({q:'Fixture A'},r),b=geo.buscar({q:'Fixture B'},r),c=geo.buscar({q:'Fixture B'},r);
  await vi.advanceTimersByTimeAsync(2200);await Promise.all([a,b,c]);expect(times).toHaveLength(2);expect(times[1]-times[0]).toBeGreaterThanOrEqual(1000);
 });
 it('validates reverse location before contacting the provider',async()=>{const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);await expect(service().buscar({latitud:'0',longitud:'0'},r)).rejects.toMatchObject({status:400});expect(fetcher).not.toHaveBeenCalled();});
 it('returns a visible service error when the provider fails',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('offline');}));await expect(service().buscar({q:'Fixture'},r)).rejects.toMatchObject({status:503});});
});
