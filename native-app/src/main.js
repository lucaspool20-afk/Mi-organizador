import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const status = document.getElementById('notificationStatus');
const isNative = Capacitor.isNativePlatform();
let ready = false;
let syncing = false;

function show(message) {
  if (status) status.textContent = message;
}

async function prepareNotifications() {
  if (!isNative) {
    show('La aplicación no está ejecutándose como APK Android. Instalá la versión Android actualizada.');
    return;
  }
  show('Aplicación Android detectada. Comprobando permisos...');
  try {
    let permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      show('Solicitando permiso para mostrar notificaciones...');
      permission = await LocalNotifications.requestPermissions();
    }
    ready = permission.display === 'granted';
    if (!ready) {
      show('Permiso denegado. Activá Notificaciones en Ajustes > Aplicaciones > Mi Organizador.');
      return;
    }
    await LocalNotifications.createChannel({
      id: 'organizador-recordatorios',
      name: 'Recordatorios de tareas',
      description: 'Avisos de fecha y hora de Mi Organizador',
      importance: 5,
      visibility: 1,
    });
    show('Permiso concedido. Preparando avisos...');
    await syncNotifications();
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
      if (at.getTime() <= now) return;
      notifications.push({
        id: notificationId(task, index),
        title: 'Mi Organizador',
        body: task.text || 'Tenés una tarea pendiente.',
        schedule: { at, allowWhileIdle: true },
        channelId: 'organizador-recordatorios',
        smallIcon: 'ic_launcher',
      });
    });
    // Android no implementa cancelAll() en algunas versiones del plugin.
    // Cancelamos solamente los avisos que programó esta aplicación.
    const previousIds = JSON.parse(localStorage.getItem('organizadorNotificationIds') || '[]');
    if (previousIds.length) {
      await LocalNotifications.cancel({ notifications: previousIds.map(id => ({ id })) });
    }
    if (notifications.length) {
      await LocalNotifications.schedule({ notifications });
    }
    localStorage.setItem('organizadorNotificationIds', JSON.stringify(notifications.map(item => item.id)));
    show('Notificaciones activas. Avisos programados: ' + notifications.length + '.');
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
