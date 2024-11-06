const closeLeftbar = document.getElementById("closeLeftbar");
const leftContainer = document.getElementById("leftContainer");
closeLeftbar.addEventListener('click', function() {
    leftContainer.classList.toggle("squished");
});

const chatArea = document.getElementById("chatArea");
function addAIResponse(text) {
    chatArea.innerHTML += `
    <div class="aiResponseContainer">
        <div class="aiPfpContainer">
            <img class=aiPfp src="images/doctorPfp.png">
        </div>
        <div class="aiTextContainer">
            ${text}
        </div>
    </div>

    `
}

for (let i = 0; i < 3; i++) {
    addAIResponse("Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? Hello! How can I help you today? ");
}
