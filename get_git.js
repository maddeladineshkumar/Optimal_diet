const fs = require('fs');
const cp = require('child_process');
try {
  console.log(cp.execSync('git log -p').toString());
} catch (e) {
  console.log(e.toString());
}
