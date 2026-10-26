const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const AxeBuilder = require('@axe-core/playwright').default;
const request = require('supertest');
process.env.NODE_ENV = 'test';
process.env.ADMIN_JWT_SECRET = 'admin-responsive-qa-only';
const db = require('../src/services/db');
const { clearSettingsCache } = require('../src/middleware/seo');
const originalSettings = db.setting.findMany.bind(db.setting);
const override = { maintenance_mode: 'false', enable_copilot: 'true', enable_back_to_top: 'true', enable_rfq_popup: 'false', custom_faqs: '[]' };
db.setting.findMany = async () => Object.entries({ ...Object.fromEntries((await originalSettings()).map(r => [r.key, r.value])), ...override }).map(([key, value]) => ({ key, value }));
db.setting.upsert = async ({ create, update, where }) => { override[where.key] = update.value; return { ...create, ...update }; };
const originalUser = db.user.findUnique.bind(db.user);
db.user.findUnique = async args => args.where.id === 'qa-admin' ? { id: 'qa-admin', email: 'qa@example.test', username: 'QA', role: 'admin' } : originalUser(args);
db.analytics.create = async () => ({});
db.calculatorStat.create = async () => ({});
db.calculatorStat.update = async () => ({});
const app = require('../src/server');
const token = jwt.sign({ userId: 'qa-admin', role: 'admin' }, process.env.ADMIN_JWT_SECRET);
const out = path.join(__dirname, '../scratch/admin-responsive'); fs.mkdirSync(out, { recursive: true });
const presets = require('../src/data/colorThemes');
const sections = ['site-customizer', 'feature-flags', 'seo-scripts', 'monetization-ads', 'newsletter-config', 'smtp-settings', 'team-accounts', 'faq-manager'];
const pages = ['/admin', '/admin/inquiries', '/admin/subscribers', '/admin/posts', '/admin/projects', '/admin/ai'];


(async()=>{
 const server=app.listen(0,'127.0.0.1'); await new Promise(r=>server.once('listening',r)); const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 try { for(const width of [320,390,768,1440,1920]) {
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.addCookies([{name:'admin_token',value:token,url:base}]);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/admin/settings#monetization-ads',{waitUntil:'domcontentloaded'});
  const editor=page.locator('#ad-placement-editor');await editor.waitFor({state:'visible'});
  for(const dark of [false,true]) {
   await page.getByRole('button',{name:'Appearance',exact:true}).click();
   await page.locator('.appearance-panel').getByRole('switch',{name:'Night mode'}).setChecked(dark);await page.keyboard.press('Escape');
   const sizes=await page.locator('.ad-placement-card').evaluateAll(cards=>cards.map(c=>{const r=c.getBoundingClientRect();return {w:r.width,h:r.height,overflow:c.scrollWidth>c.clientWidth};}));
   assert.equal(sizes.length,6);for(const size of sizes){assert(Math.abs(size.w-sizes[0].w)<1);assert.equal(size.h,sizes[0].h);assert(!size.overflow);}
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+' page overflow');
   assert(await editor.evaluate(el=>el.scrollWidth<=el.clientWidth+1),width+' editor overflow');
   const rows=[['ad_toggle_slot1','ad_wf_slot1'],['ad_toggle_slot2','ad_wf_slot2'],['ad_toggle_slot3','ad_wf_slot3'],['ad_toggle_slot4','ad_wf_slot4'],['ad_toggle_slot_tools_header','ad_wf_slot_tools_h'],['ad_toggle_slot_tools_footer','ad_wf_slot_tools_f']];
   for(const [toggle,preview] of rows) {
    const state=await page.locator('#'+toggle).inputValue();const classes=await page.locator('#'+preview).getAttribute('class');
    await page.locator('#btn_'+toggle).click();
    assert.equal(await page.locator('#'+preview).getAttribute('data-active'),String(state!=='true'));
    assert.equal(await page.locator('#'+preview).getAttribute('class'),classes);
    assert.equal(await page.locator('#'+preview+' .ad-preview-state').innerText(),state==='true'?'Disabled':'Active');
    await page.locator('#btn_'+toggle).click();
   }
   await editor.screenshot({style:'header { visibility:hidden !important; }',path:path.join(out,width+'-ad-placement-'+(dark?'dark':'light')+'.png')});
  }
  assert.deepEqual(errors,[]);await context.close();console.log(width+': equal cards, responsive previews, light/dark, six live toggles passed');
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
