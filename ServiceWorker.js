//https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
self.addEventListener("install", function(event) {
  event.waitUntil(caches.open("v1").then(function(cache){
    return cache.addAll([
      "./Default.css"
    ]);
  }));
});
self.addEventListener("fetch", function(event) {
  console.log("Version 1");

    event.respondWith(
      caches.open("v1")./*then(function(cache){
        return cache.addAll([event.request]);
      }).*/then(function(response) {
        // caches.match() always resolves
        // but in case of success response will have value
        if (response !== undefined) {
          return response;
        } else {
          return fetch(event.request).then(function (response) {
            // response may be used only once
            // we need to save clone to put one copy in cache
            // and serve second one
            let responseClone = response.clone();

            caches.open("v1").then(function (cache) {
              cache.put(event.request, responseClone);
            });
            return response;
          }).catch(function () {
            //return "File not found.";
          });
        }
      }));

});
