// Connect to Server
const server = "e2c8536650534db8a4b5e9fefa8c7c0f.s1.eu.hivemq.cloud:8884/mqtt";
const client = mqtt.connect(`wss://${server}`, {
  username: "Trung",
  password: "Trung@2302",
  rejectUnauthorized: false,
});

let currentMode = "manual"; // set default mode 

// Create function get dom element 
const getEl = (id) => document.getElementById(id);

const sensorElems = {
  temp: getEl("temp"),
  humi: getEl("humi"),
  soil: getEl("soil"),
  light: getEl("light")
};

const modeToggles = {
  manual: getEl("mode_manual"),
  auto: getEl("mode_auto")
};

const controlButtons = {
  led: [getEl("led_on"), getEl("led_off")],
  fan: [getEl("fan_on"), getEl("fan_off")],
  pump: [getEl("pump_on"), getEl("pump_off")]
};

const relayStates = [
  getEl("relay_led_state"),
  getEl("relay_fan_state"),
  getEl("relay_pump_state")
];

const thresholdInputs = {
  lux: getEl("lux_threshold"),
  temp: getEl("temp_threshold"),
  soil: getEl("soil_threshold")
};

const messageInput = getEl("message");
const statusSystem = getEl("status");

// --- Functions ---
// update state button while user click 
function updateState(type, state) {
  relayStates[type].innerText = state ? " On" : " Off";
}
// disable button if mode === auto 
function updateButtonState() {
  Object.values(controlButtons).flat().forEach(btn => {
    btn.disabled = currentMode === "auto";
  });
}
// change mode 
function setMode(isManual) {
  currentMode = isManual ? "manual" : "auto";
  updateButtonState();
  client.publish("config", JSON.stringify({ mode: currentMode }));
}
// send message
function sendMessage() {
  const msg = messageInput.value;
  messageInput.value="";
  try {
    client.publish("output", JSON.stringify({ message: msg }));
  } catch (e) {
    alert("Tin nhắn JSON không hợp lệ");
    console.error("Lỗi JSON:", e);
  }
}
// update button state
function sendRelayMessage(relay, type, state) {
  updateState(type, state);
  console.log(JSON.stringify({ relay, state }))
  client.publish("output", JSON.stringify({ relay, state }));
}
function sendConfig() {
  const payload = {
    mode: currentMode,
    lux_threshold: parseFloat(thresholdInputs.lux.value),
    temp_threshold: parseFloat(thresholdInputs.temp.value),
    soil_threshold: parseFloat(thresholdInputs.soil.value)
  };

  if (!isNaN(payload.lux_threshold) || !isNaN(payload.temp_threshold) || !isNaN(payload.soil_threshold)) {
    client.publish("config", JSON.stringify(payload));
    console.log(JSON.stringify(payload));
  } else {
    alert("Vui lòng nhập ít nhất một ngưỡng hợp lệ");
  }
}
// --- MQTT Events ---

client.on("connect", () => {
  statusSystem.innerText = "Đã kết nối đến broker MQTT";
  ["sensor", "relaystate", "error", "configstate"].forEach(topic => client.subscribe(topic));
  updateButtonState();
});

client.on("error", (err) => {
  statusSystem.innerText = `Lỗi kết nối: ${err.message}`;
  console.error("Lỗi MQTT:", err);
});

client.on("close", () => {
  statusSystem.innerText = "Mất kết nối đến broker MQTT";
});

client.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message);

    switch (topic) {
      case "sensor":
        const { tempValue, humValue, soilValue, lightValue } = data;
        sensorElems.temp.innerText = tempValue !== undefined ? `${tempValue}°C` : "N/A";
        sensorElems.humi.innerText = humValue !== undefined ? `${humValue}%` : "N/A";
        sensorElems.soil.innerText = soilValue !== undefined ? `${soilValue}%` : "N/A";
        sensorElems.light.innerText = lightValue !== undefined ? `${lightValue} lux` : "N/A";
        break;

      case "relaystate":
        [data.relay_led, data.relay_fan, data.relay_pump].forEach((state, idx) => updateState(idx, state));
        break;

      case "error":
        alert(`Lỗi từ ESP32: ${data.error}`);
        break;

      case "configstate":
        thresholdInputs.lux.value = data.lux_thresholdValue || 50;
        thresholdInputs.temp.value = data.temp_thresholdValue || 30;
        thresholdInputs.soil.value = data.soil_thresholdValue || 20;

        currentMode = data.mode || "manual";
        modeToggles.manual.checked = currentMode === "manual";
        modeToggles.auto.checked = currentMode === "auto";
        updateButtonState();
        alert("Cập nhật cấu hình thành công!");
        break;
    }
  } catch (e) {
    console.error(`Lỗi xử lý tin nhắn từ topic "${topic}":`, e);
  }
});

