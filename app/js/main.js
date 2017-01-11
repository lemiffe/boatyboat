// Initialisation variables
var apiUrl = location.protocol.concat("//") + 'localhost:1337';
if (window.location.hostname !== 'localhost') {
    var http = location.protocol;
    var slashes = http.concat("//");
    apiUrl = slashes.concat('api.').concat(window.location.hostname);
}

// State
var lastSearchString = '';
var searchStartTime = 0;
var searching = false;

// Constants
var requiredImages = [
    '../images/canoe.svg',
    '../images/island.svg',
    '../images/hook.svg',
    '../images/octo.svg',
    '../images/clouds.png',
    '../images/seigaiha.png'
];
var BETWEENWAVE_CONTAINER = '.betweenwaves';
var HOOK_EXIT_TIME = 1500;
var EXIT_TIME = 1500;
var ENTER_SLOW_TIME = 2200;
var ENTER_TIME = 2000;
var STATUS_NOT_FOUND = 'not found';

$(document).ready(function() {
    // Search input handler + debouncer
    var searchEl = $('#search');
    searchEl.focus().select().keyup($.debounce(600, handleInput));

    // Search icon click handler
    $('.searchcontainer .input-group-addon').on('click touchstart', function() {
        handleInput(null);
    });

    // Pre-load assets (disable search until they load)
    displayLoading();
    searchEl.prop('disabled', true);
    preloadPictures(requiredImages, function(){
        // After loading initial assets
        hideLoading();
        searchEl.prop('disabled', false);

        // Display initial state or start search
        if (window.location.hash && window.location.hash.trim().length > 1) {
            // Search for company in URL hash (if set)
            var decodedCompanyName = decodeURIComponent(window.location.hash.trim().replace('#', ''));
            $('#search').val(decodedCompanyName); // Modifying text does not start search by default
            startSearch(decodedCompanyName);
        } else {
            // First time user experience
            displayIsland();
        }
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
        return;

    } else if (companyName.length < 2) {
        return;

    } else if (e && e.keyCode === 91 && lastSearchString.trim() === companyName.trim()) {
        // Tab was pressed and search string is still the same
        return;

    } else if (e && e.keyCode !== 13 && lastSearchString.trim() === companyName.trim()) {
        // Skip if not enter and text is the same (if click, e is null so it re-searches always)
        return;
    }

    startSearch(companyName);
}

function startSearch(companyName) {
    // Search
    var encodedSearch = encodeURIComponent(companyName);
    var searchUrl = apiUrl + '/search/' + encodedSearch;
    searchStartTime = new Date().getTime();
    searching = true;
    window.location.hash = encodedSearch;
    displayHook();

    $.ajax({
        url: searchUrl,
        dataType: 'json',
        data: null,
        success: searchSuccess,
        error: searchError
    });

    // If search is taking too long, and still searching for the same item, show 'slow search'
    setTimeout(function() {
        if (searching === true && lastSearchString === companyName) {
            displaySearchSlow();
        }
    }, 2000);

    lastSearchString = companyName;
}

/**
 * Performs a search with the API
 * The search can return statuses: error, not found, success, full update required, partial update required
 * @param httpResult
 * @return void
 */
function searchSuccess(httpResult) {
    searching = false;
    killHook(false); // Kill slowly
    hideLoading(); // Just in case
    hideSearchSlow(); // Remove "slow search" message (in case it's still visible)

    // We got a response, but we couldn't find a company with that name/domain
    if (httpResult && httpResult.status === STATUS_NOT_FOUND) {
        // Todo: Initiate construction of new company!
        killBoats();
        displayIsland(); // will be something different
        killOcto();
        return;
    }

    // We didn't get a response, or we got one but with count 0 (server has gone mad?)
    if (!httpResult || httpResult.count === 0) {
        searchError({status: 500});
    }

    // We got a response with items!
    // TODO: Handle other statuses (like partial update required, etc.)
    var results = httpResult.results;
    killIsland();
    killBoats();
    killOcto();
    console.log(results); // TODO: Remove
    if (httpResult.count === 1) {
        // Render single item
        var item = results[0];
        var renderFlag = item.gd_ceo && item.gd_ceo.image && item.gd_ceo.image.src;
        // TODO: Generate container ID here and pass it on to displayBoat (same for function below)
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
    searching = false;
    var killFast = false;
    var searchEndTime = new Date().getTime();
    if (searchEndTime - searchStartTime < 100) {
        killFast = true;
    }
    killHook(killFast);
    hideLoading(); // Just in case
    hideSearchSlow(); // Remove "slow search" message (in case it's still visible)

    console.log(x);
    var companyNotFound = (x.status === 404);
    var serverError = (x.status >= 500 || x.status === 0);
    var badInput = (x.status === 400);
    fatalError('Pending'); // TODO: Proper error message
}

function fatalError(message) {
    // Kill everything again (even though previous function might have killed one or two things)
    killHook(true);
    hideLoading();
    hideSearchSlow();
    killIsland();
    killBoats();
    $('#search').val(''); // Clear search term
    // Display octopus and message
    displayOcto();

    // TODO : message (snack + pole!)
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
        // No boats on screen, enter a new island
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

function displayOcto() {
    var container = $(BETWEENWAVE_CONTAINER);
    var existingItems = container.children('.bc-octo');
    if (existingItems.length === 0) {
        // No boats on screen, enter a new boat
        var html = '<div class="bc-octo boatcontainer enter-low">';
        html += '<div class="octo level-sea bobbler3"><img src="images/octo.svg" /></div>';
        html += '</div>';
        container.prepend(html);
        // Remove enter animation class after 2 seconds (to avoid re-rendering by mistake)
        setTimeout(function() {
            container.children('.bc-octo').removeClass('enter-low');
        }, ENTER_SLOW_TIME);
    } else {
        // If bc-octo already exists, make sure it is visible
        var island = container.children('.bc-octo').first();
        if (island && island.hasClass('exit') || !island.is(":visible")) {
            // Only make it 'enter' again if not already visible (or if it was exiting)
            island.removeClass('exit').addClass('enter-low');
        }
    }
}

function killOcto() {
    var container = $(BETWEENWAVE_CONTAINER);
    var existingItems = container.children('.bc-octo');
    if (existingItems.length > 0) {
        existingItems.first().removeClass('enter-low').addClass('exit');
        setTimeout(function() {
            $('.bc-octo').last().remove();
        }, EXIT_TIME);
    }
}

function displayLoading() {
    $('.loadingcontainer').fadeTo(1200, 0.2);
}

function hideLoading() {
    $('.loadingcontainer').fadeOut('fast');
}

function displaySearchSlow(hideSnackbar) {
    if (!hideSnackbar) {
        openSnackbar("Just a sec...", true);
    }
    $('#longtimenoload').addClass('bg-long-load').fadeTo(1000, 0.3);
}

function hideSearchSlow() {
    closeSnackbars();
    $('#longtimenoload').fadeTo(1000, 0).removeClass('bg-long-load');
}

// Helper Functions:

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

var openSnackbar = (function() {
    var previous = null;

    return function(message, doNotAutoClose) {
        if (previous) {
            previous.dismiss();
        }
        var snackbar = document.createElement('div');
        snackbar.className = 'snackbar';
        snackbar.dismiss = function() {
            this.style.opacity = 0;
        };
        var text = document.createTextNode(message);
        snackbar.appendChild(text);
        setTimeout(function() {
            if (previous === this && !doNotAutoClose) {
                previous.dismiss();
            }
        }.bind(snackbar), 5000);

        snackbar.addEventListener('transitionend', function(event, elapsed) {
            if (event.propertyName === 'opacity' && this.style.opacity == 0) {
                this.parentElement.removeChild(this);
                if (previous === this) {
                    previous = null;
                }
            }
        }.bind(snackbar));

        previous = snackbar;
        document.body.appendChild(snackbar);
        // Force the original style to be computed, and then change it to trigger the animations
        getComputedStyle(snackbar).bottom;
        snackbar.style.bottom = '0px';
        snackbar.style.opacity = 1;
    };
})();

function closeSnackbars() {
    $('.snackbar').css('opacity', 0);
}

cheet('↑ ↑ ↓ ↓ ← → ← → b a', function () {
    fatalError('Smarty pants!');
    displaySearchSlow(true);
});