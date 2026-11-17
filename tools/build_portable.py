"""Bundle our dependency-free ES modules as a self-contained desktop HTML file."""
from pathlib import Path
import re
import sys
ROOT=Path(__file__).resolve().parents[1]
def build():
    modules=[]
    for name in ('engine','game','world','offline','main'):
        source=(ROOT/f'site/{name}.js').read_text()
        source=re.sub(r'^import .*?;\n','',source,flags=re.M)
        source=re.sub(r'\bexport\s+','',source)
        if name=='world':source='const T=transform,M=multiply;\n'+source
        modules.append(source)
    html=(ROOT/'site/index.html').read_text()
    html=re.sub(r'<link[^>]+>','',html)
    html=html.replace('</head>','<style>'+(ROOT/'site/style.css').read_text()+'</style></head>')
    return re.sub(r'<script type="module"[^>]*></script>',lambda m:'<script>\n'+'\n'.join(modules)+'\n</script>',html)
if __name__=='__main__':
    out=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'arthur-offline.html'
    out.write_text(build());print(out)
