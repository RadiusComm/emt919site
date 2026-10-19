(() => {
  const $ = id => document.getElementById(id);
  let busy = false;
  function view(id) {
    ['checking', 'login-view', 'registration-view', 'result-view'].forEach(v => $(v).hidden = v !== id);
    $('feedback').hidden = true;
  }
  function message(text) { $('feedback').textContent = text; $('feedback').hidden = false; }
  async function api(path, body) {
    const response = await fetch(`/api/demo/${path}`, { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({ error: response.status === 429 ? 'Too many attempts. Wait a minute and try again.' : 'The service is unavailable. Please try again shortly.' }));
    if (!response.ok) { const error = new Error(data.error); error.status = response.status; throw error; }
    return data;
  }
  function setBusy(button, text, running) {
    busy = running;
    button.disabled = running;
    button.textContent = text;
    $('sign-out').disabled = running;
    document.querySelectorAll('#officer-form input, #officer-form select').forEach(input => input.disabled = running);
    button.setAttribute('aria-busy', String(running));
  }
  function signedIn(data) { $('operator-email').textContent = data.email; view('registration-view'); }
  $('show-password').addEventListener('click', () => {
    const show = $('password').type === 'password';
    $('password').type = show ? 'text' : 'password';
    $('show-password').textContent = show ? 'Hide' : 'Show';
    $('show-password').setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
  $('login-form').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    $('feedback').hidden = true;
    setBusy($('login-submit'), 'Signing in…', true);
    try { signedIn(await api('login', { email: $('email').value.trim(), password: $('password').value })); $('password').value = ''; $('officer-name').focus(); }
    catch (error) { message(error.message || 'Could not sign in. Check your connection and try again.'); }
    finally { setBusy($('login-submit'), 'Sign in →', false); }
  });
  $('officer-form').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    $('feedback').hidden = true;
    const details = { name: $('officer-name').value.trim(), rank: $('officer-rank').value.trim(), phone: $('officer-phone').value.trim() };
    setBusy($('officer-submit'), 'Creating demo & sending text…', true);
    try {
      const data = await api('officers', details);
      $('result-title').textContent = data.sms_sent ? 'Activation text sent' : 'Registered — text not sent';
      $('result-copy').textContent = data.sms_sent ? `${data.name} is registered for an EMT919 demo. The activation text was accepted for sending to ${data.phone}.` : `${data.name} was registered, but the activation text could not be sent to ${data.phone}. Ask an administrator to resend it from Demo Officers in the CRM. Do not register the officer again.`;
      $('next-steps').hidden = !data.sms_sent;
      $('officer-form').reset(); view('result-view'); $('add-another').focus();
    } catch (error) {
      if (error.status === 401) { view('login-view'); message('Your session expired. Sign in again; your entered officer details are preserved.'); }
      else message(error.message || 'Could not confirm the result. Check the CRM before retrying.');
    } finally { setBusy($('officer-submit'), 'Create demo & send text →', false); }
  });
  async function signOut() {
    if (busy) return;
    try { await api('logout', {}); $('officer-form').reset(); $('password').value = ''; view('login-view'); }
    catch { message('Could not sign out. Please try again.'); }
  }
  $('sign-out').addEventListener('click', signOut);
  $('result-sign-out').addEventListener('click', signOut);
  $('add-another').addEventListener('click', () => { view('registration-view'); $('officer-name').focus(); });
  api('session').then(signedIn).catch(error => { view('login-view'); if (error.status !== 401) message(error.message || 'Could not check sign-in.'); });
})();
