const _zubax_api = { "empty": true }
let zubax_api_ready = false;

function JsonParseHelper(k, v) {
    if (v === Infinity) {
        return "Infinity";
    } else if (v === NaN) {
        return "NaN";
    } else {
        return v;
    }
}

const zubax_api = new Proxy(_zubax_api, {
    get(target, prop) {
        let url = `http://127.0.0.1:${yukon_state.port}/api/${prop}`;
        return async function () {
            let data = { "arguments": [] };
            // For each argument in arguments, put it into data.arguments
            for (let i = 0; i < arguments.length; i++) {
                data.arguments.push(arguments[i]);
            }
            // for each element in arguments
            const response = await (fetch(url, {
                method: 'POST', // *GET, POST, PUT, DELETE, etc.
                mode: 'same-origin', // no-cors, *cors, same-origin
                cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                credentials: 'same-origin', // include, *same-origin, omit
                headers: {
                    'Content-Type': 'application/json'
                    // 'Content-Type': 'application/x-www-form-urlencoded',
                },
                redirect: 'follow', // manual, *follow, error
                referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
                body: JSON.stringify(data) // body data type must match "Content-Type" header
            }));
            const text_response = await response.text();
            return text_response;
        }
    },
});
const zubax_apij = new Proxy(_zubax_api, {
    get(target, prop) {
        let url = `http://127.0.0.1:${yukon_state.port}/api/${prop}`;
        return async function () {
            let data = { "arguments": [] };
            // For each argument in arguments, put it into data.arguments
            for (let i = 0; i < arguments.length; i++) {
                data.arguments.push(arguments[i]);
            }
            // for each element in arguments
            const response = await (fetch(url, {
                method: 'POST', // *GET, POST, PUT, DELETE, etc.
                mode: 'same-origin', // no-cors, *cors, same-origin
                cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                credentials: 'same-origin', // include, *same-origin, omit
                headers: {
                    'Content-Type': 'application/json'
                    // 'Content-Type': 'application/x-www-form-urlencoded',
                },
                redirect: 'follow', // manual, *follow, error
                referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
                body: JSON.stringify(data) // body data type must match "Content-Type" header
            }));
            const object_response = await response.text();
            return JSON.parse(object_response, JsonParseHelper);
        }
    },
});
var lut = []; for (var i = 0; i < 256; i++) { lut[i] = (i < 16 ? '0' : '') + (i).toString(16); }
function guid() {
    var d0 = Math.random() * 0xffffffff | 0;
    var d1 = Math.random() * 0xffffffff | 0;
    var d2 = Math.random() * 0xffffffff | 0;
    var d3 = Math.random() * 0xffffffff | 0;
    return lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + '-' +
        lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + '-' + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + '-' +
        lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + '-' + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] +
        lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff];
}
const _zubax_ws_api = { "empty": true }
let response_promises = {};
let zubax_wssocket = null;
const request_send_times = {}
const zubax_apiws = new Proxy(_zubax_ws_api, {
    get(target, prop) {
        let url = `ws://127.0.0.1:8001`;
        return async function () {
            let data = { "type": "call", "id": guid(), "method": prop, "params": [] };
            // For each argument in arguments, put it into data.arguments
            request_send_times[data.id] = Date.now();
            for (let i = 0; i < arguments.length; i++) {
                data.params.push(arguments[i]);
            }
            zubax_wssocket.send(JSON.stringify(data));
            let promise = new Promise((resolve, reject) => {
                response_promises[data.id] = { "resolve": resolve, "reject": reject };
            });
            return promise;
        }
    },
});

// const zubax_rapi = new Proxy(_zubax_reception_api, {
//     get(target, prop) {
//         return {
//             "connect": function (callback) {
//                 setInterval(function () {

//                 }, 200);
//             }
//         }
//     }
// });

// window.addEventListener("DOMContentLoaded", () => {

// });



// socket.onmessage = function (message) {
//     console.log("Message from " + prop + ": " + message.data);
//     callback(message.data);
//     socket.send("Yep, it works!");
// }
// socket.onerror = function (error) {
//     console.error(`[error] ${error.message}`);
// };
window.addEventListener('load', function () {
    
    const uri = "ws://127.0.0.1:8001";
    console.log("Trying to connect to " + uri);
    zubax_wssocket = new WebSocket(uri);
    zubax_wssocket.addEventListener("open", function () {
        console.log("Connected");
        zubax_api_ready = true;
        window.dispatchEvent(new Event('zubax_api_ready'));
    });
    zubax_wssocket.addEventListener("message", function (message) {
        // If the message is a JSON object, parse it
        let parsedJSON = null;
        if (message.data[0] === "{" || message.data[0] === "[") {
            parsedJSON = JSON.parse(message.data);
            if (parsedJSON.id) {
                if (parsedJSON.type === "call") {
                    function_name = parsedJSON.method;
                    console.log("Received a call to " + function_name);
                } else if (parsedJSON.type === "response") {
                    const response_promise = response_promises[parsedJSON.id];
                    if(request_send_times[parsedJSON.id]) {
                        let request_time_taken = Date.now() - request_send_times[parsedJSON.id];
                        console.log("Request " + parsedJSON.id + " took " + request_time_taken + "ms");
                        delete request_send_times[parsedJSON.id];
                    }
                    if (response_promise) {
                        let return_value = parsedJSON.response;
                        if (parsedJSON.response[0] === "{" || parsedJSON.response[0] === "[") {
                            return_value = JSON.parse(parsedJSON.response);
                        }
                        response_promise.resolve(return_value);
                        delete response_promises[parsedJSON.id];
                    }
                }

            }
        } else {
            zubax_wssocket.send("{success: \"false\", message: \"Not a JSON object\"")
            return;
        }

    });
    zubax_wssocket.addEventListener("error", function (error) {
        console.error("[error]", error);
    });
});
