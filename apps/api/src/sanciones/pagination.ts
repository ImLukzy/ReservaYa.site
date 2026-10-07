import { fail } from '../public/format';
export function pagination(cursor:unknown,take:unknown){
  if(cursor===undefined&&take===undefined)return null;
  if(take!==undefined&&(typeof take!=='string'||!/^\d+$/.test(take)||Number(take)<1||Number(take)>200))fail(400,'take debe ser un entero entre 1 y 200');
  if(cursor!==undefined&&(typeof cursor!=='string'||!cursor||cursor.length>200))fail(400,'Cursor inválido');
  return {take:take===undefined?200:Number(take),cursor:cursor as string|undefined};
}
