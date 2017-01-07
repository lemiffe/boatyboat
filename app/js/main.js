function handleInput() {
    console.log($('#search').val());
}

$(document).ready(function() {
    $('#search')
        .focus()
        .select()
        .keyup($.debounce(600, handleInput));
});

cheet('↑ ↑ ↓ ↓ ← → ← → b a', function () {
	alert('Voilà!');
});