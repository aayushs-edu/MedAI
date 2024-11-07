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

function addUserResponse(text) {
    chatArea.innerHTML += `
        <div class="userResponseContainer">
            <div class="userTextContainer">
                <div class="userText">
                    ${text}
                </div>
            </div>
            <div class="userPfpContainer">
                <div class="userPfp">
                    You
                </div>
            </div>
        </div>

    `
}

for (let i = 0; i < 50; i++) {
    addUserResponse("I have a headache")
}