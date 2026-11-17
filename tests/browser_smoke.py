"""Browser acceptance checks. Default: real HTTP+WebGL+service worker, for CI.
--fixture: in-memory bundled page + memory storage + CPU fallback, for restricted runners.
Fixture mode does NOT test HTTP, service-worker installation, or real persistent storage.
"""
from __future__ import annotations
import argparse
import functools
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import threading
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

with tempfile.TemporaryDirectory() as directory, sync_playwright() as p:
    site=Path(directory)/'arthur-bigfoot';shutil.copytree(ROOT/'site',site)
    handler=functools.partial(SimpleHTTPRequestHandler,directory=directory)
    server=ThreadingHTTPServer(('127.0.0.1',0),handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    url=f'http://127.0.0.1:{server.server_port}/arthur-bigfoot/'
    launch={'headless':True,'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
    if args.fixture:launch['executable_path']='/usr/bin/chromium'
    browser=p.chromium.launch(**launch)
    errors=[]
    def open_page(context):
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        if args.fixture:
            spec=importlib.util.spec_from_file_location('portable',ROOT/'tools/build_portable.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
            html=module.build().replace("new URL('.',location.href).pathname","'/arthur-bigfoot/'")
            html=html.replace('</script>',"window.__test={get state(){return state}};\n</script>")
            page.evaluate("() => {const data=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}})}")
            page.set_content(html,wait_until='load')
        else:page.goto(url,wait_until='networkidle')
        expect(page.locator('#options button')).to_have_count(7)
        expect(page.locator('#fatal')).to_be_hidden()
        if not args.fixture:assert page.evaluate("!!document.querySelector('#scene').getContext('webgl2')"), 'Hardware/SwiftShader WebGL2 path did not initialize'
        return page
    try:
        context=browser.new_context(viewport={'width':1280,'height':800})
        page=open_page(context)
        # All categories and every selectable item work, not just the default look.
        for category in ['Scarf','Hair','Glasses','Drink','Accessory']:
            page.get_by_role('tab',name=category,exact=True).click()
            names=page.locator('#options strong').all_text_contents()
            for name in names:
                page.locator('#options button').filter(has_text=name).click()
                assert js_state(page,f'return state.look[{json.dumps(category.lower())}]')==name
        page.get_by_role('tab',name='Scarf',exact=True).click();page.locator('#options button').filter(has_text='Tie-dye hemp').click()
        page.get_by_role('tab',name='Glasses',exact=True).click();page.locator('#options button').filter(has_text='Round').click()
        page.get_by_role('tab',name='Scarf',exact=True).click()
        screenshot(page,'wardrobe.png')
        page.locator('#playBtn').click();before=js_state(page,'return state.z')
        page.keyboard.down('w');page.wait_for_timeout(700);page.keyboard.up('w')
        assert js_state(page,'return state.z')<before
        page.locator('#pauseBtn').click();paused=js_state(page,'return state.z');page.keyboard.down('w');page.wait_for_timeout(150);page.keyboard.up('w');assert js_state(page,'return state.z')==paused
        page.locator('#closeHelp').click();screenshot(page,'forest.png')
        # Objective placement is an explicit test fixture; interaction uses the real UI.
        for x,z,stage in [(0,-6,1),(11,-15,2),(0,22,3)]:
            js_state(page,f'state.x={x};state.z={z};');page.keyboard.press('e');assert js_state(page,'return state.stage')==stage
        js_state(page,'state.x=0;state.z=-3;');page.keyboard.press('e')
        expect(page.locator('#workbench')).to_be_visible()
        page.locator('#testBtn').click();expect(page.locator('#benchResult')).to_contain_text('Not quite')
        for i,n in enumerate([2,4,1]):
            for _ in range(n):page.locator('#dials button').nth(i).click()
        page.locator('#testBtn').click();assert js_state(page,'return state.stage')==4
        screenshot(page,'laboratory.png')
        js_state(page,'state.x=-6;state.z=3;');page.keyboard.press('e');assert js_state(page,'return state.stage')==5
        page.wait_for_timeout(150);expect(page.locator('#saveStatus')).to_have_text('Progress saved')
        if not args.fixture:
            expect(page.locator('#offline')).to_have_text('Offline ready',timeout=20000)
            context.set_offline(True);page.reload(wait_until='load');expect(page.locator('#options button')).to_have_count(7);assert js_state(page,'return state.stage')==5
            expect(page.locator('#fatal')).to_be_hidden();context.set_offline(False)
            # Exercise an actual waiting-worker update against only the temporary copy.
            for filename in ['game.js','sw.js']:
                f=site/filename;f.write_text(f.read_text().replace('0.4.1-rebuilt','0.4.1-rebuilt-ci-update'))
            page.evaluate('async () => (await navigator.serviceWorker.getRegistration()).update()')
            expect(page.locator('#updateBtn')).to_be_visible(timeout=20000)
            page.locator('#updateBtn').click();expect(page.locator('#version')).to_have_text('0.4.1-rebuilt-ci-update',timeout=20000)
            expect(page.locator('#offline')).to_have_text('Offline ready',timeout=20000);assert js_state(page,'return state.stage')==5
        # Portrait and landscape controls are both usable; neither is blocked by a rotate gate.
        phone=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
        mobile=open_page(phone);screenshot(mobile,'phone-wardrobe.png')
        mobile.locator('#playBtn').tap();expect(mobile.locator('#joystick')).to_be_visible()
        box=mobile.locator('#joystick').bounding_box();x=box['x']+box['width']/2;y=box['y']+8
        cdp=phone.new_cdp_session(mobile)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':0}]})
        mobile.wait_for_timeout(250)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
        stopped=js_state(mobile,'return state.z');mobile.wait_for_timeout(150)
        assert js_state(mobile,'return state.z')==stopped
        mobile.locator('#sneakBtn').tap();expect(mobile.locator('#sneakBtn')).to_have_attribute('aria-pressed','true')
        mobile.set_viewport_size({'width':844,'height':390});expect(mobile.locator('#actionBtn')).to_be_visible();screenshot(mobile,'phone-landscape.png')
        assert not errors,errors
        print('PASS: wardrobe options, keyboard movement, pause, mission, workbench, local save, phone layouts.')
        print('FIXTURE MODE: service worker and hardware WebGL not tested.' if args.fixture else 'PASS: real HTTP, WebGL-capable Chromium, offline reload and saved update.')
    finally:
        browser.close();server.shutdown();server.server_close()
