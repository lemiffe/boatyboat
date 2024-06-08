var requiredImages = ['../assets/media/canoe.svg', '../assets/media/octo.svg', '../assets/media/clouds.png'];

function displayBoat(type, level) {
    var container = $('.betweenwaves');
    var html = '<div class="bc-boat boatcontainer enter-slow">';
    html += '<div class="boat bobbler3 size-canoe level-floating">';
    $('.wavecontainer:visible').css('top', '80px');
    html += '<img src="./assets/media/canoe.svg" /></div>';
    html += '</div>';
    container.prepend(html);
}

function displayOcto() {
    $('.wavecontainer:visible').css('top', '150px');
    var container = $('.betweenwaves');
    var html = '<div class="bc-octo boatcontainer enter-low">';
    html += '<div class="octo level-sea bobbler3"><img src="./assets/media/octo.svg" /></div>';
    html += '</div>';
    container.prepend(html);
}

var preloadPictures = function (pictureUrls, callback) {
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
        })(new Image(), pictureUrls[i]);
    }
};
