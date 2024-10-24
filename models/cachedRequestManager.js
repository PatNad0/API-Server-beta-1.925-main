
import * as utilities from "../utilities.js";
import * as serverVariables from "../serverVariables.js";
import * as httpContext from "../httpContext.js";
import RepositoryCachesManager from "./repositoryCachesManager.js";
import Repository from "./repository.js";
let repositoryCachesExpirationTime = serverVariables.get(
  "main.repository.CacheExpirationTime"
);

global.RequestCaches = [];
global.cachedRequestCleanerStarted = false;

export default class  CachedRequestManager {
    static startCachedRequestsCleaner(){
        setInterval(CachedRequestManager.flushExpired, repositoryCachesExpirationTime * 1000);
        console.log(
          BgWhite + FgBlue,
          "[Periodic cached URL data caches cleaning process started...]"
        );
    }
    static add(url, data, ETag){
      
        if (!cachedRequestCleanerStarted) {
            cachedRequestCleanerStarted = true;
            CachedRequestManager.startCachedRequestsCleaner();
        }
        if (url != "") {
            CachedRequestManager.clear(url);
            RequestCaches.push({
                url,
                data,
                ETag,
                Expire_Time: utilities.nowInSeconds() + repositoryCachesExpirationTime
            });
            console.log(
              BgWhite + FgGreen,
              `[Data of URL ${url} request has been cached]`
            );
        }
    }
    static clear(url){
        if (url != "") {
            let indexToDelete = [];
            let index = 0;
            for (let cache of RequestCaches) {
              if (cache.url == url) indexToDelete.push(index);
              index++;
            }
            utilities.deleteByIndex(RequestCaches, indexToDelete);
        }
    }
    static find(url){
        try {
            if (url != "") {
                for (let cache of RequestCaches) {
                  if (cache.url == url) {
                    cache.Expire_Time =
                      utilities.nowInSeconds() + repositoryCachesExpirationTime;
                    console.log(
                      BgWhite + FgGreen,
                      `[${cache.url} data retrieved from URL cache]`
                    );
                    return cache;
                  }
                }
            }
        } catch (error) {
            console.log(BgWhite + FgGreen, "[request URL cache error!]", error);
        }
        return null;
    }
    static flushExpired(){
        let now = utilities.nowInSeconds();
        for (let cache of RequestCaches) {
          if (cache.Expire_Time <= now) {
            CachedRequestManager.clear(cache.url);
            console.log(
              BgWhite + FgGreen,
              "Cached file data of URL " + cache.url + ".json expired"
            );
          }
        }
        RequestCaches = RequestCaches.filter(
          (cache) => cache.Expire_Time > now
        );
    }
    static get(HttpContext){
        let url = HttpContext.req.url;
        let cache = CachedRequestManager.find(url);
        if(cache){
          let ETag = Repository.getETag(HttpContext.path.model);
          if (cache.ETag == ETag) {
            HttpContext.response.JSON(cache.data, cache.Etag, true);
            return true;
          }
          else{
            CachedRequestManager.clear(url);
          }
        }
    return false;
    }
    
}