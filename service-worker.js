self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open("fev-cache-v1").then((cache) => {
            return cache.addAll([
                "/pwa/offline.html",
                "/icons/offline.svg",
                "https://fonts.googleapis.com/css2?family=Dosis:wght@200..800&display=swap",
                "https://fonts.gstatic.com/s/dosis/v32/HhyaU5sn9vOmLzlmC_W6EQ.woff2",
                "https://fonts.gstatic.com/s/dosis/v32/HhyaU5sn9vOmLzlnC_W6EQ.woff2",
                "https://fonts.gstatic.com/s/dosis/v32/HhyaU5sn9vOmLzloC_U.woff2"
            ]);
        })
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        }).catch(() => {
            return caches.match("/pwa/offline.html");
        })
    );
});
