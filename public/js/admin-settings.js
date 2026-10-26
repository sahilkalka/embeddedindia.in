  window.switchSettingsSection = function(sectionId, updateUrl = true) {
    const HASH_ALIASES = {
      'theme-engine': 'site-customizer',
      'theme-engine.': 'site-customizer',
      'seo': 'seo-scripts',
      'newsletter': 'newsletter-config',
      'smtp': 'smtp-settings',
      'staff': 'team-accounts'
    };
    if (HASH_ALIASES[sectionId]) {
      sectionId = HASH_ALIASES[sectionId];
    }
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) {
      console.warn('Target section not found:', sectionId);
      return;
    }

    // 1. Hide all sections, show target
    document.querySelectorAll('.settings-section').forEach(sec => {
      sec.classList.add('hidden');
    });
    targetSection.classList.remove('hidden');

    // 3. Update taskbar navigation state
    document.querySelectorAll('.settings-nav-btn').forEach(btn => {
      const tab = btn.getAttribute('data-settings-tab');
      const isTarget = (tab === sectionId);
      btn.classList.toggle('is-active', isTarget);
      if (isTarget) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    // 4. Update URL Hash seamlessly
    if (history.replaceState && updateUrl) {
      history.replaceState(null, null, '#' + sectionId);
    }

    // Reveal the selected module in horizontal navigation without scrolling the page.
    const nav = document.getElementById('settings-sidebar-nav');
    const active = nav?.querySelector('[aria-current="page"]');
    if (nav && active && nav.scrollWidth > nav.clientWidth) {
      const item = active.getBoundingClientRect(), bounds = nav.getBoundingClientRect();
      if (item.left < bounds.left) nav.scrollLeft -= bounds.left - item.left;
      else if (item.right > bounds.right) nav.scrollLeft += item.right - bounds.right;
    }
  };
  const switchSettingsSection = window.switchSettingsSection;

  // Listen for hashchange to switch settings tabs
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash ? window.location.hash.substring(1) : 'site-customizer';
    switchSettingsSection(hash);
  });

  // ====================================================================
  // 3. HOMEPAGE PREVIEW
  // ====================================================================
  function updateEventPreview() {
    const enabled = document.getElementById('lab_event_enabled')?.value === 'true';
    const label = document.getElementById('lab_event_label')?.value || 'Bangalore Lab: Online';
    const mockup = document.getElementById('eventPillMockup');
    const text = document.getElementById('eventPillText');

    if (text) text.innerText = label;
    if (mockup) {
      if (enabled) {
        mockup.classList.remove('opacity-40', 'line-through');
      } else {
        mockup.classList.add('opacity-40', 'line-through');
      }
    }
  }

    // ====================================================================
  // 5. FEATURE FLAGS TOGGLES & HOMEPAGE LIVE PREVIEW IFRAME CONTROLS
  // ====================================================================
  let currentViewportMode = '100%';
  function setIframeViewport(mode) {
    currentViewportMode = mode;
    [['desktop', '100%'], ['tablet', '768px'], ['mobile', '390px']].forEach(([name, value]) => {
      const button = document.getElementById('vp-btn-' + name);
      if (button) { button.setAttribute('aria-pressed', String(mode === value)); button.classList.toggle('viewport-selected', mode === value); }
    });
    applyScaledViewport(mode === '100%' ? 1440 : parseInt(mode, 10));
  }
  function applyScaledViewport(targetWidth) {
    const wrapper = document.getElementById('iframeViewportWrapper');
    const stage = document.getElementById('iframeScaleContainer');
    const iframe = document.getElementById('liveHomepageIframe');
    if (!wrapper || !stage || !iframe || !stage.clientWidth) return;
    const scale = Math.min(1, stage.clientWidth / (targetWidth + 4));
    const frameHeight = targetWidth === 390 ? 844 : targetWidth === 768 ? 1024 : 900;
    const totalHeight = frameHeight + 36;
    Object.assign(wrapper.style, { position: 'absolute', left: '50%', top: '0', margin: '0', width: (targetWidth + 4) + 'px', maxWidth: 'none', height: totalHeight + 'px', transformOrigin: 'top center', transform: 'translateX(-50%) scale(' + scale + ')' });
    Object.assign(iframe.style, { width: targetWidth + 'px', height: frameHeight + 'px', flex: 'none' });
    Object.assign(stage.style, { height: Math.ceil(totalHeight * scale) + 'px', minHeight: '0' });
  }
  const previewStage = document.getElementById('iframeScaleContainer');
  if (previewStage) new ResizeObserver(() => setIframeViewport(currentViewportMode)).observe(previewStage);
  window.addEventListener('resize', () => setIframeViewport(currentViewportMode));

  async function toggleSectionFlag(flagName, btn) {
    const input = document.getElementById('input_' + flagName);
    const badge = document.getElementById('badge_' + flagName);
    const knob = btn.querySelector('span[aria-hidden="true"]');
    if (!input || !knob) return;

    const isCurrentlyOn = input.value !== 'false';
    const nextState = !isCurrentlyOn;
    input.value = nextState ? 'true' : 'false';

    // Visual switch animation
    if (nextState) {
      btn.classList.remove('bg-slate-300', 'dark:bg-slate-700');
      btn.classList.add('bg-emerald-500');
      knob.classList.remove('translate-x-0');
      knob.classList.add('translate-x-5');
      btn.setAttribute('aria-checked', 'true');
      if (badge) {
        badge.className = 'text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300';
        badge.innerText = 'Show';
      }
    } else {
      btn.classList.remove('bg-emerald-500');
      btn.classList.add('bg-slate-300', 'dark:bg-slate-700');
      knob.classList.remove('translate-x-5');
      knob.classList.add('translate-x-0');
      btn.setAttribute('aria-checked', 'false');
      if (badge) {
        badge.className = 'text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500';
        badge.innerText = 'Hide';
      }
    }

    // Auto-save via AJAX and auto-refresh preview iframe
    const syncStatus = document.getElementById('previewSyncBadge');
    if (syncStatus) {
      syncStatus.innerText = '[Syncing...]';
      syncStatus.className = 'text-amber-500 font-bold animate-pulse';
    }

    try {
      const payload = {
        _active_tab: 'feature-flags',
        [flagName]: nextState ? 'true' : 'false'
      };
      await fetch('/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
      });

      // Reload iframe automatically with cache-busting timestamp
      const iframe = document.getElementById('liveHomepageIframe');
      if (iframe) {
        iframe.src = '/?preview=1&t=' + Date.now();
      }

      if (syncStatus) {
        syncStatus.innerText = '[Live Preview]';
        syncStatus.className = 'text-brand-500 font-bold';
      }
      showToast('✅ ' + (nextState ? 'Enabled ' : 'Disabled ') + flagName.replace('section_', '').replace('_enabled', ''));
    } catch (e) {
      console.error('Auto-save flag error:', e);
      if (syncStatus) {
        syncStatus.innerText = '[Sync Error]';
        syncStatus.className = 'text-red-500 font-bold';
      }
    }
  }

  // ====================================================================
  // 6. DYNAMIC SEO SCORE METER & AI OPTIMIZER
  // ====================================================================
  function calculateSeoScore() {
    const title = (document.getElementById('seo_title')?.value || '').trim();
    const desc = (document.getElementById('seo_description')?.value || '').trim();
    const keywords = (document.getElementById('seo_keywords')?.value || '').trim();
    const ogImg = (document.getElementById('seo_og_image')?.value || '').trim();

    // Live character counters
    const titleCounter = document.getElementById('titleCounter');
    const descCounter = document.getElementById('descCounter');
    if (titleCounter) titleCounter.innerText = `${title.length} / 60 chars`;
    if (descCounter) descCounter.innerText = `${desc.length} / 160 chars`;

    let score = 0;

    // Title score (max 30)
    const chkTitle = document.getElementById('chk_title');
    if (title.length >= 40 && title.length <= 65) {
      score += 30;
      updateChk(chkTitle, true, `${title.length} chars (Optimal)`);
    } else if (title.length > 0) {
      score += 15;
      updateChk(chkTitle, false, `${title.length} chars (Target: 40-65)`);
    } else {
      updateChk(chkTitle, false, 'Missing title');
    }

    // Description score (max 30)
    const chkDesc = document.getElementById('chk_desc');
    if (desc.length >= 120 && desc.length <= 165) {
      score += 30;
      updateChk(chkDesc, true, `${desc.length} chars (Optimal)`);
    } else if (desc.length > 0) {
      score += 15;
      updateChk(chkDesc, false, `${desc.length} chars (Target: 120-160)`);
    } else {
      updateChk(chkDesc, false, 'Missing description');
    }

    // Keywords score (max 20)
    const chkKw = document.getElementById('chk_keywords');
    const kwCount = keywords ? keywords.split(',').filter(Boolean).length : 0;
    if (kwCount >= 4) {
      score += 20;
      updateChk(chkKw, true, `${kwCount} tags (Optimal)`);
    } else if (kwCount > 0) {
      score += 10;
      updateChk(chkKw, false, `${kwCount} tags (Recommend 4+)`);
    } else {
      updateChk(chkKw, false, 'Missing keywords');
    }

    // OpenGraph image (max 20)
    const chkOg = document.getElementById('chk_og');
    if (ogImg && (ogImg.startsWith('http') || ogImg.startsWith('/'))) {
      score += 20;
      updateChk(chkOg, true, 'Valid OG Card');
    } else {
      updateChk(chkOg, false, 'Missing OG Image');
    }

    // Update UI meter
    const scoreVal = document.getElementById('seoScoreVal');
    const scoreBar = document.getElementById('seoScoreBar');
    const badge = document.getElementById('seoScoreBadge');

    if (scoreVal) scoreVal.innerText = score;
    if (scoreBar) scoreBar.style.width = score + '%';

    if (badge && scoreBar) {
      if (score >= 85) {
        badge.innerText = 'EXCELLENT';
        badge.className = 'px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
        scoreBar.className = 'bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500';
      } else if (score >= 60) {
        badge.innerText = 'GOOD';
        badge.className = 'px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
        scoreBar.className = 'bg-gradient-to-r from-amber-500 to-yellow-400 h-2.5 rounded-full transition-all duration-500';
      } else {
        badge.innerText = 'NEEDS WORK';
        badge.className = 'px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
        scoreBar.className = 'bg-gradient-to-r from-red-500 to-orange-400 h-2.5 rounded-full transition-all duration-500';
      }
    }
  }

  function updateChk(el, isPass, msg) {
    if (!el) return;
    const icon = el.querySelector('.status-icon');
    const sub = el.querySelector('span.font-mono');
    if (icon) {
      icon.innerText = isPass ? '✓' : '⚠️';
      icon.className = 'status-icon font-bold ' + (isPass ? 'text-emerald-500' : 'text-amber-500');
    }
    if (sub) sub.innerText = msg;
  }

  // AI SEO Optimizer Button
  async function analyzeSeoWithAi() {
    const btn = document.getElementById('btnAnalyzeSeoAi');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-rounded animate-spin text-xl flex-shrink-0" aria-hidden="true">progress_activity</span><span class="text-[11px] font-bold tracking-tight mt-0.5 whitespace-nowrap leading-tight">Optimizing...</span>';
    }

    try {
      const res = await fetch('/admin/ai/optimize-seo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          title: document.getElementById('seo_title')?.value || 'Embedded India',
          content: document.getElementById('seo_description')?.value || 'Hardware Engineering Lab',
          type: 'homepage'
        })
      });
      const data = await res.json();
      if (data && (data.success || data.seoTitle)) {
        if (data.seoTitle) {
          const tInput = document.getElementById('seo_title');
          if (tInput) {
            tInput.value = data.seoTitle;
            tInput.classList.add('ring-2', 'ring-purple-500');
            setTimeout(() => tInput.classList.remove('ring-2', 'ring-purple-500'), 2500);
          }
        }
        if (data.seoDescription) {
          const dInput = document.getElementById('seo_description');
          if (dInput) {
            dInput.value = data.seoDescription;
            dInput.classList.add('ring-2', 'ring-purple-500');
            setTimeout(() => dInput.classList.remove('ring-2', 'ring-purple-500'), 2500);
          }
        }
        if (data.seoKeywords) {
          const kInput = document.getElementById('seo_keywords');
          if (kInput) {
            kInput.value = data.seoKeywords;
            kInput.classList.add('ring-2', 'ring-purple-500');
            setTimeout(() => kInput.classList.remove('ring-2', 'ring-purple-500'), 2500);
          }
        }
        calculateSeoScore();
        showToast('✨ AI High-CTR Meta Tags generated & applied!');
      } else {
        alert(data.error || 'AI optimization service response unavailable');
      }
    } catch (e) {
      alert('Error connecting to AI service: ' + e.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  }

  // ====================================================================
  // 7. AD PLACEMENT WIREFRAME PREVIEW
  // ====================================================================
  function updateAdWireframePreview() {
    const slots = [
      { toggleId: 'ad_toggle_slot1', wfId: 'ad_wf_slot1', label: 'Slot 1: Blog Top Leaderboard (728x90)' },
      { toggleId: 'ad_toggle_slot2', wfId: 'ad_wf_slot2', label: 'Slot 2: In-Article Body' },
      { toggleId: 'ad_toggle_slot3', wfId: 'ad_wf_slot3', label: 'Slot 3: Sticky Sidebar (300x250)' },
      { toggleId: 'ad_toggle_slot4', wfId: 'ad_wf_slot4', label: 'Slot 4: Post-Article Footer Slot' },
      { toggleId: 'ad_toggle_slot_tools_header', wfId: 'ad_wf_slot_tools_h', label: 'Slot 5: Tools Top Leaderboard' },
      { toggleId: 'ad_toggle_slot_tools_footer', wfId: 'ad_wf_slot_tools_f', label: 'Slot 6: Tools Mid/Footer Banner' }
    ];

    slots.forEach(s => {
      const toggle = document.getElementById(s.toggleId);
      const el = document.getElementById(s.wfId);
      if (!toggle || !el) return;
      const isActive = toggle.value === 'true';
      el.dataset.active = String(isActive);
      const state = el.querySelector('.ad-preview-state');
      if (state) state.textContent = isActive ? 'Active' : 'Disabled';
    });
  }

  // ====================================================================
  // 8. NEWSLETTER DIGEST TRIGGER
  // ====================================================================
  async function triggerNewsletterDigest() {
    const btn = document.getElementById('btnTriggerDigest');
    const resultBox = document.getElementById('digestTriggerResult');
    if (!btn || !resultBox) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-rounded animate-spin text-xl flex-shrink-0" aria-hidden="true">progress_activity</span><span class="text-[11px] font-bold tracking-tight mt-0.5 whitespace-nowrap leading-tight">Dispatching...</span>';
    resultBox.classList.remove('hidden');
    resultBox.className = 'p-3 rounded-xl text-xs font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300';
    resultBox.innerText = 'Compiling digest and dispatching to subscribers...';

    try {
      const res = await fetch('/admin/trigger-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_digest' })
      });
      const data = await res.json();
      if (data.success) {
        resultBox.className = 'p-3 rounded-xl text-xs font-mono bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300';
        resultBox.innerText = '✅ ' + (data.message || 'Newsletter digest sent successfully to all active subscribers!');
      } else {
        resultBox.className = 'p-3 rounded-xl text-xs font-mono bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300';
        resultBox.innerText = '❌ Error: ' + (data.error || 'Failed to dispatch digest');
      }
    } catch (e) {
      resultBox.className = 'p-3 rounded-xl text-xs font-mono bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300';
      resultBox.innerText = '❌ Network error: ' + e.message;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-rounded text-xl transition-transform duration-200 group-hover:scale-110 flex-shrink-0" aria-hidden="true">forward_to_inbox</span><span class="text-[11px] font-bold tracking-tight mt-0.5 whitespace-nowrap leading-tight">Test Send</span>';
    }
  }

  // ====================================================================
  // 9. EMAIL ROUTING HELPERS & SMTP PRESETS
  // ====================================================================
  function appendEmailTo(inputId, email) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const current = (input.value || '').trim();
    if (!current) {
      input.value = email;
    } else {
      const list = current.split(',').map(s => s.trim());
      if (!list.includes(email)) {
        list.push(email);
        input.value = list.join(', ');
      }
    }
    showToast(`Added ${email} to routing list`);
  }

  function setSmtpPreset(type) {
    if (type === 'gmail') {
      document.getElementById('smtp_host').value = 'smtp.gmail.com';
      document.getElementById('smtp_port').value = '587';
      document.getElementById('smtp_secure').value = 'false';
    } else if (type === 'sendgrid') {
      document.getElementById('smtp_host').value = 'smtp.sendgrid.net';
      document.getElementById('smtp_port').value = '587';
      document.getElementById('smtp_secure').value = 'false';
      document.getElementById('smtp_user').value = 'apikey';
    } else if (type === 'mock') {
      document.getElementById('smtp_host').value = 'localhost';
      document.getElementById('smtp_port').value = '1025';
      document.getElementById('smtp_secure').value = 'false';
      document.getElementById('smtp_user').value = 'mock';
      document.getElementById('smtp_pass').value = 'mock';
    }
    showToast(`Loaded ${type.toUpperCase()} preset`);
  }

  // ====================================================================
  // 10. INDEPENDENT MODULE FORM AJAX HANDLER
  // ====================================================================
  document.querySelectorAll('.settings-module-form').forEach(form => {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (form.dataset.saving === 'true') return;
      form.dataset.saving = 'true';
      const submitButtons = [...form.querySelectorAll('button[type="submit"]')];
      const originalButtons = submitButtons.map(button => button.innerHTML);
      submitButtons.forEach(button => { button.disabled = true; button.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">progress_activity</span><span>Saving…</span>'; });

      const formData = new FormData(form);
      const data = {};
      formData.forEach((value, key) => { data[key] = value; });

      try {
        const res = await fetch('/admin/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error || 'Unable to save settings.');
        }
        const moduleName = form.dataset.module || 'Settings';
        showToast(`✅ ${moduleName} saved and applied live!`);

        // If saving theme or feature flags, refresh the live homepage preview iframe
        if (form.dataset.module?.includes('Theme') || form.dataset.module?.includes('Flags')) {
          reloadHomepagePreview();
        }
      } catch (err) {
        showToast(err.message || 'Unable to save settings.', true);
      } finally {
        delete form.dataset.saving;
        submitButtons.forEach((button, index) => { button.disabled = false; button.innerHTML = originalButtons[index]; });
      }
    });
  });

  function showToast(message, isError = false) {
    const toast = document.getElementById('settingsToast');
    const msg = document.getElementById('settingsToastMsg');
    if (!toast || !msg) return;
    msg.innerText = message;
    toast.classList.toggle('bg-red-600', isError);
    toast.classList.toggle('bg-emerald-600', !isError);
    toast.classList.remove('hidden');
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  }

  // ====================================================================
  // 11. INITIALIZATION & HASH NAVIGATION
  // ====================================================================
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Navigation Buttons click delegation (Sidebar & Mobile)
    document.addEventListener('click', (e) => {
      const navBtn = e.target.closest('.settings-nav-btn');
      if (navBtn && navBtn.hasAttribute('data-settings-tab')) {
        e.preventDefault();
        const tab = navBtn.getAttribute('data-settings-tab');
        if (tab && window.switchSettingsSection) {
          window.switchSettingsSection(tab);
        }
      }
    });

    // 2. Previews initializations
    updateEventPreview();
    updateAdWireframePreview();

    // 3. Initial SEO score calculation
    calculateSeoScore();

    // 4. Determine initial active section based on URL hash or default to 'theme-engine'
    const initialHash = window.location.hash ? window.location.hash.substring(1) : 'site-customizer';
    switchSettingsSection(initialHash || 'site-customizer', false);

    // 5. AdSense pub validator
    const btnValidateAd = document.getElementById('btnValidateAd');
    if (btnValidateAd) {
      btnValidateAd.addEventListener('click', async () => {
        const pubInput = document.getElementById('adsense_pub_id');
        const pubId = pubInput ? pubInput.value : '';
        const resDiv = document.getElementById('adValidationResult');
        if (!resDiv) return;

        resDiv.classList.remove('hidden');
        resDiv.innerText = 'Validating publisher ID with IAB ads.txt format...';
        resDiv.className = 'p-2.5 rounded-xl text-[11px] font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300';

        try {
          const res = await fetch('/admin/settings/validate-ad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pubId })
          });
          const data = await res.json();
          if (data.success) {
            resDiv.className = 'p-2.5 rounded-xl text-[11px] font-mono bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300';
            resDiv.innerText = `✅ Valid Google AdSense ID: ${data.publisherId}. ads.txt synced!`;
          } else {
            resDiv.className = 'p-2.5 rounded-xl text-[11px] font-mono bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300';
            resDiv.innerText = `❌ Error: ${data.error}`;
          }
        } catch (e) {
          resDiv.className = 'p-2.5 rounded-xl text-[11px] font-mono bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300';
          resDiv.innerText = `❌ Network Error: ${e.message}`;
        }
      });
    }

    // 6. SMTP Test Button
    const btnTestSmtp = document.getElementById('btnTestSmtp');
    if (btnTestSmtp) {
      btnTestSmtp.addEventListener('click', async () => {
        const resDiv = document.getElementById('smtpTestResult');
        if (!resDiv) return;

        btnTestSmtp.disabled = true;
        btnTestSmtp.innerHTML = '<span class="material-symbols-rounded animate-spin text-xl flex-shrink-0" aria-hidden="true">progress_activity</span><span class="text-[11px] font-bold tracking-tight mt-0.5 whitespace-nowrap leading-tight">Testing...</span>';
        resDiv.classList.remove('hidden');
        resDiv.innerText = 'Performing diagnostic socket handshake...';
        resDiv.className = 'p-3 rounded-xl text-xs font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300';

        const payload = {
          host: document.getElementById('smtp_host')?.value,
          port: document.getElementById('smtp_port')?.value,
          secure: document.getElementById('smtp_secure')?.value === 'true',
          user: document.getElementById('smtp_user')?.value,
          pass: document.getElementById('smtp_pass')?.value,
          toEmail: document.getElementById('smtpTestRecipient')?.value
        };

        try {
          const res = await fetch('/admin/settings/test-smtp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
            resDiv.className = 'p-3 rounded-xl text-xs font-mono bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300';
            resDiv.innerText = `✅ Handshake Succeeded!\n${data.message}`;
          } else {
            resDiv.className = 'p-3 rounded-xl text-xs font-mono bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300';
            resDiv.innerText = `❌ Connection Error [${data.code || 'UNKNOWN'}]:\n${data.error}`;
          }
        } catch (e) {
          resDiv.className = 'p-3 rounded-xl text-xs font-mono bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300';
          resDiv.innerText = `❌ Network Failure: ${e.message}`;
        } finally {
          btnTestSmtp.disabled = false;
          btnTestSmtp.innerHTML = '<span class="material-symbols-rounded text-xl transition-transform duration-200 group-hover:scale-110 flex-shrink-0" aria-hidden="true">mark_email_read</span><span class="text-[11px] font-bold tracking-tight mt-0.5 whitespace-nowrap leading-tight">Test SMTP</span>';
        }
      });
    }

    // 7. Create Staff Account Button
    const btnAddAccount = document.getElementById('btnAddAccount');
    if (btnAddAccount) {
      btnAddAccount.addEventListener('click', async () => {
        const email = document.getElementById('newAccountEmail')?.value;
        const role = document.getElementById('newAccountRole')?.value;
        const pass = document.getElementById('newAccountPass')?.value;
        const resDiv = document.getElementById('addAccountResult');
        if (!resDiv) return;

        if (!email || !pass || pass.length < 8) {
          resDiv.classList.remove('hidden');
          resDiv.className = 'p-3 rounded-xl text-xs font-mono bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300';
          resDiv.innerText = 'Email and a password of at least 8 characters are required.';
          return;
        }

        try {
          const res = await fetch('/admin/settings/add-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, role, password: pass })
          });
          const data = await res.json();
          if (data.success) {
            resDiv.classList.remove('hidden');
            resDiv.className = 'p-3 rounded-xl text-xs font-mono bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300';
            resDiv.innerText = '✅ Account created! Refreshing table...';
            setTimeout(() => window.location.reload(), 1000);
          } else {
            resDiv.classList.remove('hidden');
            resDiv.className = 'p-3 rounded-xl text-xs font-mono bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300';
            resDiv.innerText = '❌ ' + (data.error || 'Failed to create user');
          }
        } catch (e) {
          resDiv.classList.remove('hidden');
          resDiv.className = 'p-3 rounded-xl text-xs font-mono bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300';
          resDiv.innerText = '❌ Network Error: ' + e.message;
        }
      });
    }
  });

  async function deleteAccount(userId) {
    if (!confirm('Are you sure you want to delete this staff user account?')) return;
    try {
      const res = await fetch('/admin/settings/delete-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: userId }) });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        alert(data.error || 'Failed to delete account');
      }
    } catch (e) {
      alert('Network error deleting account');
    }
  }
