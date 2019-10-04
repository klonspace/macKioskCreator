const { app, globalShortcut, BrowserWindow } = require('electron')
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

var password;

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
      mainWindow.once('ready-to-show', () => {
        mainWindow.show()
      })
      //SECOND WINDOW
      secondWindow = new BrowserWindow({
        modal:true,
        show:false,
        parent: mainWindow,
        width: 460,
        //width: 800,
        height: 360,
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
    })
  }

app.on('ready', createWindow)

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
