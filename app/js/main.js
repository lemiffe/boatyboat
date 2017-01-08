var apiUrl = location.protocol.concat("//") + 'localhost:1337';
if (window.location.hostname !== 'localhost') {
    var http = location.protocol;
    var slashes = http.concat("//");
    apiUrl = 'api.' + slashes.concat(window.location.hostname);
}
var requiredImages = [
    '../images/canoe.svg',
    '../images/island.svg',
    '../images/hook.svg',
    '../images/clouds.png'
];
var lastSearchString = '';
var searchStartTime = 0;
var BETWEENWAVE_CONTAINER = '.betweenwaves';
var HOOK_EXIT_TIME = 1500;
var EXIT_TIME = 1500;
var ENTER_SLOW_TIME = 2200;
var ENTER_TIME = 2000;
var STATUS_NOT_FOUND = 'not found';

$(document).ready(function() {
    var searchEl = $('#search');
    searchEl.focus().select().keyup($.debounce(600, handleInput));

    // Pre-load assets (disable search until they load)
    displayLoading();
    searchEl.prop('disabled', true);
    preloadPictures(requiredImages, function(){
        hideLoading();
        searchEl.prop('disabled', false);

        // Todo: Handle hashes in URL (to search for a pre-defined company on load)
        displayIsland();
    });

});

function handleInput(e) {
    // Gather parameters needed for search
    var companyName = $('#search').val();

    // Check if we can skip
    if (companyName.trim() === '' && lastSearchString.trim() !== companyName.trim()) {
        // New text = empty, return to the island!
        killHook(false); // Kill slowly
        hideLoading(); // Just in case
        killBoats();
        displayIsland();
        return;

    } else if (companyName.trim() === '') {
        // Nothing was passed in
        console.log('skipping due to blank');
        return;

    } else if (companyName.length < 2) {
        console.log('skipping due to length');
        return;

    } else if (e.keyCode === 91 && lastSearchString.trim() === companyName.trim()) {
        // Tab was pressed and search string is still the same
        console.log('skipping due to tab & same text');
        return;

    } else if (e.keyCode !== 13 && lastSearchString.trim() === companyName.trim()) {
        // Skip if not enter and text is the same
        console.log('skipping due to non-enter & same text');
        return;
    }

    startSearch(companyName);
}

function startSearch(companyName) {
    // Search
    var searchUrl = apiUrl + '/search/' + encodeURIComponent(companyName);
    lastSearchString = companyName;
    searchStartTime = new Date().getTime();

    displayHook();
    $.ajax({
        url: searchUrl,
        dataType: 'json',
        data: null,
        success: searchSuccess,
        error: searchError
    });

    // Todo: If search is taking too long (just do a setTimeout that checks searchStartTime), then show 'slow loading'
}

function searchSuccess(httpResult) {
    killHook(false); // Kill slowly
    hideLoading(); // Just in case

    // We got a response, but we couldn't find a company with that name/domain
    if (httpResult && httpResult.status === STATUS_NOT_FOUND) {
        // Todo: Initiate construction of new company!
        killBoats();
        displayIsland(); // will be something different
        return;
    }

    // We didn't get a response, or we got one but with count 0 (server has gone mad?)
    if (!httpResult || httpResult.count === 0) {
        searchError({status: 500});
    }

    // We got a response with items!
    var results = httpResult.results;
    killIsland();
    killBoats();
    console.log(results);
    if (httpResult.count === 1) {
        // Render single item
        var item = results[0];
        var renderFlag = item.gd_ceo && item.gd_ceo.image && item.gd_ceo.image.src;
        var boatContainerId = displayBoat('canoe', 'sea', renderFlag);
        if (renderFlag) {
            displayFlag(item.gd_ceo.image.src, boatContainerId, 200, 200);
        }

    } else {
        // Render item + show arrows for slider
        var item = results[0];
        var renderFlag = item.gd_ceo && item.gd_ceo.image && item.gd_ceo.image.src;
        var boatContainerId = displayBoat('canoe', 'sea', renderFlag);
        if (renderFlag) {
            displayFlag(item.gd_ceo.image.src, boatContainerId, 200, 200);
        }

        // Todo: Arrows + more boats :P
    }
}

function searchError(x) {
    var killFast = false;
    var searchEndTime = new Date().getTime();
    if (searchEndTime - searchStartTime < 100) {
        killFast = true;
    }
    killHook(killFast);
    hideLoading(); // Just in case
    console.log(x);
    var companyNotFound = (x.status === 404);
    var serverError = (x.status >= 500 || x.status === 0);
    var badInput = (x.status === 400);
    // Todo: Handle errors! (maybe new SVG?)
}

function displayHook() {
    var container = $(BETWEENWAVE_CONTAINER);
    var existingItems = container.children('.bc-search');
    if (existingItems.length === 0) {
        // No current search in progress, pre-pend hook to container
        var html = '<div class="bc-search boatcontainer enter">';
        html += '<div class="hook bobbler3"><img src="images/hook.svg" /></div>';
        html += '</div>';
        container.prepend(html);
    } else {
        // If bc-search already exists (e.g. another search in progress)? remove hookexit/enter classes (keep it there!)
        container.children('.bc-search').first().removeClass('hookexit').removeClass('enter');
    }
}

function killHook(killFast) {
    var container = $(BETWEENWAVE_CONTAINER);
    var existingItems = container.children('.bc-search');
    if (killFast) {
        $('.bc-search').remove();
    } else {
        if (existingItems.length > 0) {
            existingItems.first().removeClass('enter').addClass('hookexit');
            setTimeout(function() {
                $('.bc-search').remove();
            }, HOOK_EXIT_TIME);
        }
    }
}

function displayBoat(type, level, renderFlag) {
    var container = $(BETWEENWAVE_CONTAINER);
    var boatContainerId = 'boat-' + Date.now() + String.fromCharCode(65 + Math.floor(Math.random() * 26));
    var html = '<div class="bc-boat boatcontainer enter-slow" id="' + boatContainerId + '">';
    html += '<div class="boat bobbler3 size-' + type + ' level-' + level + '">';
    if (renderFlag) {
        html += '<div class="flagcontainer"><canvas class="flag"></canvas></div>';
    }
    html += '<img src="images/' + type + '.svg" /></div>';
    html += '</div>';
    container.prepend(html);
    // Remove enter animation class after 2 seconds (to avoid re-rendering by mistake)
    setTimeout(function() {
        container.children('.bc-boat').removeClass('enter-slow');
    }, ENTER_SLOW_TIME);
    return boatContainerId;
}

function killBoats() {
    $('.bc-boat:visible').removeClass('enter-low').addClass('exit');
    setTimeout(function() {
        $('.bc-boat.exit').remove();
    }, EXIT_TIME + 150);
}

function displayIsland() {
    var container = $(BETWEENWAVE_CONTAINER);
    var existingItems = container.children('.bc-island');
    if (existingItems.length === 0) {
        // No boats on screen, enter a new boat
        var html = '<div class="bc-island boatcontainer enter-low">';
        html += '<div class="island level-sea"><img src="images/island.svg" /></div>';
        html += '</div>';
        container.prepend(html);
        // Remove enter animation class after 2 seconds (to avoid re-rendering by mistake)
        setTimeout(function() {
            container.children('.bc-island').removeClass('enter-low');
        }, ENTER_SLOW_TIME);
    } else {
        // If bc-island already exists, make sure it is visible
        var island = container.children('.bc-island').first();
        if (island && island.hasClass('exit') || !island.is(":visible")) {
            // Only make it 'enter' again if not already visible (or if it was exiting)
            island.removeClass('exit').addClass('enter-low');
        }
    }
}

function killIsland() {
    var container = $(BETWEENWAVE_CONTAINER);
    var existingItems = container.children('.bc-island');
    if (existingItems.length > 0) {
        existingItems.first().removeClass('enter-low').addClass('exit');
        setTimeout(function() {
            $('.bc-island').last().remove();
        }, EXIT_TIME);
    }
}

function displayLoading() {
    $('.loadingcontainer').fadeTo(1200, 0.2);
}

function hideLoading() {
    $('.loadingcontainer').fadeOut('fast');
}

var preloadPictures = function(pictureUrls, callback) {
    var i,
        j,
        loaded = 0;

    for (i = 0, j = pictureUrls.length; i < j; i++) {
        (function (img, src) {
            img.onload = function () {
                if (++loaded == pictureUrls.length && callback) {
                    callback();
                }
            };

            // Use the following callback methods to debug
            // in case of an unexpected behavior.
            img.onerror = function () {};
            img.onabort = function () {};

            img.src = src;
        } (new Image(), pictureUrls[i]));
    }
};

function displayFlag(url, boatContainerId, width, height) {
    function show_image(src, width, height, boatContainerId) {
        var img = document.createElement("img");
        img.src = src;
        img.width = width;
        img.height = height;
        img.style = 'display: none;';
        img.id = 'faceimg-' + boatContainerId;
        document.getElementById(boatContainerId).appendChild(img);
    }

    show_image(url, width, height, boatContainerId);

    var faceImg = document.querySelector('#' + boatContainerId + ' #faceimg-' + boatContainerId);
    if (faceImg) {
        var canvas = document.querySelector('#' + boatContainerId + ' canvas');
        var ctx=canvas.getContext("2d");

        var img=new Image();
        img.onload=start;
        img.src=faceImg.src;
        function start(){

            var iw=img.width;
            var ih=img.height;
            canvas.width=iw+170;
            canvas.height=ih+170;

            for(var x=0;x<310;x++){
                var y=5*Math.sin(x/25)+200-162;
                ctx.drawImage(img, x,0,1,ih,  x,y,1,ih);
            }

        }
    }
}

cheet('↑ ↑ ↓ ↓ ← → ← → b a', function () {
    alert('You rock!');
});