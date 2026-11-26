
'use strict';

var shareImagenButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector(
    '#close-create-post-modal-btn'
);
var sharedMomentsArea = document.querySelector('#shared-moments');
var createPostForm = document.querySelector('#create-post-form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');
var snackbarElement = document.querySelector('#snackbar');

var SUPABASE_URL = 'https://fsyacyouwkjroqlpfxkj.supabase.co';
var SUPABASE_KEY = 'sb_publishable_zuTM3kyK4Un5tzWjwhtBUA_reP9Uz2N';

var DEFAULT_IMAGE =
    'https://tse1.mm.bing.net/th/id/OIP.s11Dj-wI9Puap_MHaFgFFgHaE8?r=0&rs=1&pid=ImgDetMain&o=7&rm=3';

var isSyncing = false;
var snackbarTimeout;

function showSnackbar(message) {
    if (!snackbarElement) {
        console.log(message);
        return;
    }

    snackbarElement.textContent = message;
    snackbarElement.classList.add('show');

    clearTimeout(snackbarTimeout);

    snackbarTimeout = setTimeout(function () {
        snackbarElement.classList.remove('show');
    }, 4000);
}

function openCreatePostModal() {
    if (createPostArea) {
        createPostArea.style.transform = 'translateY(0)';
    }
}

function closeCreatePostModal() {
    if (createPostArea) {
        createPostArea.style.transform = 'translateY(100vh)';
    }
}

if (shareImagenButton) {
    shareImagenButton.addEventListener('click', openCreatePostModal);
}

if (closeCreatePostModalButton) {
    closeCreatePostModalButton.addEventListener(
        'click',
        closeCreatePostModal
    );
}

function createCard(post, pendingSync) {
    var cardWrapper = document.createElement('div');

    cardWrapper.className =
        'shared-moment-card mdl-card mdl-shadow--2dp';

    var cardTitle = document.createElement('div');
    cardTitle.className = 'mdl-card__title';

    cardTitle.style.backgroundImage =
        'url("' + (post.image || '/src/images/sf-boat.jpg') + '")';

    cardTitle.style.backgroundSize = 'cover';
    cardTitle.style.backgroundPosition = 'center';
    cardTitle.style.height = '180px';

    var title = document.createElement('h2');
    title.className = 'mdl-card__title-text';
    title.style.color = 'white';
    title.textContent = post.title || 'Sin título';

    cardTitle.appendChild(title);
    cardWrapper.appendChild(cardTitle);

    var supportingText = document.createElement('div');
    supportingText.className = 'mdl-card__supporting-text';

    supportingText.textContent =
        (post.location || 'Sin ubicación') +
        (pendingSync ? ' · Pendiente de sincronizar' : '');

    supportingText.style.textAlign = 'center';

    cardWrapper.appendChild(supportingText);

    if (typeof componentHandler !== 'undefined') {
        componentHandler.upgradeElement(cardWrapper);
    }

    return cardWrapper;
}

function updateUI(remotePosts, pendingPosts) {
    if (!sharedMomentsArea) {
        return;
    }

    sharedMomentsArea.innerHTML = '';

    remotePosts.forEach(function (item) {
        if (item.data) {
            sharedMomentsArea.appendChild(
                createCard(item.data, false)
            );
        }
    });

    pendingPosts.forEach(function (item) {
        sharedMomentsArea.appendChild(
            createCard(item, true)
        );
    });
}

async function savePendingPost(postData) {
    var pendingPost = {
        id: 'pending:' + Date.now() + ':' + Math.random(),
        title: postData.title,
        location: postData.location,
        image: postData.image,
        createdAt: new Date().toISOString()
    };

    await writeData('sync-posts', pendingPost);

    return pendingPost;
}

async function getRemotePosts() {
    var response = await fetch(
        SUPABASE_URL + '/rest/v1/posts?select=*',
        {
            method: 'GET',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: 'Bearer ' + SUPABASE_KEY,
                Accept: 'application/json'
            }
        }
    );

    if (!response.ok) {
        throw new Error(
            'Error al consultar Supabase: ' + response.status
        );
    }

    return await response.json();
}

async function cacheRemotePosts(remotePosts) {
    for (var i = 0; i < remotePosts.length; i++) {
        var post = remotePosts[i];

        await writeData('posts', {
            cacheKey: 'remote:' + post.id,
            data: post
        });
    }
}

async function syncPendingPosts() {
    if (!navigator.onLine || isSyncing) {
        return;
    }

    isSyncing = true;

    try {
        var pendingPosts = await getAllData('sync-posts');

        for (var i = 0; i < pendingPosts.length; i++) {
            var post = pendingPosts[i];

            try {
                var response = await fetch(
                    SUPABASE_URL + '/rest/v1/posts',
                    {
                        method: 'POST',
                        headers: {
                            apikey: SUPABASE_KEY,
                            Authorization: 'Bearer ' + SUPABASE_KEY,
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            Prefer: 'return=representation'
                        },
                        body: JSON.stringify({
                            title: post.title,
                            location: post.location,
                            image: post.image
                        })
                    }
                );

                if (!response.ok) {
                    var errorText = await response.text();

                    throw new Error(
                        'Supabase respondió ' +
                        response.status + ': ' + errorText
                    );
                }

                var savedPost = await response.json();

                if (!savedPost || !savedPost.length) {
                    throw new Error(
                        'Supabase no confirmó la publicación.'
                    );
                }

                await deleteItemFromData('sync-posts', post.id);

                await writeData('posts', {
                    cacheKey: 'remote:' + savedPost[0].id,
                    data: savedPost[0]
                });

                console.log(
                    '[Supabase] Publicación enviada correctamente:',
                    savedPost[0]
                );

                showSnackbar(
                    '¡Publicación sincronizada correctamente!'
                );

            } catch (error) {
                console.error(
                    '[Supabase] No se pudo sincronizar:',
                    error
                );

                showSnackbar(
                    'La publicación sigue pendiente. Se intentará enviar más tarde.'
                );
            }
        }

    } catch (error) {
        console.error(
            '[IndexedDB] Error al leer publicaciones pendientes:',
            error
        );

    } finally {
        isSyncing = false;

        await loadCards();
    }
}

async function loadCards() {
    if (!sharedMomentsArea) {
        return;
    }

    try {
        if (navigator.onLine) {
            try {
                var remotePosts = await getRemotePosts();

                await cacheRemotePosts(remotePosts);

            } catch (error) {
                console.warn(
                    '[Supabase] No se pudieron descargar los posts:',
                    error
                );
            }
        }

        var cachedPosts = await getAllData('posts');
        var pendingPosts = await getAllData('sync-posts');

        updateUI(cachedPosts, pendingPosts);

    } catch (error) {
        console.error(
            '[Feed] Error al cargar las publicaciones:',
            error
        );
    }
}

async function sendPost(title, location) {
    var postData = {
        title: title || 'Sin título',
        location: location || 'Sin ubicación',
        image: DEFAULT_IMAGE
    };

    try {
        await savePendingPost(postData);

        await loadCards();

        if (!navigator.onLine) {
            showSnackbar(
                'Publicación guardada. Estás sin conexión; se enviará cuando recuperes internet.'
            );

        } else {
            showSnackbar(
                'Publicación guardada. Enviando a Supabase...'
            );

            await syncPendingPosts();
        }

        closeCreatePostModal();

        if (createPostForm) {
            createPostForm.reset();
        }

    } catch (error) {
        console.error(
            '[Feed] No se pudo guardar la publicación:',
            error
        );

        showSnackbar(
            'No se pudo guardar la publicación en este dispositivo.'
        );
    }
}

if (createPostForm) {
    createPostForm.addEventListener('submit', function (event) {
        event.preventDefault();

        sendPost(
            titleInput ? titleInput.value.trim() : '',
            locationInput ? locationInput.value.trim() : ''
        );
    });
}

if (sharedMomentsArea) {
    loadCards();

    window.addEventListener('online', function () {
        showSnackbar(
            'Conexión recuperada. Sincronizando publicaciones...'
        );

        syncPendingPosts();
    });

    window.addEventListener('offline', function () {
        showSnackbar(
            'Estás sin conexión. Las publicaciones se guardarán localmente.'
        );
    });
}
