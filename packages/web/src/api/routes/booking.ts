import { z } from 'zod';
import { ORPCError } from '@orpc/server';
import { eq } from 'drizzle-orm';
import { base } from '../__core/app';
import { db } from '../database';
import { bookings, occupied } from '../database/schema';
const services = [{id:'cabelo',name:'Cabelo',price:45,duration:30},{id:'barba',name:'Barba',price:30,duration:30},{id:'combo',name:'Combo',price:65,duration:60}];
const barbers = ['Lucas','Rafael','Diego'];
const inputSchema = z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),service:z.enum(['cabelo','barba','combo']),barber:z.enum(['any','Lucas','Rafael','Diego'])});
function validDate(date:string){const d=new Date(date+'T12:00:00-03:00'); const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());return !isNaN(+d)&&d.getUTCDay()!==0&&date>=today&&+d<Date.now()+31*86400000;}
function future(date:string,m:number){return +new Date(`${date}T${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:00-03:00`)>Date.now();}
function time(m:number){return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
export const booking = {
 catalog:base.handler(()=>({services,barbers})),
 availability:base.input(inputSchema).handler(async({input})=>{if(!validDate(input.date))return [];const rows=await db.select().from(occupied).where(eq(occupied.date,input.date));const duration=services.find(s=>s.id===input.service)!.duration; const choices=input.barber==='any'?barbers:[input.barber];return Array.from({length:20},(_,i)=>540+i*30).filter(m=>m+duration<=1140&&future(input.date,m)).map(m=>({time:time(m),available:choices.some(b=>!rows.some(r=>r.barber===b&&r.minute>=m&&r.minute<m+duration))}));}),
 create:base.input(inputSchema.extend({time:z.string().regex(/^\d{2}:\d{2}$/),name:z.string().trim().min(2).max(80),phone:z.string().regex(/^\d{10,11}$/)})).handler(async({input})=>{const m=Number(input.time.slice(0,2))*60+Number(input.time.slice(3));const duration=services.find(s=>s.id===input.service)!.duration;if(!validDate(input.date)||!future(input.date,m)||m<540||m%30||m+duration>1140)throw new ORPCError('BAD_REQUEST',{message:'Data ou horário inválido.'});const choices=input.barber==='any'?barbers:[input.barber];for(const barber of choices){const id=crypto.randomUUID();try {await db.transaction(async tx=>{await tx.insert(bookings).values({...input,barber,id});await tx.insert(occupied).values(Array.from({length:duration/30},(_,i)=>({booking:id,barber,date:input.date,minute:m+i*30})));});return {...input,barber,id};}catch(e){const details=String(e)+' '+String((e as any)?.cause);if(!details.includes('UNIQUE')&&!details.includes('SQLITE_CONSTRAINT'))throw e;}}throw new ORPCError('CONFLICT',{message:'Este horário acabou de ser reservado. Escolha outro horário.'});})
};
