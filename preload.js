const ipc = require('electron').ipcRenderer;

var password;
ipc.on('currURL', (event, message) => {
    document.getElementById("newURL").value = message;
})
ipc.on('password', (event, message) => {
    password = message;
    document.getElementById("newPassword").value = message;

    document.getElementById("password").focus();
    if(password == "") {
        document.getElementById("unauthentified").classList.remove("visible");
        document.getElementById("authentified").classList.add("visible");
        document.getElementById("newURL").focus();
    }
})
ipc.on('passwordChanged', (event, message) => {
    alert("password changed!");
})

function sendNewURL(e) {
    e.preventDefault();
    ipc.send('newURL', document.getElementById("newURL").value);
    return false;
}
function close() {
    ipc.send('closeSettings', "");
}
function quit() {
    ipc.send('quit', "");
}
function setNewPW(e) {
    e.preventDefault();
    ipc.send('newPW', document.getElementById("newPassword").value);
    return false;
}

function checkPW(e) {
    e.preventDefault();
    if(document.getElementById("password").value == password) {
        document.getElementById("unauthentified").classList.remove("visible");
        document.getElementById("authentified").classList.add("visible");
        document.getElementById("newURL").focus();
    }
    return false;
}

//document.getElementById("sendURL").addEventListener("click", sendNewURL);
document.getElementById("close").addEventListener("click", close);
document.getElementById("quitKiosk").addEventListener("click", quit);

document.getElementById("newURLForm").addEventListener("submit", sendNewURL)
document.getElementById("newPWForm").addEventListener("submit", setNewPW)
document.getElementById("checkPW").addEventListener("submit", checkPW)
