import { describe, expect, it } from 'vitest';
import { Prisma } from '@reservaya/db';
import { parseDay, quote, slot, utc } from './format';
import { bind } from './binding';
const promo = (fields: Partial<Prisma.PromocionGetPayload<object>> = {}): Prisma.PromocionGetPayload<object> => ({id:'promo',complejoId:null,canchaId:null,nombre:'Precio prueba',descripcion:null,tipo:'PRECIO_ESPECIAL',valor:new Prisma.Decimal(50),horaDesde:null,horaHasta:null,diasSemana:[],fechaInicio:null,fechaFin:null,codigo:null,usosMax:null,usosActuales:0,activa:true,creadoEn:new Date('2026-01-01Z'),inicioNoche:null,inicioTarde:null,precioDia:null,precioNoche:null,precioTarde:null,repetirAnual:false,...fields});
describe('Legacy public price/calendar contracts', () => {
  it('preserves decimal money and legacy charging of partial hours', () => {
    expect(quote(new Prisma.Decimal('50.10'),[],new Date('2026-10-10Z'),1080,1141)).toEqual({total:'100.20',regla:null});
  });
  it('falls through unset afternoon band to the next applicable price', () => {
    const band = promo({precioDia:new Prisma.Decimal(10),precioNoche:new Prisma.Decimal(20)});
    expect(quote(new Prisma.Decimal(100),[band,promo({valor:new Prisma.Decimal(30)})],new Date('2026-10-10Z'),1080,1140)).toEqual({total:'30.00',regla:'Precio prueba'});
  });
  it('handles annual ranges crossing New Year and weekday exclusions', () => {
    const annual=promo({repetirAnual:true,fechaInicio:new Date('2020-12-01Z'),fechaFin:new Date('2021-01-31Z')});
    expect(quote(new Prisma.Decimal(100),[annual],new Date('2026-01-10Z'),600,660).total).toBe('50.00');
    expect(quote(new Prisma.Decimal(100),[annual],new Date('2026-06-10Z'),600,660).total).toBe('100.00');
    expect(quote(new Prisma.Decimal(100),[promo({diasSemana:[0]})],new Date('2026-10-10Z'),600,660).total).toBe('100.00');
  });
  it('rejects impossible days and partial/reversed slots', () => {
    expect(parseDay('2026-02-30')).toBeNull();
    expect(()=>slot('2026-10-10',null,1140)).toThrow();
    expect(()=>slot('2026-10-10',1140,1080)).toThrow();
    expect(slot(undefined,null,null)).toBeNull();
  });
  it('matches UTC fractional formatting and binding errors', () => {
    expect(utc(new Date('2026-01-01T00:00:00.000Z'))).toBe('2026-01-01T00:00:00Z');
    expect(utc(new Date('2026-01-01T00:00:00.120Z'))).toBe('2026-01-01T00:00:00.12Z');
    expect(()=>bind({horaInicio:'x',horaFin:'1.5'},['horaInicio','horaFin'])).toThrow();
    expect(()=>bind({activas:'1'},[],['activas'])).toThrow();
  });
});
