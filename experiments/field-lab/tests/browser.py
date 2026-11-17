"""Real HTTP + WebGL + WASM + service worker checks; not an iPhone certification."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import tempfile,shutil,json
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory() as temp, sync_playwright() as pw:
    site=Path(temp)/'arthur-bigfoot'/'field-lab';shutil.copytree(ROOT/'dist',site)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=temp));Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/arthur-bigfoot/field-lab/?test=1'
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    errors=[]
    def start(context):
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url,wait_until='networkidle');page.wait_for_function('!!window.__LAB__');page.locator('#start').click();return page
    try:
        ctx=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1)
        page=start(ctx);page.wait_for_timeout(800)
        assert page.evaluate("!!document.querySelector('#view').getContext('webgl2')")
        page.screenshot(path=str(OUT/'clearing.png'))
        expect(page.locator('#update')).to_be_hidden()
        before=page.evaluate('window.__LAB__.lab.player.translation().z');page.keyboard.down('w');page.wait_for_timeout(400);page.keyboard.up('w');assert page.evaluate('window.__LAB__.lab.player.translation().z')<before
        page.locator('#pause').click();t=page.evaluate('window.__LAB__.lab.time');page.wait_for_timeout(150);assert page.evaluate('window.__LAB__.lab.time')==t;page.locator('#pause').click()
        for i in [0,1]:
            page.evaluate('(i)=>{const l=window.__LAB__.lab,t=l.trees[i];l.player.setTranslation({x:t.x,y:1.3,z:t.z+1.6},true);l.player.setLinvel({x:0,y:0,z:0},true)}',i)
            for _ in range(4):page.locator('#push').click()
            assert page.evaluate('(i)=>window.__LAB__.lab.trees[i].broken',i)
            page.wait_for_function('(i)=>window.__LAB__.lab.trees[i].body.translation().y < 1.5',arg=i,timeout=30000)
            page.evaluate('(i)=>{const l=window.__LAB__.lab,p=l.trees[i].body.translation();l.player.setTranslation({x:p.x+2,y:1.3,z:p.z},true);l.player.setLinvel({x:0,y:0,z:0},true)}',i)
            page.locator('#carry').click();assert page.evaluate('!!window.__LAB__.lab.held')
            page.evaluate('()=>{const l=window.__LAB__.lab;l.player.setTranslation({x:-3,y:1.3,z:-9},true);l.player.setLinvel({x:0,y:0,z:0},true)}')
            page.locator('#brace').click()
            assert page.evaluate('window.__LAB__.lab.braces.length')==i+1
        page.locator('#drone').click();assert page.evaluate('window.__LAB__.mode')=='drone';page.wait_for_function('window.__LAB__.lab.drone.body.translation().y > 2.5',timeout=30000)
        page.keyboard.down('w');page.wait_for_timeout(350);page.keyboard.up('w')
        page.screenshot(path=str(OUT/'drone.png'))
        page.locator('#pilot').click();page.locator('#rocket').click();page.wait_for_function('window.__LAB__.lab.rocket.body.translation().y > 5',timeout=30000)
        page.screenshot(path=str(OUT/'launch.png'))
        assert page.evaluate('window.__LAB__.save()')
        expect(page.locator('#status')).to_contain_text('Offline ready',timeout=15000)
        ctx.set_offline(True);page.reload(wait_until='load');page.wait_for_function('!!window.__LAB__');page.locator('#start').click();assert page.evaluate('window.__LAB__.lab.braces.length')==2
        assert page.evaluate("!!document.querySelector('#view').getContext('webgl2')")
        ctx.set_offline(False)
        mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
        phone=start(mobile);phone.wait_for_timeout(300);expect(phone.locator('#joystick')).to_be_visible();phone.screenshot(path=str(OUT/'phone.png'))
        box=phone.locator('#joystick').bounding_box();cdp=mobile.new_cdp_session(phone);x=box['x']+box['width']/2;y=box['y']+10
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':0}]});phone.wait_for_timeout(150);cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});assert phone.evaluate('window.__LAB__.getInput().touch.z')==0
        phone.set_viewport_size({'width':844,'height':390});expect(phone.locator('#push')).to_be_visible();phone.screenshot(path=str(OUT/'phone-landscape.png'))
        assert not errors,errors
        report={'engine':'Chromium WebGL2 + real Rapier WASM','browser':['launch','movement','pause','shove fractures','timber handling','two supports','hover','probe boost','real offline reload','saved supports','portrait','landscape','touch cancellation'],'limits':['no physical iPhone','not photorealistic final art','fixture teleport avoids natural traversal testing','no fracture stress certification']}
        (OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
    finally:
        browser.close();server.shutdown();server.server_close()
