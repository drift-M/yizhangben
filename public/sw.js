/**
 * 衣账本 Service Worker
 *
 * 提供离线访问能力，缓存静态资源并在网络不可用时返回缓存内容。
 *
 * 缓存策略：
 * - 导航请求（HTML）：Network First，回退到缓存
 * - 静态资源（JS/CSS/图片/字体）：Cache First，回退到网络
 * - API 请求：仅网络，不缓存
 *
 * 缓存版本：更新此常量以触发旧缓存清理。
 */

var CACHE_VERSION = 'ylb-v2';
var STATIC_CACHE = 'static-' + CACHE_VERSION;
var DYNAMIC_CACHE = 'dynamic-' + CACHE_VERSION;

/**
 * 安装事件：清理旧版本缓存
 */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function () {
      return self.skipWaiting();
    })
  );
});

/**
 * 激活事件：删除非当前版本的缓存
 */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key !== STATIC_CACHE && key !== DYNAMIC_CACHE;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/**
 * 判断请求是否为静态资源
 */
function isStaticAsset(url) {
  var pathname = url.pathname;
  return (
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.json')
  );
}

/**
 * Fetch 事件：根据请求类型应用不同缓存策略
 */
self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url;

  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  // 仅处理同源请求
  if (url.origin !== self.location.origin) return;

  // 不缓存 API 请求和非 GET 请求
  if (request.method !== 'GET') return;

  // 导航请求：Stale-While-Revalidate
  // 有缓存时立即返回缓存（重复打开秒开），同时在后台拉取新版本更新缓存；
  // 无缓存时等待网络，网络失败再回退到缓存。
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(function (cache) {
        return cache.match(request).then(function (cached) {
          var networkUpdate = fetch(request)
            .then(function (response) {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(function () {
              return null;
            });

          if (cached) return cached;

          return networkUpdate.then(function (response) {
            // 网络失败且无缓存时回退到应用根路径缓存（兼容子路径部署）
            if (response) return response;
            return cache.match(self.registration.scope).then(function (fallback) {
              return fallback || Response.error();
            });
          });
        });
      })
    );
    return;
  }

  // 静态资源：Cache First
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(function (cached) {
        if (cached) return cached;

        return fetch(request).then(function (response) {
          // 仅缓存成功的响应
          if (response.ok) {
            var clone = response.clone();
            caches.open(STATIC_CACHE).then(function (cache) {
              cache.put(request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // 其他请求：Network Only
  event.respondWith(fetch(request));
});
