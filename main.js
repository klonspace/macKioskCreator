
const electron = require('electron');
const { app, globalShortcut, BrowserWindow } = electron;

const ipc = require('electron').ipcMain;
const { existsSync, readFile }  = require( 'fs')
const { homedir }  = require( 'os')
const { join }  = require( 'path')
var fs = require('fs');

let mainWindow, secondWindow;

//BAS KIOSK CONFIG
const config = {
  "useKioskMode": true,
  "showInTaskbar": false,
  "window": {
    "width": 1024,
    "height": 768,
    "isClosable": false,
    "isMaximizable": false,
    "isMinimizable": false,
    "isResizable": false,
    "showMenuBar": false
  },
  "shortcuts": {
    "_comment": "Documentation on key combinations - https://electron.atom.io/docs/api/accelerator/",
    "kill": "Control+Q",
    "conf": "Control+C"
  }
}

const defaultURLPath = app.getAppPath()+'/defaultURL.txt'

function getURL (configPath, callback) {
  
  readFile(configPath, 'utf-8', (err, data) => {
    if (err) { console.log(err); return }
    typeof callback === 'function' && callback(data)
  })
}

var password, hostname;

readFile(app.getAppPath()+'/password.txt', 'utf-8', (err, data) => {
  if (err) { console.log(err); return }
  password = data;
  console.log(password)
})

var settingsOpen  = false;
function hideSecondWindow() {
  settingsOpen = false;
  secondWindow.hide();
}
function createWindow () {
    getURL(defaultURLPath, (url) => {
      hostname = getHostname(url);
      //MAIN WINDOW
      mainWindow = new BrowserWindow({
        width: config.window.width,
        height: config.window.height,
        closable: config.window.isClosable,
        kiosk: config.useKioskMode,
        showInTaskbar: config.showInTaskbar,
        alwaysOnTop: true,
        show: false,
        focusable: true
      })
  
      mainWindow.setMaximizable(config.window.isMaximizable)
      mainWindow.setMinimizable(config.window.isMinimizable)
      mainWindow.setFullScreenable(config.window.isMaximizable)
      mainWindow.setResizable(config.window.isResizable)
  
      mainWindow.loadURL(url)
      mainWindow.on('closed', function () {
        mainWindow = null;
      })
      mainWindow.webContents.on('new-window', (event, newURL) => {
        event.preventDefault()
      });
      mainWindow.once('ready-to-show', () => {
        mainWindow.show()
      })
      mainWindow.webContents.on("will-navigate", (e, newURL) => {
        var nextpageHostname = getHostname(newURL);
        if(nextpageHostname != hostname) {
          e.preventDefault();
        }
      });

      
    



      //SECOND WINDOW
      secondWindow = new BrowserWindow({
        modal:true,
        show:false,
        parent: mainWindow,
        width: 460,
        //width: 800,
        height: 360,
        backgroundColor: "#333",
        webPreferences: {
          nodeIntegration: true
        }
      })
      secondWindow.loadFile("index.html");
      //secondWindow.toggleDevTools();
      //SHORTCUTS
      globalShortcut.register(config.shortcuts.kill, () => {
        app.exit()
      })

      globalShortcut.register("Esc", () => {
        hideSecondWindow() 
      })
      
      globalShortcut.register(config.shortcuts.conf, () => {
        console.log(settingsOpen)
        if(!settingsOpen) {
          secondWindow.loadFile("index.html");
          secondWindow.webContents.on('did-finish-load', () => {
            secondWindow.show()
            
            secondWindow.webContents.send('currURL', url);
            secondWindow.webContents.send('password', password);
          });
          settingsOpen  = true;
        }
        else {
          hideSecondWindow();
        }
      })

      globalShortcut.unregister("Command+Q");
  
      
      //IPC MESSAGING
      ipc.on('newURL', (event, message) => {
        url = message;
        hostname = getHostname(url);
        fs.writeFile(defaultURLPath, message, function(err) {
          if(err) {
              return console.log(err);
          }
        }); 
        mainWindow.loadURL(message);
      });

      ipc.on('newPW', (event, message) => {
        password = message;
        fs.writeFile(app.getAppPath()+'/password.txt', password, function(err) {
          if(err) {
              return console.log(err);
          }
        }); 
        secondWindow.webContents.send('passwordChanged', true);

      });

      ipc.on('closeSettings', (event, message) => {
        console.log(message)
      });
      ipc.on('closeSettings', (event, message) => {
        hideSecondWindow()
      })
      ipc.on('quit', (event, message) => {
        app.exit()
      })
      //MOUSE MOVEMENT TRACKING

      var prevMousePosition = {x: 0, y: 0};
      var lastMouseMove = new Date().getTime();
      var resetTime = 300000;
      function checkMousePos() {
        var currPos = electron.screen.getCursorScreenPoint();
        if(currPos.x != prevMousePosition.x || currPos.y != prevMousePosition.y) {
          lastMouseMove = new Date().getTime();
          prevMousePosition = currPos;
        }
    
        if(new Date().getTime() - lastMouseMove > resetTime) {
          mainWindow.loadURL(url);
          lastMouseMove = new Date().getTime();
        }
        setTimeout(checkMousePos, 100);
      }
      checkMousePos()
    })

    
    
  }

var resetTime = 5000;
app.on('ready', function() {
  createWindow();
  
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
    
  }
})

function getHostname(uerl) {
  var tempURL = new URL(uerl);
  return tempURL.hostname;
}
