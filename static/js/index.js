import { OPENAI_API_KEY } from './env.js';

const apiKey = OPENAI_API_KEY;

const closeLeftbar = document.getElementById("closeLeftbar");
const newAppointment = document.getElementById("newAppointment");
const leftContainer = document.getElementById("leftContainer");
const chatArea = document.getElementById("chatArea");
const appointmentsContainer = document.getElementById("appointmentsContainer");

var appointmentTitle;

closeLeftbar.addEventListener('click', function() {
    leftContainer.classList.toggle("squished");
});

newAppointment.addEventListener('click', function() {
    chatArea.innerHTML = `
        <div class="aiResponseContainer">
            <div class="aiPfpContainer">
                <img class=aiPfp src="{{ url_for('static', filename='images/doctorPfp.png') }}">
            </div>
            <div class="aiTextContainer">
                <p>Hello! How can I assist you today regarding health or medical information?</p>
            </div>
        </div>
    `;
    fetch('/reset', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify("")
    })
});

async function getTitle(text) {
    var text = chatArea.children[1].children[0].textContent.trim();
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a medical doctor. Come up with a brief 3 - 5 word title for the appointment given the user's text." },
            { role: "user", content: text }
          ]
        })
      });

    const data = await response.json();
    return data.choices[0].message.content;
}

localStorage.setItem("appointments", null);
var appointments = JSON.parse(localStorage.getItem("appointments"));
if (appointments == null) {
    appointments = [];
}

function loadChat(index) {
    chatArea.innerHTML = appointments[index][1];
}

function loadAppointments() {
    appointmentsContainer.textContent = "";
    for (let i = appointments.length - 1; i >= 0; i--) {
        appointmentsContainer.innerHTML += `
            <div class="appointment" onclick="loadChat(${i})">${appointments[i][0]}</div>
        `;
    }
}

loadAppointments();

function intializeState() {
    appointments.push([appointmentTitle, chatArea.innerHTML]);
    localStorage.setItem("appointments", JSON.stringify(appointments));

    loadAppointments();
}

function saveState() {
    appointments[appointments.length - 1][1] = chatArea.innerHTML;
    localStorage.setItem("appointments", JSON.stringify(appointments));
}

function addBlankAIResponse() {
    chatArea.innerHTML += `
        <div class="aiResponseContainer">
            <div class="aiPfpContainer">
                <img class=aiPfp src="{{ url_for('static', filename='images/doctorPfp.png') }}">
            </div>
            <div class="aiTextContainer"></div>
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

function addUserFileResponse() {
  if (fileInput.files[0]) {
    // Create a FileReader to load and display the image
    const reader = new FileReader();

    reader.onload = function (event) {
        chatArea.innerHTML += `
            <div class="userResponseContainer">
                <div class="userTextContainer">
                    <div class="userText">
                        <img class="userImg" src="${event.target.result}" alt="User Image" />
                    </div>
                </div>
                <div class="userPfpContainer">
                    <div class="userPfp">
                        You
                    </div>
                </div>
            </div>
        `;
    };

    // Read the file as a data URL (base64)
    reader.readAsDataURL(fileInput.files[0]);
  }
}

async function getChatCompletion(text) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a medical doctor speaking to a patient. Respond based off the text given. If given possible diagnoses, thoroughly explain each illness and possible treatments. Generate responses in simple HTML format. Use <h3> or <h4> for subheadings and make them bold using <strong> or <b> tags when appropriate. Do not use <h1> or any large headings. For normal text, use <p> for paragraphs and <ul> with <li> for list items. Only use bold formatting (<strong> or <b>) where necessary for emphasis. Do not use markdown-style formatting like **bold**. Do not use <div>, <html>, <head>, <body>, or <!DOCTYPE html> tags. Only output the inner HTML content." },
        { role: "user", content: text }
      ],
      stream: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error: ${response.status} - ${errorText}`);
    throw new Error("Network response was not ok.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let currentHTML = "";  // Accumulate response text

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (let line of lines) {
      if (line.startsWith("data: ")) {
        const jsonString = line.slice("data: ".length).trim();

        if (jsonString === "[DONE]") break;

        try {
          const json = JSON.parse(jsonString);
          if (json.choices && json.choices[0].delta && json.choices[0].delta.content) {
            const content = json.choices[0].delta.content;
            currentHTML += content;
            const currResponseCont = document.getElementById("chatArea");
            const currResponse = currResponseCont.children[currResponseCont.children.length - 1];
            const currResponseText = currResponse.children[currResponse.children.length - 1];
            currResponseText.innerHTML = currentHTML;
          }
        } catch (error) {
          console.error("Error parsing JSON:", error, "Chunk:", jsonString);
        }
      }
    }
  }
}

document.getElementById('chatInput').addEventListener('keydown', async function(event) {
    if (event.key === 'Enter') {
        if (!event.shiftKey) {
            event.preventDefault();
            const userText = chatInput.value;
            if (userText != "") {
              chatInput.value = "";
              console.log(userText);
              addUserResponse(userText);

              if (chatArea.children.length == 2) {
                  appointmentTitle = await getTitle();
                  intializeState();
              }

              addBlankAIResponse();

              // Run through naive bayes
              // Send a POST request to the Flask backend
              fetch('/nb', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(userText)
              })
              .then(response => {
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                console.log(response);
                return response.json(); // Parse JSON response
              })
              .then(async data => {
                  console.log('Response from Flask:', data);
                  await getChatCompletion(JSON.stringify(data));
              })
              .catch(error => {
                  console.error('Error:', error);
              });

              saveState()
            }
            else if (fileInput.files.length > 0) {
              addUserResponse("File Uploaded");

              if (chatArea.children.length == 2) {
                appointmentTitle = await getTitle();
                intializeState();
              }

              addBlankAIResponse();
              
              // Send a POST request to the Flask backend
              fetch('/cnn', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/octet-stream'
                  },
                  body: fileInput.files[0]
              })
              .then(response => response.json())
              .then(async data => {
                  console.log(data); // Handle the response (e.g., show predictions)
                  await getChatCompletion(JSON.stringify(data));
              })
              .catch(error => console.log('Error:', error));

              saveState()
            }
        }
    }
});

const uploadButton = document.getElementById("fileUpload");
const fileInput = document.getElementById("fileInput");
uploadButton.addEventListener('click', () => {
  fileInput.click();
});


fileInput.addEventListener('change', () => {
    // Check if a file is selected
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        // Display the file name
        uploadButton.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
    } else {
        uploadButton.style.backgroundImage = `url('/static/images/fileUpload.png')`;
    }
});

const enterButton = document.getElementById("enterResponse");
enterButton.addEventListener('click', async function() {
  const userText = chatInput.value;
  if (text != "") {
    chatInput.value = "";
    console.log(userText);
    addUserResponse(userText);

    if (chatArea.children.length == 2) {
        appointmentTitle = await getTitle();
        intializeState();
    }

    addBlankAIResponse();

    // Run through naive bayes
    // Send a POST request to the Flask backend
    fetch('/nb', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userText)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json(); // Parse JSON response
    })
    .then(async data => {
        console.log('Response from Flask:', data);
        await getChatCompletion(JSON.stringify(data));
    })
    .catch(error => {
        console.error('Error:', error);
    });

    saveState()
  }
});




