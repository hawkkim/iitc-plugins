// ==UserScript==
// @author HawkBro
// @id plexts-virusbugfix
// @name IITC Plugin: Virus Log Bug Fix
// @category Info
// @version 0.0.1
// @namespace      https://github.com/hawkkim/iitc-plugins
// @updateURL      https://github.com/hawkkim/iitc-plugins/raw/main/plexts-virusbugfix/plexts-virusbugfix.user.js
// @downloadURL    https://github.com/hawkkim/iitc-plugins/raw/main/plexts-virusbugfix/plexts-virusbugfix.user.js
// @description 바이러스 로그가 있을때 지난 로그가 더 이상 불러와지지 않는 문제를 해결한 플러그인 입니다
// @include http://www.ingress.com/intel*
// @match http://www.ingress.com/intel*
// @include https://www.ingress.com/intel*
// @match https://www.ingress.com/intel*
// @include https://intel.ingress.com/*
// @match https://intel.ingress.com/*
// @grant none
// ==/UserScript==

function wrapper(plugin_info) {
    /**
     * 플러그인 기본코드 시작
     */
    if (typeof window.plugin !== 'function') window.plugin = function () {};
    plugin_info.buildName = 'hello';
    plugin_info.dateTimeVersion = '20150829103500';
    plugin_info.pluginId = 'hello';
    /**
     * 플러그인 기본코드 끝
     */

    /**
     * 진입 포인트
     */
    function setup() {
        window.chat.genPostData = function (channel, storageHash, getOlderMsgs) {
            console.log('OVERRIDED');

            if (typeof channel !== 'string') {
                throw new Error('API changed: isFaction flag now a channel string - all, faction, alerts');
            }

            var b = clampLatLngBounds(map.getBounds());

            // set a current bounding box if none set so far
            if (!chat._oldBBox) chat._oldBBox = b;

            // to avoid unnecessary chat refreshes, a small difference compared to the previous bounding box
            // is not considered different
            var CHAT_BOUNDINGBOX_SAME_FACTOR = 0.1;
            // if the old and new box contain each other, after expanding by the factor, don't reset chat
            if (!(b.pad(CHAT_BOUNDINGBOX_SAME_FACTOR).contains(chat._oldBBox) && chat._oldBBox.pad(CHAT_BOUNDINGBOX_SAME_FACTOR).contains(b))) {
                // log.log('Bounding Box changed, chat will be cleared (old: ' + chat._oldBBox.toBBoxString() + '; new: ' + b.toBBoxString() + ')');

                $('#chat > div').data('needsClearing', true);

                // need to reset these flags now because clearing will only occur
                // after the request is finished – i.e. there would be one almost
                // useless request.
                chat._faction.data = {};
                chat._faction.oldestTimestamp = -1;
                chat._faction.newestTimestamp = -1;

                chat._public.data = {};
                chat._public.oldestTimestamp = -1;
                chat._public.newestTimestamp = -1;

                chat._alerts.data = {};
                chat._alerts.oldestTimestamp = -1;
                chat._alerts.newestTimestamp = -1;

                chat._oldBBox = b;
            }

            var ne = b.getNorthEast();
            var sw = b.getSouthWest();
            var data = {
                //    desiredNumItems: isFaction ? CHAT_FACTION_ITEMS : CHAT_PUBLIC_ITEMS ,
                minLatE6: Math.round(sw.lat * 1e6),
                minLngE6: Math.round(sw.lng * 1e6),
                maxLatE6: Math.round(ne.lat * 1e6),
                maxLngE6: Math.round(ne.lng * 1e6),
                minTimestampMs: -1,
                maxTimestampMs: -1,
                tab: channel,
            };

            if (getOlderMsgs) {
                var data_arr = [];
                for (let i in storageHash.data) {
                    data_arr.push(storageHash.data[i]);
                }
                data_arr = data_arr.sort((a, b) => a[0] - b[0]);

                // ask for older chat when scrolling up
                data = $.extend(data, { maxTimestampMs: data_arr[0][0] == data_arr[30][0] ? storageHash.oldestTimestamp - 1 : storageHash.oldestTimestamp });
            } else {
                // ask for newer chat
                var min = storageHash.newestTimestamp;
                // the initial request will have both timestamp values set to -1,
                // thus we receive the newest desiredNumItems. After that, we will
                // only receive messages with a timestamp greater or equal to min
                // above.
                // After resuming from idle, there might be more new messages than
                // desiredNumItems. So on the first request, we are not really up to
                // date. We will eventually catch up, as long as there are less new
                // messages than desiredNumItems per each refresh cycle.
                // A proper solution would be to query until no more new results are
                // returned. Another way would be to set desiredNumItems to a very
                // large number so we really get all new messages since the last
                // request. Setting desiredNumItems to -1 does unfortunately not
                // work.
                // Currently this edge case is not handled. Let’s see if this is a
                // problem in crowded areas.
                $.extend(data, { minTimestampMs: min });
                // when requesting with an actual minimum timestamp, request oldest rather than newest first.
                // this matches the stock intel site, and ensures no gaps when continuing after an extended idle period
                if (min > -1) $.extend(data, { ascendingTimestampOrder: true });
            }
            return data;
        };
    }

    /**
     * 플러그인 기본코드 시작
     */
    setup.info = plugin_info;
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    if (window.iitcLoaded && typeof setup === 'function') setup();
}

// wrapper 함수를 스크립트 객체로 만들어서 DOM에 인젝션
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
    info.script = {
        version: GM_info.script.version,
        name: GM_info.script.name,
        description: GM_info.script.description,
    };
}
var textContent = document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ')');
script.appendChild(textContent);
(document.body || document.head || document.documentElement).appendChild(script);
