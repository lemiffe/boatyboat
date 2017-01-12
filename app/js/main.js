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
var companyCount = 0;
var currentCompanyIndex = 0;
var companies = [];

// Constants
var requiredImages = [
    '../images/canoe.svg',
    '../images/canoe-build.svg',
    '../images/island.svg',
    '../images/hook.svg',
    '../images/octo.svg',
    '../images/hammer.svg',
    '../images/clouds.png',
    '../images/seigaiha.png'
];
var BETWEENWAVE_CONTAINER = '.betweenwaves';
var HOOK_EXIT_TIME = 1500;
var EXIT_TIME = 1500;
var ENTER_SLOW_TIME = 2200;
var ENTER_TIME = 2000;
var STATUS_NOT_FOUND = 'not found';
var STATUS_ERROR = 'error';
var STATUS_SUCCESS = 'success';
var STATUS_PARTIAL_UPDATE_REQUIRED = 'partial update required';
var STATUS_FULL_UPDATE_REQUIRED = 'full update required';

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

    // We didn't get a response, or we got one but with count 0 (server has gone mad?)
    if (
        !httpResult ||
        (httpResult.count === 0 && httpResult.status !== STATUS_NOT_FOUND) ||
        httpResult.status === STATUS_ERROR
    ) {
        searchError({status: 500});
        return;
    }

    renderBoats(httpResult);
}

/**
 * @param error
 */
function searchError(error) {
    searching = false;
    var killFast = false;
    var searchEndTime = new Date().getTime();
    if (searchEndTime - searchStartTime < 100) {
        killFast = true;
    }
    killHook(killFast);
    hideLoading(); // Just in case
    hideSearchSlow(); // Remove "slow search" message (in case it's still visible)

    // Example error: (error.status >= 500 || error.status === 0);
    fatalError("I have problems... Try again shortly. Sorry!");
}

/**
 * Takes in the httpResult of either a creation call or a search call
 * Displays the boat(s) and/or creates a new company if no results were found
 * @param httpResult
 */
function renderBoats(httpResult) {
    companies = httpResult.results;
    companyCount = httpResult.count;
    currentCompanyIndex = 0;

    switch(httpResult.status) {
        case STATUS_NOT_FOUND:
            buildBoat(lastSearchString); // Note: potential race condition, consider sending company as a prop
            break;

        case STATUS_SUCCESS:
        case STATUS_PARTIAL_UPDATE_REQUIRED:
        case STATUS_FULL_UPDATE_REQUIRED:
            killIsland();
            killBoats();
            killOcto();
            console.log(companies);

            $.each(companies, function(index, company) {
                // Render single item
                var renderFlag = company.gd_ceo && company.gd_ceo.image && company.gd_ceo.image.src;
                var boatContainerId = generateUniqueBoatId(index);
                var visible = (index === 0);
                // Todo: Depending on boat status we want to display either a full construction, or a boat and hammer
                displayBoat('canoe', 'sea', boatContainerId, renderFlag, visible, index, false);
            });

            if (companyCount > 1) {
                // Todo: Arrows + more boats :P
            }
            break;
        default:
            searchError({status: 500});
            break;
    }
}

/**
 * Creates a new company (that does not exist in our database)
 * API can return statuses: error (with 'message'), success (where 'results' is a list with companies)
 * @param companyName
 */
function buildBoat(companyName) {
    killBoats();
    killIsland();
    killOcto();
    var boatContainerId = generateUniqueBoatId(0);
    displayBoat('canoe-build', 'sea', boatContainerId, false, true, -1, true);

    // Create company
    var encodedSearch = encodeURIComponent(companyName);
    var buildUrl = apiUrl + '/company/' + encodedSearch + '/create';

    setTimeout(function() {
        $.ajax({
            url: buildUrl,
            dataType: 'json',
            data: null,
            success: buildBoatSuccess,
            error: buildBoatError
        });
    }, 500);
}

function buildBoatSuccess(httpResult) {
    killHook(true); // Just in case
    hideLoading(); // Just in case
    hideSearchSlow(); // Remove "slow search" message (in case it's still visible)
    killBoats();

    // We didn't get a response, or we got one but with count 0 (server has gone mad?)
    if (
        !httpResult ||
        (httpResult.count === 0 && httpResult.status !== STATUS_NOT_FOUND) ||
        httpResult.status === STATUS_ERROR
    ) {
        buildBoatError({status: 500, message: "Sorry, we can't build this boat, try again later..."});
        return;
    }

    renderBoats(httpResult);
}

function buildBoatError(error) {
    killHook(true); // Just in case
    hideLoading(); // Just in case
    hideSearchSlow(); // Remove "slow search" message (in case it's still visible)
    killBoats();

    console.log(error);
    if (error.status === 404) {
        islandError("Sorry, we couldn't find this company.");
    } else {
        // Display error.message when we adjust the API to return better errors
        islandError("Sorry, we are having trouble building this company.");
    }
}

function fatalError(message) {
    console.log('fatal error');
    // Kill everything again (even though previous function might have killed one or two things)
    killHook(true);
    hideLoading();
    hideSearchSlow();
    killIsland();
    killBoats();
    $('#search').val(''); // Clear search term

    // Display octopus and message
    displayOcto();
    openSnackbar(message);
}

function islandError(message) {
    console.log('island error');
    // Kill everything again (even though previous function might have killed one or two things)
    killHook(true);
    hideLoading();
    hideSearchSlow();
    killBoats();

    // Display island and message
    displayIsland();
    openSnackbar(message);
}

function displayHook() {
    console.log('display hook');
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
    console.log('kill hook');
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

function displayBoat(type, level, boatContainerId, renderFlag, visible, companyIndex, renderHammer) {
    console.log('display boat');
    var enterClass = visible ? " enter-slow" : " boat-hidden";
    if (enterClass === ' enter-slow' && type === 'canoe-build') {
        enterClass = ' enter-fast';
    }
    var boatNumberClass = " boat-number-" + companyIndex;
    var container = $(BETWEENWAVE_CONTAINER);
    var html = '<div class="bc-boat boatcontainer' + enterClass + boatNumberClass + '" id="' + boatContainerId + '">';
    html += '<div class="boat bobbler3 size-' + type + ' level-' + level + '">';
    if (renderFlag) {
        html += '<div class="flagcontainer"><canvas class="flag"></canvas></div>';
    }
    if (renderHammer) {
        html += '<div class="hammercontainer"><img src="images/hammer.svg" /></div>';
    }
    html += '<img src="images/' + type + '.svg" /></div>';
    html += '</div>';
    container.prepend(html);

    // Remove "enter" animation class after 2 seconds (to avoid re-rendering by mistake)
    if (visible) {
        setTimeout(function() {
            container.children('.bc-boat').removeClass('enter-slow');
        }, ENTER_SLOW_TIME);
    }

    // Render flag
    if (renderFlag) {
        // Get CEO image from companies (stateful!)
        displayFlag(companies[companyIndex].gd_ceo.image.src, boatContainerId, 200, 200);
    }
}

function killBoats() {
    console.log('kill boats');
    $('.bc-boat:visible').removeClass('enter-low').addClass('exit');
    setTimeout(function() {
        $('.bc-boat.exit').remove();
    }, EXIT_TIME + 150);
}

function displayIsland() {
    console.log('show island');
    var container = $(BETWEENWAVE_CONTAINER);
    var existingItems = container.children('.bc-island:visible');
    //existingItems = [];
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
    console.log('kill island');
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
    console.log('show octo');
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
    console.log('kill octo');
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
        openSnackbar("Oops! We're a bit slow today, sorry about that...", true);
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

function generateUniqueBoatId(index) {
    return 'boat-' + index + '-' + Date.now() + String.fromCharCode(65 + Math.floor(Math.random() * 26));
}

cheet('↑ ↑ ↓ ↓ ← → ← → b a', function () {
    fatalError('Smarty pants!');
    displaySearchSlow(true);
});