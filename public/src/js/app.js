
'use strict';

console.log('[PWA] app.js cargado correctamente.');

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async function () {
        try {
            console.log('[Service Worker] Iniciando registro...');

            var registration = await navigator.serviceWorker.register('/sw.js');

            console.log(
                '[Service Worker] Registrado:',
                registration.scope
            );

            if (registration.installing) {
                console.log('[Service Worker] Instalando...');

                registration.installing.addEventListener('statechange', function (event) {
                    console.log(
                        '[Service Worker] Estado:',
                        event.target.state
                    );
                });
            }

            if (registration.waiting) {
                console.log('[Service Worker] Esperando activación...');
            }

            if (registration.active) {
                console.log('[Service Worker] Activo correctamente.');
            }

            await navigator.serviceWorker.ready;

            console.log('[Service Worker] Activo correctamente.');

        } catch (error) {
            console.error(
                '[Service Worker] Error al registrar:',
                error
            );
        }
    });

} else {
    console.error(
        '[Service Worker] Este navegador no soporta Service Workers.'
    );
}

var deferredPrompt;
var installButtons = document.querySelectorAll('.install-app-button');

window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();

    deferredPrompt = event;

    installButtons.forEach(function (button) {
        button.hidden = false;
    });
});

installButtons.forEach(function (button) {
    button.addEventListener('click', async function () {
        if (!deferredPrompt) {
            console.warn('[PWA] La instalación no está disponible.');
            return;
        }

        deferredPrompt.prompt();

        var choiceResult = await deferredPrompt.userChoice;

        console.log(
            '[PWA] Resultado de instalación:',
            choiceResult.outcome
        );

        deferredPrompt = null;

        installButtons.forEach(function (installButton) {
            installButton.hidden = true;
        });
    });
});
