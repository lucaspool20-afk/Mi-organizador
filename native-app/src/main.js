import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const status = document.getElementById('notificationStatus');
const isNative = Capacitor.isNativePlatform();
const CHANNEL_ID = 'organizador-recordatorios-v2';
let ready = false;
let syncing = false;

function show(message) {
  if (status) status.textContent = message;
}

async function showDiagnostics(prefix = 'Diagnóstico') {
  try {
    const display = await LocalNotifications.checkPermissions();
    const exact = await LocalNotifications.checkExactNotificationSetting();
    const pending = await LocalNotifications.getPending();
    const delivered = await LocalNotifications.getDeliveredNotifications();
    show(`${prefix}: avisos=${pending.notifications.length}, entregados=${delivered.notifications.length}, permiso=${display.display}, alarmas exactas=${exact.exact_alarm}.`);
    return { pending, exact, display };
  } catch (error) {
    show('No se pudo consultar el diagnóstico: ' + (error?.message || String(error)));
    return null;
  }
}

function addTestButton() {
  if (!status || document.getElementById('testNotificationButton')) return;
  const button = document.createElement('button');
  button.id = 'testNotificationButton';
  button.type = 'button';
  button.textContent = 'Probar notificación en 15 segundos';
  button.style.cssText = 'display:block;width:100%;margin:8px 0;padding:12px;border:0;border-radius:8px;background:#15803d;color:white;font-weight:bold;';
  button.addEventListener('click', testNotificationNow);
  status.insertAdjacentElement('afterend', button);
}

async function testNotificationNow() {
  if (!ready) {
    show('Todavía no están listos los permisos de notificación.');
    return;
  }
  try {
    const at = new Date(Date.now() + 15000);
    const result = await LocalNotifications.schedule({
      notifications: [{
        id: 987654,
        title: 'Mi Organizador',
        body: 'Esta es una notificación de prueba.',
        schedule: { at, allowWhileIdle: true },
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher',
      }],
    });
    const pending = await LocalNotifications.getPending();
    show('Prueba programada. Resultado=' + result.notifications.length + ', pendientes=' + pending.notifications.length + '. Cerrá la app y esperá 15 segundos.');
  } catch (error) {
    show('Falló la prueba: ' + (error?.message || String(error)));
  }
}
window.testNotificationNow = testNotificationNow;

async function prepareNotifications() {
  if (!isNative) {
    show('La aplicación no se está ejecutando como APK Android. Instalá la versión Android actualizada.');
    return;
  }
  addTestButton();
  show('Android detectado. Comprobando permisos...');
  try {
    let permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      show('Solicitando permiso para mostrar notificaciones...');
      permission = await LocalNotifications.requestPermissions();
    }
    ready = permission.display === 'granted';
    if (!ready) {
      show('Permiso de notificaciones denegado. Activá Notificaciones en Ajustes > Aplicaciones > Mi Organizador.');
      return;
    }

    const exact = await LocalNotifications.checkExactNotificationSetting();
    if (exact.exact_alarm !== 'granted') {
      show('Falta permiso de alarmas exactas. Abriendo el ajuste de Android...');
      await LocalNotifications.changeExactNotificationSetting();
      show('Activá Alarmas y recordatorios y volvé a abrir Mi Organizador.');
      return;
    }

    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Recordatorios de tareas',
      description: 'Avisos de fecha y hora de Mi Organizador',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
    await syncNotifications();
    await showDiagnostics('Listo');
  } catch (error) {
    console.error('Error al iniciar notificaciones:', error);
    show('Error al iniciar notificaciones: ' + (error?.message || String(error)));
  }
}

function notificationId(task, index) {
  return 1000 + index;
}

async function syncNotifications() {
  if (!isNative || !ready || syncing) return;
  syncing = true;
  try {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const now = Date.now();
    const notifications = [];
    tasks.forEach((task, index) => {
      if (task.done || !task.date || !task.time) return;
      const [year, month, day] = task.date.split('-').map(Number);
      const [hour, minute] = task.time.split(':').map(Number);
      const at = new Date(year, month - 1, day, hour, minute, 0, 0);
      if (Number.isNaN(at.getTime()) || at.getTime() <= now) return;
      notifications.push({
        id: notificationId(task, index),
        title: 'Mi Organizador',
        body: task.text || 'Tenés una tarea pendiente.',
        schedule: { at, allowWhileIdle: true },
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher',
      });
    });

    const previousIds = JSON.parse(localStorage.getItem('organizadorNotificationIds') || '[]');
    if (previousIds.length) {
      await LocalNotifications.cancel({ notifications: previousIds.map(id => ({ id })) });
    }
    if (notifications.length) {
      const scheduled = await LocalNotifications.schedule({ notifications });
      if (scheduled.notifications.length !== notifications.length) {
        throw new Error('Android no confirmó todos los avisos solicitados.');
      }
    }
    localStorage.setItem('organizadorNotificationIds', JSON.stringify(notifications.map(item => item.id)));
    const pending = await LocalNotifications.getPending();
    show('Avisos solicitados: ' + notifications.length + '. Avisos pendientes confirmados por Android: ' + pending.notifications.length + '.');
  } catch (error) {
    console.error('Error programando avisos:', error);
    show('Error al programar avisos: ' + (error?.message || String(error)));
  } finally {
    syncing = false;
  }
}

function connectTaskChanges() {
  if (typeof window.save !== 'function') {
    show('Android detectado, pero no se encontró la función de guardado de tareas.');
    return;
  }
  const originalSave = window.save;
  window.save = function (...args) {
    const result = originalSave.apply(this, args);
    syncNotifications();
    return result;
  };
}

connectTaskChanges();
prepareNotifications();
