let items=[],timer;
async function compress(it){
  it.out=null;it.err=null;
  try{const img=it.img||(it.img=await loadImg(it.file)),max=+$('max').value,mode=$('out').value;
    const k=max?Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)):1;
    const w=Math.round(img.naturalWidth*k),h=Math.round(img.naturalHeight*k);
    const sourceType=isHeic(it.file)?'image/jpeg':it.file.type;
    const type=mode==='same'?sourceType:mode==='jpg'?'image/jpeg':'image/webp';
    const ext=type==='image/jpeg'?'jpg':type==='image/png'?'png':'webp';
    let blob=await toBlob(toCanvas(img,w,h,type==='image/jpeg'),type,type==='image/png'?undefined:$('q').value/100);
    if(!blob||blob.type!==type)throw new Error('This format is not supported by your browser.');
    if(blob.size>=it.file.size&&k===1&&type===it.file.type){blob=it.file} // already optimized: keep original
    it.out=blob;it.outName=it.file.name.replace(/\.[^.]+$/,'')+'-compressed.'+ext;
  }catch(e){it.err=e.message}
}
async function runAll(){renderList(items);for(const it of items)await compress(it);renderList(items)}
setupDrop(files=>{files.forEach(item=>items.push(item));runAll()});
const again=()=>{clearTimeout(timer);timer=setTimeout(runAll,200)};
$('q').oninput=()=>{$('qv').textContent=$('q').value;again()};$('max').onchange=runAll;$('out').onchange=runAll;
wireButtons(()=>items,()=>{items=[];renderList(items)});
renderList(items);
