(function () {
  'use strict';
  var token = location.hash.slice(1), form = document.getElementById('setup-form'), status = document.getElementById('setup-status');
  history.replaceState(null, '', location.pathname);
  if (!/^[a-f0-9]{64}$/i.test(token)) { form.hidden = true; status.textContent = 'Open your private setup link to continue. If setup is already complete, go to administration.'; return; }
  form.addEventListener('submit', function (event) {
    event.preventDefault(); var password = document.getElementById('new-password'), confirmation = document.getElementById('confirm-password'), button = form.querySelector('button');
    if (password.value.length < 8 || password.value.length > 256 || password.value !== confirmation.value) { status.textContent = 'Use 8 to 256 characters and matching passwords.'; return; }
    button.disabled = true; status.textContent = 'Creating your administrator…';
    fetch('/api/setup', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token, password: password.value }) }).then(function (response) { return response.json().then(function (data) { if (!response.ok) throw new Error(data.error || 'Setup failed'); token = ''; password.value = ''; confirmation.value = ''; location.replace('/admin.html'); }); }).catch(function (error) { password.value = ''; confirmation.value = ''; button.disabled = false; status.textContent = error.message; });
  });
})();
