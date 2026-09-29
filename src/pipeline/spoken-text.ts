/** Deterministic reading forms; never changes the underlying numeric value. */
const digits = '零一二三四五六七八九';
function integer(n: string): string {
  if (n.length > 4 || /^0\d/.test(n)) return [...n].map(c=>digits[Number(c)]).join('');
  const units = ['', '十', '百', '千'];
  let out = '', zero = false;
  for (let i=0;i<n.length;i++) {
    const d = Number(n[i]);
    if (!d) {if(out) zero=true;continue;}
    if(zero) out+='零';
    out+=digits[d]+units[n.length-i-1];zero=false;
  }
  return (out || '零').replace(/^一十/,'十');
}
function number(n: string): string {
  const sign=n.startsWith('-')?'负':n.startsWith('+')?'正':'';
  const [whole,fraction]=n.replace(/^[+-]/,'').split('.');
  return sign+integer(whole)+(fraction===undefined?'':'点'+[...fraction].map(c=>digits[Number(c)]).join(''));
}
export function spokenText(text: string): string {
  return text
    .replace(/(\d{4})[年-](\d{1,2})[月-](\d{1,2})日?/g,(_,y,m,d)=>[...y].map(c=>digits[Number(c)]).join('')+'年'+integer(String(Number(m)))+'月'+integer(String(Number(d)))+'日')
    .replace(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g,n=>n.replace(/,/g,''))
    .replace(/([+-]?\d+(?:\.\d+)?)\s*%/g,(_,n)=>'百分之'+number(n))
    .replace(/\$\s*(\d+(?:\.\d+)?)/g,(_,n)=>number(n)+'美元')
    .replace(/\d+(?:\.\d+)?/g,n=>number(n))
    .replace(/\bNVDA\b/g,'英伟达').replace(/\bMSFT\b/g,'微软').replace(/\bORCL\b/g,'甲骨文')
    .replace(/\bSMCI\b/g,'超微电脑').replace(/\bTSM\b/g,'台积电').replace(/\bGOOGL\b/g,'谷歌')
    .replace(/\bAI\b/g,'人工智能').replace(/\bGPU\b/g,'图形处理器')
    .replace(/\b[A-Z]{2,6}\b/g,s=>[...s].join(' '));
}
