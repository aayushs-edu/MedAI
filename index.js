const closeLeftbar = document.getElementById("closeLeftbar");
const leftContainer = document.getElementById("leftContainer");
closeLeftbar.addEventListener('click', function() {
    leftContainer.classList.toggle("squished");
});

