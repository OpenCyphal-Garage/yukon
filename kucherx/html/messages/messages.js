function addLocalMessage(message) {
    pywebview.api.add_local_message(message)
}
window.addEventListener('pywebviewready', function () {
    // Run applyTextFilterToMessages() when there is a change in the filter text after the input has stopped for 0.5 seconds
    var iTextFilter = document.getElementById("iTextFilter");
    var taExcludedKeywords = document.getElementById("taExcludedKeywords");
    var timer = null;
    iTextFilter.addEventListener("input", function () {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(function () {
            applyTextFilterToMessages();
        }, 500);
    });
    var timer2 = null;
    taExcludedKeywords.addEventListener("input", function () {
        if (timer2) {
            clearTimeout(timer2);
        }
        timer2 = setTimeout(function () {
            applyExcludingTextFilterToMessage();
        }, 1000);
    });

    var textOut = document.querySelector("#textOut");
    autosize(textOut);
    var messagesList = document.querySelector("#messages-list");
    // On resize event
    addLocalMessage("Found messageList")
    // at interval of 3 seconds
    let messagesListWidth = messagesList.getBoundingClientRect().width

    setInterval(function() {
        let currentWidth = messagesList.getBoundingClientRect().width
        if(currentWidth != messagesListWidth) {
            messagesListWidth = currentWidth
            for (child of messagesList.children) {
                autosize.update(child);
            }
        }
    }, 500);
});
function applyExcludingTextFilterToMessage()
{
    var messagesList = document.querySelector("#messages-list");
    var taExcludedKeywords = document.getElementById("taExcludedKeywords");
    var excludedKeywords = taExcludedKeywords.value.split("\n");
    for (child of messagesList.children) {
        // For every excluded keyword in the list, hide the message if it contains the keyword
        for (keyword of excludedKeywords) {
             // If keyword is empty then continue
            if (keyword == "") {
                continue;
            }
            if (child.innerHTML.includes(keyword)) {
                child.style.display = "none";
                break;
            }
        }
    }
}
function applyTextFilterToMessages() {
    // Get the filter text from iTextFilter and save it in a variable
    var iTextFilter = document.getElementById("iTextFilter");
    var messagesList = document.querySelector("#messages-list");
    var textFilter = iTextFilter.value;
    if(textFilter == "") {
        for (child of messagesList.children) {
            child.style.display = "block";
        }
    }
    for (child of messagesList.children) {
        // Hide all messages that do not contain the filter text
        if (!child.innerHTML.includes(textFilter)) {
            child.style.display = "none";
        }
    }
}
function update_messages() {
    pywebview.api.get_messages().then(
        function (messages) {
            // Clear messages-list
            var messagesList = document.querySelector("#messages-list");
            if (document.getElementById("cDeleteOldMessages").checked) {
                for (child of messagesList.children) {
                    if (child && child.getAttribute("timestamp")) {
                        var timestamp = child.getAttribute("timestamp");
                        // if timestamp is older than 10 seconds, remove it
                        if (new Date().getTime() - timestamp > 10000) {
                            messagesList.removeChild(child);
                        }
                    }
                }
            }
            // Add messages to messages-list
            var d = JSON.parse(messages);
            // Make sure that type of d is array
            console.assert(d instanceof Array);
            for (el of d) {
                var li = document.createElement("textarea");
                li.innerHTML = el;
                // Set an attribute on the list element with current timestamp
                autosize(li);
                li.setAttribute("timestamp", new Date().getTime());
                // If el is the last in d
                if (d.indexOf(el) == d.length - 1) {
                    // Scroll to bottom of messages-list
                    var cbAutoscroll = document.getElementById("cbAutoscroll");
                    var iAutoscrollFilter = document.getElementById("iAutoscrollFilter");
                    if (cbAutoscroll.checked && (iAutoscrollFilter.value == "" || el.includes(iAutoscrollFilter.value))) {
                        messagesList.scrollTop = messagesList.scrollHeight;
                    }
                }
                messagesList.appendChild(li);
            }
        }
    );
}
var lastHash = "";
function updateTextOut() {
    pywebview.api.get_avatars().then(
        function (avatars) {
            var textOut = document.querySelector("#textOut");
            var DTO = JSON.parse(avatars);
            if(DTO.hash != lastHash) {
                addLocalMessage("Hash changed");
                lastHash = DTO.hash;
                textOut.innerHTML = JSON.stringify(DTO.avatars, null, 4)
            }
            // Parse avatars as json
        }
    );
}
setInterval(updateTextOut, 500);
// Call update_messages every second
setInterval(update_messages, 1000);