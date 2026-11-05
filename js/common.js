const $=id=>document.getElementById(id);
const OK=['image/jpeg','image/png','image/webp','image/heic','image/heif'],MAX=25*1024*1024;
const HEIC_EXT=/\.hei(c|f)$/i;
const isHeic=f=>HEIC_EXT.test(f.name)||['image/heic','image/heif'].includes(f.type.toLowerCase());
const fmtBytes=b=>b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(2)+' MB';
const toBlob=(c,t,q)=>new Promise(r=>c.toBlob(r,t,q));
async function convertHeic(f){
  if(!isHeic(f))return f;
  try{
    const {heicTo}=await import('https://cdn.jsdelivr.net/npm/heic-to@1.6.7/+esm');
    return await heicTo({blob:f,type:'image/jpeg',quality:.92});
  }catch(e){
    // Safari can decode some HEIC variants natively and pass them directly to canvas.
    const supported=await new Promise(resolve=>{
      const image=new Image();
      const url=URL.createObjectURL(f);
      image.onload=()=>{URL.revokeObjectURL(url);resolve(true)};
      image.onerror=()=>{URL.revokeObjectURL(url);resolve(false)};
      image.src=url;
    });
    if(supported)return f;
    throw new Error('This HEIC variant is not supported by the browser. Try exporting it as JPG.');
  }
}
const loadImg=async f=>{
  const readable=await convertHeic(f);
  return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('Could not read this image'));i.src=URL.createObjectURL(readable)});
};
function save(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
function msg(t,c){const m=$('msg');m.textContent=t;m.className=c||''}
function setupDrop(onFiles){
  const d=$('drop'),f=$('file');
  const take=list=>{const ok=[];list.forEach(x=>{const extSupported=HEIC_EXT.test(x.name);if(!OK.includes(x.type.toLowerCase())&&!extSupported)msg(x.name+': only JPG, PNG, WebP or HEIC are supported.','err');else if(x.size>MAX)msg(x.name+': larger than 25 MB.','err');else ok.push(x)});Promise.all(ok.map(async x=>{
    let thumb=x;
    if(isHeic(x)){try{thumb=await convertHeic(x)}catch(e){msg(x.name+': '+e.message,'err');return null}}
    return {file:x,thumb:URL.createObjectURL(thumb)};
  })).then(prepared=>{const ready=prepared.filter(Boolean);if(ready.length)onFiles(ready)});
  };
  d.onclick=()=>f.click();
  d.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f.click()}};
  f.onchange=e=>{take([...e.target.files]);f.value=''};
  ['dragenter','dragover'].forEach(t=>d.addEventListener(t,e=>{e.preventDefault();d.classList.add('over')}));
  ['dragleave','drop'].forEach(t=>d.addEventListener(t,e=>{e.preventDefault();d.classList.remove('over')}));
  d.addEventListener('drop',e=>take([...e.dataTransfer.files]));
}
// Draw an image to a canvas of the given size (white fill when fillWhite, e.g. for JPG)
function toCanvas(img,w,h,fillWhite){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');if(fillWhite){x.fillStyle='#fff';x.fillRect(0,0,w,h)}x.imageSmoothingQuality='high';x.drawImage(img,0,0,w,h);return c}
function renderList(items,onClear){
  const l=$('list');l.innerHTML='';
  if(!items.length)l.innerHTML='<p class="info">No images yet.</p>';
  items.forEach(it=>{
    const d=document.createElement('div');d.className='file';
    const im=document.createElement('img');im.src=it.thumb;im.alt='';
    const m=document.createElement('div');m.className='meta';
    const b=document.createElement('b');b.textContent=it.out?it.outName:it.file.name;
    const s=document.createElement('span');
    if(it.err){s.textContent=it.err;s.className='err'}
    else if(it.out){const p=Math.round((1-it.out.size/it.file.size)*100);s.textContent=fmtBytes(it.file.size)+' \u2192 '+fmtBytes(it.out.size)+' ('+(p>=0?'\u2212'+p:'+'+(-p))+'%)';if(p>0)s.style.color='var(--ok)'}
    else s.textContent='Processing\u2026';
    m.append(b,s);d.append(im,m);
    if(it.out){const k=document.createElement('button');k.className='btn';k.textContent='Download';k.onclick=()=>save(it.out,it.outName);d.append(k)}
    l.append(d);
  });
  const has=items.some(i=>i.out);$('all').disabled=!has;$('clear').disabled=!items.length;
}
function wireButtons(getItems,clear){
  $('all').onclick=async()=>{for(const it of getItems()){if(it.out){save(it.out,it.outName);await new Promise(r=>setTimeout(r,300))}}msg('\u2713 All files downloaded.','good')};
  $('clear').onclick=()=>{clear();msg('')};
}
