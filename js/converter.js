const TYPES={JPG:['image/jpeg','jpg'],PNG:['image/png','png'],WebP:['image/webp','webp']};
let fmt='JPG',items=[],timer;
function buildFmt(){const f=$('fmt');f.innerHTML='';Object.keys(TYPES).forEach(k=>{const b=document.createElement('button');b.textContent=k;b.setAttribute('aria-pressed',k===fmt);
  b.onclick=()=>{fmt=k;buildFmt();$('qbox').classList.toggle('hide',k==='PNG');$('note').classList.toggle('hide',k!=='JPG');convertAll()};f.appendChild(b)})}
async function convert(it){
  it.out=null;it.err=null;
  try{const [type,ext]=TYPES[fmt],img=it.img||(it.img=await loadImg(it.file));
    const c=toCanvas(img,img.naturalWidth,img.naturalHeight,fmt==='JPG');
    const blob=await toBlob(c,type,type==='image/png'?undefined:$('q').value/100);
    if(!blob||blob.type!==type)throw new Error(fmt+' is not supported by this browser.');
    it.out=blob;it.outName=it.file.name.replace(/\.[^.]+$/,'')+'.'+ext;
  }catch(e){it.err=e.message}
}
async function convertAll(){renderList(items);for(const it of items)await convert(it);renderList(items)}
setupDrop(files=>{files.forEach(item=>items.push(item));convertAll()});
$('q').oninput=()=>{$('qv').textContent=$('q').value;clearTimeout(timer);timer=setTimeout(convertAll,200)};
wireButtons(()=>items,()=>{items=[];renderList(items)});
buildFmt();renderList(items);
