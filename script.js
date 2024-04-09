const video = document.getElementById("video");
const happySong = document.getElementById("happySong");
const sadSong = document.getElementById("sadSong");

const emotionColors = {
  happy: "yellow",
  sad: "blue",
  angry: "red",
  surprised: "orange",
  disgusted: "green",
  fearful: "purple",
  neutral: "white",
};

const emotionInstructions = {
  happy: "You're happy! Keep smiling!",
  sad: "You're sad. It's okay to cry.",
  angry: "You're angry. Try to calm down.",
  surprised: "You're surprised! What caught your attention?",
  disgusted: "You're disgusted. What's bothering you?",
  fearful: "You're scared. It's okay to seek help.",
  neutral: "You're neutral. How about trying something new?",
};

async function getMyFaceDescriptor() {
  const input = await faceapi.fetchImage("agit.png");
  const detections = await faceapi
    .detectSingleFace(input)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (detections) {
    return detections.descriptor;
  } else {
    console.error("No faces detected in the input.");
  }
}

let myFaceDescriptor = null;
getMyFaceDescriptor().then((descriptor) => {
  myFaceDescriptor = descriptor;
});

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceExpressionNet.loadFromUri("/models"),
]).then(startVideo);

function startVideo() {
  navigator.mediaDevices
    .getUserMedia({ video: {} })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((err) => console.error(err));
}

video.addEventListener("play", () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  // Select the recognitionResult element
  const recognitionResult = document.getElementById("recognitionResult");

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withFaceDescriptors();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

    // Reset the color of all emotion list items
    const emotionListItems = document.querySelectorAll("#emotions ul li");
    emotionListItems.forEach((item) => (item.style.color = "#fff"));

    // Change the color of the detected emotion list item
    if (resizedDetections[0] && resizedDetections[0].expressions) {
      const emotions = resizedDetections[0].expressions;
      const maxEmotion = Object.keys(emotions).reduce((a, b) =>
        emotions[a] > emotions[b] ? a : b
      );
      if (emotions[maxEmotion] > 0.9) {
        const emotionListItem = document.querySelector(
          `#emotions ul li[data-emotion="${maxEmotion}"]`
        );
        if (emotionListItem) {
          emotionListItem.style.color = "green";
        }

        // If the detected emotion is "happy", play the happy song
        // If the detected emotion is "sad", play the sad song
        if (maxEmotion === "happy") {
          happySong.play();
          sadSong.pause();
        } else if (maxEmotion === "sad") {
          sadSong.play();
          happySong.pause();
        } else {
          happySong.pause();
          sadSong.pause();
        }

        // Change the background color based on the detected emotion
        document.body.style.backgroundColor = emotionColors[maxEmotion];
      }
    }

    // Now you can use the descriptors to recognize faces
    detections.forEach((detection) => {
      const descriptor = detection.descriptor;
      // Compare the descriptor with your face descriptor
      if (myFaceDescriptor) {
        const distance = faceapi.euclideanDistance(
          descriptor,
          myFaceDescriptor
        );
        if (distance < 0.6) {
          // This threshold will depend on your specific use case
          console.log("Face recognized as my face");
          recognitionResult.textContent = "Face recognized as my face";
          recognitionResult.style.color = "green";
        } else {
          console.log("Face not recognized");
          recognitionResult.textContent = "Face not recognized";
          recognitionResult.style.color = "red";
        }
      }
    });
  }, 100);
});

const screenshotButton = document.getElementById("screenshotButton");
const screenshotsContainer = document.getElementById("screenshots");

screenshotButton.addEventListener("click", () => {
  const screenshotCanvas = document.createElement("canvas");
  screenshotCanvas.width = video.videoWidth;
  screenshotCanvas.height = video.videoHeight;
  screenshotCanvas
    .getContext("2d")
    .drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
  const screenshotImg = document.createElement("img");
  screenshotImg.src = screenshotCanvas.toDataURL("image/png");
  screenshotsContainer.append(screenshotImg);
});
