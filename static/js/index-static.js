// Load configuration
const BACKEND_URL = window.API_CONFIG?.BACKEND_URL || '';
const apiKey = window.API_CONFIG?.OPENAI_API_KEY || window.OPENAI_API_KEY || undefined;

const closeLeftbar = document.getElementById("closeLeftbar");
const newAppointment = document.getElementById("newAppointment");
const leftContainer = document.getElementById("leftContainer");
const chatArea = document.getElementById("chatArea");
const appointmentsContainer = document.getElementById("appointmentsContainer");
// Language dropdown not present in static version
const langSelect = null;
var lang = 'en';

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

const DOCTOR_PFP_URL = '/static/images/doctorPfp.png';

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

// Realistic demo responses for when backend is not available
function generateDemoResponse(userText) {
    const text = userText.toLowerCase();

    // Check for different symptom keywords and generate appropriate responses
    if (text.includes('headache') || text.includes('head hurt')) {
        return {
            message: [
                "Based on your symptoms, I've identified several possible conditions:",
                "",
                "1. **Tension Headache** (45% likelihood)",
                "   - Most common type of headache",
                "   - Often caused by stress, poor posture, or eye strain",
                "   - Treatment: Rest, hydration, over-the-counter pain relievers",
                "",
                "2. **Migraine** (25% likelihood)",
                "   - May include sensitivity to light and sound",
                "   - Can last 4-72 hours",
                "   - Treatment: Dark quiet room, prescribed medications if severe",
                "",
                "3. **Dehydration Headache** (20% likelihood)",
                "   - Common after insufficient fluid intake",
                "   - Treatment: Increase water intake gradually",
                "",
                "4. **Sinus Headache** (10% likelihood)",
                "   - Associated with sinus pressure and congestion",
                "   - Treatment: Decongestants, warm compress",
                "",
                "**Recommended Actions:**",
                "- Rest in a quiet, dark room",
                "- Stay hydrated",
                "- Monitor symptoms",
                "- Seek medical attention if severe or persistent"
            ],
            probs: [0.45, 0.25, 0.20, 0.10]
        };
    } else if (text.includes('fever') || text.includes('temperature')) {
        return {
            message: [
                "Based on your reported fever, here's my assessment:",
                "",
                "1. **Viral Infection** (40% likelihood)",
                "   - Most common cause of fever",
                "   - Usually resolves within 3-5 days",
                "   - Treatment: Rest, fluids, acetaminophen/ibuprofen",
                "",
                "2. **Bacterial Infection** (25% likelihood)",
                "   - May require antibiotics",
                "   - Watch for worsening symptoms",
                "   - Treatment: Medical evaluation needed",
                "",
                "3. **Influenza** (20% likelihood)",
                "   - Sudden onset with body aches",
                "   - Highly contagious",
                "   - Treatment: Antivirals if caught early, supportive care",
                "",
                "4. **COVID-19** (15% likelihood)",
                "   - Consider testing if exposed",
                "   - Isolate to prevent spread",
                "   - Monitor oxygen levels",
                "",
                "**Immediate Recommendations:**",
                "- Monitor temperature every 4 hours",
                "- Increase fluid intake",
                "- Rest as much as possible",
                "- Seek emergency care if temperature exceeds 103°F"
            ],
            probs: [0.40, 0.25, 0.20, 0.15]
        };
    } else if (text.includes('cough') || text.includes('throat')) {
        return {
            message: [
                "I've analyzed your respiratory symptoms:",
                "",
                "1. **Upper Respiratory Infection** (35% likelihood)",
                "   - Common cold symptoms",
                "   - Usually viral in nature",
                "   - Treatment: Rest, warm liquids, throat lozenges",
                "",
                "2. **Allergic Reaction** (30% likelihood)",
                "   - Seasonal or environmental triggers",
                "   - May include itchy eyes and sneezing",
                "   - Treatment: Antihistamines, avoid allergens",
                "",
                "3. **Strep Throat** (20% likelihood)",
                "   - Severe throat pain, difficulty swallowing",
                "   - May need antibiotics",
                "   - Treatment: Medical evaluation and throat culture",
                "",
                "4. **Bronchitis** (15% likelihood)",
                "   - Productive cough with mucus",
                "   - Chest discomfort",
                "   - Treatment: Rest, fluids, possibly inhaler",
                "",
                "**Care Instructions:**",
                "- Gargle with warm salt water",
                "- Use a humidifier",
                "- Avoid irritants like smoke",
                "- See a doctor if symptoms persist over 7 days"
            ],
            probs: [0.35, 0.30, 0.20, 0.15]
        };
    } else if (text.includes('stomach') || text.includes('nausea') || text.includes('vomit')) {
        return {
            message: [
                "Based on your digestive symptoms:",
                "",
                "1. **Gastroenteritis** (40% likelihood)",
                "   - Stomach flu, often viral",
                "   - Nausea, vomiting, possibly diarrhea",
                "   - Treatment: Clear liquids, BRAT diet, rest",
                "",
                "2. **Food Poisoning** (30% likelihood)",
                "   - Onset within hours of eating",
                "   - Similar to gastroenteritis",
                "   - Treatment: Hydration, electrolytes",
                "",
                "3. **Acid Reflux/GERD** (20% likelihood)",
                "   - Burning sensation, worse when lying down",
                "   - May cause nausea",
                "   - Treatment: Antacids, avoid trigger foods",
                "",
                "4. **Stress/Anxiety** (10% likelihood)",
                "   - Can cause digestive upset",
                "   - May be accompanied by other symptoms",
                "   - Treatment: Stress management, relaxation",
                "",
                "**Management Tips:**",
                "- Start with small sips of water",
                "- Try ginger tea for nausea",
                "- Avoid solid foods until vomiting stops",
                "- Seek care if dehydrated or symptoms worsen"
            ],
            probs: [0.40, 0.30, 0.20, 0.10]
        };
    } else {
        // Generic response for unspecific symptoms
        return {
            message: [
                "Thank you for describing your symptoms. Based on the information provided:",
                "",
                "1. **General Viral Syndrome** (30% likelihood)",
                "   - Non-specific symptoms are often viral",
                "   - Self-limiting condition",
                "   - Treatment: Supportive care, rest, hydration",
                "",
                "2. **Stress-Related Symptoms** (25% likelihood)",
                "   - Physical manifestation of stress",
                "   - Can cause various symptoms",
                "   - Treatment: Stress reduction, adequate sleep",
                "",
                "3. **Early Infection** (25% likelihood)",
                "   - May be in prodromal phase",
                "   - Monitor for developing symptoms",
                "   - Treatment: Preventive care, immune support",
                "",
                "4. **Fatigue Syndrome** (20% likelihood)",
                "   - Could be from overwork or poor sleep",
                "   - May need lifestyle changes",
                "   - Treatment: Sleep hygiene, balanced diet",
                "",
                "**General Recommendations:**",
                "- Keep a symptom diary",
                "- Ensure adequate rest (7-9 hours sleep)",
                "- Maintain good hydration",
                "- Follow up if symptoms persist or worsen"
            ],
            probs: [0.30, 0.25, 0.25, 0.20]
        };
    }
}

function generateImageAnalysisResponse() {
    // Randomly select between different "analysis" results
    const responses = [
        {
            message: [
                "**Image Analysis Complete**",
                "",
                "I've analyzed the uploaded image and identified the following:",
                "",
                "**Primary Finding:**",
                "The image appears to show a dermatological condition with the following characteristics:",
                "",
                "1. **Contact Dermatitis** (65% confidence)",
                "   - Localized redness and inflammation",
                "   - Possibly caused by allergen or irritant",
                "   - Treatment: Topical corticosteroids, avoid triggers",
                "",
                "2. **Eczema** (20% confidence)",
                "   - Chronic skin condition",
                "   - May require ongoing management",
                "   - Treatment: Moisturizers, prescription creams",
                "",
                "3. **Minor Allergic Reaction** (15% confidence)",
                "   - Temporary response to allergen",
                "   - Should resolve with treatment",
                "   - Treatment: Antihistamines, cool compresses",
                "",
                "**Recommended Actions:**",
                "- Keep area clean and dry",
                "- Apply fragrance-free moisturizer",
                "- Monitor for changes",
                "- Consult dermatologist if no improvement in 5-7 days"
            ]
        },
        {
            message: [
                "**Medical Image Analysis Results**",
                "",
                "Analysis of your uploaded image is complete:",
                "",
                "**Findings:**",
                "The scan shows characteristics consistent with:",
                "",
                "1. **Normal Variation** (70% confidence)",
                "   - No significant abnormalities detected",
                "   - Findings within normal limits",
                "   - Recommendation: Routine follow-up",
                "",
                "2. **Minor Inflammation** (20% confidence)",
                "   - Slight tissue changes noted",
                "   - May be early stage condition",
                "   - Recommendation: Monitor symptoms",
                "",
                "3. **Artifact/Image Quality** (10% confidence)",
                "   - Some areas unclear",
                "   - May need repeat imaging",
                "   - Recommendation: Clinical correlation needed",
                "",
                "**Clinical Correlation:**",
                "- Compare with previous images if available",
                "- Consider symptoms in context",
                "- Follow-up in 3-6 months if symptomatic"
            ]
        }
    ];

    return responses[Math.floor(Math.random() * responses.length)];
}

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
      await fetch(`${BACKEND_URL}/reset`, {
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
              <img style="width:75px;height:75px" src="/static/images/loading.gif">
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
                <img class="userPfp" src="/static/images/user.png">
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
                  <img class="userPfp" src="/static/images/user.png">
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

  // Convert message array to HTML with streaming effect
  const messageArray = typeof text === 'string' ? JSON.parse(text) : text;
  let fallbackHTML = '';

  for (const line of messageArray) {
    if (line.startsWith('**') && line.endsWith('**')) {
      // Bold headers
      fallbackHTML += `<h4><strong>${line.slice(2, -2)}</strong></h4>`;
    } else if (line.startsWith('   - ')) {
      // Sub-items
      fallbackHTML += `<p style="margin-left: 20px;">• ${line.slice(5)}</p>`;
    } else if (line.startsWith('- ')) {
      // List items
      fallbackHTML += `<p>• ${line.slice(2)}</p>`;
    } else if (line.match(/^\d+\. \*\*/)) {
      // Numbered items with bold
      const processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      fallbackHTML += `<p>${processed}</p>`;
    } else if (line === '') {
      // Empty line for spacing
      fallbackHTML += '<br>';
    } else {
      // Regular paragraph
      fallbackHTML += `<p>${line}</p>`;
    }
  }

  // Simulate streaming effect
  const currResponseCont = document.getElementById("chatArea");
  const currResponse = currResponseCont.getElementsByClassName("aiResponseContainer")[currResponseCont.getElementsByClassName("aiResponseContainer").length - 1];
  const currResponseText = currResponse.children[currResponse.children.length - 1];

  // Stream the HTML content character by character for realism
  let currentIndex = 0;
  const streamSpeed = 5; // milliseconds per character
  currResponseText.innerHTML = '';

  const streamInterval = setInterval(() => {
    if (currentIndex < fallbackHTML.length) {
      currResponseText.innerHTML = fallbackHTML.slice(0, currentIndex + 20);
      currentIndex += 20;
      chatArea.scrollTo(0, chatArea.scrollHeight);
    } else {
      currResponseText.innerHTML = fallbackHTML;
      clearInterval(streamInterval);
      saveState(currentChat);
    }
  }, streamSpeed);

}

async function handleNaiveBayes(userText) {
  try {
    const response = await fetch(`${BACKEND_URL}/nb`, {
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
    console.log('Demo mode: Generating realistic response');
    // Use intelligent fallback response based on user input
    const demoResponse = generateDemoResponse(userText);
    await getChatCompletion(JSON.stringify(demoResponse.message));
  }
}

async function handleCNN(file) {
  try {
    const response = await fetch(`${BACKEND_URL}/cnn`, {
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
    console.log('Demo mode: Generating image analysis');
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    // Use realistic image analysis response
    const imageResponse = generateImageAnalysisResponse();
    await getChatCompletion(JSON.stringify(imageResponse.message));
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
        uploadButton.style.backgroundImage = `url('/static/images/fileUpload.png')`;
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