/* Subnet Calculator · IPv4 math: parsing, masks, subnet calculation */

/* ================= IPv4 core ================= */
const MAX = 4294967295;
function parseIP(s){
  const m = String(s).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if(!m) return null;
  let n = 0;
  for(let i=1;i<=4;i++){ const o = +m[i]; if(o>255) return null; n = n*256 + o; }
  return n;
}
const ipStr = n => [n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
const maskOf = p => p===0 ? 0 : (0xFFFFFFFF << (32-p))>>>0;
const wildOf = p => (~maskOf(p))>>>0;
function popcount(n){ let c=0; while(n){ c += n & 1; n >>>= 1; } return c; }
function maskToPrefix(m){ const inv=(~m)>>>0; if((inv & (inv+1))!==0) return null; return 32 - popcount(inv); }
const bin32 = n => n.toString(2).padStart(32,'0');
const binDots = n => bin32(n).match(/.{8}/g).join('.');
const hex = n => '0x' + n.toString(16).toUpperCase().padStart(8,'0');
const fmt = n => Number(n).toLocaleString('en-US');
const usableOf = p => p===32 ? 1 : p===31 ? 2 : 2**(32-p) - 2;
function hostsToPrefix(h){ for(let p=30;p>=0;p--){ if(2**(32-p)-2 >= h) return p; } return null; }
// smallest prefix: iterate from 30 downward (larger blocks) and return first that fits
function prefixForHosts(h){ if(h<1) return null; for(let p=30;p>=1;p--){ if(2**(32-p)-2 >= h) return p; } return null; }
function classOf(n){ const o=n>>>24; return o<128?'A':o<192?'B':o<224?'C':o<240?'D (multicast)':'E (reserved)'; }
const RANGES = [
  ['255.255.255.255',32,'Limited broadcast'],
  ['0.0.0.0',8,'"This" network (reserved)'],
  ['10.0.0.0',8,'Private (RFC 1918)'],
  ['100.64.0.0',10,'Carrier-grade NAT (RFC 6598)'],
  ['127.0.0.0',8,'Loopback'],
  ['169.254.0.0',16,'Link-local (APIPA)'],
  ['172.16.0.0',12,'Private (RFC 1918)'],
  ['192.0.2.0',24,'Documentation (TEST-NET-1)'],
  ['192.168.0.0',16,'Private (RFC 1918)'],
  ['198.18.0.0',15,'Benchmarking (RFC 2544)'],
  ['198.51.100.0',24,'Documentation (TEST-NET-2)'],
  ['203.0.113.0',24,'Documentation (TEST-NET-3)'],
  ['224.0.0.0',4,'Multicast'],
  ['240.0.0.0',4,'Reserved (Class E)'],
].map(([a,p,l])=>({net:parseIP(a),p,l}));
function typeOf(n){ for(const r of RANGES){ if(((n & maskOf(r.p))>>>0)===r.net) return r.l; } return 'Public'; }
const isPrivate = n => typeOf(n).startsWith('Private');

function calc(ip,p){
  const mask=maskOf(p), wild=wildOf(p);
  const net=(ip & mask)>>>0, bc=(net | wild)>>>0, size=2**(32-p);
  let first, last;
  if(p>=31){ first=net; last=bc; } else { first=net+1; last=bc-1; }
  return {ip,p,mask,wild,net,bc,size,usable:usableOf(p),first,last,
    prev: net - size >= 0 ? net - size : null,
    next: bc + 1 <= MAX ? bc + 1 : null};
}
function defaultPrefix(ip){ const o=ip>>>24; return o<128?8:o<192?16:o<224?24:32; }
function parseCIDR(str){
  const s = String(str).trim().replace(/\s+/g,' ');
  if(!s) return {error:'Enter an address such as 192.168.1.10/24.'};
  let m = s.match(/^([\d.]+)\s*(?:\/|\s)\s*([\d.]+)$/);
  let ipPart, pPart;
  if(m){ ipPart=m[1]; pPart=m[2]; } else { ipPart=s; }
  const ip = parseIP(ipPart);
  if(ip===null) return {error:`"${ipPart}" is not a valid IPv4 address. Use four numbers from 0 to 255, like 10.0.4.20.`};
  if(pPart===undefined) return {ip, p:defaultPrefix(ip), implied:true};
  if(/^\d{1,2}$/.test(pPart)){ const p=+pPart; if(p>32) return {error:'The prefix must be between 0 and 32.'}; return {ip,p}; }
  const mm = parseIP(pPart);
  if(mm===null) return {error:`"${pPart}" is not a prefix or a subnet mask.`};
  const p = maskToPrefix(mm);
  if(p===null) return {error:`${pPart} is not a valid mask. The 1 bits must be contiguous from the left.`};
  return {ip,p};
}
function reverseZone(net,p){
  const o=[net>>>24,(net>>>16)&255,(net>>>8)&255,net&255];
  const k = Math.max(1, Math.floor(p/8));
  return o.slice(0,Math.min(k,4)).reverse().join('.') + '.in-addr.arpa';
}
function rangeToCidrs(start,end){
  const out=[];
  while(start<=end){
    let p=32;
    while(p>0){ const size=2**(32-(p-1)); if(start % size !== 0 || start+size-1 > end) break; p--; }
    out.push({net:start,p}); start += 2**(32-p);
  }
  return out;
}
function explainBlock(ip,p){
  const c=calc(ip,p);
  if(p%8===0) return `/${p} ends on an octet boundary, so the first ${p/8} octet${p/8===1?'':'s'} stay as they are. Host octets become 0 for the network (${ipStr(c.net)}) and 255 for the broadcast (${ipStr(c.bc)}).`;
  const k=Math.floor(p/8), sh=24-8*k;
  const mo=(c.mask>>>sh)&255, block=256-mo, x=(ip>>>sh)&255, start=Math.floor(x/block)*block;
  return `The interesting octet is octet ${k+1}, where the mask is ${mo}. Block size = 256 − ${mo} = ${block}. ${x} falls in the block ${start}–${start+block-1}, so the network is ${ipStr(c.net)} and the broadcast is ${ipStr(c.bc)}.`;
}
