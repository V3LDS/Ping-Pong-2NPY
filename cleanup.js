const fs = require('fs');
const path = require('path');

function deleteOldFiles(directory) {
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach((file) => {
      const curPath = path.join(directory, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteOldFiles(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directory);
  }
}

const appDataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : '/var/local');
const oldFilesPath = path.join(appDataPath, 'YourAppName', 'OldFiles');

deleteOldFiles(oldFilesPath);
