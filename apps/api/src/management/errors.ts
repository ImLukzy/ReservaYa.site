// Prisma errors can cross distinct generated-client module instances.
export function databaseError(error:unknown,code:string):boolean{return typeof error==='object'&&error!==null&&'code'in error&&error.code===code;}
export function foreignKeyError(error:unknown):boolean{
  if(databaseError(error,'P2003')||databaseError(error,'23503')||databaseError(error,'23001'))return true;
  if(typeof error!=='object'||error===null)return false;
  // NoAction constraints can surface as an unknown request error containing
  // PostgreSQL's structured error instead of Prisma's P2003 conversion.
  if('message'in error&&typeof error.message==='string'&&/\b(?:code|sqlstate)\s*[:=]\s*["']?(?:23503|23001)\b/i.test(error.message))return true;
  if('meta'in error&&typeof error.meta==='object'&&error.meta!==null)return databaseError(error.meta,'23503')||databaseError(error.meta,'23001');
  return false;
}
