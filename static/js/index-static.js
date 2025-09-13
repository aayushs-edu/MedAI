const apiKey = process.env.OPENAI_API_KEY;

const closeLeftbar = document.getElementById("closeLeftbar");
const newAppointment = document.getElementById("newAppointment");
const leftContainer = document.getElementById("leftContainer");
const chatArea = document.getElementById("chatArea");
const appointmentsContainer = document.getElementById("appointmentsContainer");
const langSelect = document.getElementById("languageDropdown");
var lang = langSelect?.value;

const subtitle = document.getElementById("subtitle");
subtitle.textContent = new Date(Date.now()).toDateString().split(' ').slice(1).join(' ');
console.log(subtitle.textContent);

localStorage.setItem("appointments", null);
var appointments = JSON.parse(localStorage.getItem("appointments"));
if (appointments == null) {
    appointments = [];
}
var appointmentTitle = "Checkup";
appointments.push([appointmentTitle, chatArea.innerHTML, new Date(Date.now()).toDateString().split(' ').slice(1).join(' ')]);
var currentChat = 0;
localStorage.setItem("appointments", JSON.stringify(appointments));

const DOCTOR_PFP_URL = 'static/images/doctorPfp.png';

// Helper function to check if backend is available
async function isBackendAvailable() {
    try {
        const response = await fetch('/reset', {
            method: 'HEAD',
            mode: 'no-cors'
        });
        return true;
    } catch {
        return false;
    }
}

// Fallback responses for when backend is not available
const fallbackResponses = {
    nb: {
        message: [
            "Based on your symptoms, here are some possible conditions to consider:",
            "",
            "1. Common Cold (30% likelihood) - Characterized by runny nose, mild fever, and general fatigue",
            "2. Seasonal Allergies (25% likelihood) - Often presents with sneezing, itchy eyes, and nasal congestion",
            "3. Viral Infection (20% likelihood) - May include body aches, fever, and respiratory symptoms",
            "4. Stress-related symptoms (15% likelihood) - Can manifest as headaches, fatigue, and digestive issues",
            "5. Other conditions (10% likelihood) - Further evaluation may be needed",
            "",
            "Please note: This is a demo response. For actual medical advice, please consult with a healthcare professional."
        ],
        probs: [0.3, 0.25, 0.2, 0.15, 0.1]
    },
    cnn: {
        message: [
            "Image Analysis Results (Demo Mode):",
            "",
            "Unable to perform actual image analysis without backend services.",
            "",
            "In a production environment, this would analyze your uploaded image for:",
            "• Skin conditions",
            "• X-ray abnormalities",
            "• Other visual medical indicators",
            "",
            "For actual medical image analysis, please consult with a healthcare professional who has access to proper diagnostic tools."
        ],
        probs: [0.0]
    }
};

closeLeftbar.addEventListener('click', function() {
    leftContainer.classList.toggle("squished");
});

newAppointment.addEventListener('click', async function() {
  currentChat = appointments.length;
  appointmentTitle = "Checkup";
  chatArea.innerHTML = `
      <div class="aiResponseContainer">
          <div class="aiPfpContainer">
              <img class="aiPfp" src="${DOCTOR_PFP_URL}">
          </div>
          <div class="aiTextContainer">
              <p>Hello! How can I assist you today regarding health or medical information?</p>
          </div>
      </div>
  `;
  appointments.push([appointmentTitle, chatArea.innerHTML, new Date(Date.now()).toDateString().split(' ').slice(1).join(' ')]);
  localStorage.setItem("appointments", JSON.stringify(appointments));

  // Try to reset backend, but don't fail if unavailable
  try {
      await fetch('/reset', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify("")
      });
  } catch (error) {
      console.log('Backend not available, using static mode');
  }
});

async function getTitle(text) {
    // If API key is available, use OpenAI
    if (apiKey && apiKey !== 'undefined') {
        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                  model: "gpt-4o-mini",
                  messages: [
                    { role: "system", content: `You are a medical doctor. Come up with a brief 3 - 5 word title for the appointment given the user's text.` },
                    { role: "user", content: text }
                  ]
                })
            });

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.log('OpenAI API not available, using fallback title');
        }
    }

    // Fallback title generation
    const keywords = text.toLowerCase();
    if (keywords.includes('pain')) return 'Pain Consultation';
    if (keywords.includes('fever')) return 'Fever Assessment';
    if (keywords.includes('cough') || keywords.includes('cold')) return 'Respiratory Symptoms';
    if (keywords.includes('headache')) return 'Headache Evaluation';
    if (keywords.includes('stomach') || keywords.includes('digest')) return 'Digestive Issues';
    return 'General Consultation';
}

// Make loadChat globally accessible
window.loadChat = function(index) {
  currentChat = index;
  chatArea.innerHTML = appointments[index][1];
  subtitle.textContent = appointments[index][2];
  appointmentTitle = appointments[index][0];
};

function loadAppointments() {
    appointmentsContainer.textContent = "";
    var dates = [];
    for (let i = 0; i < appointments.length; i++) {
        if (!dates.includes(appointments[i][2])) {
            dates.push(appointments[i][2]);
            appointmentsContainer.innerHTML += `
                <div class="date">${appointments[i][2]}</div>
            `;
        }
        appointmentsContainer.innerHTML += `
            <div class="appointment" onclick="loadChat(${i})">${appointments[i][0]}</div>
        `;
    }
}

loadAppointments();

async function intializeState() {
    appointments[currentChat][0] = appointmentTitle;
    localStorage.setItem("appointments", JSON.stringify(appointments));
    console.log(appointments);

    loadAppointments();
}

function saveState(idx) {
    appointments[idx][0] = appointmentTitle;
    appointments[idx][1] = chatArea.innerHTML;
    localStorage.setItem("appointments", JSON.stringify(appointments));
}


function addBlankAIResponse() {
  chatArea.innerHTML += `
      <div class="aiResponseContainer">
          <div class="aiPfpContainer">
              <img class="aiPfp" src="${DOCTOR_PFP_URL}">
          </div>
          <div class="aiTextContainer">
              <img style="width:75px;height:75px" src="static/images/loading.gif">
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
                <img class="userPfp" src="static/images/user.png">
            </div>
        </div>
    `
    addBlankAIResponse();
}

function addUserFileResponse(text) {
  if (fileInput.files[0]) {
    // Create a FileReader to load and display the image
    const reader = new FileReader();

    reader.onload = function (event) {
      chatArea.innerHTML += `
          <div class="userResponseContainer">
              <div class="userTextContainer">
                  <div class="userText"></div>
                  <img class="userImg" src="${event.target.result}" alt="User Image" />
              </div>
              <div class="userPfpContainer">
                  <img class="userPfp" src="static/images/user.png">
              </div>
          </div>
      `;
      addBlankAIResponse();
    };

    // Read the file as a data URL (base64)
    reader.readAsDataURL(fileInput.files[0]);
  }
}


async function getChatCompletion(text) {
  // If API key is available, use OpenAI
  if (apiKey && apiKey !== 'undefined') {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `You are a medical doctor giving your patient a checkup. Respond based off the text given. If given possible diagnoses, thoroughly explain each illness in order of likelihood and possible treatments. Generate responses in simple HTML format. Use <h3> or <h4> for subheadings and make them bold using <strong> or <b> tags when appropriate. Do not use <h1> or any large headings. For normal text, use <p> for paragraphs and <ul> with <li> for list items. Only use bold formatting (<strong> or <b>) where necessary for emphasis. Do not use markdown-style formatting like **bold**. Do not use <div>, <html>, <head>, <body>, or <!DOCTYPE html> tags. Only output the inner HTML content. If you get something not medical related, please ask for more details or a clearer image(as the user may give an image).` },
            { role: "user", content: text }
          ],
          stream: true
        })
      });

      if (response.ok) {
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
                  const currResponse = currResponseCont.getElementsByClassName("aiResponseContainer")[currResponseCont.getElementsByClassName("aiResponseContainer").length - 1];
                  const currResponseText = currResponse.children[currResponse.children.length - 1];
                  currResponseText.innerHTML = currentHTML;

                  // scroll to bottom if isScrolledToBottom is true
                  chatArea.scrollTo(0, chatArea.scrollHeight);
                }
              } catch (error) {
                console.error("Error parsing JSON:", error, "Chunk:", jsonString);
              }
            }
          }
        }
        saveState(currentChat);
        return;
      }
    } catch (error) {
      console.log('OpenAI API not available, using fallback response');
    }
  }

  // Fallback response when API is not available
  const fallbackHTML = `
    <h3><strong>Demo Mode Response</strong></h3>
    <p>This is a demonstration response. In production with proper API keys and backend services, you would receive actual medical analysis here.</p>
    <p>The system would analyze your input and provide:</p>
    <ul>
      <li>Symptom assessment</li>
      <li>Possible conditions</li>
      <li>Recommended actions</li>
      <li>When to seek immediate care</li>
    </ul>
    <p><strong>Important:</strong> Always consult with a qualified healthcare professional for actual medical advice.</p>
  `;

  const currResponseCont = document.getElementById("chatArea");
  const currResponse = currResponseCont.getElementsByClassName("aiResponseContainer")[currResponseCont.getElementsByClassName("aiResponseContainer").length - 1];
  const currResponseText = currResponse.children[currResponse.children.length - 1];
  currResponseText.innerHTML = fallbackHTML;
  chatArea.scrollTo(0, chatArea.scrollHeight);
  saveState(currentChat);
}

async function handleNaiveBayes(userText) {
  try {
    const response = await fetch('/nb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userText)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Message received: ', data["message"]);
    console.log('Probs: ', data["probs"]);
    await getChatCompletion(JSON.stringify(data["message"]));
  } catch (error) {
    console.log('Backend not available, using fallback response');
    // Use fallback response
    await getChatCompletion(JSON.stringify(fallbackResponses.nb.message));
  }
}

async function handleCNN(file) {
  try {
    const response = await fetch('/cnn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      body: file
    });

    const data = await response.json();
    console.log('Message received: ', data["message"]);
    console.log('Probs: ', data["probs"]);
    await getChatCompletion(JSON.stringify(data["message"]));
  } catch (error) {
    console.log('Backend not available, using fallback response');
    // Use fallback response
    await getChatCompletion(JSON.stringify(fallbackResponses.cnn.message));
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

              if (appointmentTitle == "Checkup") {
                  appointmentTitle = await getTitle(userText);
                  intializeState();
              }

              // Run through naive bayes with fallback
              await handleNaiveBayes(userText);
              saveState(currentChat);
            }
            else if (fileInput.files.length > 0) {
              addUserFileResponse("File Uploaded");

              var file = fileInput.files[0];

              const removeImage = document.getElementById('removeImage');
              removeImage.click();

              // Send to CNN with fallback
              await handleCNN(file);
            }
        }
    }
});

const uploadButton = document.getElementById("fileUpload");
const fileInput = document.getElementById("fileInput");
uploadButton.addEventListener('click', () => {
  fileInput.click();
});

const imagePreviewContainer = document.getElementById("imagePreviewContainer");

document.addEventListener('DOMContentLoaded', function() {
  const textarea = document.getElementById('chatInput');

  function adjustHeight() {
      // Reset height to auto first
      textarea.style.height = 'auto';
      // Set new height based on scrollHeight
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  }

  // Add input event listener
  textarea.addEventListener('input', adjustHeight);

  // Initial height adjustment
  adjustHeight();
});

fileInput.addEventListener('change', () => {
    // Check if a file is selected
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        // Display the file name
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();

          reader.onload = function (event) {
              // Display the image preview
              imagePreviewContainer.innerHTML = `
                  <div class="imagePreview">
                      <img src="${event.target.result}" alt="Selected Image" />
                      <button id="removeImage">❌</button>
                  </div>
              `;
              // Add a remove button to clear the preview
              const removeImage = document.getElementById('removeImage');
              removeImage.addEventListener('click', () => {
                  imagePreviewContainer.innerHTML = ''; // Clear preview
                  fileInput.value = ''; // Clear file input
              });
          };

          // Read the file as a data URL
        reader.readAsDataURL(file);
      };
    } else {
        uploadButton.style.backgroundImage = `url('static/images/fileUpload.png')`;
    }
});

const enterButton = document.getElementById("enterResponse");
enterButton.addEventListener('click', async function() {
  console.log("Enter button clicked");
  const userText = chatInput.value;
  if (userText != "") {
    chatInput.value = "";
    console.log(userText);
    addUserResponse(userText);

    if (appointmentTitle == "Checkup") {
        appointmentTitle = await getTitle(userText);
        intializeState();
    }

    // Run through naive bayes with fallback
    await handleNaiveBayes(userText);
    saveState(currentChat);
  }
  else if (fileInput.files.length > 0) {
    addUserFileResponse("File Uploaded");
    var file = fileInput.files[0];

    const removeImage = document.getElementById('removeImage');
    removeImage.click();

    // Send to CNN with fallback
    await handleCNN(file);
  }

});

if (langSelect) {
  langSelect.addEventListener('change', function() {
      lang = langSelect.value;
      console.log(`Language selected: ${lang}`);
  });
}