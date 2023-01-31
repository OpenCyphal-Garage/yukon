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
export async function updatePublishers(publishersOuterArea, yukon_state) {
    // The client side should publish through calling the APIJ
    // The server side should publish when it receives a request from the client to do so
    // We are trying to make sure that the client side is responsive when the user is publishing
    // When the client side crashes and stops publishing, the server side will not publish
    // Also the server side will turn off the Enabled checkbox if the client side crashes
    // This is so that when the client side recovers, it will not start publishing before the user wants it to
    if (Array.isArray(yukon_state.publishers) === false) {
        return;
    }
    for (const [id, publisher] of Object.entries(await yukon_state.zubax_apij.get_publishers())) {
        if (publishersOuterArea.querySelector(`[id="${publisher.id}"]`)) {
            // This publisher is already in the DOM
            continue;
        }
        console.log(`Rendering publisher ${JSON.stringify(publisher)}`, publisher);
        const frame = await createPublisherFrame(publisher, yukon_state);
        frame.id = publisher.id;
        // frame.style.top = 200 + "px";
        // frame.style.left = 200 + "px";
        // Add a text saying, "Publisher"
        const publisherText = document.createElement('span');
        publisherText.innerText = "Publisher (id: " + publisher.id + ")";
        frame.prepend(publisherText);
        const refreshRateInput = frame.querySelector(".refresh-rate-spinner");
        refreshRateInput.addEventListener("input", async () => {
            const newRefreshRate = refreshRateInput.value;
            await yukon_state.zubax_apij.set_publisher_refresh_rate(publisher.id, newRefreshRate);
        });
        publishersOuterArea.appendChild(frame);
    }
}
async function createDatatypeField(publisher, field, yukon_state) {
    const listOfOptions = await yukon_state.zubax_apij.get_publish_type_names();
    // Create a div that wraps around the text field and the dropdown menu
    const wrapper = document.createElement('div');
    wrapper.style.position = "relative";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    wrapper.style.width = "250px";
    // Create a text field
    const textField = document.createElement('input');
    textField.type = "text";
    if (field && field.type_name) {
        textField.value = field.type_name;
        setTimeout(() => {
            textField.scrollLeft = textField.scrollWidth;
        }, 100);
    }
    let savedScroll = 0;
    textField.addEventListener('change', async () => {
        console.log("Changing datatype to " + textField.value)
        textField.scrollLeft = textField.scrollWidth;
        const newDatatype = textField.value;
        await yukon_state.zubax_apij.set_publisher_field_type_name(publisher.id, field.id, newDatatype);
    });
    textField.addEventListener("scroll", () => {
        savedScroll = textField.scrollLeft;
    });
    textField.addEventListener("focusout", () => {
        textField.scrollLeft = savedScroll;
    });
    textField.style.position = "relative";
    textField.style.display = "flex";
    // Position in center
    textField.style.alignItems = "center";
    textField.style.justifyContent = "center";
    textField.style.width = "250px";
    // When the text field is focused, show a dropdown menu with all the available datatypes
    // For now use ["foo.bar", "foo.baz", "foo.baz"] as the list of available datatypes
    wrapper.appendChild(textField);
    // textField.addEventListener('focusout', () => {
    //     if (dropdown) {
    //         dropdown.remove();
    //         dropdown = null;
    //     }
    // });
    let showDropdown = async function (listOfOptions) {
        publisher.dropdown = document.createElement('div');
        publisher.dropdown.style.backgroundColor = "white";
        publisher.dropdown.style.border = "1px solid black";
        publisher.dropdown.style.zIndex = 100;
        publisher.dropdown.style.position = "absolute";
        publisher.dropdown.style.width = "400px";
        publisher.dropdown.style.height = "fit-content"
        publisher.dropdown.style.maxHeight = "100px";
        publisher.dropdown.style.overflowY = "scroll";
        publisher.dropdown.style.top = 34 + "px"; // Height of the text field + 2px
        publisher.dropdown.style.left = 0;
        // Add a list of all the datatypes
        const list = document.createElement('div');
        publisher.dropdown.appendChild(list);
        for (const datatype of listOfOptions) {
            const listItem = document.createElement('div');
            listItem.style.width = "100%";
            listItem.style.color = "black";
            listItem.style.borderBottom = "1px solid black";
            listItem.classList.add("dropdown-list-item");
            listItem.innerText = datatype;
            const response = await yukon_state.zubax_apij.get_number_type_min_max_values(datatype);
            if (response && response.success && response.min && response.max) {
                listItem.title = "Min: " + response.min + ", Max: " + response.max;
            } else if (response && response.success == false) {
                listItem.title = "Error: " + response.error;
            }
            listItem.addEventListener('click', () => {
                textField.value = datatype;
                textField.dispatchEvent(new Event("change"));
                publisher.dropdown.remove();
            });
            list.appendChild(listItem);
        }
        wrapper.appendChild(publisher.dropdown);
    }
    let highlightFirstElement = function () {
        const firstElement = publisher.dropdown.querySelector(".dropdown-list-item");
        if (firstElement === null) {
            return;
        }
        firstElement.classList.add("highlighted");
    }
    let highlightLastElement = function () {
        const lastElement = publisher.dropdown.querySelector(".dropdown-list-item:last-child");
        if (lastElement === null) {
            return;
        }
        lastElement.classList.add("highlighted");
    }

    let moveHighlightDown = function () {
        const highlightedItem = publisher.dropdown.querySelector(".highlighted");
        if (highlightedItem === null) {
            highlightFirstElement();
            return;
        }
        const nextSibling = highlightedItem.nextSibling;
        if (nextSibling === null) {
            return;
        }
        highlightedItem.classList.remove("highlighted");
        nextSibling.classList.add("highlighted");
    }
    let moveHighlightUp = function () {
        const highlightedItem = publisher.dropdown.querySelector(".highlighted");
        if (highlightedItem === null) {
            highlightLastElement();
            return;
        }
        const previousSibling = highlightedItem.previousSibling;
        if (previousSibling === null) {
            return;
        }
        highlightedItem.classList.remove("highlighted");
        previousSibling.classList.add("highlighted");
    }
    let scrollToHighlightedElement = function () {
        const highlightedItem = publisher.dropdown.querySelector(".highlighted");
        if (highlightedItem === null) {
            return;
        }
        highlightedItem.scrollIntoView();
    }

    // On down arrow, move the highlight down
    textField.addEventListener('keydown', (event) => {
        if (event.key === "ArrowDown") {
            moveHighlightDown();
            scrollToHighlightedElement();
        }
    });

    // On up arrow, move the highlight up
    textField.addEventListener('keydown', (event) => {
        if (event.key === "ArrowUp") {
            moveHighlightUp();
            scrollToHighlightedElement();
        }
    });

    // On enter, select the highlighted item
    textField.addEventListener('keydown', (event) => {
        if (event.key === "Enter") {
            const highlightedItem = publisher.dropdown.querySelector(".highlighted");
            if (highlightedItem === null) {
                return;
            }
            textField.value = highlightedItem.innerText;
            textField.dispatchEvent(new Event("change"));
            publisher.dropdown.remove();
            publisher.dropdown = null;
        }
    });

    // On tab, add one segment from the highlighted element to textField.value, a segment is separated by a full stop
    // If textfield.value is currently at a full stop then add the next segment
    // Otherwise add the remaining part that is missing until the next full stop
    textField.addEventListener('keydown', (event) => {
        if (event.key === "Tab") {
            event.preventDefault();
            const highlightedItem = publisher.dropdown.querySelector(".highlighted");
            if (highlightedItem === null) {
                return;
            }
            const highlightedItemText = highlightedItem.innerText;
            const textFieldValue = textField.value;
            const textFieldValueSegments = textFieldValue.split(".");
            const highlightedItemTextSegments = highlightedItemText.split(".");
            textField.value = highlightedItemTextSegments.splice(0, textFieldValueSegments.length).join(".");
            textField.dispatchEvent(new Event("change"));
        }
    });


    textField.addEventListener('click', async () => {
        if (publisher.dropdown) {
            publisher.dropdown.remove();
            publisher.dropdown = null;
            return;
        }
        await showDropdown(listOfOptions);
    });
    // If the user starts typing something that matches a start of a datatype, show the dropdown menu
    // Also highlight the matching part of the datatype
    textField.addEventListener('input', async () => {
        const text = textField.value;
        const matchingDatatypes = listOfOptions.filter((datatype) => datatype.startsWith(text));
        if (matchingDatatypes.length === 0) {
            if (publisher.dropdown) {
                publisher.dropdown.remove();
                publisher.dropdown = null;
            }
            return;
        }
        if (publisher.dropdown) {
            publisher.dropdown.remove();
            publisher.dropdown = null;
        }
        await showDropdown(matchingDatatypes);
        // If only one datatype matches, higlight the matching part
        if (matchingDatatypes.length === 1) {
            // Add highlight to the first element of dropdown
            const firstElement = publisher.dropdown.querySelector(".dropdown-list-item");
            firstElement.classList.add("highlighted");
        }
    });
    // When escape is pressed, remove the dropdown
    textField.addEventListener('keydown', (event) => {
        if (event.key === "Escape") {
            if (publisher.dropdown) {
                publisher.dropdown.remove();
                publisher.dropdown = null;
            }
        }
    });

    return wrapper;
}
function createRemoveButton(publisher, field, row, yukon_state) {
    const removeButton = document.createElement('button');
    removeButton.classList.add("remove-button");
    removeButton.innerText = "X";
    removeButton.addEventListener('click', async () => {
        await yukon_state.zubax_apij.delete_publisher_field(publisher.id, field.id);
        row.remove();
    });
    return removeButton;
}
async function createBooleanFieldRow(publisher, yukon_state, field) {
    const row = document.createElement('div');
    const rowId = guid();
    row.id = rowId;
    row.classList.add("publisher-row");
    if (!field) {
        field = (await yukon_state.zubax_apij.make_publisher_field(publisher.id, rowId)).field;
    }
    // Add a text field of 250px width, after that a number field of 50px width and a spinenr and a number field of 50px width
    row.appendChild(await createDatatypeField(publisher, field, yukon_state));
    const booleanField = document.createElement('input');
    booleanField.type = "checkbox";
    booleanField.classList.add("boolean-field");
    row.appendChild(booleanField);
    // Add a remove button
    const removeButton = createRemoveButton(publisher, field, row, yukon_state);
    row.appendChild(removeButton);
    return row;
}

async function createNumberFieldRow(publisher, yukon_state, field) {
    const row = document.createElement('div');
    const rowId = guid();
    if (field && field.id) {
        row.id = field.id;
    } else {
        row.id = rowId;
    }
    if (!field) {
        field = (await yukon_state.zubax_apij.make_publisher_field(publisher.id, rowId)).field;
        console.log(field);
    }
    row.classList.add("publisher-row");
    // Add a text field of 250px width, after that a number field of 50px width and a spinenr and a number field of 50px width
    row.appendChild(await createDatatypeField(publisher, field, yukon_state));
    const numberField1 = document.createElement('input');
    numberField1.type = "number";
    numberField1.classList.add("number-field");
    numberField1.classList.add("min-value-field")
    numberField1.style.width = "50px";
    numberField1.value = field.min;
    numberField1.title = "Minimum value";
    row.appendChild(numberField1);
    const valueField = document.createElement('input');
    valueField.title = "Value";
    const numberField2 = document.createElement('input');
    const spinner = createSpinner("100%", 
    (x) => { // Value changed callback
        valueField.value = x;
        yukon_state.zubax_apij.set_publisher_field_value(publisher.id, field.id, parseFloat(valueField.value));
    },
    () => parseFloat(numberField1.value), // Get minimum value
    () => parseFloat(numberField2.value) // Get maximum value
    );

    const spinnerElement = spinner.spinnerElement;
    spinnerElement.style.marginLeft = "2px";
    spinnerElement.style.marginRight = "2px";
    spinnerElement.title = "Value knob / dial"
    row.appendChild(spinnerElement);
    numberField2.classList.add("max-value-field");
    numberField2.title = "Maximum value";
    numberField2.type = "number";
    numberField2.classList.add("number-field");
    numberField2.style.width = "50px";
    numberField2.value = field.max;
    numberField2.addEventListener('input', async () => {
        if (valueField.value > numberField2.value) {
            spinner.setValue(parseFloat(numberField2.value));
        }
        await yukon_state.zubax_apij.set_field_min_max(publisher.id, field.id, parseFloat(numberField1.value), parseFloat(numberField2.value));
        // numberField2.dispatchEvent(new CustomEvent('maxChanged', {
        //     bubbles: true,
        // }));
    });
    numberField1.addEventListener('input', async () => {
        if (valueField.value < numberField1.value) {
            spinner.setValue(parseFloat(numberField1.value));
        }
        await yukon_state.zubax_apij.set_field_min_max(publisher.id, field.id, parseFloat(numberField1.value), parseFloat(numberField2.value));
    });
    row.appendChild(numberField2);
    // Add a number field for value
    valueField.type = "number";
    valueField.classList.add("value-field");
    valueField.style.width = "100px";
    valueField.addEventListener('input', async () => {
        yukon_state.zubax_apij.set_publisher_field_value(publisher.id, field.id, parseFloat(valueField.value));
        spinner.setValue(parseFloat(valueField.value));
    });
    spinner.setValue(parseFloat(field.value));
    valueField.value = field.value;
    row.appendChild(valueField);
    // Add a remove button
    const removeButton = createRemoveButton(publisher, field, row, yukon_state);
    row.appendChild(removeButton);
    return row;
}
async function createPublisherFrame(publisher, yukon_state) {
    const frame = document.createElement('div');
    frame.classList.add("publisher-frame");
    // Create a vertical flexbox for holding rows of content
    const content = document.createElement('div');
    content.classList.add("publisher-content");
    frame.appendChild(content);
    // Create a row for holding refresh rate spinner and checkbox for enabling
    const refreshRateRow = document.createElement('div');
    refreshRateRow.classList.add("publisher-row");
    content.appendChild(refreshRateRow);
    // Create a spinner for setting the refresh rate, it should be a number input element
    const refreshRateSpinner = document.createElement('input');
    refreshRateSpinner.type = "number";
    refreshRateSpinner.classList.add("refresh-rate-spinner");
    refreshRateSpinner.value = 15;
    refreshRateSpinner.addEventListener('input', () => {
        publisher.refresh_rate = parseFloat(refreshRateSpinner.value);
        yukon_state.zubax_apij.set_publisher_rate(publisher.id, publisher.refresh_rate)
    });
    refreshRateRow.appendChild(refreshRateSpinner);
    // Add a text saying, "Hz"
    const hzText = document.createElement('span');
    hzText.innerText = "Hz";
    hzText.style.marginLeft = "2px";
    refreshRateRow.appendChild(hzText);
    // Create a checkbox for enabling the publisher
    const enableCheckbox = document.createElement('input');
    enableCheckbox.type = "checkbox";
    enableCheckbox.classList.add("enable-checkbox");
    enableCheckbox.checked = true;
    refreshRateRow.appendChild(enableCheckbox);
    // Add a text saying, "Enable"
    const enableText = document.createElement('span');
    enableText.innerText = "Enable";
    enableText.style.marginLeft = "2px";
    refreshRateRow.appendChild(enableText);
    // Add an input box for entering a name for the publisher
    const nameInput = document.createElement('input');
    nameInput.type = "text";
    nameInput.classList.add("publisher-name-input");
    nameInput.placeholder = "Publisher name";
    nameInput.value = publisher.name;
    nameInput.addEventListener('input', async () => {
        await yukon_state.zubax_apij.set_publisher_name(publisher.id, nameInput.value);
    });
    refreshRateRow.appendChild(nameInput);
    // Add a separator box between the refresh rate row and the next row
    const separator = document.createElement('div');
    separator.classList.add("separator");
    content.appendChild(separator);
    const publisherFieldsResponse = await yukon_state.zubax_apij.get_publisher_fields(publisher.id);
    if (publisherFieldsResponse.success && publisherFieldsResponse.fields) {
        for (const [id, field] of Object.entries(publisherFieldsResponse.fields)) {
            const fieldRow = await createNumberFieldRow(publisher, yukon_state, field);
            content.appendChild(fieldRow);
        }
    }
    // Create an input-group for holding the add field buttons
    const addFieldInputGroup = document.createElement('div');
    addFieldInputGroup.classList.add("input-group");
    content.appendChild(addFieldInputGroup);
    // Add a button for adding a new field row
    const addNumberFieldButton = document.createElement('button');
    addNumberFieldButton.classList.add("btn", "btn-sm", "btn-secondary", "add-field-button");
    addNumberFieldButton.innerText = "Add number field";
    addNumberFieldButton.addEventListener('click', async () => {
        const fieldRow = await createNumberFieldRow(publisher, yukon_state);
        // Insert the new field row before the add field button
        content.insertBefore(fieldRow, addFieldInputGroup);
    });
    addFieldInputGroup.appendChild(addNumberFieldButton);
    const addBooleanFieldButton = document.createElement('button');
    addBooleanFieldButton.classList.add("btn", "btn-sm", "btn-secondary", "add-field-button");
    addBooleanFieldButton.innerText = "Add boolean field";
    addBooleanFieldButton.addEventListener('click', async () => {
        const fieldRow = await createBooleanFieldRow(publisher, yukon_state);
        // Insert the new field row before the add field button
        content.insertBefore(fieldRow, addFieldInputGroup);
    });
    addFieldInputGroup.appendChild(addBooleanFieldButton);
    return frame;
}
function createSpinner(spinnerSizePx = "50px", valueChangedCallback = null, getMinValue = null, getMaxValue = null) {
    // Create a span that is circular and has a border.
    // It should also have a slight shadow.
    // It should have a little dot on the inside that is black and sticks to the border
    const spinner = document.createElement('span');
    spinner.classList.add("spinner-knob", "ratio-1x1");
    spinner.style.height = spinnerSizePx;
    const dot = document.createElement('span');
    dot.classList.add("knob-dot")
    spinner.appendChild(dot);
    // The spinner should rotate 360 degrees in 1 second
    let rotation = 0;
    let lastTime;
    let spinnerSpeed = 0.2;
    let mousePos = {
        x: 0,
        y: 0
    }
    document.addEventListener('mousemove', (e) => {
        mousePos.x = e.clientX;
        mousePos.y = e.clientY;
    });
    let previousSpinnerAngle = 0.0;
    let spinnerValue = 0.0;
    let spinnerAngle = 0.0;
    const valueRange = () => getMaxValue() - getMinValue();
    const multiplier = () => {
        if (valueRange() <= 1) {
            return 0.15;
        } else if (valueRange() <= 2) {
            return 0.25;
        } else {
            return 1;
        }
    };
    const wholeRange = () => valueRange() * 1 / multiplier();
    const maxAngle = () => wholeRange() - Math.floor((wholeRange()) / (Math.PI * 2)) * (Math.PI * 2);
    const minAngle = 0;
    spinnerValue = getMinValue() || 0;
    if (getMinValue) {
        spinnerValue = getMinValue();
    }
    let hoveringValueSpan = null;
    let faceToMouse = function (mouseEvent) {
        // Get the mouse position
        // Get the spinner's absolute position relative to the window
        const spinnerPos = {
            x: spinner.getBoundingClientRect().left + spinner.getBoundingClientRect().width / 2,
            y: spinner.getBoundingClientRect().top + spinner.getBoundingClientRect().height / 2
        };

        // Get the angle between the mouse and the spinner
        let newAngle = Math.atan2(mousePos.y - spinnerPos.y, mousePos.x - spinnerPos.x);
        let options = [newAngle + 2 * Math.PI - previousSpinnerAngle, newAngle - previousSpinnerAngle, newAngle - 2 * Math.PI - previousSpinnerAngle]
        // Take the absolute value of every option in options and find the smallest absolute value, then save the index of that value
        let smallestIndex = 0;
        let smallestValue = Math.abs(options[0]);
        for (let i = 1; i < options.length; i++) {
            if (Math.abs(options[i]) < smallestValue) {
                smallestValue = Math.abs(options[i]);
                smallestIndex = i;
            }
        }
        const angleDiff = options[smallestIndex];

        let newValue = spinnerValue + angleDiff * multiplier();
        let wasClamped = false;
        // Clamp data-value between getMinValue and getMaxValue
        if (getMinValue) {
            const minValue = getMinValue();
            if (newValue <= minValue) {
                newAngle = minAngle;
                newValue = minValue;
                wasClamped = true;
            }
        }
        if (getMaxValue) {
            const maxValue = getMaxValue();
            if (newValue >= maxValue) {
                newAngle = maxAngle();
                newValue = maxValue;
                wasClamped = true;
            }
        }
        if (valueChangedCallback) {
            valueChangedCallback(newValue);
        }
        previousSpinnerAngle = newAngle;
        spinner.style.transform = `rotate(${newAngle}rad)`;
        spinnerValue = newValue;
        spinnerAngle = newAngle;
    }
    let mouseDown = false;
    let wheelScrollValueIndicatorTimeout = null;
    spinner.addEventListener('mousedown', (e) => {
        mouseDown = true;
        if (hoveringValueSpan) {
            hoveringValueSpan.remove();
            clearTimeout(wheelScrollValueIndicatorTimeout);
        }
        hoveringValueSpan = document.createElement('span');
        hoveringValueSpan.classList.add("hovering-value");
        document.body.appendChild(hoveringValueSpan);
        // Make sure that nothing in the document is selectable 
        document.body.style.userSelect = "none";
        // While mouse is down, on every requestAnimationFrame call faceToMouse
        let faceToMouseLoop = (now) => {
            faceToMouse();
            if (mouseDown) {
                window.requestAnimationFrame(faceToMouseLoop);
            }
            // Position a span above the mouse showing the current value
            hoveringValueSpan.innerText = spinnerValue;
            hoveringValueSpan.style.position = "absolute";
            hoveringValueSpan.style.left = mousePos.x + 20 + "px";
            hoveringValueSpan.style.top = mousePos.y + 20 + "px";
        };
        window.requestAnimationFrame(faceToMouseLoop);
    });
    // When mouse is scrolled while it is hovering spinner, rotate it
    spinner.addEventListener('wheel', (e) => {
        // Get the mouse position
        // Get the spinner's absolute position relative to the window
        const spinnerPos = {
            x: spinner.getBoundingClientRect().left + spinner.getBoundingClientRect().width / 2,
            y: spinner.getBoundingClientRect().top + spinner.getBoundingClientRect().height / 2
        };
        // Check if mouse is over the spinner
        if (mousePos.x >= spinnerPos.x - spinner.getBoundingClientRect().width / 2 && mousePos.x <= spinnerPos.x + spinner.getBoundingClientRect().width / 2 && mousePos.y >= spinnerPos.y - spinner.getBoundingClientRect().height / 2 && mousePos.y <= spinnerPos.y + spinner.getBoundingClientRect().height / 2) {
            if (wheelScrollValueIndicatorTimeout) {
                clearTimeout(wheelScrollValueIndicatorTimeout);
            }
            // Rotate the spinner by 1 degree if the mouse is scrolled up, -1 degree if the mouse is scrolled down
            let scroll_multiplier = multiplier();
            if (e.shiftKey) {
                scroll_multiplier = 10 * multiplier();
            }
            const addedIncrement = (e.deltaY > 0 ? -scroll_multiplier : scroll_multiplier);
            let newValue = spinnerValue + addedIncrement;
            let newAngle = newValue / Math.pow(multiplier(), 3);
            newAngle = newAngle - Math.floor(newAngle / (2 * Math.PI)) * 2 * Math.PI;
            const minAngle = 0;
            let isClamped = false;
            if (getMinValue) {
                const minValue = getMinValue();
                if (newValue <= minValue) {
                    newValue = minValue;
                    isClamped = true;
                    // Set the angle to the corresponding clamped angle
                    newAngle = minAngle;
                }
            }
            if (getMaxValue) {
                const maxValue = getMaxValue();
                if (newValue >= maxValue) {
                    newValue = maxValue;
                    isClamped = true;
                    // Set the angle to the corresponding clamped angle
                    newAngle = maxAngle();
                }
            }
            spinnerValue = newValue;
            spinnerAngle = newAngle;
            spinner.style.transform = `rotate(${newAngle}rad)`;
            previousSpinnerAngle = newAngle;

            if (valueChangedCallback) {
                valueChangedCallback(newValue);
            }
        }
    });
    document.addEventListener('mouseup', (e) => {
        document.body.style.userSelect = "auto";
        if (hoveringValueSpan && hoveringValueSpan.parentElement == document.body) {
            document.body.removeChild(hoveringValueSpan);
        }
        mouseDown = false;
    });
    return {
        "spinnerElement": spinner,
        "setValue": (newValue) => {
            const circle = Math.PI * 2;
            spinnerValue = newValue / multiplier();
            spinnerAngle = spinnerValue - Math.floor(spinnerValue / circle) * circle;
            if (getMinValue) {
                const minValue = getMinValue();
                if (spinnerValue <= minValue) {
                    spinnerValue = minValue;
                    valueChangedCallback(spinnerValue);
                    // Set the angle to the corresponding clamped angle
                    spinnerAngle = minAngle;
                }
            }
            if (getMaxValue) {
                const maxValue = getMaxValue();
                if (spinnerValue >= maxValue) {
                    spinnerValue = maxValue;
                    valueChangedCallback(spinnerValue);
                    // Set the angle to the corresponding clamped angle
                    spinnerAngle = maxAngle();
                }
            }
            spinner.style.transform = `rotate(${spinnerAngle}rad)`;
            previousSpinnerAngle = spinnerAngle;
        }
    };
}