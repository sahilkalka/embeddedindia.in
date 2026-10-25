// public/js/rfq.js - 3-Step Interactive RFQ Form Controller
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const step1 = document.getElementById('rfq-step-1');
  const step2 = document.getElementById('rfq-step-2');
  const step3 = document.getElementById('rfq-step-3');
  const steps = [step1, step2, step3];

  const progressLabel = document.getElementById('rfq-progress-label');
  const progressBar = document.getElementById('rfq-progress-bar');
  const stepIndicator = document.getElementById('rfq-step-indicator');

  const btnNext1 = document.getElementById('rfq-next-1');
  const btnBack2 = document.getElementById('rfq-back-2');
  const btnNext2 = document.getElementById('rfq-next-2');
  const btnBack3 = document.getElementById('rfq-back-3');

  const serviceCategoryInput = document.getElementById('serviceCategorySelect');
  const typeButtons = document.querySelectorAll('.rfq-type-btn');

  let currentStep = 1;

  function updateStepUI(step) {
    currentStep = step;
    steps.forEach((el, index) => {
      if (!el) return;
      if (index + 1 === step) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    const percent = Math.round((step / 3) * 100);
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressLabel) progressLabel.textContent = `${step}/3`;
    if (stepIndicator) stepIndicator.textContent = `Step ${step} of 3`;
  }

  // Handle Project Type selection buttons
  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      typeButtons.forEach(b => {
        b.classList.remove('bg-brand-500', 'text-white', 'border-brand-500', 'shadow-md');
        b.classList.add('bg-slate-50', 'dark:bg-brand-dark', 'text-slate-800', 'dark:text-slate-200', 'border-slate-200', 'dark:border-brand-border');
      });
      btn.classList.remove('bg-slate-50', 'dark:bg-brand-dark', 'text-slate-800', 'dark:text-slate-200', 'border-slate-200', 'dark:border-brand-border');
      btn.classList.add('bg-brand-500', 'text-white', 'border-brand-500', 'shadow-md');

      const val = btn.getAttribute('data-value');
      if (serviceCategoryInput) serviceCategoryInput.value = val;
    });
  });

  // URL query pre-select
  try {
    const params = new URLSearchParams(window.location.search);
    const serviceParam = (params.get('service') || '').toLowerCase();
    if (serviceParam) {
      typeButtons.forEach(btn => {
        const v = btn.getAttribute('data-value').toLowerCase();
        if (serviceParam.includes('hardware') && v.includes('hardware') ||
            serviceParam.includes('firmware') && v.includes('firmware') ||
            serviceParam.includes('iot') && v.includes('iot') ||
            serviceParam.includes('auto') && v.includes('auto')) {
          btn.click();
        }
      });
    }
  } catch (e) {}

  if (btnNext1) {
    btnNext1.addEventListener('click', () => {
      updateStepUI(2);
    });
  }

  if (btnBack2) {
    btnBack2.addEventListener('click', () => {
      updateStepUI(1);
    });
  }

  if (btnNext2) {
    btnNext2.addEventListener('click', () => {
      const subjectInput = document.getElementById('contact-subject');
      if (subjectInput && !subjectInput.value.trim()) {
        subjectInput.focus();
        subjectInput.reportValidity();
        return;
      }
      updateStepUI(3);
    });
  }

  if (btnBack3) {
    btnBack3.addEventListener('click', () => {
      updateStepUI(2);
    });
  }

  // Contact Form Submission
  const contactStatus = document.getElementById('contact-status-box');
  const contactSubmitBtn = document.getElementById('contact-submit-btn');
  const contactSpinner = document.getElementById('contact-spinner');
  const contactBtnArrow = document.getElementById('contact-btn-arrow');
  const contactBtnText = document.getElementById('contact-btn-text');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (contactSubmitBtn) {
      contactSubmitBtn.disabled = true;
      contactSubmitBtn.classList.add('opacity-75', 'cursor-not-allowed');
    }
    if (contactSpinner) contactSpinner.classList.remove('hidden');
    if (contactBtnArrow) contactBtnArrow.classList.add('hidden');
    if (contactBtnText) contactBtnText.textContent = 'Transmitting to info@embeddedindia.in...';

    if (contactStatus) {
      contactStatus.className = 'p-4 rounded-xl text-xs bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-accent font-semibold block border border-brand-200 dark:border-brand-800';
      contactStatus.textContent = 'Verifying specifications and dispatching notification...';
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Consolidate specs into message body
    const mcu = data.spec_mcu || '';
    const layers = data.spec_layers || '';
    const qty = data.spec_qty || '';
    const specsSummary = [
      mcu ? `Target MCU/SoC: ${mcu}` : null,
      layers ? `PCB Layers: ${layers}` : null,
      qty ? `Estimated Qty: ${qty}` : null
    ].filter(Boolean).join(' | ');

    if (specsSummary) {
      data.message = `[Specs: ${specsSummary}]\n\n${data.message || ''}`;
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        if (contactStatus) {
          contactStatus.className = 'p-4 rounded-xl text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold block border border-emerald-200 dark:border-emerald-800 shadow-sm';
          contactStatus.innerHTML = `<strong>Inquiry Received!</strong> ${result.message}`;
        }
        form.reset();
        updateStepUI(1);
      } else {
        if (contactStatus) {
          contactStatus.className = 'p-4 rounded-xl text-xs bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 font-semibold block border border-red-200 dark:border-red-800 shadow-sm';
          contactStatus.innerHTML = `<strong>Submission Error:</strong> ${result.message || 'Please check all required fields.'}`;
        }
      }
    } catch (err) {
      if (contactStatus) {
        contactStatus.className = 'p-4 rounded-xl text-xs bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 font-semibold block border border-red-200 dark:border-red-800 shadow-sm';
        contactStatus.innerHTML = '<strong>Connection Error:</strong> Could not reach the server. Please email <a href="mailto:info@embeddedindia.in" class="underline font-bold">info@embeddedindia.in</a> directly.';
      }
    } finally {
      if (contactSubmitBtn) {
        contactSubmitBtn.disabled = false;
        contactSubmitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
      }
      if (contactSpinner) contactSpinner.classList.add('hidden');
      if (contactBtnArrow) contactBtnArrow.classList.remove('hidden');
      if (contactBtnText) contactBtnText.textContent = 'Submit Inquiry to info@embeddedindia.in';
    }
  });

  // Initialize Step 1
  updateStepUI(1);
});

