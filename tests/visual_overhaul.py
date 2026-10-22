"""Real Chromium regression tests. Run: python tests/visual_overhaul.py
Requires Python Playwright and Chromium; no application build dependencies.
Artifacts default to /tmp/dustfall-validation. Test fixtures never touch real saves.
"""
import functools
import http.server
import json
import os
from pathlib import Path
import threading
import unittest
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
ARTIFACTS=Path(os.environ.get('DUSTFALL_ARTIFACTS','/tmp/dustfall-validation'))

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

class GameTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ARTIFACTS.mkdir(parents=True,exist_ok=True)
        cls.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever,daemon=True).start()
        cls.url=f'http://127.0.0.1:{cls.server.server_port}'
        cls.pw=sync_playwright().start()
        cls.browser=cls.pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.pw.stop();cls.server.shutdown();cls.server.server_close()
    def setUp(self):
        self.context=self.browser.new_context(viewport={'width':1440,'height':900},has_touch=True)
        # Deterministic simulation clock, actual animation clock remains enabled.
        self.context.add_init_script("""
          window.testIntervals=[];
          window.setInterval=(fn,ms)=>{testIntervals.push({fn,ms});return testIntervals.length};
          localStorage.setItem('dustfall-sim-v1', JSON.stringify({version:1,seenIntro:true}));
        """)
        self.page=self.context.new_page();self.errors=[];self.bad=[]
        self.page.on('pageerror',lambda e:self.errors.append(str(e)))
        self.page.on('response',lambda r:self.bad.append(r.url) if r.status>=400 else None)
        self.page.goto(self.url);self.page.wait_for_function('!!window.DustfallVisual && !!window.DustfallArt?.ready')
    def tearDown(self):
        self.assertEqual(self.errors,[]);self.assertEqual(self.bad,[]);self.context.close()
    def js(self,s): return self.page.evaluate(s)
    def seed(self):
        self.js("""()=>{state.resources={water:9000,food:9000,scrap:9000,energy:9000,medicine:500};state.v02.seenEvents=['leak','refugees','convoy'];render()}""")
    def tick_observers(self):
        self.js('()=>{for(const t of testIntervals.filter(t=>t.ms===500))t.fn()}')
    def test_01_build_upgrade_and_stages(self):
        self.seed()
        self.page.locator('[data-select="core"]').click();self.page.locator('[data-build="core"]').click()
        self.assertEqual(self.js('state.construction.id'),'core')
        self.assertLess(self.js('state.resources.scrap'),9000)
        self.js('()=>{state.construction.ends=0;testIntervals.find(t=>t.ms===1000).fn()}')
        self.assertEqual(self.js('state.levels.core'),2)
        self.assertIsNone(self.js('state.construction'))
        self.page.locator('[data-select="clinic"]').click();self.page.locator('[data-build="clinic"]').click()
        self.js('finishConstruction();render()');self.assertEqual(self.js('state.levels.clinic'),1)
        self.assertEqual(self.js('[0,1,2,3,4,5,50].map(DustfallVisual.stage)'),[0,1,1,2,2,3,3])
        # Every building advances through all three genuine levels via existing build logic.
        self.js("""()=>{for(const level of [3,5]){while(state.levels.core<level){build('core');finishConstruction()}for(const id of IDS.filter(id=>id!=='core')){while(state.levels[id]<level){state.resources={water:99999,food:99999,scrap:99999,energy:99999,medicine:99999};build(id);if(!state.construction)throw Error('build failed '+id);finishConstruction()}}render()}}""")
        self.assertEqual(self.js('IDS.map(id=>state.levels[id])'),[5]*9)
        self.page.locator('#sheetClose').click();self.page.wait_for_timeout(3300)
        self.page.screenshot(path=str(ARTIFACTS/'city-stage-3.png'))
    def test_02_production_consumption_and_crew(self):
        self.seed();before=self.js('state.resources.water');expected=self.js("gain('water')-state.pop*1.06")
        self.js('processHour()');self.assertAlmostEqual(self.js('state.resources.water')-before,expected,places=6)
        self.page.locator('[data-tab="people"]').click();before=self.js("gain('water')")
        self.page.locator('[data-crew="water"][data-delta="1"]').click()
        self.assertEqual(self.js('state.v03.crew.water'),4);self.assertGreater(self.js("gain('water')"),before)
        self.page.locator('[data-crew="water"][data-delta="-1"]').click();self.assertEqual(self.js('state.v03.crew.water'),3)
    def test_03_storm_shelter_and_repair(self):
        self.seed();self.js('()=>{state.day=2;state.hour=6;processHour()}');self.tick_observers()
        self.assertTrue(self.js('storming()'));self.assertLess(self.js('state.v02.integrity'),100)
        self.assertTrue(self.page.locator('body').evaluate("e=>e.classList.contains('weather-emergency')"))
        self.page.locator('#shelterBtn').click();self.assertTrue(self.js('state.v02.shelter'))
        before=self.js('state.resources.energy');self.js('processHour()');self.tick_observers();self.assertLess(self.js('state.resources.energy'),before+22)
        self.page.locator('[data-select="core"]').click();self.page.locator('[data-repair]').click();self.assertEqual(self.js('state.v02.integrity'),100)
        self.page.locator('#sheetClose').click();self.page.screenshot(path=str(ARTIFACTS/'city-storm.png'))
    def test_04_raids_damage_and_medical(self):
        self.seed();self.js('()=>{state.day=4;state.hour=9;state.v03.crew.guard=0;processHour()}');self.tick_observers()
        self.assertEqual(self.js('state.v03.pendingRaid'),4)
        self.page.locator('[data-raid="hold"]').click()
        self.assertEqual(self.js('state.v03.pendingRaid'),0);self.assertGreater(self.js('state.sick'),0);self.assertLess(self.js('state.v02.integrity'),100)
        self.assertEqual(self.js('state.v03.raids.length'),1)
        self.js('()=>{state.levels.clinic=1;state.tick=3;processHour()}');self.assertEqual(self.js('state.sick'),1)
    def test_05_expedition_and_technology(self):
        self.seed();self.js('state.levels.radar=1');self.page.locator('[data-tab="scout"]').click()
        self.page.locator('[data-route="ruins"]').click();self.assertEqual(self.js('state.expedition.route'),'ruins')
        self.js('()=>{state.expedition.ends=0;testIntervals.find(t=>t.ms===1000).fn()}');self.assertIsNone(self.js('state.expedition'));self.assertEqual(self.js('state.v02.expeditionsDone'),1)
        self.page.locator('[data-tab="tech"]').click();self.page.locator('[data-research="filter"]').click();self.assertIn('filter',self.js('state.tech'))
    def test_06_legacy_save_recovery(self):
        legacy=self.js("""()=>{const s=fresh();s.day=7;s.levels.core=4;s.resources.scrap=1234;s.seenIntro=true;return s}""")
        # A new page receives a v0.1 save without the extension fields.
        self.context.add_init_script('localStorage.setItem("dustfall-sim-v1",'+json.dumps(json.dumps(legacy))+')')
        self.page.reload();self.page.wait_for_function('!!window.DustfallVisual && !!window.DustfallArt?.ready')
        self.assertEqual(self.js('state.day'),7);self.assertEqual(self.js('state.levels.core'),4);self.assertEqual(self.js('state.resources.scrap'),1274)  # Existing chapter reward: +40 for core level 2.
        self.assertTrue(self.js('!!state.v02 && !!state.v03'));self.assertEqual(self.js('KEY'),'dustfall-sim-v1')
        self.js('save()');saved=self.js('JSON.parse(localStorage.getItem(KEY))');self.assertEqual(saved['levels']['core'],4)
    def test_06b_current_save_reload_and_pending_work(self):
        context=self.browser.new_context(viewport={'width':1024,'height':768})
        context.add_init_script("window.setInterval=()=>0")
        page=context.new_page();page.on('pageerror',lambda e:self.errors.append(str(e)))
        page.goto(self.url);page.wait_for_function('!!window.DustfallVisual && !!window.DustfallArt?.ready')
        page.evaluate("""()=>{state.seenIntro=true;state.levels.core=3;state.levels.radar=1;state.resources.scrap=4567;state.v03.crew.water=4;state.v02.claimed=['core','radar'];state.v02.integrity=72;state.v02.shelter=true;state.construction={id:'housing',started:Date.now(),ends:Date.now()+60000};state.expedition={route:'ruins',ends:Date.now()+60000};save()}""")
        page.reload();page.wait_for_function('!!window.DustfallVisual && !!window.DustfallArt?.ready')
        result=page.evaluate("[state.levels.core,state.resources.scrap,state.v03.crew.water,state.v02.integrity,state.v02.shelter,state.construction.id,state.expedition.route]")
        self.assertEqual(result,[3,4567,4,72,True,'housing','ruins']);context.close()
    def test_07_selection_mouse_drag_and_zoom(self):
        point=self.js("()=>{const [x,y]=coords(3,3);return {x,y:y-70*viewport.k}}")
        self.page.mouse.click(point['x'],point['y']);self.assertEqual(self.js('state.selected'),'core');self.assertTrue(self.js('state.sheetOpen'))
        self.page.locator('#sheetClose').click();before=self.js('state.zoom');self.page.locator('#zoomIn').click();self.assertGreater(self.js('state.zoom'),before)
        self.page.mouse.move(600,430);self.page.mouse.down();self.page.mouse.move(680,470,steps=8);self.page.mouse.up();self.assertGreater(self.js('state.offsetX'),0)
        self.page.locator('#centerView').click();self.assertEqual(self.js('[state.zoom,state.offsetX,state.offsetY]'),[1,0,0])
        # Real Chromium multi-touch events through CDP, not synthetic DOM events.
        cdp=self.context.new_cdp_session(self.page)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':600,'y':430},{'x':700,'y':430}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':550,'y':430},{'x':750,'y':430}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        self.assertGreater(self.js('state.zoom'),1.5)
    def test_08_viewports_and_accessible_controls(self):
        for w,h in [(667,375),(844,390),(1024,768),(1440,900),(390,844)]:
            self.page.set_viewport_size({'width':w,'height':h});self.page.wait_for_timeout(300)
            self.assertFalse(self.js('document.documentElement.scrollWidth>innerWidth'))
            self.assertEqual(round(self.page.locator('#scene').bounding_box()['height']),h)
            self.page.screenshot(path=str(ARTIFACTS/f'city-{w}x{h}.png'))
            self.page.locator('[data-select="water"]').click();self.page.wait_for_timeout(300)
            r=self.page.locator('#panel').bounding_box();self.assertGreaterEqual(r['x'],0);self.assertLessEqual(r['x']+r['width'],w+1)
            self.assertGreaterEqual(r['y'],0);self.assertLessEqual(r['y']+r['height'],h+1)
            self.page.screenshot(path=str(ARTIFACTS/f'panel-{w}x{h}.png'))
            self.page.locator('#sheetClose').click()
    def test_09_assets_sw_cache_and_offline(self):
        self.page.evaluate('navigator.serviceWorker.ready.then(()=>true)');self.page.reload();self.page.wait_for_function('!!navigator.serviceWorker.controller')
        self.js("async()=>{await caches.open('dustfall-survival-v03');await caches.open('dustfall-visual-v1');await caches.open('other-app');const r=await navigator.serviceWorker.getRegistration();await r.unregister();await navigator.serviceWorker.register('/sw.js?upgrade-test')}")
        self.page.wait_for_function("caches.keys().then(keys=>!keys.includes('dustfall-survival-v03')&&!keys.includes('dustfall-visual-v1'))")
        keys=self.js('caches.keys()');self.assertIn('dustfall-visual-art-v2',keys);self.assertIn('other-app',keys)
        paths=self.js("caches.open('dustfall-visual-art-v2').then(c=>c.keys()).then(rs=>rs.map(r=>new URL(r.url).pathname))")
        for asset in ['/city-renderer.js','/assets/textures/salvage.svg','/assets/manifest.json','/city-art.js','/assets/art/atlas.json','/assets/art/buildings-stage-1.webp','/assets/art/buildings-stage-2.webp','/assets/art/buildings-stage-3.webp','/assets/art/survivors.webp']: self.assertIn(asset,paths)
        self.context.set_offline(True);self.page.reload();self.page.wait_for_function('!!window.DustfallVisual && !!window.DustfallArt?.ready');self.assertEqual(self.js('DustfallVisual.version'),'1.0.0')
    def test_09b_original_art_stages_and_alpha_selection(self):
        self.assertTrue(self.js('DustfallArt.ready'))
        self.assertEqual(self.js('Object.keys(DustfallArt.metadata.buildings).length'),9)
        self.assertTrue(self.js("()=>IDS.every(id=>[1,2,3].every(s=>{const c=DustfallArt.building(id,s);return c.width>100&&c.height>100}))"))
        # Each actual stage produces different rendered pixels, not a renamed shared sprite.
        for stage in [1,2,3]:
            self.js(f"()=>{{for(const id of IDS)state.levels[id]={stage*2-1};render()}}")
            self.page.wait_for_timeout(2300)
            self.page.screenshot(path=str(ARTIFACTS/f'art-stage-{stage}.png'))
        self.assertTrue(self.js("()=>IDS.every(id=>{const signatures=[1,2,3].map(s=>DustfallArt.building(id,s).toDataURL());return new Set(signatures).size===3})"))
        # Transparent gaps must stay transparent: hit tests use the same cached sprite alpha.
        self.assertIsNone(self.js('sceneHit(20,450)'))
        self.assertEqual(self.js('Object.keys(DustfallArt.metadata.people).length'),5)
        self.assertTrue(self.js("()=>['worker','medical','guard','explorer','raider'].every(r=>DustfallArt.person(r,0).toDataURL()!==DustfallArt.person(r,1).toDataURL())"))
    def test_10_power_roles_routes_and_frames(self):
        self.js('()=>{state.resources.energy=0;render()}');self.assertTrue(self.page.locator('body').evaluate("e=>e.classList.contains('power-outage')"))
        # Route positions always lie on a road or the site's entry spur.
        self.assertTrue(self.js("""()=>IDS.every(id=>{const [bx,by]=DB[id].xy;return Array.from({length:100},(_,i)=>DustfallVisual.routePosition(id,i/50)).every(([x,y])=>Math.abs(x-2)<1e-8||Math.abs(y-Math.floor(by/2)*2)<1e-8||Math.abs(x-bx)<1e-8)})"""))
        self.js('()=>{for(const id of IDS)state.levels[id]=5;state.resources.energy=100;state.hour=23;state.sick=2;state.expedition={route:"ruins",ends:Date.now()+24000};state.v03.pendingRaid=4;state.v03.crew.medical=2;render()}')
        timing=self.js('()=>{let t=performance.now();for(let i=0;i<30;i++)draw();return (performance.now()-t)/30}')
        (ARTIFACTS/'render-timing.json').write_text(json.dumps({'meanDrawMs':timing,'frames':30,'viewport':[1440,900],'note':'Headless host; not mobile hardware FPS'}))
        self.page.wait_for_timeout(2500);self.page.screenshot(path=str(ARTIFACTS/'city-night-raid.png'));self.assertLess(timing,100)

if __name__=='__main__': unittest.main(verbosity=2)
