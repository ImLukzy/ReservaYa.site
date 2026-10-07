import { Injectable } from '@nestjs/common';
@Injectable()
export class RateLimiter {
  private readonly hits=new Map<string,number[]>();
  limited(key:string,limit:number,windowMs:number){
    const now=Date.now(), queue=(this.hits.get(key)||[]).filter(t=>now-t<windowMs);
    this.hits.set(key,queue);if(queue.length>=limit)return true;queue.push(now);return false;
  }
  reset(key:string){this.hits.delete(key);}
}
