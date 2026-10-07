import { districts } from '../public/districts';
import { utc } from '../public/format';
// .NET Enum.TryParse(ignoreCase): names, comma-combined flags or integers. Undefined numeric values are rejected.
export function parseEnum<T extends string>(names:readonly T[],value?:string|null):T|null{
  const text=value?.trim();if(!text)return null;
  if(/^[+-]?\d+$/.test(text))return names[Number(text)]??null;
  let result=0;for(const part of text.split(',')){const i=names.findIndex(n=>n.toUpperCase()===part.trim().toUpperCase());if(i<0)return null;result|=i;}
  return names[result]??null;
}
export const netRoles=['USUARIO','PERSONAL','ADMIN','SUPERADMIN','TECNICO'] as const;
export const courtTypes=['FUTBOL','FUTBOL5','FUTBOL7','PADEL','TENIS','BASQUET','VOLLEYBALL','LOZA'] as const;
export const district=(v?:string|null)=>{const t=v?.trim().toUpperCase();return t?districts.find(d=>d.toUpperCase()===t)??null:null;};
export const clean=(s?:string|null)=>s?.trim()||null;
// Math.Round(double, digits) uses banker's rounding.
export function roundEven(value:number,digits:number){const f=10**digits,scaled=value*f,floor=Math.floor(scaled),diff=scaled-floor;return (Math.abs(diff-0.5)<1e-9?(floor%2===0?floor:floor+1):Math.round(scaled))/f;}
export const plain=(d:Date)=>utc(d).replace(/Z$/,'');
// Calendar day of the host (DateTime.Today) as a timezone-free database date.
export const hostToday=(now:Date)=>new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));
export const utcToday=(now:Date)=>new Date(now.toISOString().slice(0,10)+'T00:00:00Z');
const pad=(n:number,l=2)=>String(Math.abs(n)).padStart(l,'0');
// DateTime.TryParse(InvariantCulture, RoundtripKind) for ISO and invariant MM/dd/yyyy values.
// date keeps the wall clock written to a timestamp column; json is the in-memory DateTime serialization.
export function parseNetDateTime(value:string):{date:Date;json:string}|null{
  const text=value.trim();let m=text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(\.\d{1,7})?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i);
  let parts:number[];let fraction='';let zone:string|undefined;
  if(m){parts=[+m[1],+m[2],+m[3],+(m[4]??0),+(m[5]??0),+(m[6]??0)];fraction=m[7]??'';zone=m[8];}
  else{m=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);if(!m)return null;parts=[+m[3],+m[1],+m[2],+(m[4]??0),+(m[5]??0),+(m[6]??0)];}
  const [y,mo,d,h,mi,s]=parts,ms=Math.floor(Number('0'+(fraction||'.0'))*1000);
  const wall=new Date(Date.UTC(y,mo-1,d,h,mi,s,ms));
  if(wall.getUTCFullYear()!==y||wall.getUTCMonth()!==mo-1||wall.getUTCDate()!==d||h>23||mi>59||s>59)return null;
  const digits=fraction.slice(1).replace(/0+$/,''),frac=digits?'.'+digits:'';
  const stamp=(t:Date)=>`${t.getUTCFullYear()}-${pad(t.getUTCMonth()+1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}${frac}`;
  if(!zone)return {date:wall,json:stamp(wall)};
  if(zone.toUpperCase()==='Z')return {date:wall,json:stamp(wall)+'Z'};
  // Offsets become DateTimeKind.Local on the host.
  const z=zone.replace(':',''),offset=(z[0]==='-'?-1:1)*(Number(z.slice(1,3))*60+Number(z.slice(3,5)||0)),instant=new Date(wall.getTime()-offset*60000);
  const local=-instant.getTimezoneOffset(),localWall=new Date(instant.getTime()+local*60000);
  return {date:localWall,json:stamp(localWall)+(local<0?'-':'+')+pad(Math.trunc(local/60))+':'+pad(local%60)};
}
// TimeSpan.TryParse limited to [0, 1 day) and truncated to whole minutes.
export function parseTimeOfDay(value?:string|null):number|null{
  const text=value?.trim();if(!text)return null;
  if(/^-?\d+$/.test(text))return Number(text)===0?0:null;
  const m=text.match(/^(-)?(?:(\d+)\.)?(\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.\d{1,7})?)?$/);if(!m)return null;
  const [days,h,mi,s]=[Number(m[2]??0),Number(m[3]),Number(m[4]),Number(m[5]??0)];if(h>23||mi>59||s>59)return null;
  if(m[1]&&(days||h||mi||s))return null;if(days)return null;return h*60+mi;
}
