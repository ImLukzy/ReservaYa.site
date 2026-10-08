// Perú no cambia de huso: el calendario de Reserva es fecha local sin hora.
export function cumplePlazo(fecha:Date,inicio:number,minimo:number,ahora:Date):boolean {
  if(!minimo)return true; // Cero conserva el comportamiento anterior.
  const dia=fecha.toISOString().slice(0,10),instante=new Date(`${dia}T00:00:00-05:00`).getTime()+inicio*60000;
  return instante-ahora.getTime()>=minimo*60000;
}
export const horasPlazo=(minutos:number)=>String(Number((minutos/60).toFixed(2)));
