import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FastifyRequest } from 'fastify';
import { fail } from '../public/format';
import type { Actor } from './access';
export function base(){try{return new URL(process.env.MEDIA_PUBLIC_URL?.trim().replace(/\/+$/,'')||'');}catch{return null;}}
export function mediaUrl(value?:string|null,prefix?:string):string|null {
  const root=base(),v=value?.trim();if(!root||!v||v.length>500||/[\s"<>\\?#]|\p{Cc}/u.test(v))return null;
  try{
    const url=new URL(v),path=root.pathname.replace(/\/$/,'')+'/uploads/';
    if(!['http:','https:'].includes(url.protocol)||url.origin.toLowerCase()!==root.origin.toLowerCase()||url.username||url.password||url.search||url.hash)return null;
    const raw=v.slice(v.indexOf('/',v.indexOf('://')+3));
    for(const p of [raw,decodeURIComponent(raw),url.pathname])if(!p.startsWith(path)||/[\\%]/.test(p)||p.includes('//')||p.split('/').some(x=>x==='.'||x==='..'))return null;
    if(!/\.(jpg|png|webp|gif)$/i.test(url.pathname))return null;
    if(prefix&&!url.pathname.slice(path.length-'uploads/'.length).startsWith(prefix))return null;
    return v;
  }catch{return null;}
}
export const mediaKey=(v?:string|null)=>{const url=mediaUrl(v),root=base();return url&&root?new URL(url).pathname.slice(root.pathname.replace(/\/$/,'').length+1):null;};
export const ownPrefix=(type:string,a:Actor,platform=true)=>`uploads/${type}/`+(platform&&a.rol==='TECNICO'?'':a.id.replace(/[^A-Za-z0-9_-]/g,'')+'/');
export function legacyImage(v?:string|null,prefix?:string){const value=v?.trim();if(!value||value.length>500||/[ "<]/.test(value)||!(/^(https?:\/\/|\/)/i.test(value)))return null;return prefix&&mediaKey(value)&&!mediaUrl(value,prefix)?null:value;}
export const imageExtension=(bytes:Buffer)=>bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'.jpg':bytes.subarray(0,4).equals(Buffer.from([137,80,78,71]))?'.png':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'.webp':bytes.subarray(0,3).toString()==='GIF'?'.gif':null;
@Injectable()
export class Media implements OnModuleDestroy {
  private client?:S3Client;
  onModuleDestroy(){this.client?.destroy();}
  async remove(url:string|null,type:string,local=false){
    const key=mediaKey(url);if(key?.startsWith(`uploads/${type}/`)){
      const endpoint=process.env.R2_ENDPOINT,accessKeyId=process.env.R2_ACCESS_KEY_ID,secretAccessKey=process.env.R2_SECRET_ACCESS_KEY,Bucket=process.env.R2_BUCKET_NAME;
      if(endpoint&&accessKeyId&&secretAccessKey&&Bucket){try{this.client??=new S3Client({endpoint,region:'auto',forcePathStyle:true,credentials:{accessKeyId,secretAccessKey},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});await this.client.send(new DeleteObjectCommand({Bucket,Key:key}),{abortSignal:AbortSignal.timeout(10000)});}catch{/* best effort after database commit */}}
    }
    if(local&&url?.startsWith('/uploads/')){const root=this.root(),path=resolve(root,url.slice(1));if(path.startsWith(root+'/'))try{await unlink(path);}catch{/* best effort */}}
  }
  private root(){return resolve(process.env.LEGACY_WEB_ROOT||resolve(process.cwd(),'wwwroot'));}
  async upload(r:FastifyRequest,folder:string,id:string){
    if(!r.isMultipart())fail(400,'Archivo requerido');
    if(Number(r.headers['content-length']||0)>3500000)fail(413,'Request body too large');
    let data:Buffer|undefined;
    for await(const part of r.parts()){if(part.type==='file'){const bytes=await part.toBuffer();if(part.fieldname==='archivo'&&!data)data=bytes;}}
    if(!data?.length)fail(400,'Archivo requerido');if(data!.length>3*1024*1024)fail(400,'La imagen no puede superar 3 MB');
    const ext=imageExtension(data!);if(!ext)fail(400,'Solo se aceptan imágenes JPG, PNG, WEBP o GIF');
    const dir=resolve(this.root(),'uploads',folder),name=`${id}-${Math.floor(Date.now()/1000)}${ext}`;
    await mkdir(dir,{recursive:true});await writeFile(resolve(dir,name),data!);
    for(const old of await readdir(dir)){if(old.startsWith(id+'-')&&old!==name)try{await unlink(resolve(dir,old));}catch{/* best effort */}}
    return `/uploads/${folder}/${name}`;
  }
}
