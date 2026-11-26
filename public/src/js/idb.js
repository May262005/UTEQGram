
'use strict';

var DB_NAME = 'uteqgram';
var DB_VERSION = 4;

function openDatabase() {
    return new Promise(function (resolve, reject) {
        var request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function (event) {
            var database = event.target.result;

            if (!database.objectStoreNames.contains('posts')) {
                database.createObjectStore('posts', {
                    keyPath: 'cacheKey'
                });
            }

            if (!database.objectStoreNames.contains('sync-posts')) {
                database.createObjectStore('sync-posts', {
                    keyPath: 'id'
                });
            }
        };

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}

async function getAllData(storeName) {
    var database = await openDatabase();

    return new Promise(function (resolve, reject) {
        var transaction = database.transaction(storeName, 'readonly');
        var request = transaction.objectStore(storeName).getAll();

        request.onsuccess = function () {
            resolve(request.result || []);
        };

        request.onerror = function () {
            reject(request.error);
        };

        transaction.oncomplete = function () {
            database.close();
        };

        transaction.onerror = function () {
            database.close();
            reject(transaction.error);
        };
    });
}

async function writeData(storeName, data) {
    var database = await openDatabase();

    return new Promise(function (resolve, reject) {
        var transaction = database.transaction(storeName, 'readwrite');

        transaction.objectStore(storeName).put(data);

        transaction.oncomplete = function () {
            database.close();
            resolve();
        };

        transaction.onerror = function () {
            database.close();
            reject(transaction.error);
        };

        transaction.onabort = function () {
            database.close();
            reject(transaction.error);
        };
    });
}

async function deleteItemFromData(storeName, id) {
    var database = await openDatabase();

    return new Promise(function (resolve, reject) {
        var transaction = database.transaction(storeName, 'readwrite');

        transaction.objectStore(storeName).delete(id);

        transaction.oncomplete = function () {
            database.close();
            resolve();
        };

        transaction.onerror = function () {
            database.close();
            reject(transaction.error);
        };

        transaction.onabort = function () {
            database.close();
            reject(transaction.error);
        };
    });
}
