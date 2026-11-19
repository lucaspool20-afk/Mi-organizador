# Mi Organizador — Android con notificaciones locales

Esta carpeta es una copia de trabajo nativa; no modifica la web publicada en la raíz del repositorio.

## Compilación
1. `npm install`
2. `npm run build`
3. `npx cap add android`
4. Agregar en `android/app/src/main/AndroidManifest.xml`, antes de `<application>`:
   `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />`
   `<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />`
5. `npx cap sync android`
6. Abrir `android/` en Android Studio y compilar.

## Identidad y firma
El `appId` configurado es provisional (`com.lucas.organizador`). Para actualizar la APK instalada hay que reemplazarlo por el Package ID exacto de la versión anterior y firmar con la misma keystore. No instalar sobre la app anterior hasta verificar ambas cosas.

## Comportamiento
La app programa notificaciones locales en el dispositivo para tareas pendientes que tengan fecha y hora. Al guardar cambios, reconstruye los avisos pendientes. Las tareas completadas o eliminadas dejan de tener aviso. Android puede requerir permisos de notificaciones y de alarmas exactas.
