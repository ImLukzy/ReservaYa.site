import { beforeEach, describe, expect, it } from 'vitest';
import { sign, verify, resetToken, readReset, fingerprint, sameFingerprint } from './crypto';
import { RateLimiter } from './rate';
beforeEach(()=>{process.env.JWT_SECRET='fixture-only-key-with-at-least-32-characters';});
describe('Legacy authentication security contracts',()=>{
 it('separates session and Google pending keys',()=>{
  const s=sign({id:'actor',rol:'USUARIO',tv:0},604800);
  expect(verify(s)?.id).toBe('actor');expect(verify(s,'google-pendiente')).toBeNull();
  const p=sign({sub:'google',email:'a@example.test',aud:'google-pendiente'},600,'google-pendiente');
  expect(verify(p)).toBeNull();expect(verify(p,'google-pendiente')?.sub).toBe('google');
 });
 it('rejects tampered signatures, expired JWT and reset links',()=>{
  const token=sign({id:'actor'},-100);
  expect(verify(token)).toBeNull();
  const current=sign({id:'actor'},100);
  expect(verify(current.slice(0,-3)+'abc')).toBeNull();
  expect(readReset('invalid')).toBeNull();expect(readReset('a'.repeat(513))).toBeNull();
 });
 it('binds reset links to the current password fingerprint and version',()=>{
  const token=resetToken('actor',3,'bcrypt-hash');
  expect(readReset(token)).toEqual(expect.objectContaining({sub:'actor',tv:3,ph:fingerprint('bcrypt-hash')}));
  expect(sameFingerprint('changed',readReset(token)!.ph)).toBe(false);
 });
 it('matches the rate-limit threshold and resets after successful login',()=>{
  const r=new RateLimiter();for(let i=0;i<5;i++)expect(r.limited('login',5,900000)).toBe(false);
  expect(r.limited('login',5,900000)).toBe(true);r.reset('login');expect(r.limited('login',5,900000)).toBe(false);
 });
});
