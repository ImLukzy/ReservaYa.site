import { describe, expect, it } from 'vitest';
import { puntoEnArequipa } from './ubicacion';
describe('Área operativa de Arequipa',()=>{
 it('accepts city and provincial districts',()=>{expect(puntoEnArequipa(-16.4,-71.53)).toBe(true);expect(puntoEnArequipa(-16.35,-72.13)).toBe(true);});
 it('rejects another city, non-numeric, missing and non-finite coordinates',()=>{for(const p of [[-12.04,-77.03],[0,0],['-16.4',-71.53],[null,-71.53],[NaN,-71.53],[-16.4,Infinity]])expect(puntoEnArequipa(p[0],p[1])).toBe(false);});
});
