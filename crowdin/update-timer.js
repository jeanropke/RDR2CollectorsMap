const { exec } = require('child_process');
const { CronJob } = require('cron');
const timer = '0 0 1 * * *';
const shellScript = './update-lang-files.sh';

const job = new CronJob(timer, runScript, null, true, 'UTC');
job.start();

function runScript() {
  return new Promise((resolve, reject) => {
    return exec(`sh ${shellScript}`, (error, stdout) => {
      if (error) {
        console.error(`exec error: ${error}`);
        job.stop();
        return reject(error);
      }
      return resolve(stdout);
    });
  });
}
