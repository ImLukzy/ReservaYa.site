import { describe, expect, it } from 'vitest';
import { puntoEnArequipa } from './ubicacion';
describe('Área operativa de Arequipa',()=>{
 it('accepts city and provincial districts',()=>{expect(puntoEnArequipa(-16.4,-71.53)).toBe(true);expect(puntoEnArequipa(-16.35,-72.13)).toBe(true);});
 it('rejects another city, non-numeric, missing and non-finite coordinates',()=>{for(const p of [[-12.04,-77.03],[0,0],['-16.4',-71.53],[null,-71.53],[NaN,-71.53],[-16.4,Infinity]])expect(puntoEnArequipa(p[0],p[1])).toBe(false);});
});
import { distanciaKm } from './ubicacion';
describe('distanciaKm (spec 68)',()=>{
 it('es 0 en el mismo punto y ~1 km en la Plaza de Armas',()=>{expect(distanciaKm({latitud:-16.3989,longitud:-71.5369},{latitud:-16.3989,longitud:-71.5369})).toBe(0);expect(distanciaKm({latitud:-16.3989,longitud:-71.5369},{latitud:-16.4079,longitud:-71.5369})).toBeCloseTo(1,0);});
 it('ordena Yanahuara antes que Cayma desde el centro',()=>{const yo={latitud:-16.3989,longitud:-71.5369};expect(distanciaKm(yo,{latitud:-16.39,longitud:-71.54})).toBeLessThan(distanciaKm(yo,{latitud:-16.33,longitud:-71.52}));});
});
