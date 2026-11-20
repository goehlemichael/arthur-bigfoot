"""Browser acceptance: HTTP + WebGL + actual offline/update paths by default.
--fixture uses an in-memory portable bundle, memory storage and CPU rendering.
Fixture transitions use explicit simulation steps after checking live animation advances.
It does not verify HTTP, persistent storage, WebGL or service-worker installation.
"""
from __future__ import annotations
import argparse, functools, importlib.util, json, shutil, tempfile, threading, time
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--fixture',action='store_true')
parser.add_argument('--screenshots')
args=parser.parse_args()
if args.screenshots:Path(args.screenshots).mkdir(parents=True,exist_ok=True)
def screenshot(page,name):
    if args.screenshots:page.screenshot(path=str(Path(args.screenshots)/name))
def js_state(page,code):
    if args.fixture:return page.evaluate('() => {const state=window.__test.state;'+code+'}')
    return page.evaluate('async () => {const {state}=await import("./main.js");'+code+'}')
def finish_climb(page):
    if args.fixture:page.evaluate('() => {for(let i=0;i<90;i++)window.__test.tick(window.__test.state,{x:0,z:0,sneak:false},.05)}')
    deadline=time.monotonic()+30
    while js_state(page,'return !!state.climb'):
        if time.monotonic()>deadline:raise AssertionError('Ladder transition did not finish')
        page.wait_for_timeout(100)
    page.wait_for_timeout(80)
with tempfile.TemporaryDirectory() as directory, sync_playwright() as p:
    site=Path(directory)/'arthur-bigfoot';shutil.copytree(ROOT/'site',site)
    handler=functools.partial(SimpleHTTPRequestHandler,directory=directory)
    server=ThreadingHTTPServer(('127.0.0.1',0),handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/arthur-bigfoot/'
    launch={'headless':True,'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
    if args.fixture:launch['executable_path']='/usr/bin/chromium'
    browser=p.chromium.launch(**launch);errors=[]
    def open_page(context):
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        if args.fixture:
            spec=importlib.util.spec_from_file_location('portable',ROOT/'tools/build_portable.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
            html=module.build().replace("new URL('.',location.href).pathname","'/arthur-bigfoot/'")
            # Limit CPU draw cadence in the restricted runner; simulation/input still run each frame.
            html=html.replace('if(renderer&&!document.hidden){','if(renderer&&!document.hidden&&((window.__testDraw=(window.__testDraw||0)+1)%10===0)){')
            html=html.replace('</script>',"window.__test={get state(){return state},tick};\n</script>")
            page.evaluate("() => {const data=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}})}")
            page.set_content(html,wait_until='load')
        else:page.goto(url,wait_until='networkidle')
        expect(page.locator('#options button')).to_have_count(7);expect(page.locator('#fatal')).to_be_hidden()
        if not args.fixture:assert page.evaluate("!!document.querySelector('#scene').getContext('webgl2')"), 'WebGL2 path did not initialize'
        return page
    try:
        context=browser.new_context(viewport={'width':1280,'height':800});page=open_page(context)
        version=page.locator('#version').text_content()
        for category in ['Scarf','Hair','Glasses','Drink','Accessory']:
            page.get_by_role('tab',name=category,exact=True).click()
            for name in page.locator('#options strong').all_text_contents():
                page.locator('#options button').filter(has_text=name).click()
                assert js_state(page,f'return state.look[{json.dumps(category.lower())}]')==name
        page.get_by_role('tab',name='Scarf',exact=True).click();page.locator('#options button').filter(has_text='Tie-dye hemp').click()
        page.get_by_role('tab',name='Glasses',exact=True).click();page.locator('#options button').filter(has_text='Round').click()
        page.get_by_role('tab',name='Scarf',exact=True).click();screenshot(page,'wardrobe.png')
        page.locator('#playBtn').click();assert js_state(page,"return state.area==='lab'&&state.landing")
        print('PASS: wardrobe and upper landing',flush=True)
        screenshot(page,'silo-landing.png');page.keyboard.press('e');page.wait_for_timeout(180)
        assert js_state(page,'return state.climb.elapsed')>0
        page.locator('#pauseBtn').click();paused=js_state(page,'return state.climb.elapsed')
        page.wait_for_timeout(150);assert js_state(page,'return state.climb.elapsed')==paused
        page.locator('#closeHelp').click();finish_climb(page)
        assert js_state(page,"return state.area==='lab'&&!state.landing")
        before=js_state(page,'return state.z');page.keyboard.down('w');page.wait_for_timeout(400);page.keyboard.up('w')
        assert js_state(page,'return state.z')<before;screenshot(page,'control-room.png')
        # Objective placement is an explicit fixture; interaction uses the real UI.
        for x,z,title in [(0,-10,'One planet'),(8,-10,'A universe'),(-8,-10,'Privacy'),(10,2,'quietest')]:
            js_state(page,f'state.x={x};state.z={z};');page.keyboard.press('e')
            expect(page.locator('#observatory')).to_be_visible();expect(page.locator('#terminalTitle')).to_contain_text(title)
            frozen=js_state(page,'return state.time');page.wait_for_timeout(100);assert js_state(page,'return state.time')==frozen
            if x==0:page.locator('#cycleDisplay').click();assert js_state(page,'return state.screen')==1
            page.locator('#closeTerminal').click()
        print('PASS: descent, pause, movement and all consoles',flush=True)
        js_state(page,'state.x=0;state.z=14;');page.keyboard.press('e');finish_climb(page)
        assert js_state(page,'return state.area')=='forest';screenshot(page,'forest.png')
        for x,z,stage in [(0,-6,1),(11,-15,2)]:
            js_state(page,f'state.x={x};state.z={z};');page.keyboard.press('e');assert js_state(page,'return state.stage')==stage
        js_state(page,'state.x=0;state.z=22;');page.keyboard.press('e');finish_climb(page)
        assert js_state(page,'return state.stage')==3
        js_state(page,'state.x=-11;state.z=-2;');page.keyboard.press('e');expect(page.locator('#workbench')).to_be_visible()
        page.locator('#testBtn').click();expect(page.locator('#benchResult')).to_contain_text('Not quite')
        for i,n in enumerate([2,4,1]):
            for _ in range(n):page.locator('#dials button').nth(i).click()
        page.locator('#testBtn').click();assert js_state(page,'return state.stage')==4
        js_state(page,'state.x=-10;state.z=8;');page.keyboard.press('e');assert js_state(page,'return state.stage')==5
        expect(page.locator('#saveStatus')).to_have_text('Progress saved')
        if not args.fixture:
            expect(page.locator('#offline')).to_have_text('Offline ready',timeout=20000)
            context.set_offline(True);page.reload(wait_until='load');expect(page.locator('#options button')).to_have_count(7)
            assert js_state(page,'return state.stage')==5;assert js_state(page,'return state.screen')==1
            expect(page.locator('#fatal')).to_be_hidden();context.set_offline(False)
            for filename in ['game.js','sw.js']:
                f=site/filename;f.write_text(f.read_text().replace(version,version+'-ci-update'))
            page.evaluate('async () => (await navigator.serviceWorker.getRegistration()).update()')
            expect(page.locator('#updateBtn')).to_be_visible(timeout=20000)
            page.locator('#updateBtn').click();expect(page.locator('#version')).to_have_text(version+'-ci-update',timeout=20000)
            expect(page.locator('#offline')).to_have_text('Offline ready',timeout=20000);assert js_state(page,'return state.stage')==5
        print('PASS: original Tuesday mission and save',flush=True)
        phone=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
        mobile=open_page(phone);screenshot(mobile,'phone-wardrobe.png')
        mobile.locator('#playBtn').tap();expect(mobile.locator('#joystick')).to_be_visible()
        mobile.locator('#actionBtn').tap();finish_climb(mobile);screenshot(mobile,'phone-control-room.png')
        box=mobile.locator('#joystick').bounding_box();x=box['x']+box['width']/2;y=box['y']+8
        cdp=phone.new_cdp_session(mobile);start=js_state(mobile,'return state.z')
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':0}]});mobile.wait_for_timeout(300)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
        stopped=js_state(mobile,'return state.z');assert stopped<start;mobile.wait_for_timeout(150);assert js_state(mobile,'return state.z')==stopped
        mobile.locator('#sneakBtn').tap();expect(mobile.locator('#sneakBtn')).to_have_attribute('aria-pressed','true')
        mobile.set_viewport_size({'width':844,'height':390});expect(mobile.locator('#actionBtn')).to_be_visible();screenshot(mobile,'phone-landscape.png')
        assert not errors,errors
        print('PASS: wardrobe, silo intro, live climb/pause, two-way ladder, consoles, mission, calibration, save, phone movement/cancel/layouts.')
        print('FIXTURE: HTTP, service-worker installation, real storage and WebGL not tested.' if args.fixture else 'PASS: HTTP, WebGL, offline reload and saved update.')
    finally:browser.close();server.shutdown();server.server_close()
