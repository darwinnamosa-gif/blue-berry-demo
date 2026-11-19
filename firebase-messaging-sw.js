/* =====================================================================
   Blue Berry — service worker FCM (phase 2, 2026-11-19)
   ---------------------------------------------------------------------
   Notification « commande prête » même page fermée (push FCM web).

   Ce fichier est servi à côté des pages :
     https://darwinnamosa-gif.github.io/blue-berry-demo/firebase-messaging-sw.js
   La page commande l'enregistre avec le scope './' (= /blue-berry-demo/),
   car le site est un site de projet GitHub Pages sous un sous-chemin —
   le chemin par défaut de FCM (/firebase-messaging-sw.js à la racine)
   n'existe pas ici ; l'enregistrement personnalisé est donc passé à
   getToken() via serviceWorkerRegistration (voir phase2PushHook dans
   blueberry-order.html).

   Rôle : UNIQUEMENT afficher la notification push quand la page est
   fermée ou en arrière-plan, et rouvrir/focaliser la page commande au
   clic. Page visible au premier plan : FCM ne passe pas par ici
   (onMessage côté page, non utilisé — la phase 1 affiche sa bannière).

   Expéditeur : Cloud Function Firebase (functions/index.js) — elle
   envoie { notification: {title, body}, data: {orderId},
   webpush: { fcmOptions: { link } } } quand le statut d'une commande
   passe à « ready ». Le tag 'bb-ready-<orderId>' est le MÊME que celui
   de la notification système de la phase 1 : si les deux chemins
   tirent (onglet ouvert en arrière-plan), le navigateur n'en montre
   qu'une (même tag = remplacement, pas de doublon).

   La config ci-dessous est la config web publique du projet
   thon-3s-orders (la même que dans les pages — clé cliente publique
   par conception, restreinte par referer dans Google Cloud).
   ===================================================================== */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDz8e2BUfNhCl3e_E449nMtZsYA47TDFKg',
  authDomain: 'thon-3s-orders.firebaseapp.com',
  databaseURL: 'https://thon-3s-orders-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'thon-3s-orders',
  storageBucket: 'thon-3s-orders.firebasestorage.app',
  messagingSenderId: '60533964819',
  appId: '1:60533964819:web:5e5f8fced88484f55cbfe6'
});

var messaging = firebase.messaging();
var ORDER_PAGE = 'blueberry-order.html';

function orderPageUrl() {
  return new URL(ORDER_PAGE, self.registration.scope).href;
}

/* Page fermée ou en arrière-plan : afficher la notification du push. */
messaging.onBackgroundMessage(function (payload) {
  var n = (payload && payload.notification) || {};
  var d = (payload && payload.data) || {};
  var title = n.title || 'Blue Berry — Commande prête !';
  var body = n.body || 'Votre commande est prête.';
  var link = (payload && payload.fcmOptions && payload.fcmOptions.link) || d.link || orderPageUrl();
  var tag = 'bb-ready' + (d.orderId ? '-' + d.orderId : '');
  self.registration.showNotification(title, {
    body: body,
    tag: tag,
    data: { url: link }
  });
});

/* Clic : focaliser la page commande si elle est déjà ouverte (le cas
   courant — le client a commandé depuis cet onglet), sinon l'ouvrir. */
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || orderPageUrl();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf(ORDER_PAGE) !== -1 && 'focus' in list[i]) {
          return list[i].focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
