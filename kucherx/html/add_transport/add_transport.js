window.addEventListener('pywebviewready', function () {
    cbShowTransportCombobox = document.getElementById('cbShowTransportCombobox');
    var messagesList = document.querySelector("#messages-list");
    let messagesListWidth = messagesList.getBoundingClientRect().width
    function displayOneMessage(message)
    {
        var messageItem = document.createElement("textarea");
        messageItem.classList.add("message-item");
        messageItem.classList.add("is-active");
        messageItem.innerHTML = message;
        messagesList.appendChild(messageItem);
        autosize(messageItem);
    }
    function fetchAndDisplayMessages() {
        pywebview.api.get_messages().then(function(messages) {
            var messagesObject = JSON.parse(messages);
            for (message of messagesObject) {
                displayOneMessage(message);
            }
        });
    }
    function addLocalMessage(message) {
        pywebview.api.add_local_message(message)
    }
    setInterval(function() {
        let currentWidth = messagesList.getBoundingClientRect().width
        if(currentWidth != messagesListWidth) {
            messagesListWidth = currentWidth
            for (child of messagesList.children) {
                autosize.update(child);
            }
        }
    }, 500);
    function verifyInputs() {
        var iTransport = document.getElementById("iTransport");
        var sTransport = document.getElementById("sTransport");
        var iMtu = document.getElementById("iMtu");
        var iArbRate = document.getElementById("iArbRate");
        var iDataRate = document.getElementById("iDataRate");
        var iNodeId = document.getElementById("iNodeId");
        // Remove is-danger from every input
        iTransport.classList.remove("is-danger");
        sTransport.classList.remove("is-danger");
        iMtu.classList.remove("is-danger");
        iArbRate.classList.remove("is-danger");
        iDataRate.classList.remove("is-danger");
        iNodeId.classList.remove("is-danger");
        var isFormCorrect = true;
        if(!cbShowTransportCombobox.checked) {
            if(iTransport.value == "" || !iTransport.value.includes(":")) {
            iTransport.classList.add("is-danger");
            displayOneMessage("Transport shouldn't be empty and should be in the format <slcan|socketcan>:<port>");
            isFormCorrect = false;
            }
            var transportMustContain = ["socketcan", "slcan"];
            var containsAtLeastOne = false;
            for (transportType of transportMustContain) {
                if (iTransport.value.includes(transportType)) {
                    containsAtLeastOne = true;
                }
            }
            if(!containsAtLeastOne) {
                displayOneMessage("Transport type should be either slcan or socketcan");
                iTransport.classList.add("is-danger");
                isFormCorrect = false;
            }
        } else if (sTransport.value == "") {
            sTransport.classList.add("is-danger");
            displayOneMessage("Transport shouldn't be empty");
            isFormCorrect = false;
        }

        if (iMtu.value == "" || isNaN(iMtu.value)) {
            displayOneMessage("MTU should be a number");
            iMtu.classList.add("is-danger");
            isFormCorrect = false;
        }
        if (iArbRate.value == "" || isNaN(iArbRate.value)) {
            displayOneMessage("Arbitration rate should be a number");
            iArbRate.classList.add("is-danger");
            isFormCorrect = false;
        }
        if (iDataRate.value == "" || isNaN(iDataRate.value)) {
            displayOneMessage("Data rate should be a number");
            iDataRate.classList.add("is-danger");
            isFormCorrect = false;
        }
        if (iNodeId.value == "" || isNaN(iNodeId.value) || iNodeId.value < 0 || iNodeId.value > 128) {
            displayOneMessage("Node ID should be a number between 0 and 128");
            iNodeId.classList.add("is-danger");
            isFormCorrect = false;
        }
        return isFormCorrect;
    }
    pywebview.api.get_ports_list().then(
        function (portsList) {
            var btnStart = document.getElementById('btnStart');
            addLocalMessage("Waiting to start...");
            var iTransport = document.getElementById('iTransport');
            var sTransport = document.getElementById("sTransport");
            var d = JSON.parse(portsList);
            if (d.length == 0) {
                addLocalMessage("No interfaces found");
            } else {
                for (el of d) {
                    if (el.length > 0) {
                        var option = document.createElement("option");
                        option.value = el;
                        option.text = el;
                        sTransport.appendChild(option);
                    }
                }
            }
        }
    );

    btnStart.addEventListener('click', function () {
        if (!verifyInputs()) { return; }
        var port = "";
        if(cbShowTransportCombobox.checked) {
            port = "slcan:" + sTransport.value.split(" ")[0];
        } else {
            port = iTransport.value;
        }
        var data_rate = document.getElementById('iDataRate').value;
        var arb_rate = document.getElementById('iArbRate').value;
        var node_id = document.getElementById('iNodeId').value;
        var mtu = document.getElementById('iMtu').value;
        pywebview.api.attach_transport(port, data_rate, arb_rate, node_id, mtu).then(
            function (result) {
                var resultObject = JSON.parse(result);
                if (resultObject.success) {
                    addLocalMessage("Now attached: " + resultObject.message);
                    pywebview.api.hide_transport_window();
                    pywebview.api.open_monitor_window();
                } else {
                    console.error("Error: " + resultObject.message);
                    addLocalMessage("Error: " + resultObject.message);
                }
            }
        );
    });
    // Toggle between showing divTypeTransport and divSelectTransport by clicking on the respective buttons
    var btnTypeTransport = document.getElementById('btnTypeTransport');
    var btnSelectTransport = document.getElementById('btnSelectTransport');
    var divTypeTransport = document.getElementById('divTypeTransport');
    var divSelectTransport = document.getElementById('divSelectTransport');
    var btnOpenCandumpFile = document.getElementById('btnOpenCandumpFile');
    btnOpenCandumpFile.addEventListener('click', function () {
        pywebview.api.open_file_dialog();
    });

    setTimeout(fetchAndDisplayMessages, 1000);

    cbShowTransportCombobox.addEventListener('change', function () {
        if (cbShowTransportCombobox.checked) {
            divTypeTransport.style.display = "none";
            divSelectTransport.style.display = "block";
        } else {
            divTypeTransport.style.display = "block";
            divSelectTransport.style.display = "none";
        }
    });
});