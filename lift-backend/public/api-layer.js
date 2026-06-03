/**
 * api-layer.js — LIFT Fitness · Capa de integración Frontend ↔ Backend
 * Inyectado al final del <body> del index.html
 * Reemplaza las funciones localStorage con llamadas al backend Express/Supabase.
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     CONFIG
  ══════════════════════════════════════════════════════ */
  const API_BASE = '';
  const JWT_KEY  = '_lift_jwt';
  const USR_KEY  = '_lift_user';

  // Detectar gym_slug desde el subdominio o usar 'lift' por defecto
  // Ejemplos: lift.ctrlgym.org → 'lift' | alpha.ctrlgym.org → 'alpha'
  function detectGymSlug() {
    const parts = window.location.hostname.split('.');
    if (parts.length >= 3) return parts[0]; // subdomain
    return 'lift'; // fallback para ctrlgym.org directo o localhost
  }
  const GYM_SLUG = detectGymSlug();

  // Mapa de credenciales demo: los botones del HTML usan @lift.com,
  // el backend usa @gym.com
  const DEMO_CREDS = {
    'admin@lift.com':     ['admin@gym.com',    'Lift2025#'],
    'recep@lift.com':     ['recep@gym.com',     'recep2025'],
    'recep2@lift.com':    ['recep2@gym.com',    'recep2025'],
    'trainer@lift.com':   ['trainer@gym.com',   'trainer2025'],
    'nutricion@lift.com': ['nutricion@gym.com', 'nutri2025'],
  };

  /* ══════════════════════════════════════════════════════
     HELPERS — HTTP
  ══════════════════════════════════════════════════════ */
  function getToken() { return sessionStorage.getItem(JWT_KEY); }
  function setToken(t) { sessionStorage.setItem(JWT_KEY, t); }
  function clearToken() { sessionStorage.removeItem(JWT_KEY); sessionStorage.removeItem(USR_KEY); }

  async function apiFetch(path, method = 'GET', body = null) {
    const token = getToken();
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'bypass-tunnel-reminder': 'true', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    };
    if (body !== null) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + path, opts);
    if (!res.ok) {
      let msg = 'Error ' + res.status;
      try { const e = await res.json(); msg = e.error || e.message || msg; } catch (_) {}
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  /* ══════════════════════════════════════════════════════
     MAPPERS — backend snake_case → frontend camelCase
  ══════════════════════════════════════════════════════ */
  function _mapUser(u) {
    if (!u) return u;
    return {
      id:           u.id,
      name:         u.name,
      email:        u.email,
      pass:         u.pass || '••••',     // nunca visible
      pin:          u.pin || '',
      phone:        u.phone || '',
      dni:          u.dni || '',
      nationality:  u.nationality || '',
      dob:          u.dob || '',
      address:      u.address || '',
      weight:       u.weight || 0,
      height:       u.height || 0,
      bloodType:    u.blood_type || '',
      medCoverage:  u.med_coverage || '',
      medClearance: !!u.med_clearance,
      plan:         u.plan || 'Bronce',
      payMethod:    u.pay_method || 'Efectivo',
      inscDate:     u.insc_date || '',
      lastPayment:  u.last_payment || '',
      status:       u.status || 'active',
      frozen:       !!u.frozen,
      debt:         u.debt || 0,
      photo:        u.photo || u.photo_url || '',
      // campos que el frontend espera aunque el backend no los guarda
      payHistory:   [],
      physicalHistory: [],
      routine:      null,
      // quotaStatus proviene del backend
      _quotaStatus: u.quotaStatus || null,
    };
  }

  function _mapAnn(a) {
    if (!a) return a;
    return {
      id:     a.id,
      title:  a.title,
      body:   a.content || a.body || '',
      date:   a.created_at ? a.created_at.slice(0, 10) : (a.date || ''),
      target: a.target || 'Todos',
      author: a.author_name || a.author || '',
    };
  }

  function _mapExp(e) {
    if (!e) return e;
    const cat = e.expense_categories || {};
    return {
      id:         e.id,
      date:       e.expense_date || '',
      categoryId: e.category_id,
      desc:       e.description || e.desc || '',
      amount:     e.amount || 0,
      // enriquecer con info de categoría si viene en el join
      _catName:   cat.name || '',
      _catIcon:   cat.icon || '',
      _catColor:  cat.color || '',
    };
  }

  function _mapClass(c) {
    if (!c) return c;
    return {
      id:          c.id,
      type:        c.type,
      trainer:     c.trainer,
      day:         c.day,
      time:        c.time,
      duration:    c.duration || 60,
      capacity:    c.capacity || 15,
      enrolled:    c.enrolled || [],
      waitlist:    c.waitlist || [],
      everEnrolled:c.ever_enrolled || [],
      openSlot:    null,
      active:      c.active !== false,
    };
  }

  function _mapMachine(m) {
    if (!m) return m;
    return {
      id:          m.id,
      name:        m.name,
      category:    m.category || '',
      description: m.description || '',
      usage:       m.usage_instructions || m.usage || '',
      videoUrl:    m.video_url || '',
      status:      m.status || 'active',
    };
  }

  function _mapPayment(p) {
    if (!p) return p;
    return {
      id:            p.id,
      userId:        p.user_id,
      userName:      p.user_name || '',
      amount:        p.amount || 0,
      brand:         p.brand || '—',
      bank:          p.bank || '—',
      cardType:      p.payment_method || p.card_type || 'Efectivo',
      last4:         p.last_4 || '—',
      installments:  p.installments || 1,
      status:        p.status || 'approved',
      transactionId: p.transaction_id || '',
      date:          p.payment_date || '',
      plan:          p.plan || '',
    };
  }

  function _mapStaff(s) {
    if (!s) return s;
    return {
      _id:   s.id,       // UUID interno — usado para DELETE/PUT
      email: s.email,
      pass:  s.pass || '••••',
      role:  s.role,
      name:  s.name,
      pin:   s.pin || '',
      active: s.active !== false,
    };
  }

  /* ══════════════════════════════════════════════════════
     SYNC — carga datos del backend en las variables globales
  ══════════════════════════════════════════════════════ */
  async function syncFromBackend() {
    console.log('[LIFT] Sincronizando datos desde el backend…');
    try {
      // Socios
      const membersRes = await apiFetch('/api/members?limit=200');
      users = (membersRes.data || []).map(_mapUser);

      // Anuncios
      const annRes = await apiFetch('/api/announcements');
      announcements = (annRes || []).map(_mapAnn);

      // Gastos (solo admin)
      if (currentUser && currentUser.role === 'admin') {
        const expRes = await apiFetch('/api/expenses');
        expenses = (expRes || []).map(_mapExp);
      }

      // Categorías de gastos
      try {
        const catRes = await apiFetch('/api/expenses/categories');
        if (catRes && catRes.length) {
          expenseCategories = catRes.map(c => ({
            id: c.id, name: c.name, icon: c.icon || '📦', color: c.color || '#95a5a6',
          }));
        }
      } catch (_) {}

      // Clases
      const classRes = await apiFetch('/api/classes');
      classes = (classRes || []).map(_mapClass);

      // Máquinas
      const machRes = await apiFetch('/api/machines');
      machines = (machRes || []).map(_mapMachine);

      // Pagos (admin/reception)
      if (currentUser && ['admin', 'reception'].includes(currentUser.role)) {
        try {
          const payRes = await apiFetch('/api/payments?limit=200');
          paymentsDB = (payRes.data || []).map(_mapPayment);
        } catch (_) {}
      }

      // Staff
      if (currentUser && ['admin', 'reception'].includes(currentUser.role)) {
        try {
          const staffRes = await apiFetch('/api/staff');
          staffAccounts = (staffRes || []).map(_mapStaff);
        } catch (_) {}
      }

      // Notificaciones personales del socio
      if (currentUser && currentUser.role === 'user') {
        try {
          const notifRes = await apiFetch('/api/notifications');
          const uid = currentUser.data?.id;
          if (uid !== undefined) {
            if (typeof userNotifications === 'undefined') window.userNotifications = {};
            userNotifications[uid] = (notifRes || []).map(n => ({
              id:      n.id,
              userId:  n.user_id,
              type:    n.notification_type || 'general',
              tipo:    n.notification_type || 'general',  // compat
              msg:     n.body   || n.title || '',
              titulo:  n.title  || '',
              mensaje: n.body   || '',
              fecha:   n.created_at ? n.created_at.slice(0, 10) : '',
              read:    !!n.read,
              leida:   !!n.read,
            }));
          }
        } catch (_) {}
      }

      // Historial de pagos del socio
      if (currentUser && currentUser.role === 'user') {
        try {
          const uid = currentUser.data?.id;
          if (uid !== undefined) {
            const myPayments = await apiFetch('/api/payments/user/' + uid);
            if (currentUser.data && Array.isArray(myPayments)) {
              currentUser.data.payHistory = myPayments.map(p => ({
                date:   p.payment_date || p.created_at?.slice(0, 10) || '',
                amount: p.amount || 0,
                method: p.payment_method || p.card_type || 'Efectivo',
                plan:   p.plan || '',
              }));
              // también actualizar en el array users
              const idx = users.findIndex(u => u.id === uid);
              if (idx >= 0) users[idx].payHistory = currentUser.data.payHistory;
            }
          }
        } catch (_) {}
      }

      // Mensajes del socio con el gimnasio
      if (currentUser && currentUser.role === 'user') {
        try {
          const uid = currentUser.data?.id;
          if (uid !== undefined) {
            const myId = String(uid);
            const msgsRes = await apiFetch('/api/messages/user/' + uid);
            if (typeof messages === 'undefined') window.messages = {};
            messages[uid] = (msgsRes || []).map(m => ({
              from: m.from_id === myId ? 'user' : 'admin',
              text: m.content || '',
              time: m.created_at
                ? new Date(m.created_at).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
                : '',
            }));
          }
        } catch (_) {}
      }

      // Access log de hoy (admin/reception — para el dashboard)
      if (currentUser && ['admin', 'reception'].includes(currentUser.role)) {
        try {
          const today = new Date().toISOString().slice(0, 10);
          const accessRes = await apiFetch('/api/access/log?date=' + today + '&limit=200');
          if (typeof accessLog !== 'undefined') {
            accessLog = (accessRes.data || []).map(l => ({
              id:          l.id,
              userId:      l.user_id,
              userName:    l.user_name || '',
              type:        l.access_type || 'entry',
              date:        l.log_date || today,
              time:        l.log_timestamp
                             ? new Date(l.log_timestamp).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
                             : '',
              exitTime:    null,
              duracionMin: null,
              allowed:     l.allowed !== false,
            }));
          }
        } catch (_) {}
      }

      // Audit log (admin/reception) — sincronizar desde backend
      if (currentUser && ['admin', 'reception'].includes(currentUser.role)) {
        try {
          const logRes = await apiFetch('/api/admin/log?limit=200');
          if (logRes && logRes.data) {
            const backendLogs = logRes.data.map(l => ({
              id:     l.id,
              user:   l.admin_email || 'Sistema',
              action: l.action || '',
              detail: l.details || '',
              date:   l.log_timestamp ? new Date(l.log_timestamp).toISOString().slice(0, 10) : '',
              time:   l.log_timestamp ? new Date(l.log_timestamp).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }) : '',
              log_timestamp: l.log_timestamp,
            }));
            if (typeof adminLog !== 'undefined') {
              // Combinar: agregar los del backend que no estén ya en adminLog local
              const existingIds = new Set(adminLog.map(l => l.id).filter(id => id > 1000000)); // IDs locales son timestamps grandes
              const newLogs = backendLogs.filter(l => !existingIds.has(l.id));
              adminLog = [...backendLogs, ...adminLog.filter(l => !l.log_timestamp)];
            }
            console.log('[LIFT] Audit log sincronizado:', logRes.total, 'registros');
          }
        } catch (e) {
          console.warn('[LIFT] No se pudo sincronizar audit log:', e.message);
        }
      }

      console.log('[LIFT] Sync OK —', users.length, 'socios,', classes.length, 'clases,', machines.length, 'máquinas');
    } catch (err) {
      console.warn('[LIFT] syncFromBackend error:', err.message);
    }
  }

  /* ══════════════════════════════════════════════════════
     AUTH — doLogin, pinPress, doLogout
  ══════════════════════════════════════════════════════ */
  window.doLogin = async function () {
    const em = document.getElementById('loginEmail')?.value?.trim();
    const pw = document.getElementById('loginPass')?.value?.trim();
    if (!em || !pw) { alert('Ingresá email y contraseña'); return; }

    try {
      const res = await apiFetch('/api/auth/login', 'POST', { email: em, password: pw, gym_slug: GYM_SLUG });
      setToken(res.token);
      sessionStorage.setItem(USR_KEY, JSON.stringify(res.user));

      const u = res.user;
      if (u.role === 'user') {
        // buscar datos completos del socio
        const member = await apiFetch('/api/members/' + u.id);
        currentUser = { role: 'user', name: u.name, email: u.email, data: _mapUser(member) };
      } else {
        currentUser = { role: u.role, name: u.name, email: u.email, id: u.id };
      }

      await syncFromBackend();
      startApp();
    } catch (err) {
      alert('Credenciales incorrectas: ' + err.message);
    }
  };

  window.pinPress = async function (k) {
    if (k === '⌫') {
      pinBuf = pinBuf.slice(0, -1);
    } else if (k === '✓') {
      if (pinBuf.length !== 4) { pinBuf = ''; }
      else {
        try {
          const res = await apiFetch('/api/auth/login/pin', 'POST', { pin: pinBuf, gym_slug: GYM_SLUG });
          setToken(res.token);
          sessionStorage.setItem(USR_KEY, JSON.stringify(res.user));

          const u = res.user;
          if (u.role === 'user') {
            const member = await apiFetch('/api/members/' + u.id);
            currentUser = { role: 'user', name: u.name, email: u.email, data: _mapUser(member) };
          } else {
            currentUser = { role: u.role, name: u.name, email: u.email, id: u.id };
          }
          closeModal();
          await syncFromBackend();
          startApp();
        } catch (_) {
          document.getElementById('pinMsg').textContent = 'PIN incorrecto';
          pinBuf = '';
        }
      }
    } else if (pinBuf.length < 4) {
      pinBuf += k;
    }
    const d = document.getElementById('pinDisplay');
    if (d) d.textContent = pinBuf ? '●'.repeat(pinBuf.length) : '—';
  };

  window.doLogout = function () {
    clearToken();
    currentUser = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  };

  /* ══════════════════════════════════════════════════════
     SOCIOS — saveNewUser, saveEdit, toggleFreeze
  ══════════════════════════════════════════════════════ */
  window.saveNewUser = async function () {
    const get = i => document.getElementById(i)?.value || '';
    if (!get('nName') || !get('nEmail')) { alert('Nombre y email obligatorios'); return; }

    const pin = get('nPin') || String(Math.floor(1000 + Math.random() * 9000));

    const payload = {
      name:         get('nName'),
      email:        get('nEmail'),
      password:     get('nPass') || '1234',
      pin,
      phone:        get('nPhone'),
      dni:          get('nDni'),
      nationality:  get('nNat') || 'El Salvador',
      dob:          get('nDob') || null,
      address:      get('nAddr'),
      weight:       +get('nWeight') || null,
      height:       +get('nHeight') || null,
      blood_type:   get('nBlood'),
      med_coverage: get('nMed'),
      med_clearance: get('nClear') === 'true',
      plan:         get('nPlan') || 'Bronce',
      pay_method:   get('nPay') || 'Efectivo',
      insc_date:    new Date().toISOString().slice(0, 10),
    };

    try {
      const newMember = await apiFetch('/api/members', 'POST', payload);
      users.push(_mapUser(newMember));
      closeModal();
      navigate('usuarios');
    } catch (err) {
      alert('Error al crear socio: ' + err.message);
    }
  };

  window.saveEdit = async function (id) {
    const get = i => document.getElementById(i)?.value || '';

    const payload = {
      name:         get('eName'),
      phone:        get('ePhone'),
      weight:       +get('eWeight') || null,
      height:       +get('eHeight') || null,
      med_coverage: get('eMed'),
      med_clearance: get('eClear') === 'true',
      plan:         get('ePlan'),
      pay_method:   get('ePay'),
      status:       get('eSt'),
      debt:         +get('eDebt') || 0,
    };

    try {
      const updated = await apiFetch('/api/members/' + id, 'PUT', payload);
      const idx = users.findIndex(u => u.id === id);
      if (idx >= 0) users[idx] = { ...users[idx], ..._mapUser(updated) };
      closeModal();
      navigate('usuarios');
    } catch (err) {
      alert('Error al editar socio: ' + err.message);
    }
  };

  window.toggleFreeze = async function (id) {
    const u = users.find(x => x.id === id);
    if (!u) return;
    const endpoint = u.frozen ? '/api/members/' + id + '/unfreeze' : '/api/members/' + id + '/freeze';
    try {
      await apiFetch(endpoint, 'POST');
      u.frozen = !u.frozen;
      u.status = u.frozen ? 'frozen' : 'inactive';
      navigate('congelados');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  /* ══════════════════════════════════════════════════════
     PAGOS — markPaid, finalizarCobro
  ══════════════════════════════════════════════════════ */
  async function _registrarPago(userId, amount, plan, method) {
    const payload = {
      user_id:        userId,
      amount:         amount,
      plan:           plan,
      payment_method: method,
      status:         'approved',
    };
    const payment = await apiFetch('/api/payments', 'POST', payload);
    // Actualizar en memoria
    const u = users.find(x => x.id === userId);
    if (u) {
      u.lastPayment = new Date().toISOString().slice(0, 10);
      u.status = 'active';
      u.debt = 0;
      u.plan = plan;
    }
    paymentsDB.unshift(_mapPayment(payment));
    return payment;
  }

  window.markPaid = async function (id) {
    const u = users.find(x => x.id === id);
    if (!u) return;
    try {
      await _registrarPago(id, (window.PLANS?.[u.plan]?.price) || 0, u.plan, u.payMethod || 'Efectivo');
      genNotifications();
      navigate('cuotas');
    } catch (err) {
      alert('Error al registrar pago: ' + err.message);
    }
  };

  window.finalizarCobro = async function (id) {
    const u = users.find(x => x.id === id);
    const plan   = document.getElementById('cPlan')?.value || u.plan;
    const monto  = +document.getElementById('cMonto')?.value || (window.PLANS?.[plan]?.price || 0);
    const metodo = document.getElementById('cMetodo')?.value || 'Efectivo';

    if (monto <= 0) { alert('El monto debe ser mayor a $0'); return; }

    try {
      await _registrarPago(id, monto, plan, metodo);
      closeModal();
      navigate('cobroDiario');
      setTimeout(() => {
        const r = document.getElementById('cobroResultados');
        if (r) r.innerHTML = '<div style="padding:12px;background:rgba(48,209,88,.08);border:1px solid rgba(48,209,88,.25);border-radius:2px;font-size:.82rem;color:var(--green)">✅ Cobro registrado — ' + u.name + ' · ' + plan + ' · $' + monto.toLocaleString() + ' · ' + metodo + '</div>';
      }, 100);
    } catch (err) {
      alert('Error al registrar cobro: ' + err.message);
    }
  };

  window.finalizarCobroValidado = window.finalizarCobro;

  /* ══════════════════════════════════════════════════════
     GASTOS — saveExpense, deleteExpense
  ══════════════════════════════════════════════════════ */
  window.saveExpense = async function () {
    if (currentUser?.role !== 'admin') { alert('Solo el administrador puede gestionar gastos'); return; }
    const get = i => document.getElementById(i)?.value || '';
    if (!get('expDesc') || !get('expAmt')) { alert('Completá los campos'); return; }

    const payload = {
      expense_date: get('expDate') || new Date().toISOString().slice(0, 10),
      category_id:  +get('expCat'),
      description:  get('expDesc'),
      amount:       +get('expAmt'),
    };

    try {
      const saved = await apiFetch('/api/expenses', 'POST', payload);
      expenses.unshift(_mapExp(saved));
      closeModal();
      navigate('finanzas');
    } catch (err) {
      alert('Error al guardar gasto: ' + err.message);
    }
  };

  window.deleteExpense = async function (id) {
    if (currentUser?.role !== 'admin') { alert('Solo el administrador puede eliminar gastos'); return; }
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await apiFetch('/api/expenses/' + id, 'DELETE');
      expenses = expenses.filter(e => e.id !== id);
      navigate('finanzas');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  /* ══════════════════════════════════════════════════════
     COMUNICADOS — saveAnnouncement, deleteAnnouncement
  ══════════════════════════════════════════════════════ */
  window.saveAnnouncement = async function () {
    const get = i => document.getElementById(i)?.value || '';
    if (!get('aTitle') || !get('aBody')) { alert('Completá los campos'); return; }

    const payload = {
      title:       get('aTitle'),
      content:     get('aBody'),
      target:      get('aTarget') || 'Todos',
      author_name: currentUser?.name || '',
    };

    try {
      const saved = await apiFetch('/api/announcements', 'POST', payload);
      announcements.unshift(_mapAnn(saved));
      closeModal();
      navigate('comunicados');
    } catch (err) {
      alert('Error al publicar comunicado: ' + err.message);
    }
  };

  window.deleteAnnouncement = async function (id) {
    if (!confirm('¿Eliminar comunicado?')) return;
    try {
      await apiFetch('/api/announcements/' + id, 'DELETE');
      announcements = announcements.filter(a => a.id !== id);
      navigate('comunicados');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  /* ══════════════════════════════════════════════════════
     CLASES — saveNewClass, deleteClass
  ══════════════════════════════════════════════════════ */
  window.saveNewClass = async function () {
    const get = i => document.getElementById(i)?.value || '';

    const payload = {
      type:     get('clType'),
      trainer:  get('clTrainer') || currentUser?.name || '—',
      day:      get('clDay'),
      time:     get('clTime'),
      duration: +get('clDur') || 60,
      capacity: +get('clCap') || 15,
    };

    try {
      const saved = await apiFetch('/api/classes', 'POST', payload);
      classes.push(_mapClass(saved));
      closeModal();
      navigate('agenda');
    } catch (err) {
      alert('Error al crear clase: ' + err.message);
    }
  };

  window.deleteClass = async function (id) {
    if (!confirm('¿Eliminar clase?')) return;
    try {
      await apiFetch('/api/classes/' + id, 'DELETE');
      classes = classes.filter(c => c.id !== id);
      navigate('agenda');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  /* ══════════════════════════════════════════════════════
     MÁQUINAS — saveNewMachine, deleteMachine
  ══════════════════════════════════════════════════════ */
  window.saveNewMachine = async function () {
    const get = i => document.getElementById(i)?.value || '';
    if (!get('mName')) { alert('Nombre requerido'); return; }

    const payload = {
      name:               get('mName'),
      category:           get('mCat'),
      description:        get('mDesc'),
      usage_instructions: get('mUsage'),
      video_url:          get('mVideo'),
    };

    try {
      const saved = await apiFetch('/api/machines', 'POST', payload);
      machines.push(_mapMachine(saved));
      closeModal();
      navigate('maquinas');
    } catch (err) {
      alert('Error al crear máquina: ' + err.message);
    }
  };

  window.deleteMachine = async function (id) {
    if (!confirm('¿Eliminar máquina?')) return;
    try {
      await apiFetch('/api/machines/' + id, 'DELETE');
      machines = machines.filter(m => m.id !== id);
      navigate('maquinas');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  /* ══════════════════════════════════════════════════════
     STAFF — saveStaff, removeStaff
  ══════════════════════════════════════════════════════ */
  window.saveStaff = async function () {
    const get = i => document.getElementById(i)?.value || '';
    if (!get('sName') || !get('sEmail') || !get('sPass')) { alert('Completá todos los campos'); return; }
    if (get('sPass').length < 6) { alert('La contraseña debe tener al menos 6 caracteres'); return; }
    if (staffAccounts.find(s => s.email === get('sEmail'))) { alert('Email ya registrado'); return; }

    const payload = {
      name:     get('sName'),
      email:    get('sEmail'),
      password: get('sPass'),
      role:     get('sRole') || 'reception',
    };

    try {
      const saved = await apiFetch('/api/staff', 'POST', payload);
      staffAccounts.push(_mapStaff(saved));
      closeModal();
      navigate('staff');
    } catch (err) {
      alert('Error al agregar staff: ' + err.message);
    }
  };

  window.removeStaff = async function (email) {
    if (!confirm('¿Eliminar miembro del staff?')) return;
    const s = staffAccounts.find(x => x.email === email);
    if (!s) return;
    try {
      if (s._id) await apiFetch('/api/staff/' + s._id, 'DELETE');
      staffAccounts = staffAccounts.filter(x => x.email !== email);
      navigate('staff');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  /* ══════════════════════════════════════════════════════
     CLASES — reserveClass, cancelReservation
  ══════════════════════════════════════════════════════ */
  window.reserveClass = async function (classId) {
    const c = classes.find(x => x.id === classId);
    const u = currentUser?.data;
    if (!c || !u) return;

    if (c.enrolled.includes(u.id)) { alert('Ya estás inscripto'); return; }
    if ((c.waitlist || []).includes(u.id)) { alert('Ya estás en la lista de espera'); return; }

    const uid = Number(u.id);

    if (c.enrolled.length >= c.capacity) {
      if (confirm('La clase ' + c.type + ' (' + c.day + ' ' + c.time + ') está llena.\n\n¿Querés anotarte en la lista de espera?')) {
        try {
          // El endpoint /enroll asigna status='waitlist' automáticamente cuando la clase está llena
          await apiFetch('/api/classes/' + classId + '/enroll', 'POST', { user_id: uid });
          if (!c.waitlist) c.waitlist = [];
          if (!c.waitlist.includes(uid)) c.waitlist.push(uid);
          if (!c.everEnrolled) c.everEnrolled = [];
          if (!c.everEnrolled.includes(uid)) c.everEnrolled.push(uid);
          navigate('misClases');
        } catch (err) { alert('Error: ' + err.message); }
      }
      return;
    }

    try {
      await apiFetch('/api/classes/' + classId + '/enroll', 'POST', { user_id: uid });
      if (!c.enrolled.includes(uid)) c.enrolled.push(uid);
      if (!c.everEnrolled) c.everEnrolled = [];
      if (!c.everEnrolled.includes(uid)) c.everEnrolled.push(uid);
      c.waitlist = (c.waitlist || []).filter(id => id !== uid);
      navigate('misClases');
    } catch (err) {
      alert('Error al reservar: ' + err.message);
    }
  };

  window.cancelReservation = async function (classId) {
    const c = classes.find(x => x.id === classId);
    const u = currentUser?.data;
    if (!c || !u) return;

    const mins = typeof minutesUntilClass === 'function' ? minutesUntilClass(c) : 999;
    if (mins < 60 && mins > 0) {
      alert('No podés cancelar.\n\nLa clase empieza en ' + Math.round(mins) + ' minutos.\nLas cancelaciones se permiten hasta 1 hora antes.');
      return;
    }
    if (!confirm('¿Confirmás que querés cancelar tu reserva en ' + c.type + ' (' + c.day + ' ' + c.time + ')?')) return;

    const uid = Number(u.id);
    try {
      await apiFetch('/api/classes/' + classId + '/enroll/' + uid, 'DELETE');
      c.enrolled = c.enrolled.filter(id => id !== uid);
      navigate('misClases');
    } catch (err) {
      alert('Error al cancelar: ' + err.message);
    }
  };

  /* ══════════════════════════════════════════════════════
     ACCESO — registrarEntrada
  ══════════════════════════════════════════════════════ */
  window.registrarEntrada = async function (userId) {
    const u = users.find(x => x.id === userId);
    if (!u) return;

    try {
      const entry = await apiFetch('/api/access/entry', 'POST', { user_id: userId });
      // también registrar localmente para la UI
      const now = new Date();
      const localEntry = {
        id:          entry.id || Date.now(),
        userId,
        userName:    u.name,
        type:        'entry',
        date:        now.toISOString().slice(0, 10),
        time:        now.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }),
        exitTime:    null,
        duracionMin: null,
        allowed:     true,
      };
      if (typeof accessLog !== 'undefined') accessLog.push(localEntry);
      return localEntry;
    } catch (err) {
      console.warn('[LIFT] registrarEntrada error:', err.message);
      // Fallback a modo local si el backend falla
      const now = new Date();
      const localEntry = {
        id:          Date.now(),
        userId,
        userName:    u.name,
        type:        'entry',
        date:        now.toISOString().slice(0, 10),
        time:        now.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }),
        exitTime:    null,
        duracionMin: null,
        allowed:     true,
      };
      if (typeof accessLog !== 'undefined') accessLog.push(localEntry);
      return localEntry;
    }
  };

  /* ══════════════════════════════════════════════════════
     PIN DE SOCIO — savePin
  ══════════════════════════════════════════════════════ */
  window.savePin = async function (id) {
    const pin = String(document.getElementById('newPin')?.value || '');
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { alert('El PIN debe ser exactamente 4 dígitos'); return; }
    if (users.find(u => u.id !== id && u.pin === pin)) { alert('Ese PIN ya lo usa otro socio'); return; }
    try {
      await apiFetch('/api/members/' + id, 'PUT', { pin });
      const u = users.find(x => x.id === id);
      if (u) u.pin = pin;
      closeModal();
      navigate('pinAcceso');
    } catch (err) {
      alert('Error al guardar PIN: ' + err.message);
    }
  };

  /* ══════════════════════════════════════════════════════
     BLOQUEAR / DESBLOQUEAR SOCIO — blockUser
  ══════════════════════════════════════════════════════ */
  window.blockUser = async function (id) {
    const u = users.find(x => x.id === id);
    if (!u) return;
    // getQuotaStatus usa campos del objeto u que ya tiene _quotaStatus del backend
    const isBlocked = (u._quotaStatus?.status || u.status) === 'blocked';
    const newStatus = isBlocked ? 'active' : 'blocked';
    const updates = isBlocked
      ? { status: 'active', last_payment: new Date().toISOString().slice(0, 10) }
      : { status: 'blocked' };
    try {
      await apiFetch('/api/members/' + id, 'PUT', updates);
      u.status = newStatus;
      if (isBlocked) u.lastPayment = new Date().toISOString().slice(0, 10);
      if (typeof renderAdminPanel === 'function') renderAdminPanel();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  /* ══════════════════════════════════════════════════════
     CLASES — leaveWaitlist, trainerCancelReservation
  ══════════════════════════════════════════════════════ */
  window.leaveWaitlist = async function (classId) {
    const c = classes.find(x => x.id === classId);
    const u = currentUser?.data;
    if (!c || !u) return;
    const uid = Number(u.id);
    try {
      await apiFetch('/api/classes/' + classId + '/enroll/' + uid, 'DELETE');
      c.waitlist = (c.waitlist || []).filter(id => id !== uid);
      navigate('misClases');
    } catch (err) {
      alert('Error al salir de la lista: ' + err.message);
    }
  };

  window.trainerCancelReservation = async function (classId, userId) {
    const c = classes.find(x => x.id === classId);
    if (!c) return;
    const uid = Number(userId);
    try {
      await apiFetch('/api/classes/' + classId + '/enroll/' + uid, 'DELETE');
      c.enrolled = c.enrolled.filter(id => id !== uid);
      c.waitlist  = (c.waitlist || []).filter(id => id !== uid);
      navigate('reservarClase');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  /* ══════════════════════════════════════════════════════
     MENSAJES — sendMsg
  ══════════════════════════════════════════════════════ */
  window.sendMsg = async function (uid) {
    const inp = document.getElementById('msgInput');
    if (!inp || !inp.value.trim()) return;
    const text    = inp.value.trim();
    const isUser  = currentUser?.role === 'user';
    const target  = users.find(x => x.id === Number(uid));
    const toName  = target?.name || '';

    // Actualizar UI local inmediatamente
    if (!messages[uid]) messages[uid] = [];
    const now = new Date();
    messages[uid].push({
      from: isUser ? 'user' : 'admin',
      text,
      time: now.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }),
    });
    inp.value = '';

    // Persistir en backend
    try {
      await apiFetch('/api/messages', 'POST', {
        to_id:   String(uid),
        to_name: toName,
        content: text,
      });
    } catch (err) {
      console.warn('[LIFT] sendMsg backend error:', err.message);
    }

    if (isUser) navigate('misMensajes'); else if (typeof openChat === 'function') openChat(uid);
  };

  /* ══════════════════════════════════════════════════════
     NOTIFICACIONES — markNotifRead, markAllNotifRead
  ══════════════════════════════════════════════════════ */
  window.markNotifRead = async function (userId, nid) {
    const list = (typeof userNotifications !== 'undefined' && userNotifications[userId]) || [];
    const n = list.find(x => x.id == nid);
    if (n) { n.read = true; n.leida = true; }
    try { await apiFetch('/api/notifications/' + nid + '/read', 'PUT'); } catch (_) {}
  };

  window.markAllNotifRead = async function (userId) {
    const list = (typeof userNotifications !== 'undefined' && userNotifications[userId]) || [];
    list.forEach(n => { n.read = true; n.leida = true; });
    if (currentUser?.role === 'user') {
      try { await apiFetch('/api/notifications/read-all/me', 'PUT'); } catch (_) {}
    }
  };

  /* ══════════════════════════════════════════════════════
     CHAT ADMIN — openChat (carga historial desde backend)
  ══════════════════════════════════════════════════════ */
  const _origOpenChat = typeof openChat === 'function' ? openChat : null;
  window.openChat = async function (uid) {
    // Cargar historial desde el backend antes de renderizar
    try {
      const myId = currentUser?.id || '';  // admin UUID
      const msgsRes = await apiFetch('/api/messages/user/' + uid);
      if (typeof messages === 'undefined') window.messages = {};
      messages[uid] = (msgsRes || []).map(m => ({
        from: m.from_id === String(myId) ? 'admin' : 'user',
        text: m.content || '',
        time: m.created_at
          ? new Date(m.created_at).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
          : '',
      }));
    } catch (err) {
      console.warn('[LIFT] openChat load error:', err.message);
    }
    if (_origOpenChat) _origOpenChat(uid);
  };

  /* ══════════════════════════════════════════════════════
     RESTORE SESSION — al recargar la página
  ══════════════════════════════════════════════════════ */
  async function tryRestoreSession() {
    const token = getToken();
    const savedUser = sessionStorage.getItem(USR_KEY);
    if (!token || !savedUser) return false;

    try {
      const u = JSON.parse(savedUser);
      // Verificar que el token sigue válido con un endpoint ligero
      const me = await apiFetch('/api/auth/me');

      if (u.role === 'user') {
        const member = await apiFetch('/api/members/' + u.id);
        currentUser = { role: 'user', name: u.name, email: u.email, data: _mapUser(member) };
      } else {
        currentUser = { role: u.role, name: u.name, email: u.email, id: u.id };
      }

      await syncFromBackend();
      startApp();
      return true;
    } catch (_) {
      clearToken();
      return false;
    }
  }

  /* ══════════════════════════════════════════════════════
     PATCH saveDB — deshabilitar localStorage para datos
     que ya viven en el backend (evitar out-of-sync)
  ══════════════════════════════════════════════════════ */
  const _origSaveDB = typeof saveDB === 'function' ? saveDB : null;
  window.saveDB = function () {
    // No persistir en localStorage — el backend es la fuente de verdad.
    // Solo guardamos estado UI no-crítico.
    try {
      localStorage.setItem('gp_adminLog',  JSON.stringify(typeof adminLog  !== 'undefined' ? adminLog  : []));
      localStorage.setItem('gp_cardDB',    JSON.stringify(typeof cardDatabase !== 'undefined' ? cardDatabase : []));
      localStorage.setItem('gp_discounts', JSON.stringify(typeof discounts !== 'undefined' ? discounts : []));
    } catch (_) {}
  };

  /* ══════════════════════════════════════════════════════
     RENDER LOG — override para usar apiFetch con JWT
  ══════════════════════════════════════════════════════ */
  window.renderLog = async function () {
    const q = (document.getElementById('logSearch') || {}).value || '';
    const el = document.getElementById('logContainer');
    if (!el) return;
    el.innerHTML = '<div style="color:var(--text3);padding:12px">Cargando historial del servidor…</div>';
    try {
      const logRes = await apiFetch('/api/admin/log?limit=200');
      const backendLogs = (logRes.data || []).map(l => ({
        id:     l.id,
        user:   l.admin_email || 'Sistema',
        action: l.action || '',
        detail: l.details || '',
        date:   l.log_timestamp ? new Date(l.log_timestamp).toISOString().slice(0, 10) : '',
        time:   l.log_timestamp ? new Date(l.log_timestamp).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }) : '',
        log_timestamp: l.log_timestamp,
      }));
      // Actualizar variable global adminLog
      if (typeof adminLog !== 'undefined') {
        adminLog = backendLogs;
      }
      let filtered = backendLogs;
      if (q) {
        filtered = backendLogs.filter(l =>
          l.action.toLowerCase().includes(q.toLowerCase()) ||
          l.user.toLowerCase().includes(q.toLowerCase()) ||
          l.detail.toLowerCase().includes(q.toLowerCase())
        );
      }
      if (filtered.length === 0) {
        el.innerHTML = '<div style="color:var(--text2);padding:12px;text-align:center">Sin registros de auditoría</div>';
      } else {
        el.innerHTML = filtered.slice(0, 100).map(l =>
          `<div class="logItem"><span style="width:22px;text-align:center">📝</span><div style="flex:1"><strong>${l.action}</strong> — ${l.detail}<div style="color:var(--text3);font-size:.68rem">${l.user} · ${l.date} ${l.time}</div></div></div>`
        ).join('');
      }
      console.log('[LIFT] Audit log renderizado:', filtered.length, 'registros');
    } catch (err) {
      console.error('[LIFT] renderLog error:', err.message);
      el.innerHTML = '<div style="color:var(--red);padding:10px;font-size:.8rem">Error al cargar historial: ' + err.message + '</div>';
    }
  };

  /* ══════════════════════════════════════════════════════
     DEMO CREDENTIALS — patch fillDemo para usar @gym.com
  ══════════════════════════════════════════════════════ */
  window.fillDemo = function (e, p) {
    const mapped = DEMO_CREDS[e];
    if (mapped) { e = mapped[0]; p = mapped[1]; }
    const emailEl = document.getElementById('loginEmail');
    const passEl  = document.getElementById('loginPass');
    if (emailEl) emailEl.value = e;
    if (passEl)  passEl.value  = p;
  };

  /* ══════════════════════════════════════════════════════
     INIT — correr al cargar el documento
  ══════════════════════════════════════════════════════ */
  function init() {
    console.log('[LIFT] api-layer.js cargado ✓');

    // Corregir el email Y contraseña pre-cargados en el formulario de login
    // (el HTML tiene value="admin@lift.com" / value="admin123" hardcodeados)
    const emailEl = document.getElementById('loginEmail');
    const passEl  = document.getElementById('loginPass');
    if (emailEl && DEMO_CREDS[emailEl.value]) {
      const [mappedEmail, mappedPass] = DEMO_CREDS[emailEl.value];
      emailEl.value = mappedEmail;
      if (passEl) passEl.value = mappedPass;
    }

    // Si hay sesión guardada, restaurarla directamente
    tryRestoreSession().then(restored => {
      if (!restored) {
        const loginScreen = document.getElementById('loginScreen');
        const app = document.getElementById('app');
        if (loginScreen) loginScreen.style.display = 'flex';
        if (app) app.style.display = 'none';
      }
    });
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
