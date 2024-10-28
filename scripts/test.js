const WebSocket = require('ws');

const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
const ws = new WebSocket(url, {
    headers: {
        "Authorization": "Bearer " + "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",
        "OpenAI-Beta": "realtime=v1",
    },
});

ws.on("open", function open() {
    console.log("Connected to server.");
    ws.send(JSON.stringify({
        type: "response.create",
        response: {
            modalities: ["text"],
            instructions: "Please assist the user.",
        }
    }));
});

ws.on("message", function incoming(message) {
    console.log(JSON.parse(message.toString()));
});