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
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 try{for(const width of [390,768,1024,1440,1920]){
  const context=await browser.newContext({viewport:{width,height:960}});await context.addCookies([{name:'admin_token',value:token,url:base}]);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/admin/settings',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{window.__forcedSettingsScrolls=0;window.scrollTo=()=>window.__forcedSettingsScrolls++;});
  for(const id of ['feature-flags','faq-manager','site-customizer','team-accounts','seo-scripts','site-customizer']){
   const before=await page.locator('#settingsLeftSidebar').boundingBox();
   await page.locator('[data-settings-tab="'+id+'"]').click();await page.waitForTimeout(200);
   assert(await page.locator('#'+id).isVisible(),id+' visible');
   const after=await page.locator('#settingsLeftSidebar').boundingBox();
   assert(Math.abs(before.y-after.y)<=1,width+' Settings navigation stays in place for '+id);
  }
  assert.equal(await page.evaluate(()=>window.__forcedSettingsScrolls),0,'No forced page scroll on tab selection');
  assert.deepEqual(errors,[]);console.log('PASS: stable settings selection at '+width+'px');await context.close();
 }}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
