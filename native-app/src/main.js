import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const status = document.createElement('p');
status.id = 'notificationStatus';
status.style.cssText = 'font-size:13px;color:#93c5fd;margin-top:8px;';
const formCard = document.querySelector('.card');
if (formCard) formCard.append(status);

let ready = false;
let syncing = false;

async function prepareNotifications() {
  if (!isNative) {
    status.textContent = 'Los avisos programados estarán disponibles en la aplicación Android.';
    return;
  }
  try {
    let permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') permission = await LocalNotifications.requestPermissions();
    ready = permission.display === 'granted';
    if (!ready) status.textContent = 'Activá los permisos de notificación de Android para recibir avisos.';
    else status.textContent = 'Notificaciones activas: avisaremos en la fecha y hora de cada tarea.';
    await LocalNotifications.createChannel({
      id: 'organizador-recordatorios',
      name: 'Recordatorios de tareas',
      description: 'Avisos de fecha y hora de Mi Organizador',
      importance: 5,
      visibility: 1,
      sound: 'default'
    });
    if (ready) await syncNotifications();
  } catch (error) {
    console.error('No se pudieron preparar las notificaciones', error);
    status.textContent = 'No pudimos activar las notificaciones. Revisá los permisos de la aplicación.';
  }
}

function notificationId(task, index) {
  // Identificador positivo y estable para la tarea mientras conserva su posición.
  return index + 1000;
}

async function syncNotifications() {
  if (!isNative || !ready || syncing) return;
  syncing = true;
  try {
    await LocalNotifications.cancelAll();
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
        extra: { taskText: task.text || '' }
      });
    });
    if (notifications.length) await LocalNotifications.schedule({ notifications });
    status.textContent = ready
      ? `Avisos programados: ${notifications.length} tarea(s) con fecha y hora.`
      : status.textContent;
  } catch (error) {
    console.error('Error programando avisos', error);
    status.textContent = 'No se pudieron programar algunos avisos.';
  } finally {
    syncing = false;
  }
}

function connectTaskChanges() {
  if (typeof window.save === 'function') {
    const originalSave = window.save;
    window.save = function (...args) {
      const result = originalSave.apply(this, args);
      syncNotifications();
      return result;
    };
  }
}

window.addEventListener('load', () => {
  connectTaskChanges();
  prepareNotifications();
});
