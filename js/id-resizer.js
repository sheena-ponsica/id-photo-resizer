const DPI=300;
const mm=v=>v/25.4;
const SIZES=[
{n:'1×1 ID Picture',w:1,h:1},{n:'2×2 ID Picture',w:2,h:2},{n:'Passport Size',w:1.38,h:1.77,l:'1.38 × 1.77 in · 35×45 mm'},{n:'1.5×2 ID Picture',w:1.5,h:2},
{n:'Wallet Size',w:2.5,h:3.5},{n:'3R Photo',w:3.5,h:5},{n:'4R Photo',w:4,h:6},
{n:'Canada Passport',w:mm(50),h:mm(70),l:'50 × 70 mm'},{n:'China Visa',w:mm(33),h:mm(48),l:'33 × 48 mm'},{n:'China ID',w:mm(26),h:mm(32),l:'26 × 32 mm'},
{n:'Japan ID / License',w:mm(24),h:mm(30),l:'24 × 30 mm'},{n:'Thai 1 inch',w:mm(25),h:mm(35),l:'25 × 35 mm'},{n:'Thai 2 inch / Malaysia',w:mm(35),h:mm(50),l:'35 × 50 mm'},
{n:'3×4 cm (Indonesia / Brazil)',w:mm(30),h:mm(40),l:'30 × 40 mm'},{n:'4×6 cm (Vietnam / Saudi)',w:mm(40),h:mm(60),l:'40 × 60 mm'},
{n:'Hong Kong',w:mm(40),h:mm(50),l:'40 × 50 mm'},{n:'UAE Visa',w:mm(43),h:mm(55),l:'43 × 55 mm'}];
const FMTS=['JPG','PNG','PDF'];
let img=null,name='photo',size=SIZES[0],fmt='JPG';
const $=id=>document.getElementById(id);
const px=s=>({w:Math.round(s.w*DPI),h:Math.round(s.h*DPI)});

function buildUI(){
  $('sizes').innerHTML='';
  SIZES.forEach(s=>{const p=px(s),b=document.createElement('button');
    b.setAttribute('aria-pressed',s===size&&!isCustom);
    b.innerHTML=s.n+'<small>'+(s.l||s.w+' × '+s.h+' in')+'</small>';
    b.onclick=()=>{isCustom=false;size=s;view={z:1,ox:0,oy:0};buildUI();render()};$('sizes').appendChild(b)});
  const cb=document.createElement('button');cb.setAttribute('aria-pressed',isCustom);
  cb.innerHTML='Custom<small>Set your own size</small>';
  cb.onclick=()=>{isCustom=true;applyCustom();view={z:1,ox:0,oy:0};buildUI();render()};
  $('sizes').appendChild(cb);$('custom').classList.toggle('hide',!isCustom);
  $('fmt').innerHTML='';
  FMTS.forEach(f=>{const b=document.createElement('button');b.textContent=f;
    b.setAttribute('aria-pressed',f===fmt);b.onclick=()=>{fmt=f;buildUI()};$('fmt').appendChild(b)});
}
function msg(t,c){const m=$('msg');m.textContent=t;m.className=c||''}

// Draw the whole image scaled to fit (contain) on a white canvas — never crops.
let view={z:1,ox:0,oy:0}; // z: zoom relative to 'fill'; ox/oy: offset as fraction of frame
function geom(w,h){
  const iw=img.naturalWidth,ih=img.naturalHeight,k0=Math.max(w/iw,h/ih),zmin=Math.min(w/iw,h/ih)/k0;
  const z=Math.min(4,Math.max(zmin,view.z)),dw=iw*k0*z,dh=ih*k0*z;
  const lx=Math.abs(dw-w)/2/w,ly=Math.abs(dh-h)/2/h;
  return{zmin,z,dw,dh,ox:Math.max(-lx,Math.min(lx,view.ox)),oy:Math.max(-ly,Math.min(ly,view.oy))};
}
let nameOn=false,nameText='',bgColor='#ffffff',textColor='#000000',textBg='#ffffff';
const mctx=document.createElement('canvas').getContext('2d');
function nameLayout(w,h){ // name strip: text height + 1.5 mm padding on every side
  const t=nameText.trim().toUpperCase();if(!nameOn||!t)return null;
  const pad=Math.round(1.5/25.4*DPI),f=s=>'bold '+s+'px Arial, Helvetica, sans-serif';
  let fs=h*0.1;mctx.font=f(fs);const mw=mctx.measureText(t).width,maxW=w-2*pad;
  if(mw>maxW){fs*=maxW/mw;mctx.font=f(fs)}
  const asc=Math.ceil(mctx.measureText(t).actualBoundingBoxAscent||fs*0.72);
  return{t,pad,asc,font:f(fs),bh:asc+2*pad};
}
function area(){const {w,h}=px(size),L=nameLayout(w,h),bh=L?L.bh:0;return{w,h,bh,ph:h-bh}}
function draw(canvas){
  const {w,h,bh,ph}=area();canvas.width=w;canvas.height=h;
  const c=canvas.getContext('2d');c.fillStyle=bgColor;c.fillRect(0,0,w,h);
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  const g=geom(w,ph);
  c.save();c.beginPath();c.rect(0,0,w,ph);c.clip();
  c.drawImage(img,w/2+g.ox*w-g.dw/2,ph/2+g.oy*ph-g.dh/2,g.dw,g.dh);c.restore();
  const L=nameLayout(w,h);
  if(L){c.fillStyle=textBg;c.fillRect(0,ph,w,bh);c.font=L.font;c.fillStyle=textColor;c.textAlign='center';c.textBaseline='alphabetic';c.fillText(L.t,w/2,ph+L.pad+L.asc)}
}
function drawPrev(){
  draw($('prev'));
  const a=area(),g=geom(a.w,a.ph);view.z=g.z;view.ox=g.ox;view.oy=g.oy;
  $('zoom').min=g.zmin;$('zoom').max=4;$('zoom').value=g.z;
}
function render(){
  if(!img)return;
  drawPrev();
  const p=px(size);
  $('info').innerHTML='<b>'+size.n+'</b> · '+r2(size.w)+' × '+r2(size.h)+' in · <b>'+p.w+' × '+p.h+' px</b> at '+DPI+' DPI';
  $('keep').classList.remove('hide');renderSheet();
}

function loadFile(f){
  if(!f)return;
  if(!/^image\/(jpeg|png)$/.test(f.type)){msg('Please choose a JPG, JPEG or PNG file.','err');return}
  if(f.size>20*1024*1024){msg('File is too large. Maximum size is 20 MB.','err');return}
  const url=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{img=im;pos=null;view={z:1,ox:0,oy:0};name=f.name.replace(/\.[^.]+$/,'')||'photo';
    $('thumb').src=url;$('thumb').classList.remove('hide');
    $('dl').disabled=$('reset').disabled=false;msg('');$('sheetcard').classList.remove('hide');render()};
  im.onerror=()=>msg('Could not read that image.','err');
  im.src=url;
}

// Embed 300 DPI metadata
function crcTable(){const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t}
const CT=crcTable();
function crc(b){let c=0xffffffff;for(const x of b)c=CT[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0}
async function withDpi(blob,type){
  const u=new Uint8Array(await blob.arrayBuffer());
  if(type==='image/jpeg'){ // JFIF APP0: units@13, Xdens@14, Ydens@16
    if(u[2]===0xff&&u[3]===0xe0){u[13]=1;u[14]=DPI>>8;u[15]=DPI&255;u[16]=DPI>>8;u[17]=DPI&255}
    return new Blob([u],{type});
  }
  const ppm=Math.round(DPI/0.0254),d=new Uint8Array(21),v=new DataView(d.buffer);
  v.setUint32(0,9);d.set([112,72,89,115],4);v.setUint32(8,ppm);v.setUint32(12,ppm);d[16]=1;
  v.setUint32(17,crc(d.subarray(4,17)));
  const at=33; // after signature(8)+IHDR(25)
  const out=new Uint8Array(u.length+21);out.set(u.subarray(0,at));out.set(d,at);out.set(u.subarray(at),at+21);
  return new Blob([out],{type});
}
function save(blob,file){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
const toBlob=(c,t,q)=>new Promise(r=>c.toBlob(r,t,q));

async function download(){
  if(!img)return;
  $('dl').disabled=true;$('dl').textContent='Generating…';msg('Processing…');
  await new Promise(r=>setTimeout(r,30));
  try{
    const c=document.createElement('canvas');draw(c);
    const base=name+'_'+size.n.replace(/[^\w]+/g,'-').replace(/-$/,'');
    if(fmt==='PDF'){
      const {jsPDF}=window.jspdf;
      const doc=new jsPDF({orientation:size.w>size.h?'l':'p',unit:'in',format:[size.w,size.h],compress:true});
      doc.addImage(c.toDataURL('image/png'),'PNG',0,0,size.w,size.h);
      doc.save(base+'.pdf');
    }else{
      const type=fmt==='JPG'?'image/jpeg':'image/png';
      const b=await withDpi(await toBlob(c,type,1),type);
      save(b,base+(fmt==='JPG'?'.jpg':'.png'));
    }
    msg('✓ Your '+fmt+' file has been generated and downloaded.','good');
  }catch(e){msg('Something went wrong while generating the file.','err')}
  $('dl').disabled=false;$('dl').textContent='Download';
}
function reset(){
  img=null;$('thumb').classList.add('hide');$('file').value='';
  const c=$('prev');c.width=c.height=300;c.getContext('2d').clearRect(0,0,300,300);
  $('info').textContent='Upload a photo to see the preview.';$('keep').classList.add('hide');
  $('dl').disabled=$('reset').disabled=true;msg('');$('sheetcard').classList.add('hide');
}
const d=$('drop');
d.onclick=()=>$('file').click();
d.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('file').click()}};
$('file').onchange=e=>loadFile(e.target.files[0]);
['dragenter','dragover'].forEach(t=>d.addEventListener(t,e=>{e.preventDefault();d.classList.add('over')}));
['dragleave','drop'].forEach(t=>d.addEventListener(t,e=>{e.preventDefault();d.classList.remove('over')}));
d.addEventListener('drop',e=>loadFile(e.dataTransfer.files[0]));
$('dl').onclick=download;$('reset').onclick=reset;

// ---- Drag & zoom framing ----
const pv=$('prev');let drag=null,t2;
const afterEdit=()=>{clearTimeout(t2);t2=setTimeout(renderSheet,150)};
pv.addEventListener('pointerdown',e=>{if(!img)return;pv.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,ox:view.ox,oy:view.oy};pv.style.cursor='grabbing'});
pv.addEventListener('pointermove',e=>{if(!drag)return;const r=pv.getBoundingClientRect();view.ox=drag.ox+(e.clientX-drag.x)/r.width;view.oy=drag.oy+(e.clientY-drag.y)/(r.height*area().ph/area().h);drawPrev()});
const endDrag=()=>{if(drag){drag=null;pv.style.cursor='grab';afterEdit()}};
pv.addEventListener('pointerup',endDrag);pv.addEventListener('pointercancel',endDrag);
pv.addEventListener('wheel',e=>{if(!img)return;e.preventDefault();view.z*=Math.exp(-e.deltaY*0.0015);drawPrev();afterEdit()},{passive:false});
$('zoom').oninput=e=>{view.z=+e.target.value;drawPrev();afterEdit()};
$('zfill').onclick=()=>{view={z:1,ox:0,oy:0};drawPrev();renderSheet()};
$('zfit').onclick=()=>{view={z:0.01,ox:0,oy:0};drawPrev();renderSheet()};

// ---- Print sheet ----
const PAPERS=[['A4 (21 × 29.7 cm)',210,297],['A3 (29.7 × 42 cm)',297,420],['A5 (14.8 × 21 cm)',148,210],['Letter (8.5 × 11 in)',215.9,279.4],['Legal (8.5 × 14 in)',215.9,355.6],['4R (4 × 6 in)',101.6,152.4],['5R (5 × 7 in)',127,177.8],['6R (6 × 8 in)',152.4,203.2],['8R (8 × 10 in)',203.2,254]];
const GAPS=[0,1,1.5,2,3];
let paper=0,gap=1.5,count=4,margin=5,pos=null,blk=null,landscape=false;
function layout(){const pw=size.w*25.4,ph=size.h*25.4,W=landscape?PAPERS[paper][2]:PAPERS[paper][1],H=landscape?PAPERS[paper][1]:PAPERS[paper][2];
  const cols=Math.max(0,Math.floor((W+gap)/(pw+gap))),rows=Math.max(0,Math.floor((H-margin+gap)/(ph+gap)));return{pw,ph,W,H,cols,rows,max:cols*rows}}
function renderSheet(){
  if(!img)return;
  const L=layout(),S=DPI/25.4,cv=$('sheet');
  $('pname').textContent=PAPERS[paper][0].split(' (')[0];
  $('maxh').textContent=L.max?'Max '+L.max+' photos fit on this paper':'This photo size is too large for the selected paper.';
  count=Math.max(1,Math.min(count,L.max||1));$('cnt').max=L.max;$('cnt').value=count;
  cv.width=Math.round(L.W*S);cv.height=Math.round(L.H*S);
  const c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,cv.width,cv.height);
  blk=null;if(!L.max)return;
  const pc=document.createElement('canvas');draw(pc);
  const used=Math.min(L.cols,count),nr=Math.ceil(count/L.cols),usedW=used*L.pw+(used-1)*gap,usedH=nr*L.ph+(nr-1)*gap;
  let x0=0,y0=pos?pos.y:margin;
  x0=Math.max(0,Math.min(L.W-usedW,x0));y0=Math.max(margin,Math.min(L.H-usedH,y0));
  if(pos){pos.x=x0;pos.y=y0}
  blk={w:usedW,h:usedH,W:L.W,H:L.H,x:x0,y:y0};
  c.strokeStyle='#b5b5b5';c.lineWidth=2;c.imageSmoothingQuality='high';
  for(let i=0;i<count;i++){
    const x=(x0+(i%L.cols)*(L.pw+gap))*S,y=(y0+Math.floor(i/L.cols)*(L.ph+gap))*S;
    c.drawImage(pc,x,y,L.pw*S,L.ph*S);
    c.strokeRect(x+1,y+1,L.pw*S-2,L.ph*S-2);
  }
}
function buildSheetUI(){
  $('paper').innerHTML=PAPERS.map((p,i)=>'<option value="'+i+'">'+p[0]+'</option>').join('');
  $('gaps').innerHTML='';
  GAPS.forEach(g=>{const b=document.createElement('button');b.textContent=g?g+' mm':'None';
    b.setAttribute('aria-pressed',g===gap);b.onclick=()=>{gap=g;[...$('gaps').children].forEach(x=>x.setAttribute('aria-pressed',x===b));renderSheet()};$('gaps').appendChild(b)});
}
$('paper').onchange=e=>{paper=+e.target.value;pos=null;renderSheet()};
$('cnt').oninput=e=>{const v=parseInt(e.target.value,10);if(v>0){count=v;renderSheet()}};
async function sheetFile(){
  const cv=$('sheet'),L=layout(),base=name+'_print-sheet_'+PAPERS[paper][0].split(' (')[0];
  if(fmt==='PDF'){const {jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:L.W>L.H?'l':'p',unit:'mm',format:[L.W,L.H],compress:true});
    doc.addImage(cv.toDataURL('image/png'),'PNG',0,0,L.W,L.H);
    return{blob:doc.output('blob'),file:base+'.pdf'}}
  const type=fmt==='JPG'?'image/jpeg':'image/png';
  return{blob:await withDpi(await toBlob(cv,type,1),type),file:base+(fmt==='JPG'?'.jpg':'.png')};
}
function smsg(t,c){const m=$('smsg');m.textContent=t;m.className=c||''}
$('sdl').onclick=async()=>{
  if(!layout().max){smsg('Photo is too large for this paper.','err');return}
  $('sdl').disabled=true;smsg('Processing…');await new Promise(r=>setTimeout(r,30));
  try{const r=await sheetFile();save(r.blob,r.file);smsg('✓ Print sheet downloaded.','good')}catch(e){smsg('Could not generate the sheet.','err')}
  $('sdl').disabled=false;
};
$('sshare').onclick=async()=>{
  if(!layout().max){smsg('Photo is too large for this paper.','err');return}
  try{const r=await sheetFile(),f=new File([r.blob],r.file,{type:r.blob.type});
    if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:'ID print sheet'});smsg('✓ Shared.','good')}
    else{save(r.blob,r.file);smsg('Sharing isn’t supported here, so the file was downloaded instead.')}
  }catch(e){if(e.name!=='AbortError')smsg('Could not share the sheet.','err')}
};
[0,3,5,8].forEach(m=>{const b=document.createElement('button');b.textContent=m?m+' mm':'None';b.setAttribute('aria-pressed',m===margin);
  b.onclick=()=>{margin=m;[...$('margins').children].forEach(x=>x.setAttribute('aria-pressed',x===b));renderSheet()};$('margins').appendChild(b)});
const sv=$('sheet');let sd=null,raf=0;
sv.style.cursor='grab';sv.style.touchAction='none';
const redraw=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;renderSheet()})};
sv.addEventListener('pointerdown',e=>{if(!blk)return;sv.setPointerCapture(e.pointerId);
  sd={px:e.clientX,py:e.clientY,x:blk.x,y:blk.y,k:blk.W/sv.getBoundingClientRect().width};sv.style.cursor='grabbing'});
sv.addEventListener('pointermove',e=>{if(!sd)return;pos={x:0,y:sd.y+(e.clientY-sd.py)*sd.k};redraw()});
const sEnd=()=>{sd=null;sv.style.cursor='grab'};
sv.addEventListener('pointerup',sEnd);sv.addEventListener('pointercancel',sEnd);
$('pctr').onclick=()=>{if(blk){pos={x:(blk.W-blk.w)/2,y:(blk.H-blk.h)/2};renderSheet()}};
$('ptop').onclick=()=>{pos=null;renderSheet()};
// ---- Custom size ----
let isCustom=false,lastU='mm';const F={mm:1/25.4,cm:1/2.54,in:1};
function r2(v){return Math.round(v*100)/100}
function applyCustom(){
  const u=$('cu').value,w=parseFloat($('cw').value),h=parseFloat($('ch').value),wi=w*F[u],hi=h*F[u];
  if(!(wi>=0.4&&hi>=0.4&&wi<=14&&hi<=14)){$('cmsg').textContent='Enter sizes between '+r2(0.4/F[u])+' and '+r2(14/F[u])+' '+u+'.';$('cmsg').className='info err';return false}
  $('cmsg').textContent='= '+r2(wi)+' × '+r2(hi)+' in · '+Math.round(wi*DPI)+' × '+Math.round(hi*DPI)+' px';$('cmsg').className='info';
  size={n:'Custom '+r2(w)+'×'+r2(h)+' '+u,w:wi,h:hi};return true;
}
const custChange=()=>{if(isCustom&&applyCustom()){view={z:1,ox:0,oy:0};render()}};
$('cw').oninput=custChange;$('ch').oninput=custChange;
$('cu').onchange=()=>{const k=F[lastU]/F[$('cu').value];$('cw').value=r2($('cw').value*k);$('ch').value=r2($('ch').value*k);lastU=$('cu').value;custChange()};
[['Portrait',false],['Landscape',true]].forEach(([t,v])=>{const b=document.createElement('button');b.textContent=t;b.setAttribute('aria-pressed',v===landscape);
  b.onclick=()=>{landscape=v;pos=null;[...$('orient').children].forEach(x=>x.setAttribute('aria-pressed',x===b));renderSheet()};$('orient').appendChild(b)});
// ---- Name on photo ----
$('nameOn').onchange=e=>{nameOn=e.target.checked;$('nameBox').classList.toggle('hide',!nameOn);view={z:1,ox:0,oy:0};render()};
$('nameTxt').oninput=e=>{nameText=e.target.value;drawPrev();afterEdit()};
$('tcol').oninput=e=>{textColor=e.target.value;drawPrev();afterEdit()};
$('tbg').oninput=e=>{textBg=e.target.value;drawPrev();afterEdit()};
buildSheetUI();
buildUI();
